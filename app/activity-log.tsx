// Powered by OnSpace.AI
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/hooks/useStore';
import { useAlert } from '@/template';
import { Header } from '@/components/ui/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { DateRange } from '@/components/ui/DateRange';
import { PrintMenu } from '@/components/ui/PrintMenu';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { ActivityType } from '@/constants/types';
import { formatDateTime, formatNumber, inRange } from '@/services/format';
import { buildReportHtml, performPrint, PrintAction, exportCsv } from '@/services/print';

const TYPE_META: Partial<Record<ActivityType, { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }>> = {
  login: { label: 'دخول', icon: 'login', color: Colors.info },
  logout: { label: 'خروج', icon: 'logout', color: Colors.textMuted },
  sale: { label: 'بيع', icon: 'cart-outline', color: Colors.primary },
  sale_delete: { label: 'حذف بيع', icon: 'cart-remove', color: Colors.danger },
  purchase: { label: 'شراء', icon: 'truck', color: Colors.warning },
  purchase_delete: { label: 'حذف شراء', icon: 'truck-remove', color: Colors.danger },
  transfer: { label: 'تحويل', icon: 'swap-horizontal', color: Colors.success },
  transfer_delete: { label: 'حذف تحويل', icon: 'swap-horizontal-bold', color: Colors.danger },
  sale_return: { label: 'مرتجع بيع', icon: 'undo-variant', color: Colors.danger },
  purchase_return: { label: 'مرتجع شراء', icon: 'redo-variant', color: Colors.warning },
  expense: { label: 'مصروف', icon: 'cash-minus', color: Colors.danger },
  expense_delete: { label: 'حذف مصروف', icon: 'cash-remove', color: Colors.danger },
  product_add: { label: 'إضافة منتج', icon: 'plus-box', color: Colors.success },
  product_edit: { label: 'تعديل منتج', icon: 'pencil', color: Colors.info },
  product_delete: { label: 'حذف منتج', icon: 'delete', color: Colors.danger },
  customer_add: { label: 'إضافة عميل', icon: 'account-plus', color: Colors.success },
  customer_edit: { label: 'تعديل عميل', icon: 'account-edit', color: Colors.info },
  customer_delete: { label: 'حذف عميل', icon: 'account-minus', color: Colors.danger },
  customer_payment: { label: 'دفعة عميل', icon: 'cash-multiple', color: Colors.success },
  customer_payment_delete: { label: 'حذف دفعة', icon: 'cash-remove', color: Colors.danger },
  supplier_add: { label: 'إضافة مورد', icon: 'truck-plus', color: Colors.success },
  supplier_edit: { label: 'تعديل مورد', icon: 'truck-fast', color: Colors.info },
  supplier_delete: { label: 'حذف مورد', icon: 'truck-minus', color: Colors.danger },
  warehouse_add: { label: 'إضافة موقع', icon: 'warehouse', color: Colors.success },
  warehouse_edit: { label: 'تعديل موقع', icon: 'warehouse', color: Colors.info },
  warehouse_delete: { label: 'حذف موقع', icon: 'warehouse', color: Colors.danger },
  worker_add: { label: 'إضافة عامل', icon: 'account-plus', color: Colors.success },
  worker_edit: { label: 'تعديل عامل', icon: 'account-edit', color: Colors.info },
  worker_delete: { label: 'حذف عامل', icon: 'account-minus', color: Colors.danger },
  worker_payment: { label: 'قبض عامل', icon: 'account-cash', color: Colors.warning },
  worker_payment_delete: { label: 'حذف قبض', icon: 'cash-remove', color: Colors.danger },
  user_add: { label: 'إضافة مستخدم', icon: 'account-plus', color: Colors.success },
  user_edit: { label: 'تعديل مستخدم', icon: 'account-edit', color: Colors.info },
  user_delete: { label: 'حذف مستخدم', icon: 'account-remove', color: Colors.danger },
  user_approve: { label: 'قبول مستخدم', icon: 'account-check', color: Colors.success },
  user_reject: { label: 'رفض مستخدم', icon: 'account-cancel', color: Colors.danger },
  settings_update: { label: 'تحديث إعدادات', icon: 'cog', color: Colors.primary },
};

export default function ActivityLogScreen() {
  const { activityLog, settings } = useStore();
  const { showAlert } = useAlert();
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState<number | null>(null);
  const [toDate, setToDate] = useState<number | null>(null);
  const [printVisible, setPrintVisible] = useState(false);

  const filtered = useMemo(() => {
    let list = activityLog;
    if (fromDate || toDate) list = list.filter((a) => inRange(a.date, fromDate, toDate));
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          a.description.toLowerCase().includes(q) ||
          a.userName.toLowerCase().includes(q) ||
          (TYPE_META[a.type]?.label || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [activityLog, search, fromDate, toDate]);

  async function handlePrint(action: PrintAction) {
    try {
      const html = buildReportHtml({
        title: 'سجل العمليات (البيان)',
        meta: [{ label: 'عدد العمليات', value: formatNumber(filtered.length) }],
        columns: ['التاريخ', 'النوع', 'التفاصيل', 'المستخدم'],
        rows: filtered.map((a) => [
          formatDateTime(a.date),
          TYPE_META[a.type]?.label || a.type,
          a.description,
          a.userName,
        ]),
      }, settings);
      await performPrint(html, `activity-log-${Date.now()}`, action);
    } catch {
      showAlert('خطأ', 'تعذر تنفيذ الطباعة');
    }
  }
  async function handleCsv() {
    const rows: string[][] = [['التاريخ', 'النوع', 'التفاصيل', 'المستخدم']];
    filtered.forEach((a) => rows.push([formatDateTime(a.date), TYPE_META[a.type]?.label || a.type, a.description, a.userName]));
    await exportCsv(rows, `activity-log-${Date.now()}`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="البيان"
        subtitle={`${formatNumber(filtered.length)} عملية`}
        right={
          <Pressable onPress={() => setPrintVisible(true)} hitSlop={8} style={styles.headerBtn}>
            <MaterialCommunityIcons name="printer" size={20} color={Colors.white} />
          </Pressable>
        }
      />
      <View style={styles.toolbar}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="بحث..." />
      </View>
      <View style={{ paddingHorizontal: Spacing.lg }}>
        <DateRange fromDate={fromDate} toDate={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="history" title="لا توجد عمليات" />}
        renderItem={({ item }) => {
          const meta = TYPE_META[item.type] || { label: item.type, icon: 'circle-medium', color: Colors.textMuted };
          return (
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: meta.color + '1A' }]}>
                <MaterialCommunityIcons name={meta.icon} size={20} color={meta.color} />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                <View style={[styles.typeTag, { backgroundColor: meta.color + '1A' }]}>
                  <Text style={[styles.typeText, { color: meta.color }]}>{meta.label}</Text>
                </View>
                <Text style={styles.desc}>{item.description}</Text>
                <Text style={styles.meta}>{item.userName} • {formatDateTime(item.date)}</Text>
              </View>
            </View>
          );
        }}
      />
      <PrintMenu visible={printVisible} onClose={() => setPrintVisible(false)} onAction={handlePrint} showCsvOption onCsv={handleCsv} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerBtn: { backgroundColor: Colors.primary, width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  toolbar: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  list: { padding: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.sm },
  row: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm, ...Shadow.sm },
  iconBox: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  typeTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  typeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  desc: { color: Colors.text, fontSize: FontSize.sm, marginTop: 4, fontWeight: FontWeight.semibold, textAlign: 'right' },
  meta: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
});
