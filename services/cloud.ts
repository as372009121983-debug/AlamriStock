// Powered by OnSpace.AI
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

export type AppDataBlob = {
  products: any[];
  customers: any[];
  suppliers: any[];
  sales: any[];
  purchases: any[];
  warehouses: any[];
  stocks: any[];
  transfers: any[];
  saleReturns: any[];
  purchaseReturns: any[];
  expenses: any[];
  customerPayments: any[];
  workers: any[];
  workerPayments: any[];
  workerAdvances: any[];
  notifications: any[];
  activityLog: any[];
  settings: any;
  invoiceCounter: number;
  purchaseCounter: number;
  transferCounter: number;
  saleReturnCounter: number;
  purchaseReturnCounter: number;
  customerPaymentCounter: number;
  workerPaymentCounter: number;
  workerAdvanceCounter: number;
};

export type CloudResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  updatedAt?: string;
};

export async function pushAppData(
  userId: string,
  blob: AppDataBlob
): Promise<CloudResult<void>> {
  try {
    const now = new Date().toISOString();
    const { error } = await supabase.from('app_data').upsert(
      { user_id: userId, data: blob, updated_at: now },
      { onConflict: 'user_id' }
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true, updatedAt: now };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

export async function pullAppData(
  userId: string
): Promise<CloudResult<AppDataBlob>> {
  try {
    const { data, error } = await supabase
      .from('app_data')
      .select('data, updated_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: true };
    return {
      ok: true,
      data: data.data as AppDataBlob,
      updatedAt: data.updated_at,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' };
  }
}

export async function fetchAppUsersList(ownerId: string) {
  try {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    if (error) return { data: [] as any[], error: error.message };
    return { data: data || [], error: null as string | null };
  } catch (e: any) {
    return { data: [] as any[], error: e?.message || 'Network error' };
  }
}

export async function createAppUserRecord(record: {
  owner_id: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: string;
  active: boolean;
  status?: string;
}) {
  return await supabase
    .from('app_users')
    .insert(record)
    .select()
    .single();
}

export async function updateAppUserRecord(
  id: string,
  updates: Record<string, any>
) {
  return await supabase
    .from('app_users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
}

export async function deleteAppUserRecord(id: string) {
  return await supabase.from('app_users').delete().eq('id', id);
}

// ============ Sub-User Authentication via Edge Function ============
export type SubUserData = {
  id: string;
  ownerId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  active: boolean;
  createdAt: string;
  approvedAt: string | null;
};

async function invokeSubUserAuth(action: string, payload: Record<string, any>) {
  try {
    const { data, error } = await supabase.functions.invoke('sub-user-auth', {
      body: { action, ...payload },
    });
    if (error) {
      let errorMessage = error.message || 'خطأ في الاتصال';
      try {
        const ctx = (error as any).context;
        if (ctx?.text) {
          const text = await ctx.text();
          if (text) errorMessage = text;
        }
      } catch {}
      return { ok: false, message: errorMessage };
    }
    return data || { ok: false, message: 'استجابة غير صحيحة' };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'فشل الاتصال بالخادم' };
  }
}

export async function subUserLogin(phone: string, password: string) {
  return await invokeSubUserAuth('login', { phone, password });
}

export async function subUserRequestJoin(phone: string, password: string, name: string) {
  return await invokeSubUserAuth('request_join', { phone, password, name });
}

export async function subUserPullData(userId: string) {
  return await invokeSubUserAuth('pull', { userId });
}

export async function subUserPushData(userId: string, blob: AppDataBlob) {
  return await invokeSubUserAuth('push', { userId, blob });
}

export async function subUserCheckStatus(userId: string) {
  return await invokeSubUserAuth('check_status', { userId });
}
