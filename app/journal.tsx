// Powered by OnSpace.AI
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/hooks/useStore';
import { useAlert } from '@/template';
import { Header } from '@/components/ui/Header';
import { DateRange } from '@/components/ui/DateRange';
import { Button } from '@/components/ui/Button';
import { PrintMenu } from '@/components/ui/PrintMenu';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { formatCurrency, formatDateTime, formatNumber, inRange } from '@/services/format';
import { buildJournalHtml, performPrint, PrintAction, exportCsv } from '@/services/print';

export default function JournalScreen() {
  const { sales, expenses, settings } = useStore();
  const { showAlert } = useAlert();
  const [fromDate, setFromDate] = useState<number | null>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });
  const [toDate, setToDate] = useState<number | null>(Date.now());
  const [printVisible, setPrintVisible] = useState(false);

  const filtered = useMemo(() => {
    return {
      sales: sales.filter((s) => inRange(s.date, fromDate, toDate)),
      expenses: expenses.filter((e) => inRange(e.date, fromDate, toDate)),
    };
  }, [sales, expenses, fromDate, toDate]);

  const stats = useMemo(() => {
    const totalSales = filtered.sales.reduce((s, sa) => s + sa.total, 0);
    const totalCost = filtered.sales.reduce(
      (s, sa) => s + sa.items.reduce((sum, it) => sum + it.purchasePrice * it.quantity, 0),
      0
    );
    const profit = totalSales - totalCost;
    const totalExpenses = filtered.expenses.reduce((s, e) => s + e.amount, 0);
    const soldItems = filtered.sales.reduce((s, sa) => s + sa.items.reduce((sum, it) => sum + it.quantity, 0), 0);
    return {
      totalSales,
      totalCost,
      profit,
      totalExpenses,
      soldItems,
      invoicesCount: filtered.sales.length,
      netProfit: profit - totalExpenses,
    };
  }, [filtered]);

  async function handlePrint(action: PrintAction) {
    try {
      const data = {
        sales: filtered.sales.map((s) => ({
          invoiceNo: s.invoiceNo,
          customer: s.customerName,
          user: s.userName || '—',
          total: s.total,
          itemCount: s.items.reduce((sum, it) => sum + it.quantity, 0),
          date: s.date,
        })),
        totalSales: stats.totalSales,
        totalProfit: stats.profit,
        invoicesCount: stats.invoicesCount,
        soldItems: stats.soldItems,
        expenses: filtered.expenses.map((e) => ({
          category: e.category,
          amount: e.amount,
          user: e.userName,
          notes: e.notes,
        })),
        totalExpenses: stats.totalExpenses,
        fromDate,
        toDate,
      };
      const html = buildJournalHtml(data, settings);
      await performPrint(html, `journal-${Date.now()}`, action);
    } catch {
      showAlert('خطأ', 'تعذر تنفيذ الطباعة');
    }
  }
  async function handleCsv() {
    const rows: string[][] = [['نوع', 'رقم', 'تفاصيل', 'المستخدم', 'الإجمالي', 'التاريخ']];
    filtered.sales.forEach((s) => {
      rows.push(['بيع', `#${s.invoiceNo}`, s.customerName, s.userName || '—', String(s.total), formatDateTime(s.date)]);
    });
    filtered.expenses.forEach((e) => {
      rows.push(['مصروف', e.category, e.notes || '—', e.userName, String(e.amount), formatDateTime(e.date)]);
    });
    await exportCsv(rows, `journal-${Date.now()}`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="اليومية"
        subtitle="يومية النشاط والمبيعات"
        right={
          <Pressable onPress={() => setPrintVisible(true)} hitSlop={8} style={styles.headerBtn}>
            <MaterialCommunityIcons name="printer" size={20} color={Colors.white} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DateRange fromDate={fromDate} toDate={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />

        <View style={styles.gridStats}>
          <StatBlock label="عدد الفواتير" value={formatNumber(stats.invoicesCount)} icon="receipt" color={Colors.primary} bg={Colors.primarySoft} />
          <StatBlock label="الأصناف المباعة" value={formatNumber(stats.soldItems)} icon="package-variant" color={Colors.info} bg={Colors.infoSoft} />
          <StatBlock label="إجمالي المبيعات" value={formatCurrency(stats.totalSales, settings.currency)} icon="cash" color={Colors.success} bg={Colors.successSoft} />
          <StatBlock label="إجمالي المصروفات" value={formatCurrency(stats.totalExpenses, settings.currency)} icon="cash-minus" color={Colors.danger} bg={Colors.dangerSoft} />
        </View>

        <View style={styles.profitCard}>
          <Text style={styles.profitLabel}>صافي الربح</Text>
          <Text style={styles.profitValue}>{formatCurrency(stats.netProfit, settings.currency)}</Text>
        </View>

        <Text style={styles.sectionTitle}>تفاصيل الفواتير</Text>
        {filtered.sales.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="cart-outline" size={28} color={Colors.textMuted} />
            <Text style={styles.emptyText}>لا توجد فواتير في هذه الفترة</Text>
          </View>
        ) : (
          filtered.sales.map((s) => (
            <View key={s.id} style={styles.entryRow}>
              <Text style={styles.entryAmount}>{formatCurrency(s.total, settings.currency)}</Text>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.entryTitle}>#{s.invoiceNo} - {s.customerName}</Text>
                <Text style={styles.entrySub}>{s.userName || '—'} • {formatDateTime(s.date)}</Text>
              </View>
            </View>
          ))
        )}

        {filtered.expenses.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>المصروفات</Text>
            {filtered.expenses.map((e) => (
              <View key={e.id} style={styles.entryRow}>
                <Text style={[styles.entryAmount, { color: Colors.danger }]}>
                  -{formatCurrency(e.amount, settings.currency)}
                </Text>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={styles.entryTitle}>{e.category}</Text>
                  <Text style={styles.entrySub}>{e.userName} • {formatDateTime(e.date)}</Text>
                </View>
              </View>
            ))}
          </>
        ) : null}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
      <PrintMenu visible={printVisible} onClose={() => setPrintVisible(false)} onAction={handlePrint} showCsvOption onCsv={handleCsv} />
    </SafeAreaView>
  );
}

function StatBlock({ label, value, icon, color, bg }: any) {
  return (
    <View style={styles.statBlock}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerBtn: { backgroundColor: Colors.primary, width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.lg, gap: Spacing.md },
  gridStats: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: Spacing.md, marginTop: Spacing.md },
  statBlock: { flex: 1, minWidth: 150, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'flex-end', borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  statIcon: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  statValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  profitCard: { backgroundColor: Colors.success, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'flex-end', ...Shadow.md },
  profitLabel: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm },
  profitValue: { color: Colors.white, fontSize: FontSize.display, fontWeight: FontWeight.bold, marginTop: 4 },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text, textAlign: 'right', marginTop: Spacing.md },
  emptyBox: { alignItems: 'center', paddingVertical: Spacing.xl, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  entryRow: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, justifyContent: 'space-between' },
  entryTitle: { color: Colors.text, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  entrySub: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  entryAmount: { color: Colors.primary, fontWeight: FontWeight.bold, fontSize: FontSize.md },
});
