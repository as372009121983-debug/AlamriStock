// Powered by OnSpace.AI
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/hooks/useStore';
import { Header } from '@/components/ui/Header';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { formatCurrency, isSameDay } from '@/services/format';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

type ReportItem = { label: string; route?: string; comingSoon?: boolean };

type Section = {
  key: string;
  title: string;
  icon: IconName;
  color: string;
  bg: string;
  items: ReportItem[];
};

type Period = 'today' | 'yesterday' | 'thisMonth' | 'lastMonth' | 'thisYear';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'اليوم' },
  { key: 'yesterday', label: 'امس' },
  { key: 'thisMonth', label: 'الشهر الحالي' },
  { key: 'lastMonth', label: 'الشهر الماضي' },
  { key: 'thisYear', label: 'العام الحالي' },
];

function periodRange(p: Period): { from: number; to: number } {
  const now = new Date();
  if (p === 'today') {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    return { from: start.getTime(), to: now.getTime() };
  }
  if (p === 'yesterday') {
    const start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setHours(23, 59, 59, 999);
    return { from: start.getTime(), to: end.getTime() };
  }
  if (p === 'thisMonth') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: start.getTime(), to: now.getTime() };
  }
  if (p === 'lastMonth') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { from: start.getTime(), to: end.getTime() };
  }
  // thisYear
  const start = new Date(now.getFullYear(), 0, 1);
  return { from: start.getTime(), to: now.getTime() };
}

export default function ReportsScreen() {
  const router = useRouter();
  const { sales, purchases, expenses, customerPayments, settings, saleReturns } = useStore();

  const [view, setView] = useState<'summary' | 'detailed'>('summary');
  const [tab, setTab] = useState<'sales' | 'profits' | 'expenses' | 'purchases'>('sales');
  const [expanded, setExpanded] = useState<string>('sales');

  const summaries = useMemo(() => {
    const result: Record<string, Record<Period, number>> = {
      sales: {} as Record<Period, number>,
      profits: {} as Record<Period, number>,
      expenses: {} as Record<Period, number>,
      purchases: {} as Record<Period, number>,
    };
    for (const p of PERIODS) {
      const { from, to } = periodRange(p.key);
      const inRange = (d: number) => d >= from && d <= to;
      const periodSales = sales.filter((s) => inRange(s.date));
      const periodReturns = saleReturns.filter((r) => inRange(r.date));
      const salesTotal = periodSales.reduce((s, sa) => s + sa.total, 0);
      const cost = periodSales.reduce(
        (s, sa) => s + sa.items.reduce((c, it) => c + it.purchasePrice * it.quantity, 0),
        0
      );
      const returnsCost = periodReturns.reduce(
        (s, r) => s + r.items.reduce((c, it) => c + (it.purchasePrice || 0) * it.quantity, 0),
        0
      );
      const returnsTotal = periodReturns.reduce((s, r) => s + r.total, 0);
      result.sales[p.key] = salesTotal;
      result.profits[p.key] = salesTotal - cost - (returnsTotal - returnsCost);
      result.expenses[p.key] = expenses.filter((e) => inRange(e.date)).reduce((s, e) => s + e.amount, 0);
      result.purchases[p.key] = purchases.filter((pp) => inRange(pp.date)).reduce((s, pp) => s + pp.total, 0);
    }
    return result;
  }, [sales, purchases, expenses, customerPayments, saleReturns]);

  const sections: Section[] = [
    {
      key: 'sales',
      title: 'المبيعات',
      icon: 'cart-outline',
      color: Colors.primary,
      bg: Colors.primarySoft,
      items: [
        { label: 'تقرير مبيعات مفصل', route: '/(tabs)/sales' },
        { label: 'تقرير مبيعات مجمل', route: '/(tabs)/sales' },
        { label: 'تقرير مبيعات بالتصنيف', comingSoon: true },
        { label: 'تقرير الفواتير الغير مسددة', comingSoon: true },
      ],
    },
    {
      key: 'profits',
      title: 'الارباح',
      icon: 'trending-up',
      color: Colors.success,
      bg: Colors.successSoft,
      items: [
        { label: 'الأرباح حسب الفترة', route: '/profits' },
        { label: 'الأرباح حسب المنتج', route: '/profits' },
        { label: 'الأرباح حسب الفاتورة', route: '/profits' },
      ],
    },
    {
      key: 'customers',
      title: 'العملاء',
      icon: 'account-group-outline',
      color: Colors.info,
      bg: Colors.infoSoft,
      items: [
        { label: 'قائمة العملاء', route: '/(tabs)/customers' },
        { label: 'دفعات العملاء', route: '/customer-payments' },
        { label: 'مديونيات العملاء', route: '/(tabs)/customers' },
      ],
    },
    {
      key: 'purchases',
      title: 'المشتريات',
      icon: 'shopping-outline',
      color: Colors.warning,
      bg: Colors.warningSoft,
      items: [
        { label: 'تقرير المشتريات', route: '/purchases' },
        { label: 'مرتجعات الشراء', route: '/purchase-returns' },
      ],
    },
    {
      key: 'suppliers',
      title: 'الموردين',
      icon: 'truck-outline',
      color: Colors.warning,
      bg: Colors.warningSoft,
      items: [
        { label: 'تقرير مديونية الموردين', route: '/suppliers' },
        { label: 'تقرير المنتجات المباعة لمورد', comingSoon: true },
        { label: 'تقرير كشف حساب مورد', comingSoon: true },
        { label: 'تقرير اجمالي مشتريات الموردين', route: '/purchases' },
      ],
    },
    {
      key: 'warehouses',
      title: 'المخازن',
      icon: 'warehouse',
      color: Colors.primary,
      bg: Colors.primarySoft,
      items: [
        { label: 'تقرير الجرد', route: '/inventory' },
        { label: 'تقرير التحويلات', route: '/transfers' },
        { label: 'إدارة المخازن', route: '/warehouses' },
      ],
    },
    {
      key: 'expenses',
      title: 'المصروفات',
      icon: 'cash-minus',
      color: Colors.danger,
      bg: Colors.dangerSoft,
      items: [
        { label: 'تقرير المصروفات', route: '/expenses' },
        { label: 'اليومية', route: '/journal' },
      ],
    },
    {
      key: 'workers',
      title: 'العمال',
      icon: 'account-cash-outline',
      color: Colors.info,
      bg: Colors.infoSoft,
      items: [
        { label: 'قبض العمال', route: '/workers' },
        { label: 'سلفات العمال', route: '/worker-advances' },
      ],
    },
  ];

  function handleItem(item: ReportItem) {
    if (item.comingSoon) return;
    if (item.route) router.push(item.route as any);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="التقارير"
        right={
          <Pressable
            onPress={() => setView(view === 'summary' ? 'detailed' : 'summary')}
            style={styles.toggleBtn}
            hitSlop={8}
          >
            <Text style={styles.toggleText}>
              {view === 'summary' ? 'تقارير تفصيلية' : 'الملخص'}
            </Text>
          </Pressable>
        }
      />

      {view === 'summary' ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsRow}
          >
            {[
              { key: 'sales', label: 'المبيعات' },
              { key: 'profits', label: 'الارباح' },
              { key: 'expenses', label: 'المصروفات' },
              { key: 'purchases', label: 'المشتريات' },
            ].map((t) => (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key as any)}
                style={({ pressed }) => [
                  styles.tab,
                  tab === t.key && styles.tabActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView contentContainerStyle={styles.summaryContent} showsVerticalScrollIndicator={false}>
            {PERIODS.map((p) => {
              const value = summaries[tab]?.[p.key] || 0;
              return (
                <View key={p.key} style={styles.periodCard}>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.periodLabel}>{p.label}</Text>
                    <Text style={styles.periodValue}>
                      {formatCurrency(value, settings.currency)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </>
      ) : (
        <ScrollView contentContainerStyle={styles.detailedContent} showsVerticalScrollIndicator={false}>
          {sections.map((section) => {
            const isOpen = expanded === section.key;
            return (
              <View key={section.key} style={styles.sectionCard}>
                <Pressable
                  onPress={() => setExpanded(isOpen ? '' : section.key)}
                  style={styles.sectionHeader}
                >
                  <MaterialCommunityIcons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={22}
                    color={Colors.primary}
                  />
                  <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                  </View>
                  <View style={[styles.sectionIcon, { backgroundColor: section.bg }]}>
                    <MaterialCommunityIcons name={section.icon} size={22} color={section.color} />
                  </View>
                </Pressable>
                {isOpen ? (
                  <View style={styles.sectionItems}>
                    {section.items.map((item, idx) => (
                      <Pressable
                        key={item.label}
                        onPress={() => handleItem(item)}
                        style={({ pressed }) => [
                          styles.itemRow,
                          idx === section.items.length - 1 && { borderBottomWidth: 0 },
                          pressed && { backgroundColor: Colors.surfaceAlt },
                        ]}
                      >
                        {item.comingSoon ? (
                          <View style={styles.soonBadge}>
                            <Text style={styles.soonBadgeText}>قريباً</Text>
                          </View>
                        ) : (
                          <MaterialCommunityIcons name="chevron-left" size={18} color={Colors.textMuted} />
                        )}
                        <Text style={[styles.itemLabel, item.comingSoon && { color: Colors.textMuted }]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.bottomBar}>
        <View style={styles.dateBtn}>
          <MaterialCommunityIcons name="calendar" size={18} color={Colors.primary} />
        </View>
        <View style={styles.todayBtn}>
          <MaterialCommunityIcons name="chevron-down" size={18} color={Colors.text} />
          <Text style={styles.todayText}>اليوم</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  toggleText: { color: Colors.primary, fontWeight: FontWeight.semibold, fontSize: FontSize.sm, textDecorationLine: 'underline' },
  tabsRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.lg,
    flexDirection: 'row-reverse',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tabActive: {
    borderBottomWidth: 2.5,
    borderBottomColor: Colors.primary,
  },
  tabText: { color: Colors.textSecondary, fontWeight: FontWeight.medium, fontSize: FontSize.md },
  tabTextActive: { color: Colors.primary, fontWeight: FontWeight.bold },
  summaryContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.md,
  },
  periodCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'flex-end',
    ...Shadow.sm,
  },
  periodLabel: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  periodValue: { color: Colors.primary, fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginTop: 4 },
  detailedContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.md,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  sectionIcon: {
    width: 40, height: 40, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  sectionItems: { borderTopWidth: 1, borderTopColor: Colors.border },
  itemRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    minHeight: 56,
  },
  itemLabel: { flex: 1, color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium, textAlign: 'right' },
  soonBadge: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  soonBadgeText: { color: Colors.textMuted, fontSize: 10, fontWeight: FontWeight.bold },
  bottomBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  dateBtn: {
    width: 40, height: 40, borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  todayBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  todayText: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium },
});
