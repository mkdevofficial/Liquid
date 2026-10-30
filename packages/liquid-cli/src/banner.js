/**
 * Liquid CLI Banner with 🫟 icon and clean formatting.
 * Supports graceful fallback to plain word 'Liquid' when terminal cannot render modern emoji.
 */

export function shouldUseEmoji() {
  if (process.env.LIQUID_EMOJI === '1') return true;
  if (process.env.LIQUID_EMOJI === '0' || process.env.LIQUID_NO_EMOJI === '1') return false;

  // Check dumb terminal
  if (process.env.TERM === 'dumb') return false;

  // Check locale encoding
  const locale = (process.env.LC_ALL || process.env.LC_CTYPE || process.env.LANG || '').toLowerCase();
  if (locale && !locale.includes('utf-8') && !locale.includes('utf8')) {
    return false;
  }

  // Non-TTY stdout (e.g. pipes, redirected files, unless in CI)
  if (!process.stdout.isTTY && !process.env.CI) {
    return false;
  }

  return true;
}

export function formatBanner(subcommand = '') {
  const title = subcommand ? `Liquid ${subcommand}` : 'Liquid';
  const prefix = shouldUseEmoji() ? '🫟 ' : '';
  const line1 = `\n  ${prefix}\x1b[1m\x1b[36m${title}\x1b[0m \x1b[90mv1.0.0\x1b[0m`;
  const line2 = `  \x1b[90mThe ultra-concise frontend framework for the web\x1b[0m\n`;
  return `${line1}\n${line2}`;
}

export function printBanner(subcommand = '') {
  console.log(formatBanner(subcommand));
}
