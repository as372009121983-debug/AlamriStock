// Powered by OnSpace.AI
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { DateRange } from '@/components/ui/DateRange';
import { PrintMenu } from '@/components/ui/PrintMenu';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { Worker } from '@/constants/types';
import { formatCurrency, formatDateTime, formatNumber, inRange } from '@/services/format';
import { buildWorkerPaymentsHtml, performPrint, PrintAction, exportCsv } from '@/services/print';

type FormState = { name: string; phone: string; jobTitle: string; maxAllowed: string; notes: string };
const emptyForm: FormState = { name: '', phone: '', jobTitle: '', maxAllowed: '0', notes: '' };

export default function WorkersScreen() {
  const {
    workers,
    workerPayments,
    addWorker,
    updateWorker,
    deleteWorker,
    addWorkerPayment,
    deleteWorkerPayment,
    settings,
  } = useStore();
  const { canEdit } = useAuth();
  const { showAlert } = useAlert();
  const { guard } = useAdminGuard();

  const [workerModalVisible, setWorkerModalVisible] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentWorker, setPaymentWorker] = useState<Worker | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const [historyWorker, setHistoryWorker] = useState<Worker | null>(null);
  const [fromDate, setFromDate] = useState<number | null>(null);
  const [toDate, setToDate] = useState<number | null>(null);
  const [printVisible, setPrintVisible] = useState(false);

  const filteredPayments = useMemo(
    () => workerPayments.filter((p) => inRange(p.date, fromDate, toDate)),
    [workerPayments, fromDate, toDate]
  );

  const summary = useMemo(() => {
    return workers.map((w) => {
      const paid = filteredPayments
        .filter((p) => p.workerId === w.id)
        .reduce((s, p) => s + p.amount, 0);
      const remaining = w.maxAllowed > 0 ? Math.max(0, w.maxAllowed - paid) : -1;
      return { worker: w, paid, remaining, payments: filteredPayments.filter((p) => p.workerId === w.id) };
    });
  }, [workers, filteredPayments]);

  const totals = useMemo(() => {
    const totalAllowed = workers.reduce((s, w) => s + w.maxAllowed, 0);
    const totalPaid = filteredPayments.reduce((s, p) => s + p.amount, 0);
    return { totalAllowed, totalPaid };
  }, [workers, filteredPayments]);

  function openCreate() {
    setEditingWorker(null);
    setForm(emptyForm);
    setWorkerModalVisible(true);
  }

  function openEdit(w: Worker) {
    guard({
      title: 'تعديل عامل',
      description: `أدخل كلمة مرور المدير لتعديل ${w.name}`,
      action: () => {
        setEditingWorker(w);
        setForm({
          name: w.name,
          phone: w.phone,
          jobTitle: w.jobTitle,
          maxAllowed: String(w.maxAllowed),
          notes: w.notes,
        });
        setWorkerModalVisible(true);
      },
    });
  }

  function handleSaveWorker() {
    if (!form.name.trim()) {
      showAlert('تنبيه', 'الاسم مطلوب');
      return;
    }
    const data = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      jobTitle: form.jobTitle.trim(),
      maxAllowed: Number(form.maxAllowed) || 0,
      notes: form.notes.trim(),
    };
    if (editingWorker) {
      updateWorker(editingWorker.id, data);
    } else {
      addWorker(data);
    }
    setWorkerModalVisible(false);
  }

  function confirmDeleteWorker(w: Worker) {
    guard({
      title: 'حذف عامل',
      description: `سيتم حذف ${w.name} وجميع سجلات قبضه`,
      action: () => {
        const res = deleteWorker(w.id);
        if (!res.ok) showAlert('خطأ', res.message || '');
      },
    });
  }

  function openPayment(w: Worker) {
    setPaymentWorker(w);
    setPaymentAmount('');
    setPaymentNotes('');
    setPaymentModalVisible(true);
  }

  function handleSavePayment() {
    if (!paymentWorker) return;
    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) {
      showAlert('تنبيه', 'أدخل مبلغاً صحيحاً');
      return;
    }
    const result = addWorkerPayment({
      workerId: paymentWorker.id,
      amount: amt,
      notes: paymentNotes.trim(),
    });
    if (result.error) {
      showAlert('خطأ', result.error);
      return;
    }
    setPaymentModalVisible(false);
    showAlert('تم القبض', `تم تسجيل صرف ${formatCurrency(amt, settings.currency)} لـ ${paymentWorker.name}`);
  }

  function confirmDeletePayment(id: string, workerName: string) {
    guard({
      title: 'حذف عملية قبض',
      description: `أدخل كلمة مرور المدير لحذف عملية قبض ${workerName}`,
      action: () => deleteWorkerPayment(id),
    });
  }

  async function handlePrint(action: PrintAction) {
    try {
      const html = buildWorkerPaymentsHtml({ workers: summary, fromDate, toDate }, settings);
      await performPrint(html, `workers-${Date.now()}`, action);
    } catch {
      showAlert('خطأ', 'تعذر تنفيذ الطباعة');
    }
  }

  async function handleCsv() {
    const rows: string[][] = [['الاسم', 'الوظيفة', 'الحد المسموح', 'المصروف', 'المتبقي']];
    summary.forEach((s) => {
      rows.push([
        s.worker.name,
        s.worker.jobTitle || '—',
        String(s.worker.maxAllowed),
        String(s.paid),
        s.worker.maxAllowed > 0 ? String(s.remaining) : '—',
      ]);
    });
    await exportCsv(rows, `workers-${Date.now()}`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="قبض العمال"
        subtitle={`${formatNumber(workers.length)} عامل`}
        right={
          <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
            <Pressable onPress={() => setPrintVisible(true)} hitSlop={8} style={styles.headerBtn}>
              <MaterialCommunityIcons name="printer" size={20} color={Colors.white} />
            </Pressable>
            {canEdit ? (
              <Pressable onPress={openCreate} hitSlop={8} style={styles.headerBtn}>
                <MaterialCommunityIcons name="account-plus" size={22} color={Colors.white} />
              </Pressable>
            ) : null}
          </View>
        }
      />
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: Colors.warningSoft, borderColor: Colors.warning }]}>
          <Text style={[styles.summaryLabel, { color: Colors.warning }]}>إجمالي الحدود</Text>
          <Text style={[styles.summaryValue, { color: Colors.warning }]}>
            {formatCurrency(totals.totalAllowed, settings.currency)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: Colors.dangerSoft, borderColor: Colors.danger }]}>
          <Text style={[styles.summaryLabel, { color: Colors.danger }]}>إجمالي المصروف</Text>
          <Text style={[styles.summaryValue, { color: Colors.danger }]}>
            {formatCurrency(totals.totalPaid, settings.currency)}
          </Text>
        </View>
      </View>
      <View style={styles.filterBox}>
        <DateRange fromDate={fromDate} toDate={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />
      </View>

      <FlatList
        data={summary}
        keyExtractor={(s) => s.worker.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon="account-cash-outline" title="لا يوجد عمال" description="ابدأ بإضافة عامل جديد" />
        }
        renderItem={({ item }) => {
          const exhausted = item.worker.maxAllowed > 0 && item.remaining <= 0;
          const expanded = historyWorker?.id === item.worker.id;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
                  {canEdit ? (
                    <>
                      <Pressable onPress={() => confirmDeleteWorker(item.worker)} hitSlop={8} style={styles.actBtn}>
                        <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.danger} />
                      </Pressable>
                      <Pressable onPress={() => openEdit(item.worker)} hitSlop={8} style={styles.actBtn}>
                        <MaterialCommunityIcons name="pencil-outline" size={18} color={Colors.info} />
                      </Pressable>
                    </>
                  ) : null}
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                  <Text style={styles.workerName}>{item.worker.name}</Text>
                  {item.worker.jobTitle ? <Text style={styles.workerSub}>{item.worker.jobTitle}</Text> : null}
                  {item.worker.phone ? <Text style={styles.workerSub}>{item.worker.phone}</Text> : null}
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>الحد المسموح</Text>
                  <Text style={styles.metricValue}>
                    {item.worker.maxAllowed > 0 ? formatCurrency(item.worker.maxAllowed, settings.currency) : 'بدون حد'}
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>المصروف</Text>
                  <Text style={[styles.metricValue, { color: Colors.danger }]}>
                    {formatCurrency(item.paid, settings.currency)}
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>المتبقي</Text>
                  <Text style={[styles.metricValue, { color: exhausted ? Colors.danger : Colors.success }]}>
                    {item.worker.maxAllowed > 0 ? formatCurrency(Math.max(0, item.remaining), settings.currency) : '—'}
                  </Text>
                </View>
              </View>

              {item.worker.maxAllowed > 0 ? (
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressFg,
                      {
                        width: `${Math.min(100, (item.paid / item.worker.maxAllowed) * 100)}%`,
                        backgroundColor: exhausted ? Colors.danger : Colors.success,
                      },
                    ]}
                  />
                </View>
              ) : null}

              <View style={styles.actionsRow}>
                {canEdit ? (
                  <Button
                    title="تسجيل قبض"
                    icon="cash-plus"
                    size="sm"
                    onPress={() => openPayment(item.worker)}
                    disabled={exhausted}
                    style={{ flex: 1 }}
                  />
                ) : null}
                <Button
                  title={expanded ? 'إخفاء السجل' : `السجل (${item.payments.length})`}
                  icon={expanded ? 'chevron-up' : 'history'}
                  size="sm"
                  variant="secondary"
                  onPress={() => setHistoryWorker(expanded ? null : item.worker)}
                  style={{ flex: 1 }}
                />
              </View>

              {expanded && item.payments.length > 0 ? (
                <View style={styles.historyBox}>
                  <Text style={styles.historyTitle}>سجل القبض</Text>
                  {item.payments.map((p) => (
                    <View key={p.id} style={styles.historyRow}>
                      {canEdit ? (
                        <Pressable onPress={() => confirmDeletePayment(p.id, p.workerName)} hitSlop={8}>
                          <MaterialCommunityIcons name="close-circle" size={18} color={Colors.danger} />
                        </Pressable>
                      ) : null}
                      <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.sm }}>
                        <Text style={styles.historyAmount}>
                          {formatCurrency(p.amount, settings.currency)}
                        </Text>
                        <Text style={styles.historyMeta}>
                          {p.userName} • {formatDateTime(p.date)}
                        </Text>
                        {p.notes ? <Text style={styles.historyNotes}>{p.notes}</Text> : null}
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          );
        }}
      />

      <Modal
        visible={workerModalVisible}
        onClose={() => setWorkerModalVisible(false)}
        title={editingWorker ? 'تعديل عامل' : 'إضافة عامل'}
        footer={
          <>
            <Button title="إلغاء" variant="secondary" onPress={() => setWorkerModalVisible(false)} style={{ flex: 1 }} />
            <Button title="حفظ" onPress={handleSaveWorker} style={{ flex: 1 }} />
          </>
        }
      >
        <Input label="الاسم" value={form.name} onChangeText={(t) => setForm((p) => ({ ...p, name: t }))} placeholder="اسم العامل" />
        <Input label="الوظيفة" value={form.jobTitle} onChangeText={(t) => setForm((p) => ({ ...p, jobTitle: t }))} placeholder="مثل: فني، سائق، عامل" />
        <Input label="رقم الهاتف" value={form.phone} onChangeText={(t) => setForm((p) => ({ ...p, phone: t }))} keyboardType="phone-pad" />
        <Input
          label="الحد الأقصى المسموح للصرف"
          value={form.maxAllowed}
          onChangeText={(t) => setForm((p) => ({ ...p, maxAllowed: t }))}
          placeholder="0 (بدون حد)"
          keyboardType="decimal-pad"
        />
        <Input label="ملاحظات" value={form.notes} onChangeText={(t) => setForm((p) => ({ ...p, notes: t }))} multiline />
      </Modal>

      <Modal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        title={paymentWorker ? `قبض ${paymentWorker.name}` : 'تسجيل قبض'}
        footer={
          <>
            <Button title="إلغاء" variant="secondary" onPress={() => setPaymentModalVisible(false)} style={{ flex: 1 }} />
            <Button title="تسجيل القبض" icon="check" onPress={handleSavePayment} style={{ flex: 1 }} />
          </>
        }
      >
        {paymentWorker && paymentWorker.maxAllowed > 0 ? (
          <View style={styles.limitBox}>
            <Text style={styles.limitLabel}>الحد المسموح</Text>
            <Text style={styles.limitValue}>
              {formatCurrency(paymentWorker.maxAllowed, settings.currency)}
            </Text>
            <Text style={styles.limitHint}>
              المتبقي: {formatCurrency(
                Math.max(0, paymentWorker.maxAllowed - workerPayments.filter((p) => p.workerId === paymentWorker.id).reduce((s, p) => s + p.amount, 0)),
                settings.currency
              )}
            </Text>
          </View>
        ) : null}
        <Input label="المبلغ" value={paymentAmount} onChangeText={setPaymentAmount} placeholder="0.00" keyboardType="decimal-pad" />
        <Input label="ملاحظات" value={paymentNotes} onChangeText={setPaymentNotes} placeholder="ملاحظات اختيارية" multiline />
      </Modal>

      <PrintMenu visible={printVisible} onClose={() => setPrintVisible(false)} onAction={handlePrint} showCsvOption onCsv={handleCsv} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerBtn: { backgroundColor: Colors.primary, width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  summaryRow: { flexDirection: 'row-reverse', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  summaryCard: { flex: 1, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1.5, alignItems: 'flex-end' },
  summaryLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  summaryValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginTop: 4 },
  filterBox: { padding: Spacing.lg, paddingTop: Spacing.md },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md, ...Shadow.sm, gap: Spacing.md },
  cardTop: { flexDirection: 'row-reverse', alignItems: 'flex-start' },
  actBtn: { width: 36, height: 36, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  workerName: { color: Colors.text, fontWeight: FontWeight.bold, fontSize: FontSize.lg },
  workerSub: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
  metricsRow: { flexDirection: 'row-reverse', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.sm },
  metric: { flex: 1, alignItems: 'center' },
  metricLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  metricValue: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginTop: 2 },
  progressBg: { height: 8, borderRadius: 4, backgroundColor: Colors.surfaceAlt, overflow: 'hidden' },
  progressFg: { height: '100%' },
  actionsRow: { flexDirection: 'row-reverse', gap: Spacing.sm },
  historyBox: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm },
  historyTitle: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold, textAlign: 'right' },
  historyRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', backgroundColor: Colors.surface, borderRadius: Radius.sm, padding: Spacing.sm },
  historyAmount: { color: Colors.danger, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  historyMeta: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  historyNotes: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 4 },
  limitBox: { backgroundColor: Colors.warningSoft, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'flex-end', gap: 4 },
  limitLabel: { color: Colors.warning, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  limitValue: { color: Colors.warning, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  limitHint: { color: Colors.warning, fontSize: FontSize.xs },
});
