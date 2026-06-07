// Powered by OnSpace.AI
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/hooks/useStore';
import { useAlert } from '@/template';
import { SearchBar } from '@/components/ui/SearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { CustomDatePicker } from '@/components/ui/CustomDatePicker';
import { PrintMenu } from '@/components/ui/PrintMenu';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { formatCurrency, formatDate, formatNumber } from '@/services/format';
import {
  performPrint,
  exportXlsx,
  buildReportHtml,
  PrintAction,
} from '@/services/print';

type ReportType =
  | 'sales-detailed'
  | 'sales-summary'
  | 'sales-by-category'
  | 'unpaid-invoices'
  | 'profits-detailed'
  | 'profits-summary'
  | 'profits-invoices'
  | 'customers-debt'
  | 'customers-products'
  | 'customers-statement'
  | 'customers-total-sales'
  | 'purchases-detailed'
  | 'purchases-summary'
  | 'purchases-by-category'
  | 'suppliers-products'
  | 'suppliers-statement'
  | 'suppliers-total-purchases'
  | 'inventory-detailed'
  | 'inventory-summary'
  | 'low-stock-detailed'
  | 'expenses-report';

type Period =
  | 'today'
  | 'yesterday'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'all'
  | 'custom';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'اليوم',
  yesterday: 'أمس',
  thisMonth: 'الشهر الحالي',
  lastMonth: 'الشهر الماضي',
  thisYear: 'العام الحالي',
  all: 'كل الفترات',
  custom: 'فترة مخصصة',
};

function periodRange(
  p: Period,
  customFrom: number | null,
  customTo: number | null
): { from: number; to: number } {
  const now = new Date();
  if (p === 'custom') {
    return {
      from: customFrom ?? 0,
      to: customTo ?? Number.MAX_SAFE_INTEGER,
    };
  }
  if (p === 'all') return { from: 0, to: Number.MAX_SAFE_INTEGER };
  if (p === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from: start.getTime(), to: now.getTime() };
  }
  if (p === 'yesterday') {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
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
  'profits-detailed': 'تقرير أرباح مفصل',
  'profits-summary': 'تقرير أرباح مجمل',
  'profits-invoices': 'تقرير أرباح الفواتير',
  'customers-debt': 'تقرير مديونية العملاء',
  'customers-products': 'المنتجات المباعة لعميل',
  'customers-statement': 'كشف حساب عميل',
  'customers-total-sales': 'إجمالي مبيعات العملاء',
  'purchases-detailed': 'تقرير مشتريات مفصل',
  'purchases-summary': 'تقرير مشتريات مجمل',
  'purchases-by-category': 'تقرير مشتريات بالتصنيف',
  'suppliers-products': 'المنتجات المشتراة من مورد',
  'suppliers-statement': 'كشف حساب مورد',
  'suppliers-total-purchases': 'إجمالي مشتريات الموردين',
  'inventory-detailed': 'جرد مفصل',
  'inventory-summary': 'جرد مجمل',
  'low-stock-detailed': 'منتجات منخفضة الكمية',
  'expenses-report': 'تقرير المصروفات',
};

type Row = {
  key: string;
  cells: string[];
};

export default function ReportViewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    type?: string;
    p?: string;
    from?: string;
    to?: string;
  }>();
  const type = (params.type || 'sales-detailed') as ReportType;
  const initPeriod = (params.p || 'today') as Period;
  const initFrom = params.from ? parseInt(String(params.from), 10) : null;
  const initTo = params.to ? parseInt(String(params.to), 10) : null;

  const { sales, purchases, products, customers, suppliers, expenses, settings } = useStore();
  const { showAlert } = useAlert();

  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<Period>(initPeriod);
  const [customFrom, setCustomFrom] = useState<number | null>(initFrom);
  const [customTo, setCustomTo] = useState<number | null>(initTo);
  const [periodPickerVisible, setPeriodPickerVisible] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [filterEntityId, setFilterEntityId] = useState<string>('');
  const [filterPickerVisible, setFilterPickerVisible] = useState(false);
  const [printMenuVisible, setPrintMenuVisible] = useState(false);

  useEffect(() => {
    if (params.p === 'custom' && params.from && params.to) {
      setPeriod('custom');
    }
  }, [params]);

  const range = useMemo(
    () => periodRange(period, customFrom, customTo),
    [period, customFrom, customTo]
  );

  const showsEntityFilter = useMemo(() => {
    return [
      'sales-detailed',
      'sales-summary',
      'unpaid-invoices',
      'customers-products',
      'customers-statement',
      'suppliers-products',
      'suppliers-statement',
      'purchases-detailed',
      'purchases-summary',
    ].includes(type);
  }, [type]);

  const entityType: 'customer' | 'supplier' = useMemo(() => {
    return type.startsWith('supplier') || type.startsWith('purchases')
      ? 'supplier'
      : 'customer';
  }, [type]);

  const config = useMemo(() => getConfig(type), [type]);

  const { rows, totals, footerLabel, isCount } = useMemo(() => {
    const inRange = (d: number) => d >= range.from && d <= range.to;
    const matchSearch = (s: string) =>
      !search.trim() || String(s || '').toLowerCase().includes(search.trim().toLowerCase());

    let rows: Row[] = [];
    let totals = 0;
    let footerLabel = 'الإجمالي';
    let isCount = false;
    const cur = settings.currency || 'جنيه';

    if (type === 'sales-detailed') {
      const filtered = sales.filter(
        (s) => inRange(s.date) && (!filterEntityId || s.customerId === filterEntityId)
      );
      const map = new Map<
        string,
        { name: string; qty: number; amount: number; price: number }
      >();
      filtered.forEach((sale) => {
        sale.items.forEach((it) => {
          const cur2 = map.get(it.productId) || {
            name: it.name,
            qty: 0,
            amount: 0,
            price: it.price,
          };
          cur2.qty += it.quantity;
          cur2.amount += it.price * it.quantity;
          cur2.price = it.price;
          map.set(it.productId, cur2);
        });
      });
      rows = Array.from(map.entries())
        .filter(([, v]) => matchSearch(v.name))
        .map(([id, v]) => ({
          key: id,
          cells: [v.name, formatNumber(v.qty), formatNumber(v.price)],
        }));
      totals = filtered.reduce((s, x) => s + x.total, 0);
      footerLabel = 'إجمالي المبيعات';
    } else if (type === 'sales-summary') {
      const filtered = sales.filter(
        (s) => inRange(s.date) && (!filterEntityId || s.customerId === filterEntityId)
      );
      const map = new Map<string, { name: string; qty: number }>();
      filtered.forEach((sale) => {
        sale.items.forEach((it) => {
          const cur2 = map.get(it.productId) || { name: it.name, qty: 0 };
          cur2.qty += it.quantity;
          map.set(it.productId, cur2);
        });
      });
      rows = Array.from(map.entries())
        .filter(([, v]) => matchSearch(v.name))
        .map(([id, v]) => ({ key: id, cells: [v.name, formatNumber(v.qty)] }));
      totals = filtered.reduce((s, x) => s + x.total, 0);
      footerLabel = 'إجمالي المبيعات';
    } else if (type === 'sales-by-category') {
      const filtered = sales.filter((s) => inRange(s.date));
      const map = new Map<string, number>();
      filtered.forEach((sale) => {
        sale.items.forEach((it) => {
          const product = products.find((p) => p.id === it.productId);
          const cat = product?.category || 'بدون تصنيف';
          map.set(cat, (map.get(cat) || 0) + it.price * it.quantity);
        });
      });
      rows = Array.from(map.entries())
        .filter(([cat]) => matchSearch(cat))
        .map(([cat, amount]) => ({
          key: cat,
          cells: [cat, formatCurrency(amount, cur)],
        }));
      totals = Array.from(map.values()).reduce((s, v) => s + v, 0);
      footerLabel = 'إجمالي المبيعات';
    } else if (type === 'unpaid-invoices') {
      const filtered = sales.filter(
        (s) =>
          inRange(s.date) &&
          (s.paid || 0) < s.total &&
          (!filterEntityId || s.customerId === filterEntityId)
      );
      rows = filtered
        .filter((s) => matchSearch(s.customerName))
        .map((s) => ({
          key: s.id,
          cells: [
            s.customerName || 'عميل نقدي',
            formatNumber(s.total),
            formatNumber(s.paid || 0),
          ],
        }));
      totals = filtered.reduce((sum, s) => sum + (s.total - (s.paid || 0)), 0);
      footerLabel = 'المبلغ المتبقي';
    } else if (type === 'profits-detailed' || type === 'profits-summary') {
      const filtered = sales.filter((s) => inRange(s.date));
      const map = new Map<string, { name: string; qty: number; profit: number }>();
      filtered.forEach((sale) => {
        sale.items.forEach((it) => {
          const profit = (it.price - it.purchasePrice) * it.quantity;
          const cur2 = map.get(it.productId) || { name: it.name, qty: 0, profit: 0 };
          cur2.qty += it.quantity;
          cur2.profit += profit;
          map.set(it.productId, cur2);
        });
      });
      rows = Array.from(map.entries())
        .filter(([, v]) => matchSearch(v.name))
        .map(([id, v]) =>
          type === 'profits-detailed'
            ? {
                key: id,
                cells: [v.name, formatNumber(v.qty), formatCurrency(v.profit, cur)],
              }
            : { key: id, cells: [v.name, formatCurrency(v.profit, cur)] }
        );
      totals = Array.from(map.values()).reduce((s, v) => s + v.profit, 0);
      footerLabel = 'إجمالي الأرباح';
    } else if (type === 'profits-invoices') {
      const filtered = sales.filter((s) => inRange(s.date));
      rows = filtered
        .filter(
          (s) =>
            matchSearch(s.customerName) || matchSearch(String(s.invoiceNo))
        )
        .map((s) => {
          const cost = s.items.reduce((c, it) => c + it.purchasePrice * it.quantity, 0);
          return {
            key: s.id,
            cells: [
              `#${s.invoiceNo} - ${s.customerName || 'نقدي'}`,
              formatCurrency(s.total - cost, cur),
            ],
          };
        });
      totals = filtered.reduce((sum, s) => {
        const cost = s.items.reduce((c, it) => c + it.purchasePrice * it.quantity, 0);
        return sum + (s.total - cost);
      }, 0);
      footerLabel = 'إجمالي الأرباح';
    } else if (type === 'customers-debt') {
      rows = customers
        .filter((c) => matchSearch(c.name) && (c.debt || 0) !== 0)
        .map((c) => ({
          key: c.id,
          cells: [c.name, formatCurrency(c.debt || 0, cur)],
        }));
      totals = customers.reduce((s, c) => s + (c.debt || 0), 0);
      footerLabel = 'إجمالي المديونية';
    } else if (type === 'customers-products') {
      const filtered = sales.filter(
        (s) => inRange(s.date) && (!filterEntityId || s.customerId === filterEntityId)
      );
      const map = new Map<string, { name: string; qty: number; amount: number }>();
      filtered.forEach((sale) => {
        sale.items.forEach((it) => {
          const cur2 = map.get(it.productId) || { name: it.name, qty: 0, amount: 0 };
          cur2.qty += it.quantity;
          cur2.amount += it.price * it.quantity;
          map.set(it.productId, cur2);
        });
      });
      rows = Array.from(map.entries())
        .filter(([, v]) => matchSearch(v.name))
        .map(([id, v]) => ({
          key: id,
          cells: [v.name, formatNumber(v.qty), formatCurrency(v.amount, cur)],
        }));
      totals = Array.from(map.values()).reduce((s, v) => s + v.amount, 0);
      footerLabel = 'إجمالي المبيعات';
    } else if (type === 'customers-statement') {
      const filtered = sales.filter(
        (s) => inRange(s.date) && (!filterEntityId || s.customerId === filterEntityId)
      );
      rows = filtered
        .filter(
          (s) => matchSearch(s.customerName) || matchSearch(String(s.invoiceNo))
        )
        .map((s) => ({
          key: s.id,
          cells: [
            `#${s.invoiceNo} - ${s.customerName || 'نقدي'}`,
            formatNumber(s.total),
            formatNumber(s.paid || 0),
          ],
        }));
      totals = filtered.reduce((sum, s) => sum + s.total, 0);
      footerLabel = 'إجمالي الفواتير';
    } else if (type === 'customers-total-sales') {
      const filtered = sales.filter((s) => inRange(s.date));
      const map = new Map<string, { name: string; total: number }>();
      filtered.forEach((s) => {
        const id = s.customerId || 'cash';
        const cur2 = map.get(id) || {
          name: s.customerName || 'عميل نقدي',
          total: 0,
        };
        cur2.total += s.total;
        map.set(id, cur2);
      });
      rows = Array.from(map.entries())
        .filter(([, v]) => matchSearch(v.name))
        .map(([id, v]) => ({
          key: id,
          cells: [v.name, formatCurrency(v.total, cur)],
        }));
      totals = Array.from(map.values()).reduce((s, v) => s + v.total, 0);
      footerLabel = 'إجمالي المبيعات';
    } else if (type === 'purchases-detailed') {
      const filtered = purchases.filter(
        (p) => inRange(p.date) && (!filterEntityId || p.supplierId === filterEntityId)
      );
      const map = new Map<string, { name: string; qty: number; price: number }>();
      filtered.forEach((purchase) => {
        purchase.items.forEach((it) => {
          const cur2 = map.get(it.productId) || {
            name: it.name,
            qty: 0,
            price: it.price,
          };
          cur2.qty += it.quantity;
          cur2.price = it.price;
          map.set(it.productId, cur2);
        });
      });
      rows = Array.from(map.entries())
        .filter(([, v]) => matchSearch(v.name))
        .map(([id, v]) => ({
          key: id,
          cells: [v.name, formatNumber(v.qty), formatNumber(v.price)],
        }));
      totals = filtered.reduce((s, x) => s + x.total, 0);
      footerLabel = 'إجمالي المشتريات';
    } else if (type === 'purchases-summary') {
      const filtered = purchases.filter(
        (p) => inRange(p.date) && (!filterEntityId || p.supplierId === filterEntityId)
      );
      const map = new Map<string, { name: string; qty: number }>();
      filtered.forEach((purchase) => {
        purchase.items.forEach((it) => {
          const cur2 = map.get(it.productId) || { name: it.name, qty: 0 };
          cur2.qty += it.quantity;
          map.set(it.productId, cur2);
        });
      });
      rows = Array.from(map.entries())
        .filter(([, v]) => matchSearch(v.name))
        .map(([id, v]) => ({ key: id, cells: [v.name, formatNumber(v.qty)] }));
      totals = filtered.reduce((s, x) => s + x.total, 0);
      footerLabel = 'إجمالي المشتريات';
    } else if (type === 'purchases-by-category') {
      const filtered = purchases.filter((p) => inRange(p.date));
      const map = new Map<string, number>();
      filtered.forEach((purchase) => {
        purchase.items.forEach((it) => {
          const product = products.find((p) => p.id === it.productId);
          const cat = product?.category || 'بدون تصنيف';
          map.set(cat, (map.get(cat) || 0) + it.price * it.quantity);
        });
      });
      rows = Array.from(map.entries())
        .filter(([cat]) => matchSearch(cat))
        .map(([cat, amount]) => ({
          key: cat,
          cells: [cat, formatCurrency(amount, cur)],
        }));
      totals = Array.from(map.values()).reduce((s, v) => s + v, 0);
      footerLabel = 'إجمالي المشتريات';
    } else if (type === 'suppliers-products') {
      const filtered = purchases.filter(
        (p) => inRange(p.date) && (!filterEntityId || p.supplierId === filterEntityId)
      );
      const map = new Map<string, { name: string; qty: number; amount: number }>();
      filtered.forEach((purchase) => {
        purchase.items.forEach((it) => {
          const cur2 = map.get(it.productId) || { name: it.name, qty: 0, amount: 0 };
          cur2.qty += it.quantity;
          cur2.amount += it.price * it.quantity;
          map.set(it.productId, cur2);
        });
      });
      rows = Array.from(map.entries())
        .filter(([, v]) => matchSearch(v.name))
        .map(([id, v]) => ({
          key: id,
          cells: [v.name, formatNumber(v.qty), formatCurrency(v.amount, cur)],
        }));
      totals = Array.from(map.values()).reduce((s, v) => s + v.amount, 0);
      footerLabel = 'إجمالي المشتريات';
    } else if (type === 'suppliers-statement') {
      const filtered = purchases.filter(
        (p) => inRange(p.date) && (!filterEntityId || p.supplierId === filterEntityId)
      );
      rows = filtered
        .filter(
          (p) =>
            matchSearch(p.supplierName) || matchSearch(String(p.purchaseNo))
        )
        .map((p) => ({
          key: p.id,
          cells: [
            `#${p.purchaseNo} - ${p.supplierName}`,
            formatCurrency(p.total, cur),
          ],
        }));
      totals = filtered.reduce((sum, p) => sum + p.total, 0);
      footerLabel = 'إجمالي الفواتير';
    } else if (type === 'suppliers-total-purchases') {
      const filtered = purchases.filter((p) => inRange(p.date));
      const map = new Map<string, { name: string; total: number }>();
      filtered.forEach((p) => {
        const cur2 = map.get(p.supplierId) || { name: p.supplierName, total: 0 };
        cur2.total += p.total;
        map.set(p.supplierId, cur2);
      });
      rows = Array.from(map.entries())
        .filter(([, v]) => matchSearch(v.name))
        .map(([id, v]) => ({
          key: id,
          cells: [v.name, formatCurrency(v.total, cur)],
        }));
      totals = Array.from(map.values()).reduce((s, v) => s + v.total, 0);
      footerLabel = 'إجمالي المشتريات';
    } else if (type === 'inventory-detailed') {
      rows = products
        .filter((p) => matchSearch(p.name))
        .map((p) => ({
          key: p.id,
          cells: [p.name, formatNumber(p.quantity), formatNumber(p.salePrice)],
        }));
      totals = products.reduce((s, p) => s + p.quantity * p.salePrice, 0);
      footerLabel = 'إجمالي قيمة المخزون';
    } else if (type === 'inventory-summary') {
      rows = products
        .filter((p) => matchSearch(p.name))
        .map((p) => ({
          key: p.id,
          cells: [p.name, formatNumber(p.quantity)],
        }));
      totals = products.reduce((s, p) => s + p.quantity, 0);
      footerLabel = 'إجمالي الكميات';
      isCount = true;
    } else if (type === 'low-stock-detailed') {
      rows = products
        .filter((p) => p.quantity <= p.lowStockAlert && matchSearch(p.name))
        .map((p) => ({
          key: p.id,
          cells: [p.name, formatNumber(p.quantity), formatNumber(p.lowStockAlert)],
        }));
      totals = rows.length;
      footerLabel = 'عدد المنتجات';
      isCount = true;
    } else if (type === 'expenses-report') {
      const filtered = expenses.filter((e) => inRange(e.date));
      rows = filtered
        .filter((e) => matchSearch(e.category) || matchSearch(e.notes))
        .map((e) => ({
          key: e.id,
          cells: [e.category, formatNumber(e.amount), e.notes || '—'],
        }));
      totals = filtered.reduce((s, e) => s + e.amount, 0);
      footerLabel = 'إجمالي المصروفات';
    }

    return { rows, totals, footerLabel, isCount };
  }, [
    type,
    sales,
    purchases,
    products,
    customers,
    suppliers,
    expenses,
    settings,
    range,
    search,
    filterEntityId,
  ]);

  const periodDisplay =
    period === 'custom'
      ? `${customFrom ? formatDate(customFrom) : '—'} ← ${
          customTo ? formatDate(customTo) : '—'
        }`
      : PERIOD_LABELS[period];

  function buildHtml(): string {
    return buildReportHtml(
      {
        title: TITLES[type],
        meta: [
          { label: 'الفترة', value: periodDisplay },
          { label: 'تاريخ الطباعة', value: formatDate(Date.now()) },
          { label: 'عدد العناصر', value: String(rows.length) },
        ],
        columns: config.headers,
        rows: rows.map((r) => r.cells),
        finalRow: {
          label: footerLabel,
          value: isCount
            ? formatNumber(totals)
            : formatCurrency(totals, settings.currency),
        },
      },
      settings
    );
  }

  async function handlePrint(action: PrintAction) {
    try {
      const html = buildHtml();
      await performPrint(html, TITLES[type], action);
    } catch (e: any) {
      showAlert(
        'تعذر التنفيذ',
        e?.message ||
          'تعذر إنشاء التقرير. تأكد من السماح بالنوافذ المنبثقة في المتصفح.'
      );
    }
  }

  async function handleExcel() {
    try {
      await exportXlsx(
        {
          title: TITLES[type],
          meta: [
            { label: 'الفترة', value: periodDisplay },
            { label: 'تاريخ التصدير', value: formatDate(Date.now()) },
          ],
          columns: config.headers,
          rows: rows.map((r) => r.cells),
          totalLabel: footerLabel,
          totalValue: isCount
            ? formatNumber(totals)
            : formatCurrency(totals, settings.currency),
        },
        TITLES[type]
      );
    } catch (e: any) {
      showAlert('تعذر التصدير', e?.message || 'فشل تصدير ملف Excel');
    }
  }

  const entityList = entityType === 'customer' ? customers : suppliers;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => setPrintMenuVisible(true)}
          hitSlop={8}
          style={styles.exportBtn}
        >
          <MaterialCommunityIcons name="export-variant" size={18} color={Colors.white} />
          <Text style={styles.exportText}>تصدير</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {TITLES[type]}
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
        </Pressable>
      </View>

      {/* Period summary card */}
      <View style={styles.periodSummary}>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={styles.periodSummaryLabel}>الفترة المختارة</Text>
          <Text style={styles.periodSummaryValue}>{periodDisplay}</Text>
        </View>
        <Pressable
          onPress={() => setPeriodPickerVisible(true)}
          style={styles.periodEditBtn}
          hitSlop={6}
        >
          <MaterialCommunityIcons name="calendar-edit" size={18} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Search + Entity filter */}
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
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder={config.searchPlaceholder}
          />
        </View>
      </View>

      {/* Table */}
      <View style={styles.tableHeader}>
        {config.headers.map((h, i) => (
          <Text
            key={i}
            style={[
              styles.th,
              i === 0 && { flex: 2, textAlign: 'right' },
              i > 0 && { flex: 1, textAlign: 'center' },
            ]}
          >
            {h}
          </Text>
        ))}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        contentContainerStyle={rows.length === 0 ? { flex: 1 } : styles.list}
        ListEmptyComponent={
          <EmptyState title="لا يوجد نتائج خلال هذه الفترة" />
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={[styles.cell, { flex: 2, textAlign: 'right' }]} numberOfLines={2}>
              {item.cells[0]}
            </Text>
            {item.cells.slice(1).map((c, idx) => (
              <Text
                key={idx}
                style={[styles.cell, { flex: 1, textAlign: 'center' }]}
                numberOfLines={1}
              >
                {c}
              </Text>
            ))}
          </View>
        )}
      />

      {/* Footer total */}
      <View style={styles.footerCard}>
        <Text style={styles.footerValue}>
          {isCount ? formatNumber(totals) : formatCurrency(totals, settings.currency)}
        </Text>
        <Text style={styles.footerLabel}>{footerLabel}</Text>
      </View>

      {/* Bottom date filter */}
      <View style={styles.bottomBar}>
        <Pressable
          onPress={() => {
            setPeriod('custom');
            setShowFromPicker(true);
          }}
          style={styles.dateBtn}
          hitSlop={6}
        >
          <MaterialCommunityIcons name="calendar-edit" size={18} color={Colors.primary} />
        </Pressable>
        <Pressable
          onPress={() => setPeriodPickerVisible(true)}
          style={styles.todayBtn}
          hitSlop={6}
        >
          <Text style={styles.todayText}>{periodDisplay}</Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={Colors.text} />
        </Pressable>
      </View>

      <PrintMenu
        visible={printMenuVisible}
        onClose={() => setPrintMenuVisible(false)}
        onAction={handlePrint}
        onExcel={handleExcel}
      />

      <Modal
        visible={periodPickerVisible}
        onClose={() => setPeriodPickerVisible(false)}
        title="اختر الفترة"
      >
        {(['today', 'yesterday', 'thisMonth', 'lastMonth', 'thisYear', 'all'] as Period[]).map(
          (p) => (
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
          )
        )}
        <Pressable
          onPress={() => {
            setPeriodPickerVisible(false);
            setPeriod('custom');
            setShowFromPicker(true);
          }}
          style={[styles.menuRow, styles.menuRowCustom]}
        >
          <MaterialCommunityIcons
            name={period === 'custom' ? 'check-circle' : 'calendar-edit'}
            size={22}
            color={Colors.primary}
          />
          <Text
            style={[
              styles.menuLabel,
              { color: Colors.primary, fontWeight: FontWeight.bold },
            ]}
          >
            تاريخ مخصص (يدوي)
          </Text>
        </Pressable>
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

      <CustomDatePicker
        visible={showFromPicker}
        onClose={() => setShowFromPicker(false)}
        initialDate={customFrom || Date.now()}
        title="من تاريخ"
        onSelect={(ts) => {
          setCustomFrom(ts);
          setPeriod('custom');
          setTimeout(() => setShowToPicker(true), 250);
        }}
      />
      <CustomDatePicker
        visible={showToPicker}
        onClose={() => setShowToPicker(false)}
        initialDate={customTo || Date.now()}
        title="إلى تاريخ"
        endOfDay
        onSelect={(ts) => {
          setCustomTo(ts);
          setPeriod('custom');
        }}
      />
    </SafeAreaView>
  );
}

function getConfig(
  type: ReportType
): { headers: string[]; searchPlaceholder: string } {
  switch (type) {
    case 'sales-detailed':
      return { headers: ['اسم المنتج', 'الكمية', 'السعر'], searchPlaceholder: 'اسم المنتج' };
    case 'sales-summary':
      return { headers: ['اسم المنتج', 'الكمية'], searchPlaceholder: 'اسم المنتج' };
    case 'sales-by-category':
      return { headers: ['التصنيف', 'الإجمالي'], searchPlaceholder: 'التصنيف' };
    case 'unpaid-invoices':
      return {
        headers: ['اسم العميل', 'إجمالي الفاتورة', 'المبلغ المدفوع'],
        searchPlaceholder: 'اسم العميل',
      };
    case 'profits-detailed':
      return { headers: ['اسم المنتج', 'الكمية', 'الربح'], searchPlaceholder: 'اسم المنتج' };
    case 'profits-summary':
      return { headers: ['اسم المنتج', 'الربح'], searchPlaceholder: 'اسم المنتج' };
    case 'profits-invoices':
      return {
        headers: ['الفاتورة', 'الربح'],
        searchPlaceholder: 'رقم الفاتورة أو العميل',
      };
    case 'customers-debt':
      return { headers: ['اسم العميل', 'المديونية'], searchPlaceholder: 'اسم العميل' };
    case 'customers-products':
    case 'suppliers-products':
      return {
        headers: ['اسم المنتج', 'الكمية', 'الإجمالي'],
        searchPlaceholder: 'اسم المنتج',
      };
    case 'customers-statement':
      return {
        headers: ['الفاتورة', 'الإجمالي', 'المدفوع'],
        searchPlaceholder: 'رقم الفاتورة',
      };
    case 'suppliers-statement':
      return { headers: ['الفاتورة', 'الإجمالي'], searchPlaceholder: 'رقم الفاتورة' };
    case 'customers-total-sales':
      return {
        headers: ['اسم العميل', 'إجمالي المبيعات'],
        searchPlaceholder: 'اسم العميل',
      };
    case 'purchases-detailed':
      return { headers: ['اسم المنتج', 'الكمية', 'السعر'], searchPlaceholder: 'اسم المنتج' };
    case 'purchases-summary':
      return { headers: ['اسم المنتج', 'الكمية'], searchPlaceholder: 'اسم المنتج' };
    case 'purchases-by-category':
      return { headers: ['التصنيف', 'الإجمالي'], searchPlaceholder: 'التصنيف' };
    case 'suppliers-total-purchases':
      return {
        headers: ['اسم المورد', 'إجمالي المشتريات'],
        searchPlaceholder: 'اسم المورد',
      };
    case 'inventory-detailed':
      return {
        headers: ['اسم المنتج', 'الكمية', 'سعر البيع'],
        searchPlaceholder: 'اسم المنتج',
      };
    case 'inventory-summary':
      return { headers: ['اسم المنتج', 'الكمية'], searchPlaceholder: 'اسم المنتج' };
    case 'low-stock-detailed':
      return {
        headers: ['اسم المنتج', 'الكمية', 'حد التنبيه'],
        searchPlaceholder: 'اسم المنتج',
      };
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
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  exportBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },
  exportText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  headerTitle: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  periodSummary: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primaryTint,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primarySoft,
  },
  periodSummaryLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  periodSummaryValue: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginTop: 2,
  },
  periodEditBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primarySoft,
  },
  searchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  entityFilterBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entityFilterBtnActive: { backgroundColor: Colors.primary },
  tableHeader: {
    flexDirection: 'row-reverse',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    backgroundColor: Colors.primaryTint,
    gap: Spacing.sm,
  },
  th: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
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
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    ...Shadow.md,
  },
  footerLabel: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    opacity: 0.95,
  },
  footerValue: {
    color: Colors.white,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
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
  menuRowCustom: {
    backgroundColor: Colors.primaryTint,
    borderTopWidth: 1,
    borderTopColor: Colors.primarySoft,
    marginTop: 4,
  },
  menuLabel: { flex: 1, color: Colors.text, fontSize: FontSize.md, textAlign: 'right' },
});
