#!/usr/bin/env bash
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_PROJECT_DIR="$REPO_ROOT/packages/liquid-cli/templates/android"

echo -e "\n\033[1;36m==> Building Liquid dev app (com.liquid.dev)\033[0m"
BUILD_START=$(date +%s)

cd "$ANDROID_PROJECT_DIR"

# Ensure gradlew is executable
chmod +x ./gradlew

# Ensure jniLibs exists in liquid-android-runtime
RUNTIME_JNI_DIR="$ANDROID_PROJECT_DIR/liquid-android-runtime/src/main/jniLibs/arm64-v8a"
mkdir -p "$RUNTIME_JNI_DIR"
if [ ! -f "$RUNTIME_JNI_DIR/libliquid-quickjs.so" ]; then
    PREBUILT_SO="$REPO_ROOT/packages/liquid-android-native/prebuilt/arm64-v8a/libliquid-quickjs.so"
    if [ -f "$PREBUILT_SO" ]; then
        cp "$PREBUILT_SO" "$RUNTIME_JNI_DIR/libliquid-quickjs.so"
    else
        echo "Error: libliquid-quickjs.so not found!"
        exit 1
    fi
fi

# Run Gradle build for release
./gradlew :liquid-dev-app:assembleRelease --no-daemon

BUILD_END=$(date +%s)
DURATION=$((BUILD_END - BUILD_START))

APK_PATH="$ANDROID_PROJECT_DIR/liquid-dev-app/build/outputs/apk/release/liquid-dev-app-release.apk"
if [ ! -f "$APK_PATH" ]; then
    # Alternate naming in some gradle versions
    APK_PATH=$(find "$ANDROID_PROJECT_DIR/liquid-dev-app/build/outputs/apk/release" -name "*.apk" | head -n 1)
fi

if [ -f "$APK_PATH" ]; then
    APK_SIZE_BYTES=$(wc -c < "$APK_PATH")
    APK_SIZE_MB=$(awk "BEGIN {printf \"%.2f\", $APK_SIZE_BYTES / 1048576}")

    echo -e "\n\033[32m✔ Built Liquid dev APK in ${DURATION}s\033[0m"
    echo -e "  \033[1mAPK Path:\033[0m $APK_PATH"
    echo -e "  \033[1mAPK Size:\033[0m ${APK_SIZE_MB} MB"

    # Copy to sdcard for direct device installation
    if [ -d "/sdcard" ]; then
        mkdir -p "/sdcard/Download"
        cp "$APK_PATH" "/sdcard/Download/liquid-dev.apk" 2>/dev/null || true
        cp "$APK_PATH" "/sdcard/liquid-dev.apk" 2>/dev/null || true
        echo -e "  \033[32m✔ Copied to /sdcard/Download/liquid-dev.apk and /sdcard/liquid-dev.apk\033[0m"
        echo -e "  \033[90mInstall command: termux-open /sdcard/Download/liquid-dev.apk\033[0m\n"
    fi
else
    echo -e "\n\033[31m✖ Error: Could not locate built APK.\033[0m\n"
    exit 1
fi
