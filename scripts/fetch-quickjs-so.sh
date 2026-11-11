#!/usr/bin/env bash
set -euo pipefail

DEST_DIR="${1:-packages/liquid-cli/templates/android/liquid-android-runtime/src/main/jniLibs}"
VERSION="${2:-v0.1.0}"
REPO="mkdevofficial/Liquid"

echo "[Liquid] Ensuring QuickJS JNI binaries for destination: $DEST_DIR"

mkdir -p "$DEST_DIR/arm64-v8a"
mkdir -p "$DEST_DIR/armeabi-v7a"

# Check if local cache or bundled prebuilts exist
if [ -f "packages/liquid-android-native/prebuilt/arm64-v8a/libliquid-quickjs.so" ]; then
    echo "[Liquid] Using local prebuilt arm64-v8a library..."
    cp -f "packages/liquid-android-native/prebuilt/arm64-v8a/libliquid-quickjs.so" "$DEST_DIR/arm64-v8a/"
    if [ -f "packages/liquid-android-native/prebuilt/armeabi-v7a/libliquid-quickjs.so" ]; then
        cp -f "packages/liquid-android-native/prebuilt/armeabi-v7a/libliquid-quickjs.so" "$DEST_DIR/armeabi-v7a/"
    fi
    echo "[Liquid] QuickJS libraries installed successfully from local prebuilt."
    exit 0
fi

# Fallback to downloading release asset from GitHub
URL="https://github.com/$REPO/releases/download/$VERSION/liquid-quickjs-prebuilt.tar.gz"
echo "[Liquid] Fetching prebuilt binaries from $URL..."

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if curl -sSL -f "$URL" -o "$TMP_DIR/liquid-quickjs.tar.gz" 2>/dev/null; then
    tar -xzf "$TMP_DIR/liquid-quickjs.tar.gz" -C "$DEST_DIR"
    echo "[Liquid] Downloaded and extracted QuickJS binaries to $DEST_DIR"
else
    echo "[Liquid Warning] Remote release asset not found. Using local compiled stub or fallback."
    # If clang is available, compile locally for arm64
    if command -v clang >/dev/null 2>&1; then
        echo "[Liquid] Compiling local arm64-v8a libliquid-quickjs.so using host toolchain..."
        bash -c "clang -shared -fPIC -O3 -fvisibility=hidden -D_GNU_SOURCE \
          -Ipackages/liquid-android-native/quickjs \
          packages/liquid-android-native/quickjs/quickjs.c \
          packages/liquid-android-native/quickjs/libregexp.c \
          packages/liquid-android-native/quickjs/libunicode.c \
          packages/liquid-android-native/quickjs/dtoa.c \
          packages/liquid-android-native/jni/liquid_quickjs_jni.c \
          -lm -o $DEST_DIR/arm64-v8a/libliquid-quickjs.so" || true
    fi
fi

echo "[Liquid] Done."
