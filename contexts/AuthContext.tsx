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
import { AppUser, getPermissions, Permission, UserRole, UserStatus } from '@/constants/types';
import {
  createAppUserRecord,
  deleteAppUserRecord,
  fetchAppUsersList,
  updateAppUserRecord,
  subUserLogin,
  subUserRequestJoin,
  subUserCheckStatus,
} from '@/services/cloud';
import { loadData, saveData, removeData, StorageKeys } from '@/services/storage';

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
  isSubUser: boolean;
  users: AppUser[];
  pendingUsersCount: number;
  needsSetup: boolean;
  rememberMe: boolean;
  pendingSignup: PendingSignup | null;
  permissions: Permission;
  isOwner: boolean;
  canEdit: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  signIn: (email: string, password: string, remember?: boolean) => Promise<{ ok: boolean; message?: string }>;
  signInWithPhone: (phone: string, password: string) => Promise<{ ok: boolean; message?: string; status?: string }>;
  requestJoinByPhone: (phone: string, password: string, name: string) => Promise<{ ok: boolean; message?: string }>;
  sendSignUpOTP: (data: { name: string; email: string; password: string }) => Promise<{ ok: boolean; message?: string }>;
  verifyEmailOTP: (otp: string) => Promise<{ ok: boolean; message?: string }>;
  resendSignUpOTP: () => Promise<{ ok: boolean; message?: string }>;
  clearPendingSignup: () => void;
  signUp: (data: { name: string; email: string; password: string }) => Promise<{ ok: boolean; message?: string; needsConfirmation?: boolean }>;
  signInWithGoogle: () => Promise<{ ok: boolean; message?: string }>;
  resetPassword: (email: string) => Promise<{ ok: boolean; message?: string }>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  login: (email: string, password: string, remember?: boolean) => Promise<{ ok: boolean; message?: string }>;
  registerOwner: (data: { name: string; email: string; password: string }) => Promise<{ ok: boolean; message?: string; needsConfirmation?: boolean }>;
  addUser: (data: { name: string; email: string; phone?: string; password: string; role: UserRole; active: boolean; status?: UserStatus }) => Promise<{ ok: boolean; message?: string }>;
  updateUser: (id: string, data: Partial<AppUser>) => Promise<{ ok: boolean; message?: string }>;
  deleteUser: (id: string) => Promise<{ ok: boolean; message?: string }>;
  approveUser: (id: string) => Promise<{ ok: boolean; message?: string }>;
  rejectUser: (id: string) => Promise<{ ok: boolean; message?: string }>;
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
    status: 'approved',
    createdAt: u.created_at ? new Date(u.created_at).getTime() : Date.now(),
  };
}

function translateError(message: string): string {
  const m = (message || '').toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid_grant') || m.includes('invalid credentials')) {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
  }
  if (m.includes('user already registered') || m.includes('already registered') || m.includes('already exists') || (m.includes('duplicate') && m.includes('email'))) {
    return 'هذا البريد مسجل بالفعل، يمكنك تسجيل الدخول';
  }
  if (m.includes('email not confirmed') || m.includes('not confirmed')) {
    return 'يرجى تأكيد بريدك الإلكتروني أولاً';
  }
  if (m.includes('weak password') || m.includes('too short') || m.includes('password should be')) {
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
  if (m.includes('provider is not enabled') || m.includes('provider not enabled') || (m.includes('oauth') && m.includes('not')) || m.includes('unsupported provider')) {
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
    ownerId: row.owner_id,
    email: row.email || '',
    username: row.email || '',
    password: row.password || '',
    name: row.name || '',
    phone: row.phone || '',
    role: (row.role || 'sales') as UserRole,
    active: row.active !== false,
    status: (row.status || 'approved') as UserStatus,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    approvedAt: row.approved_at ? new Date(row.approved_at).getTime() : undefined,
  };
}

function mapSubUserResponse(row: any): AppUser {
  return {
    id: row.id,
    ownerId: row.ownerId,
    email: row.email || '',
    username: row.email || '',
    password: '',
    name: row.name || '',
    phone: row.phone || '',
    role: (row.role || 'sales') as UserRole,
    active: row.active !== false,
    status: (row.status || 'approved') as UserStatus,
    createdAt: row.createdAt ? new Date(row.createdAt).getTime() : Date.now(),
    approvedAt: row.approvedAt ? new Date(row.approvedAt).getTime() : undefined,
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
  const [sessionUser, setSessionUser] = useState<AppUser | null>(null);
  const [subUser, setSubUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [pendingSignup, setPendingSignup] = useState<PendingSignup | null>(null);

  // Effective user: sub-user takes priority if both exist
  const user = subUser || sessionUser;
  const isSubUser = !!subUser && !!subUser.ownerId;

  // Initialize: try to restore sub-user session OR get supabase session
  useEffect(() => {
    (async () => {
      try {
        const cached = await loadData<AppUser | null>(StorageKeys.subUserSession, null);
        if (cached && cached.id && cached.ownerId) {
          // Verify with server that user is still approved
          const result: any = await subUserCheckStatus(cached.id);
          if (result?.ok && result.user) {
            const refreshed = mapSubUserResponse(result.user);
            if (refreshed.status === 'approved' && refreshed.active) {
              setSubUser(refreshed);
              await saveData(StorageKeys.subUserSession, refreshed);
            } else {
              await removeData(StorageKeys.subUserSession);
            }
          } else {
            // Could be offline; trust cache for now
            setSubUser(cached);
          }
        }
      } catch {}

      const { data: { session: existingSession } } = await supabase.auth.getSession();
      setSession(existingSession);
      setSessionUser(buildUserFromSession(existingSession));
      setReady(true);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSessionUser(buildUserFromSession(session));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshUsers = useCallback(async () => {
    const ownerId = user?.ownerId || user?.id;
    if (!ownerId || isSubUser) {
      // Sub-users don't manage users
      return;
    }
    const result = await fetchAppUsersList(ownerId);
    if (!result.error) {
      setUsers(result.data.map(mapAppUserRow));
    }
  }, [user?.id, user?.ownerId, isSubUser]);

  useEffect(() => {
    if (!user || isSubUser) {
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
  }, [user?.id, isSubUser]);

  // Periodic refresh of users for pending notifications (owner only)
  useEffect(() => {
    if (!user || isSubUser) return;
    const interval = setInterval(() => {
      refreshUsers();
    }, 30000);
    return () => clearInterval(interval);
  }, [user?.id, isSubUser, refreshUsers]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setInitializing(true);
      try {
        // Clear any sub-user session before owner login
        setSubUser(null);
        await removeData(StorageKeys.subUserSession);

        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) {
          return { ok: false, message: translateError(error.message) };
        }
        return { ok: true };
      } catch (e: any) {
        return { ok: false, message: translateError(e?.message || '') };
      } finally {
        setInitializing(false);
      }
    },
    []
  );

  const signInWithPhone = useCallback(
    async (phone: string, password: string) => {
      const cleanPhone = phone.trim();
      if (!cleanPhone) return { ok: false, message: 'يرجى إدخال رقم الهاتف' };
      if (!password) return { ok: false, message: 'يرجى إدخال كلمة المرور' };

      setInitializing(true);
      try {
        // Clear any owner session before sub-user login
        try { await supabase.auth.signOut(); } catch {}
        setSession(null);
        setSessionUser(null);

        const result: any = await subUserLogin(cleanPhone, password);
        if (!result?.ok) {
          return { ok: false, message: result?.message || 'فشل تسجيل الدخول', status: result?.status };
        }
        const sub = mapSubUserResponse(result.user);
        setSubUser(sub);
        await saveData(StorageKeys.subUserSession, sub);
        return { ok: true };
      } catch (e: any) {
        return { ok: false, message: e?.message || 'فشل الاتصال' };
      } finally {
        setInitializing(false);
      }
    },
    []
  );

  const requestJoinByPhone = useCallback(
    async (phone: string, password: string, name: string) => {
      const cleanPhone = phone.trim();
      const cleanName = name.trim();
      if (!cleanPhone || !password || !cleanName) {
        return { ok: false, message: 'الاسم ورقم الهاتف وكلمة المرور مطلوبة' };
      }
      if (password.length < 4) {
        return { ok: false, message: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' };
      }
      try {
        const result: any = await subUserRequestJoin(cleanPhone, password, cleanName);
        if (!result?.ok) return { ok: false, message: result?.message || 'فشل إرسال الطلب' };
        return { ok: true, message: result.message };
      } catch (e: any) {
        return { ok: false, message: e?.message || 'فشل الاتصال' };
      }
    },
    []
  );

  const sendSignUpOTP = useCallback(
    async (data: { name: string; email: string; password: string }) => {
      const name = data.name.trim();
      if (!name) return { ok: false, message: 'الاسم الكامل مطلوب' };
      if (!data.email.trim()) return { ok: false, message: 'البريد الإلكتروني مطلوب' };
      if (!isValidEmail(data.email)) return { ok: false, message: 'البريد الإلكتروني غير صحيح' };
      if (data.password.length < 6) return { ok: false, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };

      setInitializing(true);
      try {
        const lower = data.email.trim().toLowerCase();
        const { error } = await supabase.auth.signInWithOtp({
          email: lower,
          options: {
            shouldCreateUser: true,
            data: { name, full_name: name, username: name },
          },
        });
        if (error) {
          return { ok: false, message: translateError(error.message) };
        }
        setPendingSignup({ email: lower, name, password: data.password, sentAt: Date.now() });
        return { ok: true };
      } catch (e: any) {
        return { ok: false, message: translateError(e?.message || '') };
      } finally {
        setInitializing(false);
      }
    },
    []
  );

  const verifyEmailOTP = useCallback(
    async (otp: string) => {
      if (!pendingSignup) return { ok: false, message: 'لا يوجد طلب تحقق نشط، أعد إنشاء الحساب' };
      const code = otp.trim().replace(/\s+/g, '');
      if (code.length < 4) return { ok: false, message: 'يرجى إدخال رمز التحقق بالكامل' };

      setInitializing(true);
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: pendingSignup.email,
          token: code,
          type: 'email',
        });
        if (error) {
          return { ok: false, message: translateError(error.message) };
        }
        if (data.session && pendingSignup.password) {
          try { await supabase.auth.updateUser({ password: pendingSignup.password }); } catch {}
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
        return { ok: false, message: translateError(e?.message || '') };
      } finally {
        setInitializing(false);
      }
    },
    [pendingSignup]
  );

  const resendSignUpOTP = useCallback(async () => {
    if (!pendingSignup) return { ok: false, message: 'لا يوجد طلب تحقق نشط' };
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: pendingSignup.email,
        options: {
          shouldCreateUser: true,
          data: { name: pendingSignup.name, full_name: pendingSignup.name, username: pendingSignup.name },
        },
      });
      if (error) return { ok: false, message: translateError(error.message) };
      setPendingSignup({ ...pendingSignup, sentAt: Date.now() });
      return { ok: true };
    } catch (e: any) {
      return { ok: false, message: translateError(e?.message || '') };
    }
  }, [pendingSignup]);

  const clearPendingSignup = useCallback(() => setPendingSignup(null), []);

  const signUp = useCallback(
    async (data: { name: string; email: string; password: string }) => {
      const res = await sendSignUpOTP(data);
      return { ...res, needsConfirmation: true };
    },
    [sendSignUpOTP]
  );

  const signInWithGoogle = useCallback(async () => {
    if (googleLoading) return { ok: false, message: 'جاري المعالجة، يرجى الانتظار...' };
    setGoogleLoading(true);
    try {
      // Clear sub-user session
      setSubUser(null);
      await removeData(StorageKeys.subUserSession);

      const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';
      const redirectTo = isWeb ? window.location.origin : Linking.createURL('/auth/callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: !isWeb },
      });
      if (error) return { ok: false, message: translateError(error.message) };
      if (isWeb) return { ok: true };
      if (!data?.url) return { ok: false, message: 'تعذر بدء عملية تسجيل الدخول' };

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, { showInRecents: true });
      if (result.type === 'success' && result.url) {
        const url = result.url;
        const hashIndex = url.indexOf('#');
        const queryIndex = url.indexOf('?');
        const fragment = hashIndex >= 0 ? url.slice(hashIndex + 1) : queryIndex >= 0 ? url.slice(queryIndex + 1) : '';
        const params = new URLSearchParams(fragment);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        const errCode = params.get('error') || params.get('error_code');
        const errDesc = params.get('error_description');
        if (errCode) return { ok: false, message: errDesc ? translateError(errDesc) : translateError(errCode) };
        if (access_token && refresh_token) {
          const { error: sessErr } = await supabase.auth.setSession({ access_token, refresh_token });
          if (sessErr) return { ok: false, message: translateError(sessErr.message) };
          return { ok: true };
        }
        return { ok: false, message: 'تعذر استكمال تسجيل الدخول' };
      }
      if (result.type === 'cancel' || result.type === 'dismiss') {
        return { ok: false, message: 'تم إلغاء عملية تسجيل الدخول' };
      }
      return { ok: false, message: 'فشل تسجيل الدخول بـ Google' };
    } catch (e: any) {
      return { ok: false, message: translateError(e?.message || 'فشل تسجيل الدخول') };
    } finally {
      setGoogleLoading(false);
    }
  }, [googleLoading]);

  const resetPassword = useCallback(async (email: string) => {
    if (!email.trim()) return { ok: false, message: 'البريد الإلكتروني مطلوب' };
    try {
      const redirectTo = Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.origin
        : Linking.createURL('/auth/recovery');
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
      if (error) return { ok: false, message: translateError(error.message) };
      return { ok: true };
    } catch (e: any) {
      return { ok: false, message: translateError(e?.message || '') };
    }
  }, []);

  const signOut = useCallback(async () => {
    setPendingSignup(null);
    setSubUser(null);
    await removeData(StorageKeys.subUserSession);
    try { await supabase.auth.signOut(); } catch {}
    setSession(null);
    setSessionUser(null);
  }, []);

  const addUser = useCallback(
    async (data: { name: string; email: string; phone?: string; password: string; role: UserRole; active: boolean; status?: UserStatus }) => {
      if (!user || isSubUser) return { ok: false, message: 'غير مسموح' };
      if (!data.name.trim()) return { ok: false, message: 'الاسم مطلوب' };
      if (!data.password.trim() || data.password.length < 4) return { ok: false, message: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' };

      const cleanPhone = (data.phone || '').trim();
      let cleanEmail = (data.email || '').trim().toLowerCase();

      // If no email provided, generate one from phone
      if (!cleanEmail && cleanPhone) {
        cleanEmail = `${cleanPhone}@phone.local`;
      }
      if (!cleanEmail) return { ok: false, message: 'يرجى إدخال البريد أو رقم الهاتف' };

      if (users.some((u) => u.email.trim().toLowerCase() === cleanEmail)) {
        return { ok: false, message: 'هذا البريد مستخدم بالفعل' };
      }
      if (cleanPhone && users.some((u) => (u.phone || '') === cleanPhone)) {
        return { ok: false, message: 'هذا الهاتف مستخدم بالفعل' };
      }

      try {
        const { data: row, error } = await createAppUserRecord({
          owner_id: user.id,
          email: cleanEmail,
          password: data.password,
          name: data.name.trim(),
          phone: cleanPhone || undefined,
          role: data.role,
          active: data.active,
          status: data.status || 'pending',
        });
        if (error) {
          if ((error.message || '').toLowerCase().includes('duplicate')) {
            return { ok: false, message: 'هذا البريد أو الهاتف مستخدم بالفعل' };
          }
          return { ok: false, message: translateError(error.message) };
        }
        if (row) setUsers((prev) => [mapAppUserRow(row), ...prev]);
        return { ok: true };
      } catch (e: any) {
        return { ok: false, message: translateError(e?.message || '') };
      }
    },
    [user, users, isSubUser]
  );

  const updateUser = useCallback(
    async (id: string, data: Partial<AppUser>) => {
      if (!user || isSubUser) return { ok: false, message: 'غير مسموح' };
      const updates: Record<string, any> = {};
      if (data.name !== undefined) updates.name = data.name.trim();
      if (data.email !== undefined) updates.email = data.email.trim().toLowerCase();
      if (data.phone !== undefined) updates.phone = (data.phone || '').trim() || null;
      if (data.password !== undefined) updates.password = data.password;
      if (data.role !== undefined) updates.role = data.role;
      if (data.active !== undefined) updates.active = data.active;
      if (data.status !== undefined) {
        updates.status = data.status;
        if (data.status === 'approved') updates.approved_at = new Date().toISOString();
      }
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
                  username: data.email ? data.email.trim().toLowerCase() : u.username,
                  phone: data.phone !== undefined ? (data.phone || '').trim() : u.phone,
                }
              : u
          )
        );
        return { ok: true };
      } catch (e: any) {
        return { ok: false, message: translateError(e?.message || '') };
      }
    },
    [user, isSubUser]
  );

  const deleteUser = useCallback(
    async (id: string) => {
      if (!user || isSubUser) return { ok: false, message: 'غير مسموح' };
      try {
        const { error } = await deleteAppUserRecord(id);
        if (error) return { ok: false, message: translateError(error.message) };
        setUsers((prev) => prev.filter((u) => u.id !== id));
        return { ok: true };
      } catch (e: any) {
        return { ok: false, message: translateError(e?.message || '') };
      }
    },
    [user, isSubUser]
  );

  const approveUser = useCallback(
    async (id: string) => {
      return await updateUser(id, { status: 'approved', active: true });
    },
    [updateUser]
  );

  const rejectUser = useCallback(
    async (id: string) => {
      return await updateUser(id, { status: 'rejected', active: false });
    },
    [updateUser]
  );

  const permissions = useMemo(() => getPermissions(user?.role || 'owner'), [user]);
  const isOwner = !!user && (user.role === 'owner' || !user.ownerId);
  const canEdit = !!user && (isOwner || permissions.canEditSales || permissions.canEditProducts || permissions.canEditCustomers || permissions.canEditPurchases || permissions.canEditExpenses);
  const canManageUsers = !!user && isOwner;
  const canManageSettings = !!user && (isOwner || permissions.canManageSettings);

  const pendingUsersCount = useMemo(
    () => users.filter((u) => u.status === 'pending').length,
    [users]
  );

  return (
    <AuthContext.Provider
      value={{
        ready,
        initializing,
        googleLoading,
        user,
        session,
        isSubUser,
        users,
        pendingUsersCount,
        needsSetup: false,
        rememberMe: true,
        pendingSignup,
        permissions,
        isOwner,
        canEdit,
        canManageUsers,
        canManageSettings,
        signIn,
        signInWithPhone,
        requestJoinByPhone,
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
        approveUser,
        rejectUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
