// Powered by OnSpace.AI
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { Supplier } from '@/constants/types';
import { formatCurrency, formatNumber } from '@/services/format';

type FormState = { name: string; phone: string; address: string };
const empty: FormState = { name: '', phone: '', address: '' };

export default function SuppliersScreen() {
  const { suppliers, purchases, addSupplier, updateSupplier, deleteSupplier, settings } =
    useStore();
  const { showAlert } = useAlert();

  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.phone.toLowerCase().includes(q)
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
    setForm({ name: s.name, phone: s.phone, address: s.address });
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
      <Header
        title="الموردين"
        subtitle={`${formatNumber(suppliers.length)} مورد`}
        right={
          <Pressable onPress={openCreate} hitSlop={8} style={styles.headerBtn}>
            <MaterialCommunityIcons name="plus" size={22} color={Colors.white} />
          </Pressable>
        }
      />
      <View style={styles.toolbar}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="بحث..." />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="truck-delivery-outline"
            title="لا يوجد موردين"
            description="ابدأ بإضافة موردي البضاعة"
          />
        }
        renderItem={({ item }) => {
          const totals = totalsForSupplier(item.id);
          return (
            <View style={styles.card}>
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
                    <MaterialCommunityIcons
                      name="pencil-outline"
                      size={18}
                      color={Colors.info}
                    />
                  </Pressable>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                  <Text style={styles.title}>{item.name}</Text>
                  {item.phone ? (
                    <View style={styles.metaRow}>
                      <Text style={styles.meta}>{item.phone}</Text>
                      <MaterialCommunityIcons
                        name="phone-outline"
                        size={14}
                        color={Colors.textMuted}
                      />
                    </View>
                  ) : null}
                  {item.address ? (
                    <View style={styles.metaRow}>
                      <Text style={styles.meta} numberOfLines={1}>{item.address}</Text>
                      <MaterialCommunityIcons
                        name="map-marker-outline"
                        size={14}
                        color={Colors.textMuted}
                      />
                    </View>
                  ) : null}
                </View>
                <View style={styles.avatar}>
                  <MaterialCommunityIcons
                    name="truck-delivery-outline"
                    size={22}
                    color={Colors.warning}
                  />
                </View>
              </View>
              <View style={styles.statRow}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>عدد التوريدات</Text>
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

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editing ? 'تعديل مورد' : 'إضافة مورد'}
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
          label="اسم المورد"
          value={form.name}
          onChangeText={(t) => setForm((p) => ({ ...p, name: t }))}
          error={errors.name}
        />
        <Input
          label="رقم الهاتف"
          value={form.phone}
          onChangeText={(t) => setForm((p) => ({ ...p, phone: t }))}
          keyboardType="phone-pad"
        />
        <Input
          label="العنوان"
          value={form.address}
          onChangeText={(t) => setForm((p) => ({ ...p, address: t }))}
        />
      </Modal>
    </SafeAreaView>
  );
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'right',
  },
  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  meta: { fontSize: FontSize.sm, color: Colors.textSecondary },
  statRow: {
    flexDirection: 'row-reverse',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  stat: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  statValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: 4,
  },
});
