import { createCommand } from './create.js';
import { devCommand } from './dev.js';
import { buildCommand } from './build.js';
import { previewCommand } from './preview.js';
import { checkCommand } from './check.js';
import { editCommand } from './edit.js';
import { guideCommand } from './guide.js';
import { printBanner } from './banner.js';

export { createCommand } from './create.js';
export { devCommand } from './dev.js';
export { buildCommand } from './build.js';
export { previewCommand } from './preview.js';
export { checkCommand } from './check.js';
export { editCommand } from './edit.js';
export { guideCommand } from './guide.js';

export async function runCLI(argv = process.argv.slice(2)) {
  const args = [...argv];
  const command = args[0];

  if (!command || command === '--help' || command === '-h' || command === 'help') {
    printBanner();
    printHelp();
    return;
  }

  if (command === '--version' || command === '-v' || command === 'version') {
    console.log('1.0.0');
    return;
  }

  const options = parseOptions(args.slice(1));

  switch (command) {
    case 'create':
      await createCommand(options._[0], options);
      break;

    case 'dev':
      await devCommand(options);
      break;

    case 'build':
      await buildCommand(options);
      break;

    case 'preview':
      await previewCommand(options);
      break;

    case 'check':
      await checkCommand(options);
      break;

    case 'edit':
      await editCommand(options._[0], options);
      break;

    case 'guide':
    case 'docs':
      await guideCommand(options);
      break;

    default:
      printBanner();
      console.error(`  \x1b[31mUnknown command: '${command}'\x1b[0m\n`);
      printHelp();
      process.exitCode = 1;
      break;
  }
}

function parseOptions(args) {
  const options = { _: [] };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--port' || arg === '-p') {
      options.port = parseInt(args[++i], 10);
    } else if (arg.startsWith('--port=')) {
      options.port = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--host' || arg === '-h') {
      options.host = args[++i];
    } else if (arg.startsWith('--host=')) {
      options.host = arg.split('=')[1];
    } else if (arg === '--minimal') {
      options.minimal = true;
    } else if (arg === '--virtual') {
      options.virtual = true;
    } else if (arg.startsWith('--rows=')) {
      options.rows = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--cols=')) {
      options.cols = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--outDir') {
      options.outDir = args[++i];
    } else if (arg.startsWith('--outDir=')) {
      options.outDir = arg.split('=')[1];
    } else if (arg.startsWith('-')) {
      // ignore or store unknown flags
    } else {
      options._.push(arg);
    }
  }

  return options;
}

function printHelp() {
  console.log(`  Usage:
    liquid <command> [options]

  Commands:
    create <name>       Scaffold a new Liquid project (--minimal for minimal template)
    dev                 Start development server with fast rebuild and hot reload
    build               Build for production (pure JS bundling, hashing, minification)
    preview             Serve production build locally
    check               Validate all .liq files in project without building
    edit [file]         Open file in phone-friendly liquid-edit TUI (alias: lqe)
    guide               Launch interactive documentation & error catalog server (default port: 4000)

  Options:
    -p, --port <number> Server port (default: 3000 for dev, 4000 for guide, 4173 for preview)
    -h, --host <string> Server host (default: 0.0.0.0)
    --minimal           Scaffold minimal template during create
    --outDir <path>     Output directory for build (default: dist)
    --help              Display help information
    --version           Display CLI version
`);
}
