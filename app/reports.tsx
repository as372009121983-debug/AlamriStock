// Powered by OnSpace.AI
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { Header } from '@/components/ui/Header';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { DateRange } from '@/components/ui/DateRange';
import { PrintMenu } from '@/components/ui/PrintMenu';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { formatCurrency, formatNumber, inRange, formatDate } from '@/services/format';
import { buildReportHtml, performPrint, PrintAction, exportCsv } from '@/services/print';

type ReportType =
  | 'sales' | 'profit' | 'top-products' | 'stagnant' | 'low-stock' | 'stock-movement'
  | 'purchases' | 'suppliers' | 'customers' | 'debts' | 'profit-by-product';

type ReportItem = { key: ReportType; title: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string };

const REPORTS: ReportItem[] = [
  { key: 'sales', title: 'تقرير المبيعات', icon: 'cart-outline', color: Colors.primary },
  { key: 'profit', title: 'تقرير الأرباح', icon: 'trending-up', color: Colors.success },
  { key: 'top-products', title: 'الأكثر مبيعاً', icon: 'star-outline', color: Colors.warning },
  { key: 'stagnant', title: 'المنتجات الراكدة', icon: 'sleep', color: Colors.textMuted },
  { key: 'low-stock', title: 'الأصناف الناقصة', icon: 'alert-outline', color: Colors.danger },
  { key: 'stock-movement', title: 'حركة المخزون', icon: 'transfer', color: Colors.info },
  { key: 'purchases', title: 'تقرير المشتريات', icon: 'cart-arrow-down', color: Colors.warning },
  { key: 'suppliers', title: 'تقرير الموردين', icon: 'truck-delivery-outline', color: Colors.warning },
  { key: 'customers', title: 'تقرير العملاء', icon: 'account-group-outline', color: Colors.info },
  { key: 'debts', title: 'الديون المستحقة', icon: 'cash-clock', color: Colors.danger },
  { key: 'profit-by-product', title: 'الأرباح حسب المنتج', icon: 'chart-bar', color: Colors.success },
];

export default function ReportsScreen() {
  const { sales, products, purchases, customers, suppliers, expenses, settings } = useStore();
  const { users } = useAuth();
  const { showAlert } = useAlert();
  const [active, setActive] = useState<ReportType>('sales');
  const [fromDate, setFromDate] = useState<number | null>(null);
  const [toDate, setToDate] = useState<number | null>(null);
  const [warehouseFilter, setWarehouseFilter] = useState<string | 'all'>('all');
  const [userFilter, setUserFilter] = useState<string | 'all'>('all');
  const [printVisible, setPrintVisible] = useState(false);

  const filteredSales = useMemo(() => {
    return sales.filter((s) =>
      inRange(s.date, fromDate, toDate) &&
      (warehouseFilter === 'all' || s.warehouseId === warehouseFilter) &&
      (userFilter === 'all' || s.userId === userFilter)
    );
  }, [sales, fromDate, toDate, warehouseFilter, userFilter]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => inRange(p.date, fromDate, toDate));
  }, [purchases, fromDate, toDate]);

  const reportData = useMemo(() => {
    switch (active) {
      case 'sales': {
        const total = filteredSales.reduce((s, sa) => s + sa.total, 0);
        const discount = filteredSales.reduce((s, sa) => s + sa.discount, 0);
        return {
          title: 'تقرير المبيعات',
          columns: ['#', 'العميل', 'المخزن', 'البائع', 'المبلغ', 'التاريخ'],
          rows: filteredSales.map((s) => [
            String(s.invoiceNo), s.customerName, s.warehouseName || '—', s.userName || '—',
            formatCurrency(s.total, settings.currency), formatDate(s.date),
          ]),
          summary: [
            { label: 'عدد الفواتير', value: formatNumber(filteredSales.length) },
            { label: 'إجمالي الخصومات', value: formatCurrency(discount, settings.currency) },
          ],
          finalRow: { label: 'إجمالي المبيعات', value: formatCurrency(total, settings.currency) },
        };
      }
      case 'profit': {
        let revenue = 0, cost = 0;
        for (const s of filteredSales) {
          revenue += s.total;
          for (const it of s.items) cost += it.purchasePrice * it.quantity;
        }
        const expensesTotal = expenses.filter((e) => inRange(e.date, fromDate, toDate)).reduce((s, e) => s + e.amount, 0);
        const grossProfit = revenue - cost;
        const netProfit = grossProfit - expensesTotal;
        return {
          title: 'تقرير الأرباح',
          columns: ['البند', 'القيمة'],
          rows: [
            ['الإيرادات', formatCurrency(revenue, settings.currency)],
            ['تكلفة المبيعات', formatCurrency(cost, settings.currency)],
            ['إجمالي الربح', formatCurrency(grossProfit, settings.currency)],
            ['المصروفات', formatCurrency(expensesTotal, settings.currency)],
          ],
          finalRow: { label: 'صافي الربح', value: formatCurrency(netProfit, settings.currency) },
        };
      }
      case 'top-products': {
        const map = new Map<string, { name: string; qty: number; revenue: number }>();
        for (const s of filteredSales) for (const it of s.items) {
          const cur = map.get(it.productId) || { name: it.name, qty: 0, revenue: 0 };
          cur.qty += it.quantity; cur.revenue += it.price * it.quantity;
          map.set(it.productId, cur);
        }
        const arr = Array.from(map.values()).sort((a, b) => b.qty - a.qty);
        return {
          title: 'المنتجات الأكثر مبيعاً',
          columns: ['#', 'المنتج', 'الكمية المباعة', 'الإيرادات'],
          rows: arr.slice(0, 50).map((p, i) => [String(i + 1), p.name, formatNumber(p.qty), formatCurrency(p.revenue, settings.currency)]),
        };
      }
      case 'stagnant': {
        const sold = new Set<string>();
        for (const s of filteredSales) for (const it of s.items) sold.add(it.productId);
        const stagnant = products.filter((p) => !sold.has(p.id) && p.quantity > 0);
        return {
          title: 'المنتجات الراكدة',
          columns: ['المنتج', 'الباركود', 'الكمية', 'القيمة'],
          rows: stagnant.map((p) => [p.name, p.barcode || '—', formatNumber(p.quantity), formatCurrency(p.purchasePrice * p.quantity, settings.currency)]),
        };
      }
      case 'low-stock': {
        const low = products.filter((p) => p.quantity <= p.lowStockAlert);
        return {
          title: 'الأصناف الناقصة',
          columns: ['المنتج', 'الكمية', 'حد التنبيه', 'الباركود'],
          rows: low.map((p) => [p.name, formatNumber(p.quantity), formatNumber(p.lowStockAlert), p.barcode || '—']),
        };
      }
      case 'stock-movement': {
        const map = new Map<string, { name: string; sold: number; purchased: number }>();
        for (const s of filteredSales) for (const it of s.items) {
          const cur = map.get(it.productId) || { name: it.name, sold: 0, purchased: 0 };
          cur.sold += it.quantity;
          map.set(it.productId, cur);
        }
        for (const pu of filteredPurchases) for (const it of pu.items) {
          const cur = map.get(it.productId) || { name: it.name, sold: 0, purchased: 0 };
          cur.purchased += it.quantity;
          map.set(it.productId, cur);
        }
        return {
          title: 'حركة المخزون',
          columns: ['المنتج', 'الوارد', 'الصادر', 'الفرق'],
          rows: Array.from(map.values()).map((m) => [m.name, formatNumber(m.purchased), formatNumber(m.sold), formatNumber(m.purchased - m.sold)]),
        };
      }
      case 'purchases': {
        const total = filteredPurchases.reduce((s, p) => s + p.total, 0);
        return {
          title: 'تقرير المشتريات',
          columns: ['#', 'المورد', 'المخزن', 'المبلغ', 'التاريخ'],
          rows: filteredPurchases.map((p) => [String(p.purchaseNo || '—'), p.supplierName, p.warehouseName || '—', formatCurrency(p.total, settings.currency), formatDate(p.date)]),
          finalRow: { label: 'إجمالي المشتريات', value: formatCurrency(total, settings.currency) },
        };
      }
      case 'suppliers': {
        return {
          title: 'تقرير الموردين',
          columns: ['المورد', 'الهاتف', 'العنوان', 'عدد التوريدات', 'الإجمالي'],
          rows: suppliers.map((s) => {
            const list = filteredPurchases.filter((p) => p.supplierId === s.id);
            const total = list.reduce((sum, x) => sum + x.total, 0);
            return [s.name, s.phone || '—', s.address || '—', String(list.length), formatCurrency(total, settings.currency)];
          }),
        };
      }
      case 'customers': {
        return {
          title: 'تقرير العملاء',
          columns: ['العميل', 'الهاتف', 'المديونية', 'عدد المشتريات'],
          rows: customers.map((c) => {
            const list = filteredSales.filter((s) => s.customerId === c.id);
            return [c.name, c.phone || '—', formatCurrency(c.debt, settings.currency), String(list.length)];
          }),
        };
      }
      case 'debts': {
        const debtors = customers.filter((c) => c.debt > 0);
        const total = debtors.reduce((s, c) => s + c.debt, 0);
        return {
          title: 'الديون المستحقة',
          columns: ['العميل', 'الهاتف', 'العنوان', 'المبلغ المستحق'],
          rows: debtors.map((c) => [c.name, c.phone || '—', c.address || '—', formatCurrency(c.debt, settings.currency)]),
          finalRow: { label: 'إجمالي الديون', value: formatCurrency(total, settings.currency) },
        };
      }
      case 'profit-by-product': {
        const map = new Map<string, { name: string; profit: number; qty: number }>();
        for (const s of filteredSales) for (const it of s.items) {
          const profit = (it.price - it.purchasePrice) * it.quantity;
          const cur = map.get(it.productId) || { name: it.name, profit: 0, qty: 0 };
          cur.profit += profit; cur.qty += it.quantity;
          map.set(it.productId, cur);
        }
        const arr = Array.from(map.values()).sort((a, b) => b.profit - a.profit);
        return {
          title: 'الأرباح حسب المنتج',
          columns: ['المنتج', 'الكمية', 'الربح'],
          rows: arr.map((m) => [m.name, formatNumber(m.qty), formatCurrency(m.profit, settings.currency)]),
        };
      }
      default:
        return { title: '', columns: [], rows: [] as string[][] };
    }
  }, [active, filteredSales, filteredPurchases, products, customers, suppliers, expenses, settings, fromDate, toDate]);

  async function handlePrint(action: PrintAction) {
    try {
      const html = buildReportHtml({
        title: reportData.title,
        meta: [
          { label: 'الفترة', value: fromDate || toDate ? `${fromDate ? formatDate(fromDate) : '—'} → ${toDate ? formatDate(toDate) : '—'}` : 'كل التواريخ' },
          { label: 'عدد السجلات', value: formatNumber(reportData.rows.length) },
        ],
        columns: reportData.columns,
        rows: reportData.rows,
        totals: 'summary' in reportData ? (reportData as any).summary : undefined,
        finalRow: 'finalRow' in reportData ? (reportData as any).finalRow : undefined,
      }, settings);
      await performPrint(html, `report-${active}-${Date.now()}`, action);
    } catch {
      showAlert('خطأ', 'تعذر تنفيذ الطباعة');
    }
  }
  async function handleCsv() {
    const rows: string[][] = [reportData.columns, ...reportData.rows];
    await exportCsv(rows, `report-${active}-${Date.now()}`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="التقارير"
        subtitle={reportData.title}
        right={
          <Pressable onPress={() => setPrintVisible(true)} hitSlop={8} style={styles.headerBtn}>
            <MaterialCommunityIcons name="printer" size={20} color={Colors.white} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row-reverse', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm }}>
          {REPORTS.map((r) => {
            const a = active === r.key;
            return (
              <Pressable key={r.key} onPress={() => setActive(r.key)} style={[styles.reportChip, a && styles.reportChipActive]}>
                <MaterialCommunityIcons name={r.icon} size={16} color={a ? Colors.white : r.color} />
                <Text style={[styles.reportChipText, a && { color: Colors.white }]}>{r.title}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.filtersBox}>
          <DateRange fromDate={fromDate} toDate={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />
        </View>

        <SectionTitle title={reportData.title} hint={`${formatNumber(reportData.rows.length)} سجل`} />
        {reportData.rows.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="chart-bar" size={28} color={Colors.textMuted} />
            <Text style={styles.emptyText}>لا توجد بيانات في هذا التقرير</Text>
          </View>
        ) : (
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              {reportData.columns.map((c, idx) => (
                <Text key={idx} style={styles.th} numberOfLines={1}>{c}</Text>
              ))}
            </View>
            {reportData.rows.slice(0, 100).map((row, idx) => (
              <View key={idx} style={[styles.tableRow, idx % 2 === 0 && { backgroundColor: Colors.surfaceAlt }]}>
                {row.map((c, ci) => (
                  <Text key={ci} style={styles.td} numberOfLines={2}>{c}</Text>
                ))}
              </View>
            ))}
            {reportData.rows.length > 100 ? (
              <Text style={styles.moreNote}>عرض أول 100 صف. للحصول على جميع البيانات قم بالطباعة أو التصدير.</Text>
            ) : null}
          </View>
        )}

        {'finalRow' in reportData && reportData.finalRow ? (
          <View style={styles.totalCard}>
            <Text style={styles.totalCardValue}>{(reportData as any).finalRow.value}</Text>
            <Text style={styles.totalCardLabel}>{(reportData as any).finalRow.label}</Text>
          </View>
        ) : null}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
      <PrintMenu visible={printVisible} onClose={() => setPrintVisible(false)} onAction={handlePrint} showCsvOption onCsv={handleCsv} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerBtn: { backgroundColor: Colors.primary, width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  content: { paddingVertical: Spacing.lg, gap: Spacing.md },
  reportChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, minHeight: 36 },
  reportChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  reportChipText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  filtersBox: { paddingHorizontal: Spacing.lg },
  tableCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, marginHorizontal: Spacing.lg, overflow: 'hidden', ...Shadow.sm },
  tableHeader: { flexDirection: 'row-reverse', backgroundColor: Colors.primary, paddingHorizontal: Spacing.sm, paddingVertical: 10 },
  th: { flex: 1, color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.bold, textAlign: 'right', paddingHorizontal: 4 },
  tableRow: { flexDirection: 'row-reverse', paddingHorizontal: Spacing.sm, paddingVertical: 8 },
  td: { flex: 1, color: Colors.text, fontSize: FontSize.xs, textAlign: 'right', paddingHorizontal: 4 },
  moreNote: { textAlign: 'center', color: Colors.textMuted, fontSize: FontSize.xs, padding: Spacing.md },
  emptyBox: { alignItems: 'center', paddingVertical: Spacing.xl, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, marginHorizontal: Spacing.lg, gap: 8 },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  totalCard: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'center', marginHorizontal: Spacing.lg, ...Shadow.md },
  totalCardLabel: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm, marginTop: 4 },
  totalCardValue: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
});
