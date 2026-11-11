# Liquid Dev — Development Server & On-Device App Specification

Version: **1.0.0**  
Target Environment: **Android Native Runtime (arm64-v8a) + Pure Node.js CLI**

---

## 1. Overview & Architecture

**Liquid Dev** is an Expo-Go-style rapid development workflow for the Liquid frontend framework on Android. It allows developers to edit `.liq` and `.js` files on an AArch64 Linux environment (or a PC on the same LAN) and experience sub-second native UI updates on a real Android device without rebuilding or reinstalling APKs.

```
┌──────────────────────────────────────────────┐
│  Developer Machine / Proot Terminal         │
│  `liquid dev` Server (Pure Node.js)          │
│                                              │
│  ├─ HTTP Server (Manifest, Bundle, Assets)   │
│  ├─ WebSocket Server (/ws, Port 3000)        │
│  ├─ Incremental .liq Watcher & Compiler      │
│  └─ Console Log & Error Terminal Reporter    │
└──────────────────────┬───────────────────────┘
                       │
       HTTP / WS       │  Pairing Token Secured
 (127.0.0.1 or LAN IP) │  Deep Link: liquid://dev
                       │
┌──────────────────────▼───────────────────────┐
│  Liquid Dev App (com.liquid.dev)             │
│                                              │
│  ├─ DevLauncherActivity (Home, Recents, DeepLink)
│  ├─ DevLiquidActivity (QuickJS & Native Views)
│  ├─ WebSocket Client (Auto-Reconnect)        │
│  ├─ Native Error Overlay (Mapped Source Code)│
│  ├─ Dev Menu (Shake Gesture / Floating HUD)  │
│  ├─ Built-in Native Modules (Storage, Haptics...)
│  └─ Debug Inspector (127.0.0.1:8765)         │
└──────────────────────────────────────────────┘
```

---

## 2. Security & Pairing Model

1. **Pairing Token**:
   - On server startup, a cryptographically secure random token (e.g. `8f4b2a9e`) is generated.
   - Every HTTP endpoint (`/manifest.json`, `/bundle.js`, `/assets/*`) and WebSocket connection (`/ws`) requires this token either as a URL query parameter (`?token=<token>`) or as an `Authorization: Bearer <token>` header.
   - Missing or mismatched tokens are rejected immediately with HTTP `401 Unauthorized` or WebSocket close code `4001`.
2. **Path Traversal Protection**:
   - The asset server resolves paths strictly within the project `rootDir`.
   - Any path resolving outside `rootDir` (or containing `..`, null bytes, or unauthorized schemes) is rejected with HTTP `403 Forbidden`.
3. **Network Security Config**:
   - The Liquid Dev app includes an Android Network Security Configuration (`res/xml/network_security_config.xml`) that permits cleartext HTTP only for local loopback (`127.0.0.1`, `localhost`) and LAN subnets (`192.168.0.0/16`, `10.0.0.0/8`, `172.16.0.0/12`), strictly scoped to `com.liquid.dev`. Standalone production apps never include this.

---

## 3. Communication Protocol Specification

All WebSocket messages are encoded as UTF-8 JSON objects with a mandatory `type` string and a numeric `protocolVersion` (`1`).

### 3.1 Device &rarr; Server Messages

#### A. `hello`
Sent immediately upon WebSocket connection by the device.
```json
{
  "type": "hello",
  "protocolVersion": 1,
  "device": {
    "model": "Redmi K60 Ultra",
    "brand": "Xiaomi",
    "androidVersion": "14",
    "sdkVersion": 34,
    "runtimeVersion": "1.0",
    "appVersion": "1.0.0",
    "supportedModules": ["device", "clipboard", "haptics", "toast", "storage", "openUrl", "fetch"]
  }
}
```

#### B. `log`
Forwarded `console.log`, `console.info`, `console.warn`, and `console.error` calls from the device JS engine to the terminal.
```json
{
  "type": "log",
  "protocolVersion": 1,
  "level": "log",
  "args": ["Counter incremented to:", 5],
  "timestamp": 1731310000000
}
```

#### C. `error`
Uncaught JavaScript runtime exceptions on the device.
```json
{
  "type": "error",
  "protocolVersion": 1,
  "message": "TypeError: cannot read property 'title' of undefined",
  "stack": "at render (main.bundle.js:142:15)",
  "mappedStack": "at App.liq:24:9"
}
```

#### D. `ack`
Acknowledges that a bundle with a specific `buildId` has been received, compiled, and mounted into the native view hierarchy.
```json
{
  "type": "ack",
  "protocolVersion": 1,
  "buildId": "a1b2c3d4"
}
```

#### E. `request-reload`
Requests an immediate recompile and push from the server (e.g. triggered via the in-app Dev Menu).
```json
{
  "type": "request-reload",
  "protocolVersion": 1
}
```

---

### 3.2 Server &rarr; Device Messages

#### A. `hello-ack`
Sent by the server acknowledging the device connection.
```json
{
  "type": "hello-ack",
  "protocolVersion": 1,
  "status": "ok",
  "serverVersion": "1.0.0",
  "buildId": "a1b2c3d4"
}
```

#### B. `reload`
Notifies the device that source code has changed and a new bundle is ready for evaluation.
```json
{
  "type": "reload",
  "protocolVersion": 1,
  "buildId": "e5f6g7h8",
  "timestamp": 1731310005000
}
```

#### C. `compile-error`
Informs the device of a compile-time error in a `.liq` or `.js` file, triggering the native error overlay.
```json
{
  "type": "compile-error",
  "protocolVersion": 1,
  "error": {
    "file": "src/App.liq",
    "line": 42,
    "column": 5,
    "message": "Unexpected token in UI section: 'button.btn.invalid++'",
    "frame": "40 |   div.card\n41 |     h2 Counter\n42 >     button.btn.invalid++\n   |     ^\n43 |       span +"
  }
}
```

#### D. `clear-error`
Instructs the device to dismiss the error overlay when compilation succeeds.
```json
{
  "type": "clear-error",
  "protocolVersion": 1
}
```

#### E. `ping`
Periodic keep-alive probe sent by the server. Device responds or resets keep-alive timer.
```json
{
  "type": "ping",
  "protocolVersion": 1
}
```

---

## 4. HTTP Endpoints

| Method | Endpoint | Query Param | Description |
|---|---|---|---|
| `GET` | `/manifest.json` | `?token=<token>` | Project `liquid.manifest.json` metadata (name, version, runtimeVersion, required modules). |
| `GET` | `/bundle.js` | `?token=<token>` | Full bundled JavaScript source code for QuickJS evaluation. |
| `GET` | `/bundle.js.map`| `?token=<token>` | Optional separate source map for error mapping. |
| `GET` | `/assets/*` | `?token=<token>` | Serves public static assets (images, icons) strictly inside the project root. |
| `GET` | `/status` | — | Health check returning `{ status: 'ok', buildId, server: 'liquid-dev' }`. |

---

## 5. Built-in Native Modules Contract

Liquid Dev bundles a standardized set of core native modules available in `globalThis.__liquid_native_bridge.invokeModuleMethod(moduleName, method, argsJson)`:

1. **`device`**:
   - `getInfo()` &rarr; `{ model: string, brand: string, manufacturer: string, osVersion: string, sdkVersion: number, isTablet: boolean }`
2. **`clipboard`**:
   - `getString()` &rarr; `{ text: string }`
   - `setString({ text })` &rarr; `{ success: boolean }`
3. **`haptics`**:
   - `vibrate({ durationMs })` &rarr; `{ success: boolean }`
   - `impact({ style })` &rarr; `{ success: boolean }`
4. **`toast`**:
   - `show({ message, duration: 'short' | 'long' })` &rarr; `{ success: boolean }`
5. **`storage`**:
   - `getItem({ key })` &rarr; `{ value: string | null }`
   - `setItem({ key, value })` &rarr; `{ success: boolean }`
   - `removeItem({ key })` &rarr; `{ success: boolean }`
   - `clear()` &rarr; `{ success: boolean }`
6. **`openUrl`**:
   - `canOpen({ url })` &rarr; `{ supported: boolean }`
   - `open({ url })` &rarr; `{ opened: boolean }`
7. **`fetch`**:
   - `request({ url, method, headers, body })` &rarr; `{ status, headers, body }`

---

## 6. Deep Link & Launcher Specification

- **Scheme**: `liquid://dev`
- **Format**: `liquid://dev?url=<encoded_http_url>&token=<pairing_token>`
- **Example**: `liquid://dev?url=http%3A%2F%2F127.0.0.1%3A3000&token=8f4b2a9e`
- **Behavior**:
  - The Android launcher parses the `url` and `token` query parameters.
  - Adds the host to local persistent history (`SharedPreferences`).
  - Launches `DevLiquidActivity` to fetch manifest and bundle.
  - If server is unreachable or version incompatible, gracefully returns to `DevLauncherActivity` with an explanatory dialog.
