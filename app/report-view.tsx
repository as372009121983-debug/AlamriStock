// Powered by OnSpace.AI
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/hooks/useStore';
import { useAlert } from '@/template';
import { SearchBar } from '@/components/ui/SearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { formatCurrency, formatNumber } from '@/services/format';
import { performPrint } from '@/services/print';

type ReportType =
  | 'sales-detailed' | 'sales-summary' | 'sales-by-category' | 'unpaid-invoices'
  | 'profits-detailed' | 'profits-summary' | 'profits-invoices'
  | 'customers-debt' | 'customers-products' | 'customers-statement' | 'customers-total-sales'
  | 'purchases-detailed' | 'purchases-summary' | 'purchases-by-category' | 'purchases-unpaid'
  | 'suppliers-debt' | 'suppliers-products' | 'suppliers-statement' | 'suppliers-total-purchases'
  | 'inventory-detailed' | 'inventory-summary' | 'low-stock-detailed' | 'low-stock-summary'
  | 'expenses-report';

type Period = 'today' | 'yesterday' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'اليوم',
  yesterday: 'امس',
  thisMonth: 'الشهر الحالي',
  lastMonth: 'الشهر الماضي',
  thisYear: 'العام الحالي',
  all: 'كل الفترات',
};

function periodRange(p: Period): { from: number; to: number } {
  const now = new Date();
  if (p === 'all') return { from: 0, to: Number.MAX_SAFE_INTEGER };
  if (p === 'today') {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    return { from: start.getTime(), to: now.getTime() };
  }
  if (p === 'yesterday') {
    const start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setHours(23, 59, 59, 999);
    return { from: start.getTime(), to: end.getTime() };
  }
  if (p === 'thisMonth') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: start.getTime(), to: now.getTime() };
  }
  if (p === 'lastMonth') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { from: start.getTime(), to: end.getTime() };
  }
  const start = new Date(now.getFullYear(), 0, 1);
  return { from: start.getTime(), to: now.getTime() };
}

const TITLES: Record<ReportType, string> = {
  'sales-detailed': 'تقرير مبيعات مفصل',
  'sales-summary': 'تقرير مبيعات مجمل',
  'sales-by-category': 'تقرير مبيعات بالتصنيف',
  'unpaid-invoices': 'تقرير الفواتير الغير مسددة',
  'profits-detailed': 'تقرير ارباح مفصل',
  'profits-summary': 'تقرير ارباح مجمل',
  'profits-invoices': 'تقرير ارباح الفواتير',
  'customers-debt': 'تقرير مديونية العملاء',
  'customers-products': 'تقرير المنتجات المباعة لعميل',
  'customers-statement': 'تقرير كشف حساب عميل',
  'customers-total-sales': 'تقرير اجمالي مبيعات العملاء',
  'purchases-detailed': 'تقرير مشتريات مفصل',
  'purchases-summary': 'تقرير مشتريات مجمل',
  'purchases-by-category': 'تقرير مشتريات بالتصنيف',
  'purchases-unpaid': 'تقرير الفواتير الغير مسددة',
  'suppliers-debt': 'تقرير مديونية الموردين',
  'suppliers-products': 'تقرير المنتجات المباعة لمورد',
  'suppliers-statement': 'تقرير كشف حساب مورد',
  'suppliers-total-purchases': 'تقرير اجمالي مشتريات الموردين',
  'inventory-detailed': 'جرد مفصل',
  'inventory-summary': 'جرد مجمل',
  'low-stock-detailed': 'تقرير المنتجات منخفضة الكمية مفصل',
  'low-stock-summary': 'تقرير المنتجات منخفضة الكمية مجمل',
  'expenses-report': 'تقرير المصروفات',
};

type Row = {
  key: string;
  c1: string;
  c2: string;
  c3?: string;
  c4?: string;
};

export default function ReportViewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const type = (params.type || 'sales-detailed') as ReportType;
  const { sales, purchases, products, customers, suppliers, expenses, settings } = useStore();
  const { showAlert } = useAlert();

  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<Period>('today');
  const [periodPickerVisible, setPeriodPickerVisible] = useState(false);
  const [filterEntityId, setFilterEntityId] = useState<string>('');
  const [filterPickerVisible, setFilterPickerVisible] = useState(false);

  const range = periodRange(period);

  const showsEntityFilter = useMemo(() => {
    return [
      'sales-detailed', 'sales-summary', 'unpaid-invoices',
      'customers-products', 'customers-statement',
      'suppliers-products', 'suppliers-statement',
      'purchases-detailed', 'purchases-summary', 'purchases-unpaid',
    ].includes(type);
  }, [type]);

  const entityType: 'customer' | 'supplier' = useMemo(() => {
    return type.startsWith('supplier') || type.startsWith('purchases') ? 'supplier' : 'customer';
  }, [type]);

  const config = useMemo(() => getConfig(type), [type]);

  const { rows, totals, footerLabel } = useMemo(() => {
    const inRange = (d: number) => d >= range.from && d <= range.to;
    const matchSearch = (s: string) => !search.trim() || s.toLowerCase().includes(search.trim().toLowerCase());

    let rows: Row[] = [];
    let totals = 0;
    let footerLabel = 'الإجمالي';

    if (type === 'sales-detailed') {
      const filtered = sales.filter((s) => inRange(s.date) && (!filterEntityId || s.customerId === filterEntityId));
      const map = new Map<string, { name: string; qty: number; amount: number; price: number }>();
      filtered.forEach((sale) => {
        sale.items.forEach((it) => {
          const cur = map.get(it.productId) || { name: it.productName, qty: 0, amount: 0, price: it.salePrice };
          cur.qty += it.quantity;
          cur.amount += it.salePrice * it.quantity;
          cur.price = it.salePrice;
          map.set(it.productId, cur);
        });
      });
      rows = Array.from(map.entries())
        .filter(([, v]) => matchSearch(v.name))
        .map(([id, v]) => ({
          key: id,
          c1: v.name,
          c2: formatNumber(v.qty),
          c3: formatNumber(v.price),
        }));
      totals = filtered.reduce((s, x) => s + x.total, 0);
      footerLabel = 'اجمالي المبيعات';
    } else if (type === 'sales-summary') {
      const filtered = sales.filter((s) => inRange(s.date) && (!filterEntityId || s.customerId === filterEntityId));
      const map = new Map<string, { name: string; qty: number; amount: number }>();
      filtered.forEach((sale) => {
        sale.items.forEach((it) => {
          const cur = map.get(it.productId) || { name: it.productName, qty: 0, amount: 0 };
          cur.qty += it.quantity;
          cur.amount += it.salePrice * it.quantity;
          map.set(it.productId, cur);
        });
      });
      rows = Array.from(map.entries())
        .filter(([, v]) => matchSearch(v.name))
        .map(([id, v]) => ({ key: id, c1: v.name, c2: formatNumber(v.qty) }));
      totals = filtered.reduce((s, x) => s + x.total, 0);
      footerLabel = 'اجمالي المبيعات';
    } else if (type === 'sales-by-category') {
      const filtered = sales.filter((s) => inRange(s.date));
      const map = new Map<string, number>();
      filtered.forEach((sale) => {
        sale.items.forEach((it) => {
          const product = products.find((p) => p.id === it.productId);
          const cat = product?.category || 'بدون تصنيف';
          map.set(cat, (map.get(cat) || 0) + it.salePrice * it.quantity);
        });
      });
      rows = Array.from(map.entries())
        .filter(([cat]) => matchSearch(cat))
        .map(([cat, amount]) => ({
          key: cat,
          c1: cat,
          c2: formatCurrency(amount, settings.currency),
        }));
      totals = Array.from(map.values()).reduce((s, v) => s + v, 0);
      footerLabel = 'اجمالي المبيعات';
    } else if (type === 'unpaid-invoices') {
      const filtered = sales.filter(
        (s) => inRange(s.date) && (s.paid || 0) < s.total && (!filterEntityId || s.customerId === filterEntityId)
      );
      rows = filtered
        .filter((s) => matchSearch(s.customerName))
        .map((s) => ({
          key: s.id,
          c1: s.customerName,
          c2: formatNumber(s.total),
          c3: formatNumber(s.paid || 0),
        }));
      totals = filtered.reduce((sum, s) => sum + (s.total - (s.paid || 0)), 0);
      footerLabel = 'المبلغ المتبقي';
    } else if (type === 'profits-detailed' || type === 'profits-summary') {
      const filtered = sales.filter((s) => inRange(s.date));
      const map = new Map<string, { name: string; qty: number; profit: number }>();
      filtered.forEach((sale) => {
        sale.items.forEach((it) => {
          const profit = (it.salePrice - it.purchasePrice) * it.quantity;
          const cur = map.get(it.productId) || { name: it.productName, qty: 0, profit: 0 };
          cur.qty += it.quantity;
          cur.profit += profit;
          map.set(it.productId, cur);
        });
      });
      rows = Array.from(map.entries())
        .filter(([, v]) => matchSearch(v.name))
        .map(([id, v]) =>
          type === 'profits-detailed'
            ? { key: id, c1: v.name, c2: formatNumber(v.qty), c3: formatCurrency(v.profit, settings.currency) }
            : { key: id, c1: v.name, c2: formatCurrency(v.profit, settings.currency) }
        );
      totals = Array.from(map.values()).reduce((s, v) => s + v.profit, 0);
      footerLabel = 'اجمالي الارباح';
    } else if (type === 'profits-invoices') {
      const filtered = sales.filter((s) => inRange(s.date));
      rows = filtered
        .filter((s) => matchSearch(s.customerName) || matchSearch(String(s.invoiceNo)))
        .map((s) => {
          const cost = s.items.reduce((c, it) => c + it.purchasePrice * it.quantity, 0);
          return {
            key: s.id,
            c1: `#${s.invoiceNo} - ${s.customerName}`,
            c2: formatCurrency(s.total - cost, settings.currency),
          };
        });
      totals = filtered.reduce((sum, s) => {
        const cost = s.items.reduce((c, it) => c + it.purchasePrice * it.quantity, 0);
        return sum + (s.total - cost);
      }, 0);
      footerLabel = 'اجمالي الارباح';
    } else if (type === 'customers-debt') {
      rows = customers
        .filter((c) => matchSearch(c.name) && (c.debt || 0) !== 0)
        .map((c) => ({
          key: c.id,
          c1: c.name,
          c2: formatCurrency(c.debt || 0, settings.currency),
        }));
      totals = customers.reduce((s, c) => s + (c.debt || 0), 0);
      footerLabel = 'اجمالي المديونية';
    } else if (type === 'customers-products') {
      const filtered = sales.filter((s) => inRange(s.date) && (!filterEntityId || s.customerId === filterEntityId));
      const map = new Map<string, { name: string; qty: number; amount: number }>();
      filtered.forEach((sale) => {
        sale.items.forEach((it) => {
          const cur = map.get(it.productId) || { name: it.productName, qty: 0, amount: 0 };
          cur.qty += it.quantity;
          cur.amount += it.salePrice * it.quantity;
          map.set(it.productId, cur);
        });
      });
      rows = Array.from(map.entries())
        .filter(([, v]) => matchSearch(v.name))
        .map(([id, v]) => ({
          key: id,
          c1: v.name,
          c2: formatNumber(v.qty),
          c3: formatCurrency(v.amount, settings.currency),
        }));
      totals = Array.from(map.values()).reduce((s, v) => s + v.amount, 0);
      footerLabel = 'اجمالي المبيعات';
    } else if (type === 'customers-statement') {
      const filtered = sales.filter((s) => inRange(s.date) && (!filterEntityId || s.customerId === filterEntityId));
      rows = filtered
        .filter((s) => matchSearch(s.customerName) || matchSearch(String(s.invoiceNo)))
        .map((s) => ({
          key: s.id,
          c1: `#${s.invoiceNo} - ${s.customerName}`,
          c2: formatNumber(s.total),
          c3: formatNumber(s.paid || 0),
        }));
      totals = filtered.reduce((sum, s) => sum + s.total, 0);
      footerLabel = 'اجمالي الفواتير';
    } else if (type === 'customers-total-sales') {
      const filtered = sales.filter((s) => inRange(s.date));
      const map = new Map<string, { name: string; total: number }>();
      filtered.forEach((s) => {
        const cur = map.get(s.customerId) || { name: s.customerName, total: 0 };
        cur.total += s.total;
        map.set(s.customerId, cur);
      });
      rows = Array.from(map.entries())
        .filter(([, v]) => matchSearch(v.name))
        .map(([id, v]) => ({
          key: id,
          c1: v.name,
          c2: formatCurrency(v.total, settings.currency),
        }));
      totals = Array.from(map.values()).reduce((s, v) => s + v.total, 0);
      footerLabel = 'اجمالي المبيعات';
    } else if (type === 'purchases-detailed') {
      const filtered = purchases.filter((p) => inRange(p.date) && (!filterEntityId || p.supplierId === filterEntityId));
      const map = new Map<string, { name: string; qty: number; price: number }>();
      filtered.forEach((purchase) => {
        purchase.items.forEach((it) => {
          const cur = map.get(it.productId) || { name: it.productName, qty: 0, price: it.purchasePrice };
          cur.qty += it.quantity;
          cur.price = it.purchasePrice;
          map.set(it.productId, cur);
        });
      });
      rows = Array.from(map.entries())
        .filter(([, v]) => matchSearch(v.name))
        .map(([id, v]) => ({
          key: id,
          c1: v.name,
          c2: formatNumber(v.qty),
          c3: formatNumber(v.price),
        }));
      totals = filtered.reduce((s, x) => s + x.total, 0);
      footerLabel = 'اجمالي المشتريات';
    } else if (type === 'purchases-summary') {
      const filtered = purchases.filter((p) => inRange(p.date) && (!filterEntityId || p.supplierId === filterEntityId));
      const map = new Map<string, { name: string; qty: number }>();
      filtered.forEach((purchase) => {
        purchase.items.forEach((it) => {
          const cur = map.get(it.productId) || { name: it.productName, qty: 0 };
          cur.qty += it.quantity;
          map.set(it.productId, cur);
        });
      });
      rows = Array.from(map.entries())
        .filter(([, v]) => matchSearch(v.name))
        .map(([id, v]) => ({ key: id, c1: v.name, c2: formatNumber(v.qty) }));
      totals = filtered.reduce((s, x) => s + x.total, 0);
      footerLabel = 'اجمالي المشتريات';
    } else if (type === 'purchases-by-category') {
      const filtered = purchases.filter((p) => inRange(p.date));
      const map = new Map<string, number>();
      filtered.forEach((purchase) => {
        purchase.items.forEach((it) => {
          const product = products.find((p) => p.id === it.productId);
          const cat = product?.category || 'بدون تصنيف';
          map.set(cat, (map.get(cat) || 0) + it.purchasePrice * it.quantity);
        });
      });
      rows = Array.from(map.entries())
        .filter(([cat]) => matchSearch(cat))
        .map(([cat, amount]) => ({
          key: cat,
          c1: cat,
          c2: formatCurrency(amount, settings.currency),
        }));
      totals = Array.from(map.values()).reduce((s, v) => s + v, 0);
      footerLabel = 'اجمالي المشتريات';
    } else if (type === 'purchases-unpaid') {
      const filtered = purchases.filter(
        (p) => inRange(p.date) && (p.paid || 0) < p.total && (!filterEntityId || p.supplierId === filterEntityId)
      );
      rows = filtered
        .filter((p) => matchSearch(p.supplierName))
        .map((p) => ({
          key: p.id,
          c1: p.supplierName,
          c2: formatNumber(p.total),
          c3: formatNumber(p.paid || 0),
        }));
      totals = filtered.reduce((sum, p) => sum + (p.total - (p.paid || 0)), 0);
      footerLabel = 'المبلغ المتبقي';
    } else if (type === 'suppliers-debt') {
      rows = suppliers
        .filter((s) => matchSearch(s.name) && (s.debt || 0) !== 0)
        .map((s) => ({
          key: s.id,
          c1: s.name,
          c2: formatCurrency(s.debt || 0, settings.currency),
        }));
      totals = suppliers.reduce((s, sup) => s + (sup.debt || 0), 0);
      footerLabel = 'اجمالي المديونية';
    } else if (type === 'suppliers-products') {
      const filtered = purchases.filter((p) => inRange(p.date) && (!filterEntityId || p.supplierId === filterEntityId));
      const map = new Map<string, { name: string; qty: number; amount: number }>();
      filtered.forEach((purchase) => {
        purchase.items.forEach((it) => {
          const cur = map.get(it.productId) || { name: it.productName, qty: 0, amount: 0 };
          cur.qty += it.quantity;
          cur.amount += it.purchasePrice * it.quantity;
          map.set(it.productId, cur);
        });
      });
      rows = Array.from(map.entries())
        .filter(([, v]) => matchSearch(v.name))
        .map(([id, v]) => ({
          key: id,
          c1: v.name,
          c2: formatNumber(v.qty),
          c3: formatCurrency(v.amount, settings.currency),
        }));
      totals = Array.from(map.values()).reduce((s, v) => s + v.amount, 0);
      footerLabel = 'اجمالي المشتريات';
    } else if (type === 'suppliers-statement') {
      const filtered = purchases.filter((p) => inRange(p.date) && (!filterEntityId || p.supplierId === filterEntityId));
      rows = filtered
        .filter((p) => matchSearch(p.supplierName) || matchSearch(String(p.invoiceNo)))
        .map((p) => ({
          key: p.id,
          c1: `#${p.invoiceNo} - ${p.supplierName}`,
          c2: formatNumber(p.total),
          c3: formatNumber(p.paid || 0),
        }));
      totals = filtered.reduce((sum, p) => sum + p.total, 0);
      footerLabel = 'اجمالي الفواتير';
    } else if (type === 'suppliers-total-purchases') {
      const filtered = purchases.filter((p) => inRange(p.date));
      const map = new Map<string, { name: string; total: number }>();
      filtered.forEach((p) => {
        const cur = map.get(p.supplierId) || { name: p.supplierName, total: 0 };
        cur.total += p.total;
        map.set(p.supplierId, cur);
      });
      rows = Array.from(map.entries())
        .filter(([, v]) => matchSearch(v.name))
        .map(([id, v]) => ({
          key: id,
          c1: v.name,
          c2: formatCurrency(v.total, settings.currency),
        }));
      totals = Array.from(map.values()).reduce((s, v) => s + v.total, 0);
      footerLabel = 'اجمالي المشتريات';
    } else if (type === 'inventory-detailed') {
      rows = products
        .filter((p) => matchSearch(p.name))
        .map((p) => ({
          key: p.id,
          c1: p.name,
          c2: formatNumber(p.quantity),
          c3: formatNumber(p.salePrice),
        }));
      totals = products.reduce((s, p) => s + p.quantity * p.salePrice, 0);
      footerLabel = 'اجمالي قيمة المخزون';
    } else if (type === 'inventory-summary') {
      rows = products
        .filter((p) => matchSearch(p.name))
        .map((p) => ({
          key: p.id,
          c1: p.name,
          c2: formatNumber(p.quantity),
        }));
      totals = products.reduce((s, p) => s + p.quantity, 0);
      footerLabel = 'اجمالي الكميات';
    } else if (type === 'low-stock-detailed') {
      rows = products
        .filter((p) => p.quantity <= p.lowStockAlert && matchSearch(p.name))
        .map((p) => ({
          key: p.id,
          c1: p.name,
          c2: formatNumber(p.quantity),
          c3: formatNumber(p.lowStockAlert),
        }));
      totals = rows.length;
      footerLabel = 'عدد المنتجات';
    } else if (type === 'low-stock-summary') {
      rows = products
        .filter((p) => p.quantity <= p.lowStockAlert && matchSearch(p.name))
        .map((p) => ({
          key: p.id,
          c1: p.name,
          c2: formatNumber(p.quantity),
        }));
      totals = rows.length;
      footerLabel = 'عدد المنتجات';
    } else if (type === 'expenses-report') {
      const filtered = expenses.filter((e) => inRange(e.date));
      rows = filtered
        .filter((e) => matchSearch(e.category) || matchSearch(e.notes))
        .map((e) => ({
          key: e.id,
          c1: e.category,
          c2: formatNumber(e.amount),
          c3: e.notes || '—',
        }));
      totals = filtered.reduce((s, e) => s + e.amount, 0);
      footerLabel = 'اجمالي المصروفات';
    }

    return { rows, totals, footerLabel };
  }, [type, sales, purchases, products, customers, suppliers, expenses, settings, range, search, filterEntityId]);

  async function handlePdf() {
    try {
      const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><style>
        body{font-family:Arial;direction:rtl;padding:20px;}
        h1{text-align:center;color:#0f6e6c;border-bottom:2px solid #0f6e6c;padding-bottom:10px;}
        table{width:100%;border-collapse:collapse;margin-top:20px;}
        th,td{padding:10px;border:1px solid #ddd;text-align:right;}
        th{background:#0f6e6c;color:white;}
        tfoot td{background:#f0f0f0;font-weight:bold;}
      </style></head><body>
        <h1>${TITLES[type]}</h1>
        <p>الفترة: ${PERIOD_LABELS[period]}</p>
        <table>
          <thead><tr>
            ${config.headers.map((h) => `<th>${h}</th>`).join('')}
          </tr></thead>
          <tbody>
            ${rows.map((r) => `<tr><td>${r.c1}</td><td>${r.c2}</td>${r.c3 ? `<td>${r.c3}</td>` : ''}</tr>`).join('')}
          </tbody>
          <tfoot><tr><td colspan="${config.headers.length}">${footerLabel}: ${formatCurrency(totals, settings.currency)}</td></tr></tfoot>
        </table>
      </body></html>`;
      await performPrint(html, TITLES[type], 'pdf');
    } catch {
      showAlert('خطأ', 'تعذر إنشاء PDF');
    }
  }

  const entityList = entityType === 'customer' ? customers : suppliers;
  const selectedEntityName = entityList.find((e) => e.id === filterEntityId)?.name || '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={handlePdf} hitSlop={8} style={styles.pdfBtn}>
          <Text style={styles.pdfText}>pdf</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{TITLES[type]}</Text>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        {showsEntityFilter ? (
          <Pressable
            onPress={() => setFilterPickerVisible(true)}
            style={[styles.entityFilterBtn, !!filterEntityId && styles.entityFilterBtnActive]}
            hitSlop={6}
          >
            <MaterialCommunityIcons
              name={entityType === 'supplier' ? 'truck-outline' : 'account-outline'}
              size={20}
              color={filterEntityId ? Colors.white : Colors.primary}
            />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.searchLabel}>بحث</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={config.searchPlaceholder}
        />
      </View>

      <View style={styles.tableHeader}>
        {config.headers.map((h, i) => (
          <Text key={i} style={[styles.th, i === 0 && { flex: 2, textAlign: 'right' }, i > 0 && { flex: 1, textAlign: 'center' }]}>
            {h}
          </Text>
        ))}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        contentContainerStyle={rows.length === 0 ? { flex: 1 } : styles.list}
        ListEmptyComponent={
          <EmptyState
            title="لا يوجد نتائج خلال هذه الفترة"
          />
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={[styles.cell, { flex: 2, textAlign: 'right' }]} numberOfLines={2}>{item.c1}</Text>
            <Text style={[styles.cell, { flex: 1, textAlign: 'center' }]}>{item.c2}</Text>
            {item.c3 ? <Text style={[styles.cell, { flex: 1, textAlign: 'center' }]}>{item.c3}</Text> : null}
            {item.c4 ? <Text style={[styles.cell, { flex: 1, textAlign: 'center' }]}>{item.c4}</Text> : null}
          </View>
        )}
      />

      <View style={styles.footerCard}>
        <Text style={styles.footerValue}>
          {formatCurrency(totals, settings.currency)}
        </Text>
        <Text style={styles.footerLabel}>{footerLabel}</Text>
      </View>

      <View style={styles.bottomBar}>
        <Pressable
          onPress={() => setPeriodPickerVisible(true)}
          style={styles.dateBtn}
          hitSlop={6}
        >
          <MaterialCommunityIcons name="calendar" size={18} color={Colors.primary} />
        </Pressable>
        <Pressable
          onPress={() => setPeriodPickerVisible(true)}
          style={styles.todayBtn}
          hitSlop={6}
        >
          <Text style={styles.todayText}>{PERIOD_LABELS[period]}</Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={Colors.text} />
        </Pressable>
      </View>

      <Modal
        visible={periodPickerVisible}
        onClose={() => setPeriodPickerVisible(false)}
        title="اختر الفترة"
      >
        {(['today', 'yesterday', 'thisMonth', 'lastMonth', 'thisYear', 'all'] as Period[]).map((p) => (
          <Pressable
            key={p}
            onPress={() => {
              setPeriod(p);
              setPeriodPickerVisible(false);
            }}
            style={styles.menuRow}
          >
            <MaterialCommunityIcons
              name={period === p ? 'check-circle' : 'circle-outline'}
              size={22}
              color={period === p ? Colors.primary : Colors.textMuted}
            />
            <Text style={styles.menuLabel}>{PERIOD_LABELS[p]}</Text>
          </Pressable>
        ))}
      </Modal>

      <Modal
        visible={filterPickerVisible}
        onClose={() => setFilterPickerVisible(false)}
        title={entityType === 'supplier' ? 'اختر مورد' : 'اختر عميل'}
      >
        <Pressable
          onPress={() => {
            setFilterEntityId('');
            setFilterPickerVisible(false);
          }}
          style={styles.menuRow}
        >
          <MaterialCommunityIcons
            name={!filterEntityId ? 'check-circle' : 'circle-outline'}
            size={22}
            color={!filterEntityId ? Colors.primary : Colors.textMuted}
          />
          <Text style={styles.menuLabel}>الكل</Text>
        </Pressable>
        {entityList.map((e) => (
          <Pressable
            key={e.id}
            onPress={() => {
              setFilterEntityId(e.id);
              setFilterPickerVisible(false);
            }}
            style={styles.menuRow}
          >
            <MaterialCommunityIcons
              name={filterEntityId === e.id ? 'check-circle' : 'circle-outline'}
              size={22}
              color={filterEntityId === e.id ? Colors.primary : Colors.textMuted}
            />
            <Text style={styles.menuLabel}>{e.name}</Text>
          </Pressable>
        ))}
      </Modal>
    </SafeAreaView>
  );
}

function getConfig(type: ReportType): { headers: string[]; searchPlaceholder: string } {
  switch (type) {
    case 'sales-detailed':
      return { headers: ['اسم المنتج', 'الكمية', 'السعر'], searchPlaceholder: 'اسم المنتج' };
    case 'sales-summary':
      return { headers: ['اسم المنتج', 'الكمية'], searchPlaceholder: 'اسم المنتج' };
    case 'sales-by-category':
      return { headers: ['التصنيف', 'الإجمالي'], searchPlaceholder: 'التصنيف' };
    case 'unpaid-invoices':
    case 'purchases-unpaid':
      return { headers: ['اسم العميل', 'اجمالي الفاتورة', 'المبلغ المدفوع'], searchPlaceholder: 'اسم العميل' };
    case 'profits-detailed':
      return { headers: ['اسم المنتج', 'الكمية', 'الربح'], searchPlaceholder: 'اسم المنتج' };
    case 'profits-summary':
      return { headers: ['اسم المنتج', 'الربح'], searchPlaceholder: 'اسم المنتج' };
    case 'profits-invoices':
      return { headers: ['الفاتورة', 'الربح'], searchPlaceholder: 'رقم الفاتورة أو العميل' };
    case 'customers-debt':
      return { headers: ['اسم العميل', 'المديونية'], searchPlaceholder: 'اسم العميل' };
    case 'customers-products':
    case 'suppliers-products':
      return { headers: ['اسم المنتج', 'الكمية', 'الإجمالي'], searchPlaceholder: 'اسم المنتج' };
    case 'customers-statement':
    case 'suppliers-statement':
      return { headers: ['الفاتورة', 'الإجمالي', 'المدفوع'], searchPlaceholder: 'رقم الفاتورة' };
    case 'customers-total-sales':
      return { headers: ['اسم العميل', 'إجمالي المبيعات'], searchPlaceholder: 'اسم العميل' };
    case 'purchases-detailed':
      return { headers: ['اسم المنتج', 'الكمية', 'السعر'], searchPlaceholder: 'اسم المنتج' };
    case 'purchases-summary':
      return { headers: ['اسم المنتج', 'الكمية'], searchPlaceholder: 'اسم المنتج' };
    case 'purchases-by-category':
      return { headers: ['التصنيف', 'الإجمالي'], searchPlaceholder: 'التصنيف' };
    case 'suppliers-debt':
      return { headers: ['اسم المورد', 'المديونية'], searchPlaceholder: 'اسم المورد' };
    case 'suppliers-total-purchases':
      return { headers: ['اسم المورد', 'إجمالي المشتريات'], searchPlaceholder: 'اسم المورد' };
    case 'inventory-detailed':
      return { headers: ['اسم المنتج', 'الكمية', 'سعر البيع'], searchPlaceholder: 'اسم المنتج' };
    case 'inventory-summary':
      return { headers: ['اسم المنتج', 'الكمية'], searchPlaceholder: 'اسم المنتج' };
    case 'low-stock-detailed':
      return { headers: ['اسم المنتج', 'الكمية', 'حد التنبيه'], searchPlaceholder: 'اسم المنتج' };
    case 'low-stock-summary':
      return { headers: ['اسم المنتج', 'الكمية'], searchPlaceholder: 'اسم المنتج' };
    case 'expenses-report':
      return { headers: ['التصنيف', 'المبلغ', 'الملاحظات'], searchPlaceholder: 'التصنيف' };
    default:
      return { headers: ['البيان', 'القيمة'], searchPlaceholder: 'بحث' };
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  pdfBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  pdfText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.bold, textDecorationLine: 'underline' },
  headerTitle: { flex: 1, fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.text, textAlign: 'center', marginHorizontal: Spacing.sm },
  searchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  searchLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, textAlign: 'right' },
  entityFilterBtn: {
    width: 44,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entityFilterBtnActive: { backgroundColor: Colors.primary },
  searchWrap: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  tableHeader: {
    flexDirection: 'row-reverse',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    gap: Spacing.sm,
  },
  th: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  list: { paddingBottom: 200 },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
    minHeight: 52,
  },
  cell: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  footerCard: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  footerLabel: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  footerValue: { color: Colors.primary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  bottomBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  dateBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  todayText: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  menuRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuLabel: { flex: 1, color: Colors.text, fontSize: FontSize.md, textAlign: 'right' },
});
