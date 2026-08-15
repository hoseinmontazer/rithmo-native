/**
 * Secure token storage using react-native-keychain.
 * Tokens are NEVER stored in AsyncStorage.
 */
import * as Keychain from 'react-native-keychain';
import { KEYCHAIN_SERVICE } from '@constants/config';
import type { StoredTokens } from '@types/auth.types';

const TOKEN_USERNAME = 'rithmo_tokens';

export const secureStorage = {
  async saveTokens(tokens: StoredTokens): Promise<void> {
    await Keychain.setGenericPassword(
      TOKEN_USERNAME,
      JSON.stringify(tokens),
      { service: KEYCHAIN_SERVICE, accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
    );
  },

  async getTokens(): Promise<StoredTokens | null> {
    const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
    if (!credentials) {return null;}
    try {
      return JSON.parse(credentials.password) as StoredTokens;
    } catch {
      return null;
    }
  },

  async clearTokens(): Promise<void> {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
  },
};
