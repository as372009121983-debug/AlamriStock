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
import { SearchBar } from '@/components/ui/SearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { DateRange } from '@/components/ui/DateRange';
import { PrintMenu } from '@/components/ui/PrintMenu';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { CustomerPayment } from '@/constants/types';
import { formatCurrency, formatDateTime, formatNumber, inRange } from '@/services/format';
import { buildCustomerPaymentsHtml, performPrint, PrintAction, exportCsv } from '@/services/print';

export default function CustomerPaymentsScreen() {
  const { customers, customerPayments, addCustomerPayment, deleteCustomerPayment, settings } = useStore();
  const { canEdit } = useAuth();
  const { showAlert } = useAlert();
  const { guard } = useAdminGuard();

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState<number | null>(null);
  const [toDate, setToDate] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [printVisible, setPrintVisible] = useState(false);
  const [customerPickerVisible, setCustomerPickerVisible] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customerPayments.filter((p) => {
      if (!inRange(p.date, fromDate, toDate)) return false;
      if (q && !p.customerName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [customerPayments, search, fromDate, toDate]);

  const total = useMemo(() => filtered.reduce((s, p) => s + p.amount, 0), [filtered]);

  function openCreate() {
    setCustomerId(null);
    setAmount('');
    setNotes('');
    setModalVisible(true);
  }

  function handleSave() {
    if (!selectedCustomer) {
      showAlert('تنبيه', 'يجب اختيار العميل');
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      showAlert('تنبيه', 'أدخل مبلغاً صحيحاً');
      return;
    }
    const result = addCustomerPayment({
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      amount: amt,
      notes: notes.trim(),
    });
    if (result.error) {
      showAlert('خطأ', result.error);
      return;
    }
    setModalVisible(false);
    showAlert('تم الحفظ', `تم تسجيل دفعة ${formatCurrency(amt, settings.currency)}`);
  }

  function confirmDelete(p: CustomerPayment) {
    guard({
      title: 'حذف دفعة',
      description: `أدخل كلمة مرور المدير لحذف دفعة ${p.customerName}`,
      action: () => deleteCustomerPayment(p.id),
    });
  }

  async function handlePrint(action: PrintAction) {
    try {
      const html = buildCustomerPaymentsHtml(filtered, total, fromDate, toDate, settings);
      await performPrint(html, `customer-payments-${Date.now()}`, action);
    } catch {
      showAlert('خطأ', 'تعذر تنفيذ الطباعة');
    }
  }

  async function handleCsv() {
    const rows: string[][] = [['#', 'العميل', 'المبلغ', 'التاريخ', 'ملاحظات', 'المستخدم']];
    filtered.forEach((p, i) => {
      rows.push([
        String(i + 1),
        p.customerName,
        String(p.amount),
        formatDateTime(p.date),
        p.notes || '—',
        p.userName,
      ]);
    });
    await exportCsv(rows, `customer-payments-${Date.now()}`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="دفعات العملاء"
        subtitle={`${formatNumber(filtered.length)} دفعة`}
        right={
          <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
            <Pressable onPress={() => setPrintVisible(true)} hitSlop={8} style={styles.headerBtn}>
              <MaterialCommunityIcons name="printer" size={20} color={Colors.white} />
            </Pressable>
            {canEdit ? (
              <Pressable onPress={openCreate} hitSlop={8} style={styles.headerBtn}>
                <MaterialCommunityIcons name="plus" size={22} color={Colors.white} />
              </Pressable>
            ) : null}
          </View>
        }
      />
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>إجمالي الدفعات في الفترة</Text>
        <Text style={styles.summaryValue}>{formatCurrency(total, settings.currency)}</Text>
      </View>
      <View style={styles.filterBox}>
        <DateRange fromDate={fromDate} toDate={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />
        <View style={{ marginTop: Spacing.sm }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="بحث باسم العميل..." />
        </View>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon="cash-multiple" title="لا توجد دفعات" description="ابدأ بتسجيل دفعة من عميل" />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {canEdit ? (
              <Pressable onPress={() => confirmDelete(item)} hitSlop={8} style={styles.actBtn}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.danger} />
              </Pressable>
            ) : null}
            <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
              <Text style={styles.customerName}>{item.customerName}</Text>
              <Text style={styles.amount}>+{formatCurrency(item.amount, settings.currency)}</Text>
              {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
              <Text style={styles.metaRow}>
                {item.userName} • {formatDateTime(item.date)}
              </Text>
            </View>
          </View>
        )}
      />

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="تسجيل دفعة عميل"
        footer={
          <>
            <Button title="إلغاء" variant="secondary" onPress={() => setModalVisible(false)} style={{ flex: 1 }} />
            <Button title="حفظ" onPress={handleSave} style={{ flex: 1 }} />
          </>
        }
      >
        <Pressable
          onPress={() => setCustomerPickerVisible(true)}
          style={styles.pickerField}
        >
          <MaterialCommunityIcons name="chevron-down" size={20} color={Colors.textMuted} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={styles.pickerLabel}>العميل</Text>
            <Text style={[styles.pickerValue, !selectedCustomer && { color: Colors.textMuted }]}>
              {selectedCustomer ? selectedCustomer.name : 'اختر عميلاً'}
            </Text>
            {selectedCustomer && selectedCustomer.debt > 0 ? (
              <Text style={styles.debtHint}>
                المديونية: {formatCurrency(selectedCustomer.debt, settings.currency)}
              </Text>
            ) : null}
          </View>
          <View style={styles.pickerIcon}>
            <MaterialCommunityIcons name="account" size={20} color={Colors.primary} />
          </View>
        </Pressable>

        <Input label="المبلغ" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
        <Input label="ملاحظات" value={notes} onChangeText={setNotes} placeholder="ملاحظات اختيارية" multiline />
      </Modal>

      <Modal
        visible={customerPickerVisible}
        onClose={() => setCustomerPickerVisible(false)}
        title="اختر عميلاً"
      >
        {customers.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => {
              setCustomerId(c.id);
              setCustomerPickerVisible(false);
            }}
            style={({ pressed }) => [styles.pickerRow, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons
              name={customerId === c.id ? 'check-circle' : 'circle-outline'}
              size={22}
              color={customerId === c.id ? Colors.primary : Colors.textMuted}
            />
            <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
              <Text style={styles.pickerRowTitle}>{c.name}</Text>
              {c.debt > 0 ? (
                <Text style={[styles.pickerRowSub, { color: Colors.danger }]}>
                  مديون: {formatCurrency(c.debt, settings.currency)}
                </Text>
              ) : c.phone ? (
                <Text style={styles.pickerRowSub}>{c.phone}</Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </Modal>

      <PrintMenu visible={printVisible} onClose={() => setPrintVisible(false)} onAction={handlePrint} showCsvOption onCsv={handleCsv} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerBtn: { backgroundColor: Colors.primary, width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  summaryCard: { backgroundColor: Colors.success, padding: Spacing.lg, marginHorizontal: Spacing.lg, marginTop: Spacing.lg, borderRadius: Radius.lg, alignItems: 'flex-end', ...Shadow.md },
  summaryLabel: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm },
  summaryValue: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginTop: 4 },
  filterBox: { padding: Spacing.lg },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md, flexDirection: 'row-reverse', alignItems: 'flex-start', ...Shadow.sm },
  actBtn: { width: 36, height: 36, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  customerName: { color: Colors.text, fontWeight: FontWeight.bold, fontSize: FontSize.lg },
  amount: { color: Colors.success, fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginTop: 4 },
  notes: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 4, textAlign: 'right' },
  metaRow: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 4 },
  pickerField: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, gap: Spacing.md, minHeight: 64,
  },
  pickerLabel: { color: Colors.textSecondary, fontSize: FontSize.xs },
  pickerValue: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginTop: 2 },
  debtHint: { color: Colors.danger, fontSize: FontSize.xs, marginTop: 4 },
  pickerIcon: { width: 40, height: 40, borderRadius: Radius.full, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  pickerRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickerRowTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  pickerRowSub: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
});
