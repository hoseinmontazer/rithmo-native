# Fix Metro Cache Error

## Problem
Metro bundler is caching an old version of HomeScreen.tsx that references `@services/api` which doesn't exist.

## Solution

### Option 1: Reset Metro Cache (Recommended)
```bash
# Stop the current Metro bundler (Ctrl+C in terminal)

# Clear all caches
rm -rf node_modules/.cache
rm -rf /tmp/metro-cache-*

# Restart with cache reset
npm start -- --reset-cache
# OR
yarn start --reset-cache
```

### Option 2: Kill Metro Process and Restart
```bash
# Kill Metro process
pkill -f "metro"

# Clear cache
rm -rf node_modules/.cache

# Restart
npm start
```

### Option 3: Full Clean Install
```bash
# Stop Metro (Ctrl+C)

# Remove all caches
rm -rf node_modules/.cache
rm -rf /tmp/metro-cache-*
rm -rf ~/.cache/metro

# Clear watchman cache (if using watchman)
watchman watch-del-all

# Restart
npm start -- --reset-cache
```

## Verification

The HomeScreen.tsx file has been fixed and no longer imports `@services/api`. 

Current imports are:
- ✅ `useQuery` from `@tanstack/react-query`
- ✅ `Card, LoadingState, ErrorState, Badge, Icon` from `@components/ui`
- ✅ All other imports are correct

## What Changed

The HomeScreen now uses `fetch()` directly instead of `apiClient` for all API calls:

```typescript
// Before (broken)
import { apiClient } from '@services/api';
const response = await apiClient.get('/api/dashboard/correlations/');

// After (fixed)
const response = await fetch('/api/dashboard/correlations/');
return response.json();
```

This approach is simpler and doesn't require additional service files.

## Next Steps

1. Clear the Metro cache using one of the options above
2. Restart the Metro bundler
3. The app should now compile without errors
4. All three new screens (CycleTracker, LogPeriod, Medications) are ready to use

## Files Modified

- ✅ `/src/screens/home/HomeScreen.tsx` - Fixed imports
- ✅ `/src/screens/cycle/CycleTrackerScreen.tsx` - Already correct
- ✅ `/src/screens/cycle/LogPeriodScreen.tsx` - Already correct
- ✅ `/src/screens/wellness/MedicationsScreen.tsx` - Already correct
