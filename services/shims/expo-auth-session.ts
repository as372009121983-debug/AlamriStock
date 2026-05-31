// Powered by OnSpace.AI
// Shim for expo-auth-session to satisfy the template's imports.
// We use expo-web-browser directly in AuthContext for OAuth flows.

import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

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

export const CodeChallengeMethod = {
  S256: 'S256',
  Plain: 'plain',
} as const;

export function maybeCompleteAuthSession(_options?: any): { type: 'success' | 'failed' | 'dismiss' } {
  // No-op: web-only API; we handle OAuth via expo-web-browser directly.
  return { type: 'dismiss' };
}

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

export function loadAsync(_config?: any): Promise<AuthRequest> {
  return Promise.resolve(new AuthRequest());
}

export function fetchDiscoveryAsync(_url: string): Promise<DiscoveryDocument> {
  return Promise.resolve({});
}

export function getCurrentTimeInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function generateHexStringAsync(_length: number): Promise<string> {
  return Promise.resolve('');
}

export const TokenType = {
  Bearer: 'Bearer',
  MAC: 'MAC',
} as const;

export class TokenResponse {
  accessToken: string = '';
  refreshToken?: string;
  idToken?: string;
  tokenType: string = 'Bearer';
  expiresIn?: number;
  scope?: string;
  state?: string;
  issuedAt: number = getCurrentTimeInSeconds();
  shouldRefresh(): boolean {
    return false;
  }
  static fromQueryParams(_params: any): TokenResponse {
    return new TokenResponse();
  }
}

export default {
  makeRedirectUri,
  maybeCompleteAuthSession,
  useAuthRequest,
  useAutoDiscovery,
  exchangeCodeAsync,
  refreshAsync,
  revokeAsync,
  startAsync,
  dismiss,
  loadAsync,
  fetchDiscoveryAsync,
  getCurrentTimeInSeconds,
  generateHexStringAsync,
  AuthRequest,
  AuthSession,
  TokenResponse,
  ResponseType,
  Prompt,
  CodeChallengeMethod,
  TokenType,
};
