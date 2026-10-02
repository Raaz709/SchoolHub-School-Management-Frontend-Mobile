import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Key/value persistence for session tokens and the cached user.
 *
 * Native builds keep tokens in the OS keychain (`expo-secure-store`); the web
 * target and unsupported devices fall back to AsyncStorage/localStorage so
 * `expo start --web` still works for previewing.
 */

const useSecureStore = Platform.OS !== 'web';

async function secureStoreAvailable(): Promise<boolean> {
  if (!useSecureStore) return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function getItem(key: string): Promise<string | null> {
  try {
    if (await secureStoreAvailable()) {
      return await SecureStore.getItemAsync(key);
    }
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string | null): Promise<void> {
  try {
    if (await secureStoreAvailable()) {
      if (value === null) await SecureStore.deleteItemAsync(key);
      else await SecureStore.setItemAsync(key, value);
      return;
    }
    if (value === null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, value);
  } catch {
    /* storage is best-effort; the caller always clears local state */
  }
}
