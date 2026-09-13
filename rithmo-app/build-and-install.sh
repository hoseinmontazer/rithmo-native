#!/usr/bin/env bash

# ==============================================================================
# Rithmo Android Build, Install & Bazaar Payment Device-Test Runner
# ==============================================================================
#
# Payment provider is decided at BUILD TIME by the Gradle product flavor
# (`bazaar` or `global` — see android/app/build.gradle), never by which app
# installed the APK. `./build-and-install.sh bazaar -i -l` builds the real
# Cafe Bazaar flavor, installs + launches it on a connected physical device,
# verifies the installed build actually reports PAYMENT_PROVIDER=bazaar, waits
# for the app to become ready, and reports current backend subscription
# state — then stops. The actual Cafe Bazaar purchase confirmation is always
# manual: this script never taps a purchase button or spends real money.

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
CAFEBAZAAR_PACKAGE_NAME="com.farsitel.bazaar"
LOG_TAG="Rithmo"
API_BASE_URL="${RITHMO_API_BASE_URL:-https://api.rithmo.ir}"
STATUS_ENDPOINT="/api/subscriptions/status/"
LOGIN_ENDPOINT="/api/auth/jwt/create/"

# Default Options
BUILD_TYPE="release"
FLAVOR=""              # resolved to "global" below if not given
DO_CLEAN=false
DO_INSTALL=false
DO_LAUNCH=false
BAZAAR_TEST=false
PAYMENT_TEST=false
READY_TIMEOUT_SECS=30
PURCHASE_WAIT_SECS="${RITHMO_PURCHASE_WAIT_SECONDS:-180}"

# Report state (filled in as steps run, printed at the end regardless of outcome)
RESULT_BUILD="NOT_RUN"
RESULT_INSTALL="NOT_RUN"
RESULT_LAUNCH="NOT_RUN"
RESULT_PROVIDER="NOT_RUN"
RESULT_PAYMENT_SCREEN="NOT_RUN"
RESULT_PURCHASE="NOT_RUN"
RESULT_BACKEND="NOT_RUN"
RESULT_ENTITLEMENT="NOT_RUN"
REPORT_NOTES=()
DEVICE_MODEL=""
DEVICE_SERIAL=""
REPORTED_PROVIDER=""
COPIED_APK=""

print_banner() {
    echo -e "${CYAN}${BOLD}"
    echo "======================================================"
    echo "   RITHMO (SCREVIA) ANDROID BUILD, INSTALL & TEST     "
    echo "======================================================"
    echo -e "${NC}"
}

usage() {
    echo -e "Usage: $0 [bazaar|global] [options]"
    echo ""
    echo "Flavor (positional, optional):"
    echo "  bazaar             Build the Cafe Bazaar distribution flavor"
    echo "                     (PAYMENT_PROVIDER=bazaar, real Poolakey billing)."
    echo "  global             Build the direct/website distribution flavor"
    echo "                     (PAYMENT_PROVIDER=zibal). Default if omitted."
    echo ""
    echo "Options:"
    echo "  -r, --release      Build standalone Release APK (Default, works without Metro server)"
    echo "  -d, --debug        Build Debug APK"
    echo "  -c, --clean        Run gradle clean before building"
    echo "  -i, --install      Install APK onto connected Android device via ADB"
    echo "  -l, --launch       Launch app after installing, wait for readiness, verify the"
    echo "                     on-device payment provider, and report backend subscription"
    echo "                     state (implies --install; for the bazaar flavor this is the"
    echo "                     full payment-test harness, see --payment-test below)."
    echo "  --payment-test     Explicitly run the full Bazaar payment-test harness (implies"
    echo "                     --install --launch). Only meaningful with the 'bazaar' flavor."
    echo "                     NEVER confirms a real purchase automatically — that step stays"
    echo "                     manual. Reads RITHMO_TEST_AUTH_TOKEN (or RITHMO_TEST_USERNAME"
    echo "                     + RITHMO_TEST_PASSWORD) from the environment for backend"
    echo "                     verification; without either, that step is skipped (NOT_RUN)."
    echo "  -b, --bazaar-test  [legacy] Install with Cafe Bazaar recorded as the installer"
    echo "                     package (adb install -i com.farsitel.bazaar). Diagnostic-only"
    echo "                     now — the 'bazaar' flavor already selects Bazaar billing at"
    echo "                     build time, so this is no longer required for correctness."
    echo "                     Implies --install."
    echo "  -h, --help         Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  RITHMO_API_BASE_URL       Backend base URL (default: $API_BASE_URL)"
    echo "  RITHMO_TEST_AUTH_TOKEN    Bearer access token for an already-authenticated test"
    echo "                            account, used to check subscription status/entitlement."
    echo "  RITHMO_TEST_USERNAME /"
    echo "  RITHMO_TEST_PASSWORD      Used to log in (POST $LOGIN_ENDPOINT) if no token is"
    echo "                            given. Never hardcode these — export them yourself."
    echo "  RITHMO_PURCHASE_WAIT_SECONDS  How long to poll for purchase completion (default 180)."
    echo ""
    echo "Examples:"
    echo "  $0                       # Just build the global-flavor release APK"
    echo "  $0 bazaar                # Build the bazaar-flavor release APK"
    echo "  $0 bazaar -i             # Build bazaar flavor, install to connected phone"
    echo "  $0 bazaar -i -l          # Build, install, launch, verify provider, report state"
    echo "  $0 global -i -l          # Same, for the direct/Zibal flavor"
    echo "  $0 bazaar -c -i -l       # Clean, build, install, launch (bazaar)"
    echo "  $0 bazaar -d -i -l       # Debug APK, install, launch (bazaar)"
    exit 0
}

note() { REPORT_NOTES+=("$1"); }

fail() {
    echo -e "${RED}${BOLD}FAIL: $1${NC}"
    note "FAIL: $1"
}

# On any failure involving the device, dump a short, filtered diagnostic
# section — never the whole unfiltered logcat.
collect_diagnostics() {
    echo -e "\n${YELLOW}${BOLD}--- Diagnostics ---${NC}"
    if [ -z "$DEVICE_SERIAL" ] || [ -z "$ADB_CMD" ]; then
        echo "  (no device/adb resolved — nothing to collect)"
        echo -e "${YELLOW}${BOLD}--- End diagnostics ---${NC}\n"
        return
    fi
    echo -e "${YELLOW}dumpsys package $PACKAGE_NAME (relevant lines):${NC}"
    $ADB_CMD -s "$DEVICE_SERIAL" shell dumpsys package "$PACKAGE_NAME" 2>/dev/null \
        | grep -E "versionName|versionCode|installerPackageName|codePath" | sed 's/^/  /' | head -20
    echo -e "${YELLOW}Relevant logcat lines (Screvia/Rithmo/Poolakey/CafeBazaar/Bazaar/Billing/Subscription/Payment/purchase/verify):${NC}"
    $ADB_CMD -s "$DEVICE_SERIAL" logcat -d 2>/dev/null \
        | grep -Ei "screvia|rithmo|poolakey|cafebazaar|bazaar|billing|subscription|payment|purchase|verify" \
        | tail -n 60 | sed 's/^/  /'
    echo -e "${YELLOW}${BOLD}--- End diagnostics ---${NC}\n"
}

print_report() {
    local overall="PASS"
    for r in "$RESULT_BUILD" "$RESULT_INSTALL" "$RESULT_LAUNCH" "$RESULT_PROVIDER" "$RESULT_BACKEND" "$RESULT_ENTITLEMENT"; do
        if [ "$r" = "FAIL" ]; then
            overall="FAIL"
            break
        fi
    done
    if [ "$overall" != "FAIL" ] && [ "$RESULT_PURCHASE" = "MANUAL" ]; then
        overall="PARTIAL"
    fi

    echo ""
    echo -e "${CYAN}${BOLD}=== Rithmo Bazaar Payment Device Test ===${NC}"
    echo ""
    echo -e "Device:                    ${DEVICE_SERIAL:-N/A} (${DEVICE_MODEL:-unknown})"
    echo -e "App:                       Rithmo ($PACKAGE_NAME)"
    echo -e "Flavor:                    $FLAVOR"
    echo -e "Payment provider:          ${REPORTED_PROVIDER:-unknown} (expected: $EXPECTED_PROVIDER)"
    echo -e "APK:                       ${COPIED_APK:-N/A}"
    echo -e "Backend:                   $API_BASE_URL"
    echo ""
    echo -e "Build:                     $RESULT_BUILD"
    echo -e "Install:                   $RESULT_INSTALL"
    echo -e "Launch:                    $RESULT_LAUNCH"
    echo -e "Provider verification:     $RESULT_PROVIDER"
    echo -e "Payment screen:            $RESULT_PAYMENT_SCREEN"
    echo -e "Bazaar purchase:           $RESULT_PURCHASE"
    echo -e "Backend verification:      $RESULT_BACKEND"
    echo -e "Subscription entitlement:  $RESULT_ENTITLEMENT"
    echo ""
    echo -e "Result:"
    case "$overall" in
        PASS)    echo -e "${GREEN}${BOLD}PASS${NC}" ;;
        PARTIAL) echo -e "${YELLOW}${BOLD}PARTIAL${NC}" ;;
        *)       echo -e "${RED}${BOLD}FAIL${NC}" ;;
    esac
    echo ""
    echo "Notes:"
    if [ ${#REPORT_NOTES[@]} -gt 0 ]; then
        for n in "${REPORT_NOTES[@]}"; do
            echo "  - $n"
        done
    else
        echo "  (none)"
    fi
    echo -e "${CYAN}${BOLD}===========================================${NC}"
}

# ── Parse CLI arguments ───────────────────────────────────────────────────────
# Flavor may appear as a bare positional token (anywhere in the arg list, to
# stay forgiving, but the documented/expected form is first: `bazaar -i -l`).
while [[ $# -gt 0 ]]; do
    case "$1" in
        bazaar|Bazaar|BAZAAR)
            FLAVOR="bazaar"
            shift
            ;;
        global|Global|GLOBAL)
            FLAVOR="global"
            shift
            ;;
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
        --payment-test)
            DO_INSTALL=true
            DO_LAUNCH=true
            PAYMENT_TEST=true
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

if [ -z "$FLAVOR" ]; then
    FLAVOR="global"
    echo -e "${YELLOW}ℹ No flavor given — defaulting to 'global' (direct/Zibal distribution).${NC}"
    echo -e "  Pass 'bazaar' as the first argument to build the Cafe Bazaar flavor."
fi

FLAVOR_CAP="$(tr '[:lower:]' '[:upper:]' <<< "${FLAVOR:0:1}")${FLAVOR:1}"
BUILD_TYPE_CAP="$(tr '[:lower:]' '[:upper:]' <<< "${BUILD_TYPE:0:1}")${BUILD_TYPE:1}"
GRADLE_TASK="assemble${FLAVOR_CAP}${BUILD_TYPE_CAP}"
EXPECTED_PROVIDER="zibal"
if [ "$FLAVOR" = "bazaar" ]; then
    EXPECTED_PROVIDER="bazaar"
fi

# The bazaar flavor's own -i -l run is, by definition, the payment-test flow —
# no separate flag needed for the command the task actually asks for.
if [ "$FLAVOR" = "bazaar" ] && [ "$DO_LAUNCH" = true ]; then
    PAYMENT_TEST=true
fi

print_banner
echo -e "Flavor: ${BOLD}$FLAVOR${NC}  (expected PAYMENT_PROVIDER=${BOLD}$EXPECTED_PROVIDER${NC})   Build type: ${BOLD}$BUILD_TYPE${NC}"

# ── Step 1: Detect Android SDK & ADB ─────────────────────────────────────────
echo -e "\n${BLUE}[1/8] Checking environment & tools...${NC}"

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

if [ "$DO_INSTALL" = true ] && [ -z "$ADB_CMD" ]; then
    fail "ADB is required for --install/--launch but was not found in PATH."
    exit 1
fi

# ── Step 2: Clean if requested ────────────────────────────────────────────────
if [ "$DO_CLEAN" = true ]; then
    echo -e "\n${BLUE}[2/8] Cleaning build cache...${NC}"
    cd "$ANDROID_DIR"
    ./gradlew clean
    cd "$SCRIPT_DIR"
    echo -e "  ✓ Clean completed."
else
    echo -e "\n${BLUE}[2/8] Skipping clean (use -c to clean)...${NC}"
fi

# ── Step 3: Build APK ─────────────────────────────────────────────────────────
echo -e "\n${BLUE}[3/8] Building $FLAVOR $BUILD_TYPE APK (./gradlew $GRADLE_TASK)...${NC}"
cd "$ANDROID_DIR"

if ./gradlew "$GRADLE_TASK" --no-daemon; then
    RESULT_BUILD="PASS"
else
    RESULT_BUILD="FAIL"
    fail "Gradle build ($GRADLE_TASK) did not succeed."
    cd "$SCRIPT_DIR"
    print_report
    exit 1
fi
cd "$SCRIPT_DIR"

APK_DIR="$ANDROID_DIR/app/build/outputs/apk/$FLAVOR/$BUILD_TYPE"
APK_FILE=$(find "$APK_DIR" -name "*.apk" -type f | head -n 1)

if [ -z "$APK_FILE" ] || [ ! -f "$APK_FILE" ]; then
    RESULT_BUILD="FAIL"
    fail "Bazaar APK was not generated (expected an APK under $APK_DIR)."
    print_report
    exit 1
fi

mkdir -p "$DIST_DIR"
COPIED_APK="$DIST_DIR/$(basename "$APK_FILE")"
cp -f "$APK_FILE" "$COPIED_APK"

echo -e "\n${GREEN}${BOLD}✓ Build Successful!${NC}"
echo -e "  APK Location: ${CYAN}$COPIED_APK${NC}"
echo -e "  APK Size:     ${CYAN}$(du -h "$COPIED_APK" | cut -f1)${NC}"

if [ "$DO_INSTALL" != true ]; then
    echo -e "\n${GREEN}======================================================${NC}"
    echo -e "${GREEN}${BOLD}Build only — done.${NC} APK is ready at: ${CYAN}$COPIED_APK${NC}"
    echo -e "  Tip: run ${CYAN}$0 $FLAVOR -i -l${NC} to install, launch and test on a device."
    echo -e "${GREEN}======================================================${NC}"
    exit 0
fi

# ── Step 4: Device detection (exactly one usable real device) ───────────────
echo -e "\n${BLUE}[4/8] Checking connected Android devices...${NC}"
set +e

RAW_DEVICES="$($ADB_CMD devices | tail -n +2)"
USABLE=()
UNAUTHORIZED=()
OFFLINE=()
EMULATORS=()
while IFS=$'\t' read -r serial state; do
    [ -z "$serial" ] && continue
    case "$serial" in
        emulator-*) EMULATORS+=("$serial"); continue ;;
    esac
    case "$state" in
        device) USABLE+=("$serial") ;;
        unauthorized) UNAUTHORIZED+=("$serial") ;;
        offline) OFFLINE+=("$serial") ;;
    esac
done <<< "$RAW_DEVICES"

if [ ${#UNAUTHORIZED[@]} -gt 0 ]; then
    fail "Device unauthorized: ${UNAUTHORIZED[*]}. Accept the USB-debugging prompt on the phone and re-run."
    exit 1
fi

if [ ${#USABLE[@]} -eq 0 ]; then
    if [ ${#EMULATORS[@]} -gt 0 ]; then
        fail "No physical Android device detected — only emulator(s) found (${EMULATORS[*]}). This workflow requires a real device for Bazaar payment testing."
    elif [ ${#OFFLINE[@]} -gt 0 ]; then
        fail "Device offline: ${OFFLINE[*]}. Reconnect the USB cable / re-enable wireless debugging and re-run."
    else
        fail "No Android device detected. Enable USB debugging and connect a phone, then re-run."
    fi
    exit 1
fi

if [ ${#USABLE[@]} -gt 1 ]; then
    fail "Multiple Android devices detected (${USABLE[*]}). Disconnect all but one, or set ANDROID_SERIAL, then re-run."
    exit 1
fi

DEVICE_SERIAL="${USABLE[0]}"
DEVICE_MODEL="$($ADB_CMD -s "$DEVICE_SERIAL" shell getprop ro.product.model 2>/dev/null | tr -d '\r')"
echo -e "  ✓ Using device [${GREEN}$DEVICE_SERIAL${NC}] ${DEVICE_MODEL:-Android Device}"

# ── Step 5: Install + verify the APK is actually on-device ───────────────────
echo -e "\n${BLUE}[5/8] Installing APK to device (${GREEN}$DEVICE_SERIAL${NC})...${NC}"

INSTALL_ARGS=(-r -d)
if [ "$BAZAAR_TEST" = true ]; then
    echo -e "  ${YELLOW}⚠ --bazaar-test: recording installer as $CAFEBAZAAR_PACKAGE_NAME (diagnostic only — the bazaar flavor's own BuildConfig.PAYMENT_PROVIDER already governs billing, not this).${NC}"
    INSTALL_ARGS+=(-i "$CAFEBAZAAR_PACKAGE_NAME")
fi

INSTALL_OUTPUT="$($ADB_CMD -s "$DEVICE_SERIAL" install "${INSTALL_ARGS[@]}" "$COPIED_APK" 2>&1)"
INSTALL_STATUS=$?
echo "$INSTALL_OUTPUT" | sed 's/^/  /'

if [ $INSTALL_STATUS -ne 0 ] || ! grep -q "Success" <<< "$INSTALL_OUTPUT"; then
    RESULT_INSTALL="FAIL"
    fail "adb install did not report Success. See output above (common cause: no release signing config — check keystore.properties)."
    collect_diagnostics
    print_report
    exit 1
fi

PM_PATH="$($ADB_CMD -s "$DEVICE_SERIAL" shell pm path "$PACKAGE_NAME" 2>/dev/null | tr -d '\r')"
if [ -z "$PM_PATH" ]; then
    RESULT_INSTALL="FAIL"
    fail "Installed app does not report a package path (adb shell pm path $PACKAGE_NAME returned nothing)."
    collect_diagnostics
    print_report
    exit 1
fi

RESULT_INSTALL="PASS"
echo -e "  ${GREEN}${BOLD}✓ App installed and verified on device ($PM_PATH)${NC}"

if [ "$DO_LAUNCH" != true ]; then
    RESULT_LAUNCH="NOT_RUN"
    print_report
    exit 0
fi

# ── Step 6: Launch + bounded readiness wait ──────────────────────────────────
echo -e "\n${BLUE}[6/8] Launching $PACKAGE_NAME on device...${NC}"

# Force-stop before clearing logs and launching: on some devices/OEM
# skins (observed on a Samsung device, likely its aggressive process-
# retention), the app's process from a PRIOR run of this same script can
# survive `adb install -r`, so MainApplication.onCreate()'s one-time
# "PAYMENT_PROVIDER=..." log (android/app/src/main/java/com/rithmo/
# MainApplication.kt) fires before this script's own logcat clear below,
# and a plain `am start` on an already-running process only resurfaces
# the existing Activity — onCreate() never re-fires, so the provider
# check below timed out seeing nothing, even though the log line was
# real and sitting in the buffer moments earlier. Forcing a stop here
# guarantees the next `am start` is always a genuine cold start.
$ADB_CMD -s "$DEVICE_SERIAL" shell am force-stop "$PACKAGE_NAME" 2>/dev/null
$ADB_CMD -s "$DEVICE_SERIAL" logcat -c 2>/dev/null

if ! $ADB_CMD -s "$DEVICE_SERIAL" shell am start -n "$PACKAGE_NAME/$MAIN_ACTIVITY" >/dev/null 2>&1; then
    RESULT_LAUNCH="FAIL"
    fail "adb shell am start -n $PACKAGE_NAME/$MAIN_ACTIVITY did not succeed."
    collect_diagnostics
    print_report
    exit 1
fi

echo -n "  Waiting for app readiness "
READY=false
for ((i = 0; i < READY_TIMEOUT_SECS; i++)); do
    if $ADB_CMD -s "$DEVICE_SERIAL" shell dumpsys activity activities 2>/dev/null | grep -qE "[Rr]esumedActivity.*$PACKAGE_NAME"; then
        READY=true
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

if [ "$READY" != true ]; then
    RESULT_LAUNCH="FAIL"
    fail "App did not become ready within ${READY_TIMEOUT_SECS}s (no resumed activity for $PACKAGE_NAME)."
    collect_diagnostics
    print_report
    exit 1
fi

RESULT_LAUNCH="PASS"
echo -e "  ${GREEN}${BOLD}✓ App ready.${NC}"

# ── Step 7: Verify the on-device payment provider ────────────────────────────
echo -e "\n${BLUE}[7/8] Verifying on-device payment provider...${NC}"
# A bounded poll, not a single logcat snapshot: the readiness check above
# (dumpsys activity activities showing a resumed activity) can report
# ready slightly before MainApplication.onCreate()'s Log.i has actually
# been written and delivered through logcat's own buffering — a real,
# observed race (the log line was confirmed present moments later in a
# FAIL run's own diagnostics dump, meaning the provider check itself, not
# the app, was too eager). Polling up to 5s closes that gap without
# risking a false PASS: a wrong flavor still fails the equality check
# below, and a genuinely silent app still exhausts the timeout.
REPORTED_PROVIDER=""
for ((i = 0; i < 5; i++)); do
    PROVIDER_LOG="$($ADB_CMD -s "$DEVICE_SERIAL" logcat -d -s "$LOG_TAG:I" 2>/dev/null | grep -o "PAYMENT_PROVIDER=[a-z_]*" | tail -n1)"
    REPORTED_PROVIDER="${PROVIDER_LOG#PAYMENT_PROVIDER=}"
    [ -n "$REPORTED_PROVIDER" ] && break
    sleep 1
done

if [ -z "$REPORTED_PROVIDER" ]; then
    RESULT_PROVIDER="FAIL"
    fail "Installed app did not report a PAYMENT_PROVIDER value at all (expected PAYMENT_PROVIDER=$EXPECTED_PROVIDER)."
    collect_diagnostics
elif [ "$REPORTED_PROVIDER" != "$EXPECTED_PROVIDER" ]; then
    RESULT_PROVIDER="FAIL"
    fail "Installed app does not report PAYMENT_PROVIDER=$EXPECTED_PROVIDER (reported: '$REPORTED_PROVIDER')."
    collect_diagnostics
else
    RESULT_PROVIDER="PASS"
    echo -e "  ${GREEN}${BOLD}✓ Payment provider: $REPORTED_PROVIDER${NC}"
fi

if [ "$PAYMENT_TEST" != true ]; then
    print_report
    if [ "$RESULT_PROVIDER" = "FAIL" ] || [ "$RESULT_INSTALL" = "FAIL" ] || [ "$RESULT_LAUNCH" = "FAIL" ]; then
        exit 1
    fi
    exit 0
fi

if [ "$FLAVOR" != "bazaar" ]; then
    note "Payment-test harness requested on the '$FLAVOR' flavor — nothing further to verify (Bazaar purchase flow only applies to the bazaar flavor)."
    print_report
    exit 0
fi

# ── Step 8: Payment-test harness (bazaar flavor only) ────────────────────────
echo -e "\n${BLUE}[8/8] Bazaar payment test — backend & purchase state...${NC}"

AUTH_TOKEN="${RITHMO_TEST_AUTH_TOKEN:-}"
if [ -z "$AUTH_TOKEN" ] && [ -n "${RITHMO_TEST_USERNAME:-}" ] && [ -n "${RITHMO_TEST_PASSWORD:-}" ]; then
    echo -e "  Logging in as ${CYAN}$RITHMO_TEST_USERNAME${NC} to check subscription status..."
    LOGIN_RESPONSE="$(curl -s -w '\n%{http_code}' -X POST "$API_BASE_URL$LOGIN_ENDPOINT" \
        -H 'Content-Type: application/json' \
        -d "{\"username\":\"$RITHMO_TEST_USERNAME\",\"password\":\"$RITHMO_TEST_PASSWORD\"}")"
    LOGIN_CODE="$(tail -n1 <<< "$LOGIN_RESPONSE")"
    LOGIN_BODY="$(sed '$d' <<< "$LOGIN_RESPONSE")"
    if [ "$LOGIN_CODE" = "200" ]; then
        AUTH_TOKEN="$(jq -r '.access // empty' <<< "$LOGIN_BODY" 2>/dev/null)"
    else
        note "Backend login for $RITHMO_TEST_USERNAME failed (HTTP $LOGIN_CODE)."
    fi
fi

check_subscription_status() {
    if [ -z "$AUTH_TOKEN" ]; then
        return 1
    fi
    STATUS_RESPONSE="$(curl -s -w '\n%{http_code}' "$API_BASE_URL$STATUS_ENDPOINT" \
        -H "Authorization: Bearer $AUTH_TOKEN")"
    STATUS_CODE="$(tail -n1 <<< "$STATUS_RESPONSE")"
    STATUS_BODY="$(sed '$d' <<< "$STATUS_RESPONSE")"
    [ "$STATUS_CODE" = "200" ]
}

if [ -z "$AUTH_TOKEN" ]; then
    RESULT_BACKEND="NOT_RUN"
    RESULT_ENTITLEMENT="NOT_RUN"
    note "Backend verification skipped — set RITHMO_TEST_AUTH_TOKEN (or RITHMO_TEST_USERNAME + RITHMO_TEST_PASSWORD) to enable it."
    echo -e "  ${YELLOW}ℹ No backend credentials provided — skipping automated backend/entitlement verification.${NC}"
    ALREADY_ACTIVE=false
else
    if check_subscription_status; then
        BEFORE_ACTIVE="$(jq -r '.is_active' <<< "$STATUS_BODY" 2>/dev/null)"
        BEFORE_PROVIDER="$(jq -r '.provider // "null"' <<< "$STATUS_BODY" 2>/dev/null)"
        echo -e "  Subscription before test: is_active=${BOLD}$BEFORE_ACTIVE${NC} provider=${BOLD}$BEFORE_PROVIDER${NC}"
        ALREADY_ACTIVE=false
        [ "$BEFORE_ACTIVE" = "true" ] && ALREADY_ACTIVE=true
    else
        RESULT_BACKEND="FAIL"
        fail "Backend GET $STATUS_ENDPOINT returned HTTP $STATUS_CODE."
        ALREADY_ACTIVE=false
    fi
fi

if [ "$ALREADY_ACTIVE" = true ]; then
    echo -e "  ${GREEN}Subscription already active — purchase step skipped.${NC}"
    RESULT_PURCHASE="PASS (already active — not re-purchased)"
    RESULT_BACKEND="PASS"
    RESULT_ENTITLEMENT="PASS"
    RESULT_PAYMENT_SCREEN="NOT_RUN"
else
    echo -e "  ${CYAN}${BOLD}Open Rithmo → Premium → Purchase${NC} on the device now."
    echo -e "  This script will never tap the purchase button for you — Cafe Bazaar's own"
    echo -e "  purchase UI, Poolakey, and the real backend verification must all run for real."
    RESULT_PAYMENT_SCREEN="MANUAL"

    if [ -n "$AUTH_TOKEN" ]; then
        echo -n "  Waiting up to ${PURCHASE_WAIT_SECS}s for the purchase to complete "
        PURCHASE_CONFIRMED=false
        ELAPSED=0
        while [ "$ELAPSED" -lt "$PURCHASE_WAIT_SECS" ]; do
            if check_subscription_status; then
                AFTER_ACTIVE="$(jq -r '.is_active' <<< "$STATUS_BODY" 2>/dev/null)"
                AFTER_PROVIDER="$(jq -r '.provider // "null"' <<< "$STATUS_BODY" 2>/dev/null)"
                if [ "$AFTER_ACTIVE" = "true" ] && [ "$AFTER_PROVIDER" = "bazaar" ]; then
                    PURCHASE_CONFIRMED=true
                    break
                fi
            fi
            echo -n "."
            sleep 5
            ELAPSED=$((ELAPSED + 5))
        done
        echo ""
        if [ "$PURCHASE_CONFIRMED" = true ]; then
            RESULT_PURCHASE="PASS"
            RESULT_BACKEND="PASS"
            RESULT_ENTITLEMENT="PASS"
            echo -e "  ${GREEN}${BOLD}✓ Bazaar purchase detected, backend verified, entitlement active.${NC}"
        else
            RESULT_PURCHASE="MANUAL"
            RESULT_BACKEND="NOT_RUN"
            RESULT_ENTITLEMENT="NOT_RUN"
            note "Purchase was not detected within ${PURCHASE_WAIT_SECS}s. If you completed it after this timeout, re-run with RITHMO_TEST_AUTH_TOKEN set to just re-check backend state."
        fi
    else
        RESULT_PURCHASE="MANUAL"
    fi
fi

print_report
if [ "$RESULT_PURCHASE" = "FAIL" ] || [ "$RESULT_BACKEND" = "FAIL" ] || [ "$RESULT_ENTITLEMENT" = "FAIL" ]; then
    exit 1
fi
exit 0
