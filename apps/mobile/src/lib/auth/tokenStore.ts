// Where the mobile app keeps its refresh token.
// - iOS/Android: the OS keychain/keystore via expo-secure-store.
// - Web (Expo web preview): memory only. Never localStorage, where any script could read it,
//   so a web preview session ends when the tab reloads.
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const memory = new Map<string, string>();
const isWeb = Platform.OS === 'web';

export const tokenStore = {
  get: (key: string): Promise<string | null> =>
    isWeb ? Promise.resolve(memory.get(key) ?? null) : SecureStore.getItemAsync(key),
  set: async (key: string, value: string) => {
    if (isWeb) memory.set(key, value);
    else await SecureStore.setItemAsync(key, value);
  },
  remove: async (key: string) => {
    if (isWeb) memory.delete(key);
    else await SecureStore.deleteItemAsync(key);
  },
};
