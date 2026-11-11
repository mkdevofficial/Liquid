# 17 — Native Modules & Platform APIs 🫟

Demonstrates interacting with native device capabilities (haptics, telemetry, system metrics) via the Liquid Android bridge with fallback Web APIs.

```
┌──────────────────────────────────────┐
│ 🫟 17 — Native Modules & APIs        │
├──────────────────────────────────────┤
│ Device & Runtime Telemetry           │
│ Platform: arm64                      │
│ Native Engine: Liquid Runtime        │
├──────────────────────────────────────┤
│ Native Hardware Capabilities         │
│ [Trigger Haptic Pulse]               │
│ Status: Ready                        │
└──────────────────────────────────────┘
```

## How It Works
- Native platform calls check `LiquidNativeModuleRegistry` in QuickJS.
- Web browsers fall back gracefully to HTML5 APIs (`navigator.vibrate`), preventing uncaught exceptions.

## Commands
```bash
liquid dev
```
