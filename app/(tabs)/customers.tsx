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
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { Customer } from '@/constants/types';
import { formatCurrency, formatNumber } from '@/services/format';

type FormState = {
  name: string;
  phone: string;
  address: string;
  debt: string;
};

const empty: FormState = { name: '', phone: '', address: '', debt: '0' };

export default function CustomersScreen() {
  const router = useRouter();
  const { customers, addCustomer, updateCustomer, deleteCustomer, settings } = useStore();
  const { showAlert } = useAlert();

  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    );
  }, [customers, search]);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setErrors({});
    setModalVisible(true);
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone, address: c.address, debt: String(c.debt) });
    setErrors({});
    setModalVisible(true);
  }

  function handleSubmit() {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) next.name = 'الاسم مطلوب';
    setErrors(next);
    if (Object.keys(next).length) return;
    const data = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      debt: Number(form.debt) || 0,
    };
    if (editing) updateCustomer(editing.id, data);
    else addCustomer(data);
    setModalVisible(false);
  }

  function confirmDelete(c: Customer) {
    showAlert('حذف عميل', `هل تريد حذف "${c.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteCustomer(c.id) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="العملاء"
        subtitle={`${formatNumber(customers.length)} عميل`}
        showBack={false}
        right={
          <Pressable onPress={openCreate} hitSlop={8} style={styles.headerBtn}>
            <MaterialCommunityIcons name="plus" size={22} color={Colors.white} />
          </Pressable>
        }
      />
      <View style={styles.toolbar}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="بحث بالاسم أو الهاتف..."
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="account-group-outline"
            title="لا يوجد عملاء"
            description="أضف عملاءك لتتبع مشترياتهم وحساباتهم"
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/customer/${item.id}` as any)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.cardTop}>
              <View style={styles.actions}>
                <Pressable
                  onPress={() => confirmDelete(item)}
                  hitSlop={8}
                  style={({ pressed }) => [styles.actBtn, pressed && { opacity: 0.7 }]}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={18}
                    color={Colors.danger}
                  />
                </Pressable>
                <Pressable
                  onPress={() => openEdit(item)}
                  hitSlop={8}
                  style={({ pressed }) => [styles.actBtn, pressed && { opacity: 0.7 }]}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={Colors.info} />
                </Pressable>
              </View>
              <View style={styles.headRow}>
                <View style={{ alignItems: 'flex-end', flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.phone ? (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaText}>{item.phone}</Text>
                      <MaterialCommunityIcons
                        name="phone-outline"
                        size={14}
                        color={Colors.textMuted}
                      />
                    </View>
                  ) : null}
                </View>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                </View>
              </View>
            </View>
            {item.address ? (
              <View style={styles.metaRow}>
                <Text style={[styles.metaText, { flex: 1, textAlign: 'right' }]} numberOfLines={1}>
                  {item.address}
                </Text>
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={14}
                  color={Colors.textMuted}
                />
              </View>
            ) : null}
            <View style={styles.debtRow}>
              <Text
                style={[
                  styles.debtValue,
                  { color: item.debt > 0 ? Colors.danger : Colors.success },
                ]}
              >
                {formatCurrency(item.debt, settings.currency)}
              </Text>
              <Text style={styles.debtLabel}>المديونية</Text>
            </View>
          </Pressable>
        )}
      />

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editing ? 'تعديل عميل' : 'إضافة عميل'}
        footer={
          <>
            <Button
              title="إلغاء"
              variant="secondary"
              onPress={() => setModalVisible(false)}
              style={{ flex: 1 }}
            />
            <Button title="حفظ" onPress={handleSubmit} style={{ flex: 1 }} />
          </>
        }
      >
        <Input
          label="الاسم"
          value={form.name}
          onChangeText={(t) => setForm((p) => ({ ...p, name: t }))}
          placeholder="اسم العميل"
          error={errors.name}
        />
        <Input
          label="رقم الهاتف"
          value={form.phone}
          onChangeText={(t) => setForm((p) => ({ ...p, phone: t }))}
          placeholder="01xxxxxxxxx"
          keyboardType="phone-pad"
        />
        <Input
          label="العنوان"
          value={form.address}
          onChangeText={(t) => setForm((p) => ({ ...p, address: t }))}
          placeholder="العنوان التفصيلي"
        />
        <Input
          label="المديونية"
          value={form.debt}
          onChangeText={(t) => setForm((p) => ({ ...p, debt: t }))}
          placeholder="0"
          keyboardType="decimal-pad"
        />
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
  headerBtn: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  list: { padding: Spacing.lg, paddingTop: 0, gap: Spacing.md },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  cardTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  headRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
    marginRight: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.primary,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.md,
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'right',
  },
  actions: { flexDirection: 'row-reverse', gap: Spacing.sm },
  actBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: { fontSize: FontSize.sm, color: Colors.textSecondary },
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
});
