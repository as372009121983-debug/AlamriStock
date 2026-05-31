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
import { SearchBar } from '@/components/ui/SearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { formatCurrency, formatDateTime, formatNumber, isSameDay } from '@/services/format';

export default function SalesScreen() {
  const router = useRouter();
  const { sales, settings, deleteSale } = useStore();
  const { canEdit } = useAuth();
  const { showAlert } = useAlert();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'today' | 'returned'>('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = sales;
    if (filter === 'today') {
      list = list.filter((s) => isSameDay(s.date, Date.now()));
    } else if (filter === 'returned') {
      list = list.filter((s) => s.hasReturn);
    }
    if (q) {
      list = list.filter(
        (s) =>
          s.customerName.toLowerCase().includes(q) ||
          String(s.invoiceNo).includes(q) ||
          (s.userName || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [sales, search, filter]);

  const totals = useMemo(() => {
    const total = filtered.reduce((s, sa) => s + sa.total, 0);
    return { total, count: filtered.length };
  }, [filtered]);

  function confirmDelete(saleId: string, invoiceNo: number) {
    showAlert('حذف فاتورة', `هل تريد حذف الفاتورة #${invoiceNo}؟ سيتم استرجاع الكميات.`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteSale(saleId) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="المبيعات"
        subtitle={`${formatNumber(sales.length)} فاتورة`}
        showBack={false}
        right={
          canEdit ? (
            <Pressable
              onPress={() => router.push('/new-sale')}
              hitSlop={8}
              style={styles.headerBtn}
            >
              <MaterialCommunityIcons name="plus" size={22} color={Colors.white} />
            </Pressable>
          ) : null
        }
      />
      <View style={styles.summary}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>الإجمالي</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(totals.total, settings.currency)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: Colors.primary }]}>
          <Text style={[styles.summaryLabel, { color: 'rgba(255,255,255,0.85)' }]}>
            عدد الفواتير
          </Text>
          <Text style={[styles.summaryValue, { color: Colors.white }]}>
            {formatNumber(totals.count)}
          </Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="بحث بالعميل أو رقم الفاتورة..."
        />
      </View>

      <View style={styles.tabs}>
        <FilterChip label="الكل" active={filter === 'all'} onPress={() => setFilter('all')} />
        <FilterChip label="اليوم" active={filter === 'today'} onPress={() => setFilter('today')} />
        <FilterChip label="المرتجعات" active={filter === 'returned'} onPress={() => setFilter('returned')} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="cart-outline"
            title="لا توجد فواتير"
            description="ابدأ بإنشاء أول فاتورة بيع"
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/invoice/${item.id}` as any)}
            style={({ pressed }) => [
              styles.card,
              item.hasReturn && { borderColor: Colors.danger, backgroundColor: '#FFFBFB' },
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={styles.cardTop}>
              {canEdit ? (
                <Pressable
                  onPress={() => confirmDelete(item.id, item.invoiceNo)}
                  hitSlop={8}
                  style={({ pressed }) => [styles.actBtn, pressed && { opacity: 0.7 }]}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={18}
                    color={Colors.danger}
                  />
                </Pressable>
              ) : <View style={styles.actBtn} />}
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.invoiceNo}>فاتورة #{item.invoiceNo}</Text>
                  {item.hasReturn ? (
                    <View style={styles.returnBadge}>
                      <Text style={styles.returnBadgeText}>مرتجع</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.customer} numberOfLines={1}>
                  {item.customerName}
                </Text>
                {item.warehouseName ? (
                  <Text style={styles.warehouse}>{item.warehouseName}</Text>
                ) : null}
              </View>
            </View>
            <View style={styles.cardMid}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>العناصر</Text>
                <Text style={styles.detailValue}>
                  {formatNumber(item.items.length)} منتج
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>الخصم</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(item.discount, settings.currency)}
                </Text>
              </View>
              <View style={[styles.detailRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>الإجمالي</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(item.total, settings.currency)}
                </Text>
              </View>
            </View>
            <View style={styles.cardBottom}>
              <Text style={styles.user}>{item.userName || '—'}</Text>
              <Text style={styles.date}>{formatDateTime(item.date)}</Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && { opacity: 0.85 }]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
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
  summary: {
    flexDirection: 'row-reverse',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'flex-end',
    ...Shadow.sm,
  },
  summaryLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  summaryValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: 6,
  },
  toolbar: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  tabs: {
    flexDirection: 'row-reverse',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.text, fontWeight: FontWeight.medium, fontSize: FontSize.sm },
  chipTextActive: { color: Colors.white },
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
  },
  actBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceNo: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold },
  returnBadge: {
    backgroundColor: Colors.dangerSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  returnBadgeText: { color: Colors.danger, fontSize: 10, fontWeight: FontWeight.bold },
  customer: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, marginTop: 4 },
  warehouse: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  cardMid: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    gap: 6,
  },
  detailRow: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  detailLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  detailValue: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  totalRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 4,
  },
  totalLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  totalValue: { color: Colors.primary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  cardBottom: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  user: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold },
  date: { fontSize: FontSize.xs, color: Colors.textMuted },
});
