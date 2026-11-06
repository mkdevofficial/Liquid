# 🫟 `liquid-edit` (`lqe`)

> A fast, modern terminal code editor written in 100% pure JavaScript.  
> **Phone-first, Termux-friendly, zero native dependencies, no postinstall scripts.**

Built natively for the [Liquid](https://github.com/liquid-org/liquid) framework, with first-class support for `.liq` single-file components, live syntax highlighting, live compiler diagnostics, compiled JS/CSS view, and embedded dev server runner.

---

## ⚡ 3-Minute Quickstart

### Launch with `liquid` CLI or standalone `lqe`
```bash
# Open a file in liquid-edit
liquid edit src/App.liq

# Or use the standalone alias
lqe src/App.liq

# Open current workspace or new buffer
lqe
```

### Termux (Android) One-Liner
```bash
pkg install nodejs
npm install -g liquid-cli
lqe
```

---

## 📱 Phone-First Design & Touch Controls

`liquid-edit` is specifically engineered to run comfortably on a **40-column by 20-row terminal** on mobile phones using virtual touch keyboards (e.g., Gboard, Samsung Keyboard) where Ctrl and Alt combinations are awkward:

1. **Touch & Mouse Support (SGR 1006 reporting)**:
   - **Tap**: Place cursor directly at character coordinate.
   - **Drag**: Select text range.
   - **Scroll gestures**: Two-finger scroll up and down through the buffer.
   - **Touch targets**: Tap on menu dropdowns, open tabs, explorer files, or bottom quick buttons.
2. **Phone Quick-Action Bar** (fixed at the bottom row):
   - `[💾 Save]` — Atomic save to disk.
   - `[↩ Undo]` — Undo last edit.
   - `[↪ Redo]` — Redo last undone edit.
   - `[🔍 Find]` — Search & replace bar.
   - `[⚡ Cmd]` — Open Command Palette.
   - `[« Out]` — Dedent selection by 2 spaces.
   - `[» In]` — Indent selection by 2 spaces.
   - `[// Com]` — Toggle line comment.
   - `[🫟 Liq]` — Open Liquid tasks / diagnostics.
3. **Command Palette (`F1` or Tap `[⚡ Cmd]`)**:
   - The primary driver for every action: fuzzy search across 100% of editor commands.
   - Nothing is keybinding-only.
4. **Responsive Layout**:
   - On screens < 60 columns, the file explorer sidebar slides over the buffer as an overlay and auto-hides after file selection.
   - Split panes automatically collapse into swipeable tabs.
5. **Robust Terminal Handling**:
   - Handles bracketed paste mode (`\x1b[200~` ... `\x1b[201~`) so large multi-line pastes never drop characters or trigger indentation stairs.
   - Resolves lone Escape vs escape-sequence timing with an unref'd 40ms timer.
   - Responsive `SIGWINCH` resize handling.

---

## ⌨️ Commands Reference & Shortcuts

| Command | Action | Keybinding |
|---|---|---|
| `help.palette` | Open fuzzy command palette | `F1` |
| `file.save` | Save active file atomically | `Ctrl+S` |
| `file.open` | Fuzzy find and open file in workspace | `Ctrl+P` |
| `file.new` | Open new untitled buffer | `Ctrl+N` |
| `file.close` | Close active tab | `Ctrl+W` |
| `app.exit` | Exit editor cleanly | `Ctrl+Q` |
| `edit.undo` | Undo edit | `Ctrl+Z` |
| `edit.redo` | Redo edit | `Ctrl+Y` |
| `edit.cut` | Cut selection to clipboard (OSC 52 / Termux) | `Ctrl+X` |
| `edit.copy` | Copy selection to clipboard (OSC 52 / Termux) | `Ctrl+C` |
| `edit.paste` | Paste from clipboard | `Ctrl+V` |
| `edit.selectAll` | Select entire buffer | `Ctrl+A` |
| `edit.comment` | Toggle line comment (`//` or `<!-- -->`) | `Ctrl+/` |
| `edit.indent` | Indent line or selection by 2 spaces | `Tab` |
| `edit.dedent` | Dedent line or selection by 2 spaces | `Shift+Tab` |
| `search.find` | Find in buffer | `Ctrl+F` |
| `search.gotoSymbol` | Go to component section, prop, or signal | `Ctrl+Shift+O` |
| `view.toggleSidebar` | Toggle project explorer sidebar | `Ctrl+B` |
| `view.toggleTheme` | Toggle between Dark and Light themes | `F2` |
| `liquid.toggleCompiled`| Split view showing live compiled JS/CSS | `F8` |
| `liquid.toggleDev` | Run or toggle embedded Liquid dev server | `F5` |
| `liquid.format` | Auto-format `.liq` document | `Shift+Alt+F` |
| `liquid.snippets` | Insert Liquid snippet | `Ctrl+Space` |

---

## 🫟 Liquid Framework Deep Integration

- **Live Compiler Diagnostics**: Debounced off the typing hot path, liquid-compiler checks `.liq` syntax and displays error badges in the gutter (`✖`, `⚠`), squiggles, and exact messages in the status bar and Problems panel.
- **Compiled Output Viewer (`F8`)**: Opens a live vertical split showing the generated JavaScript and scoped CSS emitted by `liquid-compiler` as you type.
- **Embedded Task Runner (`F5`)**: Spawns `liquid dev` or `liquid build` in a background split and scans output for Local and LAN URLs (`http://localhost:3000`, `http://192.168.x.x:3000`) for easy phone testing.
- **Component Outline (`Ctrl+Shift+O`)**: Jumps directly to component sections (`--- logic`, `--- style`, `--- ui`), signals, props, and functions.
- **Tab & Mixed Indent Enforcement**: Flags tab characters in indentation with actionable warnings to adhere to the Liquid 2-space specification.

---

## 🎨 Configuration & Themes

`liquid-edit` reads project configuration from `liquid.config.js` and `.editorconfig`:

```javascript
// liquid.config.js
export default {
  theme: 'dark', // 'dark' | 'light'
  editor: {
    tabSize: 2,
    showLineNumbers: true,
    showIndentGuides: true
  }
};
```

---

## 🛠️ Architecture

- **100% Pure JavaScript**: Zero native C/C++ addons, no `node-gyp`, no prebuilt binaries. Installs instantly on Termux Android AArch64, Raspberry Pi, Debian, macOS, and Windows.
- **Piece Table Buffer**: O(1) inserts and deletes, with incremental line cache updates for keystroke latency under 16ms even on 10,000-line files.
- **Double-Buffered Differential ANSI Screen**: Maintains front and back character grids, emitting ANSI escape codes only for updated cells with synchronized update sequences (`\x1b[?2025h`) to prevent flicker.
- **Unicode Grapheme Segmenter**: Uses `Intl.Segmenter` to accurately measure wide emojis (such as Liquid 🫟 U+1FADF with width 2), CJK ideographs, combining tashkeel in Arabic, and RTL detection.
