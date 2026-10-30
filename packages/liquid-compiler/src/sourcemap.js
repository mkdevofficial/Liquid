/**
 * Pure JavaScript Base64 VLQ Source Map Generator (v3)
 */

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function encodeVLQ(num) {
  let result = '';
  let vlq = num < 0 ? (-num << 1) | 1 : num << 1;
  do {
    let digit = vlq & 31;
    vlq >>>= 5;
    if (vlq > 0) {
      digit |= 32;
    }
    result += BASE64_CHARS[digit];
  } while (vlq > 0);
  return result;
}

export class SourceMapGenerator {
  constructor({ file = 'output.js', sourceRoot = '', sourceFile = 'input.liq' } = {}) {
    this.file = file;
    this.sourceRoot = sourceRoot;
    this.sourceFile = sourceFile;
    this.mappings = []; // list of mappings per generated line
    this.sources = [sourceFile];
    this.names = [];
  }

  addMapping({ generatedLine, generatedColumn, originalLine, originalColumn }) {
    this.mappings.push({
      genLine: generatedLine,
      genCol: generatedColumn,
      origLine: originalLine,
      origCol: originalColumn
    });
  }

  generate() {
    // Sort mappings by generated line and column
    this.mappings.sort((a, b) => a.genLine - b.genLine || a.genCol - b.genCol);

    let prevGenLine = 1;
    let prevGenCol = 0;
    let prevOrigLine = 0;
    let prevOrigCol = 0;
    let prevSource = 0;

    const lines = [];
    let currentLineMappings = [];

    for (const m of this.mappings) {
      while (m.genLine > prevGenLine) {
        lines.push(currentLineMappings.join(','));
        currentLineMappings = [];
        prevGenLine++;
        prevGenCol = 0;
      }

      // Encode segment
      const genColDiff = m.genCol - prevGenCol;
      const sourceDiff = 0 - prevSource;
      const origLineDiff = (m.origLine - 1) - prevOrigLine;
      const origColDiff = (m.origCol - 1) - prevOrigCol;

      const segment =
        encodeVLQ(genColDiff) +
        encodeVLQ(sourceDiff) +
        encodeVLQ(origLineDiff) +
        encodeVLQ(origColDiff);

      currentLineMappings.push(segment);

      prevGenCol = m.genCol;
      prevOrigLine = m.origLine - 1;
      prevOrigCol = m.origCol - 1;
      prevSource = 0;
    }

    lines.push(currentLineMappings.join(','));

    return {
      version: 3,
      file: this.file,
      sources: this.sources,
      mappings: lines.join(';')
    };
  }
}
