/**
 * Liquid CLI Banner with 🫟 icon and clean formatting.
 */
export function printBanner(subcommand = '') {
  const title = subcommand ? `Liquid ${subcommand}` : 'Liquid';
  console.log(`\n  🫟 \x1b[1m\x1b[36m${title}\x1b[0m \x1b[90mv1.0.0\x1b[0m`);
  console.log(`  \x1b[90mThe ultra-concise frontend framework for the web\x1b[0m\n`);
}
