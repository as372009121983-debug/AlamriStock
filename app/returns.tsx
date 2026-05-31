// Powered by OnSpace.AI
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
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
import { ReturnItem } from '@/constants/types';
import { formatCurrency, formatDateTime, formatNumber } from '@/services/format';
import { buildSaleReturnHtml, performPrint, PrintAction } from '@/services/print';

export default function ReturnsScreen() {
  const params = useLocalSearchParams<{ saleId?: string; action?: string }>();
  const { saleReturns, sales, products, warehouses, customers, settings, defaultMainWarehouseId, createSaleReturn, deleteSaleReturn } = useStore();
  const { canEdit } = useAuth();
  const { showAlert } = useAlert();

  const [modalVisible, setModalVisible] = useState(false);
  const [saleId, setSaleId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [warehouseId, setWarehouseId] = useState<string>(defaultMainWarehouseId || '');
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [reason, setReason] = useState('');
  const [pickerType, setPickerType] = useState<'sale' | 'product' | 'warehouse' | 'customer' | null>(null);
  const [printItem, setPrintItem] = useState<string | null>(null);

  useEffect(() => {
    if (params.action === 'new' && params.saleId) {
      const sale = sales.find((s) => s.id === params.saleId);
      if (sale) openFromSale(sale.id);
    }
  }, [params.action, params.saleId]);

  const total = useMemo(() => items.reduce((s, it) => s + it.price * it.quantity, 0), [items]);

  function openCreate() {
    setSaleId(null);
    setCustomerId(null);
    setCustomerName('');
    setWarehouseId(defaultMainWarehouseId || '');
    setItems([]);
    setReason('');
    setModalVisible(true);
  }
  function openFromSale(sid: string) {
    const sale = sales.find((s) => s.id === sid);
    if (!sale) return;
    setSaleId(sid);
    setCustomerId(sale.customerId);
    setCustomerName(sale.customerName);
    setWarehouseId(sale.warehouseId);
    setItems(sale.items.map((it) => ({
      productId: it.productId,
      name: it.name,
      quantity: it.quantity,
      price: it.price,
      purchasePrice: it.purchasePrice,
    })));
    setReason('');
    setModalVisible(true);
  }
  function updateItem(productId: string, patch: Partial<ReturnItem>) {
    setItems((prev) => prev.map((it) => (it.productId === productId ? { ...it, ...patch } : it)));
  }
  function removeItem(productId: string) {
    setItems((prev) => prev.filter((it) => it.productId !== productId));
  }
  function addNonSaleProduct(productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p || items.some((it) => it.productId === p.id)) return;
    setItems((prev) => [...prev, { productId: p.id, name: p.name, quantity: 1, price: p.salePrice, purchasePrice: p.purchasePrice }]);
    setPickerType(null);
  }
  function handleSubmit() {
    if (items.length === 0) {
      showAlert('تنبيه', 'أضف منتجاً واحداً على الأقل');
      return;
    }
    if (!warehouseId) {
      showAlert('تنبيه', 'حدد المخزن لاستلام البضاعة');
      return;
    }
    const filtered = items.filter((it) => it.quantity > 0);
    const res = createSaleReturn({
      saleId,
      customerId,
      customerName: customerName || 'عميل',
      warehouseId,
      items: filtered,
      reason,
    });
    if (res.error) {
      showAlert('تنبيه', res.error);
      return;
    }
    setModalVisible(false);
    showAlert('تم', 'تم تسجيل المرتجع');
  }
  function confirmDelete(id: string) {
    showAlert('حذف مرتجع', 'سيتم خصم الكميات المرتجعة من المخزن.', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteSaleReturn(id) },
    ]);
  }
  async function handlePrint(action: PrintAction) {
    const r = saleReturns.find((x) => x.id === printItem);
    if (!r) return;
    try {
      const html = buildSaleReturnHtml(r, settings);
      await performPrint(html, `sale-return-${r.returnNo}`, action);
    } catch {
      showAlert('خطأ', 'تعذر تنفيذ الطباعة');
    }
  }

  const linkedSale = saleId ? sales.find((s) => s.id === saleId) : null;
  const selectedWarehouse = warehouses.find((w) => w.id === warehouseId);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="مرتجعات البيع"
        subtitle={`${formatNumber(saleReturns.length)} مرتجع`}
        right={
          canEdit ? (
            <Pressable onPress={openCreate} hitSlop={8} style={styles.headerBtn}>
              <MaterialCommunityIcons name="plus" size={22} color={Colors.white} />
            </Pressable>
          ) : null
        }
      />
      <FlatList
        data={saleReturns}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="undo-variant" title="لا توجد مرتجعات" description="ابدأ بتسجيل أول مرتجع بيع" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
                <Pressable onPress={() => setPrintItem(item.id)} hitSlop={8} style={styles.actBtn}>
                  <MaterialCommunityIcons name="printer" size={18} color={Colors.primary} />
                </Pressable>
                {canEdit ? (
                  <Pressable onPress={() => confirmDelete(item.id)} hitSlop={8} style={styles.actBtn}>
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.danger} />
                  </Pressable>
                ) : null}
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.no}>#{item.returnNo}{item.invoiceNo ? ` - فاتورة #${item.invoiceNo}` : ''}</Text>
                <Text style={styles.title}>{item.customerName}</Text>
                <Text style={styles.warehouse}>{item.warehouseName}</Text>
                <Text style={styles.date}>{formatDateTime(item.date)}</Text>
              </View>
            </View>
            <View style={styles.itemsBox}>
              {item.items.map((it) => (
                <View key={it.productId} style={styles.itemRow}>
                  <Text style={styles.itemPrice}>{formatCurrency(it.price * it.quantity, settings.currency)}</Text>
                  <Text style={styles.itemQty}>×{formatNumber(it.quantity)}</Text>
                  <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                </View>
              ))}
            </View>
            {item.reason ? <Text style={styles.reason}>السبب: {item.reason}</Text> : null}
            <View style={styles.totalRow}>
              <Text style={styles.totalValue}>{formatCurrency(item.total, settings.currency)}</Text>
              <Text style={styles.totalLabel}>إجمالي المرتجع</Text>
            </View>
          </View>
        )}
      />

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="مرتجع بيع جديد"
        footer={
          <>
            <Button title="إلغاء" variant="secondary" onPress={() => setModalVisible(false)} style={{ flex: 1 }} />
            <Button title="حفظ" onPress={handleSubmit} style={{ flex: 1 }} />
          </>
        }
      >
        <PickerField
          label="فاتورة بيع (اختياري)"
          value={linkedSale ? `#${linkedSale.invoiceNo} - ${linkedSale.customerName}` : ''}
          placeholder="اختر فاتورة لاسترجاعها"
          onPress={() => setPickerType('sale')}
          icon="receipt"
        />
        <PickerField label="المخزن المستلم" value={selectedWarehouse?.name || ''} onPress={() => setPickerType('warehouse')} icon="warehouse" />
        {!saleId ? (
          <Input label="اسم العميل" value={customerName} onChangeText={setCustomerName} placeholder="عميل" />
        ) : null}

        <View style={styles.itemsHeader}>
          <Pressable onPress={() => setPickerType('product')} style={({ pressed }) => [styles.addItemBtn, pressed && { opacity: 0.85 }]}>
            <MaterialCommunityIcons name="plus" size={16} color={Colors.primary} />
            <Text style={styles.addItemText}>إضافة منتج</Text>
          </Pressable>
          <Text style={styles.itemsHeaderLabel}>المنتجات ({items.length})</Text>
        </View>

        {items.map((it) => (
          <View key={it.productId} style={styles.editRow}>
            <Pressable onPress={() => removeItem(it.productId)} hitSlop={6} style={styles.actBtn}>
              <MaterialCommunityIcons name="close" size={16} color={Colors.danger} />
            </Pressable>
            <Input containerStyle={{ flex: 1 }} label="السعر" value={String(it.price)} onChangeText={(t) => updateItem(it.productId, { price: Number(t) || 0 })} keyboardType="decimal-pad" />
            <Input containerStyle={{ flex: 1 }} label="الكمية" value={String(it.quantity)} onChangeText={(t) => updateItem(it.productId, { quantity: Number(t) || 0 })} keyboardType="number-pad" />
            <View style={{ flex: 2, alignItems: 'flex-end' }}>
              <Text style={styles.editName} numberOfLines={2}>{it.name}</Text>
            </View>
          </View>
        ))}

        <Input label="سبب المرتجع" value={reason} onChangeText={setReason} placeholder="مثل: منتج معيب" multiline />

        {items.length > 0 ? (
          <View style={styles.totalCard}>
            <Text style={styles.totalCardValue}>{formatCurrency(total, settings.currency)}</Text>
            <Text style={styles.totalCardLabel}>إجمالي المرتجع</Text>
          </View>
        ) : null}
      </Modal>

      <Modal visible={pickerType === 'sale'} onClose={() => setPickerType(null)} title="اختر فاتورة">
        {sales.length === 0 ? <Text style={{ textAlign: 'center', color: Colors.textSecondary }}>لا توجد فواتير</Text> : sales.map((s) => (
          <Pressable key={s.id} onPress={() => { openFromSale(s.id); setPickerType(null); }} style={({ pressed }) => [styles.pickerRow, pressed && { opacity: 0.85 }]}>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={styles.pickerRowTitle}>#{s.invoiceNo} - {s.customerName}</Text>
              <Text style={styles.pickerRowSub}>{formatDateTime(s.date)} - {formatCurrency(s.total, settings.currency)}</Text>
            </View>
          </Pressable>
        ))}
      </Modal>
      <Modal visible={pickerType === 'warehouse'} onClose={() => setPickerType(null)} title="اختر مخزن">
        {warehouses.map((w) => (
          <Pressable key={w.id} onPress={() => { setWarehouseId(w.id); setPickerType(null); }} style={({ pressed }) => [styles.pickerRow, pressed && { opacity: 0.85 }]}>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={styles.pickerRowTitle}>{w.name}</Text>
              <Text style={styles.pickerRowSub}>{w.type === 'main' ? 'مخزن رئيسي' : 'معرض'}</Text>
            </View>
          </Pressable>
        ))}
      </Modal>
      <Modal visible={pickerType === 'product'} onClose={() => setPickerType(null)} title="اختر منتج">
        {products.map((p) => {
          const exists = items.some((it) => it.productId === p.id);
          return (
            <Pressable key={p.id} onPress={() => addNonSaleProduct(p.id)} disabled={exists} style={({ pressed }) => [styles.pickerRow, pressed && { opacity: 0.85 }, exists && { opacity: 0.5 }]}>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.pickerRowTitle}>{p.name}</Text>
                <Text style={styles.pickerRowSub}>{formatCurrency(p.salePrice, settings.currency)}</Text>
              </View>
            </Pressable>
          );
        })}
      </Modal>
      <PrintMenu visible={!!printItem} onClose={() => setPrintItem(null)} onAction={handlePrint} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerBtn: { backgroundColor: Colors.primary, width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Spacing.lg, gap: Spacing.md },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.danger + '33', marginBottom: Spacing.md, ...Shadow.sm },
  cardTop: { flexDirection: 'row-reverse', alignItems: 'flex-start', justifyContent: 'space-between' },
  actBtn: { width: 36, height: 36, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  no: { color: Colors.danger, fontWeight: FontWeight.semibold, fontSize: FontSize.xs },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, marginTop: 2 },
  warehouse: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  date: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4 },
  itemsBox: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.md, gap: 6 },
  itemRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  itemName: { flex: 1, color: Colors.text, fontSize: FontSize.sm, textAlign: 'right' },
  itemQty: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  itemPrice: { color: Colors.danger, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  reason: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: Spacing.sm, textAlign: 'right' },
  totalRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingTop: Spacing.md, marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  totalLabel: { color: Colors.text, fontWeight: FontWeight.semibold, fontSize: FontSize.md },
  totalValue: { color: Colors.danger, fontWeight: FontWeight.bold, fontSize: FontSize.lg },
  itemsHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  itemsHeaderLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  addItemBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: Colors.primarySoft, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full },
  addItemText: { color: Colors.primary, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  editRow: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: Spacing.sm, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.md },
  editName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, textAlign: 'right' },
  totalCard: { backgroundColor: Colors.danger, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  totalCardLabel: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm },
  totalCardValue: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  pickerRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickerRowTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  pickerRowSub: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
});
