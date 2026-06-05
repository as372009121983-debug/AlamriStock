// Powered by OnSpace.AI
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { Header } from '@/components/ui/Header';
import { SearchBar } from '@/components/ui/SearchBar';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { formatCurrency, formatDateTime, formatNumber, isSameDay } from '@/services/format';

export default function SalesScreen() {
  const router = useRouter();
  const { sales, settings, deleteSale, saleReturns } = useStore();
  const { canEdit } = useAuth();
  const { guard } = useAdminGuard();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'today' | 'returned'>('all');
  const [menuVisible, setMenuVisible] = useState(false);

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
    const totalReturns = saleReturns.reduce((s, r) => s + r.total, 0);
    const total = filtered.reduce((s, sa) => s + sa.total, 0);
    return { total, count: filtered.length, totalReturns };
  }, [filtered, saleReturns]);

  function confirmDelete(saleId: string, invoiceNo: number) {
    guard({
      title: 'حذف فاتورة',
      description: `أدخل كلمة مرور المدير لحذف الفاتورة #${invoiceNo}`,
      action: () => deleteSale(saleId),
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="المبيعات"
        right={
          <Pressable
            onPress={() => setMenuVisible(true)}
            hitSlop={8}
            style={styles.menuBtn}
          >
            <MaterialCommunityIcons name="dots-vertical" size={22} color={Colors.text} />
          </Pressable>
        }
      />
      <View style={styles.toolbar}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="ابحث برقم الفاتورة أو العميل"
        />
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>إجمالي المبيعات</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(totals.total, settings.currency)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>عدد الفواتير</Text>
          <Text style={[styles.summaryValue, { color: Colors.primary }]}>
            {formatNumber(totals.count)}
          </Text>
        </View>
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
            icon="receipt-text-outline"
            title="لا توجد فواتير"
            description="اضغط + لإنشاء أول فاتورة بيع"
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/invoice/${item.id}` as any)}
            style={({ pressed }) => [
              styles.card,
              item.hasReturn && { borderColor: Colors.danger },
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={styles.cardTop}>
              {canEdit ? (
                <Pressable
                  onPress={() => confirmDelete(item.id, item.invoiceNo)}
                  hitSlop={8}
                  style={styles.actBtn}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.danger} />
                </Pressable>
              ) : <View style={styles.actBtn} />}
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.invoiceNo}>#{item.invoiceNo}</Text>
                  {item.hasReturn ? (
                    <View style={styles.returnBadge}>
                      <Text style={styles.returnBadgeText}>مرتجع</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.customer} numberOfLines={1}>{item.customerName}</Text>
              </View>
            </View>
            <View style={styles.cardMid}>
              <Text style={styles.totalValue}>
                {formatCurrency(item.total, settings.currency)}
              </Text>
              <Text style={styles.itemsLabel}>
                {formatNumber(item.items.length)} منتج
              </Text>
            </View>
            <View style={styles.cardBottom}>
              <Text style={styles.user}>{item.userName || '—'}</Text>
              <Text style={styles.date}>{formatDateTime(item.date)}</Text>
            </View>
          </Pressable>
        )}
      />

      {canEdit ? (
        <Pressable
          onPress={() => router.push('/new-sale')}
          style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
        >
          <MaterialCommunityIcons name="plus" size={28} color={Colors.white} />
        </Pressable>
      ) : null}

      <Modal
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        title="خيارات"
      >
        <Pressable
          onPress={() => { setMenuVisible(false); router.push('/new-sale'); }}
          style={styles.menuRow}
        >
          <MaterialCommunityIcons name="chevron-left" size={20} color={Colors.textMuted} />
          <Text style={styles.menuLabel}>فاتورة بيع جديدة</Text>
        </Pressable>
        <Pressable
          onPress={() => { setMenuVisible(false); router.push('/returns'); }}
          style={styles.menuRow}
        >
          <MaterialCommunityIcons name="chevron-left" size={20} color={Colors.textMuted} />
          <Text style={styles.menuLabel}>فواتير المرتجع</Text>
        </Pressable>
        <Pressable
          onPress={() => { setMenuVisible(false); router.push('/reports'); }}
          style={styles.menuRow}
        >
          <MaterialCommunityIcons name="chevron-left" size={20} color={Colors.textMuted} />
          <Text style={styles.menuLabel}>عروض الاسعار</Text>
        </Pressable>
        <Pressable
          onPress={() => { setMenuVisible(false); router.push('/(tabs)/products' as any); }}
          style={styles.menuRow}
        >
          <MaterialCommunityIcons name="chevron-left" size={20} color={Colors.textMuted} />
          <Text style={styles.menuLabel}>تغيير سعر البيع الافتراضي</Text>
        </Pressable>
      </Modal>
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
  menuBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  toolbar: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  summary: {
    flexDirection: 'row-reverse',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  summaryCard: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: Colors.border },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  summaryValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, marginTop: 4 },
  tabs: {
    flexDirection: 'row-reverse',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
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
  list: { padding: Spacing.lg, paddingTop: 0, paddingBottom: 120, gap: Spacing.md },
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
    width: 36, height: 36, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  invoiceNo: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold },
  returnBadge: { backgroundColor: Colors.dangerSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm },
  returnBadgeText: { color: Colors.danger, fontSize: 10, fontWeight: FontWeight.bold },
  customer: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, marginTop: 4 },
  cardMid: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  totalValue: { color: Colors.primary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  itemsLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  cardBottom: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  user: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.semibold },
  date: { fontSize: FontSize.xs, color: Colors.textMuted },
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
