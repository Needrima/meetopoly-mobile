import * as SecureStore from 'expo-secure-store';

export type SecureStoreKey = 'sessionToken' | 'signupToken' | 'signupEmail';

const KEY_PREFIX = 'meetopoly.';

function storageKey(key: SecureStoreKey): string {
  return `${KEY_PREFIX}${key}`;
}

export async function getSecureItem(key: SecureStoreKey): Promise<string | null> {
  return SecureStore.getItemAsync(storageKey(key));
}

export async function setSecureItem(key: SecureStoreKey, value: string): Promise<void> {
  await SecureStore.setItemAsync(storageKey(key), value);
}

export async function removeSecureItem(key: SecureStoreKey): Promise<void> {
  await SecureStore.deleteItemAsync(storageKey(key));
}

/** Clears in-progress signup fields (token + email draft). */
export async function clearSignupDraft(): Promise<void> {
  await Promise.all([removeSecureItem('signupToken'), removeSecureItem('signupEmail')]);
}
