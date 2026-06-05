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
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { Expense } from '@/constants/types';
import { formatCurrency, formatDateTime, formatNumber } from '@/services/format';

const CATEGORIES = ['إيجار', 'رواتب', 'كهرباء وماء', 'مواصلات', 'صيانة', 'مستلزمات', 'أخرى'];

export default function ExpensesScreen() {
  const { expenses, settings, addExpense, updateExpense, deleteExpense } = useStore();
  const { canEdit } = useAuth();
  const { showAlert } = useAlert();
  const { guard } = useAdminGuard();

  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [category, setCategory] = useState('إيجار');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const today = new Date();
  const dateText = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

  const filtered = useMemo(() => {
    if (filterCat === 'all') return expenses;
    return expenses.filter((e) => e.category === filterCat);
  }, [expenses, filterCat]);

  const total = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);

  function openCreate() {
    setEditing(null);
    setCategory('إيجار');
    setAmount('');
    setNotes('');
    setPaymentMethod('cash');
    setModalVisible(true);
  }

  function openEdit(e: Expense) {
    guard({
      title: 'تعديل مصروف',
      description: `أدخل كلمة مرور المدير لتعديل ${e.category}`,
      action: () => {
        setEditing(e);
        setCategory(e.category);
        setAmount(String(e.amount));
        setNotes(e.notes);
        setModalVisible(true);
      },
    });
  }

  function handleSubmit() {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      showAlert('تنبيه', 'أدخل مبلغاً صحيحاً');
      return;
    }
    if (editing) {
      updateExpense(editing.id, { category, amount: amt, notes });
    } else {
      addExpense({ category, amount: amt, notes });
    }
    setModalVisible(false);
  }

  function confirmDelete(e: Expense) {
    guard({
      title: 'حذف مصروف',
      description: `أدخل كلمة مرور المدير لحذف ${e.category}`,
      action: () => deleteExpense(e.id),
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="المصروفات"
        right={
          <Pressable onPress={() => setMenuVisible(true)} hitSlop={8} style={styles.menuBtn}>
            <MaterialCommunityIcons name="dots-vertical" size={22} color={Colors.text} />
          </Pressable>
        }
      />

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>إجمالي المصروفات</Text>
        <Text style={styles.summaryValue}>{formatCurrency(total, settings.currency)}</Text>
      </View>

      <View style={styles.tabs}>
        <FlatList
          data={['all', ...CATEGORIES]}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: Spacing.sm, alignItems: 'center' }}
          keyExtractor={(c) => c}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setFilterCat(item)}
              style={({ pressed }) => [styles.chip, filterCat === item && styles.chipActive, pressed && { opacity: 0.85 }]}
            >
              <Text style={[styles.chipText, filterCat === item && styles.chipTextActive]}>
                {item === 'all' ? 'الكل' : item}
              </Text>
            </Pressable>
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="cash-minus"
            title="لا توجد مصروفات"
            description="اضغط + لتسجيل أول مصروف"
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
              {canEdit ? (
                <>
                  <Pressable onPress={() => confirmDelete(item)} hitSlop={8} style={styles.actBtn}>
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.danger} />
                  </Pressable>
                  <Pressable onPress={() => openEdit(item)} hitSlop={8} style={styles.actBtn}>
                    <MaterialCommunityIcons name="pencil-outline" size={18} color={Colors.info} />
                  </Pressable>
                </>
              ) : null}
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
              <View style={styles.catTag}>
                <Text style={styles.catText}>{item.category}</Text>
              </View>
              <Text style={styles.amount}>{formatCurrency(item.amount, settings.currency)}</Text>
              {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
              <Text style={styles.metaRow}>
                {item.userName} • {formatDateTime(item.date)}
              </Text>
            </View>
          </View>
        )}
      />

      {canEdit ? (
        <Pressable
          onPress={openCreate}
          style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
        >
          <MaterialCommunityIcons name="plus" size={28} color={Colors.white} />
        </Pressable>
      ) : null}

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editing ? 'تعديل مصروف' : 'اضافة مصروف جديد'}
        footer={
          <Button title="حفظ" onPress={handleSubmit} fullWidth size="lg" />
        }
      >
        <Text style={styles.fieldLabel}>جهة الصرف</Text>
        <View style={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: Spacing.sm }}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={({ pressed }) => [
                styles.catChip,
                category === c && styles.catChipActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.catChipText, category === c && { color: Colors.white }]}>{c}</Text>
            </Pressable>
          ))}
        </View>
        <Input
          label="المبلغ"
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          keyboardType="decimal-pad"
        />
        <View style={styles.dateBox}>
          <MaterialCommunityIcons name="calendar" size={18} color={Colors.primary} />
          <Text style={styles.dateText}>{dateText}</Text>
        </View>
        <Input
          label="ملاحظات"
          value={notes}
          onChangeText={setNotes}
          placeholder=""
          multiline
          numberOfLines={4}
          style={{ minHeight: 100, textAlignVertical: 'top' }}
        />
        <View style={styles.payRow}>
          <Pressable
            onPress={() => setPaymentMethod('cash')}
            style={[
              styles.payChip,
              paymentMethod === 'cash' && styles.payChipActive,
            ]}
          >
            <Text style={[styles.payChipText, paymentMethod === 'cash' && { color: Colors.white }]}>كاش</Text>
          </Pressable>
          <Text style={styles.payLabel}>الدفع:</Text>
        </View>
      </Modal>

      <Modal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        title="خيارات"
      >
        <Pressable
          onPress={() => { setMenuVisible(false); }}
          style={styles.menuRow}
        >
          <MaterialCommunityIcons name="chevron-left" size={20} color={Colors.textMuted} />
          <Text style={styles.menuLabel}>عرض المصروفات</Text>
        </Pressable>
        <Pressable
          onPress={() => { setMenuVisible(false); openCreate(); }}
          style={styles.menuRow}
        >
          <MaterialCommunityIcons name="chevron-left" size={20} color={Colors.textMuted} />
          <Text style={styles.menuLabel}>إضافة مصروف جديد</Text>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  menuBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  summary: {
    backgroundColor: Colors.danger,
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    alignItems: 'flex-end',
    ...Shadow.sm,
  },
  summaryLabel: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm },
  summaryValue: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginTop: 4 },
  tabs: { paddingVertical: Spacing.md },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.text, fontWeight: FontWeight.medium, fontSize: FontSize.sm },
  chipTextActive: { color: Colors.white },
  list: { padding: Spacing.lg, paddingTop: 0, paddingBottom: 120, gap: Spacing.md },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    ...Shadow.sm,
  },
  actBtn: {
    width: 36, height: 36, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  catTag: {
    backgroundColor: Colors.dangerSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  catText: { color: Colors.danger, fontWeight: FontWeight.semibold, fontSize: FontSize.xs },
  amount: { color: Colors.danger, fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginTop: 4 },
  notes: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 4, textAlign: 'right' },
  metaRow: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 4 },
  fab: {
    position: 'absolute',
    bottom: 28,
    left: 20,
    width: 60,
    height: 60,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  fieldLabel: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium, textAlign: 'right' },
  catChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
  },
  catChipActive: { backgroundColor: Colors.primary },
  catChipText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  dateBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: 14,
  },
  dateText: { color: Colors.primary, fontWeight: FontWeight.bold, fontSize: FontSize.md },
  payRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  payLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  payChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  payChipActive: { backgroundColor: Colors.primary },
  payChipText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
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
