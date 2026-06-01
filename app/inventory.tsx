// Powered by OnSpace.AI
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/hooks/useStore';
import { useAlert } from '@/template';
import { Header } from '@/components/ui/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { DateRange } from '@/components/ui/DateRange';
import { PrintMenu } from '@/components/ui/PrintMenu';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { formatCurrency, formatNumber } from '@/services/format';
import { buildInventoryHtml, performPrint, PrintAction, exportCsv } from '@/services/print';

export default function InventoryScreen() {
  const { products, settings } = useStore();
  const { showAlert } = useAlert();

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState<number | null>(null);
  const [toDate, setToDate] = useState<number | null>(null);
  const [printVisible, setPrintVisible] = useState(false);
  const [filter, setFilter] = useState<'all' | 'inStock' | 'lowStock' | 'out'>('all');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products
      .filter((p) => {
        if (fromDate || toDate) {
          if (fromDate && p.createdAt < fromDate) return false;
          if (toDate && p.createdAt > toDate) return false;
        }
        return true;
      })
      .map((p) => {
        const purchaseValue = p.quantity * p.purchasePrice;
        const saleValue = p.quantity * p.salePrice;
        return {
          id: p.id,
          name: p.name,
          barcode: p.barcode || '',
          category: p.category || '',
          unit: p.unit || 'قطعة',
          qty: p.quantity,
          lowStockAlert: p.lowStockAlert,
          purchasePrice: p.purchasePrice,
          salePrice: p.salePrice,
          purchaseValue,
          saleValue,
          potentialProfit: saleValue - purchaseValue,
        };
      });

    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    if (filter === 'inStock') list = list.filter((p) => p.qty > p.lowStockAlert);
    if (filter === 'lowStock') list = list.filter((p) => p.qty > 0 && p.qty <= p.lowStockAlert);
    if (filter === 'out') list = list.filter((p) => p.qty === 0);

    return list;
  }, [products, search, fromDate, toDate, filter]);

  const totals = useMemo(() => {
    const totalQty = rows.reduce((s, r) => s + r.qty, 0);
    const totalPurchaseValue = rows.reduce((s, r) => s + r.purchaseValue, 0);
    const totalSaleValue = rows.reduce((s, r) => s + r.saleValue, 0);
    const totalProfit = totalSaleValue - totalPurchaseValue;
    const lowStock = rows.filter((r) => r.qty > 0 && r.qty <= r.lowStockAlert).length;
    const outStock = rows.filter((r) => r.qty === 0).length;
    return { totalQty, totalPurchaseValue, totalSaleValue, totalProfit, lowStock, outStock };
  }, [rows]);

  async function handlePrint(action: PrintAction) {
    try {
      const html = buildInventoryHtml(
        {
          rows,
          totalQty: totals.totalQty,
          totalPurchaseValue: totals.totalPurchaseValue,
          totalSaleValue: totals.totalSaleValue,
          fromDate,
          toDate,
        },
        settings
      );
      await performPrint(html, `inventory-${Date.now()}`, action);
    } catch {
      showAlert('خطأ', 'تعذر تنفيذ الطباعة');
    }
  }

  async function handleCsv() {
    const data: string[][] = [
      ['المنتج', 'الباركود', 'الفئة', 'الكمية', 'سعر الشراء', 'قيمة الشراء', 'سعر البيع', 'قيمة البيع'],
    ];
    rows.forEach((r) => {
      data.push([
        r.name,
        r.barcode || '—',
        r.category || '—',
        String(r.qty),
        String(r.purchasePrice),
        String(r.purchaseValue),
        String(r.salePrice),
        String(r.saleValue),
      ]);
    });
    await exportCsv(data, `inventory-${Date.now()}`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="الجرد"
        subtitle="قيمة المخزون التفصيلية"
        right={
          <Pressable onPress={() => setPrintVisible(true)} hitSlop={8} style={styles.headerBtn}>
            <MaterialCommunityIcons name="printer" size={20} color={Colors.white} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: Colors.warningSoft, borderColor: Colors.warning }]}>
            <Text style={[styles.summaryLabel, { color: Colors.warning }]}>قيمة المخزون بسعر الشراء</Text>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>
              {formatCurrency(totals.totalPurchaseValue, settings.currency)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: Colors.primarySoft, borderColor: Colors.primary }]}>
            <Text style={[styles.summaryLabel, { color: Colors.primary }]}>قيمة المخزون بسعر البيع</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              {formatCurrency(totals.totalSaleValue, settings.currency)}
            </Text>
          </View>
        </View>

        <View style={styles.profitCard}>
          <Text style={styles.profitLabel}>الربح المحتمل</Text>
          <Text style={styles.profitValue}>{formatCurrency(totals.totalProfit, settings.currency)}</Text>
          <View style={styles.profitMeta}>
            <Text style={styles.profitMetaText}>
              {formatNumber(rows.length)} منتج • {formatNumber(totals.totalQty)} قطعة
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.miniStat}>
            <MaterialCommunityIcons name="package-variant-closed" size={20} color={Colors.success} />
            <Text style={styles.miniStatValue}>{rows.filter((r) => r.qty > r.lowStockAlert).length}</Text>
            <Text style={styles.miniStatLabel}>متوفر</Text>
          </View>
          <View style={styles.miniStat}>
            <MaterialCommunityIcons name="alert" size={20} color={Colors.warning} />
            <Text style={[styles.miniStatValue, { color: Colors.warning }]}>{totals.lowStock}</Text>
            <Text style={styles.miniStatLabel}>منخفض</Text>
          </View>
          <View style={styles.miniStat}>
            <MaterialCommunityIcons name="package-variant" size={20} color={Colors.danger} />
            <Text style={[styles.miniStatValue, { color: Colors.danger }]}>{totals.outStock}</Text>
            <Text style={styles.miniStatLabel}>منتهي</Text>
          </View>
        </View>

        <DateRange fromDate={fromDate} toDate={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />

        <SearchBar value={search} onChangeText={setSearch} placeholder="بحث بالاسم أو الباركود..." />

        <View style={styles.filtersRow}>
          <FilterChip label="الكل" active={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterChip label="متوفر" active={filter === 'inStock'} onPress={() => setFilter('inStock')} />
          <FilterChip label="منخفض" active={filter === 'lowStock'} onPress={() => setFilter('lowStock')} />
          <FilterChip label="منتهي" active={filter === 'out'} onPress={() => setFilter('out')} />
        </View>

        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { width: 80, textAlign: 'left' }]}>قيمة البيع</Text>
            <Text style={[styles.th, { width: 80 }]}>قيمة الشراء</Text>
            <Text style={[styles.th, { width: 60 }]}>الكمية</Text>
            <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>المنتج</Text>
          </View>
          {rows.length === 0 ? (
            <Text style={styles.empty}>لا توجد منتجات</Text>
          ) : (
            rows.slice(0, 200).map((r, idx) => {
              const low = r.qty > 0 && r.qty <= r.lowStockAlert;
              const out = r.qty === 0;
              return (
                <View
                  key={r.id}
                  style={[
                    styles.tableRow,
                    idx % 2 === 0 && { backgroundColor: Colors.surfaceAlt },
                    out && { opacity: 0.6 },
                  ]}
                >
                  <Text style={[styles.td, { width: 80, textAlign: 'left', color: Colors.primary, fontWeight: '700' }]}>
                    {formatCurrency(r.saleValue, settings.currency)}
                  </Text>
                  <Text style={[styles.td, { width: 80 }]}>
                    {formatCurrency(r.purchaseValue, settings.currency)}
                  </Text>
                  <Text style={[styles.td, { width: 60, color: out ? Colors.danger : low ? Colors.warning : Colors.text, fontWeight: '700' }]}>
                    {formatNumber(r.qty)}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.td, { textAlign: 'right' }]} numberOfLines={2}>{r.name}</Text>
                    <Text style={styles.tdSub}>
                      شراء: {formatCurrency(r.purchasePrice, settings.currency)} • بيع: {formatCurrency(r.salePrice, settings.currency)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
          {rows.length > 200 ? (
            <Text style={styles.moreNote}>عرض أول 200 صف. للمزيد قم بالطباعة أو التصدير.</Text>
          ) : null}
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
      <PrintMenu visible={printVisible} onClose={() => setPrintVisible(false)} onAction={handlePrint} showCsvOption onCsv={handleCsv} />
    </SafeAreaView>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && { opacity: 0.85 }]}
    >
      <Text style={[styles.chipText, active && { color: Colors.white }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerBtn: { backgroundColor: Colors.primary, width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.lg, gap: Spacing.md },
  summaryRow: { flexDirection: 'row-reverse', gap: Spacing.md },
  summaryCard: { flex: 1, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1.5, alignItems: 'flex-end' },
  summaryLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  summaryValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginTop: 4 },
  profitCard: { backgroundColor: Colors.success, padding: Spacing.lg, borderRadius: Radius.lg, alignItems: 'flex-end', ...Shadow.md },
  profitLabel: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm },
  profitValue: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginTop: 4 },
  profitMeta: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, marginTop: 6 },
  profitMetaText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  statsRow: { flexDirection: 'row-reverse', gap: Spacing.md },
  miniStat: { flex: 1, backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: Radius.lg, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: 4 },
  miniStatValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.success },
  miniStatLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  filtersRow: { flexDirection: 'row-reverse', gap: Spacing.sm, flexWrap: 'wrap' },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  tableCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', ...Shadow.sm },
  tableHeader: { flexDirection: 'row-reverse', backgroundColor: Colors.primary, paddingHorizontal: Spacing.sm, paddingVertical: 10 },
  th: { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.bold, textAlign: 'right', paddingHorizontal: 4 },
  tableRow: { flexDirection: 'row-reverse', paddingHorizontal: Spacing.sm, paddingVertical: 8, alignItems: 'center' },
  td: { color: Colors.text, fontSize: FontSize.xs, paddingHorizontal: 4 },
  tdSub: { color: Colors.textMuted, fontSize: 10, paddingHorizontal: 4, marginTop: 2 },
  empty: { textAlign: 'center', color: Colors.textMuted, padding: Spacing.lg },
  moreNote: { textAlign: 'center', color: Colors.textMuted, fontSize: FontSize.xs, padding: Spacing.md },
});
