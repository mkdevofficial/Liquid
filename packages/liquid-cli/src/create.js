import fs from 'node:fs';
import path from 'node:path';
import { printBanner } from './banner.js';

/**
 * Scaffold a new Liquid project from a template.
 */
export async function createCommand(projectName, options = {}) {
  printBanner('create');

  if (!projectName) {
    console.error('  \x1b[31mError: Please specify the project name:\x1b[0m');
    console.error('    liquid create <my-app> [--minimal]\n');
    process.exitCode = 1;
    return;
  }

  const targetDir = path.resolve(process.cwd(), projectName);
  if (fs.existsSync(targetDir)) {
    console.error(`  \x1b[31mError: Directory '${projectName}' already exists.\x1b[0m\n`);
    process.exitCode = 1;
    return;
  }

  const isMinimal = Boolean(options.minimal);
  console.log(`  Scaffolding ${isMinimal ? 'minimal' : 'standard'} project in \x1b[36m${projectName}\x1b[0m...\n`);

  fs.mkdirSync(path.join(targetDir, 'src/components'), { recursive: true });
  fs.mkdirSync(path.join(targetDir, 'public'), { recursive: true });

  // 1. package.json
  const pkgJson = {
    name: projectName,
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'liquid dev',
      build: 'liquid build',
      preview: 'liquid preview',
      check: 'liquid check'
    },
    dependencies: {
      liquid: '^1.0.0'
    }
  };
  fs.writeFileSync(path.join(targetDir, 'package.json'), JSON.stringify(pkgJson, null, 2));

  // 2. liquid.config.js
  const configContent = `export default {
  port: 3000,
  host: '0.0.0.0'
};
`;
  fs.writeFileSync(path.join(targetDir, 'liquid.config.js'), configContent);

  // 3. index.html
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName} — Liquid 🫟</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`;
  fs.writeFileSync(path.join(targetDir, 'index.html'), htmlContent);

  // 4. public/favicon.svg
  const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <text y=".9em" font-size="90">🫟</text>
</svg>`;
  fs.writeFileSync(path.join(targetDir, 'public/favicon.svg'), svgFavicon);

  // 5. src/main.js
  const mainJsContent = `import { mount } from 'liquid';
import App from './App.liq';

mount(App, document.getElementById('app'));
`;
  fs.writeFileSync(path.join(targetDir, 'src/main.js'), mainJsContent);

  if (isMinimal) {
    // Minimal App.liq
    const minimalApp = `--- logic
import { signal } from 'liquid';
const name = signal('Liquid');

--- style
.container {
  font-family: system-ui, sans-serif;
  text-align: center;
  margin-top: 4rem;
}
h1 {
  color: #0284c7;
}

--- ui
div.container
  h1 🫟 Hello from {name()}!
  p Ultra-short, fine-grained UI.
`;
    fs.writeFileSync(path.join(targetDir, 'src/App.liq'), minimalApp);
  } else {
    // Standard App.liq with components, state, slots, and styling
    const headerLiq = `--- logic
const { title = 'Liquid App' } = defineProps();

--- style
header.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: #0f172a;
  color: #f8fafc;
  border-radius: 12px;
}
h1.logo {
  font-size: 1.5rem;
  margin: 0;
}

--- ui
header.header
  h1.logo 🫟 {title}
  div.actions
    slot
`;
    fs.writeFileSync(path.join(targetDir, 'src/components/Header.liq'), headerLiq);

    const standardApp = `--- logic
import { signal, computed } from 'liquid';
import Header from './components/Header.liq';

const count = signal(0);
const double = computed(() => count() * 2);
const todos = signal([
  { id: 1, title: 'Write elegant UI in .liq', done: true },
  { id: 2, title: 'Embrace fine-grained signals', done: false }
]);
const newTodoTitle = signal('');

function addTodo() {
  const val = newTodoTitle().trim();
  if (!val) return;
  todos.set([...todos(), { id: Date.now(), title: val, done: false }]);
  newTodoTitle.set('');
}

function toggleTodo(id) {
  todos.set(todos().map(t => t.id === id ? { ...t, done: !t.done } : t));
}

function removeTodo(id) {
  todos.set(todos().filter(t => t.id !== id));
}

--- style
:global(body) {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #f1f5f9;
  color: #1e293b;
}
.app-container {
  max-width: 600px;
  margin: 2rem auto;
  padding: 0 1rem;
}
.card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 1.5rem;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}
.counter-box {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.btn {
  background: #0284c7;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}
.btn:hover {
  background: #0369a1;
}
.input-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.input-text {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
}
.todo-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
}
.done {
  text-decoration: line-through;
  color: #94a3b8;
}

--- ui
div.app-container
  Header title="${projectName}"
    span.badge Ready to build

  div.card
    h2 Counter
    div.counter-box
      button.btn @click=count.set(count() - 1) -
      span Count: {count()} (Double: {double()})
      button.btn @click=count.set(count() + 1) +

  div.card
    h2 Todo List
    div.input-row
      input.input-text placeholder="What needs doing?" $value={newTodoTitle} @keydown.enter=addTodo
      button.btn @click=addTodo Add
    ul.todo-list
      each todos() as item (item.id)
        li.todo-item
          span class="{item.done ? 'done' : ''}" @click=toggleTodo(item.id) {item.title}
          button.btn @click=removeTodo(item.id) ✕
`;
    fs.writeFileSync(path.join(targetDir, 'src/App.liq'), standardApp);
  }

  // 6. README.md
  const readmeContent = `# ${projectName} 🫟

Built with [Liquid](https://github.com), the ultra-concise frontend framework for the web.

## Quick Start

\`\`\`bash
# Start development server with hot reload
npm run dev

# Validate .liq files
npm run check

# Build for production
npm run build

# Preview production build locally
npm run preview
\`\`\`
`;
  fs.writeFileSync(path.join(targetDir, 'README.md'), readmeContent);

  console.log(`  \x1b[32m✔ Project '${projectName}' created successfully!\x1b[0m\n`);
  console.log(`  Next steps:`);
  console.log(`    \x1b[36mcd ${projectName}\x1b[0m`);
  console.log(`    \x1b[36mnpm run dev\x1b[0m\n`);
}
