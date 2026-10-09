/**
 * PartnerHome state model. A failed request must never be shown as
 * "not connected" (that message carries a connect CTA).
 */
import { resolvePartnerHomeState } from '../screens/home/partnerHomeState';

const ok = { status: 'success' };
const notShared = { status: 'not_shared' };
const none = { status: 'no_partner' };

declare const __dirname: string;

describe('resolvePartnerHomeState', () => {
  it('loading: first load with nothing cached', () => {
    expect(resolvePartnerHomeState({ data: undefined, isLoading: true, isError: false })).toBe('loading');
  });

  it('loading: no data, no error, not loading (disabled/pending query) is not "not connected"', () => {
    expect(resolvePartnerHomeState({ data: undefined, isLoading: false, isError: false })).toBe('loading');
  });

  it('connected: success and not_shared payloads', () => {
    expect(resolvePartnerHomeState({ data: ok, isLoading: false, isError: false })).toBe('connected');
    expect(resolvePartnerHomeState({ data: notShared, isLoading: false, isError: false })).toBe('connected');
  });

  it('no_partner: only a successful response with status no_partner', () => {
    expect(resolvePartnerHomeState({ data: none, isLoading: false, isError: false })).toBe('no_partner');
  });

  it('error: request failed with nothing cached - never no_partner', () => {
    expect(resolvePartnerHomeState({ data: undefined, isLoading: false, isError: true })).toBe('error');
    expect(resolvePartnerHomeState({ data: null, isLoading: false, isError: true })).toBe('error');
  });

  it('stale: cached data present but the refetch failed', () => {
    expect(resolvePartnerHomeState({ data: ok, isLoading: false, isError: true })).toBe('stale');
    expect(resolvePartnerHomeState({ data: none, isLoading: false, isError: true })).toBe('stale');
  });
});

describe('PartnerHomeScreen wiring (source contract)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path');
  const src: string = fs.readFileSync(path.join(__dirname, '..', 'screens', 'home', 'PartnerHomeScreen.tsx'), 'utf8');

  it('reads isError and uses the resolver and ErrorState', () => {
    expect(src).toMatch(/isError/);
    expect(src).toMatch(/resolvePartnerHomeState\(/);
    expect(src).toMatch(/<ErrorState/);
  });

  it('no longer treats a missing payload as not-connected', () => {
    expect(src).not.toMatch(/!data \|\| data\.status === 'no_partner'/);
  });
});
