import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync, execSync } from 'node:child_process';
import { compile } from '@mkdevofficial/liquid-compiler';
import { printBanner } from './banner.js';
import { getUnifiedRuntimeBundle, processUserImports } from './runtime-bundle.js';
import { checkBundleLinking, LiquidLinkError } from './link-check.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function buildAndroidCommand(options = {}) {
  printBanner();
  const isRelease = Boolean(options.release);
  const enableInspect = Boolean(options.inspect || !isRelease);
  const enableStamp = Boolean(options.stamp || !isRelease);
  const mode = isRelease ? 'release' : 'debug';
  console.log(`  \x1b[1;36mLiquid build android\x1b[0m \x1b[90mv1.0.0\x1b[0m (\x1b[33m${mode}\x1b[0m${enableInspect ? ' + \x1b[35minspect\x1b[0m' : ''}${enableStamp ? ' + \x1b[34mstamp\x1b[0m' : ''})`);
  console.log('  Targeting native Android views + QuickJS\n');

  const rootDir = process.cwd();
  const buildStart = Date.now();

  // 1. Generate unique build stamp for verification & provenance
  const buildStamp = {
    id: crypto.randomBytes(4).toString('hex'),
    time: new Date().toISOString(),
    mode,
    inspect: enableInspect,
    stamp: enableStamp
  };

  // 2. Read project config
  const config = loadProjectConfig(rootDir);
  console.log(`  \x1b[90mApp:\x1b[0m     ${config.appName} (${config.packageId} v${config.version})`);
  console.log(`  \x1b[90mBuild:\x1b[0m   ${buildStamp.id} (${buildStamp.time})`);

  // 3. Prepare .liquid/android directory
  const targetAndroidDir = path.join(rootDir, '.liquid', 'android');
  prepareAndroidProject(targetAndroidDir, config);

  // 4. Compile and bundle app
  console.log('  \x1b[34m•\x1b[0m Compiling .liq bundle...');
  const assetsDir = path.join(targetAndroidDir, 'app', 'src', 'main', 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  const bundleCode = createAndroidBundle(rootDir, config, buildStamp);
  const bundleJsPath = path.join(assetsDir, 'main.bundle.js');
  fs.writeFileSync(bundleJsPath, bundleCode, 'utf8');

  // 5. Write build stamp and bundle manifest
  fs.writeFileSync(
    path.join(assetsDir, 'liquid_build.json'),
    JSON.stringify(buildStamp, null, 2),
    'utf8'
  );

  const manifest = {
    name: config.appName,
    version: config.version,
    buildId: buildStamp.id,
    buildTime: buildStamp.time,
    buildMode: buildStamp.mode,
    inspect: buildStamp.inspect,
    stamp: buildStamp.stamp,
    entry: 'main.bundle.js',
    runtimeVersion: '1.0',
    requiredPermissions: config.permissions || ['android.permission.INTERNET'],
    assets: []
  };
  fs.writeFileSync(
    path.join(assetsDir, 'liquid.manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );

  // 6. If release, precompile to QuickJS bytecode
  if (isRelease) {
    const bytecodePath = path.join(assetsDir, 'main.bundle.qbc');
    const compiled = compileToBytecode(bundleJsPath, bytecodePath);
    if (compiled) {
      console.log('  \x1b[32m✔\x1b[0m Precompiled QuickJS bytecode generated (main.bundle.qbc)');
    }
  }

  // 7. Ensure prebuilt JNI library exists in jniLibs
  ensureQuickJsLibrary(targetAndroidDir);

  // 8. Run Gradle assemble
  console.log(`  \x1b[34m•\x1b[0m Running Gradle assemble${isRelease ? 'Release' : 'Debug'}...`);
  const gradleStart = Date.now();

  const gradleTask = isRelease ? 'assembleRelease' : 'assembleDebug';
  const gradlewPath = path.join(targetAndroidDir, 'gradlew');

  const env = {
    ...process.env,
    JAVA_HOME: process.env.JAVA_HOME || '/home/kali/jdk17',
    ANDROID_HOME: process.env.ANDROID_HOME || '/home/kali/android-sdk'
  };

  const gradleArgs = [gradleTask];
  if (options.offline) {
    gradleArgs.push('--offline');
  }

  const gradleResult = spawnSync(gradlewPath, gradleArgs, {
    cwd: targetAndroidDir,
    env,
    stdio: 'inherit'
  });

  const buildDuration = ((Date.now() - buildStart) / 1000).toFixed(2);
  const gradleDuration = ((Date.now() - gradleStart) / 1000).toFixed(2);

  if (gradleResult.status !== 0) {
    console.error(`\n  \x1b[31m✖ Gradle build failed with code ${gradleResult.status}\x1b[0m\n`);
    process.exitCode = gradleResult.status || 1;
    return;
  }

  // 8. Find generated APK
  const apkRelativeDir = isRelease ? 'app/build/outputs/apk/release' : 'app/build/outputs/apk/debug';
  const apkDir = path.join(targetAndroidDir, apkRelativeDir);
  let apkFile = null;
  if (fs.existsSync(apkDir)) {
    const files = fs.readdirSync(apkDir);
    apkFile = files.find(f => f.endsWith('.apk'));
  }

  if (apkFile) {
    const fullApkPath = path.join(apkDir, apkFile);
    const apkSize = (fs.statSync(fullApkPath).size / (1024 * 1024)).toFixed(2);
    console.log(`\n  \x1b[32m✔ Built Android ${mode} APK in ${buildDuration}s (Gradle: ${gradleDuration}s)\x1b[0m\n`);
    console.log(`  \x1b[1mAPK Path:\x1b[0m ${path.relative(rootDir, fullApkPath)}`);
    console.log(`  \x1b[1mAPK Size:\x1b[0m ${apkSize} MB (native views, zero WebView, arm64-v8a)\n`);

    // Always copy the exact verified APK to /sdcard/liquid.apk
    try {
      if (fs.existsSync('/sdcard')) {
        fs.copyFileSync(fullApkPath, '/sdcard/liquid.apk');
        if (!isRelease) {
          fs.copyFileSync(fullApkPath, '/sdcard/liquid-debug.apk');
        }
        const stampSummary = `Build ID: ${buildStamp.id} | Mode: ${buildStamp.mode} | Time: ${buildStamp.time} | Inspect: ${buildStamp.inspect}\nAPK: /sdcard/liquid.apk (${apkSize} MB)\n`;
        fs.writeFileSync('/sdcard/liquid_build.txt', stampSummary, 'utf8');
        console.log(`  \x1b[32m✔ Copied APK to /sdcard/liquid.apk (Build ID: ${buildStamp.id})\x1b[0m`);
        console.log(`  \x1b[90mBuild info written to /sdcard/liquid_build.txt\x1b[0m\n`);
      }
    } catch (e) {
      console.warn(`  \x1b[33mℹ Note: Could not copy APK to /sdcard: ${e.message}\x1b[0m`);
    }

    return fullApkPath;
  } else {
    console.log(`\n  \x1b[32m✔ Gradle build completed in ${buildDuration}s\x1b[0m\n`);
  }
}

export async function runAndroidCommand(options = {}) {
  const apkPath = await buildAndroidCommand({ ...options, release: false });
  if (!apkPath || !fs.existsSync(apkPath)) return;

  const rootDir = process.cwd();
  const config = loadProjectConfig(rootDir);

  console.log('  \x1b[34m•\x1b[0m Checking for ADB devices...');
  try {
    const adbDevices = execSync('adb devices', { encoding: 'utf8' });
    const lines = adbDevices.split('\n').filter(l => l.trim() && !l.startsWith('List of devices'));

    if (lines.length === 0) {
      console.log('  \x1b[33mℹ No ADB device connected.\x1b[0m APK is ready at: ' + apkPath);
      return;
    }

    console.log('  \x1b[34m•\x1b[0m Installing APK to device...');
    execSync(`adb install -r "${apkPath}"`, { stdio: 'inherit' });

    console.log('  \x1b[34m•\x1b[0m Launching app...');
    execSync(`adb shell am start -n "${config.packageId}/.MainActivity"`, { stdio: 'inherit' });

    console.log(`\n  \x1b[32m✔ App launched on device: ${config.packageId}\x1b[0m\n`);
  } catch (err) {
    console.warn(`  \x1b[33mℹ ADB command skipped or failed: ${err.message}\x1b[0m`);
  }
}

export function loadProjectConfig(rootDir) {
  let pkg = {};
  const pkgPath = path.join(rootDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    } catch {}
  }

  let lqConfig = {};
  const lqConfigPath = path.join(rootDir, 'liquid.config.json');
  if (fs.existsSync(lqConfigPath)) {
    try {
      lqConfig = JSON.parse(fs.readFileSync(lqConfigPath, 'utf8'));
    } catch {}
  }

  const rawName = lqConfig.appName || lqConfig.name || pkg.name || 'LiquidApp';
  const cleanName = rawName.replace(/[@\/_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).trim();

  let packageId = lqConfig.packageId || lqConfig.package;
  if (!packageId) {
    const safePkg = (pkg.name || 'app').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'app';
    packageId = `com.liquid.${safePkg}`;
  }

  return {
    appName: cleanName,
    packageId: packageId,
    version: lqConfig.version || pkg.version || '1.0.0',
    versionCode: lqConfig.versionCode || 1,
    orientation: lqConfig.orientation || 'portrait',
    permissions: lqConfig.permissions || ['android.permission.INTERNET']
  };
}

function prepareAndroidProject(targetDir, config) {
  const templateDir = path.resolve(__dirname, '..', 'templates', 'android');

  copyDirectoryRecursive(templateDir, targetDir, (content, filepath) => {
    if (filepath.endsWith('.kts') || filepath.endsWith('.xml') || filepath.endsWith('.properties') || filepath.endsWith('.kt')) {
      return content
        .replace(/\{\{PACKAGE_NAME\}\}/g, config.packageId)
        .replace(/\{\{APP_NAME\}\}/g, config.appName)
        .replace(/\{\{VERSION_NAME\}\}/g, config.version)
        .replace(/\{\{VERSION_CODE\}\}/g, String(config.versionCode))
        .replace(/\{\{ORIENTATION\}\}/g, config.orientation);
    }
    return content;
  });

  // Ensure gradlew is executable
  const gradlewPath = path.join(targetDir, 'gradlew');
  if (fs.existsSync(gradlewPath)) {
    fs.chmodSync(gradlewPath, 0o755);
  }

  // Relocate MainActivity.kt to matching package directory
  const packageDir = config.packageId.replace(/\./g, '/');
  const targetJavaDir = path.join(targetDir, 'app', 'src', 'main', 'java', packageDir);
  fs.mkdirSync(targetJavaDir, { recursive: true });
  const templateAppDir = path.join(targetDir, 'app', 'src', 'main', 'java', 'com', 'liquid', 'app');
  const srcMainAct = path.join(templateAppDir, 'MainActivity.kt');
  const destMainAct = path.join(targetJavaDir, 'MainActivity.kt');
  if (fs.existsSync(srcMainAct) && srcMainAct !== destMainAct) {
    fs.copyFileSync(srcMainAct, destMainAct);
    fs.rmSync(templateAppDir, { recursive: true, force: true });
  }
}

function copyDirectoryRecursive(src, dest, transformFn) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath, transformFn);
    } else {
      let content = fs.readFileSync(srcPath);
      // If text file, apply transform
      if (/\.(kt|kts|xml|properties|json|gradle|txt|sh)$/.test(entry.name)) {
        const text = content.toString('utf8');
        const transformed = transformFn ? transformFn(text, srcPath) : text;
        fs.writeFileSync(destPath, transformed, 'utf8');
      } else {
        fs.writeFileSync(destPath, content);
      }
    }
  }
}

function ensureQuickJsLibrary(androidDir) {
  const destDir = path.join(androidDir, 'liquid-android-runtime', 'src', 'main', 'jniLibs', 'arm64-v8a');
  fs.mkdirSync(destDir, { recursive: true });
  const destFile = path.join(destDir, 'libliquid-quickjs.so');

  if (fs.existsSync(destFile)) return;

  const localPrebuilt = path.resolve(
    __dirname,
    '..',
    '..',
    'liquid-android-native',
    'prebuilt',
    'arm64-v8a',
    'libliquid-quickjs.so'
  );

  if (fs.existsSync(localPrebuilt)) {
    fs.copyFileSync(localPrebuilt, destFile);
  }
}

function findFiles(dir, ext, list = []) {
  if (!fs.existsSync(dir)) return list;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === '.liquid') {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findFiles(full, ext, list);
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      list.push(full);
    }
  }
  return list;
}

function getComponentNameFromFile(filePath) {
  const base = path.basename(filePath, '.liq');
  return base.replace(/[^a-zA-Z0-9_$]/g, '_') || 'Component';
}

export function createAndroidBundle(rootDir, config, buildStamp = {}) {
  const allDiagnostics = [];
  const componentBlocks = [];
  const sourceFiles = [];
  const sourcemapEntries = [];

  // Gather all .liq files in project (e.g. src/App.liq, src/components/Header.liq)
  const liqFiles = findFiles(rootDir, '.liq').sort();

  if (liqFiles.length > 0) {
    for (const f of liqFiles) {
      const relPath = path.relative(rootDir, f).replace(/\\/g, '/');
      const compName = getComponentNameFromFile(f);
      const source = fs.readFileSync(f, 'utf8');
      sourceFiles.push({ path: relPath, content: source });

      const compResult = compile(source, {
        target: 'android',
        file: relPath
      });

      if (compResult.diagnostics && compResult.diagnostics.length > 0) {
        allDiagnostics.push(...compResult.diagnostics);
      }

      // Convert export default function to named component function and resolve aliases
      let cleaned = processUserImports(compResult.code)
        .replace(/^\s*function\s+([a-zA-Z0-9_$]+)\s*\(/gm, (m, name) => {
          if (name === 'App' || name === compName) return `function ${compName}(`;
          return m;
        });

      componentBlocks.push({ file: relPath, code: cleaned, lineMap: compResult.lineMap || {} });
    }
  } else {
    // Default fallback component
    const fallbackSource = `--- style
.container {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.title {
  font-size: 24px;
  font-weight: bold;
  color: #0ea5e9;
  margin-bottom: 8px;
}
.text {
  font-size: 16px;
  color: #4b5563;
}

--- ui
view.container
  text.title Liquid Android
  text.text Running on Native Android Views + QuickJS!
`;
    sourceFiles.push({ path: 'App.liq', content: fallbackSource });
    const compResult = compile(fallbackSource, { target: 'android', file: 'App.liq' });
    componentBlocks.push({ file: 'App.liq', code: processUserImports(compResult.code), lineMap: compResult.lineMap || {} });
  }

  // Print compile-time Android CSS diagnostics (filter out info-only noise)
  const relevantDiagnostics = allDiagnostics.filter(d => d.status !== 'info');
  if (relevantDiagnostics.length > 0) {
    console.log('\n  \x1b[33m• Android CSS Diagnostics:\x1b[0m');
    for (const d of relevantDiagnostics) {
      const tag = d.status === 'unsupported' ? '\x1b[31m[unsupported]\x1b[0m' : '\x1b[36m[approximated]\x1b[0m';
      console.log(`    \x1b[90m${d.file}:${d.line}\x1b[0m ${tag} ${d.message}`);
    }
    const unsupCount = relevantDiagnostics.filter(d => d.status === 'unsupported').length;
    const approxCount = relevantDiagnostics.filter(d => d.status === 'approximated').length;
    console.log(`    \x1b[90mSummary:\x1b[0m ${relevantDiagnostics.length} diagnostics (${unsupCount} unsupported, ${approxCount} approximated)\n`);
  }

  // Gather other .js helper modules in src/ (excluding main.js)
  const helperBlocks = [];
  const srcJsFiles = findFiles(path.join(rootDir, 'src'), '.js');
  for (const f of srcJsFiles) {
    const rel = path.relative(rootDir, f).replace(/\\/g, '/');
    if (rel !== 'src/main.js' && rel !== 'src/index.js') {
      const helperCode = fs.readFileSync(f, 'utf8');
      sourceFiles.push({ path: rel, content: helperCode });
      helperBlocks.push({ file: rel, code: processUserImports(helperCode) });
    }
  }

  // Check if user code already declares compile
  const allUserCode = [
    ...helperBlocks.map(h => h.code),
    ...componentBlocks.map(c => c.code)
  ].join('\n');
  const hasUserCompile = /(?:^|\n)\s*function\s+compile\b/.test(allUserCode);

  // Unified Runtime Bundle
  const runtimeCode = getUnifiedRuntimeBundle(rootDir, { target: 'android', excludeCompilerStub: hasUserCompile });

  // Assemble full bundle and construct line-based source map
  const preamble = `// Liquid Universal Runtime Bundle\n(function(global) {\n  global.__LIQUID_BUILD_STAMP__ = ${JSON.stringify(buildStamp)};\n`;
  let currentLine = (preamble.match(/\n/g) || []).length + 1;

  // Runtime lines
  const runtimeLines = (runtimeCode.match(/\n/g) || []).length + 1;
  sourcemapEntries.push({
    file: 'liquid-runtime.js',
    bundleStart: currentLine,
    bundleEnd: currentLine + runtimeLines
  });
  currentLine += runtimeLines + 2;

  // Helpers
  const renderedHelpers = [];
  for (const h of helperBlocks) {
    const linesCount = (h.code.match(/\n/g) || []).length + 1;
    sourcemapEntries.push({
      file: h.file,
      bundleStart: currentLine,
      bundleEnd: currentLine + linesCount
    });
    renderedHelpers.push(h.code);
    currentLine += linesCount + 2;
  }

  // Components
  const renderedComponents = [];
  for (const c of componentBlocks) {
    const linesCount = (c.code.match(/\n/g) || []).length + 1;
    sourcemapEntries.push({
      file: c.file,
      bundleStart: currentLine,
      bundleEnd: currentLine + linesCount,
      lineMap: c.lineMap || {}
    });
    renderedComponents.push(c.code);
    currentLine += linesCount + 2;
  }

  const postamble = `
  // Initialize Android Native Renderer
  const _androidRenderer = new AndroidBatchRenderer();
  setRenderer(_androidRenderer);

  // Mount to root native container (id=1)
  const rootNode = _androidRenderer.rootNode;
  const compFn = typeof App !== 'undefined' ? App : (typeof globalThis.Component !== 'undefined' ? globalThis.Component : null);
  if (typeof compFn === 'function') {
    mount(compFn, rootNode);
  }
  _androidRenderer.flush();
})(globalThis);
`;

  const bundleCode = `
// Liquid Universal Runtime Bundle
(function(global) {
  global.__LIQUID_BUILD_STAMP__ = ${JSON.stringify(buildStamp)};
  global.__LIQUID_SOURCEMAP__ = ${JSON.stringify(sourcemapEntries)};

${runtimeCode}

  // Application Helpers & Stores
  ${renderedHelpers.join('\n\n')}

  // Compiled Components
  ${renderedComponents.join('\n\n')}

  // Initialize Android Native Renderer
  const _androidRenderer = new AndroidBatchRenderer();
  setRenderer(_androidRenderer);

  // Mount to root native container (id=1)
  const rootNode = _androidRenderer.rootNode;
  const compFn = typeof App !== 'undefined' ? App : (typeof globalThis.Component !== 'undefined' ? globalThis.Component : null);
  if (typeof compFn === 'function') {
    mount(compFn, rootNode);
  }
  _androidRenderer.flush();
})(globalThis);
`;

  // Build-time Scope Analysis & Link Check
  checkBundleLinking(bundleCode, {
    sourceFiles,
    target: 'android',
    throwOnError: true
  });

  return bundleCode;
}

function compileToBytecode(jsFile, qbcFile) {
  const qjscDir = path.resolve(__dirname, '..', 'bin', 'qjsc-arm64');
  const qjscBin = path.join(qjscDir, 'qjsc');

  if (fs.existsSync(qjscBin)) {
    const res = spawnSync(qjscBin, ['-b', '-o', qbcFile, jsFile], {
      env: {
        ...process.env,
        LD_LIBRARY_PATH: `${qjscDir}:${process.env.LD_LIBRARY_PATH || ''}`
      }
    });
    return res.status === 0;
  }
  return false;
}
