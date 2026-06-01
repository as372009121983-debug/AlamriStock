// Powered by OnSpace.AI
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrintMenu } from '@/components/ui/PrintMenu';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { Warehouse, WarehouseType } from '@/constants/types';
import { formatCurrency, formatNumber } from '@/services/format';
import { buildInventoryHtml, performPrint, PrintAction, exportCsv } from '@/services/print';

type FormState = { name: string; type: WarehouseType; address: string; phone: string; isDefault: boolean };
const empty: FormState = { name: '', type: 'main', address: '', phone: '', isDefault: false };

export default function WarehousesScreen() {
  const { warehouses, addWarehouse, updateWarehouse, deleteWarehouse, products, stocks, settings } = useStore();
  const { canEdit } = useAuth();
  const { showAlert } = useAlert();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [printForId, setPrintForId] = useState<string | null>(null);
  const [printAll, setPrintAll] = useState(false);

  const stats = useMemo(() => {
    return warehouses.map((w) => {
      const list = stocks.filter((s) => s.warehouseId === w.id);
      const totalQty = list.reduce((sum, s) => sum + s.quantity, 0);
      const value = list.reduce((sum, s) => {
        const p = products.find((pr) => pr.id === s.productId);
        return sum + s.quantity * (p?.purchasePrice || 0);
      }, 0);
      return { id: w.id, totalQty, value, items: list.length };
    });
  }, [warehouses, stocks, products]);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setModalVisible(true);
  }
  function openEdit(w: Warehouse) {
    setEditing(w);
    setForm({ name: w.name, type: w.type, address: w.address, phone: w.phone, isDefault: w.isDefault });
    setModalVisible(true);
  }
  function handleSubmit() {
    if (!form.name.trim()) {
      showAlert('تنبيه', 'الاسم مطلوب');
      return;
    }
    const data = { ...form, name: form.name.trim() };
    if (editing) updateWarehouse(editing.id, data);
    else addWarehouse(data);
    setModalVisible(false);
  }
  function confirmDelete(w: Warehouse) {
    showAlert('حذف موقع', `هل تريد حذف "${w.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: () => {
          const res = deleteWarehouse(w.id);
          if (!res.ok) showAlert('تعذر الحذف', res.message || '');
        },
      },
    ]);
  }
  async function handlePrint(action: PrintAction) {
    try {
      const target = printAll ? warehouses : warehouses.filter((w) => w.id === printForId);
      const rows: { name: string; barcode: string; qty: number; purchasePrice: number; salePrice: number; purchaseValue: number; saleValue: number }[] = [];
      let totalQty = 0;
      let totalPurchaseValue = 0;
      let totalSaleValue = 0;
      for (const p of products) {
        const qty = target.reduce((sum, w) => {
          const entry = stocks.find((s) => s.productId === p.id && s.warehouseId === w.id);
          return sum + (entry?.quantity || 0);
        }, 0);
        if (qty === 0) continue;
        const pv = qty * p.purchasePrice;
        const sv = qty * p.salePrice;
        rows.push({ name: p.name, barcode: p.barcode || '', qty, purchasePrice: p.purchasePrice, salePrice: p.salePrice, purchaseValue: pv, saleValue: sv });
        totalQty += qty;
        totalPurchaseValue += pv;
        totalSaleValue += sv;
      }
      const html = buildInventoryHtml({ rows, totalQty, totalPurchaseValue, totalSaleValue, fromDate: null, toDate: null }, settings);
      const name = printAll ? 'inventory-all' : `inventory-${printForId}`;
      await performPrint(html, name, action);
    } catch {
      showAlert('خطأ', 'تعذر تنفيذ الطباعة');
    }
  }
  async function handleCsv() {
    const rows: string[][] = [['المنتج', 'الباركود', 'الموقع', 'النوع', 'الكمية', 'سعر الشراء', 'القيمة']];
    const target = printAll ? warehouses : warehouses.filter((w) => w.id === printForId);
    for (const p of products) {
      for (const w of target) {
        const entry = stocks.find((s) => s.productId === p.id && s.warehouseId === w.id);
        const qty = entry?.quantity || 0;
        if (printAll || qty > 0) {
          rows.push([
            p.name,
            p.barcode || '',
            w.name,
            w.type === 'main' ? 'مخزن رئيسي' : 'معرض',
            String(qty),
            String(p.purchasePrice),
            String(qty * p.purchasePrice),
          ]);
        }
      }
    }
    await exportCsv(rows, `inventory-${Date.now()}`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="المخازن والمعارض"
        subtitle={`${formatNumber(warehouses.length)} موقع`}
        right={
          <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
            <Pressable
              onPress={() => {
                setPrintAll(true);
                setPrintForId(null);
              }}
              hitSlop={6}
              style={styles.headerBtnAlt}
            >
              <MaterialCommunityIcons name="printer" size={20} color={Colors.primary} />
            </Pressable>
            {canEdit ? (
              <Pressable onPress={openCreate} hitSlop={8} style={styles.headerBtn}>
                <MaterialCommunityIcons name="plus" size={22} color={Colors.white} />
              </Pressable>
            ) : null}
          </View>
        }
      />
      <FlatList
        data={warehouses}
        keyExtractor={(w) => w.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="warehouse"
            title="لا يوجد مخازن"
            description="ابدأ بإضافة مخزن رئيسي للمنتجات"
          />
        }
        renderItem={({ item }) => {
          const stat = stats.find((s) => s.id === item.id);
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
                  <Pressable
                    onPress={() => {
                      setPrintForId(item.id);
                      setPrintAll(false);
                    }}
                    hitSlop={6}
                    style={({ pressed }) => [styles.actBtn, pressed && { opacity: 0.7 }]}
                  >
                    <MaterialCommunityIcons name="printer" size={18} color={Colors.primary} />
                  </Pressable>
                  {canEdit ? (
                    <>
                      <Pressable
                        onPress={() => confirmDelete(item)}
                        hitSlop={6}
                        style={({ pressed }) => [styles.actBtn, pressed && { opacity: 0.7 }]}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.danger} />
                      </Pressable>
                      <Pressable
                        onPress={() => openEdit(item)}
                        hitSlop={6}
                        style={({ pressed }) => [styles.actBtn, pressed && { opacity: 0.7 }]}
                      >
                        <MaterialCommunityIcons name="pencil-outline" size={18} color={Colors.info} />
                      </Pressable>
                    </>
                  ) : null}
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.title}>{item.name}</Text>
                    {item.isDefault ? (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>افتراضي</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={[styles.typeTag, item.type === 'main' ? styles.typeMain : styles.typeShow]}>
                    <Text style={[styles.typeText, { color: item.type === 'main' ? Colors.primary : Colors.success }]}>
                      {item.type === 'main' ? 'مخزن رئيسي' : 'معرض'}
                    </Text>
                  </View>
                  {item.phone ? <Text style={styles.meta}>{item.phone}</Text> : null}
                  {item.address ? <Text style={styles.meta}>{item.address}</Text> : null}
                </View>
                <View style={[styles.icon, { backgroundColor: item.type === 'main' ? Colors.primarySoft : Colors.successSoft }]}>
                  <MaterialCommunityIcons
                    name={item.type === 'main' ? 'warehouse' : 'storefront-outline'}
                    size={22}
                    color={item.type === 'main' ? Colors.primary : Colors.success}
                  />
                </View>
              </View>
              <View style={styles.statRow}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{formatNumber(stat?.items || 0)}</Text>
                  <Text style={styles.statLabel}>أصناف</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{formatNumber(stat?.totalQty || 0)}</Text>
                  <Text style={styles.statLabel}>قطعة</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: Colors.primary }]}>
                    {formatCurrency(stat?.value || 0, settings.currency)}
                  </Text>
                  <Text style={styles.statLabel}>القيمة</Text>
                </View>
              </View>
            </View>
          );
        }}
      />

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editing ? 'تعديل موقع' : 'إضافة موقع'}
        footer={
          <>
            <Button title="إلغاء" variant="secondary" onPress={() => setModalVisible(false)} style={{ flex: 1 }} />
            <Button title="حفظ" onPress={handleSubmit} style={{ flex: 1 }} />
          </>
        }
      >
        <Input label="الاسم" value={form.name} onChangeText={(t) => setForm((p) => ({ ...p, name: t }))} />
        <Text style={styles.fieldLabel}>النوع</Text>
        <View style={{ flexDirection: 'row-reverse', gap: Spacing.md }}>
          <Pressable
            onPress={() => setForm((p) => ({ ...p, type: 'main' }))}
            style={[styles.typeOption, form.type === 'main' && styles.typeOptionActive]}
          >
            <MaterialCommunityIcons name="warehouse" size={20} color={form.type === 'main' ? Colors.white : Colors.primary} />
            <Text style={[styles.typeOptionText, form.type === 'main' && { color: Colors.white }]}>مخزن رئيسي</Text>
          </Pressable>
          <Pressable
            onPress={() => setForm((p) => ({ ...p, type: 'showroom' }))}
            style={[styles.typeOption, form.type === 'showroom' && styles.typeOptionActive]}
          >
            <MaterialCommunityIcons name="storefront-outline" size={20} color={form.type === 'showroom' ? Colors.white : Colors.success} />
            <Text style={[styles.typeOptionText, form.type === 'showroom' && { color: Colors.white }]}>معرض</Text>
          </Pressable>
        </View>
        <Input label="العنوان" value={form.address} onChangeText={(t) => setForm((p) => ({ ...p, address: t }))} />
        <Input label="رقم الهاتف" value={form.phone} onChangeText={(t) => setForm((p) => ({ ...p, phone: t }))} keyboardType="phone-pad" />
        <Pressable onPress={() => setForm((p) => ({ ...p, isDefault: !p.isDefault }))} style={styles.checkRow}>
          <View style={[styles.check, form.isDefault && styles.checkActive]}>
            {form.isDefault ? <MaterialCommunityIcons name="check" size={14} color={Colors.white} /> : null}
          </View>
          <Text style={styles.checkText}>تعيين كموقع افتراضي</Text>
        </Pressable>
      </Modal>

      <PrintMenu
        visible={!!printForId || printAll}
        onClose={() => {
          setPrintForId(null);
          setPrintAll(false);
        }}
        onAction={handlePrint}
        showCsvOption
        onCsv={handleCsv}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerBtn: { backgroundColor: Colors.primary, width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  headerBtnAlt: { backgroundColor: Colors.primarySoft, width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Spacing.lg, gap: Spacing.md },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md, ...Shadow.sm },
  cardTop: { flexDirection: 'row-reverse', alignItems: 'flex-start', justifyContent: 'space-between' },
  actBtn: { width: 36, height: 36, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 44, height: 44, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, textAlign: 'right' },
  defaultBadge: { backgroundColor: Colors.warningSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  defaultBadgeText: { color: Colors.warning, fontSize: 10, fontWeight: FontWeight.bold },
  typeTag: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  typeMain: { backgroundColor: Colors.primarySoft },
  typeShow: { backgroundColor: Colors.successSoft },
  typeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  meta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4 },
  statRow: { flexDirection: 'row-reverse', gap: Spacing.sm, marginTop: Spacing.md },
  stat: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4 },
  statValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text },
  fieldLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, textAlign: 'right' },
  typeOption: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, padding: Spacing.md, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md },
  typeOptionActive: { backgroundColor: Colors.primary },
  typeOptionText: { color: Colors.text, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  checkRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: Spacing.sm },
  check: { width: 22, height: 22, borderRadius: Radius.sm, borderWidth: 2, borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkText: { color: Colors.text, fontSize: FontSize.sm },
});
