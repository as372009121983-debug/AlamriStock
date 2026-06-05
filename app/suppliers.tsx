// Powered by OnSpace.AI
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/hooks/useStore';
import { useAlert } from '@/template';
import { Header } from '@/components/ui/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PhoneField } from '@/components/ui/PhoneField';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { Supplier } from '@/constants/types';
import { formatCurrency, formatNumber } from '@/services/format';

const CATEGORIES = ['أدوات صحية', 'سباكة', 'سيراميك', 'كهرباء', 'مواسير', 'أخرى'];

type FormState = {
  name: string;
  phone: string;
  address: string;
  category: string;
  maxDebt: string;
  notes: string;
};

const empty: FormState = { name: '', phone: '', address: '', category: '', maxDebt: '', notes: '' };

export default function SuppliersScreen() {
  const router = useRouter();
  const { suppliers, purchases, addSupplier, updateSupplier, deleteSupplier, settings } = useStore();
  const { showAlert } = useAlert();

  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) => s.name.toLowerCase().includes(q) || s.phone.toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  function totalsForSupplier(id: string) {
    const list = purchases.filter((p) => p.supplierId === id);
    const total = list.reduce((s, p) => s + p.total, 0);
    return { count: list.length, total };
  }

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setErrors({});
    setModalVisible(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setForm({
      name: s.name,
      phone: s.phone,
      address: s.address,
      category: s.category || '',
      maxDebt: s.maxDebt ? String(s.maxDebt) : '',
      notes: s.notes || '',
    });
    setErrors({});
    setModalVisible(true);
  }

  function handleSubmit() {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = 'اسم المورد مطلوب';
    setErrors(next);
    if (Object.keys(next).length) return;
    const data = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      category: form.category.trim() || undefined,
      maxDebt: form.maxDebt ? Number(form.maxDebt) : undefined,
      notes: form.notes.trim() || undefined,
    };
    if (editing) updateSupplier(editing.id, data);
    else addSupplier(data);
    setModalVisible(false);
  }

  function confirmDelete(s: Supplier) {
    showAlert('حذف مورد', `هل تريد حذف "${s.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteSupplier(s.id) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="الموردين" />
      <View style={styles.toolbar}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="ادخل اسم المورد" />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="truck-outline"
            title="لا يوجد موردين قم باضافة مورد جديد"
          />
        }
        renderItem={({ item }) => {
          const totals = totalsForSupplier(item.id);
          return (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.avatar}>
                  <MaterialCommunityIcons name="truck-outline" size={22} color={Colors.warning} />
                </View>
                <View style={{ flex: 1, marginRight: Spacing.md, alignItems: 'flex-end' }}>
                  <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
                  {item.phone ? (
                    <View style={styles.metaRow}>
                      <Text style={styles.meta}>{item.phone}</Text>
                      <MaterialCommunityIcons name="phone-outline" size={14} color={Colors.textMuted} />
                    </View>
                  ) : null}
                  {item.category ? (
                    <View style={styles.catTag}>
                      <Text style={styles.catText}>{item.category}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.cardActions}>
                  <Pressable onPress={() => openEdit(item)} hitSlop={8} style={styles.iconBtn}>
                    <MaterialCommunityIcons name="pencil-outline" size={18} color={Colors.info} />
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(item)} hitSlop={8} style={styles.iconBtn}>
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.danger} />
                  </Pressable>
                </View>
              </View>
              <View style={styles.statRow}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>التوريدات</Text>
                  <Text style={styles.statValue}>{formatNumber(totals.count)}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>الإجمالي</Text>
                  <Text style={[styles.statValue, { color: Colors.primary }]}>
                    {formatCurrency(totals.total, settings.currency)}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
      />

      <Pressable
        onPress={openCreate}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
      >
        <MaterialCommunityIcons name="plus" size={28} color={Colors.white} />
      </Pressable>

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editing ? 'تعديل مورد' : 'اضافة مورد جديد'}
        footer={
          <Button
            title="حفظ"
            onPress={handleSubmit}
            fullWidth
            size="lg"
          />
        }
      >
        {!editing ? (
          <Pressable
            onPress={() => router.push('/import-contacts')}
            style={styles.contactLink}
          >
            <MaterialCommunityIcons name="contacts-outline" size={18} color={Colors.primary} />
            <Text style={styles.contactLinkText}>إضافة من جهات الاتصال</Text>
          </Pressable>
        ) : null}
        <Input
          label="اسم المورد"
          value={form.name}
          onChangeText={(t) => setForm((p) => ({ ...p, name: t }))}
          placeholder="اسم المورد (مطلوب)"
          error={errors.name}
        />
        <PhoneField
          label="رقم الهاتف"
          value={form.phone}
          onChangeText={(t) => setForm((p) => ({ ...p, phone: t }))}
          placeholder="رقم الهاتف"
        />
        <Input
          label="العنوان"
          value={form.address}
          onChangeText={(t) => setForm((p) => ({ ...p, address: t }))}
          placeholder="العنوان"
        />

        <View>
          <Text style={styles.fieldLabel}>التصنيف</Text>
          <Pressable
            onPress={() => setCategoryPickerVisible(true)}
            style={styles.pickerField}
          >
            <MaterialCommunityIcons name="chevron-down" size={20} color={Colors.textMuted} />
            <Text style={[styles.pickerValue, !form.category && { color: Colors.textMuted }]}>
              {form.category || 'التصنيف'}
            </Text>
          </Pressable>
        </View>

        <Input
          label="اقصي حد للمديونية"
          value={form.maxDebt}
          onChangeText={(t) => setForm((p) => ({ ...p, maxDebt: t }))}
          placeholder="بدون حد"
          keyboardType="decimal-pad"
        />

        <Input
          label="ملاحظات"
          value={form.notes}
          onChangeText={(t) => setForm((p) => ({ ...p, notes: t }))}
          placeholder="ملاحظات اختيارية"
          multiline
          numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />
      </Modal>

      <Modal
        visible={categoryPickerVisible}
        onClose={() => setCategoryPickerVisible(false)}
        title="اختر التصنيف"
      >
        <Pressable
          onPress={() => {
            setForm((p) => ({ ...p, category: '' }));
            setCategoryPickerVisible(false);
          }}
          style={styles.pickerRow}
        >
          <MaterialCommunityIcons
            name={!form.category ? 'check-circle' : 'circle-outline'}
            size={22}
            color={!form.category ? Colors.primary : Colors.textMuted}
          />
          <Text style={styles.pickerRowText}>بدون تصنيف</Text>
        </Pressable>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            onPress={() => {
              setForm((p) => ({ ...p, category: cat }));
              setCategoryPickerVisible(false);
            }}
            style={styles.pickerRow}
          >
            <MaterialCommunityIcons
              name={form.category === cat ? 'check-circle' : 'circle-outline'}
              size={22}
              color={form.category === cat ? Colors.primary : Colors.textMuted}
            />
            <Text style={styles.pickerRowText}>{cat}</Text>
          </Pressable>
        ))}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  toolbar: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  list: { padding: Spacing.lg, paddingTop: 0, paddingBottom: 120 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  cardRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.md },
  avatar: {
    width: 48, height: 48, borderRadius: Radius.full,
    backgroundColor: Colors.warningSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  cardActions: { flexDirection: 'row-reverse', gap: 6 },
  iconBtn: { width: 32, height: 32, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  metaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 4 },
  meta: { fontSize: FontSize.sm, color: Colors.textSecondary },
  catTag: {
    marginTop: 6,
    backgroundColor: Colors.warningSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  catText: { color: Colors.warning, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  statRow: { flexDirection: 'row-reverse', gap: Spacing.md, marginTop: Spacing.md },
  stat: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  statValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text, marginTop: 4 },
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
  contactLink: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 8,
    paddingVertical: 6,
  },
  contactLinkText: { color: Colors.primary, fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  fieldLabel: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: 8, textAlign: 'right' },
  pickerField: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    minHeight: 52,
    gap: 8,
  },
  pickerValue: { flex: 1, color: Colors.text, fontSize: FontSize.md, textAlign: 'right' },
  pickerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerRowText: { flex: 1, color: Colors.text, fontSize: FontSize.md, textAlign: 'right' },
});
