/**
 * liquid edit command handler
 */

import { startEditor } from '@mkdevofficial/liquid-edit';

export async function editCommand(filePath, options = {}) {
  const args = [];
  if (options.virtual) args.push('--virtual');
  if (options.rows) args.push(`--rows=${options.rows}`);
  if (options.cols) args.push(`--cols=${options.cols}`);
  if (filePath) args.push(filePath);

  return startEditor(args);
}
