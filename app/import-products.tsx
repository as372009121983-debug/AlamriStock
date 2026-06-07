
// Powered by OnSpace.AI
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import {
  generateProductTemplateCSV,
  mapProductRows,
  pickAndParseFile,
  ParsedSheet,
  ProductMappedRow,
  shareCSVTemplate,
} from '@/services/import';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { formatNumber } from '@/services/format';

export default function ImportProductsScreen() {
  const { addProduct, defaultMainWarehouseId, warehouses } = useStore();
  const { canEdit } = useAuth();
  const { showAlert } = useAlert();

  const [parsed, setParsed] = useState<ParsedSheet | null>(null);
  const [mapped, setMapped] = useState<ProductMappedRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const mainWarehouses = useMemo(() => warehouses.filter((w) => w.type === 'main'), [warehouses]);
  const [warehouseId, setWarehouseId] = useState<string>(defaultMainWarehouseId || '');

  async function handlePick() {
    if (loading) return;
    setLoading(true);
    const result = await pickAndParseFile();
    setLoading(false);
    if (!result.ok) {
      if (!result.canceled) {
        showAlert(
          'تعذر قراءة الملف',
          `$${result.error}\n\nنصيحة:\n• تأكد أن الملف بصيغة CSV أو Excel (xlsx, xls)\n• تأكد أن الملف به صف رؤوس في الأول (الاسم، السعر، الكمية)\n• جرب تحميل القالب الجاهز أدناه وعبّئه ببياناتك`
        );
      }
      return;
    }
    const sheet = result.data;
    const rows = mapProductRows(sheet);
    if (rows.length === 0) {
      showAlert('لا توجد منتجات', 'لم يتم العثور على بيانات صالحة في الملف');
      return;
    }
    setParsed(sheet);
    setMapped(rows);
    setSelected(new Set(rows.map((_, i) => i)));
  }

  async function handleDownloadTemplate() {
    const content = generateProductTemplateCSV();
    const result = await shareCSVTemplate(content, 'قالب-المنتجات.csv');
    if (!result.ok && result.message) {
      showAlert('تعذر التصدير', result.message);
    }
  }

  function toggleRow(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === mapped.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(mapped.map((_, i) => i)));
    }
  }

  function handleReset() {
    setParsed(null);
    setMapped([]);
    setSelected(new Set());
  }

  async function handleImport() {
    if (!warehouseId) {
      showAlert('تنبيه', 'اختر المخزن الرئيسي للاستيراد');
      return;
    }
    if (selected.size === 0) {
      showAlert('تنبيه', 'اختر منتج واحد على الأقل');
      return;
    }
    setImporting(true);
    let success = 0;
    let failed = 0;
    for (const idx of selected) {
      const row = mapped[idx];
      if (!row || !row.name) {
        failed++;
        continue;
      }
      const prices = [];
      if (row.salePrice > 0) prices.push({ id: 'p1', label: 'قطاعي', price: row.salePrice });
      if (row.wholesalePrice > 0)
        prices.push({ id: 'p2', label: 'جملة', price: row.wholesalePrice });
      if (row.halfWholesalePrice > 0)
        prices.push({ id: 'p3', label: 'نصف جملة', price: row.halfWholesalePrice });

      const result = addProduct(
        {
          name: row.name,
          barcode: row.barcode,
          category: row.category || 'عام',
          unit: row.unit || 'قطعة',
          purchasePrice: row.purchasePrice,
          salePrice: row.salePrice,
          prices,
          lowStockAlert: row.lowStockAlert,
          images: [],
          notes: row.notes,
        },
        warehouseId,
        row.quantity
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
        <Header title="استيراد منتجات" />
        <EmptyState icon="lock" title="غير مسموح" description="ليس لديك صلاحية" />
      </SafeAreaView>
    );
  }

  if (mainWarehouses.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="استيراد منتجات" />
        <EmptyState
          icon="warehouse"
          title="لا يوجد مخزن رئيسي"
          description="أنشئ مخزن رئيسي أولاً لاستقبال المنتجات"
        />
      </SafeAreaView>
    );
  }

  if (!parsed) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="استيراد منتجات Excel/CSV" />
        <View style={styles.uploadContainer}>
          <View style={styles.iconBig}>
            <MaterialCommunityIcons name="file-excel-outline" size={64} color={Colors.success} />
          </View>
          <Text style={styles.uploadTitle}>استيراد المنتجات</Text>
          <Text style={styles.uploadSub}>
            ارفع ملف Excel أو CSV يحتوي على بيانات المنتجات لاستيرادها مباشرة إلى المخزون
          </Text>

          <View style={styles.formatCard}>
            <View style={styles.formatRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color={Colors.success} />
              <Text style={styles.formatText}>الاسم - الباركود - السعر - الكمية</Text>
            </View>
            <View style={styles.formatRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color={Colors.success} />
              <Text style={styles.formatText}>أسعار متعددة (قطاعي - جملة - نصف جملة)</Text>
            </View>
            <View style={styles.formatRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color={Colors.success} />
              <Text style={styles.formatText}>دعم العربية والإنجليزية</Text>
            </View>
            <View style={styles.formatRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color={Colors.success} />
              <Text style={styles.formatText}>معاينة قبل الاستيراد</Text>
            </View>
          </View>

          <Button
            title={loading ? 'جاري القراءة...' : 'اختر ملف Excel/CSV'}
            icon="file-upload-outline"
            onPress={handlePick}
            loading={loading}
            fullWidth
            size="lg"
            style={{ marginTop: Spacing.lg }}
          />

          <Pressable
            onPress={handleDownloadTemplate}
            style={({ pressed }) => [styles.templateBtn, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons
              name="download-outline"
              size={18}
              color={Colors.primary}
            />
            <Text style={styles.templateText}>تحميل قالب جاهز للاستخدام</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="معاينة قبل الاستيراد"
        subtitle={`${mapped.length} منتج • محدد ${selected.size}`}
      />

      <View style={styles.actionsBar}>
        <Pressable onPress={handleReset} style={styles.actBtn}>
          <MaterialCommunityIcons name="refresh" size={18} color={Colors.textSecondary} />
          <Text style={styles.actText}>إعادة</Text>
        </Pressable>
        <Pressable onPress={toggleAll} style={styles.actBtn}>
          <MaterialCommunityIcons
            name={selected.size === mapped.length ? 'checkbox-multiple-blank-outline' : 'checkbox-multiple-marked'}
            size={18}
            color={Colors.primary}
          />
          <Text style={[styles.actText, { color: Colors.primary }]}>
            {selected.size === mapped.length ? 'إلغاء التحديد' : 'تحديد الكل'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.warehouseRow}>
        <Text style={styles.warehouseLabel}>المخزن المستلم:</Text>
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
        data={mapped}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const isSelected = selected.has(index);
          return (
            <Pressable
              onPress={() => toggleRow(index)}
              style={({ pressed }) => [
                styles.row,
                isSelected && styles.rowActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                {isSelected ? (
                  <MaterialCommunityIcons name="check" size={14} color={Colors.white} />
                ) : null}
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <View style={styles.itemMeta}>
                  {item.barcode ? (
                    <View style={styles.metaTag}>
                      <Text style={styles.metaTagText}>{item.barcode}</Text>
                    </View>
                  ) : null}
                  {item.category ? (
                    <View style={[styles.metaTag, { backgroundColor: Colors.infoSoft }]}>
                      <Text style={[styles.metaTagText, { color: Colors.info }]}>{item.category}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.itemRow2}>
                  <Text style={styles.priceText}>سعر بيع: {formatNumber(item.salePrice)}</Text>
                  <Text style={styles.priceText}>•</Text>
                  <Text style={styles.priceText}>كمية: {formatNumber(item.quantity)}</Text>
                </View>
              </View>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>{index + 1}</Text>
              </View>
            </Pressable>
          );
        }}
      />

      <View style={styles.bottomBar}>
        <Button
          title={importing ? 'جاري الاستيراد...' : `استيراد ${selected.size} منتج`}
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
  uploadContainer: { padding: Spacing.xl, alignItems: 'center', flex: 1 },
  iconBig: {
    width: 120,
    height: 120,
    borderRadius: Radius.full,
    backgroundColor: Colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    borderWidth: 3,
    borderColor: Colors.success,
  },
  uploadTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.lg,
  },
  uploadSub: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: Spacing.lg,
    lineHeight: 20,
  },
  formatCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    width: '100%',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  formatRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  formatText: { color: Colors.text, fontSize: FontSize.sm, flex: 1, textAlign: 'right' },
  templateBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  templateText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
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
  actBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
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
  list: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 80 },
  row: {
    backgroundColor: Colors.surface,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  rowActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryTint },
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
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberBadgeText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  itemName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, textAlign: 'right' },
  itemMeta: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  metaTag: { backgroundColor: Colors.surfaceAlt, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm },
  metaTagText: { fontSize: 10, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
  itemRow2: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 4 },
  priceText: { color: Colors.textSecondary, fontSize: FontSize.xs },
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
