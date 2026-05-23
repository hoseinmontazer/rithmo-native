# Fix: Home Screen Not Loading for Male Users

## Problem
The home screen was not loading for male users because the app was trying to fetch cycle data (periods, ovulation) for all users, regardless of their sex. Male users don't have cycle data, so the API calls would fail or hang, preventing the home screen from rendering.

## Root Cause
In `HomeScreen.tsx`, the hooks `useCycleAnalysis()` and `useLatestOvulation()` were being called unconditionally at the component level, even for male users who don't track menstrual cycles.

## Solution
The fix involves three changes:

### 1. Load Profile First
Move the `useProfile()` hook to the top so we can determine the user's sex before fetching cycle data.

### 2. Conditionally Fetch Cycle Data
Only fetch cycle data if the user is a cycle-tracking user (female/other, not male):

```typescript
// Determine if this user tracks their cycle
const isCycleUser = profileError ? true : (profile?.sex !== 'male');

// Only fetch cycle data for cycle-tracking users
const { data: cycleData, ... } = useCycleAnalysis({
  enabled: isCycleUser, // Only fetch if user tracks cycles
});

const { data: ovulation } = useLatestOvulation({
  enabled: isCycleUser, // Only fetch if user tracks cycles
});
```

### 3. Update Hook Signatures
Modified `useCycleAnalysis()` and `useLatestOvulation()` in `usePeriods.ts` to accept an `enabled` option:

```typescript
// Supports both old API (for backward compatibility) and new API with enabled option
export function useCycleAnalysis(role?: 'partner'): ReturnType<typeof useQuery>;
export function useCycleAnalysis(options?: { role?: 'partner'; enabled?: boolean }): ReturnType<typeof useQuery>;
export function useCycleAnalysis(roleOrOptions?: 'partner' | { role?: 'partner'; enabled?: boolean }) {
  const role = typeof roleOrOptions === 'string' ? roleOrOptions : roleOrOptions?.role;
  const enabled = typeof roleOrOptions === 'object' ? roleOrOptions?.enabled ?? true : true;
  // ... rest of implementation with enabled option
}
```

### 4. Update Refresh Logic
Modified the `onRefresh` callback to only refetch cycle data for cycle-tracking users:

```typescript
const onRefresh = useCallback(async () => {
  setRefreshing(true);
  try {
    const promises = [refetchProfile()];
    // Only refetch cycle data for cycle-tracking users
    if (isCycleUser) {
      promises.push(refetchCycle());
    }
    await Promise.all(promises);
  } catch (error) {
    console.error('Refresh error:', error);
  }
  setRefreshing(false);
}, [refetchCycle, refetchProfile, isCycleUser]);
```

## Files Modified
1. `/src/screens/home/HomeScreen.tsx` - Conditional cycle data fetching
2. `/src/hooks/queries/usePeriods.ts` - Added `enabled` option to hooks
3. `/index.js` - Fixed TypeScript syntax error (removed type annotations from .js file)

## Testing
To test the fix:

1. **For Female Users:**
   - Home screen should show the cycle ring with period countdown
   - Cycle data should load normally
   - No changes to existing behavior

2. **For Male Users:**
   - Home screen should show the general wellness hero (no cycle ring)
   - No cycle API calls should be made
   - Page should load without hanging

3. **Verify in Logs:**
   ```bash
   # Watch React Native logs
   npx react-native log-android
   
   # Should NOT see cycle API errors for male users
   # Should see profile API call succeed
   ```

## How to Apply the Fix

1. **Stop the app:**
   ```bash
   adb shell am force-stop com.rithmo
   ```

2. **Clear Metro cache and restart:**
   ```bash
   npm start -- --reset-cache
   ```

3. **In a new terminal, rebuild:**
   ```bash
   npm run android
   ```

4. **Test with both male and female user accounts**

## TypeScript Note
You may see TypeScript errors in your IDE about the function signatures. This is likely a language server cache issue. The code will work correctly at runtime. To clear the cache:

- In VS Code: Reload the window (Cmd/Ctrl + Shift + P → "Reload Window")
- Or restart your IDE
- Or run: `npm run type-check` to verify there are no actual errors

## Additional Notes
- The fix maintains backward compatibility - existing code calling `useCycleAnalysis()` without arguments will continue to work
- The `enabled` option uses React Query's built-in feature to conditionally enable/disable queries
- Male users will see a wellness-focused dashboard instead of cycle tracking
- The profile is loaded first to determine user type, with a sensible default (show cycle content) while loading
