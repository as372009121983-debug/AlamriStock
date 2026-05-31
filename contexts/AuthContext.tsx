// Powered by OnSpace.AI
import React, {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/template';
import { AppUser, getPermissions, Permission, UserRole } from '@/constants/types';
import {
  createAppUserRecord,
  deleteAppUserRecord,
  fetchAppUsersList,
  updateAppUserRecord,
} from '@/services/cloud';

WebBrowser.maybeCompleteAuthSession();

const supabase = getSupabaseClient();

export type PendingSignup = {
  email: string;
  name: string;
  password: string;
  sentAt: number;
};

export type AuthContextType = {
  ready: boolean;
  initializing: boolean;
  googleLoading: boolean;
  user: AppUser | null;
  session: Session | null;
  users: AppUser[];
  needsSetup: boolean;
  rememberMe: boolean;
  pendingSignup: PendingSignup | null;
  permissions: Permission;
  isOwner: boolean;
  canEdit: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  signIn: (
    email: string,
    password: string,
    remember?: boolean
  ) => Promise<{ ok: boolean; message?: string }>;
  // OTP-based signup flow
  sendSignUpOTP: (data: {
    name: string;
    email: string;
    password: string;
  }) => Promise<{ ok: boolean; message?: string }>;
  verifyEmailOTP: (
    otp: string
  ) => Promise<{ ok: boolean; message?: string }>;
  resendSignUpOTP: () => Promise<{ ok: boolean; message?: string }>;
  clearPendingSignup: () => void;
  // Legacy direct signup (kept for backward compat, calls OTP flow)
  signUp: (data: {
    name: string;
    email: string;
    password: string;
  }) => Promise<{ ok: boolean; message?: string; needsConfirmation?: boolean }>;
  signInWithGoogle: () => Promise<{ ok: boolean; message?: string }>;
  resetPassword: (email: string) => Promise<{ ok: boolean; message?: string }>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  login: (
    email: string,
    password: string,
    remember?: boolean
  ) => Promise<{ ok: boolean; message?: string }>;
  registerOwner: (data: {
    name: string;
    email: string;
    password: string;
  }) => Promise<{ ok: boolean; message?: string; needsConfirmation?: boolean }>;
  addUser: (data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    active: boolean;
  }) => Promise<{ ok: boolean; message?: string }>;
  updateUser: (
    id: string,
    data: Partial<AppUser>
  ) => Promise<{ ok: boolean; message?: string }>;
  deleteUser: (id: string) => Promise<{ ok: boolean; message?: string }>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

function buildUserFromSession(session: Session | null): AppUser | null {
  if (!session?.user) return null;
  const u = session.user;
  const meta = u.user_metadata || {};
  const email = (u.email || '').toLowerCase();
  return {
    id: u.id,
    email,
    username: email,
    password: '',
    name:
      meta.name ||
      meta.full_name ||
      meta.username ||
      (email ? email.split('@')[0] : 'مستخدم'),
    role: 'owner',
    active: true,
    createdAt: u.created_at ? new Date(u.created_at).getTime() : Date.now(),
  };
}

function translateError(message: string): string {
  const m = (message || '').toLowerCase();
  if (
    m.includes('invalid login') ||
    m.includes('invalid_grant') ||
    m.includes('invalid credentials')
  ) {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
  }
  if (
    m.includes('user already registered') ||
    m.includes('already registered') ||
    m.includes('already exists') ||
    (m.includes('duplicate') && m.includes('email'))
  ) {
    return 'هذا البريد مسجل بالفعل، يمكنك تسجيل الدخول';
  }
  if (m.includes('email not confirmed') || m.includes('not confirmed')) {
    return 'يرجى تأكيد بريدك الإلكتروني أولاً';
  }
  if (
    m.includes('weak password') ||
    m.includes('too short') ||
    m.includes('password should be')
  ) {
    return 'كلمة المرور ضعيفة، استخدم 6 أحرف على الأقل';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'محاولات كثيرة، يرجى الانتظار قليلاً ثم المحاولة';
  }
  if (m.includes('invalid email')) {
    return 'بريد إلكتروني غير صحيح';
  }
  if (m.includes('user not found') || m.includes('no user')) {
    return 'البريد الإلكتروني غير مسجل، يمكنك إنشاء حساب جديد';
  }
  if (
    m.includes('provider is not enabled') ||
    m.includes('provider not enabled') ||
    (m.includes('oauth') && m.includes('not')) ||
    m.includes('unsupported provider')
  ) {
    return 'تسجيل الدخول بـ Google غير مفعّل، فعّله من لوحة OnSpace Cloud (User → Auth Settings)';
  }
  if (m.includes('network') || m.includes('fetch') || m.includes('failed to fetch')) {
    return 'لا يوجد اتصال بالإنترنت، تحقق من الاتصال';
  }
  if (m.includes('signups not allowed') || m.includes('disabled')) {
    return 'التسجيل غير مفعّل حالياً';
  }
  if (m.includes('expired') || m.includes('token has expired')) {
    return 'انتهت صلاحية الرمز، اطلب رمزاً جديداً';
  }
  if (m.includes('invalid otp') || m.includes('invalid token') || m.includes('token mismatch')) {
    return 'رمز التحقق غير صحيح';
  }
  return message || 'حدث خطأ، حاول مرة أخرى';
}

function mapAppUserRow(row: any): AppUser {
  return {
    id: row.id,
    email: row.email || '',
    username: row.email || '',
    password: row.password || '',
    name: row.name || '',
    role: (row.role || 'sales') as UserRole,
    active: row.active !== false,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [pendingSignup, setPendingSignup] = useState<PendingSignup | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(buildUserFromSession(session));
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(buildUserFromSession(session));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setUsers([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const result = await fetchAppUsersList(user.id);
      if (cancelled) return;
      if (!result.error) {
        setUsers(result.data.map(mapAppUserRow));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setInitializing(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) {
          console.log('[SignIn Error]', error.message);
          return { ok: false, message: translateError(error.message) };
        }
        return { ok: true };
      } catch (e: any) {
        console.log('[SignIn Exception]', e);
        return { ok: false, message: translateError(e?.message || '') };
      } finally {
        setInitializing(false);
      }
    },
    []
  );

  const sendSignUpOTP = useCallback(
    async (data: { name: string; email: string; password: string }) => {
      const name = data.name.trim();
      if (!name) return { ok: false, message: 'الاسم الكامل مطلوب' };
      if (!data.email.trim()) {
        return { ok: false, message: 'البريد الإلكتروني مطلوب' };
      }
      if (!isValidEmail(data.email)) {
        return { ok: false, message: 'البريد الإلكتروني غير صحيح' };
      }
      if (data.password.length < 6) {
        return { ok: false, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
      }

      setInitializing(true);
      try {
        const lower = data.email.trim().toLowerCase();
        const { error } = await supabase.auth.signInWithOtp({
          email: lower,
          options: {
            shouldCreateUser: true,
            data: {
              name,
              full_name: name,
              username: name,
            },
          },
        });

        if (error) {
          console.log('[SendOTP Error]', error.message);
          return { ok: false, message: translateError(error.message) };
        }

        setPendingSignup({
          email: lower,
          name,
          password: data.password,
          sentAt: Date.now(),
        });

        return { ok: true };
      } catch (e: any) {
        console.log('[SendOTP Exception]', e);
        return { ok: false, message: translateError(e?.message || '') };
      } finally {
        setInitializing(false);
      }
    },
    []
  );

  const verifyEmailOTP = useCallback(
    async (otp: string) => {
      if (!pendingSignup) {
        return { ok: false, message: 'لا يوجد طلب تحقق نشط، أعد إنشاء الحساب' };
      }
      const code = otp.trim().replace(/\s+/g, '');
      if (code.length < 4) {
        return { ok: false, message: 'يرجى إدخال رمز التحقق بالكامل' };
      }

      setInitializing(true);
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: pendingSignup.email,
          token: code,
          type: 'email',
        });

        if (error) {
          console.log('[VerifyOTP Error]', error.message);
          return { ok: false, message: translateError(error.message) };
        }

        if (data.session && pendingSignup.password) {
          try {
            await supabase.auth.updateUser({
              password: pendingSignup.password,
            });
          } catch (e) {
            console.log('[UpdatePassword Failed]', e);
          }

          if (data.user) {
            try {
              await supabase.from('user_profiles').upsert({
                id: data.user.id,
                username: pendingSignup.name,
                email: pendingSignup.email,
              });
            } catch {}
          }
        }

        setPendingSignup(null);
        return { ok: true };
      } catch (e: any) {
        console.log('[VerifyOTP Exception]', e);
        return { ok: false, message: translateError(e?.message || '') };
      } finally {
        setInitializing(false);
      }
    },
    [pendingSignup]
  );

  const resendSignUpOTP = useCallback(async () => {
    if (!pendingSignup) {
      return { ok: false, message: 'لا يوجد طلب تحقق نشط' };
    }
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: pendingSignup.email,
        options: {
          shouldCreateUser: true,
          data: {
            name: pendingSignup.name,
            full_name: pendingSignup.name,
            username: pendingSignup.name,
          },
        },
      });

      if (error) {
        console.log('[ResendOTP Error]', error.message);
        return { ok: false, message: translateError(error.message) };
      }

      setPendingSignup({ ...pendingSignup, sentAt: Date.now() });
      return { ok: true };
    } catch (e: any) {
      console.log('[ResendOTP Exception]', e);
      return { ok: false, message: translateError(e?.message || '') };
    }
  }, [pendingSignup]);

  const clearPendingSignup = useCallback(() => {
    setPendingSignup(null);
  }, []);

  // Legacy alias - now triggers OTP flow
  const signUp = useCallback(
    async (data: { name: string; email: string; password: string }) => {
      const res = await sendSignUpOTP(data);
      return { ...res, needsConfirmation: true };
    },
    [sendSignUpOTP]
  );

  const signInWithGoogle = useCallback(async () => {
    if (googleLoading) {
      return { ok: false, message: 'جاري المعالجة، يرجى الانتظار...' };
    }
    setGoogleLoading(true);
    try {
      const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';
      const redirectTo = isWeb
        ? window.location.origin
        : Linking.createURL('/auth/callback');

      console.log('[Google] Starting OAuth flow, redirectTo:', redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: !isWeb,
        },
      });

      if (error) {
        console.log('[Google OAuth Error]', error.message);
        return { ok: false, message: translateError(error.message) };
      }

      if (isWeb) {
        return { ok: true };
      }

      if (!data?.url) {
        return { ok: false, message: 'تعذر بدء عملية تسجيل الدخول' };
      }

      console.log('[Google] Opening browser:', data.url);
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
        showInRecents: true,
      });

      console.log('[Google] Browser result:', result.type);

      if (result.type === 'success' && result.url) {
        const url = result.url;
        const hashIndex = url.indexOf('#');
        const queryIndex = url.indexOf('?');
        const fragment =
          hashIndex >= 0
            ? url.slice(hashIndex + 1)
            : queryIndex >= 0
            ? url.slice(queryIndex + 1)
            : '';
        const params = new URLSearchParams(fragment);

        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        const errCode = params.get('error') || params.get('error_code');
        const errDesc = params.get('error_description');

        if (errCode) {
          console.log('[Google] OAuth error:', errCode, errDesc);
          return {
            ok: false,
            message: errDesc ? translateError(errDesc) : translateError(errCode),
          };
        }

        if (access_token && refresh_token) {
          const { error: sessErr } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (sessErr) {
            return { ok: false, message: translateError(sessErr.message) };
          }
          return { ok: true };
        }

        return { ok: false, message: 'تعذر استكمال تسجيل الدخول' };
      }

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return { ok: false, message: 'تم إلغاء عملية تسجيل الدخول' };
      }

      return { ok: false, message: 'فشل تسجيل الدخول بـ Google' };
    } catch (e: any) {
      console.log('[Google Sign-in Exception]', e);
      return {
        ok: false,
        message: translateError(e?.message || 'فشل تسجيل الدخول'),
      };
    } finally {
      setGoogleLoading(false);
    }
  }, [googleLoading]);

  const resetPassword = useCallback(async (email: string) => {
    if (!email.trim()) return { ok: false, message: 'البريد الإلكتروني مطلوب' };
    try {
      const redirectTo =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? window.location.origin
          : Linking.createURL('/auth/recovery');
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo }
      );
      if (error) return { ok: false, message: translateError(error.message) };
      return { ok: true };
    } catch (e: any) {
      return { ok: false, message: translateError(e?.message || '') };
    }
  }, []);

  const signOut = useCallback(async () => {
    setPendingSignup(null);
    await supabase.auth.signOut();
  }, []);

  const addUser = useCallback(
    async (data: {
      name: string;
      email: string;
      password: string;
      role: UserRole;
      active: boolean;
    }) => {
      if (!user) return { ok: false, message: 'غير مسجل دخول' };
      if (!data.name.trim()) return { ok: false, message: 'الاسم مطلوب' };
      if (!data.email.trim()) return { ok: false, message: 'البريد الإلكتروني مطلوب' };
      if (!isValidEmail(data.email)) {
        return { ok: false, message: 'البريد الإلكتروني غير صحيح' };
      }
      if (!data.password.trim() || data.password.length < 4) {
        return { ok: false, message: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' };
      }
      const lower = data.email.trim().toLowerCase();
      if (users.some((u) => u.email.trim().toLowerCase() === lower)) {
        return { ok: false, message: 'هذا البريد مستخدم بالفعل' };
      }
      try {
        const { data: row, error } = await createAppUserRecord({
          owner_id: user.id,
          email: lower,
          password: data.password,
          name: data.name.trim(),
          role: data.role,
          active: data.active,
        });
        if (error) {
          if ((error.message || '').toLowerCase().includes('duplicate')) {
            return { ok: false, message: 'هذا البريد مستخدم بالفعل' };
          }
          return { ok: false, message: translateError(error.message) };
        }
        if (row) setUsers((prev) => [mapAppUserRow(row), ...prev]);
        return { ok: true };
      } catch (e: any) {
        return { ok: false, message: translateError(e?.message || '') };
      }
    },
    [user, users]
  );

  const updateUser = useCallback(
    async (id: string, data: Partial<AppUser>) => {
      if (!user) return { ok: false, message: 'غير مسجل دخول' };
      const updates: Record<string, any> = {};
      if (data.name !== undefined) updates.name = data.name.trim();
      if (data.email !== undefined) updates.email = data.email.trim().toLowerCase();
      if (data.password !== undefined) updates.password = data.password;
      if (data.role !== undefined) updates.role = data.role;
      if (data.active !== undefined) updates.active = data.active;
      try {
        const { error } = await updateAppUserRecord(id, updates);
        if (error) return { ok: false, message: translateError(error.message) };
        setUsers((prev) =>
          prev.map((u) =>
            u.id === id
              ? {
                  ...u,
                  ...(data as Partial<AppUser>),
                  email: data.email ? data.email.trim().toLowerCase() : u.email,
                  username: data.email
                    ? data.email.trim().toLowerCase()
                    : u.username,
                }
              : u
          )
        );
        return { ok: true };
      } catch (e: any) {
        return { ok: false, message: translateError(e?.message || '') };
      }
    },
    [user]
  );

  const deleteUser = useCallback(
    async (id: string) => {
      if (!user) return { ok: false, message: 'غير مسجل دخول' };
      try {
        const { error } = await deleteAppUserRecord(id);
        if (error) return { ok: false, message: translateError(error.message) };
        setUsers((prev) => prev.filter((u) => u.id !== id));
        return { ok: true };
      } catch (e: any) {
        return { ok: false, message: translateError(e?.message || '') };
      }
    },
    [user]
  );

  const permissions = useMemo(
    () => getPermissions(user?.role || 'owner'),
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        ready,
        initializing,
        googleLoading,
        user,
        session,
        users,
        needsSetup: false,
        rememberMe: true,
        pendingSignup,
        permissions,
        isOwner: !!user,
        canEdit: !!user,
        canManageUsers: !!user,
        canManageSettings: !!user,
        signIn,
        sendSignUpOTP,
        verifyEmailOTP,
        resendSignUpOTP,
        clearPendingSignup,
        signUp,
        signInWithGoogle,
        resetPassword,
        signOut,
        logout: signOut,
        login: signIn,
        registerOwner: signUp,
        addUser,
        updateUser,
        deleteUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
