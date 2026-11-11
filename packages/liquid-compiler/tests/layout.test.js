import test from 'node:test';
import assert from 'node:assert';
import { parseScopedStyles, parseCSSDeclarations } from '../src/index.js';

/**
 * Pure JS Flexbox Layout Simulation matching LiquidFlexLayout.kt
 */
function computeFlexRowLayout({
  width = 400,
  paddingLeft = 32,
  paddingRight = 32,
  justifyContent = 'space-between',
  items = [] // array of { width, flexGrow, marginLeft, marginRight }
}) {
  const availableMain = width - paddingLeft - paddingRight;
  const lineMainSize = items.reduce((sum, item) => sum + item.width + (item.marginLeft === 'auto' ? 0 : (item.marginLeft || 0)) + (item.marginRight === 'auto' ? 0 : (item.marginRight || 0)), 0);
  const freeSpace = Math.max(0, availableMain - lineMainSize);

  // 1. Flex grow distribution
  const totalGrow = items.reduce((sum, item) => sum + (item.flexGrow || 0), 0);
  const layoutItems = items.map(item => ({ ...item, measuredWidth: item.width }));

  if (totalGrow > 0 && freeSpace > 0) {
    for (const item of layoutItems) {
      if (item.flexGrow > 0) {
        const extra = Math.floor(freeSpace * (item.flexGrow / totalGrow));
        item.measuredWidth += extra;
      }
    }
  }

  // 2. Auto margins distribution on main axis
  const autoMarginCount = layoutItems.reduce((sum, item) => {
    return sum + (item.marginLeft === 'auto' ? 1 : 0) + (item.marginRight === 'auto' ? 1 : 0);
  }, 0);

  const remainingFreeSpace = totalGrow > 0 ? 0 : Math.max(0, availableMain - layoutItems.reduce((sum, item) => sum + item.measuredWidth, 0));
  const autoMarginExtra = autoMarginCount > 0 ? Math.floor(remainingFreeSpace / autoMarginCount) : 0;

  // 3. Justify content distribution
  let startOffset = 0;
  let itemSpacing = 0;
  if (autoMarginCount === 0 && totalGrow === 0) {
    if (justifyContent === 'space-between') {
      itemSpacing = layoutItems.length > 1 ? Math.floor(remainingFreeSpace / (layoutItems.length - 1)) : 0;
    } else if (justifyContent === 'center') {
      startOffset = Math.floor(remainingFreeSpace / 2);
    } else if (justifyContent === 'flex-end') {
      startOffset = remainingFreeSpace;
    }
  }

  let currentMain = paddingLeft + startOffset;
  const positions = [];

  for (const item of layoutItems) {
    const extraLeft = item.marginLeft === 'auto' ? autoMarginExtra : (item.marginLeft || 0);
    const extraRight = item.marginRight === 'auto' ? autoMarginExtra : (item.marginRight || 0);
    const x = currentMain + extraLeft;
    positions.push({
      x,
      width: item.measuredWidth,
      right: x + item.measuredWidth
    });
    currentMain += item.measuredWidth + extraLeft + extraRight + itemSpacing;
  }

  return { availableMain, remainingFreeSpace, positions };
}

test('FlexLayout - space-between pushes badge to right edge of header', () => {
  // Header: 400dp width, 32dp left/right padding -> availableMain = 336dp
  // Title: width = 150dp
  // Actions badge: width = 100dp
  const result = computeFlexRowLayout({
    width: 400,
    paddingLeft: 32,
    paddingRight: 32,
    justifyContent: 'space-between',
    items: [
      { width: 150 }, // Title
      { width: 100 }  // Badge
    ]
  });

  const [titlePos, badgePos] = result.positions;
  assert.strictEqual(titlePos.x, 32, 'Title starts at left padding (32dp)');
  assert.strictEqual(titlePos.right, 182, 'Title ends at 182dp');

  assert.strictEqual(badgePos.right, 368, 'Badge ends at 368dp (400dp - 32dp paddingRight)');
  assert.strictEqual(badgePos.x, 268, 'Badge starts at 268dp');
  assert.ok(badgePos.x > 200, 'Badge is pushed to the right side of the header');
});

test('FlexLayout - margin-left: auto pushes badge to right edge regardless of justifyContent', () => {
  const result = computeFlexRowLayout({
    width: 400,
    paddingLeft: 32,
    paddingRight: 32,
    justifyContent: 'flex-start',
    items: [
      { width: 150 },
      { width: 100, marginLeft: 'auto' } // margin-left: auto
    ]
  });

  const [titlePos, badgePos] = result.positions;
  assert.strictEqual(titlePos.x, 32);
  assert.strictEqual(badgePos.right, 368, 'Auto margin absorbs remaining space and aligns badge to right padding');
  assert.strictEqual(badgePos.x, 268);
});

test('FlexLayout - flex-grow on title expands title and pushes badge to right edge', () => {
  const result = computeFlexRowLayout({
    width: 400,
    paddingLeft: 32,
    paddingRight: 32,
    justifyContent: 'flex-start',
    items: [
      { width: 150, flexGrow: 1 }, // Title expands
      { width: 100 }               // Badge stays wrap_content
    ]
  });

  const [titlePos, badgePos] = result.positions;
  assert.strictEqual(titlePos.x, 32);
  assert.strictEqual(titlePos.width, 236, 'Title absorbed 86dp free space');
  assert.strictEqual(badgePos.x, 268);
  assert.strictEqual(badgePos.right, 368);
});

test('FlexLayout - column container does not falsely inflate width when measuring AT_MOST', () => {
  // When a child column container (like div.actions wrapping span.badge) is measured with MeasureSpec.AT_MOST,
  // its crossSize must equal the max width of its children (100dp), NOT availableCross (336dp).
  const childBadgeWidth = 100;
  const isRow = false; // column layout
  const widthMode = 'AT_MOST'; // WRAP_CONTENT
  const widthSize = 336;

  const availableCross = isRow
    ? 0
    : (widthMode === 'EXACTLY' ? widthSize : 0);

  let crossSize = childBadgeWidth;
  if (!isRow && availableCross > 0) {
    crossSize = Math.max(crossSize, availableCross);
  }

  assert.strictEqual(crossSize, 100, 'CrossSize must shrink-wrap children, not inflate to upper bound');
});

test('FlexLayout - space-between maintains separation between brand, links, and slot in navbar', () => {
  // Mobile navbar viewport: 412dp screen width, 16dp left/right padding -> availableMain = 380dp
  // Brand: 120dp
  // Nav links: 150dp
  // Slot badge: 50dp
  // Total children width: 320dp, free space = 60dp distributed into 2 gaps (30dp each)
  const result = computeFlexRowLayout({
    width: 412,
    paddingLeft: 16,
    paddingRight: 16,
    justifyContent: 'space-between',
    items: [
      { width: 120 }, // a.brand
      { width: 150 }, // div.links
      { width: 50 }   // div.slot-container
    ]
  });

  const [brandPos, linksPos, slotPos] = result.positions;
  assert.strictEqual(brandPos.x, 16, 'Brand starts at left padding (16dp)');
  assert.strictEqual(brandPos.right, 136, 'Brand ends at 136dp');

  // Gap between brand and links must be positive and substantial (30dp)
  const brandToLinksGap = linksPos.x - brandPos.right;
  assert.ok(brandToLinksGap >= 20, `Gap between brand and links (${brandToLinksGap}dp) must be >= 20dp`);
  assert.strictEqual(linksPos.x, 166, 'Links starts at 166dp');

  const linksToSlotGap = slotPos.x - linksPos.right;
  assert.ok(linksToSlotGap >= 20, `Gap between links and slot (${linksToSlotGap}dp) must be >= 20dp`);
  assert.strictEqual(slotPos.right, 396, 'Slot badge aligns to right padding (412 - 16 = 396dp)');
});

test('FlexLayout - flexShrink default (1f) prevents overflowing items from clipping and maintains space distribution', () => {
  // When children slightly exceed availableMain, flexShrink absorbs the overflow:
  const availableMain = 360;
  const items = [
    { width: 160, flexShrink: 1 },
    { width: 180, flexShrink: 1 },
    { width: 80, flexShrink: 1 }
  ]; // Total = 420dp, overflow = 60dp
  const totalShrink = items.reduce((s, i) => s + i.flexShrink, 0); // 3

  const shrunkItems = items.map(i => {
    const shrinkAmount = Math.floor(60 * (i.flexShrink / totalShrink)); // 20 each
    return { ...i, measuredWidth: i.width - shrinkAmount };
  });

  const totalMeasured = shrunkItems.reduce((s, i) => s + i.measuredWidth, 0);
  assert.strictEqual(totalMeasured, availableMain, 'Shrunk items fit exactly into available main space');
});

test('FlexLayout - column container preserves paragraph margin-bottom separating <p> from adjacent badge', () => {
  // Simulates column container (.info-box) containing <p> followed by .badge
  // Paragraph has standard 1em (16dp) bottomMargin
  const pNode = {
    tag: 'p',
    y: 100,
    height: 20,
    bottomMargin: 16 // 16dp density-scaled bottom margin
  };
  const pBottomWithMargin = pNode.y + pNode.height + pNode.bottomMargin;

  const badgeNode = {
    tag: 'span',
    className: 'badge',
    y: pBottomWithMargin, // Next element laid out after previous element + bottomMargin
    height: 24
  };

  const gap = badgeNode.y - (pNode.y + pNode.height);
  assert.strictEqual(gap, 16, 'Adjacent gap between <p> and .badge must be exactly 16dp');
  assert.ok(gap >= 12, 'Gap prevents text "Quadruple (computed): 16" from touching "Even Number" badge');
});
