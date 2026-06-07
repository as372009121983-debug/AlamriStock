// Powered by OnSpace.AI
export type WarehouseType = 'main' | 'showroom';

export type Warehouse = {
  id: string;
  name: string;
  type: WarehouseType;
  address: string;
  phone: string;
  isDefault: boolean;
  createdAt: number;
};

export type StockEntry = {
  productId: string;
  warehouseId: string;
  quantity: number;
};

export type ProductPrice = {
  id: string;
  label: string;
  price: number;
};

export type Product = {
  id: string;
  name: string;
  barcode: string;
  category: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  prices: ProductPrice[];
  quantity: number;
  lowStockAlert: number;
  images: string[];
  notes: string;
  createdAt: number;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  debt: number;
  category?: string;
  maxDebt?: number;
  notes?: string;
  createdAt: number;
};

export type Supplier = {
  id: string;
  name: string;
  phone: string;
  address: string;
  category?: string;
  maxDebt?: number;
  notes?: string;
  createdAt: number;
};

export type SaleItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  purchasePrice: number;
  priceLabel: string;
};

export type Sale = {
  id: string;
  invoiceNo: number;
  customerId: string | null;
  customerName: string;
  warehouseId: string;
  warehouseName: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  date: number;
  userId: string;
  userName: string;
  hasReturn: boolean;
  notes: string;
};

export type PurchaseItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
};

export type Purchase = {
  id: string;
  purchaseNo: number;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  items: PurchaseItem[];
  total: number;
  date: number;
  userId: string;
  userName: string;
  hasReturn: boolean;
  notes: string;
};

export type TransferItem = {
  productId: string;
  name: string;
  quantity: number;
};

export type Transfer = {
  id: string;
  transferNo: number;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  items: TransferItem[];
  notes: string;
  date: number;
  userId: string;
  userName: string;
};

export type ReturnItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  purchasePrice: number;
};

export type SaleReturn = {
  id: string;
  returnNo: number;
  saleId: string | null;
  invoiceNo: number | null;
  customerId: string | null;
  customerName: string;
  warehouseId: string;
  warehouseName: string;
  items: ReturnItem[];
  reason: string;
  total: number;
  date: number;
  userId: string;
  userName: string;
};

export type PurchaseReturn = {
  id: string;
  returnNo: number;
  purchaseId: string | null;
  purchaseNo: number | null;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  items: ReturnItem[];
  reason: string;
  total: number;
  date: number;
  userId: string;
  userName: string;
};

export type Expense = {
  id: string;
  category: string;
  amount: number;
  notes: string;
  date: number;
  userId: string;
  userName: string;
};

export type CustomerPayment = {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: number;
  notes: string;
  userId: string;
  userName: string;
};

export type Worker = {
  id: string;
  name: string;
  phone: string;
  jobTitle: string;
  maxAllowed: number;
  notes: string;
  createdAt: number;
};

export type WorkerPayment = {
  id: string;
  workerId: string;
  workerName: string;
  amount: number;
  date: number;
  notes: string;
  userId: string;
  userName: string;
};

export type WorkerAdvanceType = 'advance' | 'repayment';

export type WorkerAdvance = {
  id: string;
  workerId: string;
  workerName: string;
  type: WorkerAdvanceType;
  amount: number;
  date: number;
  notes: string;
  userId: string;
  userName: string;
};

export type AppNotification = {
  id: string;
  type: 'join_request' | 'user_approved' | 'system' | 'low_stock';
  title: string;
  message: string;
  refId?: string;
  read: boolean;
  date: number;
};

export type UserStatus = 'pending' | 'approved' | 'rejected';

export type UserRole = 'owner' | 'manager' | 'head' | 'sales' | 'warehouse';

export type Permission = {
  canManageUsers: boolean;
  canManageSettings: boolean;
  canEditProducts: boolean;
  canDeleteProducts: boolean;
  canEditSales: boolean;
  canEditPurchases: boolean;
  canEditCustomers: boolean;
  canEditSuppliers: boolean;
  canEditWarehouses: boolean;
  canEditTransfers: boolean;
  canEditReturns: boolean;
  canEditExpenses: boolean;
  canViewReports: boolean;
  canPrint: boolean;
  canDelete: boolean;
};

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'المالك',
  manager: 'مدير',
  head: 'رئيس',
  sales: 'موظف مبيعات',
  warehouse: 'أمين مخزن',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  owner: 'صلاحيات كاملة على كل شيء بما في ذلك إدارة المستخدمين',
  manager: 'إدارة كاملة للنظام عدا إدارة المستخدمين',
  head: 'مشاهدة فقط لجميع البيانات والتقارير',
  sales: 'إنشاء فواتير البيع وإدارة العملاء والمرتجعات',
  warehouse: 'إدارة المخزون والمشتريات والتحويلات',
};

export const ROLE_COLORS: Record<UserRole, { bg: string; fg: string }> = {
  owner: { bg: '#CCFBF1', fg: '#0F766E' },
  manager: { bg: '#DBEAFE', fg: '#1E40AF' },
  head: { bg: '#FEF3C7', fg: '#92400E' },
  sales: { bg: '#D1FAE5', fg: '#065F46' },
  warehouse: { bg: '#FEE2E2', fg: '#991B1B' },
};

export const STATUS_LABELS: Record<UserStatus, string> = {
  pending: 'قيد المراجعة',
  approved: 'مقبول',
  rejected: 'مرفوض',
};

export const STATUS_COLORS: Record<UserStatus, { bg: string; fg: string }> = {
  pending: { bg: '#FEF3C7', fg: '#92400E' },
  approved: { bg: '#D1FAE5', fg: '#065F46' },
  rejected: { bg: '#FEE2E2', fg: '#991B1B' },
};

export function getPermissions(role: UserRole): Permission {
  switch (role) {
    case 'owner':
      return {
        canManageUsers: true, canManageSettings: true, canEditProducts: true, canDeleteProducts: true,
        canEditSales: true, canEditPurchases: true, canEditCustomers: true, canEditSuppliers: true,
        canEditWarehouses: true, canEditTransfers: true, canEditReturns: true, canEditExpenses: true,
        canViewReports: true, canPrint: true, canDelete: true,
      };
    case 'manager':
      return {
        canManageUsers: false, canManageSettings: true, canEditProducts: true, canDeleteProducts: true,
        canEditSales: true, canEditPurchases: true, canEditCustomers: true, canEditSuppliers: true,
        canEditWarehouses: true, canEditTransfers: true, canEditReturns: true, canEditExpenses: true,
        canViewReports: true, canPrint: true, canDelete: true,
      };
    case 'head':
      return {
        canManageUsers: false, canManageSettings: false, canEditProducts: false, canDeleteProducts: false,
        canEditSales: false, canEditPurchases: false, canEditCustomers: false, canEditSuppliers: false,
        canEditWarehouses: false, canEditTransfers: false, canEditReturns: false, canEditExpenses: false,
        canViewReports: true, canPrint: true, canDelete: false,
      };
    case 'sales':
      return {
        canManageUsers: false, canManageSettings: false, canEditProducts: false, canDeleteProducts: false,
        canEditSales: true, canEditPurchases: false, canEditCustomers: true, canEditSuppliers: false,
        canEditWarehouses: false, canEditTransfers: false, canEditReturns: true, canEditExpenses: false,
        canViewReports: false, canPrint: true, canDelete: false,
      };
    case 'warehouse':
      return {
        canManageUsers: false, canManageSettings: false, canEditProducts: true, canDeleteProducts: false,
        canEditSales: false, canEditPurchases: true, canEditCustomers: false, canEditSuppliers: true,
        canEditWarehouses: true, canEditTransfers: true, canEditReturns: false, canEditExpenses: false,
        canViewReports: false, canPrint: true, canDelete: false,
      };
  }
}

export type AppUser = {
  id: string;
  ownerId?: string;
  email: string;
  username: string;
  password: string;
  name: string;
  phone?: string;
  role: UserRole;
  active: boolean;
  status: UserStatus;
  createdAt: number;
  approvedAt?: number;
};

export type ActivityType =
  | 'login' | 'logout' | 'sale' | 'sale_delete' | 'purchase' | 'purchase_delete'
  | 'transfer' | 'transfer_delete' | 'sale_return' | 'purchase_return'
  | 'expense' | 'expense_delete' | 'product_add' | 'product_edit' | 'product_delete'
  | 'customer_add' | 'customer_edit' | 'customer_delete' | 'customer_payment' | 'customer_payment_delete'
  | 'supplier_add' | 'supplier_edit' | 'supplier_delete'
  | 'warehouse_add' | 'warehouse_edit' | 'warehouse_delete'
  | 'worker_add' | 'worker_edit' | 'worker_delete' | 'worker_payment' | 'worker_payment_delete'
  | 'worker_advance' | 'worker_advance_delete' | 'worker_repayment' | 'worker_repayment_delete'
  | 'user_add' | 'user_edit' | 'user_delete' | 'user_approve' | 'user_reject'
  | 'settings_update';

export type ActivityLog = {
  id: string;
  type: ActivityType;
  description: string;
  amount?: number;
  refId?: string;
  userId: string;
  userName: string;
  date: number;
};

export type Settings = {
  companyName: string;
  appTitle: string;
  ownerName: string;
  logo: string;
  currency: string;
  phone: string;
  address: string;
  taxNumber: string;
  invoiceFooter: string;
  adminPassword: string;
  adminPasswordEnabled?: boolean;
  soundEnabled?: boolean;
  voiceEnabled?: boolean;
  aiEnabled?: boolean;
};
