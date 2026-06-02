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
import { Worker, WorkerAdvance, WorkerAdvanceType } from '@/constants/types';
import { formatCurrency, formatDateTime, formatNumber, inRange } from '@/services/format';
import { buildWorkerAdvancesHtml, performPrint, PrintAction, exportCsv } from '@/services/print';

type Tab = 'all' | 'advance' | 'repayment';

export default function WorkerAdvancesScreen() {
  const {
    workers, workerAdvances, addWorkerAdvance, deleteWorkerAdvance, settings,
  } = useStore();
  const { canEdit } = useAuth();
  const { showAlert } = useAlert();
  const { guard } = useAdminGuard();

  const [tab, setTab] = useState<Tab>('all');
  const [fromDate, setFromDate] = useState<number | null>(null);
  const [toDate, setToDate] = useState<number | null>(null);
  const [printVisible, setPrintVisible] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [type, setType] = useState<WorkerAdvanceType>('advance');
  const [workerPickerVisible, setWorkerPickerVisible] = useState(false);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const selectedWorker = workers.find((w) => w.id === workerId);

  const filtered = useMemo(() => {
    return workerAdvances.filter((a) => {
      if (!inRange(a.date, fromDate, toDate)) return false;
      if (tab !== 'all' && a.type !== tab) return false;
      return true;
    });
  }, [workerAdvances, tab, fromDate, toDate]);

  const stats = useMemo(() => {
    const filteredForTotals = workerAdvances.filter((a) => inRange(a.date, fromDate, toDate));
    const totalAdvances = filteredForTotals.filter((a) => a.type === 'advance').reduce((s, a) => s + a.amount, 0);
    const totalRepayments = filteredForTotals.filter((a) => a.type === 'repayment').reduce((s, a) => s + a.amount, 0);
    const balance = totalAdvances - totalRepayments;

    const byWorker = workers.map((w) => {
      const advs = filteredForTotals.filter((a) => a.workerId === w.id && a.type === 'advance');
      const reps = filteredForTotals.filter((a) => a.workerId === w.id && a.type === 'repayment');
      const totalAdv = advs.reduce((s, a) => s + a.amount, 0);
      const totalRep = reps.reduce((s, a) => s + a.amount, 0);
      return {
        worker: w,
        totalAdvances: totalAdv,
        totalRepayments: totalRep,
        balance: totalAdv - totalRep,
        operationsCount: advs.length + reps.length,
      };
    }).filter((s) => s.operationsCount > 0);

    return { totalAdvances, totalRepayments, balance, byWorker };
  }, [workerAdvances, workers, fromDate, toDate]);

  function openCreate(advanceType: WorkerAdvanceType) {
    setType(advanceType);
    setWorkerId(null);
    setAmount('');
    setNotes('');
    setModalVisible(true);
  }

  function handleSave() {
    if (!selectedWorker) {
      showAlert('تنبيه', 'يجب اختيار العامل');
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      showAlert('تنبيه', 'أدخل مبلغاً صحيحاً');
      return;
    }
    const result = addWorkerAdvance({
      workerId: selectedWorker.id,
      type,
      amount: amt,
      notes: notes.trim(),
    });
    if (result.error) {
      showAlert('خطأ', result.error);
      return;
    }
    setModalVisible(false);
    const successMsg = type === 'advance'
      ? `تم تسجيل سلفة ${formatCurrency(amt, settings.currency)} لـ ${selectedWorker.name}`
      : `تم تسجيل تسديد ${formatCurrency(amt, settings.currency)} من ${selectedWorker.name}`;
    showAlert('تم الحفظ', successMsg);
  }

  function confirmDelete(a: WorkerAdvance) {
    guard({
      title: a.type === 'advance' ? 'حذف سلفة' : 'حذف تسديد',
      description: `أدخل كلمة مرور المدير لحذف العملية`,
      action: () => deleteWorkerAdvance(a.id),
    });
  }

  async function handlePrint(action: PrintAction) {
    try {
      const html = buildWorkerAdvancesHtml(
        {
          advances: filtered,
          byWorker: stats.byWorker,
          totalAdvances: stats.totalAdvances,
          totalRepayments: stats.totalRepayments,
          balance: stats.balance,
          fromDate,
          toDate,
        },
        settings
      );
      await performPrint(html, `worker-advances-${Date.now()}`, action);
    } catch {
      showAlert('خطأ', 'تعذر تنفيذ الطباعة');
    }
  }

  async function handleCsv() {
    const rows: string[][] = [['#', 'العامل', 'النوع', 'المبلغ', 'التاريخ', 'ملاحظات', 'المستخدم']];
    filtered.forEach((a, i) => {
      rows.push([
        String(i + 1),
        a.workerName,
        a.type === 'advance' ? 'سلفة' : 'تسديد',
        String(a.amount),
        formatDateTime(a.date),
        a.notes || '—',
        a.userName,
      ]);
    });
    await exportCsv(rows, `worker-advances-${Date.now()}`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="سلفات العمال"
        subtitle={`${formatNumber(workerAdvances.length)} عملية`}
        right={
          <Pressable onPress={() => setPrintVisible(true)} hitSlop={8} style={styles.headerBtn}>
            <MaterialCommunityIcons name="printer" size={20} color={Colors.white} />
          </Pressable>
        }
      />

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: Colors.warningSoft, borderColor: Colors.warning }]}>
          <Text style={[styles.summaryLabel, { color: Colors.warning }]}>السلفات</Text>
          <Text style={[styles.summaryValue, { color: Colors.warning }]}>
            {formatCurrency(stats.totalAdvances, settings.currency)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: Colors.successSoft, borderColor: Colors.success }]}>
          <Text style={[styles.summaryLabel, { color: Colors.success }]}>المسدد</Text>
          <Text style={[styles.summaryValue, { color: Colors.success }]}>
            {formatCurrency(stats.totalRepayments, settings.currency)}
          </Text>
        </View>
        <View style={[styles.summaryCard, {
          backgroundColor: stats.balance > 0 ? Colors.dangerSoft : Colors.successSoft,
          borderColor: stats.balance > 0 ? Colors.danger : Colors.success,
        }]}>
          <Text style={[styles.summaryLabel, { color: stats.balance > 0 ? Colors.danger : Colors.success }]}>الرصيد</Text>
          <Text style={[styles.summaryValue, { color: stats.balance > 0 ? Colors.danger : Colors.success }]}>
            {formatCurrency(stats.balance, settings.currency)}
          </Text>
        </View>
      </View>

      <View style={styles.filterBox}>
        <DateRange fromDate={fromDate} toDate={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />
      </View>

      <View style={styles.tabsRow}>
        <FilterChip label={`الكل (${workerAdvances.length})`} active={tab === 'all'} onPress={() => setTab('all')} />
        <FilterChip label="السلفات" active={tab === 'advance'} onPress={() => setTab('advance')} />
        <FilterChip label="التسديد" active={tab === 'repayment'} onPress={() => setTab('repayment')} />
      </View>

      {canEdit ? (
        <View style={styles.actionsRow}>
          <Button
            title="سلفة جديدة"
            icon="cash-plus"
            onPress={() => openCreate('advance')}
            style={{ flex: 1 }}
          />
          <Button
            title="تسديد"
            icon="cash-check"
            variant="success"
            onPress={() => openCreate('repayment')}
            style={{ flex: 1 }}
          />
        </View>
      ) : null}

      {stats.byWorker.length > 0 ? (
        <View style={styles.workerStatsBox}>
          <Text style={styles.sectionTitle}>كشف حساب لكل عامل</Text>
          {stats.byWorker.map((s) => (
            <View key={s.worker.id} style={styles.workerStatRow}>
              <View style={[styles.workerStatBalance, {
                backgroundColor: s.balance > 0 ? Colors.dangerSoft : Colors.successSoft,
              }]}>
                <Text style={[styles.workerStatBalanceValue, {
                  color: s.balance > 0 ? Colors.danger : Colors.success,
                }]}>
                  {formatCurrency(s.balance, settings.currency)}
                </Text>
                <Text style={[styles.workerStatBalanceLabel, {
                  color: s.balance > 0 ? Colors.danger : Colors.success,
                }]}>{s.balance > 0 ? 'مديون' : 'مسدد'}</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.workerStatName}>{s.worker.name}</Text>
                <View style={styles.workerStatDetails}>
                  <Text style={styles.workerStatDetail}>
                    سلفة: {formatCurrency(s.totalAdvances, settings.currency)}
                  </Text>
                  <Text style={[styles.workerStatDetail, { color: Colors.success }]}>
                    مسدد: {formatCurrency(s.totalRepayments, settings.currency)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="hand-coin-outline"
            title="لا توجد عمليات"
            description={canEdit ? 'ابدأ بتسجيل سلفة أو تسديد لعامل' : 'لا توجد عمليات في هذه الفترة'}
          />
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              { borderRightWidth: 4, borderRightColor: item.type === 'advance' ? Colors.warning : Colors.success },
            ]}
          >
            {canEdit ? (
              <Pressable onPress={() => confirmDelete(item)} hitSlop={8} style={styles.actBtn}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.danger} />
              </Pressable>
            ) : null}
            <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
              <View style={styles.rowHead}>
                <View style={[styles.typeBadge, {
                  backgroundColor: item.type === 'advance' ? Colors.warningSoft : Colors.successSoft,
                }]}>
                  <Text style={[styles.typeBadgeText, {
                    color: item.type === 'advance' ? Colors.warning : Colors.success,
                  }]}>
                    {item.type === 'advance' ? 'سلفة' : 'تسديد'}
                  </Text>
                </View>
                <Text style={styles.workerName}>{item.workerName}</Text>
              </View>
              <Text style={[styles.amount, {
                color: item.type === 'advance' ? Colors.warning : Colors.success,
              }]}>
                {item.type === 'advance' ? '-' : '+'}{formatCurrency(item.amount, settings.currency)}
              </Text>
              {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
              <Text style={styles.metaRow}>{item.userName} • {formatDateTime(item.date)}</Text>
            </View>
          </View>
        )}
      />

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={type === 'advance' ? 'تسجيل سلفة' : 'تسجيل تسديد'}
        footer={
          <>
            <Button title="إلغاء" variant="secondary" onPress={() => setModalVisible(false)} style={{ flex: 1 }} />
            <Button title="حفظ" onPress={handleSave} style={{ flex: 1 }} />
          </>
        }
      >
        <Pressable onPress={() => setWorkerPickerVisible(true)} style={styles.pickerField}>
          <MaterialCommunityIcons name="chevron-down" size={20} color={Colors.textMuted} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={styles.pickerLabel}>العامل</Text>
            <Text style={[styles.pickerValue, !selectedWorker && { color: Colors.textMuted }]}>
              {selectedWorker ? selectedWorker.name : 'اختر عاملاً'}
            </Text>
            {selectedWorker ? (
              <Text style={styles.workerSubInfo}>
                {selectedWorker.jobTitle || '—'}
                {selectedWorker.phone ? ` • ${selectedWorker.phone}` : ''}
              </Text>
            ) : null}
          </View>
          <View style={[styles.pickerIcon, {
            backgroundColor: type === 'advance' ? Colors.warningSoft : Colors.successSoft,
          }]}>
            <MaterialCommunityIcons
              name={type === 'advance' ? 'cash-minus' : 'cash-plus'}
              size={20}
              color={type === 'advance' ? Colors.warning : Colors.success}
            />
          </View>
        </Pressable>

        <Input label="المبلغ" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
        <Input label="ملاحظات" value={notes} onChangeText={setNotes} placeholder="ملاحظات اختيارية" multiline />
      </Modal>

      <Modal visible={workerPickerVisible} onClose={() => setWorkerPickerVisible(false)} title="اختر عاملاً">
        {workers.length === 0 ? (
          <Text style={styles.emptyText}>لا يوجد عمال. أضف عاملاً من قبض العمال أولاً</Text>
        ) : (
          workers.map((w) => (
            <Pressable
              key={w.id}
              onPress={() => {
                setWorkerId(w.id);
                setWorkerPickerVisible(false);
              }}
              style={({ pressed }) => [styles.pickerRow, pressed && { opacity: 0.85 }]}
            >
              <MaterialCommunityIcons
                name={workerId === w.id ? 'check-circle' : 'circle-outline'}
                size={22}
                color={workerId === w.id ? Colors.primary : Colors.textMuted}
              />
              <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                <Text style={styles.pickerRowTitle}>{w.name}</Text>
                {w.jobTitle ? <Text style={styles.pickerRowSub}>{w.jobTitle}</Text> : null}
              </View>
            </Pressable>
          ))
        )}
      </Modal>

      <PrintMenu visible={printVisible} onClose={() => setPrintVisible(false)} onAction={handlePrint} showCsvOption onCsv={handleCsv} />
    </SafeAreaView>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && { opacity: 0.85 }]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerBtn: { backgroundColor: Colors.primary, width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  summaryRow: { flexDirection: 'row-reverse', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  summaryCard: { flex: 1, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1.5, alignItems: 'flex-end' },
  summaryLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  summaryValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, marginTop: 4 },
  filterBox: { padding: Spacing.lg, paddingBottom: Spacing.sm },
  tabsRow: { flexDirection: 'row-reverse', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  chip: { flex: 1, paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.text, fontWeight: FontWeight.medium, fontSize: FontSize.sm },
  chipTextActive: { color: Colors.white },
  actionsRow: { flexDirection: 'row-reverse', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  workerStatsBox: { backgroundColor: Colors.surface, marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm, gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text, textAlign: 'right', marginBottom: Spacing.sm },
  workerStatRow: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.sm, gap: Spacing.sm },
  workerStatBalance: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.md, alignItems: 'center', minWidth: 110 },
  workerStatBalanceValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  workerStatBalanceLabel: { fontSize: 10, fontWeight: FontWeight.semibold, marginTop: 2 },
  workerStatName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  workerStatDetails: { flexDirection: 'row-reverse', gap: Spacing.md, marginTop: 2 },
  workerStatDetail: { color: Colors.textSecondary, fontSize: FontSize.xs },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md, flexDirection: 'row-reverse', alignItems: 'flex-start', ...Shadow.sm },
  actBtn: { width: 36, height: 36, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  rowHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  typeBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  workerName: { color: Colors.text, fontWeight: FontWeight.bold, fontSize: FontSize.lg },
  amount: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginTop: 4 },
  notes: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 4, textAlign: 'right' },
  metaRow: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 4 },
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', padding: Spacing.lg },
  pickerField: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md, minHeight: 64 },
  pickerLabel: { color: Colors.textSecondary, fontSize: FontSize.xs },
  pickerValue: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginTop: 2 },
  workerSubInfo: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  pickerIcon: { width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  pickerRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickerRowTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  pickerRowSub: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
});
