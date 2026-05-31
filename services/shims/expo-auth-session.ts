// Powered by OnSpace.AI
// Shim for expo-auth-session to satisfy the template's imports.
// We use expo-web-browser directly in AuthContext for OAuth flows.

import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export type ResponseType = string;
export type Prompt = string;

export const ResponseType = {
  Code: 'code',
  Token: 'token',
  IdToken: 'id_token',
  None: 'none',
} as const;

export const Prompt = {
  None: 'none',
  Login: 'login',
  Consent: 'consent',
  SelectAccount: 'select_account',
} as const;

export type AuthRequestPromptOptions = {
  url?: string;
  showInRecents?: boolean;
};

export type DiscoveryDocument = {
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  revocationEndpoint?: string;
};

export type MakeRedirectUriOptions = {
  scheme?: string;
  path?: string;
  preferLocalhost?: boolean;
  isTripleSlashed?: boolean;
  native?: string;
  queryParams?: Record<string, string | undefined>;
};

export function makeRedirectUri(options: MakeRedirectUriOptions = {}): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin + (options.path ? '/' + options.path.replace(/^\//, '') : '');
  }
  try {
    return Linking.createURL(options.path || '');
  } catch {
    return 'https://localhost/';
  }
}

export function useAuthRequest(): [null, null, () => Promise<{ type: 'cancel' }>] {
  return [null, null, async () => ({ type: 'cancel' })];
}

export function useAutoDiscovery(): null {
  return null;
}

export function exchangeCodeAsync(): Promise<any> {
  return Promise.resolve(null);
}

export function refreshAsync(): Promise<any> {
  return Promise.resolve(null);
}

export function revokeAsync(): Promise<boolean> {
  return Promise.resolve(false);
}

export function startAsync(): Promise<{ type: 'cancel' }> {
  return Promise.resolve({ type: 'cancel' });
}

export function dismiss(): void {}

export class AuthRequest {
  constructor(_config?: any) {}
  promptAsync(_discovery?: any, _options?: any): Promise<{ type: 'cancel' }> {
    return Promise.resolve({ type: 'cancel' });
  }
  makeAuthUrlAsync(): Promise<string> {
    return Promise.resolve('');
  }
}

export class AuthSession {
  static startAsync(): Promise<{ type: 'cancel' }> {
    return Promise.resolve({ type: 'cancel' });
  }
  static dismiss(): void {}
  static getRedirectUrl(): string {
    return makeRedirectUri();
  }
}

export const AuthSessionResult = {
  Cancel: 'cancel',
  Success: 'success',
  Error: 'error',
} as const;

export default {
  makeRedirectUri,
  useAuthRequest,
  useAutoDiscovery,
  exchangeCodeAsync,
  refreshAsync,
  revokeAsync,
  startAsync,
  dismiss,
  AuthRequest,
  AuthSession,
  ResponseType,
  Prompt,
};
