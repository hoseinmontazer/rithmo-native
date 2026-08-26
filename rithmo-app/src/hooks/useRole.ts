/**
 * useRole — the app's single source of truth for the current user's
 * Rhythmo role (cycle owner vs partner).
 *
 * Resolution order:
 *   1. `sex === 'male'` — see below; this OVERRIDES everything under it
 *   2. UserProfile.user_role (server, set during onboarding / profile edit)
 *   3. AsyncStorage 'onboarding_role' (set on device during onboarding,
 *      before the profile round-trip settles)
 *   4. 'owner' (safe default: own-data experience)
 *
 * Partners are any gender; 'owner' means the cycle data belongs to the
 * user themselves. The role drives navigation (PartnerHome) and copy,
 * never data access — access control stays server-side.
 *
 * ── Why `sex === 'male'` forces the partner role ─────────────────────────────
 *
 * This must agree with the server, and the server's rule is broader than
 * `user_role`. `intelligence.views._require_owner` rejects a request when
 *
 *     profile.sex == "male" or profile.user_role == "partner"
 *
 * so a man is a partner to the API whatever his `user_role` says. `user_role`
 * defaults to 'owner', so a male account that never went through the partner
 * branch of onboarding used to resolve to 'owner' here, get routed to the
 * owner's HomeScreen, and have `/api/intelligence/today/` answer 403 — a home
 * screen that could only ever show an error, with no way out of it.
 *
 * Verified against the running API: a male profile with `user_role='owner'`
 * gets 403 from `/api/intelligence/today/` and 200 from
 * `/api/intelligence/partner/today/`. Routing must follow the endpoint that
 * actually answers, so the client mirrors the server's condition exactly.
 * If the server's rule changes, this has to change with it.
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
  // Mirrors `_require_owner` server-side: male profiles are partners
  // regardless of `user_role`. See the note at the top of this file.
  const forcedPartner = profile?.sex === 'male';
  const role: UserRole = forcedPartner ? 'partner' : (serverRole ?? localRole ?? 'owner');

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
