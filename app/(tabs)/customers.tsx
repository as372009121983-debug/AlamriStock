// Powered by OnSpace.AI
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/hooks/useStore';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { Header } from '@/components/ui/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PhoneField } from '@/components/ui/PhoneField';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { Customer } from '@/constants/types';
import { formatCurrency, formatNumber } from '@/services/format';

const CATEGORIES = ['عملاء قطاعي', 'جملة', 'جملة خاصة', 'مقاولين', 'متاجر', 'أخرى'];

type FormState = {
  name: string;
  phone: string;
  address: string;
  debt: string;
  category: string;
  maxDebt: string;
  notes: string;
};

const empty: FormState = { name: '', phone: '', address: '', debt: '0', category: '', maxDebt: '', notes: '' };

export default function CustomersScreen() {
  const router = useRouter();
  const { customers, addCustomer, updateCustomer, deleteCustomer, settings } = useStore();
  const { guard } = useAdminGuard();

  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
    );
  }, [customers, search]);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setErrors({});
    setModalVisible(true);
  }

  function openEdit(c: Customer) {
    guard({
      title: 'تعديل عميل',
      description: `أدخل كلمة مرور المدير لتعديل "${c.name}"`,
      action: () => {
        setEditing(c);
        setForm({
          name: c.name,
          phone: c.phone,
          address: c.address,
          debt: String(c.debt),
          category: c.category || '',
          maxDebt: c.maxDebt ? String(c.maxDebt) : '',
          notes: c.notes || '',
        });
        setErrors({});
        setModalVisible(true);
      },
    });
  }

  function handleSubmit() {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = 'اسم العميل مطلوب';
    setErrors(next);
    if (Object.keys(next).length) return;
    const data = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      debt: Number(form.debt) || 0,
      category: form.category.trim() || undefined,
      maxDebt: form.maxDebt ? Number(form.maxDebt) : undefined,
      notes: form.notes.trim() || undefined,
    };
    if (editing) updateCustomer(editing.id, data);
    else addCustomer(data);
    setModalVisible(false);
  }

  function confirmDelete(c: Customer) {
    guard({
      title: 'حذف عميل',
      description: `أدخل كلمة مرور المدير لحذف "${c.name}"`,
      action: () => deleteCustomer(c.id),
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="العملاء" />
      <View style={styles.toolbar}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="ادخل اسم العميل" />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="account-search"
            title="لا يوجد عملاء قم باضافة عميل جديد"
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/customer/${item.id}` as any)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.cardRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
              </View>
              <View style={{ flex: 1, marginRight: Spacing.md, alignItems: 'flex-end' }}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                {item.phone ? (
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{item.phone}</Text>
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
            <View style={styles.debtRow}>
              <Text
                style={[styles.debtValue, { color: item.debt > 0 ? Colors.danger : Colors.success }]}
              >
                {formatCurrency(item.debt, settings.currency)}
              </Text>
              <Text style={styles.debtLabel}>المديونية</Text>
            </View>
          </Pressable>
        )}
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
        title={editing ? 'تعديل عميل' : 'اضافة عميل جديد'}
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
          label="اسم العميل"
          value={form.name}
          onChangeText={(t) => setForm((p) => ({ ...p, name: t }))}
          placeholder="اسم العميل (مطلوب)"
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

        {editing ? (
          <Input
            label="المديونية الحالية"
            value={form.debt}
            onChangeText={(t) => setForm((p) => ({ ...p, debt: t }))}
            placeholder="0"
            keyboardType="decimal-pad"
          />
        ) : null}
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '؟';
  if (parts.length === 1) return parts[0].slice(0, 1);
  return parts[0].slice(0, 1) + parts[1].slice(0, 1);
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
    backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: Colors.primary, fontWeight: FontWeight.bold, fontSize: FontSize.md },
  cardTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  metaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 4 },
  metaText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  catTag: {
    marginTop: 6,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  catText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  cardActions: { flexDirection: 'row-reverse', gap: 6 },
  iconBtn: { width: 32, height: 32, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  debtRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    marginTop: Spacing.md,
  },
  debtLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  debtValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
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
