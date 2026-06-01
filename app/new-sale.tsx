// Powered by OnSpace.AI
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/hooks/useStore';
import { useAlert } from '@/template';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PickerField } from '@/components/ui/Picker';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { SaleItem } from '@/constants/types';
import { formatCurrency, formatNumber } from '@/services/format';

export default function NewSaleScreen() {
  const router = useRouter();
  const {
    products,
    customers,
    warehouses,
    createSale,
    settings,
    defaultMainWarehouseId,
    getStock,
  } = useStore();
  const { showAlert } = useAlert();

  const [customerId, setCustomerId] = useState<string | null>(null);
  const [walkInName, setWalkInName] = useState('');
  const [warehouseId, setWarehouseId] = useState<string>(defaultMainWarehouseId || '');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState('0');
  const [paid, setPaid] = useState('');
  const [productPickerVisible, setProductPickerVisible] = useState(false);
  const [customerPickerVisible, setCustomerPickerVisible] = useState(false);
  const [warehousePickerVisible, setWarehousePickerVisible] = useState(false);
  const [search, setSearch] = useState('');

  const subtotal = useMemo(
    () => items.reduce((s, it) => s + it.price * it.quantity, 0),
    [items]
  );
  const discountAmount = Number(discount) || 0;
  const total = Math.max(0, subtotal - discountAmount);
  const paidAmount = paid === '' ? total : Number(paid) || 0;

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products;
    if (q) {
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, search]);

  const selectedWarehouse = warehouses.find((w) => w.id === warehouseId);
  const selectedCustomer = customers.find((c) => c.id === customerId);

  function addItem(productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const stock = warehouseId ? getStock(productId, warehouseId) : 0;
    if (stock <= 0) {
      showAlert('غير متوفر', 'هذا المنتج غير متاح في المخزن المحدد');
      return;
    }
    const existing = items.find((it) => it.productId === productId);
    const usedQty = existing?.quantity || 0;
    if (usedQty + 1 > stock) {
      showAlert('تنبيه', 'الكمية المتاحة في المخزن أقل');
      return;
    }
    if (existing) {
      updateItem(productId, { quantity: existing.quantity + 1 });
    } else {
      setItems((prev) => [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          price: p.salePrice,
          purchasePrice: p.purchasePrice,
          quantity: 1,
          priceLabel: 'قطاعي',
        },
      ]);
    }
    setProductPickerVisible(false);
    setSearch('');
  }

  function updateItem(productId: string, patch: Partial<SaleItem>) {
    setItems((prev) =>
      prev.map((it) => (it.productId === productId ? { ...it, ...patch } : it))
    );
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((it) => it.productId !== productId));
  }

  function changeQty(productId: string, delta: number) {
    const item = items.find((it) => it.productId === productId);
    if (!item) return;
    const stock = warehouseId ? getStock(productId, warehouseId) : 0;
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      removeItem(productId);
      return;
    }
    if (newQty > stock) {
      showAlert('تنبيه', 'الكمية المتاحة في المخزن أقل');
      return;
    }
    updateItem(productId, { quantity: newQty });
  }

  function setQtyManual(productId: string, value: string) {
    const num = Number(value.replace(/[^0-9.]/g, '')) || 0;
    const item = items.find((it) => it.productId === productId);
    if (!item) return;
    const stock = warehouseId ? getStock(productId, warehouseId) : 0;
    if (num <= 0) {
      removeItem(productId);
      return;
    }
    if (num > stock) {
      showAlert('تنبيه', `الكمية المتاحة ${formatNumber(stock)} فقط`);
      updateItem(productId, { quantity: stock });
      return;
    }
    updateItem(productId, { quantity: num });
  }

  function pickPriceTier(productId: string, label: string, price: number) {
    updateItem(productId, { price, priceLabel: label });
  }

  function getProductPrices(productId: string): { id: string; label: string; price: number }[] {
    const p = products.find((x) => x.id === productId);
    if (!p) return [];
    const list = [{ id: 'retail', label: 'قطاعي', price: p.salePrice }];
    (p.prices || []).forEach((pr) => list.push({ id: pr.id, label: pr.label, price: pr.price }));
    return list;
  }

  function handleSave() {
    if (!warehouseId) {
      showAlert('تنبيه', 'يجب اختيار مخزن أو معرض');
      return;
    }
    if (items.length === 0) {
      showAlert('تنبيه', 'أضف منتجاً واحداً على الأقل');
      return;
    }
    const customer = customers.find((c) => c.id === customerId);
    const result = createSale({
      customerId,
      customerName: customer?.name || walkInName.trim() || 'عميل نقدي',
      warehouseId,
      items,
      discount: discountAmount,
      paid: paidAmount,
    });
    if (result.error) {
      showAlert('تنبيه', result.error);
      return;
    }
    if (result.sale) {
      router.replace(`/invoice/${result.sale.id}` as any);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header title="فاتورة جديدة" subtitle={`${items.length} منتج`} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <PickerField
            label="المخزن/المعرض"
            value={selectedWarehouse?.name || ''}
            onPress={() => setWarehousePickerVisible(true)}
            icon="warehouse"
          />
          <PickerField
            label="العميل"
            value={selectedCustomer ? selectedCustomer.name : walkInName || 'عميل نقدي'}
            onPress={() => setCustomerPickerVisible(true)}
            icon="account"
          />

          {!selectedCustomer ? (
            <Input
              placeholder="اسم العميل (اختياري)"
              value={walkInName}
              onChangeText={setWalkInName}
            />
          ) : null}

          <View style={styles.itemsHeader}>
            <Pressable
              onPress={() => setProductPickerVisible(true)}
              style={({ pressed }) => [styles.addItemBtn, pressed && { opacity: 0.85 }]}
            >
              <MaterialCommunityIcons name="plus" size={16} color={Colors.primary} />
              <Text style={styles.addItemText}>إضافة منتج</Text>
            </Pressable>
            <Text style={styles.headerLabel}>المنتجات</Text>
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="cart-plus" size={28} color={Colors.textMuted} />
              <Text style={styles.emptyText}>اضغط "إضافة منتج" لبدء الفاتورة</Text>
            </View>
          ) : (
            items.map((it) => {
              const prices = getProductPrices(it.productId);
              const stock = warehouseId ? getStock(it.productId, warehouseId) : 0;
              return (
                <View key={it.productId} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Pressable onPress={() => removeItem(it.productId)} hitSlop={8} style={styles.removeBtn}>
                      <MaterialCommunityIcons name="close" size={16} color={Colors.danger} />
                    </Pressable>
                    <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                      <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                      <Text style={styles.itemMeta}>المتاح: {formatNumber(stock)}</Text>
                    </View>
                  </View>

                  <View style={styles.priceTiersRow}>
                    {prices.map((pr) => {
                      const active = it.priceLabel === pr.label;
                      return (
                        <Pressable
                          key={pr.id}
                          onPress={() => pickPriceTier(it.productId, pr.label, pr.price)}
                          style={({ pressed }) => [
                            styles.priceTierChip,
                            active && styles.priceTierChipActive,
                            pressed && { opacity: 0.85 },
                          ]}
                        >
                          <Text style={[styles.priceTierLabel, active && { color: Colors.white }]}>
                            {pr.label}
                          </Text>
                          <Text style={[styles.priceTierValue, active && { color: Colors.white }]}>
                            {formatCurrency(pr.price, settings.currency)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.qtyTotalRow}>
                    <View style={styles.qtyControl}>
                      <Pressable
                        onPress={() => changeQty(it.productId, +1)}
                        style={({ pressed }) => [styles.qtyBtn, pressed && { opacity: 0.7 }]}
                      >
                        <MaterialCommunityIcons name="plus" size={18} color={Colors.primary} />
                      </Pressable>
                      <Input
                        value={String(it.quantity)}
                        onChangeText={(t) => setQtyManual(it.productId, t)}
                        keyboardType="decimal-pad"
                        containerStyle={{ width: 80 }}
                        style={{ textAlign: 'center', minHeight: 40, paddingVertical: 8 }}
                      />
                      <Pressable
                        onPress={() => changeQty(it.productId, -1)}
                        style={({ pressed }) => [styles.qtyBtn, pressed && { opacity: 0.7 }]}
                      >
                        <MaterialCommunityIcons name="minus" size={18} color={Colors.primary} />
                      </Pressable>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={styles.itemTotalLabel}>الإجمالي</Text>
                      <Text style={styles.itemTotal}>
                        {formatCurrency(it.price * it.quantity, settings.currency)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.sumValue}>{formatCurrency(subtotal, settings.currency)}</Text>
              <Text style={styles.sumLabel}>المجموع</Text>
            </View>
            <View style={[styles.summaryRow, { alignItems: 'center' }]}>
              <Input
                value={discount}
                onChangeText={setDiscount}
                keyboardType="decimal-pad"
                placeholder="0"
                containerStyle={{ width: 130 }}
              />
              <Text style={styles.sumLabel}>الخصم</Text>
            </View>
            <View style={[styles.summaryRow, { alignItems: 'center' }]}>
              <Input
                value={paid}
                onChangeText={setPaid}
                keyboardType="decimal-pad"
                placeholder={String(total)}
                containerStyle={{ width: 130 }}
              />
              <Text style={styles.sumLabel}>المدفوع</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalSumRow]}>
              <Text style={styles.totalSumValue}>
                {formatCurrency(total, settings.currency)}
              </Text>
              <Text style={styles.totalSumLabel}>الإجمالي</Text>
            </View>
            {paidAmount < total ? (
              <View style={styles.summaryRow}>
                <Text style={[styles.sumValue, { color: Colors.danger }]}>
                  {formatCurrency(total - paidAmount, settings.currency)}
                </Text>
                <Text style={styles.sumLabel}>متبقي</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button title="إلغاء" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} />
          <Button title="حفظ الفاتورة" icon="check" onPress={handleSave} style={{ flex: 2 }} />
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={productPickerVisible}
        onClose={() => setProductPickerVisible(false)}
        title="اختر منتج"
      >
        <Input value={search} onChangeText={setSearch} placeholder="بحث عن منتج..." />
        {filteredProducts.length === 0 ? (
          <Text style={styles.empty}>لا توجد نتائج</Text>
        ) : (
          filteredProducts.map((p) => {
            const stock = warehouseId ? getStock(p.id, warehouseId) : 0;
            const out = stock <= 0;
            return (
              <Pressable
                key={p.id}
                onPress={() => addItem(p.id)}
                disabled={out}
                style={({ pressed }) => [
                  styles.pickerRow,
                  pressed && { opacity: 0.85 },
                  out && { opacity: 0.5 },
                ]}
              >
                <MaterialCommunityIcons
                  name="plus-circle-outline"
                  size={22}
                  color={out ? Colors.textMuted : Colors.primary}
                />
                <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                  <Text style={styles.pickerRowTitle}>{p.name}</Text>
                  <Text style={styles.pickerRowSub}>
                    {formatCurrency(p.salePrice, settings.currency)} • متاح: {formatNumber(stock)}
                  </Text>
                  {p.prices && p.prices.length > 0 ? (
                    <Text style={styles.pickerRowMeta}>
                      {p.prices.length + 1} أسعار متاحة
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })
        )}
      </Modal>

      <Modal
        visible={customerPickerVisible}
        onClose={() => setCustomerPickerVisible(false)}
        title="اختر العميل"
      >
        <Pressable
          onPress={() => {
            setCustomerId(null);
            setCustomerPickerVisible(false);
          }}
          style={({ pressed }) => [styles.pickerRow, pressed && { opacity: 0.85 }]}
        >
          <MaterialCommunityIcons
            name={!customerId ? 'check-circle' : 'circle-outline'}
            size={22}
            color={!customerId ? Colors.primary : Colors.textMuted}
          />
          <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
            <Text style={styles.pickerRowTitle}>عميل نقدي</Text>
            <Text style={styles.pickerRowSub}>بدون تسجيل بيانات</Text>
          </View>
        </Pressable>
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
              {c.phone ? <Text style={styles.pickerRowSub}>{c.phone}</Text> : null}
            </View>
          </Pressable>
        ))}
      </Modal>

      <Modal
        visible={warehousePickerVisible}
        onClose={() => setWarehousePickerVisible(false)}
        title="اختر المخزن أو المعرض"
      >
        {warehouses.map((w) => (
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
              <Text style={styles.pickerRowSub}>
                {w.type === 'main' ? 'مخزن رئيسي' : 'معرض'}
              </Text>
            </View>
          </Pressable>
        ))}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 120 },
  itemsHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  headerLabel: { fontSize: FontSize.md, color: Colors.text, fontWeight: FontWeight.semibold },
  addItemBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  addItemText: { color: Colors.primary, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    gap: 8,
  },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
    gap: Spacing.sm,
  },
  itemHeader: { flexDirection: 'row-reverse', alignItems: 'center' },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: { color: Colors.text, fontWeight: FontWeight.semibold, fontSize: FontSize.md },
  itemMeta: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  priceTiersRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  priceTierChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    minWidth: 80,
  },
  priceTierChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  priceTierLabel: { color: Colors.text, fontSize: 11, fontWeight: FontWeight.semibold },
  priceTierValue: { color: Colors.primary, fontSize: 12, fontWeight: FontWeight.bold, marginTop: 2 },
  qtyTotalRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  qtyControl: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTotalLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  itemTotal: { color: Colors.primary, fontWeight: FontWeight.bold, fontSize: FontSize.lg, marginTop: 2 },
  summary: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  summaryRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  sumLabel: { color: Colors.textSecondary, fontSize: FontSize.md },
  sumValue: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  totalSumRow: { paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  totalSumLabel: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  totalSumValue: { color: Colors.primary, fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row-reverse',
    gap: Spacing.md,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  pickerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerRowTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  pickerRowSub: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
  pickerRowMeta: { color: Colors.primary, fontSize: 10, fontWeight: FontWeight.semibold, marginTop: 2 },
  empty: { textAlign: 'center', color: Colors.textSecondary, paddingVertical: Spacing.lg },
});
