
// Powered by OnSpace.AI
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { extractProductsFromImage, OCRProduct } from '@/services/ocr';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';

type EditRow = {
  name: string;
  quantity: string;
  price: string;
  unit: string;
  selected: boolean;
};

export default function OCRImportScreen() {
  const { addProduct, defaultMainWarehouseId, warehouses } = useStore();
  const { canEdit } = useAuth();
  const { showAlert } = useAlert();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [rows, setRows] = useState<EditRow[]>([]);
  const [importing, setImporting] = useState(false);

  const mainWarehouses = useMemo(() => warehouses.filter((w) => w.type === 'main'), [warehouses]);
  const [warehouseId, setWarehouseId] = useState<string>(defaultMainWarehouseId || '');

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      showAlert('تنبيه', 'الرجاء السماح باستخدام الكاميرا');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      setImageUri(result.assets[0].uri);
      setRows([]);
    }
  }

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      showAlert('تنبيه', 'الرجاء السماح بالوصول للمعرض');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      setImageUri(result.assets[0].uri);
      setRows([]);
    }
  }

  async function handleAnalyze() {
    if (!imageUri || analyzing) return;
    setAnalyzing(true);
    const result = await extractProductsFromImage(imageUri);
    setAnalyzing(false);
    if (!result.ok) {
      showAlert(
        'تعذر التحليل',
        `${result.error}\n\nنصيحة:\n• تأكد من جودة الصورة ووضوح النص\n• تأكد من الاتصال بالإنترنت\n• جرب صورة أوضح أو إضاءة أفضل`
      );
      return;
    }
    if (result.products.length === 0) {
      showAlert('لم يتم استخراج بيانات', 'لم يتمكن النظام من التعرف على منتجات في الصورة');
      return;
    }
    setRows(
      result.products.map((p: OCRProduct) => ({
        name: p.name,
        quantity: String(p.quantity || 1),
        price: String(p.price || 0),
        unit: p.unit || 'قطعة',
        selected: true,
      }))
    );
  }

  function updateRow(idx: number, patch: Partial<EditRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function deleteRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function toggleAll() {
    const allSelected = rows.every((r) => r.selected);
    setRows((prev) => prev.map((r) => ({ ...r, selected: !allSelected })));
  }

  function handleReset() {
    setImageUri(null);
    setRows([]);
  }

  async function handleImport() {
    if (!warehouseId) {
      showAlert('تنبيه', 'اختر المخزن الرئيسي للاستيراد');
      return;
    }
    const valid = rows.filter((r) => r.selected && r.name.trim());
    if (valid.length === 0) {
      showAlert('تنبيه', 'اختر منتج واحد على الأقل');
      return;
    }
    setImporting(true);
    let success = 0;
    let failed = 0;
    for (const r of valid) {
      const salePrice = parseFloat(r.price) || 0;
      const quantity = parseFloat(r.quantity) || 0;
      const result = addProduct(
        {
          name: r.name.trim(),
          barcode: '',
          category: 'مستخرج بالذكاء الاصطناعي',
          unit: r.unit || 'قطعة',
          purchasePrice: salePrice * 0.7,
          salePrice,
          prices: salePrice > 0 ? [{ id: 'p1', label: 'قطاعي', price: salePrice }] : [],
          lowStockAlert: 0,
          images: [],
          notes: '',
        },
        warehouseId,
        quantity
      );
      if (result.ok) success++;
      else failed++;
    }
    setImporting(false);
    showAlert(
      'اكتمل الاستيراد',
      `تم استيراد ${success} منتج${failed > 0 ? ` - فشل ${failed}` : ''}`,
      [{ text: 'موافق', onPress: () => handleReset() }]
    );
  }

  if (!canEdit) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="استخراج المنتجات" />
        <EmptyState icon="lock" title="غير مسموح" description="ليس لديك صلاحية" />
      </SafeAreaView>
    );
  }

  if (mainWarehouses.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="استخراج المنتجات" />
        <EmptyState
          icon="warehouse"
          title="لا يوجد مخزن رئيسي"
          description="أنشئ مخزن رئيسي أولاً"
        />
      </SafeAreaView>
    );
  }

  // Step 1: No image
  if (!imageUri) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="استخراج المنتجات بالذكاء الاصطناعي" />
        <View style={styles.uploadContainer}>
          <LinearGradient
            colors={[Colors.primary, '#0EA5A4']}
            style={styles.aiHero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.aiIconWrap}>
              <MaterialCommunityIcons name="robot-outline" size={48} color={Colors.white} />
            </View>
            <Text style={styles.aiTitle}>OCR بالذكاء الاصطناعي</Text>
            <Text style={styles.aiSub}>
              صور قائمة الأسعار أو الفاتورة وسيقوم الذكاء الاصطناعي باستخراج المنتجات تلقائياً
            </Text>
          </LinearGradient>

          <View style={styles.featuresCard}>
            <View style={styles.featureRow}>
              <MaterialCommunityIcons name="camera-iris" size={18} color={Colors.primary} />
              <Text style={styles.featureText}>قراءة قوائم الأسعار من الصور</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialCommunityIcons name="text-recognition" size={18} color={Colors.primary} />
              <Text style={styles.featureText}>التعرف على النصوص العربية والإنجليزية</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialCommunityIcons name="format-list-bulleted" size={18} color={Colors.primary} />
              <Text style={styles.featureText}>استخراج الاسم والكمية والسعر تلقائياً</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialCommunityIcons name="pencil-outline" size={18} color={Colors.primary} />
              <Text style={styles.featureText}>تعديل البيانات قبل الاستيراد</Text>
            </View>
          </View>

          <View style={styles.btnRow}>
            <Button
              title="من الكاميرا"
              icon="camera"
              onPress={pickFromCamera}
              variant="primary"
              style={{ flex: 1 }}
            />
            <Button
              title="من المعرض"
              icon="image-multiple"
              onPress={pickFromGallery}
              variant="secondary"
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Step 2: Image picked, no analysis yet
  if (rows.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="معاينة الصورة" />
        <View style={styles.previewContainer}>
          <View style={styles.imageWrap}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} contentFit="contain" />
          </View>

          {analyzing ? (
            <View style={styles.analyzingBox}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.analyzingTitle}>جاري التحليل بالذكاء الاصطناعي...</Text>
              <Text style={styles.analyzingSub}>قد يستغرق ذلك بضع ثواني</Text>
            </View>
          ) : (
            <View style={styles.actionsRow}>
              <Button
                title="تحليل الصورة"
                icon="robot-outline"
                onPress={handleAnalyze}
                variant="primary"
                fullWidth
                size="lg"
              />
              <View style={styles.btnRow}>
                <Button
                  title="إعادة"
                  icon="refresh"
                  onPress={handleReset}
                  variant="ghost"
                  style={{ flex: 1 }}
                />
                <Button
                  title="تغيير صورة"
                  icon="image-edit-outline"
                  onPress={pickFromGallery}
                  variant="secondary"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Step 3: Show extracted products for editing
  const selectedCount = rows.filter((r) => r.selected).length;
  const allSelected = rows.length > 0 && rows.every((r) => r.selected);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="نتائج الاستخراج"
        subtitle={`${rows.length} منتج • محدد ${selectedCount}`}
      />

      <View style={styles.thumbStrip}>
        <Image source={{ uri: imageUri }} style={styles.thumb} contentFit="cover" />
        <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
          <View style={styles.aiBadge}>
            <MaterialCommunityIcons name="robot-outline" size={14} color={Colors.primary} />
            <Text style={styles.aiBadgeText}>تم الاستخراج بنجاح</Text>
          </View>
          <Text style={styles.thumbHint}>راجع البيانات وعدّلها قبل الاستيراد</Text>
        </View>
      </View>

      <View style={styles.actionsBar}>
        <Pressable onPress={handleReset} style={styles.actBtn}>
          <MaterialCommunityIcons name="refresh" size={18} color={Colors.textSecondary} />
          <Text style={styles.actText}>صورة أخرى</Text>
        </Pressable>
        <Pressable onPress={toggleAll} style={styles.actBtn}>
          <MaterialCommunityIcons
            name={allSelected ? 'checkbox-multiple-blank-outline' : 'checkbox-multiple-marked'}
            size={18}
            color={Colors.primary}
          />
          <Text style={[styles.actText, { color: Colors.primary }]}>
            {allSelected ? 'إلغاء' : 'تحديد الكل'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.warehouseRow}>
        <Text style={styles.warehouseLabel}>المخزن:</Text>
        <View style={styles.warehouseChips}>
          {mainWarehouses.map((w) => {
            const a = warehouseId === w.id;
            return (
              <Pressable
                key={w.id}
                onPress={() => setWarehouseId(w.id)}
                style={({ pressed }) => [
                  styles.chip,
                  a && styles.chipActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={[styles.chipText, a && styles.chipTextActive]}>{w.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <View style={[styles.editRow, !item.selected && { opacity: 0.5 }]}>
            <View style={styles.editRowHeader}>
              <Pressable
                onPress={() => updateRow(index, { selected: !item.selected })}
                style={[styles.checkbox, item.selected && styles.checkboxActive]}
              >
                {item.selected ? (
                  <MaterialCommunityIcons name="check" size={14} color={Colors.white} />
                ) : null}
              </Pressable>
              <View style={{ flex: 1 }}>
                <TextInput
                  value={item.name}
                  onChangeText={(t) => updateRow(index, { name: t })}
                  style={styles.nameInput}
                  placeholder="اسم المنتج"
                  textAlign="right"
                />
              </View>
              <Pressable onPress={() => deleteRow(index)} hitSlop={8} style={styles.deleteBtn}>
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={18}
                  color={Colors.danger}
                />
              </Pressable>
            </View>
            <View style={styles.fieldsRow}>
              <View style={styles.fieldCol}>
                <Text style={styles.fieldLabel}>الوحدة</Text>
                <TextInput
                  value={item.unit}
                  onChangeText={(t) => updateRow(index, { unit: t })}
                  style={styles.smallInput}
                  textAlign="center"
                  placeholder="قطعة"
                />
              </View>
              <View style={styles.fieldCol}>
                <Text style={styles.fieldLabel}>الكمية</Text>
                <TextInput
                  value={item.quantity}
                  onChangeText={(t) => updateRow(index, { quantity: t.replace(/[^\d.]/g, '') })}
                  style={styles.smallInput}
                  keyboardType="numeric"
                  textAlign="center"
                />
              </View>
              <View style={styles.fieldCol}>
                <Text style={styles.fieldLabel}>السعر</Text>
                <TextInput
                  value={item.price}
                  onChangeText={(t) => updateRow(index, { price: t.replace(/[^\d.]/g, '') })}
                  style={styles.smallInput}
                  keyboardType="numeric"
                  textAlign="center"
                />
              </View>
            </View>
          </View>
        )}
      />

      <View style={styles.bottomBar}>
        <Button
          title={importing ? 'جاري الاستيراد...' : `استيراد ${selectedCount} منتج`}
          icon="check-all"
          onPress={handleImport}
          loading={importing}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  uploadContainer: { padding: Spacing.lg, gap: Spacing.lg, flex: 1 },
  aiHero: {
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  aiIconWrap: {
    width: 84,
    height: 84,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  aiTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.white },
  aiSub: { color: 'rgba(255,255,255,0.92)', fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  featuresCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  featureRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  featureText: { color: Colors.text, fontSize: FontSize.sm, flex: 1, textAlign: 'right' },
  btnRow: { flexDirection: 'row-reverse', gap: Spacing.md },
  previewContainer: { flex: 1, padding: Spacing.lg, gap: Spacing.lg },
  imageWrap: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewImage: { flex: 1 },
  analyzingBox: {
    backgroundColor: Colors.primaryTint,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
  },
  analyzingTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginTop: Spacing.sm },
  analyzingSub: { color: Colors.textSecondary, fontSize: FontSize.sm },
  actionsRow: { gap: Spacing.md },
  thumbStrip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  thumb: { width: 56, height: 56, borderRadius: Radius.md },
  aiBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  aiBadgeText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  thumbHint: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 4 },
  actionsBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  actText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  warehouseRow: {
    backgroundColor: Colors.primaryTint,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  warehouseLabel: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  warehouseChips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, flex: 1 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  chipTextActive: { color: Colors.white },
  list: { padding: Spacing.lg, gap: 8, paddingBottom: 90 },
  editRow: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    ...Shadow.sm,
  },
  editRowHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  nameInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldsRow: { flexDirection: 'row-reverse', gap: 6, marginTop: 8 },
  fieldCol: { flex: 1 },
  fieldLabel: { color: Colors.textSecondary, fontSize: 11, marginBottom: 4, textAlign: 'center' },
  smallInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.sm,
    paddingVertical: 6,
    fontSize: FontSize.sm,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadow.md,
  },
});
