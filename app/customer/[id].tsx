// Powered by OnSpace.AI
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { formatCurrency, formatDateTime, formatNumber } from '@/services/format';

export default function CustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    customers,
    sales,
    customerPayments,
    addCustomerPayment,
    deleteCustomerPayment,
    settings,
  } = useStore();
  const { canEdit } = useAuth();
  const { showAlert } = useAlert();
  const { guard } = useAdminGuard();
  const customer = customers.find((c) => c.id === id);

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const customerSales = useMemo(
    () => (customer ? sales.filter((s) => s.customerId === customer.id) : []),
    [sales, customer]
  );

  const customerPaymentsList = useMemo(
    () => (customer ? customerPayments.filter((p) => p.customerId === customer.id) : []),
    [customerPayments, customer]
  );

  const totals = useMemo(() => {
    const total = customerSales.reduce((s, sa) => s + sa.total, 0);
    const totalPaid = customerSales.reduce((s, sa) => s + (sa.paid || 0), 0);
    const paymentsTotal = customerPaymentsList.reduce((s, p) => s + p.amount, 0);
    return { total, count: customerSales.length, totalPaid, paymentsTotal };
  }, [customerSales, customerPaymentsList]);

  if (!customer) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="عميل" />
        <EmptyState icon="account-question-outline" title="عميل غير موجود" />
      </SafeAreaView>
    );
  }

  function handleAddPayment() {
    setPaymentAmount('');
    setPaymentNotes('');
    setPaymentModalVisible(true);
  }

  function handleSavePayment() {
    if (!customer) return;
    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) {
      showAlert('تنبيه', 'أدخل مبلغاً صحيحاً');
      return;
    }
    const result = addCustomerPayment({
      customerId: customer.id,
      customerName: customer.name,
      amount: amt,
      notes: paymentNotes.trim(),
    });
    if (result.error) {
      showAlert('خطأ', result.error);
      return;
    }
    setPaymentModalVisible(false);
    showAlert('تم القبض', `تم تسجيل دفعة ${formatCurrency(amt, settings.currency)}`);
  }

  function confirmDeletePayment(paymentId: string, paymentAmt: number) {
    guard({
      title: 'حذف دفعة',
      description: `سيتم حذف دفعة ${formatCurrency(paymentAmt, settings.currency)}`,
      action: () => deleteCustomerPayment(paymentId),
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={customer.name} subtitle="ملف العميل" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{customer.name.slice(0, 2)}</Text>
          </View>
          <Text style={styles.name}>{customer.name}</Text>
          {customer.phone ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{customer.phone}</Text>
              <MaterialCommunityIcons name="phone-outline" size={16} color={Colors.textMuted} />
            </View>
          ) : null}
          {customer.address ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{customer.address}</Text>
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={16}
                color={Colors.textMuted}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatNumber(totals.count)}</Text>
            <Text style={styles.statLabel}>عدد المشتريات</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: Colors.primary }]}>
              {formatCurrency(totals.total, settings.currency)}
            </Text>
            <Text style={styles.statLabel}>إجمالي المشتريات</Text>
          </View>
          <View style={styles.stat}>
            <Text
              style={[
                styles.statValue,
                { color: customer.debt > 0 ? Colors.danger : Colors.success },
              ]}
            >
              {formatCurrency(customer.debt, settings.currency)}
            </Text>
            <Text style={styles.statLabel}>المديونية</Text>
          </View>
        </View>

        {canEdit ? (
          <Button
            title="تسجيل دفعة"
            icon="cash-plus"
            onPress={handleAddPayment}
            fullWidth
          />
        ) : null}

        <View style={styles.paymentsSummary}>
          <View style={styles.paymentsSummaryItem}>
            <Text style={[styles.paymentsValue, { color: Colors.success }]}>
              {formatCurrency(totals.paymentsTotal, settings.currency)}
            </Text>
            <Text style={styles.paymentsLabel}>إجمالي الدفعات</Text>
          </View>
          <View style={styles.paymentsSummaryItem}>
            <Text style={[styles.paymentsValue, { color: Colors.info }]}>
              {customerPaymentsList.length}
            </Text>
            <Text style={styles.paymentsLabel}>عدد الدفعات</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>سجل الدفعات</Text>
        {customerPaymentsList.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="cash-multiple" size={28} color={Colors.textMuted} />
            <Text style={styles.emptyText}>لا توجد دفعات لهذا العميل</Text>
          </View>
        ) : (
          customerPaymentsList.map((p) => (
            <View key={p.id} style={styles.paymentRow}>
              {canEdit ? (
                <Pressable onPress={() => confirmDeletePayment(p.id, p.amount)} hitSlop={8}>
                  <MaterialCommunityIcons name="close-circle" size={20} color={Colors.danger} />
                </Pressable>
              ) : <View />}
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.paymentAmount}>
                  +{formatCurrency(p.amount, settings.currency)}
                </Text>
                {p.notes ? <Text style={styles.paymentNotes}>{p.notes}</Text> : null}
                <Text style={styles.paymentMeta}>
                  {p.userName} • {formatDateTime(p.date)}
                </Text>
              </View>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>سجل المشتريات</Text>
        {customerSales.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="cart-outline" size={28} color={Colors.textMuted} />
            <Text style={styles.emptyText}>لا توجد مشتريات لهذا العميل</Text>
          </View>
        ) : (
          customerSales.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => router.push(`/invoice/${s.id}` as any)}
              style={({ pressed }) => [styles.saleRow, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.saleAmount}>
                {formatCurrency(s.total, settings.currency)}
              </Text>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.saleNo}>فاتورة #{s.invoiceNo}</Text>
                <Text style={styles.saleDate}>{formatDateTime(s.date)}</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <Modal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        title={`دفعة من ${customer.name}`}
        footer={
          <>
            <Button title="إلغاء" variant="secondary" onPress={() => setPaymentModalVisible(false)} style={{ flex: 1 }} />
            <Button title="حفظ الدفعة" icon="check" onPress={handleSavePayment} style={{ flex: 1 }} />
          </>
        }
      >
        {customer.debt > 0 ? (
          <View style={styles.debtBox}>
            <Text style={styles.debtBoxLabel}>المديونية الحالية</Text>
            <Text style={styles.debtBoxValue}>{formatCurrency(customer.debt, settings.currency)}</Text>
          </View>
        ) : null}
        <Input
          label="المبلغ"
          value={paymentAmount}
          onChangeText={setPaymentAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
        <Input
          label="ملاحظات"
          value={paymentNotes}
          onChangeText={setPaymentNotes}
          placeholder="ملاحظات اختيارية"
          multiline
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxxl },
  profile: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.xl,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  avatar: { width: 72, height: 72, borderRadius: Radius.full, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  avatarText: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  name: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  metaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 6 },
  metaText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  statsRow: { flexDirection: 'row-reverse', gap: Spacing.sm },
  stat: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
  paymentsSummary: { flexDirection: 'row-reverse', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  paymentsSummaryItem: { flex: 1, alignItems: 'center' },
  paymentsValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  paymentsLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text, textAlign: 'right', marginTop: Spacing.md },
  emptyBox: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 8, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  paymentRow: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md },
  paymentAmount: { color: Colors.success, fontWeight: FontWeight.bold, fontSize: FontSize.md },
  paymentNotes: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2, textAlign: 'right' },
  paymentMeta: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 4 },
  saleRow: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, justifyContent: 'space-between' },
  saleNo: { color: Colors.text, fontWeight: FontWeight.semibold, fontSize: FontSize.md },
  saleDate: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  saleAmount: { color: Colors.primary, fontWeight: FontWeight.bold, fontSize: FontSize.md },
  debtBox: { backgroundColor: Colors.dangerSoft, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'flex-end' },
  debtBoxLabel: { color: Colors.danger, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  debtBoxValue: { color: Colors.danger, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginTop: 4 },
});
