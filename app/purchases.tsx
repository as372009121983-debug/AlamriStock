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
import { PickerField } from '@/components/ui/Picker';
import { PrintMenu } from '@/components/ui/PrintMenu';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { PurchaseItem } from '@/constants/types';
import { formatCurrency, formatDateTime, formatNumber } from '@/services/format';
import { buildPurchaseInvoiceHtml, performPrint, PrintAction } from '@/services/print';

export default function PurchasesScreen() {
  const { purchases, products, suppliers, warehouses, createPurchase, deletePurchase, settings, defaultMainWarehouseId } = useStore();
  const { canEdit } = useAuth();
  const { showAlert } = useAlert();

  const [modalVisible, setModalVisible] = useState(false);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState<string>(defaultMainWarehouseId || '');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [productPickerVisible, setProductPickerVisible] = useState(false);
  const [supplierPickerVisible, setSupplierPickerVisible] = useState(false);
  const [warehousePickerVisible, setWarehousePickerVisible] = useState(false);
  const [printItem, setPrintItem] = useState<string | null>(null);

  const total = useMemo(() => items.reduce((s, it) => s + it.price * it.quantity, 0), [items]);
  const mainWarehouses = warehouses.filter((w) => w.type === 'main');

  function openCreate() {
    if (mainWarehouses.length === 0) {
      showAlert('تنبيه', 'يجب إضافة مخزن رئيسي أولاً');
      return;
    }
    setSupplierId(null);
    setWarehouseId(defaultMainWarehouseId || mainWarehouses[0]?.id || '');
    setItems([]);
    setModalVisible(true);
  }

  function addItemFromProduct(productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    if (items.some((it) => it.productId === productId)) {
      setProductPickerVisible(false);
      return;
    }
    setItems((prev) => [
      ...prev,
      { productId: p.id, name: p.name, price: p.purchasePrice, quantity: 1 },
    ]);
    setProductPickerVisible(false);
  }

  function updateItem(productId: string, patch: Partial<PurchaseItem>) {
    setItems((prev) =>
      prev.map((it) => (it.productId === productId ? { ...it, ...patch } : it))
    );
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((it) => it.productId !== productId));
  }

  function handleSubmit() {
    if (!supplierId) {
      showAlert('تنبيه', 'يجب اختيار مورد أولاً');
      return;
    }
    if (!warehouseId) {
      showAlert('تنبيه', 'يجب اختيار المخزن');
      return;
    }
    if (items.length === 0) {
      showAlert('تنبيه', 'أضف منتجاً واحداً على الأقل');
      return;
    }
    const supplier = suppliers.find((s) => s.id === supplierId);
    const result = createPurchase({
      supplierId,
      supplierName: supplier?.name || 'مورد',
      warehouseId,
      items,
    });
    if (result.error) {
      showAlert('تنبيه', result.error);
      return;
    }
    if (result.purchase) {
      setModalVisible(false);
      showAlert('تم', `تم تسجيل عملية شراء بقيمة ${formatCurrency(result.purchase.total, settings.currency)}`);
    }
  }

  function confirmDelete(id: string) {
    showAlert('حذف عملية شراء', 'سيتم خصم الكميات المضافة من المخزون.', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deletePurchase(id) },
    ]);
  }

  async function handlePrint(action: PrintAction) {
    if (!printItem) return;
    const purchase = purchases.find((p) => p.id === printItem);
    if (!purchase) return;
    try {
      const html = buildPurchaseInvoiceHtml(purchase, settings);
      await performPrint(html, `purchase-${purchase.purchaseNo}`, action);
    } catch {
      showAlert('خطأ', 'تعذر تنفيذ الطباعة');
    }
  }

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);
  const selectedWarehouse = warehouses.find((w) => w.id === warehouseId);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="المشتريات"
        subtitle={`${formatNumber(purchases.length)} عملية`}
        right={
          canEdit ? (
            <Pressable onPress={openCreate} hitSlop={8} style={styles.headerBtn}>
              <MaterialCommunityIcons name="plus" size={22} color={Colors.white} />
            </Pressable>
          ) : null
        }
      />
      <FlatList
        data={purchases}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="cart-arrow-down"
            title="لا توجد عمليات شراء"
            description="سجل أول عملية شراء لتحديث المخزون"
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.actions}>
                <Pressable
                  onPress={() => setPrintItem(item.id)}
                  hitSlop={8}
                  style={({ pressed }) => [styles.actBtn, pressed && { opacity: 0.7 }]}
                >
                  <MaterialCommunityIcons name="printer" size={18} color={Colors.primary} />
                </Pressable>
                {canEdit ? (
                  <Pressable
                    onPress={() => confirmDelete(item.id)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.actBtn, pressed && { opacity: 0.7 }]}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.danger} />
                  </Pressable>
                ) : null}
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.no}>#{item.purchaseNo}</Text>
                <Text style={styles.title}>{item.supplierName}</Text>
                {item.warehouseName ? <Text style={styles.warehouse}>{item.warehouseName}</Text> : null}
                <Text style={styles.date}>{formatDateTime(item.date)}</Text>
              </View>
            </View>
            <View style={styles.itemsBox}>
              {item.items.map((it) => (
                <View key={it.productId} style={styles.itemRow}>
                  <Text style={styles.itemPrice}>
                    {formatCurrency(it.price * it.quantity, settings.currency)}
                  </Text>
                  <Text style={styles.itemQty}>×{formatNumber(it.quantity)}</Text>
                  <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                </View>
              ))}
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalValue}>
                {formatCurrency(item.total, settings.currency)}
              </Text>
              <Text style={styles.totalLabel}>الإجمالي</Text>
            </View>
          </View>
        )}
      />

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="عملية شراء جديدة"
        footer={
          <>
            <Button title="إلغاء" variant="secondary" onPress={() => setModalVisible(false)} style={{ flex: 1 }} />
            <Button title="حفظ" onPress={handleSubmit} style={{ flex: 1 }} />
          </>
        }
      >
        <PickerField
          label="المورد"
          value={selectedSupplier?.name || ''}
          onPress={() => setSupplierPickerVisible(true)}
          icon="truck-delivery-outline"
        />
        <PickerField
          label="المخزن (رئيسي فقط)"
          value={selectedWarehouse?.name || ''}
          onPress={() => setWarehousePickerVisible(true)}
          icon="warehouse"
        />

        <View style={styles.itemsHeader}>
          <Pressable
            onPress={() => setProductPickerVisible(true)}
            style={({ pressed }) => [styles.addItemBtn, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="plus" size={16} color={Colors.primary} />
            <Text style={styles.addItemText}>إضافة منتج</Text>
          </Pressable>
          <Text style={styles.itemsHeaderLabel}>المنتجات ({items.length})</Text>
        </View>

        {items.map((it) => (
          <View key={it.productId} style={styles.editRow}>
            <Pressable onPress={() => removeItem(it.productId)} hitSlop={6} style={styles.actBtn}>
              <MaterialCommunityIcons name="close" size={18} color={Colors.danger} />
            </Pressable>
            <Input
              containerStyle={{ flex: 1 }}
              label="السعر"
              value={String(it.price)}
              onChangeText={(t) => updateItem(it.productId, { price: Number(t) || 0 })}
              keyboardType="decimal-pad"
            />
            <Input
              containerStyle={{ flex: 1 }}
              label="الكمية"
              value={String(it.quantity)}
              onChangeText={(t) => updateItem(it.productId, { quantity: Number(t) || 0 })}
              keyboardType="number-pad"
            />
            <View style={{ flex: 2, alignItems: 'flex-end' }}>
              <Text style={styles.editLabel}>المنتج</Text>
              <Text style={styles.editName} numberOfLines={2}>{it.name}</Text>
            </View>
          </View>
        ))}

        <View style={styles.totalCard}>
          <Text style={styles.totalCardValue}>{formatCurrency(total, settings.currency)}</Text>
          <Text style={styles.totalCardLabel}>إجمالي الشراء</Text>
        </View>
      </Modal>

      <Modal
        visible={supplierPickerVisible}
        onClose={() => setSupplierPickerVisible(false)}
        title="اختر المورد"
      >
        {suppliers.length === 0 ? (
          <Text style={{ textAlign: 'center', color: Colors.textSecondary }}>
            لا يوجد موردين. أضف موردين أولاً.
          </Text>
        ) : (
          suppliers.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => {
                setSupplierId(s.id);
                setSupplierPickerVisible(false);
              }}
              style={({ pressed }) => [styles.pickerRow, pressed && { opacity: 0.85 }]}
            >
              <MaterialCommunityIcons
                name={supplierId === s.id ? 'check-circle' : 'circle-outline'}
                size={22}
                color={supplierId === s.id ? Colors.primary : Colors.textMuted}
              />
              <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                <Text style={styles.pickerRowTitle}>{s.name}</Text>
                {s.phone ? <Text style={styles.pickerRowSub}>{s.phone}</Text> : null}
              </View>
            </Pressable>
          ))
        )}
      </Modal>

      <Modal
        visible={warehousePickerVisible}
        onClose={() => setWarehousePickerVisible(false)}
        title="اختر المخزن الرئيسي"
      >
        {mainWarehouses.map((w) => (
          <Pressable
            key={w.id}
            onPress={() => {
              setWarehouseId(w.id);
              setWarehousePickerVisible(false);
            }}
            style={({ pressed }) => [styles.pickerRow, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons
              name={warehouseId === w.id ? 'check-circle' : 'circle-outline'}
              size={22}
              color={warehouseId === w.id ? Colors.primary : Colors.textMuted}
            />
            <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
              <Text style={styles.pickerRowTitle}>{w.name}</Text>
              {w.address ? <Text style={styles.pickerRowSub}>{w.address}</Text> : null}
            </View>
          </Pressable>
        ))}
      </Modal>

      <Modal
        visible={productPickerVisible}
        onClose={() => setProductPickerVisible(false)}
        title="اختر منتج"
      >
        {products.length === 0 ? (
          <Text style={{ textAlign: 'center', color: Colors.textSecondary }}>
            لا توجد منتجات. أضف منتجات أولاً.
          </Text>
        ) : (
          products.map((p) => {
            const exists = items.some((it) => it.productId === p.id);
            return (
              <Pressable
                key={p.id}
                onPress={() => addItemFromProduct(p.id)}
                disabled={exists}
                style={({ pressed }) => [
                  styles.pickerRow,
                  pressed && { opacity: 0.85 },
                  exists && { opacity: 0.5 },
                ]}
              >
                <MaterialCommunityIcons
                  name={exists ? 'check' : 'plus-circle-outline'}
                  size={22}
                  color={exists ? Colors.success : Colors.primary}
                />
                <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                  <Text style={styles.pickerRowTitle}>{p.name}</Text>
                  <Text style={styles.pickerRowSub}>
                    شراء: {formatCurrency(p.purchasePrice, settings.currency)}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </Modal>

      <PrintMenu
        visible={!!printItem}
        onClose={() => setPrintItem(null)}
        onAction={handlePrint}
      />
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
  list: { padding: Spacing.lg, gap: Spacing.md },
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
  no: { color: Colors.primary, fontWeight: FontWeight.semibold, fontSize: FontSize.xs },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, marginTop: 2 },
  warehouse: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  date: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4 },
  itemsBox: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    gap: 6,
  },
  itemRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  itemName: { flex: 1, color: Colors.text, fontSize: FontSize.sm, textAlign: 'right' },
  itemQty: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  itemPrice: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  totalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalLabel: { color: Colors.text, fontWeight: FontWeight.semibold, fontSize: FontSize.md },
  totalValue: { color: Colors.primary, fontWeight: FontWeight.bold, fontSize: FontSize.lg },
  itemsHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  itemsHeaderLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  addItemBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  addItemText: { color: Colors.primary, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  editRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  editLabel: { color: Colors.textSecondary, fontSize: FontSize.xs },
  editName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginTop: 2, textAlign: 'right' },
  totalCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  totalCardLabel: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm },
  totalCardValue: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  pickerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerRowTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  pickerRowSub: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
});
