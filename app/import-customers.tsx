// Powered by OnSpace.AI
import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import {
  generateCustomerTemplateCSV,
  mapCustomerRows,
  pickAndParseFile,
  ParsedSheet,
  CustomerMappedRow,
  shareCSVTemplate,
} from '@/services/import';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';

export default function ImportCustomersScreen() {
  const { addCustomer, customers } = useStore();
  const { canEdit } = useAuth();
  const { showAlert } = useAlert();

  const [parsed, setParsed] = useState<ParsedSheet | null>(null);
  const [mapped, setMapped] = useState<CustomerMappedRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  async function handlePick() {
    if (loading) return;
    setLoading(true);
    const result = await pickAndParseFile();
    setLoading(false);
    if (!result.ok) {
      if (!result.canceled) showAlert('تعذر القراءة', result.error);
      return;
    }
    const sheet = result.data;
    const rows = mapCustomerRows(sheet);
    if (rows.length === 0) {
      showAlert('لا يوجد عملاء', 'لم يتم العثور على بيانات صالحة');
      return;
    }
    setParsed(sheet);
    setMapped(rows);
    setSelected(new Set(rows.map((_, i) => i)));
  }

  async function handleDownloadTemplate() {
    const content = generateCustomerTemplateCSV();
    const result = await shareCSVTemplate(content, 'قالب-العملاء.csv');
    if (!result.ok && result.message) showAlert('تعذر التصدير', result.message);
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
    if (selected.size === mapped.length) setSelected(new Set());
    else setSelected(new Set(mapped.map((_, i) => i)));
  }

  function handleReset() {
    setParsed(null);
    setMapped([]);
    setSelected(new Set());
  }

  async function handleImport() {
    if (selected.size === 0) {
      showAlert('تنبيه', 'اختر عميل واحد على الأقل');
      return;
    }
    setImporting(true);
    let success = 0;
    let skipped = 0;
    for (const idx of selected) {
      const row = mapped[idx];
      if (!row || !row.name) continue;
      if (skipDuplicates && row.phone) {
        const exists = customers.some((c) => c.phone === row.phone);
        if (exists) {
          skipped++;
          continue;
        }
      }
      addCustomer({ name: row.name, phone: row.phone, address: row.address });
      success++;
    }
    setImporting(false);
    showAlert(
      'اكتمل الاستيراد',
      `تم استيراد ${success} عميل${skipped > 0 ? ` - تم تخطي ${skipped} مكرر` : ''}`,
      [{ text: 'موافق', onPress: () => handleReset() }]
    );
  }

  if (!canEdit) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="استيراد عملاء" />
        <EmptyState icon="lock" title="غير مسموح" description="ليس لديك صلاحية" />
      </SafeAreaView>
    );
  }

  if (!parsed) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="استيراد عملاء Excel/CSV" />
        <View style={styles.uploadContainer}>
          <View style={styles.iconBig}>
            <MaterialCommunityIcons name="account-group-outline" size={64} color={Colors.info} />
          </View>
          <Text style={styles.uploadTitle}>استيراد العملاء</Text>
          <Text style={styles.uploadSub}>
            ارفع ملف Excel أو CSV يحتوي على بيانات العملاء (الاسم، الهاتف، العنوان)
          </Text>

          <View style={styles.formatCard}>
            <View style={styles.formatRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color={Colors.info} />
              <Text style={styles.formatText}>الاسم - الهاتف - العنوان</Text>
            </View>
            <View style={styles.formatRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color={Colors.info} />
              <Text style={styles.formatText}>دعم الأعمدة بالعربية والإنجليزية</Text>
            </View>
            <View style={styles.formatRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color={Colors.info} />
              <Text style={styles.formatText}>تخطي العملاء المكررين تلقائياً</Text>
            </View>
            <View style={styles.formatRow}>
              <MaterialCommunityIcons name="check-circle" size={16} color={Colors.info} />
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
            style={{ marginTop: Spacing.lg, backgroundColor: Colors.info }}
          />

          <Pressable
            onPress={handleDownloadTemplate}
            style={({ pressed }) => [styles.templateBtn, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="download-outline" size={18} color={Colors.info} />
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
        subtitle={`${mapped.length} عميل • محدد ${selected.size}`}
      />

      <View style={styles.actionsBar}>
        <Pressable onPress={handleReset} style={styles.actBtn}>
          <MaterialCommunityIcons name="refresh" size={18} color={Colors.textSecondary} />
          <Text style={styles.actText}>إعادة</Text>
        </Pressable>
        <Pressable onPress={() => setSkipDuplicates(!skipDuplicates)} style={styles.actBtn}>
          <View style={[styles.smallCheck, skipDuplicates && styles.smallCheckActive]}>
            {skipDuplicates ? (
              <MaterialCommunityIcons name="check" size={12} color={Colors.white} />
            ) : null}
          </View>
          <Text style={styles.actText}>تخطي المكرر</Text>
        </Pressable>
        <Pressable onPress={toggleAll} style={styles.actBtn}>
          <MaterialCommunityIcons
            name={selected.size === mapped.length ? 'checkbox-multiple-blank-outline' : 'checkbox-multiple-marked'}
            size={18}
            color={Colors.primary}
          />
          <Text style={[styles.actText, { color: Colors.primary }]}>
            {selected.size === mapped.length ? 'إلغاء' : 'تحديد الكل'}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={mapped}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const isSelected = selected.has(index);
          const isDuplicate = item.phone && customers.some((c) => c.phone === item.phone);
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
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  {isDuplicate ? (
                    <View style={styles.dupBadge}>
                      <Text style={styles.dupText}>مكرر</Text>
                    </View>
                  ) : null}
                </View>
                {item.phone ? (
                  <Text style={styles.itemPhone}>{item.phone}</Text>
                ) : null}
                {item.address ? (
                  <Text style={styles.itemAddress} numberOfLines={1}>{item.address}</Text>
                ) : null}
              </View>
              <View style={[styles.avatar, { backgroundColor: Colors.infoSoft }]}>
                <Text style={styles.avatarText}>{item.name.slice(0, 1)}</Text>
              </View>
            </Pressable>
          );
        }}
      />

      <View style={styles.bottomBar}>
        <Button
          title={importing ? 'جاري الاستيراد...' : `استيراد ${selected.size} عميل`}
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
    width: 120, height: 120, borderRadius: Radius.full,
    backgroundColor: Colors.infoSoft, alignItems: 'center', justifyContent: 'center',
    marginTop: Spacing.xl, borderWidth: 3, borderColor: Colors.info,
  },
  uploadTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.text, marginTop: Spacing.lg },
  uploadSub: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', marginTop: 8, paddingHorizontal: Spacing.lg, lineHeight: 20 },
  formatCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg,
    marginTop: Spacing.lg, width: '100%', gap: 10, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  formatRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  formatText: { color: Colors.text, fontSize: FontSize.sm, flex: 1, textAlign: 'right' },
  templateBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.md, marginTop: Spacing.md },
  templateText: { color: Colors.info, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  actionsBar: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  actBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  actText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  smallCheck: {
    width: 18, height: 18, borderRadius: Radius.sm, borderWidth: 1.5,
    borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center',
  },
  smallCheckActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  list: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: 80 },
  row: {
    backgroundColor: Colors.surface, flexDirection: 'row-reverse', alignItems: 'center',
    padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, marginBottom: 8,
  },
  rowActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryTint },
  checkbox: {
    width: 24, height: 24, borderRadius: Radius.sm, borderWidth: 2,
    borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  avatar: { width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.info },
  itemHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  itemName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  itemPhone: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
  itemAddress: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  dupBadge: { backgroundColor: Colors.warningSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm },
  dupText: { fontSize: 10, color: Colors.warning, fontWeight: FontWeight.bold },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.surface,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border, ...Shadow.md,
  },
});
