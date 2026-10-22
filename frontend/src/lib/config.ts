import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * This is an assignment-friendly API locator:
 *
 * 1. EXPO_PUBLIC_API_URL always wins (use it for a deployed backend).
 * 2. In Expo Go / dev builds we reuse the Metro host, so a physical phone on
 *    the same Wi-Fi automatically talks to the laptop running the API.
 * 3. Emulators fall back to their host loopback aliases.
 */
const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

const metroHost =
  Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;

const lanHost = metroHost?.split(':')[0];

const fallbackOrigin = Platform.select({
  android: 'http://10.0.2.2:4000',
  ios: 'http://localhost:4000',
  default: 'http://localhost:4000',
});

export const API_ORIGIN = (envUrl || (lanHost ? `http://${lanHost}:4000` : fallbackOrigin))
  .replace(/\/+$/, '');

export const API_BASE_URL = `${API_ORIGIN}/api`;

/** Turn a relative /uploads/... path into a URL <Image> can load. */
export const resolveImageUrl = (value: string | null | undefined): string | null => {
  if (!value) return null;
  if (/^https?:\/\//.test(value)) return value;
  return `${API_ORIGIN}${value.startsWith('/') ? value : `/${value}`}`;
};
