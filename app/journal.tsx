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
import { formatCurrency, formatDateTime, formatNumber, inRange } from '@/services/format';
import { buildJournalHtml, performPrint, PrintAction, exportCsv } from '@/services/print';

export default function JournalScreen() {
  const { sales, expenses, customerPayments, workerPayments, saleReturns, settings } = useStore();
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
      customerPayments: customerPayments.filter((p) => inRange(p.date, fromDate, toDate)),
      workerPayments: workerPayments.filter((p) => inRange(p.date, fromDate, toDate)),
      saleReturns: saleReturns.filter((r) => inRange(r.date, fromDate, toDate)),
    };
  }, [sales, expenses, customerPayments, workerPayments, saleReturns, fromDate, toDate]);

  const stats = useMemo(() => {
    // Income: paid amounts from sales + customer payments
    const totalSalesPaid = filtered.sales.reduce((s, sa) => s + (sa.paid || 0), 0);
    const totalCustomerPayments = filtered.customerPayments.reduce((s, p) => s + p.amount, 0);
    const totalIncome = totalSalesPaid + totalCustomerPayments;

    // Expenses: expenses + worker payments
    const totalExpenses = filtered.expenses.reduce((s, e) => s + e.amount, 0);
    const totalWorkerPayments = filtered.workerPayments.reduce((s, p) => s + p.amount, 0);
    const totalOutflow = totalExpenses + totalWorkerPayments;

    const netCash = totalIncome - totalOutflow;

    // Returns are separate
    const totalSaleReturns = filtered.saleReturns.reduce((s, r) => s + r.total, 0);

    return {
      totalSalesPaid,
      totalCustomerPayments,
      totalIncome,
      totalExpenses,
      totalWorkerPayments,
      totalOutflow,
      netCash,
      totalSaleReturns,
    };
  }, [filtered]);

  async function handlePrint(action: PrintAction) {
    try {
      const data = {
        salesPaid: filtered.sales.map((s) => ({
          invoiceNo: s.invoiceNo,
          customer: s.customerName,
          user: s.userName || '—',
          total: s.paid || 0,
          date: s.date,
        })),
        customerPayments: filtered.customerPayments.map((p) => ({
          customerName: p.customerName,
          amount: p.amount,
          date: p.date,
          notes: p.notes,
        })),
        expenses: filtered.expenses.map((e) => ({
          category: e.category,
          amount: e.amount,
          user: e.userName,
          notes: e.notes,
          date: e.date,
        })),
        workerPayments: filtered.workerPayments.map((p) => ({
          workerName: p.workerName,
          amount: p.amount,
          date: p.date,
          notes: p.notes,
        })),
        saleReturns: filtered.saleReturns.map((r) => ({
          returnNo: r.returnNo,
          total: r.total,
          date: r.date,
          customerName: r.customerName,
        })),
        ...stats,
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
    const rows: string[][] = [['نوع', 'تفاصيل', 'المستخدم', 'القيمة', 'التاريخ']];
    filtered.sales.forEach((s) => {
      rows.push(['وارد - فاتورة', `#${s.invoiceNo} ${s.customerName}`, s.userName || '—', String(s.paid || 0), formatDateTime(s.date)]);
    });
    filtered.customerPayments.forEach((p) => {
      rows.push(['وارد - دفعة عميل', p.customerName, p.userName, String(p.amount), formatDateTime(p.date)]);
    });
    filtered.expenses.forEach((e) => {
      rows.push(['منصرف - مصروف', `${e.category} ${e.notes || ''}`, e.userName, String(-e.amount), formatDateTime(e.date)]);
    });
    filtered.workerPayments.forEach((w) => {
      rows.push(['منصرف - قبض عامل', w.workerName, w.userName, String(-w.amount), formatDateTime(w.date)]);
    });
    filtered.saleReturns.forEach((r) => {
      rows.push(['مرتجع (منفصل)', `#${r.returnNo} ${r.customerName}`, r.userName, String(r.total), formatDateTime(r.date)]);
    });
    await exportCsv(rows, `journal-${Date.now()}`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="اليومية"
        subtitle="الوارد والمنصرف وصافي النقدية"
        right={
          <Pressable onPress={() => setPrintVisible(true)} hitSlop={8} style={styles.headerBtn}>
            <MaterialCommunityIcons name="printer" size={20} color={Colors.white} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DateRange fromDate={fromDate} toDate={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />

        <View style={styles.netCard}>
          <Text style={styles.netLabel}>صافي النقدية الفعلي</Text>
          <Text style={styles.netValue}>{formatCurrency(stats.netCash, settings.currency)}</Text>
          <View style={styles.netHint}>
            <Text style={styles.netHintText}>
              {stats.netCash >= 0 ? 'فائض نقدي' : 'عجز نقدي'}
            </Text>
          </View>
        </View>

        <View style={styles.flowGrid}>
          <View style={[styles.flowCard, { backgroundColor: Colors.successSoft, borderColor: Colors.success }]}>
            <View style={styles.flowHeader}>
              <MaterialCommunityIcons name="arrow-down-bold-circle" size={22} color={Colors.success} />
              <Text style={[styles.flowTitle, { color: Colors.success }]}>الوارد</Text>
            </View>
            <Text style={[styles.flowTotal, { color: Colors.success }]}>
              {formatCurrency(stats.totalIncome, settings.currency)}
            </Text>
            <View style={styles.flowItem}>
              <Text style={styles.flowItemValue}>{formatCurrency(stats.totalSalesPaid, settings.currency)}</Text>
              <Text style={styles.flowItemLabel}>المبيعات المدفوعة</Text>
            </View>
            <View style={styles.flowItem}>
              <Text style={styles.flowItemValue}>{formatCurrency(stats.totalCustomerPayments, settings.currency)}</Text>
              <Text style={styles.flowItemLabel}>دفعات العملاء</Text>
            </View>
          </View>

          <View style={[styles.flowCard, { backgroundColor: Colors.dangerSoft, borderColor: Colors.danger }]}>
            <View style={styles.flowHeader}>
              <MaterialCommunityIcons name="arrow-up-bold-circle" size={22} color={Colors.danger} />
              <Text style={[styles.flowTitle, { color: Colors.danger }]}>المنصرف</Text>
            </View>
            <Text style={[styles.flowTotal, { color: Colors.danger }]}>
              {formatCurrency(stats.totalOutflow, settings.currency)}
            </Text>
            <View style={styles.flowItem}>
              <Text style={styles.flowItemValue}>{formatCurrency(stats.totalExpenses, settings.currency)}</Text>
              <Text style={styles.flowItemLabel}>المصروفات</Text>
            </View>
            <View style={styles.flowItem}>
              <Text style={styles.flowItemValue}>{formatCurrency(stats.totalWorkerPayments, settings.currency)}</Text>
              <Text style={styles.flowItemLabel}>قبض العمال</Text>
            </View>
          </View>
        </View>

        {stats.totalSaleReturns > 0 ? (
          <View style={styles.returnsCard}>
            <MaterialCommunityIcons name="undo-variant" size={20} color={Colors.warning} />
            <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
              <Text style={styles.returnsLabel}>المرتجعات (لا تحتسب من المبيعات)</Text>
              <Text style={styles.returnsValue}>{formatCurrency(stats.totalSaleReturns, settings.currency)}</Text>
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>الوارد - المبيعات المدفوعة ({filtered.sales.length})</Text>
        {filtered.sales.length === 0 ? (
          <Text style={styles.emptyText}>لا توجد مبيعات في الفترة</Text>
        ) : (
          filtered.sales.slice(0, 50).map((s) => (
            <View key={s.id} style={styles.entryRow}>
              <Text style={[styles.entryAmount, { color: Colors.success }]}>
                +{formatCurrency(s.paid || 0, settings.currency)}
              </Text>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.entryTitle}>#{s.invoiceNo} - {s.customerName}</Text>
                <Text style={styles.entrySub}>{s.userName || '—'} • {formatDateTime(s.date)}</Text>
              </View>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>الوارد - دفعات العملاء ({filtered.customerPayments.length})</Text>
        {filtered.customerPayments.length === 0 ? (
          <Text style={styles.emptyText}>لا توجد دفعات في الفترة</Text>
        ) : (
          filtered.customerPayments.slice(0, 50).map((p) => (
            <View key={p.id} style={styles.entryRow}>
              <Text style={[styles.entryAmount, { color: Colors.success }]}>
                +{formatCurrency(p.amount, settings.currency)}
              </Text>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.entryTitle}>{p.customerName}</Text>
                <Text style={styles.entrySub}>{p.notes || '—'} • {formatDateTime(p.date)}</Text>
              </View>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>المنصرف - المصروفات ({filtered.expenses.length})</Text>
        {filtered.expenses.length === 0 ? (
          <Text style={styles.emptyText}>لا توجد مصروفات في الفترة</Text>
        ) : (
          filtered.expenses.slice(0, 50).map((e) => (
            <View key={e.id} style={styles.entryRow}>
              <Text style={[styles.entryAmount, { color: Colors.danger }]}>
                -{formatCurrency(e.amount, settings.currency)}
              </Text>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.entryTitle}>{e.category}</Text>
                <Text style={styles.entrySub}>{e.userName} • {formatDateTime(e.date)}</Text>
              </View>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>المنصرف - قبض العمال ({filtered.workerPayments.length})</Text>
        {filtered.workerPayments.length === 0 ? (
          <Text style={styles.emptyText}>لا يوجد قبض في الفترة</Text>
        ) : (
          filtered.workerPayments.slice(0, 50).map((p) => (
            <View key={p.id} style={styles.entryRow}>
              <Text style={[styles.entryAmount, { color: Colors.danger }]}>
                -{formatCurrency(p.amount, settings.currency)}
              </Text>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.entryTitle}>{p.workerName}</Text>
                <Text style={styles.entrySub}>{p.notes || '—'} • {formatDateTime(p.date)}</Text>
              </View>
            </View>
          ))
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
      <PrintMenu visible={printVisible} onClose={() => setPrintVisible(false)} onAction={handlePrint} showCsvOption onCsv={handleCsv} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerBtn: { backgroundColor: Colors.primary, width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.lg, gap: Spacing.md },
  netCard: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.lg, alignItems: 'flex-end', ...Shadow.md },
  netLabel: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm },
  netValue: { color: Colors.white, fontSize: FontSize.display, fontWeight: FontWeight.bold, marginTop: 4 },
  netHint: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, marginTop: Spacing.sm },
  netHintText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  flowGrid: { flexDirection: 'row-reverse', gap: Spacing.md },
  flowCard: {
    flex: 1, borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1.5, ...Shadow.sm,
    alignItems: 'flex-end',
  },
  flowHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  flowTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  flowTotal: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginVertical: Spacing.sm },
  flowItem: { width: '100%', flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 4, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  flowItemLabel: { color: Colors.textSecondary, fontSize: FontSize.xs },
  flowItemValue: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  returnsCard: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: Colors.warningSoft, padding: Spacing.md, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.warning,
  },
  returnsLabel: { color: Colors.warning, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  returnsValue: { color: Colors.warning, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginTop: 2 },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text, textAlign: 'right', marginTop: Spacing.md },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', paddingVertical: Spacing.md },
  entryRow: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, justifyContent: 'space-between' },
  entryTitle: { color: Colors.text, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  entrySub: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  entryAmount: { fontWeight: FontWeight.bold, fontSize: FontSize.md },
});
