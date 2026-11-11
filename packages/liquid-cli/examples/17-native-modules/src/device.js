// Safe cross-platform native bridge helper
export function getDeviceInfo() {
  if (typeof globalThis !== 'undefined' && globalThis.__liquid_native_device_info) {
    return globalThis.__liquid_native_device_info();
  }
  return {
    platform: typeof navigator !== 'undefined' ? navigator.platform || 'Web' : 'Node/QuickJS',
    arch: 'arm64',
    isNative: false,
    engine: 'Liquid Runtime'
  };
}

export function triggerHapticFeedback(pattern = 50) {
  if (typeof globalThis !== 'undefined' && globalThis.__liquid_native_vibrate) {
    globalThis.__liquid_native_vibrate(pattern);
    return true;
  }
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
    return true;
  }
  return false;
}
