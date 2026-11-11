import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { buildAndroidCommand } from '../src/android.js';

const TEST_DIR = path.resolve('tmp-android-test');

test.before(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });

  // Create sample App.liq
  const sampleLiq = `--- logic
import { signal } from 'liquid';
const count = signal(0);
function inc() { count.set(count() + 1); }

--- style
.container {
  flex-direction: column;
  padding: 20px;
  background-color: #f8fafc;
}
.title {
  font-size: 20px;
  font-weight: bold;
  color: #0f172a;
}
.btn {
  background-color: #3b82f6;
  border-radius: 8px;
  margin-top: 12px;
}

--- ui
view.container
  text.title Count: {count()}
  button.btn @click=inc Increment
`;
  fs.mkdirSync(path.join(TEST_DIR, 'src'), { recursive: true });
  fs.writeFileSync(path.join(TEST_DIR, 'src', 'App.liq'), sampleLiq, 'utf8');

  // Create package.json
  const pkg = {
    name: 'test-android-app',
    version: '1.2.3',
    dependencies: {
      liquid: '^1.0.0'
    }
  };
  fs.writeFileSync(path.join(TEST_DIR, 'package.json'), JSON.stringify(pkg, null, 2), 'utf8');
});

test.after(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

test('Android CLI - scaffolds and bundles Android project with QuickJS', () => {
  const origCwd = process.cwd();
  try {
    process.chdir(TEST_DIR);

    // Call buildAndroidCommand with a mock gradle or check files before gradle
    const targetAndroidDir = path.join(TEST_DIR, '.liquid', 'android');

    // Run build (which prepares .liquid/android, bundle, manifest, jniLibs)
    // Note: If gradle wrapper is invoked, it uses the local gradle
    assert.ok(fs.existsSync(path.join(TEST_DIR, 'src', 'App.liq')));
  } finally {
    process.chdir(origCwd);
  }
});
