/**
 * Installation-source → payment-provider mapping.
 *
 * Scope is deliberately the pure logic layer only — normalizeInstallationSource
 * and mapInstallationSourceToPaymentProvider never touch NativeModules, so
 * they're exercised directly here. getInstallationSource()/getPaymentProvider()
 * (the async functions that actually call into RithmoInstallSource) are NOT
 * tested here: that would mean faking PackageManager behavior inside a Jest
 * mock and asserting against the fake rather than against real Android
 * behavior, which proves nothing about the native module itself. That side is
 * verified on a real device instead (see the Phase 2 report).
 */
import {
  normalizeInstallationSource,
  mapInstallationSourceToPaymentProvider,
  type InstallationSource,
} from '@services/installationSource';

describe('mapInstallationSourceToPaymentProvider', () => {
  it('routes a Bazaar install to Bazaar billing', () => {
    expect(mapInstallationSourceToPaymentProvider('bazaar')).toBe('bazaar');
  });

  it('routes a sideloaded install to Zibal', () => {
    expect(mapInstallationSourceToPaymentProvider('sideload')).toBe('zibal');
  });

  it('never silently chooses Bazaar when the source is unknown', () => {
    expect(mapInstallationSourceToPaymentProvider('unknown')).toBe('unknown');
  });
});

describe('normalizeInstallationSource', () => {
  it.each<InstallationSource>(['bazaar', 'sideload', 'unknown'])(
    'passes a known value (%s) through unchanged',
    (value) => {
      expect(normalizeInstallationSource(value)).toBe(value);
    },
  );

  it('falls back to unknown for null', () => {
    expect(normalizeInstallationSource(null)).toBe('unknown');
  });

  it('falls back to unknown for undefined', () => {
    expect(normalizeInstallationSource(undefined)).toBe('unknown');
  });

  it('falls back to unknown for an empty string', () => {
    expect(normalizeInstallationSource('')).toBe('unknown');
  });

  it('falls back to unknown for a wrong-case value (case-sensitive match only)', () => {
    expect(normalizeInstallationSource('Bazaar')).toBe('unknown');
    expect(normalizeInstallationSource('BAZAAR')).toBe('unknown');
  });

  it('falls back to unknown for an arbitrary/unexpected string', () => {
    expect(normalizeInstallationSource('com.farsitel.bazaar')).toBe('unknown');
    expect(normalizeInstallationSource('google_play')).toBe('unknown');
  });

  it('falls back to unknown for non-string types', () => {
    expect(normalizeInstallationSource(0)).toBe('unknown');
    expect(normalizeInstallationSource(1)).toBe('unknown');
    expect(normalizeInstallationSource(true)).toBe('unknown');
    expect(normalizeInstallationSource({})).toBe('unknown');
    expect(normalizeInstallationSource(['bazaar'])).toBe('unknown');
  });
});

describe('installation source → payment provider, end to end mapping', () => {
  it('bazaar → bazaar', () => {
    expect(mapInstallationSourceToPaymentProvider(normalizeInstallationSource('bazaar'))).toBe('bazaar');
  });

  it('sideload → zibal', () => {
    expect(mapInstallationSourceToPaymentProvider(normalizeInstallationSource('sideload'))).toBe('zibal');
  });

  it('unknown → unknown', () => {
    expect(mapInstallationSourceToPaymentProvider(normalizeInstallationSource('unknown'))).toBe('unknown');
  });

  it('a malformed native value never resolves to a payment provider other than unknown', () => {
    expect(mapInstallationSourceToPaymentProvider(normalizeInstallationSource('garbage'))).toBe('unknown');
    expect(mapInstallationSourceToPaymentProvider(normalizeInstallationSource(undefined))).toBe('unknown');
  });
});
