// Powered by OnSpace.AI
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/hooks/useStore';
import { useAlert } from '@/template';
import { Header } from '@/components/ui/Header';
import { DateRange } from '@/components/ui/DateRange';
import { PrintMenu } from '@/components/ui/PrintMenu';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { formatCurrency, formatDate, formatNumber, inRange } from '@/services/format';
import { buildProfitsHtml, performPrint, PrintAction, exportCsv } from '@/services/print';

type Tab = 'overview' | 'invoices' | 'products';

export default function ProfitsScreen() {
  const { sales, settings } = useStore();
  const { showAlert } = useAlert();

  const [fromDate, setFromDate] = useState<number | null>(null);
  const [toDate, setToDate] = useState<number | null>(null);
  const [printVisible, setPrintVisible] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');

  const filtered = useMemo(() => sales.filter((s) => inRange(s.date, fromDate, toDate)), [sales, fromDate, toDate]);

  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    const perInvoice: { id: string; invoiceNo: number; date: number; customer: string; total: number; cost: number; profit: number }[] = [];
    const productMap = new Map<string, { name: string; qty: number; revenue: number; cost: number; profit: number }>();

    for (const sale of filtered) {
      let saleCost = 0;
      let saleRevenue = 0;
      for (const it of sale.items) {
        const itemRev = it.price * it.quantity;
        const itemCost = it.purchasePrice * it.quantity;
        saleRevenue += itemRev;
        saleCost += itemCost;

        const cur = productMap.get(it.productId) || { name: it.name, qty: 0, revenue: 0, cost: 0, profit: 0 };
        cur.qty += it.quantity;
        cur.revenue += itemRev;
        cur.cost += itemCost;
        cur.profit += itemRev - itemCost;
        productMap.set(it.productId, cur);
      }
      const saleNet = sale.total;
      totalRevenue += saleNet;
      totalCost += saleCost;
      const saleProfit = saleNet - saleCost - 0;
      perInvoice.push({
        id: sale.id,
        invoiceNo: sale.invoiceNo,
        date: sale.date,
        customer: sale.customerName,
        total: saleNet,
        cost: saleCost,
        profit: saleNet - saleCost,
      });
    }

    const totalProfit = totalRevenue - totalCost;
    const perProduct = Array.from(productMap.values()).sort((a, b) => b.profit - a.profit);

    return { totalRevenue, totalCost, totalProfit, perInvoice, perProduct };
  }, [filtered]);

  async function handlePrint(action: PrintAction) {
    try {
      const html = buildProfitsHtml(
        {
          perInvoice: stats.perInvoice,
          perProduct: stats.perProduct,
          totalRevenue: stats.totalRevenue,
          totalCost: stats.totalCost,
          totalProfit: stats.totalProfit,
          fromDate,
          toDate,
        },
        settings
      );
      await performPrint(html, `profits-${Date.now()}`, action);
    } catch {
      showAlert('خطأ', 'تعذر تنفيذ الطباعة');
    }
  }

  async function handleCsv() {
    const rows: string[][] = [['نوع', 'البيان', 'الإيراد', 'التكلفة', 'الربح']];
    stats.perInvoice.forEach((i) => {
      rows.push(['فاتورة', `#${i.invoiceNo} - ${i.customer}`, String(i.total), String(i.cost), String(i.profit)]);
    });
    stats.perProduct.forEach((p) => {
      rows.push(['منتج', p.name, String(p.revenue), String(p.cost), String(p.profit)]);
    });
    await exportCsv(rows, `profits-${Date.now()}`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="الأرباح"
        subtitle="تحليل تفصيلي للربح"
        right={
          <Pressable onPress={() => setPrintVisible(true)} hitSlop={8} style={styles.headerBtn}>
            <MaterialCommunityIcons name="printer" size={20} color={Colors.white} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DateRange fromDate={fromDate} toDate={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />

        <View style={styles.profitCard}>
          <Text style={styles.profitLabel}>إجمالي الربح خلال الفترة</Text>
          <Text style={styles.profitValue}>{formatCurrency(stats.totalProfit, settings.currency)}</Text>
          <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 6 }}>
            <View style={styles.profitBadge}>
              <Text style={styles.profitBadgeText}>{formatNumber(stats.perInvoice.length)} فاتورة</Text>
            </View>
            <View style={styles.profitBadge}>
              <Text style={styles.profitBadgeText}>{formatNumber(stats.perProduct.length)} منتج</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardsRow}>
          <View style={[styles.smallCard, { backgroundColor: Colors.successSoft, borderColor: Colors.success }]}>
            <Text style={[styles.smallCardLabel, { color: Colors.success }]}>الإيرادات</Text>
            <Text style={[styles.smallCardValue, { color: Colors.success }]}>
              {formatCurrency(stats.totalRevenue, settings.currency)}
            </Text>
          </View>
          <View style={[styles.smallCard, { backgroundColor: Colors.warningSoft, borderColor: Colors.warning }]}>
            <Text style={[styles.smallCardLabel, { color: Colors.warning }]}>التكلفة</Text>
            <Text style={[styles.smallCardValue, { color: Colors.warning }]}>
              {formatCurrency(stats.totalCost, settings.currency)}
            </Text>
          </View>
        </View>

        <View style={styles.tabsRow}>
          <TabButton label="نظرة عامة" active={tab === 'overview'} onPress={() => setTab('overview')} />
          <TabButton label="حسب الفاتورة" active={tab === 'invoices'} onPress={() => setTab('invoices')} />
          <TabButton label="حسب المنتج" active={tab === 'products'} onPress={() => setTab('products')} />
        </View>

        {tab === 'overview' ? (
          <View style={styles.overviewBox}>
            <Text style={styles.overviewTitle}>أعلى 5 منتجات ربحاً</Text>
            {stats.perProduct.slice(0, 5).map((p, idx) => (
              <View key={idx} style={styles.overviewRow}>
                <Text style={styles.overviewProfit}>{formatCurrency(p.profit, settings.currency)}</Text>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={styles.overviewName}>{p.name}</Text>
                  <Text style={styles.overviewSub}>
                    {formatNumber(p.qty)} قطعة • إيراد {formatCurrency(p.revenue, settings.currency)}
                  </Text>
                </View>
                <Text style={styles.overviewRank}>#{idx + 1}</Text>
              </View>
            ))}

            <Text style={[styles.overviewTitle, { marginTop: Spacing.lg }]}>أعلى 5 فواتير ربحاً</Text>
            {[...stats.perInvoice].sort((a, b) => b.profit - a.profit).slice(0, 5).map((i, idx) => (
              <View key={i.id} style={styles.overviewRow}>
                <Text style={styles.overviewProfit}>{formatCurrency(i.profit, settings.currency)}</Text>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={styles.overviewName}>#{i.invoiceNo} - {i.customer}</Text>
                  <Text style={styles.overviewSub}>
                    {formatDate(i.date)} • إجمالي {formatCurrency(i.total, settings.currency)}
                  </Text>
                </View>
                <Text style={styles.overviewRank}>#{idx + 1}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {tab === 'invoices' ? (
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 100, textAlign: 'left' }]}>الربح</Text>
              <Text style={[styles.th, { width: 90 }]}>التكلفة</Text>
              <Text style={[styles.th, { width: 90 }]}>الإجمالي</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>الفاتورة</Text>
            </View>
            {stats.perInvoice.length === 0 ? (
              <Text style={styles.empty}>لا توجد فواتير</Text>
            ) : (
              stats.perInvoice.slice(0, 100).map((i, idx) => (
                <View key={i.id} style={[styles.tableRow, idx % 2 === 0 && { backgroundColor: Colors.surfaceAlt }]}>
                  <Text style={[styles.td, { width: 100, textAlign: 'left', color: Colors.success, fontWeight: '700' }]}>
                    {formatCurrency(i.profit, settings.currency)}
                  </Text>
                  <Text style={[styles.td, { width: 90 }]}>{formatCurrency(i.cost, settings.currency)}</Text>
                  <Text style={[styles.td, { width: 90 }]}>{formatCurrency(i.total, settings.currency)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.td, { textAlign: 'right' }]}>#{i.invoiceNo} - {i.customer}</Text>
                    <Text style={styles.tdSub}>{formatDate(i.date)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}

        {tab === 'products' ? (
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { width: 100, textAlign: 'left' }]}>الربح</Text>
              <Text style={[styles.th, { width: 60 }]}>الكمية</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>المنتج</Text>
            </View>
            {stats.perProduct.length === 0 ? (
              <Text style={styles.empty}>لا توجد منتجات</Text>
            ) : (
              stats.perProduct.slice(0, 100).map((p, idx) => (
                <View key={idx} style={[styles.tableRow, idx % 2 === 0 && { backgroundColor: Colors.surfaceAlt }]}>
                  <Text style={[styles.td, { width: 100, textAlign: 'left', color: Colors.success, fontWeight: '700' }]}>
                    {formatCurrency(p.profit, settings.currency)}
                  </Text>
                  <Text style={[styles.td, { width: 60 }]}>{formatNumber(p.qty)}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.td, { textAlign: 'right' }]} numberOfLines={2}>{p.name}</Text>
                    <Text style={styles.tdSub}>
                      إيراد: {formatCurrency(p.revenue, settings.currency)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
      <PrintMenu visible={printVisible} onClose={() => setPrintVisible(false)} onAction={handlePrint} showCsvOption onCsv={handleCsv} />
    </SafeAreaView>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tabBtn, active && styles.tabBtnActive, pressed && { opacity: 0.85 }]}
    >
      <Text style={[styles.tabBtnText, active && { color: Colors.white }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerBtn: { backgroundColor: Colors.primary, width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.lg, gap: Spacing.md },
  profitCard: { backgroundColor: Colors.success, borderRadius: Radius.lg, padding: Spacing.xl, alignItems: 'flex-end', ...Shadow.md },
  profitLabel: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm },
  profitValue: { color: Colors.white, fontSize: FontSize.display, fontWeight: FontWeight.bold, marginTop: 4 },
  profitBadge: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  profitBadgeText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  cardsRow: { flexDirection: 'row-reverse', gap: Spacing.md },
  smallCard: { flex: 1, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1.5, alignItems: 'flex-end' },
  smallCardLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  smallCardValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginTop: 4 },
  tabsRow: { flexDirection: 'row-reverse', gap: Spacing.sm },
  tabBtn: { flex: 1, paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  tabBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabBtnText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  overviewBox: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm, ...Shadow.sm },
  overviewTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, textAlign: 'right' },
  overviewRow: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.sm },
  overviewRank: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.bold, width: 30, textAlign: 'center' },
  overviewName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  overviewSub: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  overviewProfit: { color: Colors.success, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  tableCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row-reverse', backgroundColor: Colors.primary, paddingHorizontal: Spacing.sm, paddingVertical: 10 },
  th: { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.bold, textAlign: 'right', paddingHorizontal: 4 },
  tableRow: { flexDirection: 'row-reverse', paddingHorizontal: Spacing.sm, paddingVertical: 8, alignItems: 'center' },
  td: { color: Colors.text, fontSize: FontSize.xs, paddingHorizontal: 4 },
  tdSub: { color: Colors.textMuted, fontSize: 10, paddingHorizontal: 4, marginTop: 2 },
  empty: { textAlign: 'center', color: Colors.textMuted, padding: Spacing.lg },
});
