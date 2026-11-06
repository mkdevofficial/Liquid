# `liquid-edit` Real Phone / Termux Verification Checklist

Use this checklist to manually verify `liquid-edit` on a physical phone in Termux (or a 40x20 terminal window).

---

## 1. Terminal Setup & Touch Targets
- [ ] **Launch**: Run `lqe demo/Component.liq` or `liquid edit demo/Component.liq`. Verify startup time is sub-second.
- [ ] **40x20 Viewport**: On a portrait screen or 40-column window, verify the 5-row layout:
  - Row 0: Top menu bar (`🫟 File Edit Search View Liquid Help`)
  - Row 1: Tab bar showing `[Component.liq ×]`
  - Middle: Editor viewport with line numbers and syntax highlighted code
  - Row rows-2: Status bar (`[INSERT] Ln 1, Col 1  UTF-8  liq`)
  - Row rows-1: Phone quick-action bar (`[💾 Save] [↩ Undo] [↪ Redo] [🔍 Find] [⚡ Cmd] [« Out] [» In] [// Com] [🫟 Liq]`)
- [ ] **Touch Placement**: Tap on a character in line 5. Verify the cursor immediately jumps to the tapped character.
- [ ] **Touch Drag Selection**: Tap and drag across a word. Verify the text is highlighted with the selection background.
- [ ] **Two-Finger Scroll**: Perform a scroll gesture up and down. Verify the viewport scrolls smoothly without cursor displacement.

---

## 2. Phone Quick-Action Bar
- [ ] **Save `[💾 Save]`**: Tap the save button. Verify dirty indicator in tab disappears and status bar indicates file saved.
- [ ] **Undo / Redo `[↩]` / `[↪]`**: Type a few characters and tap `[↩ Undo]`. Verify text reverts. Tap `[↪ Redo]` and verify text restores.
- [ ] **Command Palette `[⚡ Cmd]`**: Tap `[⚡ Cmd]`. Verify the Command Palette overlay opens centered with search prompt `> `. Type `format` and press Enter to format.
- [ ] **Indent / Dedent `[» In]` / `[« Out]`**: Select multiple lines and tap `[» In]`. Verify lines indent by 2 spaces. Tap `[« Out]` and verify lines dedent.
- [ ] **Comment `[// Com]`**: Place cursor on a line and tap `[// Com]`. Verify line toggles between commented and uncommented.

---

## 3. Keyboard & Text Editing
- [ ] **Virtual Keyboard Typing**: Type code using mobile virtual keyboard (Gboard, Samsung). Verify characters appear without latency.
- [ ] **Auto-Close Pairs**: Type `(`; verify `()` is inserted with cursor in the middle. Type `)`; verify cursor steps over without duplicate character.
- [ ] **Smart Indentation**: In a `.liq` section, press Enter after a tag or brace. Verify next line automatically indents 2 spaces.
- [ ] **Smart Backspace**: Press Backspace on a 2-space indented line. Verify entire 2-space indent is deleted in one keystroke.
- [ ] **Bracketed Paste**: Copy a 50-line code snippet from external browser and paste into Termux. Verify text inserts cleanly without staircasing or lost characters.

---

## 4. Responsive Layout & Mobile Collapsing
- [ ] **Sidebar on Mobile (<60 cols)**: Tap `View` -> `Toggle File Sidebar` or `Ctrl+B`. Verify the file explorer slides in as an overlay over the editor rather than squishing the code.
- [ ] **Sidebar File Tap**: Tap a file in the sidebar. Verify the file opens in a new tab and the overlay auto-hides.
- [ ] **Screen Rotation (Portrait to Landscape)**: Rotate phone to landscape. Verify editor receives `SIGWINCH` and differential redraw seamlessly adapts to wider viewport.

---

## 5. Liquid Integration & Tasks
- [ ] **Live Compiler Diagnostics**: Deliberately write invalid syntax (e.g., `<button @click=>`). Verify gutter displays `✖` error badge, status bar shows error count, and error description displays.
- [ ] **Compiled JS/CSS Split (`F8`)**: Tap `Liquid` -> `Toggle Compiled Viewer` or press `F8`. Verify secondary pane displays live compiled output.
- [ ] **Task Runner (`F5`)**: Tap `Liquid` -> `Run Dev Server` or press `F5`. Verify dev server starts and extracts clickable/copyable `http://localhost:3000` and LAN URL.

---

## 6. Crash Safety & Clean Exit
- [ ] **Exit Cleanliness**: Press `Ctrl+Q` or tap `File` -> `Exit`. Verify terminal restores completely: cursor visible, mouse reporting disabled, alternate screen restored, text colors reset.
- [ ] **Emergency Recovery**: Make an edit without saving, then kill Termux or send `SIGTERM`. Verify recovery file is saved in `/tmp/liquid-edit-recovery/`.
