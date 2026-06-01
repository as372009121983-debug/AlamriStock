// Powered by OnSpace.AI
import React, {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { generateId } from '@/services/format';
import { loadData, saveData, StorageKeys, clearAll as clearStorage } from '@/services/storage';
import {
  ActivityLog,
  ActivityType,
  AppNotification,
  Customer,
  CustomerPayment,
  Expense,
  Product,
  Purchase,
  PurchaseItem,
  PurchaseReturn,
  ReturnItem,
  Sale,
  SaleItem,
  SaleReturn,
  Settings,
  StockEntry,
  Supplier,
  Transfer,
  TransferItem,
  Warehouse,
  Worker,
  WorkerPayment,
} from '@/constants/types';
import { useAuth } from '@/hooks/useAuth';
import { AppDataBlob, pullAppData, pushAppData } from '@/services/cloud';

export type StoreContextType = {
  ready: boolean;
  syncing: boolean;
  lastCloudSyncAt: number | null;
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: Sale[];
  purchases: Purchase[];
  warehouses: Warehouse[];
  stocks: StockEntry[];
  transfers: Transfer[];
  saleReturns: SaleReturn[];
  purchaseReturns: PurchaseReturn[];
  expenses: Expense[];
  customerPayments: CustomerPayment[];
  workers: Worker[];
  workerPayments: WorkerPayment[];
  notifications: AppNotification[];
  activityLog: ActivityLog[];
  settings: Settings;
  invoiceCounter: number;
  purchaseCounter: number;
  transferCounter: number;
  saleReturnCounter: number;
  purchaseReturnCounter: number;
  customerPaymentCounter: number;
  workerPaymentCounter: number;
  unreadNotifications: number;
  getStock: (productId: string, warehouseId: string) => number;
  getTotalStock: (productId: string) => number;
  defaultMainWarehouseId: string | null;
  syncNow: () => Promise<void>;
  addProduct: (data: Omit<Product, 'id' | 'createdAt' | 'quantity'>, warehouseId: string, initialQty: number) => { ok: boolean; message?: string };
  updateProduct: (id: string, data: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addCustomer: (data: Omit<Customer, 'id' | 'createdAt' | 'debt'> & { debt?: number }) => Customer;
  updateCustomer: (id: string, data: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addSupplier: (data: Omit<Supplier, 'id' | 'createdAt'>) => void;
  updateSupplier: (id: string, data: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  addWarehouse: (data: Omit<Warehouse, 'id' | 'createdAt'>) => void;
  updateWarehouse: (id: string, data: Partial<Warehouse>) => void;
  deleteWarehouse: (id: string) => { ok: boolean; message?: string };
  createSale: (input: { customerId: string | null; customerName: string; warehouseId: string; items: SaleItem[]; discount: number; paid: number; notes?: string }) => { sale: Sale | null; error?: string };
  deleteSale: (id: string) => void;
  createPurchase: (input: { supplierId: string; supplierName: string; warehouseId: string; items: PurchaseItem[]; notes?: string }) => { purchase: Purchase | null; error?: string };
  deletePurchase: (id: string) => void;
  createTransfer: (input: { fromWarehouseId: string; toWarehouseId: string; items: TransferItem[]; notes?: string }) => { transfer: Transfer | null; error?: string };
  deleteTransfer: (id: string) => void;
  createSaleReturn: (input: { saleId: string | null; customerId: string | null; customerName: string; warehouseId: string; items: ReturnItem[]; reason?: string }) => { ret: SaleReturn | null; error?: string };
  deleteSaleReturn: (id: string) => void;
  createPurchaseReturn: (input: { purchaseId: string | null; supplierId: string; supplierName: string; warehouseId: string; items: ReturnItem[]; reason?: string }) => { ret: PurchaseReturn | null; error?: string };
  deletePurchaseReturn: (id: string) => void;
  addExpense: (data: Omit<Expense, 'id' | 'date' | 'userId' | 'userName'> & { date?: number }) => void;
  updateExpense: (id: string, data: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addCustomerPayment: (data: { customerId: string; customerName: string; amount: number; date?: number; notes?: string }) => { payment: CustomerPayment | null; error?: string };
  deleteCustomerPayment: (id: string) => void;
  addWorker: (data: Omit<Worker, 'id' | 'createdAt'>) => Worker;
  updateWorker: (id: string, data: Partial<Worker>) => void;
  deleteWorker: (id: string) => { ok: boolean; message?: string };
  addWorkerPayment: (data: { workerId: string; amount: number; date?: number; notes?: string }) => { payment: WorkerPayment | null; error?: string };
  deleteWorkerPayment: (id: string) => void;
  addNotification: (notif: Omit<AppNotification, 'id' | 'date' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;
  updateSettings: (data: Partial<Settings>) => void;
  resetAll: () => Promise<void>;
};

export const StoreContext = createContext<StoreContextType | undefined>(undefined);

const defaultSettings: Settings = {
  companyName: 'الأمري للأدوات الصحية',
  appTitle: 'نظام الأمري للمخازن',
  ownerName: 'عبدالرحمن سلامة',
  logo: '',
  currency: 'ج.م',
  phone: '',
  address: '',
  taxNumber: '',
  invoiceFooter: 'شكراً لتعاملكم معنا',
  adminPassword: '0',
};

const ACTIVITY_LIMIT = 1000;

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastCloudSyncAt, setLastCloudSyncAt] = useState<number | null>(null);
  const [hasInitialSync, setHasInitialSync] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stocks, setStocks] = useState<StockEntry[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [saleReturns, setSaleReturns] = useState<SaleReturn[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerPayments, setWorkerPayments] = useState<WorkerPayment[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [invoiceCounter, setInvoiceCounter] = useState<number>(1000);
  const [purchaseCounter, setPurchaseCounter] = useState<number>(1000);
  const [transferCounter, setTransferCounter] = useState<number>(1000);
  const [saleReturnCounter, setSaleReturnCounter] = useState<number>(1000);
  const [purchaseReturnCounter, setPurchaseReturnCounter] = useState<number>(1000);
  const [customerPaymentCounter, setCustomerPaymentCounter] = useState<number>(1000);
  const [workerPaymentCounter, setWorkerPaymentCounter] = useState<number>(1000);

  const lastCloudUpdateRef = useRef<string | null>(null);
  const previousUserIdRef = useRef<string | null>(null);

  // Load local cache on mount
  useEffect(() => {
    (async () => {
      const [
        p, c, s, sa, pu, wh, st, tr, sr, pr, ex,
        cp, wk, wp, notif, al, settingsData,
        ic, pc, tc, src, prc, cpc, wpc,
      ] = await Promise.all([
        loadData<Product[]>(StorageKeys.products, []),
        loadData<Customer[]>(StorageKeys.customers, []),
        loadData<Supplier[]>(StorageKeys.suppliers, []),
        loadData<Sale[]>(StorageKeys.sales, []),
        loadData<Purchase[]>(StorageKeys.purchases, []),
        loadData<Warehouse[]>(StorageKeys.warehouses, []),
        loadData<StockEntry[]>(StorageKeys.stocks, []),
        loadData<Transfer[]>(StorageKeys.transfers, []),
        loadData<SaleReturn[]>(StorageKeys.saleReturns, []),
        loadData<PurchaseReturn[]>(StorageKeys.purchaseReturns, []),
        loadData<Expense[]>(StorageKeys.expenses, []),
        loadData<CustomerPayment[]>(StorageKeys.customerPayments, []),
        loadData<Worker[]>(StorageKeys.workers, []),
        loadData<WorkerPayment[]>(StorageKeys.workerPayments, []),
        loadData<AppNotification[]>(StorageKeys.notifications, []),
        loadData<ActivityLog[]>(StorageKeys.activityLog, []),
        loadData<Settings>(StorageKeys.settings, defaultSettings),
        loadData<number>(StorageKeys.invoiceCounter, 1000),
        loadData<number>(StorageKeys.purchaseCounter, 1000),
        loadData<number>(StorageKeys.transferCounter, 1000),
        loadData<number>(StorageKeys.saleReturnCounter, 1000),
        loadData<number>(StorageKeys.purchaseReturnCounter, 1000),
        loadData<number>(StorageKeys.customerPaymentCounter, 1000),
        loadData<number>(StorageKeys.workerPaymentCounter, 1000),
      ]);

      let warehousesData = wh;
      let stocksData = st;
      if (warehousesData.length === 0) {
        warehousesData = [{
          id: generateId(),
          name: 'المخزن الرئيسي',
          type: 'main',
          address: '',
          phone: '',
          isDefault: true,
          createdAt: Date.now(),
        }];
      }

      const defaultMainId = warehousesData.find((w) => w.type === 'main' && w.isDefault)?.id
        || warehousesData.find((w) => w.type === 'main')?.id
        || warehousesData[0].id;

      const migratedProducts: Product[] = p.map((prod) => ({
        ...prod,
        prices: prod.prices || [],
        images: prod.images || [],
        category: prod.category || '',
        unit: prod.unit || 'قطعة',
        notes: (prod as any).notes || '',
      }));

      const stocksList = [...stocksData];
      for (const prod of migratedProducts) {
        const hasEntry = stocksList.some((entry) => entry.productId === prod.id);
        if (!hasEntry) {
          stocksList.push({ productId: prod.id, warehouseId: defaultMainId, quantity: prod.quantity || 0 });
        }
      }
      for (const prod of migratedProducts) {
        prod.quantity = stocksList.filter((e) => e.productId === prod.id).reduce((sum, e) => sum + e.quantity, 0);
      }

      setProducts(migratedProducts);
      setCustomers(c);
      setSuppliers(s);
      setSales(sa);
      setPurchases(pu);
      setWarehouses(warehousesData);
      setStocks(stocksList);
      setTransfers(tr);
      setSaleReturns(sr);
      setPurchaseReturns(pr);
      setExpenses(ex);
      setCustomerPayments(cp);
      setWorkers(wk);
      setWorkerPayments(wp);
      setNotifications(notif);
      setActivityLog(al);
      setSettings({ ...defaultSettings, ...settingsData });
      setInvoiceCounter(ic);
      setPurchaseCounter(pc);
      setTransferCounter(tc);
      setSaleReturnCounter(src);
      setPurchaseReturnCounter(prc);
      setCustomerPaymentCounter(cpc);
      setWorkerPaymentCounter(wpc);
      setReady(true);
    })();
  }, []);

  // Persist to local cache
  useEffect(() => { if (ready) saveData(StorageKeys.products, products); }, [products, ready]);
  useEffect(() => { if (ready) saveData(StorageKeys.customers, customers); }, [customers, ready]);
  useEffect(() => { if (ready) saveData(StorageKeys.suppliers, suppliers); }, [suppliers, ready]);
  useEffect(() => { if (ready) saveData(StorageKeys.sales, sales); }, [sales, ready]);
  useEffect(() => { if (ready) saveData(StorageKeys.purchases, purchases); }, [purchases, ready]);
  useEffect(() => { if (ready) saveData(StorageKeys.warehouses, warehouses); }, [warehouses, ready]);
  useEffect(() => { if (ready) saveData(StorageKeys.stocks, stocks); }, [stocks, ready]);
  useEffect(() => { if (ready) saveData(StorageKeys.transfers, transfers); }, [transfers, ready]);
  useEffect(() => { if (ready) saveData(StorageKeys.saleReturns, saleReturns); }, [saleReturns, ready]);
  useEffect(() => { if (ready) saveData(StorageKeys.purchaseReturns, purchaseReturns); }, [purchaseReturns, ready]);
  useEffect(() => { if (ready) saveData(StorageKeys.expenses, expenses); }, [expenses, ready]);
  useEffect(() => { if (ready) saveData(StorageKeys.customerPayments, customerPayments); }, [customerPayments, ready]);
  useEffect(() => { if (ready) saveData(StorageKeys.workers, workers); }, [workers, ready]);
  useEffect(() => { if (ready) saveData(StorageKeys.workerPayments, workerPayments); }, [workerPayments, ready]);
  useEffect(() => { if (ready) saveData(StorageKeys.notifications, notifications); }, [notifications, ready]);
  useEffect(() => { if (ready) saveData(StorageKeys.activityLog, activityLog); }, [activityLog, ready]);
  useEffect(() => { if (ready) saveData(StorageKeys.settings, settings); }, [settings, ready]);
  useEffect(() => { if (ready) saveData(StorageKeys.invoiceCounter, invoiceCounter); }, [invoiceCounter, ready]);
  useEffect(() => { if (ready) saveData(StorageKeys.purchaseCounter, purchaseCounter); }, [purchaseCounter, ready]);
  useEffect(() => { if (ready) saveData(StorageKeys.transferCounter, transferCounter); }, [transferCounter, ready]);
  useEffect(() => { if (ready) saveData(StorageKeys.saleReturnCounter, saleReturnCounter); }, [saleReturnCounter, ready]);
  useEffect(() => { if (ready) saveData(StorageKeys.purchaseReturnCounter, purchaseReturnCounter); }, [purchaseReturnCounter, ready]);
  useEffect(() => { if (ready) saveData(StorageKeys.customerPaymentCounter, customerPaymentCounter); }, [customerPaymentCounter, ready]);
  useEffect(() => { if (ready) saveData(StorageKeys.workerPaymentCounter, workerPaymentCounter); }, [workerPaymentCounter, ready]);

  function collectBlob(): AppDataBlob {
    return {
      products, customers, suppliers, sales, purchases, warehouses, stocks,
      transfers, saleReturns, purchaseReturns, expenses,
      customerPayments, workers, workerPayments, notifications,
      activityLog, settings,
      invoiceCounter, purchaseCounter, transferCounter,
      saleReturnCounter, purchaseReturnCounter,
      customerPaymentCounter, workerPaymentCounter,
    };
  }

  function applyBlob(blob: Partial<AppDataBlob>) {
    if (Array.isArray(blob.products)) setProducts(blob.products);
    if (Array.isArray(blob.customers)) setCustomers(blob.customers);
    if (Array.isArray(blob.suppliers)) setSuppliers(blob.suppliers);
    if (Array.isArray(blob.sales)) setSales(blob.sales);
    if (Array.isArray(blob.purchases)) setPurchases(blob.purchases);
    if (Array.isArray(blob.warehouses)) setWarehouses(blob.warehouses);
    if (Array.isArray(blob.stocks)) setStocks(blob.stocks);
    if (Array.isArray(blob.transfers)) setTransfers(blob.transfers);
    if (Array.isArray(blob.saleReturns)) setSaleReturns(blob.saleReturns);
    if (Array.isArray(blob.purchaseReturns)) setPurchaseReturns(blob.purchaseReturns);
    if (Array.isArray(blob.expenses)) setExpenses(blob.expenses);
    if (Array.isArray(blob.customerPayments)) setCustomerPayments(blob.customerPayments);
    if (Array.isArray(blob.workers)) setWorkers(blob.workers);
    if (Array.isArray(blob.workerPayments)) setWorkerPayments(blob.workerPayments);
    if (Array.isArray(blob.notifications)) setNotifications(blob.notifications);
    if (Array.isArray(blob.activityLog)) setActivityLog(blob.activityLog);
    if (blob.settings) setSettings({ ...defaultSettings, ...blob.settings });
    if (typeof blob.invoiceCounter === 'number') setInvoiceCounter(blob.invoiceCounter);
    if (typeof blob.purchaseCounter === 'number') setPurchaseCounter(blob.purchaseCounter);
    if (typeof blob.transferCounter === 'number') setTransferCounter(blob.transferCounter);
    if (typeof blob.saleReturnCounter === 'number') setSaleReturnCounter(blob.saleReturnCounter);
    if (typeof blob.purchaseReturnCounter === 'number') setPurchaseReturnCounter(blob.purchaseReturnCounter);
    if (typeof blob.customerPaymentCounter === 'number') setCustomerPaymentCounter(blob.customerPaymentCounter);
    if (typeof blob.workerPaymentCounter === 'number') setWorkerPaymentCounter(blob.workerPaymentCounter);
  }

  // On user change: pull from cloud
  useEffect(() => {
    if (!ready) return;
    const currentUserId = user?.id || null;
    const previousUserId = previousUserIdRef.current;
    previousUserIdRef.current = currentUserId;

    if (!currentUserId) {
      if (previousUserId) {
        setHasInitialSync(false);
        lastCloudUpdateRef.current = null;
        clearStorage().catch(() => null);
        setProducts([]);
        setCustomers([]);
        setSuppliers([]);
        setSales([]);
        setPurchases([]);
        setWarehouses([{
          id: generateId(),
          name: 'المخزن الرئيسي',
          type: 'main',
          address: '',
          phone: '',
          isDefault: true,
          createdAt: Date.now(),
        }]);
        setStocks([]);
        setTransfers([]);
        setSaleReturns([]);
        setPurchaseReturns([]);
        setExpenses([]);
        setCustomerPayments([]);
        setWorkers([]);
        setWorkerPayments([]);
        setNotifications([]);
        setActivityLog([]);
        setSettings(defaultSettings);
        setInvoiceCounter(1000);
        setPurchaseCounter(1000);
        setTransferCounter(1000);
        setSaleReturnCounter(1000);
        setPurchaseReturnCounter(1000);
        setCustomerPaymentCounter(1000);
        setWorkerPaymentCounter(1000);
      }
      return;
    }

    setHasInitialSync(false);
    setSyncing(true);
    (async () => {
      const result = await pullAppData(currentUserId);
      if (result.ok && result.data) {
        applyBlob(result.data);
        lastCloudUpdateRef.current = result.updatedAt || null;
        setLastCloudSyncAt(Date.now());
      } else if (result.ok && !result.data) {
        const blob = collectBlob();
        const r = await pushAppData(currentUserId, blob);
        if (r.ok) {
          lastCloudUpdateRef.current = r.updatedAt || null;
          setLastCloudSyncAt(Date.now());
        }
      }
      setHasInitialSync(true);
      setSyncing(false);
    })();
  }, [user?.id, ready]);

  // Debounced push to cloud
  useEffect(() => {
    if (!ready || !user || !hasInitialSync) return;
    const t = setTimeout(async () => {
      if (!user) return;
      setSyncing(true);
      const blob = collectBlob();
      const result = await pushAppData(user.id, blob);
      if (result.ok && result.updatedAt) {
        lastCloudUpdateRef.current = result.updatedAt;
        setLastCloudSyncAt(Date.now());
      }
      setSyncing(false);
    }, 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    products, customers, suppliers, sales, purchases, warehouses, stocks,
    transfers, saleReturns, purchaseReturns, expenses,
    customerPayments, workers, workerPayments, notifications,
    settings,
    invoiceCounter, purchaseCounter, transferCounter,
    saleReturnCounter, purchaseReturnCounter,
    customerPaymentCounter, workerPaymentCounter,
    hasInitialSync, ready, user?.id,
  ]);

  // Periodic poll for remote changes
  useEffect(() => {
    if (!user || !hasInitialSync) return;
    const interval = setInterval(async () => {
      if (!user) return;
      const result = await pullAppData(user.id);
      if (result.ok && result.data && result.updatedAt && result.updatedAt !== lastCloudUpdateRef.current) {
        applyBlob(result.data);
        lastCloudUpdateRef.current = result.updatedAt;
        setLastCloudSyncAt(Date.now());
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [user?.id, hasInitialSync]);

  const syncNow = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    const result = await pullAppData(user.id);
    if (result.ok && result.data) {
      applyBlob(result.data);
      lastCloudUpdateRef.current = result.updatedAt || null;
      setLastCloudSyncAt(Date.now());
    }
    setSyncing(false);
  }, [user?.id]);

  const defaultMainWarehouseId = useMemo(() => {
    const d = warehouses.find((w) => w.type === 'main' && w.isDefault);
    if (d) return d.id;
    const m = warehouses.find((w) => w.type === 'main');
    return m ? m.id : null;
  }, [warehouses]);

  const getStock = useCallback((productId: string, warehouseId: string): number => {
    const entry = stocks.find((s) => s.productId === productId && s.warehouseId === warehouseId);
    return entry?.quantity || 0;
  }, [stocks]);

  const getTotalStock = useCallback((productId: string): number => {
    return stocks.filter((s) => s.productId === productId).reduce((sum, s) => sum + s.quantity, 0);
  }, [stocks]);

  function adjustStockList(list: StockEntry[], productId: string, warehouseId: string, delta: number): StockEntry[] {
    const idx = list.findIndex((s) => s.productId === productId && s.warehouseId === warehouseId);
    if (idx === -1) {
      if (delta < 0) return list;
      return [...list, { productId, warehouseId, quantity: delta }];
    }
    const updated = [...list];
    updated[idx] = { ...updated[idx], quantity: Math.max(0, updated[idx].quantity + delta) };
    return updated;
  }

  function syncProductQuantities(productList: Product[], stocksList: StockEntry[]): Product[] {
    return productList.map((p) => ({
      ...p,
      quantity: stocksList.filter((s) => s.productId === p.id).reduce((sum, s) => sum + s.quantity, 0),
    }));
  }

  const logActivity = useCallback((type: ActivityType, description: string, opts?: { amount?: number; refId?: string }) => {
    const entry: ActivityLog = {
      id: generateId(),
      type,
      description,
      amount: opts?.amount,
      refId: opts?.refId,
      userId: user?.id || 'system',
      userName: user?.name || 'النظام',
      date: Date.now(),
    };
    setActivityLog((prev) => [entry, ...prev].slice(0, ACTIVITY_LIMIT));
  }, [user]);

  const addProduct = useCallback<StoreContextType['addProduct']>((data, warehouseId, initialQty) => {
    const wh = warehouses.find((w) => w.id === warehouseId);
    if (!wh) return { ok: false, message: 'المخزن غير موجود' };
    if (wh.type !== 'main') return { ok: false, message: 'لا يمكن إضافة منتجات إلا للمخازن الرئيسية' };
    const productId = generateId();
    const product: Product = { ...data, id: productId, createdAt: Date.now(), quantity: initialQty || 0 };
    const newStocks = adjustStockList(stocks, productId, warehouseId, initialQty || 0);
    setStocks(newStocks);
    setProducts((prev) => syncProductQuantities([product, ...prev], newStocks));
    logActivity('product_add', `إضافة منتج: ${product.name}`, { refId: productId });
    return { ok: true };
  }, [warehouses, stocks, logActivity]);

  const updateProduct = useCallback((id: string, data: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    const target = products.find((p) => p.id === id);
    logActivity('product_edit', `تعديل منتج: ${target?.name || id}`, { refId: id });
  }, [products, logActivity]);

  const deleteProduct = useCallback((id: string) => {
    const target = products.find((p) => p.id === id);
    setStocks((prev) => prev.filter((s) => s.productId !== id));
    setProducts((prev) => prev.filter((p) => p.id !== id));
    if (target) logActivity('product_delete', `حذف منتج: ${target.name}`, { refId: id });
  }, [products, logActivity]);

  const addCustomer = useCallback<StoreContextType['addCustomer']>((data) => {
    const customer: Customer = { id: generateId(), createdAt: Date.now(), debt: data.debt ?? 0, name: data.name, phone: data.phone, address: data.address };
    setCustomers((prev) => [customer, ...prev]);
    logActivity('customer_add', `إضافة عميل: ${customer.name}`, { refId: customer.id });
    return customer;
  }, [logActivity]);

  const updateCustomer = useCallback((id: string, data: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
    const target = customers.find((c) => c.id === id);
    logActivity('customer_edit', `تعديل عميل: ${target?.name || id}`, { refId: id });
  }, [customers, logActivity]);

  const deleteCustomer = useCallback((id: string) => {
    const target = customers.find((c) => c.id === id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    if (target) logActivity('customer_delete', `حذف عميل: ${target.name}`, { refId: id });
  }, [customers, logActivity]);

  const addSupplier = useCallback((data: Omit<Supplier, 'id' | 'createdAt'>) => {
    const supplier: Supplier = { ...data, id: generateId(), createdAt: Date.now() };
    setSuppliers((prev) => [supplier, ...prev]);
    logActivity('supplier_add', `إضافة مورد: ${supplier.name}`, { refId: supplier.id });
  }, [logActivity]);

  const updateSupplier = useCallback((id: string, data: Partial<Supplier>) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
    const target = suppliers.find((s) => s.id === id);
    logActivity('supplier_edit', `تعديل مورد: ${target?.name || id}`, { refId: id });
  }, [suppliers, logActivity]);

  const deleteSupplier = useCallback((id: string) => {
    const target = suppliers.find((s) => s.id === id);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    if (target) logActivity('supplier_delete', `حذف مورد: ${target.name}`, { refId: id });
  }, [suppliers, logActivity]);

  const addWarehouse = useCallback((data: Omit<Warehouse, 'id' | 'createdAt'>) => {
    const w: Warehouse = { ...data, id: generateId(), createdAt: Date.now() };
    setWarehouses((prev) => {
      if (w.isDefault) return [w, ...prev.map((x) => ({ ...x, isDefault: false }))];
      return [w, ...prev];
    });
    logActivity('warehouse_add', `إضافة ${w.type === 'main' ? 'مخزن' : 'معرض'}: ${w.name}`, { refId: w.id });
  }, [logActivity]);

  const updateWarehouse = useCallback((id: string, data: Partial<Warehouse>) => {
    setWarehouses((prev) => {
      const next = prev.map((w) => (w.id === id ? { ...w, ...data } : w));
      if (data.isDefault) return next.map((w) => ({ ...w, isDefault: w.id === id }));
      return next;
    });
    logActivity('warehouse_edit', `تعديل موقع: ${id}`, { refId: id });
  }, [logActivity]);

  const deleteWarehouse = useCallback((id: string) => {
    const w = warehouses.find((x) => x.id === id);
    if (!w) return { ok: false, message: 'الموقع غير موجود' };
    const hasStock = stocks.some((s) => s.warehouseId === id && s.quantity > 0);
    if (hasStock) return { ok: false, message: 'لا يمكن حذف الموقع لأنه يحتوي على بضاعة' };
    setStocks((prev) => prev.filter((s) => s.warehouseId !== id));
    setWarehouses((prev) => prev.filter((x) => x.id !== id));
    logActivity('warehouse_delete', `حذف موقع: ${w.name}`, { refId: id });
    return { ok: true };
  }, [warehouses, stocks, logActivity]);

  const createSale: StoreContextType['createSale'] = useCallback((input) => {
    if (!input.items.length) return { sale: null, error: 'لا توجد منتجات' };
    for (const item of input.items) {
      const have = stocks.filter((s) => s.productId === item.productId && s.warehouseId === input.warehouseId).reduce((sum, s) => sum + s.quantity, 0);
      if (have < item.quantity) return { sale: null, error: `الكمية المتاحة من "${item.name}" أقل من المطلوب` };
    }
    const subtotal = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = Math.max(0, subtotal - (input.discount || 0));
    const wh = warehouses.find((w) => w.id === input.warehouseId);
    const newCounter = invoiceCounter + 1;
    const sale: Sale = {
      id: generateId(), invoiceNo: newCounter, customerId: input.customerId,
      customerName: input.customerName || 'عميل نقدي', warehouseId: input.warehouseId,
      warehouseName: wh?.name || '—', items: input.items, subtotal, discount: input.discount || 0,
      total, paid: input.paid >= 0 ? input.paid : total, date: Date.now(),
      userId: user?.id || 'system', userName: user?.name || 'النظام', hasReturn: false, notes: input.notes || '',
    };
    let newStocks = [...stocks];
    for (const item of input.items) newStocks = adjustStockList(newStocks, item.productId, input.warehouseId, -item.quantity);
    setStocks(newStocks);
    setProducts((prev) => syncProductQuantities(prev, newStocks));
    setSales((prev) => [sale, ...prev]);
    setInvoiceCounter(newCounter);
    if (input.customerId && sale.paid < sale.total) {
      setCustomers((prev) => prev.map((c) => c.id === input.customerId ? { ...c, debt: c.debt + (sale.total - sale.paid) } : c));
    }
    logActivity('sale', `بيع #${sale.invoiceNo} بقيمة ${total}`, { amount: total, refId: sale.id });
    return { sale };
  }, [stocks, warehouses, invoiceCounter, user, logActivity]);

  const deleteSale = useCallback((id: string) => {
    setSales((prev) => {
      const sale = prev.find((s) => s.id === id);
      if (sale) {
        let newStocks = stocks;
        for (const item of sale.items) newStocks = adjustStockList(newStocks, item.productId, sale.warehouseId, item.quantity);
        setStocks(newStocks);
        setProducts((p) => syncProductQuantities(p, newStocks));
        if (sale.customerId && sale.paid < sale.total) {
          setCustomers((cs) => cs.map((c) => c.id === sale.customerId ? { ...c, debt: Math.max(0, c.debt - (sale.total - sale.paid)) } : c));
        }
        logActivity('sale_delete', `حذف فاتورة #${sale.invoiceNo}`, { amount: sale.total, refId: sale.id });
      }
      return prev.filter((s) => s.id !== id);
    });
  }, [stocks, logActivity]);

  const createPurchase: StoreContextType['createPurchase'] = useCallback((input) => {
    if (!input.items.length) return { purchase: null, error: 'لا توجد منتجات' };
    const wh = warehouses.find((w) => w.id === input.warehouseId);
    if (!wh || wh.type !== 'main') return { purchase: null, error: 'يجب اختيار مخزن رئيسي للشراء' };
    const total = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const newCounter = purchaseCounter + 1;
    const purchase: Purchase = {
      id: generateId(), purchaseNo: newCounter, supplierId: input.supplierId, supplierName: input.supplierName,
      warehouseId: input.warehouseId, warehouseName: wh.name, items: input.items, total, date: Date.now(),
      userId: user?.id || 'system', userName: user?.name || 'النظام', hasReturn: false, notes: input.notes || '',
    };
    let newStocks = [...stocks];
    for (const item of input.items) newStocks = adjustStockList(newStocks, item.productId, input.warehouseId, item.quantity);
    setStocks(newStocks);
    setProducts((prev) => syncProductQuantities(prev.map((p) => {
      const item = input.items.find((it) => it.productId === p.id);
      if (!item) return p;
      return { ...p, purchasePrice: item.price > 0 ? item.price : p.purchasePrice };
    }), newStocks));
    setPurchases((prev) => [purchase, ...prev]);
    setPurchaseCounter(newCounter);
    logActivity('purchase', `شراء من ${purchase.supplierName} بقيمة ${total}`, { amount: total, refId: purchase.id });
    return { purchase };
  }, [stocks, warehouses, purchaseCounter, user, logActivity]);

  const deletePurchase = useCallback((id: string) => {
    setPurchases((prev) => {
      const purchase = prev.find((p) => p.id === id);
      if (purchase) {
        let newStocks = stocks;
        for (const item of purchase.items) newStocks = adjustStockList(newStocks, item.productId, purchase.warehouseId, -item.quantity);
        setStocks(newStocks);
        setProducts((p) => syncProductQuantities(p, newStocks));
        logActivity('purchase_delete', `حذف عملية شراء #${purchase.purchaseNo}`, { amount: purchase.total, refId: purchase.id });
      }
      return prev.filter((p) => p.id !== id);
    });
  }, [stocks, logActivity]);

  const createTransfer: StoreContextType['createTransfer'] = useCallback((input) => {
    if (!input.items.length) return { transfer: null, error: 'لا توجد منتجات للتحويل' };
    if (input.fromWarehouseId === input.toWarehouseId) return { transfer: null, error: 'المخزن المصدر والوجهة متشابهان' };
    for (const item of input.items) {
      const have = stocks.filter((s) => s.productId === item.productId && s.warehouseId === input.fromWarehouseId).reduce((sum, s) => sum + s.quantity, 0);
      if (have < item.quantity) return { transfer: null, error: `الكمية المتاحة من "${item.name}" أقل من المطلوب` };
    }
    const fromW = warehouses.find((w) => w.id === input.fromWarehouseId);
    const toW = warehouses.find((w) => w.id === input.toWarehouseId);
    if (!fromW || !toW) return { transfer: null, error: 'موقع غير صحيح' };
    const newCounter = transferCounter + 1;
    const transfer: Transfer = {
      id: generateId(), transferNo: newCounter, fromWarehouseId: input.fromWarehouseId, fromWarehouseName: fromW.name,
      toWarehouseId: input.toWarehouseId, toWarehouseName: toW.name, items: input.items, notes: input.notes || '',
      date: Date.now(), userId: user?.id || 'system', userName: user?.name || 'النظام',
    };
    let newStocks = [...stocks];
    for (const item of input.items) {
      newStocks = adjustStockList(newStocks, item.productId, input.fromWarehouseId, -item.quantity);
      newStocks = adjustStockList(newStocks, item.productId, input.toWarehouseId, item.quantity);
    }
    setStocks(newStocks);
    setProducts((prev) => syncProductQuantities(prev, newStocks));
    setTransfers((prev) => [transfer, ...prev]);
    setTransferCounter(newCounter);
    logActivity('transfer', `تحويل #${transfer.transferNo} من ${fromW.name} إلى ${toW.name}`, { refId: transfer.id });
    return { transfer };
  }, [stocks, warehouses, transferCounter, user, logActivity]);

  const deleteTransfer = useCallback((id: string) => {
    setTransfers((prev) => {
      const t = prev.find((x) => x.id === id);
      if (t) {
        let newStocks = stocks;
        for (const item of t.items) {
          newStocks = adjustStockList(newStocks, item.productId, t.toWarehouseId, -item.quantity);
          newStocks = adjustStockList(newStocks, item.productId, t.fromWarehouseId, item.quantity);
        }
        setStocks(newStocks);
        setProducts((p) => syncProductQuantities(p, newStocks));
        logActivity('transfer_delete', `حذف تحويل #${t.transferNo}`, { refId: t.id });
      }
      return prev.filter((x) => x.id !== id);
    });
  }, [stocks, logActivity]);

  const createSaleReturn: StoreContextType['createSaleReturn'] = useCallback((input) => {
    if (!input.items.length) return { ret: null, error: 'لا توجد منتجات' };
    const wh = warehouses.find((w) => w.id === input.warehouseId);
    const total = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const linkedSale = input.saleId ? sales.find((s) => s.id === input.saleId) : null;
    const newCounter = saleReturnCounter + 1;
    const ret: SaleReturn = {
      id: generateId(), returnNo: newCounter, saleId: input.saleId, invoiceNo: linkedSale?.invoiceNo || null,
      customerId: input.customerId, customerName: input.customerName, warehouseId: input.warehouseId,
      warehouseName: wh?.name || '—', items: input.items, reason: input.reason || '', total, date: Date.now(),
      userId: user?.id || 'system', userName: user?.name || 'النظام',
    };
    let newStocks = [...stocks];
    for (const item of input.items) newStocks = adjustStockList(newStocks, item.productId, input.warehouseId, item.quantity);
    setStocks(newStocks);
    setProducts((prev) => syncProductQuantities(prev, newStocks));
    setSaleReturns((prev) => [ret, ...prev]);
    setSaleReturnCounter(newCounter);
    if (input.saleId) setSales((prev) => prev.map((s) => s.id === input.saleId ? { ...s, hasReturn: true } : s));
    logActivity('sale_return', `مرتجع بيع #${ret.returnNo} بقيمة ${total}`, { amount: total, refId: ret.id });
    return { ret };
  }, [warehouses, stocks, sales, saleReturnCounter, user, logActivity]);

  const deleteSaleReturn = useCallback((id: string) => {
    setSaleReturns((prev) => {
      const ret = prev.find((r) => r.id === id);
      if (ret) {
        let newStocks = stocks;
        for (const item of ret.items) newStocks = adjustStockList(newStocks, item.productId, ret.warehouseId, -item.quantity);
        setStocks(newStocks);
        setProducts((p) => syncProductQuantities(p, newStocks));
      }
      return prev.filter((r) => r.id !== id);
    });
  }, [stocks]);

  const createPurchaseReturn: StoreContextType['createPurchaseReturn'] = useCallback((input) => {
    if (!input.items.length) return { ret: null, error: 'لا توجد منتجات' };
    for (const item of input.items) {
      const have = stocks.filter((s) => s.productId === item.productId && s.warehouseId === input.warehouseId).reduce((sum, s) => sum + s.quantity, 0);
      if (have < item.quantity) return { ret: null, error: `الكمية المتاحة من "${item.name}" أقل من المطلوب` };
    }
    const wh = warehouses.find((w) => w.id === input.warehouseId);
    const total = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const linkedPurchase = input.purchaseId ? purchases.find((p) => p.id === input.purchaseId) : null;
    const newCounter = purchaseReturnCounter + 1;
    const ret: PurchaseReturn = {
      id: generateId(), returnNo: newCounter, purchaseId: input.purchaseId, purchaseNo: linkedPurchase?.purchaseNo || null,
      supplierId: input.supplierId, supplierName: input.supplierName, warehouseId: input.warehouseId,
      warehouseName: wh?.name || '—', items: input.items, reason: input.reason || '', total, date: Date.now(),
      userId: user?.id || 'system', userName: user?.name || 'النظام',
    };
    let newStocks = [...stocks];
    for (const item of input.items) newStocks = adjustStockList(newStocks, item.productId, input.warehouseId, -item.quantity);
    setStocks(newStocks);
    setProducts((prev) => syncProductQuantities(prev, newStocks));
    setPurchaseReturns((prev) => [ret, ...prev]);
    setPurchaseReturnCounter(newCounter);
    if (input.purchaseId) setPurchases((prev) => prev.map((p) => p.id === input.purchaseId ? { ...p, hasReturn: true } : p));
    logActivity('purchase_return', `مرتجع شراء #${ret.returnNo} بقيمة ${total}`, { amount: total, refId: ret.id });
    return { ret };
  }, [stocks, warehouses, purchases, purchaseReturnCounter, user, logActivity]);

  const deletePurchaseReturn = useCallback((id: string) => {
    setPurchaseReturns((prev) => {
      const ret = prev.find((r) => r.id === id);
      if (ret) {
        let newStocks = stocks;
        for (const item of ret.items) newStocks = adjustStockList(newStocks, item.productId, ret.warehouseId, item.quantity);
        setStocks(newStocks);
        setProducts((p) => syncProductQuantities(p, newStocks));
      }
      return prev.filter((r) => r.id !== id);
    });
  }, [stocks]);

  const addExpense = useCallback<StoreContextType['addExpense']>((data) => {
    const exp: Expense = {
      id: generateId(), category: data.category, amount: data.amount, notes: data.notes,
      date: data.date || Date.now(), userId: user?.id || 'system', userName: user?.name || 'النظام',
    };
    setExpenses((prev) => [exp, ...prev]);
    logActivity('expense', `مصروف ${exp.category} بقيمة ${exp.amount}`, { amount: exp.amount, refId: exp.id });
  }, [user, logActivity]);

  const updateExpense = useCallback((id: string, data: Partial<Expense>) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)));
  }, []);

  const deleteExpense = useCallback((id: string) => {
    const target = expenses.find((e) => e.id === id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (target) logActivity('expense_delete', `حذف مصروف ${target.category}`, { refId: id });
  }, [expenses, logActivity]);

  // Customer Payments
  const addCustomerPayment: StoreContextType['addCustomerPayment'] = useCallback((data) => {
    if (!data.customerId) return { payment: null, error: 'يجب اختيار العميل' };
    if (!data.amount || data.amount <= 0) return { payment: null, error: 'المبلغ غير صحيح' };
    const newCounter = customerPaymentCounter + 1;
    const payment: CustomerPayment = {
      id: generateId(),
      customerId: data.customerId,
      customerName: data.customerName,
      amount: data.amount,
      date: data.date || Date.now(),
      notes: data.notes || '',
      userId: user?.id || 'system',
      userName: user?.name || 'النظام',
    };
    setCustomerPayments((prev) => [payment, ...prev]);
    setCustomerPaymentCounter(newCounter);
    setCustomers((prev) => prev.map((c) =>
      c.id === data.customerId ? { ...c, debt: Math.max(0, c.debt - data.amount) } : c
    ));
    logActivity('customer_payment', `دفعة من ${data.customerName} بقيمة ${data.amount}`, { amount: data.amount, refId: payment.id });
    return { payment };
  }, [customerPaymentCounter, user, logActivity]);

  const deleteCustomerPayment = useCallback((id: string) => {
    setCustomerPayments((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) {
        setCustomers((cs) => cs.map((c) =>
          c.id === target.customerId ? { ...c, debt: c.debt + target.amount } : c
        ));
        logActivity('customer_payment_delete', `حذف دفعة عميل ${target.customerName}`, { amount: target.amount, refId: id });
      }
      return prev.filter((p) => p.id !== id);
    });
  }, [logActivity]);

  // Workers
  const addWorker = useCallback<StoreContextType['addWorker']>((data) => {
    const worker: Worker = {
      ...data,
      id: generateId(),
      createdAt: Date.now(),
    };
    setWorkers((prev) => [worker, ...prev]);
    logActivity('worker_add', `إضافة عامل: ${worker.name}`, { refId: worker.id });
    return worker;
  }, [logActivity]);

  const updateWorker = useCallback((id: string, data: Partial<Worker>) => {
    setWorkers((prev) => prev.map((w) => (w.id === id ? { ...w, ...data } : w)));
    const t = workers.find((w) => w.id === id);
    logActivity('worker_edit', `تعديل عامل: ${t?.name || id}`, { refId: id });
  }, [workers, logActivity]);

  const deleteWorker = useCallback((id: string) => {
    const w = workers.find((x) => x.id === id);
    if (!w) return { ok: false, message: 'العامل غير موجود' };
    setWorkers((prev) => prev.filter((x) => x.id !== id));
    setWorkerPayments((prev) => prev.filter((p) => p.workerId !== id));
    logActivity('worker_delete', `حذف عامل: ${w.name}`, { refId: id });
    return { ok: true };
  }, [workers, logActivity]);

  const addWorkerPayment: StoreContextType['addWorkerPayment'] = useCallback((data) => {
    const w = workers.find((x) => x.id === data.workerId);
    if (!w) return { payment: null, error: 'العامل غير موجود' };
    if (!data.amount || data.amount <= 0) return { payment: null, error: 'المبلغ غير صحيح' };
    const totalPaid = workerPayments
      .filter((p) => p.workerId === data.workerId)
      .reduce((sum, p) => sum + p.amount, 0);
    if (w.maxAllowed > 0 && totalPaid + data.amount > w.maxAllowed) {
      const remaining = Math.max(0, w.maxAllowed - totalPaid);
      return { payment: null, error: `المبلغ يتجاوز الحد المسموح. المتبقي: ${remaining}` };
    }
    const newCounter = workerPaymentCounter + 1;
    const payment: WorkerPayment = {
      id: generateId(),
      workerId: data.workerId,
      workerName: w.name,
      amount: data.amount,
      date: data.date || Date.now(),
      notes: data.notes || '',
      userId: user?.id || 'system',
      userName: user?.name || 'النظام',
    };
    setWorkerPayments((prev) => [payment, ...prev]);
    setWorkerPaymentCounter(newCounter);
    logActivity('worker_payment', `قبض ${w.name} بقيمة ${data.amount}`, { amount: data.amount, refId: payment.id });
    return { payment };
  }, [workers, workerPayments, workerPaymentCounter, user, logActivity]);

  const deleteWorkerPayment = useCallback((id: string) => {
    setWorkerPayments((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) {
        logActivity('worker_payment_delete', `حذف قبض عامل ${target.workerName}`, { amount: target.amount, refId: id });
      }
      return prev.filter((p) => p.id !== id);
    });
  }, [logActivity]);

  // Notifications
  const addNotification = useCallback<StoreContextType['addNotification']>((notif) => {
    const entry: AppNotification = {
      id: generateId(),
      ...notif,
      read: false,
      date: Date.now(),
    };
    setNotifications((prev) => [entry, ...prev].slice(0, 200));
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const updateSettings = useCallback((data: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...data }));
    logActivity('settings_update', 'تحديث الإعدادات');
  }, [logActivity]);

  const resetAll = useCallback(async () => {
    await clearStorage();
    setProducts([]); setCustomers([]); setSuppliers([]); setSales([]); setPurchases([]);
    setWarehouses([]); setStocks([]); setTransfers([]); setSaleReturns([]); setPurchaseReturns([]);
    setExpenses([]); setCustomerPayments([]); setWorkers([]); setWorkerPayments([]);
    setNotifications([]); setActivityLog([]); setSettings(defaultSettings);
    setInvoiceCounter(1000); setPurchaseCounter(1000); setTransferCounter(1000);
    setSaleReturnCounter(1000); setPurchaseReturnCounter(1000);
    setCustomerPaymentCounter(1000); setWorkerPaymentCounter(1000);
  }, []);

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  return (
    <StoreContext.Provider value={{
      ready, syncing, lastCloudSyncAt,
      products, customers, suppliers, sales, purchases,
      warehouses, stocks, transfers, saleReturns, purchaseReturns, expenses,
      customerPayments, workers, workerPayments, notifications,
      activityLog, settings,
      invoiceCounter, purchaseCounter, transferCounter,
      saleReturnCounter, purchaseReturnCounter,
      customerPaymentCounter, workerPaymentCounter,
      unreadNotifications,
      getStock, getTotalStock, defaultMainWarehouseId, syncNow,
      addProduct, updateProduct, deleteProduct,
      addCustomer, updateCustomer, deleteCustomer,
      addSupplier, updateSupplier, deleteSupplier,
      addWarehouse, updateWarehouse, deleteWarehouse,
      createSale, deleteSale, createPurchase, deletePurchase,
      createTransfer, deleteTransfer,
      createSaleReturn, deleteSaleReturn, createPurchaseReturn, deletePurchaseReturn,
      addExpense, updateExpense, deleteExpense,
      addCustomerPayment, deleteCustomerPayment,
      addWorker, updateWorker, deleteWorker,
      addWorkerPayment, deleteWorkerPayment,
      addNotification, markNotificationRead, markAllNotificationsRead, deleteNotification,
      updateSettings, resetAll,
    }}>
      {children}
    </StoreContext.Provider>
  );
}
