/**
 * Split Pane and Layout Manager
 * Manages side-by-side or stacked editor panes, live compiled output split,
 * and responsive collapsing for mobile phone terminals.
 */

export class SplitManager {
  constructor() {
    this.mode = 'single'; // 'single' | 'vertical' | 'horizontal'
    this.activePane = 0;   // 0 = primary, 1 = secondary
    this.splitRatio = 0.5; // 50/50
  }

  isSplit() {
    return this.mode !== 'single';
  }

  setSplit(mode) {
    this.mode = mode;
  }

  closeSplit() {
    this.mode = 'single';
    this.activePane = 0;
  }

  toggleSplit(mode = 'vertical') {
    if (this.mode === mode) {
      this.closeSplit();
    } else {
      this.setSplit(mode);
    }
  }

  switchPane() {
    if (this.isSplit()) {
      this.activePane = this.activePane === 0 ? 1 : 0;
    }
  }

  /**
   * Compute layout bounds for panes based on available screen space.
   *
   * @param {number} top
   * @param {number} left
   * @param {number} width
   * @param {number} height
   * @param {boolean} isMobile (< 60 columns)
   * @returns {Array<object>} Array of pane bounds [{ top, left, width, height }]
   */
  computePaneBounds(top, left, width, height, isMobile = false) {
    // On narrow mobile terminals, always collapse to single active pane
    if (isMobile || this.mode === 'single') {
      return [{ top, left, width, height }];
    }

    if (this.mode === 'vertical') {
      const leftWidth = Math.floor(width * this.splitRatio);
      const rightWidth = width - leftWidth - 1; // -1 for vertical divider
      return [
        { top, left, width: leftWidth, height },
        { top, left: left + leftWidth + 1, width: rightWidth, height }
      ];
    }

    if (this.mode === 'horizontal') {
      const topHeight = Math.floor(height * this.splitRatio);
      const bottomHeight = height - topHeight - 1; // -1 for horizontal divider
      return [
        { top, left, width, height: topHeight },
        { top: top + topHeight + 1, left, width, height: bottomHeight }
      ];
    }

    return [{ top, left, width, height }];
  }
}
