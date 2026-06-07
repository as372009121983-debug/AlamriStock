// Powered by OnSpace.AI
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { Header } from '@/components/ui/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { Product, ProductPrice } from '@/constants/types';
import { formatCurrency, formatNumber, generateId } from '@/services/format';
import { uploadImages } from '@/services/imageUpload';

const UNITS = ['قطعة', 'كرتون', 'متر', 'كجم', 'لتر', 'علبة'];

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
  name: '', barcode: '', category: '', unit: 'قطعة',
  purchasePrice: '', salePrice: '', quantity: '',
  lowStockAlert: '5', warehouseId: '',
  prices: [], images: [], notes: '',
};

export default function ProductsScreen() {
  const {
    products, warehouses, addProduct, updateProduct, deleteProduct,
    settings, defaultMainWarehouseId, updateProductQuantity, getStock,
  } = useStore();
  const { canEdit, user } = useAuth();
  const { showAlert } = useAlert();
  const { guard } = useAdminGuard();
  const params = useLocalSearchParams<{ new?: string }>();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'qty' | 'price'>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [unitPickerVisible, setUnitPickerVisible] = useState(false);
  const [showPrices, setShowPrices] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [uploading, setUploading] = useState(false);

  const mainWarehouses = warehouses.filter((w) => w.type === 'main');

  useEffect(() => {
    if (params.new === '1' && !modalVisible && canEdit) openCreate();
  }, [params.new, modalVisible, canEdit]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products;
    if (q) {
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q) ||
          (p.category || '').toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'qty') cmp = a.quantity - b.quantity;
      else if (sortBy === 'price') cmp = a.salePrice - b.salePrice;
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [products, search, sortBy, sortAsc]);

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) setSortAsc(!sortAsc);
    else { setSortBy(field); setSortAsc(true); }
  }

  function openCreate() {
    if (mainWarehouses.length === 0) {
      showAlert('تنبيه', 'يجب إضافة مخزن رئيسي أولاً قبل إضافة منتجات');
      return;
    }
    setEditing(null);
    setForm({ ...emptyForm, warehouseId: defaultMainWarehouseId || mainWarehouses[0].id });
    setErrors({});
    setShowPrices(false);
    setShowBarcode(false);
    setShowDetails(false);
    setModalVisible(true);
  }

  function doOpenEdit(product: Product) {
    setEditing(product);
    setForm({
      name: product.name, barcode: product.barcode,
      category: product.category || '', unit: product.unit || 'قطعة',
      purchasePrice: String(product.purchasePrice), salePrice: String(product.salePrice),
      quantity: String(product.quantity), lowStockAlert: String(product.lowStockAlert),
      warehouseId: defaultMainWarehouseId || '',
      prices: product.prices || [], images: product.images || [],
      notes: product.notes || '',
    });
    setErrors({});
    setShowPrices((product.prices || []).length > 0);
    setShowBarcode(!!product.barcode);
    setShowDetails(!!(product.category || product.notes || (product.images || []).length));
    setModalVisible(true);
  }

  function openEdit(product: Product) {
    guard({
      title: 'تعديل منتج',
      description: `أدخل كلمة مرور المدير لتعديل "${product.name}"`,
      action: () => doOpenEdit(product),
    });
  }

  async function pickImage() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showAlert('تنبيه', 'يجب السماح بالوصول للصور');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.6,
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
      prices: [...p.prices, { id: generateId(), label: 'جملة', price: 0 }],
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

  async function handleSubmit() {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'اسم المنتج مطلوب';
    if (form.salePrice && isNaN(Number(form.salePrice))) next.salePrice = 'سعر بيع غير صحيح';
    if (form.purchasePrice && isNaN(Number(form.purchasePrice))) next.purchasePrice = 'سعر شراء غير صحيح';
    if (form.quantity && isNaN(Number(form.quantity))) next.quantity = 'كمية غير صحيحة';
    setErrors(next);
    if (Object.keys(next).length) return;

    let finalImages = form.images;
    if (user?.id && form.images.some((u) => !/^https?:\/\//i.test(u))) {
      setUploading(true);
      const result = await uploadImages(form.images, user.id, 'products');
      setUploading(false);
      if (result.failed > 0) {
        showAlert('تنبيه', `فشل رفع ${result.failed} صورة`);
      }
      finalImages = result.urls;
    }

    const payload = {
      name: form.name.trim(),
      barcode: form.barcode.trim(),
      category: form.category.trim(),
      unit: form.unit.trim() || 'قطعة',
      purchasePrice: Number(form.purchasePrice) || 0,
      salePrice: Number(form.salePrice) || 0,
      lowStockAlert: Number(form.lowStockAlert) || 0,
      prices: form.prices.filter((p) => p.label.trim()),
      images: finalImages,
      notes: form.notes.trim(),
    };

    if (editing) {
      updateProduct(editing.id, payload);
      const newQty = Number(form.quantity) || 0;
      const oldQty = editing.quantity;
      if (newQty !== oldQty && defaultMainWarehouseId) {
        // Distribute the delta - put adjustment on main warehouse
        const currentMainStock = getStock(editing.id, defaultMainWarehouseId);
        const delta = newQty - oldQty;
        const newMainStock = Math.max(0, currentMainStock + delta);
        const result = updateProductQuantity(editing.id, defaultMainWarehouseId, newMainStock);
        if (!result.ok) {
          showAlert('تنبيه', result.message || 'تعذر تعديل الكمية');
        }
      }
      setModalVisible(false);
    } else {
      const res = addProduct(payload, form.warehouseId, Number(form.quantity) || 0);
      if (!res.ok) { showAlert('خطأ', res.message || ''); return; }
      setModalVisible(false);
    }
  }

  function confirmDelete(product: Product) {
    guard({
      title: 'حذف منتج',
      description: `أدخل كلمة مرور المدير لحذف "${product.name}"`,
      action: () => deleteProduct(product.id),
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="المنتجات" />
      <View style={styles.toolbar}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="اسم المنتج" />
      </View>

      <View style={styles.tableHeader}>
        <Pressable onPress={() => toggleSort('price')} style={styles.thBtn}>
          <Text style={styles.thText}>السعر</Text>
          <MaterialCommunityIcons name="swap-vertical" size={14} color={Colors.primary} />
        </Pressable>
        <Pressable onPress={() => toggleSort('qty')} style={styles.thBtn}>
          <Text style={styles.thText}>الكمية</Text>
          <MaterialCommunityIcons name="swap-vertical" size={14} color={Colors.primary} />
        </Pressable>
        <Pressable onPress={() => toggleSort('name')} style={[styles.thBtn, { flex: 2, justifyContent: 'flex-end' }]}>
          <Text style={styles.thText}>المنتج</Text>
          <MaterialCommunityIcons name="swap-vertical" size={14} color={Colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="cube-scan"
            title={search ? 'لا توجد نتائج' : 'لا توجد منتجات'}
            description={search ? 'جرب كلمة بحث أخرى' : 'اضغط + لإضافة أول منتج'}
          />
        }
        renderItem={({ item }) => {
          const low = item.quantity <= item.lowStockAlert;
          return (
            <Pressable
              onPress={() => canEdit && openEdit(item)}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: Colors.surfaceAlt }]}
            >
              <Text style={styles.cellNum}>{formatNumber(item.salePrice)}</Text>
              <Text style={[styles.cellNum, low && { color: Colors.danger, fontWeight: FontWeight.bold }]}>
                {formatNumber(item.quantity)}
              </Text>
              <View style={styles.nameCell}>
                <Text style={styles.cellName} numberOfLines={1}>{item.name}</Text>
                {item.unit ? <Text style={styles.cellUnit}>{item.unit}</Text> : null}
              </View>
            </Pressable>
          );
        }}
      />

      {canEdit ? (
        <>
          <Pressable
            onPress={() => setMenuVisible(true)}
            style={({ pressed }) => [styles.fabSmall, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="dots-horizontal" size={24} color={Colors.primary} />
          </Pressable>
          <Pressable
            onPress={openCreate}
            style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
          >
            <MaterialCommunityIcons name="plus" size={28} color={Colors.white} />
          </Pressable>
        </>
      ) : null}

      <Modal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        title="خيارات"
      >
        <Pressable
          onPress={() => { setMenuVisible(false); }}
          style={styles.menuRow}
        >
          <MaterialCommunityIcons name="chevron-left" size={20} color={Colors.textMuted} />
          <Text style={styles.menuLabel}>عرض المنتجات</Text>
        </Pressable>
        <Pressable
          onPress={() => { setMenuVisible(false); openCreate(); }}
          style={styles.menuRow}
        >
          <MaterialCommunityIcons name="chevron-left" size={20} color={Colors.textMuted} />
          <Text style={styles.menuLabel}>إضافة منتج جديد</Text>
        </Pressable>
      </Modal>

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editing ? 'تعديل منتج' : 'اضافة منتج جديد'}
        footer={
          <Button
            title={uploading ? 'جاري الرفع...' : 'حفظ'}
            onPress={handleSubmit}
            loading={uploading}
            fullWidth
            size="lg"
          />
        }
      >
        <Input
          label="اسم المنتج"
          value={form.name}
          onChangeText={(t) => setForm((p) => ({ ...p, name: t }))}
          placeholder="اسم المنتج"
          error={errors.name}
        />

        <View>
          <Text style={styles.fieldLabel}>الكمية {editing ? '(يمكن تعديلها بعد الإضافة)' : ''}</Text>
          <View style={styles.qtyRow}>
            <Pressable
              onPress={() => setUnitPickerVisible(true)}
              style={styles.unitChip}
            >
              <Text style={styles.unitText}>{form.unit}</Text>
            </Pressable>
            <View style={styles.qtyDivider} />
            <Input
              containerStyle={{ flex: 1 }}
              style={{ borderWidth: 0, paddingHorizontal: Spacing.md }}
              value={form.quantity}
              onChangeText={(t) => setForm((p) => ({ ...p, quantity: t }))}
              placeholder="0.00"
              keyboardType="decimal-pad"
              error={errors.quantity}
            />
          </View>
          {editing ? (
            <Text style={styles.qtyHint}>
              تعديل الكمية يطبَّق على المخزن الرئيسي الافتراضي
            </Text>
          ) : null}
        </View>

        <View style={styles.priceRow}>
          <Input
            containerStyle={{ flex: 1 }}
            label="سعر البيع"
            value={form.salePrice}
            onChangeText={(t) => setForm((p) => ({ ...p, salePrice: t }))}
            placeholder="0.00"
            keyboardType="decimal-pad"
            error={errors.salePrice}
          />
          <Input
            containerStyle={{ flex: 1 }}
            label="سعر الشراء"
            value={form.purchasePrice}
            onChangeText={(t) => setForm((p) => ({ ...p, purchasePrice: t }))}
            placeholder="0.00"
            keyboardType="decimal-pad"
            error={errors.purchasePrice}
          />
        </View>

        {!showPrices ? (
          <Pressable onPress={() => { setShowPrices(true); addCustomPrice(); }} style={styles.addLink}>
            <MaterialCommunityIcons name="plus" size={16} color={Colors.primary} />
            <Text style={styles.addLinkText}>اضافة اسعار بيع اخري</Text>
          </Pressable>
        ) : (
          <View style={styles.expanded}>
            <Text style={styles.fieldLabel}>أسعار بيع إضافية</Text>
            {form.prices.map((p, idx) => (
              <View key={p.id} style={styles.customPriceRow}>
                <Pressable onPress={() => removeCustomPrice(idx)} hitSlop={6} style={styles.actBtnSmall}>
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
            <Pressable onPress={addCustomPrice} style={styles.addLink}>
              <MaterialCommunityIcons name="plus" size={14} color={Colors.primary} />
              <Text style={styles.addLinkText}>إضافة سعر آخر</Text>
            </Pressable>
          </View>
        )}

        {!showBarcode ? (
          <Pressable onPress={() => setShowBarcode(true)} style={styles.addLink}>
            <MaterialCommunityIcons name="plus" size={16} color={Colors.primary} />
            <Text style={styles.addLinkText}>اضافة باركود للمنتج</Text>
          </Pressable>
        ) : (
          <Input
            label="الباركود"
            value={form.barcode}
            onChangeText={(t) => setForm((p) => ({ ...p, barcode: t }))}
            placeholder="الباركود"
          />
        )}

        {!showDetails ? (
          <Pressable onPress={() => setShowDetails(true)} style={styles.addLink}>
            <MaterialCommunityIcons name="plus" size={16} color={Colors.primary} />
            <Text style={styles.addLinkText}>اضافة تفاصيل اخري</Text>
          </Pressable>
        ) : (
          <View style={styles.expanded}>
            <Input
              label="الفئة"
              value={form.category}
              onChangeText={(t) => setForm((p) => ({ ...p, category: t }))}
              placeholder="مثل: خلاطات"
            />
            <Input
              label="حد التنبيه"
              value={form.lowStockAlert}
              onChangeText={(t) => setForm((p) => ({ ...p, lowStockAlert: t }))}
              placeholder="5"
              keyboardType="number-pad"
            />
            <Input
              label="ملاحظات"
              value={form.notes}
              onChangeText={(t) => setForm((p) => ({ ...p, notes: t }))}
              placeholder="ملاحظات"
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
            <View style={styles.imagesHeader}>
              <Button title="إضافة صورة" icon="image-plus" variant="secondary" size="sm" onPress={pickImage} />
              <Text style={styles.fieldLabel}>صور المنتج ({form.images.length})</Text>
            </View>
            {form.images.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {form.images.map((uri, idx) => (
                  <View key={idx} style={styles.imgWrap}>
                    <Image source={{ uri }} style={styles.img} contentFit="cover" transition={200} />
                    <Pressable
                      onPress={() => setForm((p) => ({ ...p, images: p.images.filter((_, i) => i !== idx) }))}
                      style={styles.imgRemove}
                    >
                      <MaterialCommunityIcons name="close" size={14} color={Colors.white} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>
        )}
      </Modal>

      <Modal
        visible={unitPickerVisible}
        onClose={() => setUnitPickerVisible(false)}
        title="اختر الوحدة"
      >
        {UNITS.map((u) => (
          <Pressable
            key={u}
            onPress={() => {
              setForm((p) => ({ ...p, unit: u }));
              setUnitPickerVisible(false);
            }}
            style={styles.menuRow}
          >
            <MaterialCommunityIcons
              name={form.unit === u ? 'check-circle' : 'circle-outline'}
              size={20}
              color={form.unit === u ? Colors.primary : Colors.textMuted}
            />
            <Text style={styles.menuLabel}>{u}</Text>
          </Pressable>
        ))}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  toolbar: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  tableHeader: {
    flexDirection: 'row-reverse',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    gap: Spacing.md,
  },
  thBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'center',
  },
  thText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  list: { paddingBottom: 120 },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
    minHeight: 60,
  },
  cellNum: {
    flex: 1,
    fontSize: FontSize.lg,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: FontWeight.medium,
  },
  nameCell: { flex: 2, alignItems: 'flex-end' },
  cellName: { fontSize: FontSize.md, color: Colors.text, fontWeight: FontWeight.semibold, textAlign: 'right' },
  cellUnit: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
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
  fabSmall: {
    position: 'absolute',
    bottom: 100,
    left: 28,
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  fieldLabel: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: 8, textAlign: 'right' },
  qtyHint: { fontSize: FontSize.xs, color: Colors.info, textAlign: 'right', marginTop: 4 },
  qtyRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 52,
  },
  unitChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.full,
    margin: 6,
  },
  unitText: { color: Colors.primary, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  qtyDivider: { width: 1, height: 28, backgroundColor: Colors.border },
  priceRow: { flexDirection: 'row-reverse', gap: Spacing.md },
  addLink: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    paddingVertical: Spacing.sm,
  },
  addLinkText: { color: Colors.primary, fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  expanded: { gap: Spacing.md },
  customPriceRow: {
    flexDirection: 'row-reverse',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  actBtnSmall: {
    width: 32, height: 32, borderRadius: Radius.full,
    backgroundColor: Colors.dangerSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  imagesHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  imgWrap: { position: 'relative', marginLeft: Spacing.sm },
  img: { width: 80, height: 80, borderRadius: Radius.md },
  imgRemove: {
    position: 'absolute', top: -6, left: -6, width: 22, height: 22,
    borderRadius: Radius.full, backgroundColor: Colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  menuRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuLabel: { flex: 1, color: Colors.text, fontSize: FontSize.md, textAlign: 'right' },
});
