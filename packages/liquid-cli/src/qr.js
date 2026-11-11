/**
 * Minimal Pure-JS QR Code ASCII Generator for Terminal Display
 * Zero native dependencies, self-contained Galois Field & Reed-Solomon engine.
 */

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_EXP[i + 255] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11d;
  }
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsCompute(data, numEc) {
  // Generate generator polynomial
  let gen = [1];
  for (let i = 0; i < numEc; i++) {
    const next = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gfMul(gen[j], GF_EXP[i]);
      next[j + 1] ^= gen[j];
    }
    gen = next;
  }

  const res = new Uint8Array(numEc);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ res[0];
    for (let j = 0; j < numEc - 1; j++) {
      res[j] = res[j + 1] ^ gfMul(gen[numEc - 1 - j], factor);
    }
    res[numEc - 1] = gfMul(gen[0], factor);
  }
  return res;
}

// QR Table: [version, totalCodewords, dataCodewords, ecCodewords, alignmentPositions]
const QR_VERSIONS = [
  null,
  { version: 1, size: 21, totalCw: 26, dataCw: 19, ecCw: 7, aligns: [] },
  { version: 2, size: 25, totalCw: 44, dataCw: 34, ecCw: 10, aligns: [6, 18] },
  { version: 3, size: 29, totalCw: 70, dataCw: 55, ecCw: 15, aligns: [6, 22] },
  { version: 4, size: 33, totalCw: 100, dataCw: 80, ecCw: 20, aligns: [6, 26] },
  { version: 5, size: 37, totalCw: 134, dataCw: 108, ecCw: 26, aligns: [6, 30] },
  { version: 6, size: 41, totalCw: 172, dataCw: 136, ecCw: 36, aligns: [6, 34] }
];

export function generateQRMatrix(text) {
  const bytes = Buffer.from(text, 'utf8');

  // Choose smallest version that fits bytes + 4 bit mode + 8 bit count
  let verInfo = null;
  for (let v = 1; v <= 6; v++) {
    if (bytes.length + 2 <= QR_VERSIONS[v].dataCw - 1) {
      verInfo = QR_VERSIONS[v];
      break;
    }
  }
  if (!verInfo) verInfo = QR_VERSIONS[6];

  // 1. Bitstream encoding: Byte mode (0100) + 8-bit count + bytes + terminator
  const bits = [];
  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  pushBits(0b0100, 4); // Byte mode
  pushBits(bytes.length, 8); // Count
  for (const b of bytes) pushBits(b, 8);

  // Terminator (up to 4 bits of 0)
  const maxBits = verInfo.dataCw * 8;
  const termLen = Math.min(4, maxBits - bits.length);
  pushBits(0, termLen);

  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);

  // Convert to byte codewords
  const dataCw = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    dataCw.push(b);
  }

  // Pad with alternate 0xEC and 0x11
  let padToggle = false;
  while (dataCw.length < verInfo.dataCw) {
    dataCw.push(padToggle ? 0x11 : 0xec);
    padToggle = !padToggle;
  }

  // 2. Error Correction
  const ec = rsCompute(new Uint8Array(dataCw), verInfo.ecCw);
  const finalCodewords = [...dataCw, ...ec];

  // 3. Matrix construction
  const size = verInfo.size;
  const matrix = Array.from({ length: size }, () => new Int8Array(size).fill(-1));
  const reserved = Array.from({ length: size }, () => new Uint8Array(size));

  function setModule(r, c, val, isRes = true) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val ? 1 : 0;
      if (isRes) reserved[r][c] = 1;
    }
  }

  // Finder pattern helper
  function drawFinder(row, col) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        const isDark = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                       (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                       (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        setModule(nr, nc, isDark ? 1 : 0, true);
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Alignment patterns
  if (verInfo.aligns.length > 0) {
    for (const r of verInfo.aligns) {
      for (const c of verInfo.aligns) {
        if (reserved[r][c]) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isDark = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
            setModule(r + dr, c + dc, isDark ? 1 : 0, true);
          }
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const val = i % 2 === 0 ? 1 : 0;
    if (!reserved[6][i]) setModule(6, i, val, true);
    if (!reserved[i][6]) setModule(i, 6, val, true);
  }

  // Dark module
  setModule(size - 8, 8, 1, true);

  // Reserve format areas
  for (let i = 0; i < 9; i++) {
    if (!reserved[8][i]) reserved[8][i] = 1;
    if (!reserved[i][8]) reserved[i][8] = 1;
    if (!reserved[8][size - 1 - i]) reserved[8][size - 1 - i] = 1;
    if (!reserved[size - 1 - i][8]) reserved[size - 1 - i][8] = 1;
  }

  // 4. Place Data Codewords (Zig-Zag)
  let cwIdx = 0;
  let bitIdx = 7;
  let upward = true;

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing column
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const c of [right, right - 1]) {
        if (!reserved[r][c]) {
          let bit = 0;
          if (cwIdx < finalCodewords.length) {
            bit = (finalCodewords[cwIdx] >> bitIdx) & 1;
            bitIdx--;
            if (bitIdx < 0) {
              bitIdx = 7;
              cwIdx++;
            }
          }
          // Apply Mask Pattern 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = (bit ^ (mask ? 1 : 0)) ? 1 : 0;
        }
      }
    }
    upward = !upward;
  }

  // 5. Format Info: Error Level L (01) + Mask 0 (000) -> 0b01000 = 8
  // BCH(15, 5) with mask 0x5412 -> 0b111011111000100
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
  // Top-left
  const tlCoords = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    matrix[tlCoords[i][0]][tlCoords[i][1]] = formatBits[i];
  }
  // Bottom-left and Top-right
  for (let i = 0; i < 7; i++) {
    matrix[size - 1 - i][8] = formatBits[i];
  }
  for (let i = 0; i < 8; i++) {
    matrix[8][size - 8 + i] = formatBits[7 + i];
  }

  return matrix;
}

/**
 * Render QR matrix as compact ASCII using Unicode half-blocks (▀ / ▄ / █ / space).
 */
export function renderQRAscii(text, options = {}) {
  const matrix = generateQRMatrix(text);
  const size = matrix.length;
  const border = options.border ?? 2;
  const fullSize = size + border * 2;

  // Build grid with border (0 = light/white, 1 = dark/black)
  const grid = Array.from({ length: fullSize }, () => new Uint8Array(fullSize).fill(0));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      grid[r + border][c + border] = matrix[r][c] === 1 ? 1 : 0;
    }
  }

  const lines = [];
  for (let r = 0; r < fullSize; r += 2) {
    let line = '';
    for (let c = 0; c < fullSize; c++) {
      const top = grid[r][c];
      const bottom = (r + 1 < fullSize) ? grid[r + 1][c] : 0;
      // In terminal, dark is foreground/background
      if (top && bottom) {
        line += '█';
      } else if (top && !bottom) {
        line += '▀';
      } else if (!top && bottom) {
        line += '▄';
      } else {
        line += ' ';
      }
    }
    lines.push(line);
  }

  return lines.join('\n');
}
