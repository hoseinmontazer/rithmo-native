/**
 * Jest — logic-level regression tests for the F-01 repairs.
 *
 * Scope is deliberately the pure domain layer: Jalali conversion, the
 * API→Persian mapping boundary, and the analytics contract. These are the
 * pieces whose correctness cannot be seen by looking at a screen (a wrong
 * Jalali date still *looks* like a date) and where a silent regression
 * would reintroduce a shipped defect.
 *
 * Component rendering is intentionally not covered here — the gate verifies
 * rendering on a physical device, which is the stronger check for this
 * phase and does not require a renderer setup that would need maintaining.
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: { '^.+\\.[jt]sx?$': ['babel-jest', { configFile: './babel.config.test.js' }] },
  // React Native injects __DEV__ at runtime; Jest does not.
  globals: { __DEV__: true },
  moduleNameMapper: {
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@i18n$': '<rootDir>/src/i18n',
    '^@i18n/(.*)$': '<rootDir>/src/i18n/$1',
    '^@analytics$': '<rootDir>/src/analytics',
    '^@analytics/(.*)$': '<rootDir>/src/analytics/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^@design-system$': '<rootDir>/src/design-system/iconography',
    '^@design-system/(.*)$': '<rootDir>/src/design-system/$1',
    '^@theme/(.*)$': '<rootDir>/src/theme/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^react-native$': '<rootDir>/src/__tests__/mocks/reactNative.js',
  },
};
