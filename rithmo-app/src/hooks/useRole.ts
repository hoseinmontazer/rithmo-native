/**
 * useRole — the app's single source of truth for the current user's
 * Rhythmo role (cycle owner vs partner).
 *
 * Resolution order:
 *   1. UserProfile.user_role (server, set during onboarding / profile edit)
 *   2. AsyncStorage 'onboarding_role' (set on device during onboarding,
 *      before the profile round-trip settles)
 *   3. 'owner' (safe default: own-data experience)
 *
 * Partners are any gender; 'owner' means the cycle data belongs to the
 * user themselves. The role drives navigation (PartnerHome) and copy,
 * never data access — access control stays server-side.
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfile } from '@hooks/queries/useProfile';

export const ONBOARDING_ROLE_KEY = 'onboarding_role';

export type UserRole = 'owner' | 'partner';

export interface UseRoleResult {
  role: UserRole;
  isPartner: boolean;
  /**
   * False until the role is known for certain.
   *
   * The app shell must not mount while this is false. Previously `role`
   * silently defaulted to 'owner' during profile load, so a partner got the
   * owner's Home for the first render — and React Navigation kept that
   * screen mounted afterwards, which is why a linked partner saw the owner
   * application permanently.
   */
  isResolved: boolean;
  setRole: (role: UserRole) => void;
}

function parseRole(value: string | null): UserRole | null {
  return value === 'owner' || value === 'partner' ? value : null;
}

export function useRole(): UseRoleResult {
  const { data: profile, isLoading: profileLoading, isError: profileError } = useProfile();
  const [localRole, setLocalRole] = useState<UserRole | null>(null);
  const [localHydrated, setLocalHydrated] = useState(false);

  // Hydrate the device-local role once (pre-profile fallback).
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(ONBOARDING_ROLE_KEY)
      .then((value) => {
        if (mounted) { setLocalRole(parseRole(value)); }
      })
      .catch(() => { /* storage unavailable — server value still works */ })
      .finally(() => {
        if (mounted) { setLocalHydrated(true); }
      });
    return () => { mounted = false; };
  }, []);

  const serverRole = parseRole(profile?.user_role ?? null);
  const role: UserRole = serverRole ?? localRole ?? 'owner';

  // Resolved once the device-local value has been read AND the server has
  // either answered or definitively failed. On failure we fall back to the
  // device-local role rather than blocking the app forever.
  const isResolved = localHydrated && (!profileLoading || profileError || serverRole !== null);

  const setRole = useCallback((next: UserRole) => {
    setLocalRole(next);
    AsyncStorage.setItem(ONBOARDING_ROLE_KEY, next).catch(() => { /* non-fatal */ });
  }, []);

  return { role, isPartner: role === 'partner', isResolved, setRole };
}
