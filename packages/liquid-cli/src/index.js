import { printBanner } from './banner.js';

export async function createCommand(...args) {
  const mod = await import('./create.js');
  return mod.createCommand(...args);
}
export async function devCommand(...args) {
  const mod = await import('./dev.js');
  return mod.devCommand(...args);
}
export async function buildCommand(...args) {
  const mod = await import('./build.js');
  return mod.buildCommand(...args);
}
export async function previewCommand(...args) {
  const mod = await import('./preview.js');
  return mod.previewCommand(...args);
}
export async function checkCommand(...args) {
  const mod = await import('./check.js');
  return mod.checkCommand(...args);
}
export async function editCommand(...args) {
  const mod = await import('./edit.js');
  return mod.editCommand(...args);
}
export async function guideCommand(...args) {
  const mod = await import('./guide.js');
  return mod.guideCommand(...args);
}
export async function buildAndroidCommand(...args) {
  const mod = await import('./android.js');
  return mod.buildAndroidCommand(...args);
}
export async function runAndroidCommand(...args) {
  const mod = await import('./android.js');
  return mod.runAndroidCommand(...args);
}
export async function examplesCommand(...args) {
  const mod = await import('./examples.js');
  return mod.examplesCommand(...args);
}

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

    case 'templates':
      await createCommand('--list', options);
      break;

    case 'examples':
      await examplesCommand(options._[0], options);
      break;

    case 'dev':
      await devCommand(options);
      break;

    case 'build':
      if (options._[0] === 'android') {
        await buildAndroidCommand(options);
      } else {
        await buildCommand(options);
      }
      break;

    case 'run':
      if (options._[0] === 'android') {
        await runAndroidCommand(options);
      } else {
        printBanner();
        console.error(`  \x1b[31mUnknown target for 'run': '${options._[0]}'\x1b[0m\n`);
      }
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

    case 'play':
    case 'arena':
      await guideCommand({ ...options, play: true });
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
    } else if (arg === '--template' || arg === '-t') {
      options.template = args[++i];
    } else if (arg.startsWith('--template=')) {
      options.template = arg.split('=')[1];
    } else if (arg === '--list' || arg === '-l') {
      options.list = true;
    } else if (arg === '--copy' || arg === '-c') {
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        options.copy = args[++i];
      } else {
        options.copy = true;
      }
    } else if (arg.startsWith('--copy=')) {
      options.copy = arg.split('=')[1];
    } else if (arg === '--minimal') {
      options.minimal = true;
    } else if (arg === '--play' || arg === '-P') {
      options.play = true;
    } else if (arg === '--release') {
      options.release = true;
    } else if (arg === '--debug') {
      options.release = false;
    } else if (arg === '--inspect') {
      options.inspect = true;
    } else if (arg === '--stamp') {
      options.stamp = true;
    } else if (arg === '--token') {
      options.token = args[++i];
    } else if (arg.startsWith('--token=')) {
      options.token = arg.split('=')[1];
    } else if (arg === '--install') {
      options.install = true;
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
    create <name>       Scaffold a new Liquid project (--template <id> | --minimal | --list)
    templates           List all available project templates (alias: create --list)
    examples [id]       List or run focused example projects (--copy to duplicate locally)
    dev                 Start development server with fast rebuild and hot reload
    build               Build for production (pure JS bundling, hashing, minification)
    build android       Build native Android APK (--release or --debug)
    run android         Build debug APK and install/launch on connected device via adb
    preview             Serve production build locally
    check               Validate all .liq files in project without building
    edit [file]         Open file in phone-friendly liquid-edit TUI (alias: lqe)
    guide               Launch interactive documentation & error catalog (use --play for gamified arena)
    play                Launch gamified microlearning arena with XP & Seasons (alias: liquid guide --play)

  Options:
    -t, --template <id> Template id to use when creating a project (e.g. starter, shop, arabic-app)
    -l, --list          List available templates or examples
    -c, --copy [dir]    Copy an example to local folder instead of running it
    -p, --port <number> Server port (default: 3000 for dev, 4000 for guide, 4173 for preview)
    -h, --host <string> Server host (default: 0.0.0.0)
    --minimal           Scaffold minimal template during create
    --release           Build release APK (default: debug)
    --inspect           Embed debug inspector in release Android builds (127.0.0.1:8765)
    --stamp             Show visual on-screen build stamp badge (default in debug, opt-in in release)
    --play              Launch directly into the interactive gamified arena with XP and Seasons
    --outDir <path>     Output directory for build (default: dist)
    --help              Display help information
    --version           Display CLI version
`);
}
