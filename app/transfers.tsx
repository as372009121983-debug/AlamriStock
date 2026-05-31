// Powered by OnSpace.AI
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PrintMenu } from '@/components/ui/PrintMenu';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { TransferItem } from '@/constants/types';
import { formatDateTime, formatNumber } from '@/services/format';
import { buildTransferHtml, performPrint, PrintAction } from '@/services/print';

export default function TransfersScreen() {
  const router = useRouter();
  const { transfers, warehouses, products, getStock, createTransfer, deleteTransfer, settings } = useStore();
  const { canEdit, isOwner } = useAuth();
  const { showAlert } = useAlert();
  const [modalVisible, setModalVisible] = useState(false);
  const [fromId, setFromId] = useState<string>('');
  const [toId, setToId] = useState<string>('');
  const [items, setItems] = useState<TransferItem[]>([]);
  const [notes, setNotes] = useState('');
  const [pickerType, setPickerType] = useState<'from' | 'to' | 'product' | null>(null);
  const [printItem, setPrintItem] = useState<string | null>(null);

  const fromW = warehouses.find((w) => w.id === fromId);
  const toW = warehouses.find((w) => w.id === toId);
  const availableToWarehouses = warehouses.filter((w) => w.id !== fromId);

  // Block transfer from showroom unless owner
  const fromOptions = warehouses;
  const toOptions = availableToWarehouses;

  function open() {
    if (warehouses.length < 2) {
      showAlert(
        'تنبيه',
        'يجب وجود موقعين على الأقل لإجراء التحويلات. أضف مخزن أو معرض جديد أولاً.',
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'إضافة موقع', onPress: () => router.push('/warehouses') },
        ]
      );
      return;
    }
    setFromId('');
    setToId('');
    setItems([]);
    setNotes('');
    setModalVisible(true);
  }
  function selectFrom(wid: string) {
    const w = warehouses.find((x) => x.id === wid);
    if (!w) return;
    if (w.type === 'showroom' && !isOwner) {
      showAlert('غير مسموح', 'التحويل من معرض يتطلب صلاحيات المالك');
      return;
    }
    setFromId(wid);
    setToId('');
    setItems([]);
    setPickerType(null);
  }
  function addProduct(productId: string) {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    if (items.some((it) => it.productId === productId)) {
      setPickerType(null);
      return;
    }
    const stock = fromId ? getStock(productId, fromId) : 0;
    if (stock <= 0) {
      showAlert('غير متوفر', 'لا توجد كمية في الموقع المصدر');
      return;
    }
    setItems((prev) => [...prev, { productId: p.id, name: p.name, quantity: 1 }]);
    setPickerType(null);
  }
  function updateItem(productId: string, qty: number) {
    setItems((prev) => prev.map((it) => (it.productId === productId ? { ...it, quantity: qty } : it)));
  }
  function removeItem(productId: string) {
    setItems((prev) => prev.filter((it) => it.productId !== productId));
  }
  function handleSubmit() {
    if (!fromId) {
      showAlert('تنبيه', 'حدد الموقع المصدر');
      return;
    }
    if (!toId) {
      showAlert('تنبيه', 'حدد موقع الوجهة');
      return;
    }
    if (items.length === 0) {
      showAlert('تنبيه', 'أضف منتجاً واحداً على الأقل');
      return;
    }
    const res = createTransfer({ fromWarehouseId: fromId, toWarehouseId: toId, items, notes });
    if (res.error) {
      showAlert('تنبيه', res.error);
      return;
    }
    setModalVisible(false);
    showAlert(
      'تم التحويل بنجاح',
      `تم نقل ${items.length} صنف من ${fromW?.name} إلى ${toW?.name}`,
      [
        { text: 'موافق', style: 'cancel' },
        ...(res.transfer ? [{ text: 'طباعة الإذن', onPress: () => setPrintItem(res.transfer!.id) }] : []),
      ]
    );
  }
  function confirmDelete(id: string) {
    showAlert('حذف تحويل', 'سيتم عكس عملية التحويل وإرجاع الكميات.', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteTransfer(id) },
    ]);
  }
  async function handlePrint(action: PrintAction) {
    const t = transfers.find((x) => x.id === printItem);
    if (!t) return;
    try {
      const html = buildTransferHtml(t, settings);
      await performPrint(html, `transfer-${t.transferNo}`, action);
    } catch {
      showAlert('خطأ', 'تعذر تنفيذ الطباعة');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="التحويلات"
        subtitle={`${formatNumber(transfers.length)} عملية`}
        right={
          canEdit ? (
            <Pressable onPress={open} hitSlop={8} style={styles.headerBtn}>
              <MaterialCommunityIcons name="plus" size={22} color={Colors.white} />
            </Pressable>
          ) : null
        }
      />

      {warehouses.length < 2 ? (
        <View style={styles.warningBanner}>
          <MaterialCommunityIcons name="alert" size={18} color={Colors.warning} />
          <Text style={styles.warningText}>
            يجب وجود موقعين على الأقل لإجراء التحويلات
          </Text>
          <Pressable onPress={() => router.push('/warehouses')} hitSlop={6}>
            <Text style={styles.warningLink}>إضافة موقع</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={transfers}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="swap-horizontal"
            title="لا توجد تحويلات"
            description="ابدأ بنقل بضاعة بين المخازن والمعارض"
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
                <Pressable
                  onPress={() => setPrintItem(item.id)}
                  hitSlop={8}
                  style={styles.actBtn}
                >
                  <MaterialCommunityIcons name="printer" size={18} color={Colors.primary} />
                </Pressable>
                {canEdit ? (
                  <Pressable
                    onPress={() => confirmDelete(item.id)}
                    hitSlop={8}
                    style={styles.actBtn}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.danger} />
                  </Pressable>
                ) : null}
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                <Text style={styles.no}>#{item.transferNo}</Text>
                <View style={styles.path}>
                  <Text style={styles.warehouseText}>{item.toWarehouseName}</Text>
                  <MaterialCommunityIcons name="arrow-left" size={16} color={Colors.success} />
                  <Text style={styles.warehouseText}>{item.fromWarehouseName}</Text>
                </View>
                <Text style={styles.date}>{formatDateTime(item.date)}</Text>
                {item.userName ? <Text style={styles.user}>{item.userName}</Text> : null}
              </View>
            </View>
            <View style={styles.itemsBox}>
              {item.items.map((it) => (
                <View key={it.productId} style={styles.itemRow}>
                  <Text style={styles.itemQty}>×{formatNumber(it.quantity)}</Text>
                  <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                </View>
              ))}
            </View>
            {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
          </View>
        )}
      />

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="تحويل جديد"
        footer={
          <>
            <Button title="إلغاء" variant="secondary" onPress={() => setModalVisible(false)} style={{ flex: 1 }} />
            <Button title="تنفيذ التحويل" icon="check" onPress={handleSubmit} style={{ flex: 1 }} />
          </>
        }
      >
        <View style={styles.pathPreview}>
          <View style={styles.pathBox}>
            <MaterialCommunityIcons name="export" size={18} color={fromW ? Colors.warning : Colors.textMuted} />
            <Text style={[styles.pathLabel, !fromW && { color: Colors.textMuted }]}>
              {fromW ? fromW.name : 'حدد المصدر'}
            </Text>
          </View>
          <MaterialCommunityIcons name="arrow-left" size={20} color={Colors.primary} />
          <View style={styles.pathBox}>
            <MaterialCommunityIcons name="import" size={18} color={toW ? Colors.success : Colors.textMuted} />
            <Text style={[styles.pathLabel, !toW && { color: Colors.textMuted }]}>
              {toW ? toW.name : 'حدد الوجهة'}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => setPickerType('from')}
          style={({ pressed }) => [styles.field, pressed && { opacity: 0.85 }]}
        >
          <MaterialCommunityIcons name="chevron-down" size={20} color={Colors.textMuted} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={styles.fieldLabel}>التحويل من *</Text>
            <Text style={[styles.fieldValue, !fromW && { color: Colors.textMuted }]}>
              {fromW ? `${fromW.name} (${fromW.type === 'main' ? 'مخزن' : 'معرض'})` : 'اضغط للاختيار'}
            </Text>
          </View>
          <View style={[styles.fieldIcon, { backgroundColor: Colors.warningSoft }]}>
            <MaterialCommunityIcons name="export" size={20} color={Colors.warning} />
          </View>
        </Pressable>

        <Pressable
          onPress={() => fromId ? setPickerType('to') : showAlert('تنبيه', 'حدد الموقع المصدر أولاً')}
          style={({ pressed }) => [styles.field, pressed && { opacity: 0.85 }, !fromId && { opacity: 0.6 }]}
        >
          <MaterialCommunityIcons name="chevron-down" size={20} color={Colors.textMuted} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={styles.fieldLabel}>التحويل إلى *</Text>
            <Text style={[styles.fieldValue, !toW && { color: Colors.textMuted }]}>
              {toW ? `${toW.name} (${toW.type === 'main' ? 'مخزن' : 'معرض'})` : 'اضغط للاختيار'}
            </Text>
          </View>
          <View style={[styles.fieldIcon, { backgroundColor: Colors.successSoft }]}>
            <MaterialCommunityIcons name="import" size={20} color={Colors.success} />
          </View>
        </Pressable>

        <View style={styles.itemsHeader}>
          <Pressable
            onPress={() => fromId ? setPickerType('product') : showAlert('تنبيه', 'حدد الموقع المصدر أولاً')}
            style={({ pressed }) => [styles.addItemBtn, pressed && { opacity: 0.85 }, !fromId && { opacity: 0.5 }]}
            disabled={!fromId}
          >
            <MaterialCommunityIcons name="plus" size={16} color={Colors.primary} />
            <Text style={styles.addItemText}>إضافة منتج</Text>
          </Pressable>
          <Text style={styles.itemsHeaderLabel}>المنتجات ({items.length})</Text>
        </View>

        {items.map((it) => {
          const stock = fromId ? getStock(it.productId, fromId) : 0;
          return (
            <View key={it.productId} style={styles.editRow}>
              <Pressable onPress={() => removeItem(it.productId)} hitSlop={6} style={styles.actBtn}>
                <MaterialCommunityIcons name="close" size={16} color={Colors.danger} />
              </Pressable>
              <Input
                containerStyle={{ flex: 1 }}
                label={`متاح: ${formatNumber(stock)}`}
                value={String(it.quantity)}
                onChangeText={(t) => updateItem(it.productId, Math.min(stock, Math.max(0, Number(t) || 0)))}
                keyboardType="number-pad"
              />
              <View style={{ flex: 2, alignItems: 'flex-end' }}>
                <Text style={styles.editName} numberOfLines={2}>{it.name}</Text>
              </View>
            </View>
          );
        })}

        <Input label="ملاحظات" value={notes} onChangeText={setNotes} placeholder="ملاحظات اختيارية" multiline />
      </Modal>

      <Modal visible={pickerType === 'from'} onClose={() => setPickerType(null)} title="اختر الموقع المصدر">
        {fromOptions.length === 0 ? (
          <View style={styles.emptyPicker}>
            <MaterialCommunityIcons name="warehouse" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>لا توجد مواقع</Text>
            <Button
              title="إضافة موقع جديد"
              icon="plus"
              variant="outline"
              onPress={() => {
                setPickerType(null);
                setModalVisible(false);
                router.push('/warehouses');
              }}
            />
          </View>
        ) : (
          fromOptions.map((w) => (
            <Pressable
              key={w.id}
              onPress={() => selectFrom(w.id)}
              style={({ pressed }) => [styles.pickerRow, pressed && { opacity: 0.85 }]}
            >
              <MaterialCommunityIcons
                name={fromId === w.id ? 'check-circle' : 'circle-outline'}
                size={22}
                color={fromId === w.id ? Colors.primary : Colors.textMuted}
              />
              <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                <Text style={styles.pickerRowTitle}>{w.name}</Text>
                <Text style={styles.pickerRowSub}>
                  {w.type === 'main' ? 'مخزن رئيسي' : 'معرض'}
                  {w.type === 'showroom' && !isOwner ? ' • للمالك فقط' : ''}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </Modal>

      <Modal visible={pickerType === 'to'} onClose={() => setPickerType(null)} title="اختر موقع الوجهة">
        {toOptions.length === 0 ? (
          <View style={styles.emptyPicker}>
            <MaterialCommunityIcons name="warehouse" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>لا توجد مواقع أخرى للتحويل إليها</Text>
            <Button
              title="إضافة موقع جديد"
              icon="plus"
              variant="outline"
              onPress={() => {
                setPickerType(null);
                setModalVisible(false);
                router.push('/warehouses');
              }}
            />
          </View>
        ) : (
          toOptions.map((w) => (
            <Pressable
              key={w.id}
              onPress={() => { setToId(w.id); setPickerType(null); }}
              style={({ pressed }) => [styles.pickerRow, pressed && { opacity: 0.85 }]}
            >
              <MaterialCommunityIcons
                name={toId === w.id ? 'check-circle' : 'circle-outline'}
                size={22}
                color={toId === w.id ? Colors.primary : Colors.textMuted}
              />
              <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                <Text style={styles.pickerRowTitle}>{w.name}</Text>
                <Text style={styles.pickerRowSub}>{w.type === 'main' ? 'مخزن رئيسي' : 'معرض'}</Text>
              </View>
            </Pressable>
          ))
        )}
      </Modal>

      <Modal visible={pickerType === 'product'} onClose={() => setPickerType(null)} title="اختر منتج">
        {(() => {
          const available = products.filter((p) => fromId && getStock(p.id, fromId) > 0);
          if (available.length === 0) {
            return (
              <View style={styles.emptyPicker}>
                <MaterialCommunityIcons name="package-variant-closed" size={32} color={Colors.textMuted} />
                <Text style={styles.emptyText}>لا توجد منتجات بكميات في {fromW?.name || 'هذا الموقع'}</Text>
              </View>
            );
          }
          return available.map((p) => {
            const stock = getStock(p.id, fromId);
            const exists = items.some((it) => it.productId === p.id);
            return (
              <Pressable
                key={p.id}
                onPress={() => addProduct(p.id)}
                disabled={exists}
                style={({ pressed }) => [styles.pickerRow, pressed && { opacity: 0.85 }, exists && { opacity: 0.5 }]}
              >
                <MaterialCommunityIcons
                  name={exists ? 'check' : 'plus-circle-outline'}
                  size={22}
                  color={exists ? Colors.success : Colors.primary}
                />
                <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                  <Text style={styles.pickerRowTitle}>{p.name}</Text>
                  <Text style={styles.pickerRowSub}>متاح: {formatNumber(stock)} {p.unit || 'قطعة'}</Text>
                </View>
              </Pressable>
            );
          });
        })()}
      </Modal>

      <PrintMenu visible={!!printItem} onClose={() => setPrintItem(null)} onAction={handlePrint} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerBtn: { backgroundColor: Colors.primary, width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  warningBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.warningSoft,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.md,
  },
  warningText: { flex: 1, color: Colors.warning, fontSize: FontSize.sm, textAlign: 'right' },
  warningLink: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  list: { padding: Spacing.lg, gap: Spacing.md },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md, ...Shadow.sm },
  cardTop: { flexDirection: 'row-reverse', alignItems: 'flex-start', justifyContent: 'space-between' },
  actBtn: { width: 36, height: 36, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  no: { color: Colors.primary, fontWeight: FontWeight.semibold, fontSize: FontSize.xs },
  path: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 4 },
  warehouseText: { color: Colors.text, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  date: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4 },
  user: { fontSize: FontSize.xs, color: Colors.primary, marginTop: 2 },
  itemsBox: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.md, gap: 6 },
  itemRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  itemName: { flex: 1, color: Colors.text, fontSize: FontSize.sm, textAlign: 'right' },
  itemQty: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  notes: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: Spacing.sm, textAlign: 'right' },
  pathPreview: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, padding: Spacing.md, backgroundColor: Colors.primaryTint, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.primarySoft },
  pathBox: { flex: 1, alignItems: 'center', gap: 4 },
  pathLabel: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, textAlign: 'center' },
  field: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, minHeight: 64, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md },
  fieldLabel: { color: Colors.textSecondary, fontSize: FontSize.xs },
  fieldValue: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginTop: 2 },
  fieldIcon: { width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  itemsHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  itemsHeaderLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  addItemBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: Colors.primarySoft, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full },
  addItemText: { color: Colors.primary, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  editRow: { flexDirection: 'row-reverse', alignItems: 'flex-end', gap: Spacing.sm, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.md },
  editName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, textAlign: 'right' },
  pickerRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickerRowTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  pickerRowSub: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
  emptyPicker: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.md },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center' },
});
