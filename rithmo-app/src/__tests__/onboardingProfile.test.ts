/**
 * Onboarding role persistence regressions.
 *
 * Old behaviour: finish() PATCHed user_role through profileService directly
 * (bypassing the React Query cache that RootNavigator had already filled with
 * the default owner profile) and swallowed any failure, so a partner got the
 * owner app via useRole()'s server-role-wins rule.
 */
import {
  buildOnboardingProfileUpdate,
  persistOnboardingProfile,
} from '../screens/onboarding/onboardingProfile';

const answers = { intent: 'curiosity', regularity: 'irregular', hasSymptoms: 'no' };
const none = { intent: null, regularity: null, hasSymptoms: null };

declare const __dirname: string;

describe('buildOnboardingProfileUpdate', () => {
  it('partner: role + completed flag only, no owner questionnaire', () => {
    expect(buildOnboardingProfileUpdate('partner', answers)).toEqual({
      user_role: 'partner',
      onboarding_completed: true,
    });
  });

  it('owner: includes answered questions only', () => {
    expect(buildOnboardingProfileUpdate('owner', answers)).toEqual({
      user_role: 'owner',
      onboarding_completed: true,
      onboarding_intent: 'curiosity',
      onboarding_regularity: 'irregular',
      onboarding_symptoms: 'no',
    });
    expect(buildOnboardingProfileUpdate('owner', none)).toEqual({
      user_role: 'owner',
      onboarding_completed: true,
    });
  });
});

describe('persistOnboardingProfile', () => {
  it('partner: PATCH success lets onboarding complete', async () => {
    const patch = jest.fn().mockResolvedValue({});
    await expect(persistOnboardingProfile('partner', none, patch)).resolves.toEqual({ canComplete: true });
    expect(patch).toHaveBeenCalledWith({ user_role: 'partner', onboarding_completed: true });
  });

  it('partner: PATCH failure blocks completion (was swallowed before)', async () => {
    const patch = jest.fn().mockRejectedValue(new Error('network'));
    await expect(persistOnboardingProfile('partner', none, patch)).resolves.toEqual({ canComplete: false });
  });

  it('owner: PATCH failure stays non-blocking', async () => {
    const patch = jest.fn().mockRejectedValue(new Error('network'));
    await expect(persistOnboardingProfile('owner', answers, patch)).resolves.toEqual({ canComplete: true });
  });
});

describe('OnboardingScreen source contract', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path');
  const src: string = fs.readFileSync(path.join(__dirname, '..', 'screens', 'onboarding', 'OnboardingScreen.tsx'), 'utf8');

  it('does not bypass the profile cache with profileService.patchProfile', () => {
    expect(src).not.toMatch(/profileService\.patchProfile/);
    expect(src).toMatch(/usePatchProfile\(/);
  });

  it('does not swallow the PATCH failure for partner (gates on canComplete)', () => {
    expect(src).toMatch(/persistOnboardingProfile\(/);
    expect(src).toMatch(/if \(!canComplete\)/);
    expect(src).not.toMatch(/Non-blocking: ensure onboarding completes even if the patch fails/);
  });

  it('skip honours a role already chosen', () => {
    const skip = src.slice(src.indexOf('const handleSkip'), src.indexOf('const accent'));
    expect(skip).toMatch(/role === 'partner'/);
    expect(skip).toMatch(/finish\('partner'/);
  });

  it('never infers role from sex', () => {
    expect(src).not.toMatch(/\bsex\b/);
  });
});
