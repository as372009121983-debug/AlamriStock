// Powered by OnSpace.AI
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/hooks/useStore';
import { Header } from '@/components/ui/Header';
import { Modal } from '@/components/ui/Modal';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { formatCurrency } from '@/services/format';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;
type ReportItem = { label: string; type?: string; comingSoon?: boolean };

type Section = {
  key: string;
  title: string;
  icon: IconName;
  color: string;
  bg: string;
  items: ReportItem[];
};

type Period = 'today' | 'yesterday' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'اليوم',
  yesterday: 'امس',
  thisMonth: 'الشهر الحالي',
  lastMonth: 'الشهر الماضي',
  thisYear: 'العام الحالي',
  all: 'كل الفترات',
};

const PERIODS: Period[] = ['today', 'yesterday', 'thisMonth', 'lastMonth', 'thisYear'];

function periodRange(p: Period): { from: number; to: number } {
  const now = new Date();
  if (p === 'all') return { from: 0, to: Number.MAX_SAFE_INTEGER };
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
  const start = new Date(now.getFullYear(), 0, 1);
  return { from: start.getTime(), to: now.getTime() };
}

export default function ReportsScreen() {
  const router = useRouter();
  const { sales, purchases, expenses, settings, saleReturns } = useStore();

  const [view, setView] = useState<'summary' | 'detailed'>('summary');
  const [tab, setTab] = useState<'sales' | 'profits' | 'sales-grouped' | 'purchases-grouped'>('sales');
  const [expanded, setExpanded] = useState<string>('');
  const [period, setPeriod] = useState<Period>('today');
  const [periodPickerVisible, setPeriodPickerVisible] = useState(false);

  const summaries = useMemo(() => {
    const result: Record<string, Record<Period, number>> = {
      sales: {} as Record<Period, number>,
      profits: {} as Record<Period, number>,
      'sales-grouped': {} as Record<Period, number>,
      'purchases-grouped': {} as Record<Period, number>,
    };
    for (const p of PERIODS) {
      const { from, to } = periodRange(p);
      const inRange = (d: number) => d >= from && d <= to;
      const periodSales = sales.filter((s) => inRange(s.date));
      const periodReturns = saleReturns.filter((r) => inRange(r.date));
      const periodPurchases = purchases.filter((pp) => inRange(pp.date));
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
      result.sales[p] = salesTotal;
      result.profits[p] = salesTotal - cost - (returnsTotal - returnsCost);
      result['sales-grouped'][p] = salesTotal - returnsTotal;
      result['purchases-grouped'][p] = periodPurchases.reduce((s, pp) => s + pp.total, 0);
    }
    return result;
  }, [sales, purchases, saleReturns]);

  const sections: Section[] = [
    {
      key: 'sales',
      title: 'المبيعات',
      icon: 'cart-outline',
      color: Colors.primary,
      bg: Colors.primarySoft,
      items: [
        { label: 'تقرير مبيعات مفصل', type: 'sales-detailed' },
        { label: 'تقرير مبيعات مجمل', type: 'sales-summary' },
        { label: 'تقرير مبيعات بالتصنيف', type: 'sales-by-category' },
        { label: 'تقرير الفواتير الغير مسددة', type: 'unpaid-invoices' },
      ],
    },
    {
      key: 'profits',
      title: 'الارباح',
      icon: 'trending-up',
      color: Colors.success,
      bg: Colors.successSoft,
      items: [
        { label: 'تقرير ارباح مفصل', type: 'profits-detailed' },
        { label: 'تقرير ارباح مجمل', type: 'profits-summary' },
        { label: 'تقرير ارباح الفواتير', type: 'profits-invoices' },
      ],
    },
    {
      key: 'customers',
      title: 'العملاء',
      icon: 'account-group-outline',
      color: Colors.info,
      bg: Colors.infoSoft,
      items: [
        { label: 'تقرير مديونية العملاء', type: 'customers-debt' },
        { label: 'تقرير المنتجات المباعة لعميل', type: 'customers-products' },
        { label: 'تقرير كشف حساب عميل', type: 'customers-statement' },
        { label: 'تقرير اجمالي مبيعات العملاء', type: 'customers-total-sales' },
      ],
    },
    {
      key: 'purchases',
      title: 'المشتريات',
      icon: 'shopping-outline',
      color: Colors.warning,
      bg: Colors.warningSoft,
      items: [
        { label: 'تقرير مشتريات مفصل', type: 'purchases-detailed' },
        { label: 'تقرير مشتريات مجمل', type: 'purchases-summary' },
        { label: 'تقرير مشتريات بالتصنيف', type: 'purchases-by-category' },
        { label: 'تقرير الفواتير الغير مسددة', type: 'purchases-unpaid' },
      ],
    },
    {
      key: 'suppliers',
      title: 'الموردين',
      icon: 'truck-outline',
      color: Colors.warning,
      bg: Colors.warningSoft,
      items: [
        { label: 'تقرير مديونية الموردين', type: 'suppliers-debt' },
        { label: 'تقرير المنتجات المباعة لمورد', type: 'suppliers-products' },
        { label: 'تقرير كشف حساب مورد', type: 'suppliers-statement' },
        { label: 'تقرير اجمالي مشتريات الموردين', type: 'suppliers-total-purchases' },
      ],
    },
    {
      key: 'warehouses',
      title: 'المخازن',
      icon: 'warehouse',
      color: Colors.primary,
      bg: Colors.primarySoft,
      items: [
        { label: 'جرد مفصل', type: 'inventory-detailed' },
        { label: 'جرد مجمل', type: 'inventory-summary' },
        { label: 'تقرير المنتجات منخفضة الكمية مفصل', type: 'low-stock-detailed' },
        { label: 'تقرير المنتجات منخفضة الكمية مجمل', type: 'low-stock-summary' },
      ],
    },
    {
      key: 'expenses',
      title: 'المصروفات',
      icon: 'cash-minus',
      color: Colors.danger,
      bg: Colors.dangerSoft,
      items: [
        { label: 'تقرير المصروفات', type: 'expenses-report' },
      ],
    },
  ];

  function handleItem(item: ReportItem) {
    if (item.comingSoon || !item.type) return;
    router.push(`/report-view?type=${item.type}` as any);
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
              { key: 'sales-grouped', label: 'بيانات مجمعة للمبيعات' },
              { key: 'purchases-grouped', label: 'بيانات مجمعة للمشتريات' },
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
              const value = summaries[tab]?.[p] || 0;
              return (
                <View key={p} style={styles.periodCard}>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.periodLabel}>{PERIOD_LABELS[p]}</Text>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'baseline', gap: 4 }}>
                      <Text style={styles.periodValue}>
                        {Math.round(value).toLocaleString('en-US')}
                      </Text>
                      <Text style={styles.periodCurrency}>{settings.currency || 'جنيه'}</Text>
                    </View>
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
                    color="#7c4dff"
                  />
                  <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
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
        <Pressable
          onPress={() => setPeriodPickerVisible(true)}
          style={styles.dateBtn}
          hitSlop={6}
        >
          <MaterialCommunityIcons name="calendar" size={18} color={Colors.primary} />
        </Pressable>
        <Pressable
          onPress={() => setPeriodPickerVisible(true)}
          style={styles.todayBtn}
          hitSlop={6}
        >
          <Text style={styles.todayText}>{PERIOD_LABELS[period]}</Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={Colors.text} />
        </Pressable>
      </View>

      <Modal
        visible={periodPickerVisible}
        onClose={() => setPeriodPickerVisible(false)}
        title="اختر الفترة"
      >
        {(['today', 'yesterday', 'thisMonth', 'lastMonth', 'thisYear', 'all'] as Period[]).map((p) => (
          <Pressable
            key={p}
            onPress={() => {
              setPeriod(p);
              setPeriodPickerVisible(false);
            }}
            style={styles.menuRow}
          >
            <MaterialCommunityIcons
              name={period === p ? 'check-circle' : 'circle-outline'}
              size={22}
              color={period === p ? Colors.primary : Colors.textMuted}
            />
            <Text style={styles.menuLabel}>{PERIOD_LABELS[p]}</Text>
          </Pressable>
        ))}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  toggleBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  toggleText: { color: Colors.primary, fontWeight: FontWeight.semibold, fontSize: FontSize.sm, textDecorationLine: 'underline' },
  tabsRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.lg,
    flexDirection: 'row-reverse',
  },
  tab: { paddingVertical: 8, paddingHorizontal: 4 },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontWeight: FontWeight.medium, fontSize: FontSize.md },
  tabTextActive: { color: Colors.primary, fontWeight: FontWeight.bold },
  summaryContent: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  periodCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    minHeight: 110,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    ...Shadow.sm,
  },
  periodLabel: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  periodValue: { color: Colors.primary, fontSize: 32, fontWeight: FontWeight.bold, marginTop: 4 },
  periodCurrency: { color: Colors.primary, fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  detailedContent: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.medium, color: Colors.text },
  sectionItems: { borderTopWidth: 1, borderTopColor: Colors.border },
  itemRow: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  itemLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium, textAlign: 'right' },
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
