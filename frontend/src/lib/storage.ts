import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { User } from '../types';

const SESSION_KEY = 'miniledger.session.v1';

export interface StoredSession {
  token: string;
  user: User;
}

const isWeb = Platform.OS === 'web';

const readRaw = async (): Promise<string | null> => {
  if (isWeb) {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(SESSION_KEY);
  }
  return SecureStore.getItemAsync(SESSION_KEY);
};

export const sessionStorage = {
  async read(): Promise<StoredSession | null> {
    try {
      const raw = await readRaw();
      if (!raw) return null;

      const parsed = JSON.parse(raw) as Partial<StoredSession>;
      if (!parsed.token || !parsed.user?.phone) return null;

      return { token: parsed.token, user: parsed.user as User };
    } catch {
      // Corrupt payloads should never block the login screen.
      return null;
    }
  },

  async write(session: StoredSession): Promise<void> {
    const raw = JSON.stringify(session);
    if (isWeb) {
      if (typeof localStorage !== 'undefined') localStorage.setItem(SESSION_KEY, raw);
      return;
    }
    await SecureStore.setItemAsync(SESSION_KEY, raw);
  },

  async clear(): Promise<void> {
    if (isWeb) {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(SESSION_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(SESSION_KEY);
  },
};
