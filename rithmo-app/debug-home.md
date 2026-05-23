# Debugging Home Screen Not Loading

## Issue
The React Native app launches but the home screen doesn't load. The logs show the app is running but no content is displayed.

## Possible Causes

### 1. Metro Bundler Not Running
The Metro bundler needs to be running to serve the JavaScript bundle to the app.

**Solution:**
```bash
# In a separate terminal, start the Metro bundler
npm start
# or
npx react-native start

# Then rebuild and run the app
npm run android
```

### 2. JavaScript Bundle Not Loading
The app might not be able to connect to the Metro bundler.

**Solution:**
```bash
# Check if Metro is accessible from the device/emulator
adb reverse tcp:8081 tcp:8081

# Then reload the app
adb shell input keyevent 82  # Opens dev menu
# Then select "Reload"
```

### 3. Runtime JavaScript Error
There might be a JavaScript error preventing the home screen from rendering.

**Solution:**
```bash
# View React Native logs
npx react-native log-android

# Or use adb logcat with React Native filter
adb logcat | grep -i "ReactNativeJS"
```

### 4. Cache Issues
Old cached data might be causing issues.

**Solution:**
```bash
# Clear Metro bundler cache
npm start -- --reset-cache

# Clear Android build cache
cd android && ./gradlew clean && cd ..

# Rebuild
npm run android
```

### 5. Network/API Issues
The app might be failing to load data from the API, causing the screen to hang.

**Check:**
- Look at the HomeScreen component - it has loading states for profile and cycle data
- The app might be stuck in a loading state if the API is unreachable
- Check if the API base URL is configured correctly

## Quick Fix Steps

1. **Stop the app completely**
   ```bash
   adb shell am force-stop com.rithmo
   ```

2. **Start Metro bundler with cache reset**
   ```bash
   npm start -- --reset-cache
   ```

3. **In a new terminal, rebuild and run**
   ```bash
   npm run android
   ```

4. **Watch the logs**
   ```bash
   npx react-native log-android
   ```

## Code Issues Found

### Fixed: index.js TypeScript Syntax
The `index.js` file had TypeScript type annotations which could cause issues. This has been fixed.

## Next Steps

1. Check if Metro bundler is running
2. Check React Native JavaScript logs for errors
3. Verify API connectivity
4. Check if the app is stuck in a loading state

## Useful Commands

```bash
# View all logs
adb logcat

# View React Native logs only
npx react-native log-android

# Reload the app
adb shell input text "RR"  # Double R to reload

# Open dev menu
adb shell input keyevent 82

# Clear app data
adb shell pm clear com.rithmo
```
