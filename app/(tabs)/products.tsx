// Powered by OnSpace.AI
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { Header } from '@/components/ui/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { Product, ProductPrice } from '@/constants/types';
import { formatCurrency, formatNumber, generateId } from '@/services/format';

type FormState = {
  name: string;
  barcode: string;
  category: string;
  unit: string;
  purchasePrice: string;
  salePrice: string;
  quantity: string;
  lowStockAlert: string;
  warehouseId: string;
  prices: ProductPrice[];
  images: string[];
  notes: string;
};

const emptyForm: FormState = {
  name: '',
  barcode: '',
  category: '',
  unit: 'قطعة',
  purchasePrice: '',
  salePrice: '',
  quantity: '',
  lowStockAlert: '5',
  warehouseId: '',
  prices: [],
  images: [],
  notes: '',
};

export default function ProductsScreen() {
  const {
    products,
    warehouses,
    addProduct,
    updateProduct,
    deleteProduct,
    settings,
    defaultMainWarehouseId,
    getStock,
  } = useStore();
  const { canEdit } = useAuth();
  const { showAlert } = useAlert();
  const params = useLocalSearchParams<{ new?: string }>();

  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const mainWarehouses = warehouses.filter((w) => w.type === 'main');

  useEffect(() => {
    if (params.new === '1' && !modalVisible && canEdit) openCreate();
  }, [params.new, modalVisible, canEdit]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products;
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, search]);

  function openCreate() {
    if (mainWarehouses.length === 0) {
      showAlert('تنبيه', 'يجب إضافة مخزن رئيسي أولاً قبل إضافة منتجات');
      return;
    }
    setEditing(null);
    setForm({ ...emptyForm, warehouseId: defaultMainWarehouseId || mainWarehouses[0].id });
    setErrors({});
    setModalVisible(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      name: product.name,
      barcode: product.barcode,
      category: product.category || '',
      unit: product.unit || 'قطعة',
      purchasePrice: String(product.purchasePrice),
      salePrice: String(product.salePrice),
      quantity: String(product.quantity),
      lowStockAlert: String(product.lowStockAlert),
      warehouseId: defaultMainWarehouseId || '',
      prices: product.prices || [],
      images: product.images || [],
      notes: product.notes || '',
    });
    setErrors({});
    setModalVisible(true);
  }

  async function pickImage() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showAlert('تنبيه', 'يجب السماح بالوصول للصور');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.6,
      });
      if (!res.canceled && res.assets[0]) {
        setForm((p) => ({ ...p, images: [...p.images, res.assets[0].uri] }));
      }
    } catch {
      showAlert('خطأ', 'تعذر اختيار الصورة');
    }
  }

  function addCustomPrice() {
    setForm((p) => ({
      ...p,
      prices: [...p.prices, { id: generateId(), label: 'سعر جديد', price: 0 }],
    }));
  }

  function updateCustomPrice(idx: number, patch: Partial<ProductPrice>) {
    setForm((p) => ({
      ...p,
      prices: p.prices.map((x, i) => (i === idx ? { ...x, ...patch } : x)),
    }));
  }

  function removeCustomPrice(idx: number) {
    setForm((p) => ({ ...p, prices: p.prices.filter((_, i) => i !== idx) }));
  }

  function handleSubmit() {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'الاسم مطلوب';
    if (!form.salePrice || isNaN(Number(form.salePrice))) next.salePrice = 'سعر بيع غير صحيح';
    if (!form.purchasePrice || isNaN(Number(form.purchasePrice)))
      next.purchasePrice = 'سعر شراء غير صحيح';
    if (form.quantity === '' || isNaN(Number(form.quantity))) next.quantity = 'كمية غير صحيحة';
    if (!editing && !form.warehouseId) next.warehouseId = 'اختر مخزن';
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      name: form.name.trim(),
      barcode: form.barcode.trim(),
      category: form.category.trim(),
      unit: form.unit.trim() || 'قطعة',
      purchasePrice: Number(form.purchasePrice),
      salePrice: Number(form.salePrice),
      lowStockAlert: Number(form.lowStockAlert) || 0,
      prices: form.prices.filter((p) => p.label.trim()),
      images: form.images,
      notes: form.notes.trim(),
    };

    if (editing) {
      updateProduct(editing.id, payload);
      setModalVisible(false);
    } else {
      const res = addProduct(payload, form.warehouseId, Number(form.quantity));
      if (!res.ok) {
        showAlert('خطأ', res.message || 'تعذر الإضافة');
        return;
      }
      setModalVisible(false);
    }
  }

  function confirmDelete(product: Product) {
    showAlert('حذف منتج', `هل تريد حذف "${product.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteProduct(product.id) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="المنتجات"
        subtitle={`${formatNumber(products.length)} منتج`}
        showBack={false}
        right={
          canEdit ? (
            <Pressable onPress={openCreate} hitSlop={8} style={styles.headerBtn}>
              <MaterialCommunityIcons name="plus" size={22} color={Colors.white} />
            </Pressable>
          ) : null
        }
      />
      <View style={styles.toolbar}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="بحث بالاسم أو الباركود أو الفئة..."
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="package-variant-closed"
            title={search ? 'لا توجد نتائج' : 'لا توجد منتجات'}
            description={search ? 'جرب كلمة بحث أخرى' : 'ابدأ بإضافة أول منتج إلى المخزون'}
          />
        }
        renderItem={({ item }) => {
          const low = item.quantity <= item.lowStockAlert;
          const profit = item.salePrice - item.purchasePrice;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                {canEdit ? (
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => confirmDelete(item)}
                      hitSlop={8}
                      style={({ pressed }) => [styles.actBtn, pressed && { opacity: 0.7 }]}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.danger} />
                    </Pressable>
                    <Pressable
                      onPress={() => openEdit(item)}
                      hitSlop={8}
                      style={({ pressed }) => [styles.actBtn, pressed && { opacity: 0.7 }]}
                    >
                      <MaterialCommunityIcons name="pencil-outline" size={18} color={Colors.info} />
                    </Pressable>
                  </View>
                ) : <View />}
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                  {item.barcode ? <Text style={styles.cardSubtitle}>كود: {item.barcode}</Text> : null}
                  {item.category ? (
                    <View style={styles.categoryTag}>
                      <Text style={styles.categoryText}>{item.category}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              {item.images && item.images.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow}>
                  {item.images.map((uri, idx) => (
                    <Pressable key={idx} onPress={() => setZoomImage(uri)}>
                      <Image source={{ uri }} style={styles.imageThumb} />
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
              <View style={styles.cardRow}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>الكمية</Text>
                  <Text style={[styles.metricValue, low && { color: Colors.danger }]}>
                    {formatNumber(item.quantity)} {item.unit || ''}
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>الشراء</Text>
                  <Text style={styles.metricValue}>
                    {formatCurrency(item.purchasePrice, settings.currency)}
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>البيع</Text>
                  <Text style={[styles.metricValue, { color: Colors.primary }]}>
                    {formatCurrency(item.salePrice, settings.currency)}
                  </Text>
                </View>
              </View>
              {item.prices && item.prices.length > 0 ? (
                <View style={styles.pricesBox}>
                  {item.prices.map((p) => (
                    <View key={p.id} style={styles.priceTag}>
                      <Text style={styles.priceTagPrice}>
                        {formatCurrency(p.price, settings.currency)}
                      </Text>
                      <Text style={styles.priceTagLabel}>{p.label}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={styles.warehouseBreak}>
                {warehouses.map((w) => {
                  const qty = getStock(item.id, w.id);
                  if (qty === 0) return null;
                  return (
                    <View key={w.id} style={styles.whTag}>
                      <MaterialCommunityIcons
                        name={w.type === 'main' ? 'warehouse' : 'storefront-outline'}
                        size={12}
                        color={Colors.primary}
                      />
                      <Text style={styles.whTagText}>
                        {w.name}: {formatNumber(qty)}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.cardFooter}>
                {low ? (
                  <View style={[styles.tag, { backgroundColor: Colors.dangerSoft }]}>
                    <MaterialCommunityIcons name="alert" size={12} color={Colors.danger} />
                    <Text style={[styles.tagText, { color: Colors.danger }]}>كمية منخفضة</Text>
                  </View>
                ) : (
                  <View style={[styles.tag, { backgroundColor: Colors.successSoft }]}>
                    <MaterialCommunityIcons name="check" size={12} color={Colors.success} />
                    <Text style={[styles.tagText, { color: Colors.success }]}>متوفر</Text>
                  </View>
                )}
                <Text style={styles.profit}>
                  ربح/قطعة:{' '}
                  <Text style={{ color: profit >= 0 ? Colors.success : Colors.danger }}>
                    {formatCurrency(profit, settings.currency)}
                  </Text>
                </Text>
              </View>
            </View>
          );
        }}
      />

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editing ? 'تعديل منتج' : 'إضافة منتج'}
        footer={
          <>
            <Button title="إلغاء" variant="secondary" onPress={() => setModalVisible(false)} style={{ flex: 1 }} />
            <Button title="حفظ" onPress={handleSubmit} style={{ flex: 1 }} />
          </>
        }
      >
        <Input
          label="اسم المنتج"
          value={form.name}
          onChangeText={(t) => setForm((p) => ({ ...p, name: t }))}
          placeholder="مثال: خلاط مياه كروم"
          error={errors.name}
        />
        <Input
          label="الباركود"
          value={form.barcode}
          onChangeText={(t) => setForm((p) => ({ ...p, barcode: t }))}
          placeholder="اختياري"
        />
        <Input
          label="الفئة"
          value={form.category}
          onChangeText={(t) => setForm((p) => ({ ...p, category: t }))}
          placeholder="مثل: خلاطات، أدوات صحية"
        />
        <Input
          label="الوحدة"
          value={form.unit}
          onChangeText={(t) => setForm((p) => ({ ...p, unit: t }))}
          placeholder="قطعة، كرتون، متر"
        />
        <Input
          label="سعر الشراء"
          value={form.purchasePrice}
          onChangeText={(t) => setForm((p) => ({ ...p, purchasePrice: t }))}
          placeholder="0.00"
          keyboardType="decimal-pad"
          error={errors.purchasePrice}
        />
        <Input
          label="سعر البيع (قطاعي)"
          value={form.salePrice}
          onChangeText={(t) => setForm((p) => ({ ...p, salePrice: t }))}
          placeholder="0.00"
          keyboardType="decimal-pad"
          error={errors.salePrice}
        />

        <View style={styles.subSection}>
          <Pressable onPress={addCustomPrice} style={styles.addPriceBtn}>
            <MaterialCommunityIcons name="plus" size={14} color={Colors.primary} />
            <Text style={styles.addPriceText}>إضافة سعر</Text>
          </Pressable>
          <Text style={styles.subSectionTitle}>أسعار إضافية (جملة، نصف جملة...)</Text>
        </View>
        {form.prices.map((p, idx) => (
          <View key={p.id} style={styles.priceRow}>
            <Pressable onPress={() => removeCustomPrice(idx)} hitSlop={6} style={styles.actBtn}>
              <MaterialCommunityIcons name="close" size={16} color={Colors.danger} />
            </Pressable>
            <Input
              containerStyle={{ flex: 1 }}
              value={String(p.price)}
              onChangeText={(t) => updateCustomPrice(idx, { price: Number(t) || 0 })}
              keyboardType="decimal-pad"
              placeholder="السعر"
            />
            <Input
              containerStyle={{ flex: 1 }}
              value={p.label}
              onChangeText={(t) => updateCustomPrice(idx, { label: t })}
              placeholder="جملة"
            />
          </View>
        ))}

        {!editing ? (
          <>
            <Text style={styles.fieldLabel}>المخزن (يجب أن يكون رئيسي)</Text>
            {mainWarehouses.map((w) => (
              <Pressable
                key={w.id}
                onPress={() => setForm((p) => ({ ...p, warehouseId: w.id }))}
                style={({ pressed }) => [
                  styles.whSelect,
                  form.warehouseId === w.id && styles.whSelectActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <MaterialCommunityIcons
                  name={form.warehouseId === w.id ? 'check-circle' : 'circle-outline'}
                  size={20}
                  color={form.warehouseId === w.id ? Colors.primary : Colors.textMuted}
                />
                <Text style={styles.whSelectText}>{w.name}</Text>
              </Pressable>
            ))}
            {errors.warehouseId ? <Text style={{ color: Colors.danger }}>{errors.warehouseId}</Text> : null}
          </>
        ) : null}

        <Input
          label={editing ? 'الكمية الإجمالية (للعرض فقط)' : 'الكمية الابتدائية'}
          value={form.quantity}
          onChangeText={(t) => setForm((p) => ({ ...p, quantity: t }))}
          placeholder="0"
          keyboardType="number-pad"
          editable={!editing}
          error={errors.quantity}
        />
        <Input
          label="حد التنبيه"
          value={form.lowStockAlert}
          onChangeText={(t) => setForm((p) => ({ ...p, lowStockAlert: t }))}
          placeholder="5"
          keyboardType="number-pad"
        />

        <View style={styles.subSection}>
          <Button title="إضافة صورة" icon="image-plus" variant="secondary" size="sm" onPress={pickImage} />
          <Text style={styles.subSectionTitle}>صور المنتج ({form.images.length})</Text>
        </View>
        {form.images.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {form.images.map((uri, idx) => (
              <View key={idx} style={styles.formImageWrap}>
                <Image source={{ uri }} style={styles.formImage} />
                <Pressable
                  onPress={() => setForm((p) => ({ ...p, images: p.images.filter((_, i) => i !== idx) }))}
                  style={styles.removeImageBtn}
                >
                  <MaterialCommunityIcons name="close" size={14} color={Colors.white} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null}
        <Input
          label="ملاحظات"
          value={form.notes}
          onChangeText={(t) => setForm((p) => ({ ...p, notes: t }))}
          multiline
          numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />
      </Modal>

      <Modal visible={!!zoomImage} onClose={() => setZoomImage(null)} title="عرض الصورة">
        {zoomImage ? (
          <Image source={{ uri: zoomImage }} style={styles.zoomImg} resizeMode="contain" />
        ) : null}
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
  toolbar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
  },
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
  actions: { flexDirection: 'row-reverse', gap: Spacing.sm },
  actBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  cardSubtitle: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4 },
  categoryTag: {
    marginTop: 6,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  categoryText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  imagesRow: { marginBottom: Spacing.md },
  imageThumb: {
    width: 70,
    height: 70,
    borderRadius: Radius.md,
    marginLeft: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
  },
  cardRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  metric: { alignItems: 'center', flex: 1 },
  metricLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  metricValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text, marginTop: 4 },
  pricesBox: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.sm,
  },
  priceTag: {
    flexDirection: 'row-reverse',
    backgroundColor: Colors.infoSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    gap: 4,
  },
  priceTagLabel: { color: Colors.info, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  priceTagPrice: { color: Colors.info, fontSize: FontSize.xs },
  warehouseBreak: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 4, marginTop: Spacing.sm },
  whTag: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  whTagText: { color: Colors.primary, fontSize: 11, fontWeight: FontWeight.medium },
  cardFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  tag: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  tagText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  profit: { fontSize: FontSize.xs, color: Colors.textSecondary },
  fieldLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, textAlign: 'right', marginBottom: 6 },
  whSelect: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    marginBottom: 6,
  },
  whSelectActive: { backgroundColor: Colors.primarySoft },
  whSelectText: { color: Colors.text, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  subSection: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  subSectionTitle: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  addPriceBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  addPriceText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  priceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  formImageWrap: { position: 'relative', marginLeft: Spacing.sm },
  formImage: { width: 80, height: 80, borderRadius: Radius.md },
  removeImageBtn: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomImg: { width: '100%', height: 400, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md },
});
