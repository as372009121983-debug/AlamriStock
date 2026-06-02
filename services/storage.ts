// Powered by OnSpace.AI
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@alamri_app:';

export const StorageKeys = {
  products: `${PREFIX}products`,
  customers: `${PREFIX}customers`,
  suppliers: `${PREFIX}suppliers`,
  sales: `${PREFIX}sales`,
  purchases: `${PREFIX}purchases`,
  warehouses: `${PREFIX}warehouses`,
  stocks: `${PREFIX}stocks`,
  transfers: `${PREFIX}transfers`,
  saleReturns: `${PREFIX}sale_returns`,
  purchaseReturns: `${PREFIX}purchase_returns`,
  expenses: `${PREFIX}expenses`,
  customerPayments: `${PREFIX}customer_payments`,
  workers: `${PREFIX}workers`,
  workerPayments: `${PREFIX}worker_payments`,
  workerAdvances: `${PREFIX}worker_advances`,
  notifications: `${PREFIX}notifications`,
  activityLog: `${PREFIX}activity_log`,
  settings: `${PREFIX}settings`,
  invoiceCounter: `${PREFIX}invoice_counter`,
  purchaseCounter: `${PREFIX}purchase_counter`,
  transferCounter: `${PREFIX}transfer_counter`,
  saleReturnCounter: `${PREFIX}sale_return_counter`,
  purchaseReturnCounter: `${PREFIX}purchase_return_counter`,
  customerPaymentCounter: `${PREFIX}customer_payment_counter`,
  workerPaymentCounter: `${PREFIX}worker_payment_counter`,
  workerAdvanceCounter: `${PREFIX}worker_advance_counter`,
  users: `${PREFIX}users`,
  currentUserId: `${PREFIX}current_user_id`,
  rememberMe: `${PREFIX}remember_me`,
  subUserSession: `${PREFIX}sub_user_session`,
};

export async function saveData<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('save error', e);
  }
}

export async function loadData<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    return fallback;
  }
}

export async function removeData(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.warn('remove error', e);
  }
}

export async function clearAll(): Promise<void> {
  const keys = Object.values(StorageKeys);
  await AsyncStorage.multiRemove(keys);
}

export async function exportAll(): Promise<string> {
  const result: Record<string, unknown> = {};
  for (const key of Object.values(StorageKeys)) {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      result[key] = JSON.parse(raw);
    }
  }
  return JSON.stringify(result, null, 2);
}

export async function importAll(payload: string): Promise<void> {
  const parsed = JSON.parse(payload) as Record<string, unknown>;
  const entries: [string, string][] = [];
  for (const [key, value] of Object.entries(parsed)) {
    entries.push([key, JSON.stringify(value)]);
  }
  if (entries.length) {
    await AsyncStorage.multiSet(entries);
  }
}
