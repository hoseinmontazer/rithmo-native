#!/usr/bin/env bash

# ==============================================================================
# Rithmo Native Android App Build & Install Script
# ==============================================================================

set -e

# ANSI Color Codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DIR="$SCRIPT_DIR/android"
DIST_DIR="$SCRIPT_DIR/dist"
PACKAGE_NAME="com.rithmo"
MAIN_ACTIVITY="com.rithmo.MainActivity"

# Default Options
BUILD_TYPE="release"
DO_CLEAN=false
DO_INSTALL=false
DO_LAUNCH=false
BAZAAR_TEST=false
CAFEBAZAAR_PACKAGE_NAME="com.farsitel.bazaar"

print_banner() {
    echo -e "${CYAN}${BOLD}"
    echo "======================================================"
    echo "         📱 RITHMO ANDROID BUILD & INSTALL          "
    echo "======================================================"
    echo -e "${NC}"
}

usage() {
    echo -e "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -r, --release      Build standalone Release APK (Default, works without Metro server)"
    echo "  -d, --debug        Build Debug APK"
    echo "  -c, --clean        Run gradle clean before building"
    echo "  -i, --install      Install APK onto connected Android device via ADB"
    echo "  -l, --launch       Launch app after installing (implies --install)"
    echo "  -b, --bazaar-test  Install with Cafe Bazaar recorded as the installer"
    echo "                     package (adb install -i com.farsitel.bazaar), so a"
    echo "                     sideloaded release build exercises the real Bazaar"
    echo "                     pricing/purchase path instead of the Stripe fallback."
    echo "                     TESTING ONLY — the APK itself is unchanged; this only"
    echo "                     affects what this local install records as its"
    echo "                     installer, same as Cafe Bazaar's own app would."
    echo "                     Implies --install."
    echo "  -h, --help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                  # Just build release APK"
    echo "  $0 -i               # Build release APK and install to connected phone"
    echo "  $0 -i -l            # Build, install, and launch on phone"
    echo "  $0 -c -i -l         # Clean, build, install, and launch"
    echo "  $0 -d -i -l         # Build and install Debug APK"
    echo "  $0 -r -b -l         # Build release, install as a Bazaar-sourced app, and launch"
    exit 0
}

# Parse CLI arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -r|--release)
            BUILD_TYPE="release"
            shift
            ;;
        -d|--debug)
            BUILD_TYPE="debug"
            shift
            ;;
        -c|--clean)
            DO_CLEAN=true
            shift
            ;;
        -i|--install)
            DO_INSTALL=true
            shift
            ;;
        -l|--launch)
            DO_INSTALL=true
            DO_LAUNCH=true
            shift
            ;;
        -b|--bazaar-test)
            DO_INSTALL=true
            BAZAAR_TEST=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            ;;
    esac
done

print_banner

# Step 1: Detect Android SDK & ADB
echo -e "${BLUE}[1/5] Checking environment & tools...${NC}"

# Find Android SDK
if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
    if [ -d "$HOME/Android/Sdk" ]; then
        export ANDROID_HOME="$HOME/Android/Sdk"
        export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
        export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools:$PATH"
    fi
fi

if command -v adb >/dev/null 2>&1; then
    ADB_CMD="$(command -v adb)"
    echo -e "  ✓ ADB found: ${GREEN}$ADB_CMD${NC}"
else
    echo -e "  ${YELLOW}⚠ ADB not found in PATH. Automatic installation to phone won't work unless ADB is installed.${NC}"
    ADB_CMD=""
fi

if ! command -v java >/dev/null 2>&1; then
    echo -e "  ${RED}✗ Java is not installed or not in PATH. Please install OpenJDK 17 or later.${NC}"
    exit 1
else
    echo -e "  ✓ Java found: ${GREEN}$(command -v java)${NC}"
fi

# Step 2: Clean if requested
if [ "$DO_CLEAN" = true ]; then
    echo -e "\n${BLUE}[2/5] Cleaning build cache...${NC}"
    cd "$ANDROID_DIR"
    ./gradlew clean
    cd "$SCRIPT_DIR"
    echo -e "  ✓ Clean completed."
else
    echo -e "\n${BLUE}[2/5] Skipping clean (use -c to clean)...${NC}"
fi

# Step 3: Build APK
echo -e "\n${BLUE}[3/5] Building $BUILD_TYPE APK...${NC}"
cd "$ANDROID_DIR"

if [ "$BUILD_TYPE" == "release" ]; then
    GRADLE_TASK="assembleRelease"
else
    GRADLE_TASK="assembleDebug"
fi

echo -e "  Running: ${CYAN}./gradlew $GRADLE_TASK${NC}"
./gradlew "$GRADLE_TASK" --no-daemon

# Find generated APK
APK_DIR="$ANDROID_DIR/app/build/outputs/apk/$BUILD_TYPE"
APK_FILE=$(find "$APK_DIR" -name "*.apk" -type f | head -n 1)

if [ -z "$APK_FILE" ] || [ ! -f "$APK_FILE" ]; then
    echo -e "\n${RED}✗ Error: APK file was not found in $APK_DIR${NC}"
    exit 1
fi

mkdir -p "$DIST_DIR"
COPIED_APK="$DIST_DIR/$(basename "$APK_FILE")"
cp -f "$APK_FILE" "$COPIED_APK"

echo -e "\n${GREEN}${BOLD}✓ Build Successful!${NC}"
echo -e "  📦 APK Location: ${CYAN}$COPIED_APK${NC}"
echo -e "  📏 APK Size:     ${CYAN}$(du -h "$COPIED_APK" | cut -f1)${NC}"

# Step 4: Install to device if requested
echo -e "\n${BLUE}[4/5] Checking connected Android devices...${NC}"

if [ -n "$ADB_CMD" ]; then
    DEVICES=($($ADB_CMD devices | grep -v "List of devices" | grep "device$" | awk '{print $1}'))
    DEVICE_COUNT=${#DEVICES[@]}

    if [ "$DEVICE_COUNT" -eq 0 ]; then
        echo -e "  ${YELLOW}ℹ No connected Android devices detected via ADB.${NC}"
        echo -e "    To install on your phone:"
        echo -e "    1. Enable ${BOLD}Developer Options${NC} and ${BOLD}USB Debugging${NC} on your phone."
        echo -e "    2. Connect your phone via USB cable (or run 'adb connect <phone-ip>:5555' for wireless debugging)."
        echo -e "    3. Run: ${CYAN}./build-and-install.sh -i${NC} (or: adb install -r \"$COPIED_APK\")"
        echo -e "    Alternatively, you can transfer ${BOLD}$COPIED_APK${NC} to your phone directly."
    else
        echo -e "  ✓ Found ${GREEN}$DEVICE_COUNT${NC} connected device(s):"
        for dev in "${DEVICES[@]}"; do
            MODEL=$($ADB_CMD -s "$dev" shell getprop ro.product.model 2>/dev/null | tr -d '\r' || echo "Android Device")
            echo -e "    - [${GREEN}$dev${NC}] $MODEL"
        done

        if [ "$DO_INSTALL" = true ]; then
            TARGET_DEVICE="${DEVICES[0]}"
            echo -e "\n${BLUE}[5/5] Installing APK to device (${GREEN}$TARGET_DEVICE${NC})...${NC}"
            if [ "$BAZAAR_TEST" = true ]; then
                echo -e "  ${YELLOW}⚠ --bazaar-test: recording installer as $CAFEBAZAAR_PACKAGE_NAME (testing only — real users still install via the actual Bazaar app; this only affects this local install).${NC}"
                $ADB_CMD -s "$TARGET_DEVICE" install -r -d -i "$CAFEBAZAAR_PACKAGE_NAME" "$COPIED_APK"
            else
                $ADB_CMD -s "$TARGET_DEVICE" install -r -d "$COPIED_APK"
            fi
            echo -e "  ${GREEN}${BOLD}✓ App installed successfully!${NC}"

            if [ "$DO_LAUNCH" = true ]; then
                echo -e "\n  🚀 Launching ${CYAN}$PACKAGE_NAME${NC} on device..."
                $ADB_CMD -s "$TARGET_DEVICE" shell am start -n "$PACKAGE_NAME/$MAIN_ACTIVITY"
                echo -e "  ${GREEN}✓ App launched!${NC}"
            fi
        else
            echo -e "\n  Tip: Run ${CYAN}./build-and-install.sh -i${NC} to automatically install onto this device."
        fi
    fi
else
    echo -e "  ADB not available. You can manually copy the APK from: ${CYAN}$COPIED_APK${NC}"
fi

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}${BOLD}All done!${NC} APK is ready at: ${CYAN}$COPIED_APK${NC}"
echo -e "${GREEN}======================================================${NC}"
