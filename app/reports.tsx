// Powered by OnSpace.AI
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '@/hooks/useStore';
import { Header } from '@/components/ui/Header';
import { CustomDatePicker } from '@/components/ui/CustomDatePicker';
import { Modal } from '@/components/ui/Modal';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { formatCurrency, formatDate } from '@/services/format';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;
type ReportItem = { label: string; type: string; icon: IconName };

type Section = {
  key: string;
  title: string;
  icon: IconName;
  color: string;
  bg: string;
  items: ReportItem[];
};

type Period =
  | 'today'
  | 'yesterday'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'all'
  | 'custom';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'اليوم',
  yesterday: 'أمس',
  thisMonth: 'الشهر الحالي',
  lastMonth: 'الشهر الماضي',
  thisYear: 'العام الحالي',
  all: 'كل الفترات',
  custom: 'فترة مخصصة',
};

function periodRange(
  p: Period,
  customFrom: number | null,
  customTo: number | null
): { from: number; to: number } {
  const now = new Date();
  if (p === 'custom') {
    return {
      from: customFrom ?? 0,
      to: customTo ?? Number.MAX_SAFE_INTEGER,
    };
  }
  if (p === 'all') return { from: 0, to: Number.MAX_SAFE_INTEGER };
  if (p === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from: start.getTime(), to: now.getTime() };
  }
  if (p === 'yesterday') {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
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
  const { sales, purchases, products, customers, settings, saleReturns, expenses } = useStore();

  const [period, setPeriod] = useState<Period>('today');
  const [customFrom, setCustomFrom] = useState<number | null>(null);
  const [customTo, setCustomTo] = useState<number | null>(null);
  const [periodPickerVisible, setPeriodPickerVisible] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    sales: true,
    profits: true,
  });

  const range = useMemo(
    () => periodRange(period, customFrom, customTo),
    [period, customFrom, customTo]
  );

  const stats = useMemo(() => {
    const inRange = (d: number) => d >= range.from && d <= range.to;
    const filteredSales = sales.filter((s) => inRange(s.date));
    const filteredReturns = saleReturns.filter((r) => inRange(r.date));
    const filteredPurchases = purchases.filter((p) => inRange(p.date));
    const filteredExpenses = expenses.filter((e) => inRange(e.date));
    const totalSales = filteredSales.reduce((s, x) => s + x.total, 0);
    const totalReturns = filteredReturns.reduce((s, r) => s + r.total, 0);
    const totalCost = filteredSales.reduce(
      (s, sa) => s + sa.items.reduce((c, it) => c + it.purchasePrice * it.quantity, 0),
      0
    );
    const returnsCost = filteredReturns.reduce(
      (s, r) => s + r.items.reduce((c, it) => c + (it.purchasePrice || 0) * it.quantity, 0),
      0
    );
    const totalProfit = totalSales - totalCost - (totalReturns - returnsCost);
    const totalPurchases = filteredPurchases.reduce((s, p) => s + p.total, 0);
    const totalExpensesAmt = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    return {
      totalSales: Math.round(totalSales - totalReturns),
      totalProfit: Math.round(totalProfit),
      totalPurchases: Math.round(totalPurchases),
      totalExpenses: Math.round(totalExpensesAmt),
      totalReturns: Math.round(totalReturns),
      salesCount: filteredSales.length,
      productsCount: products.length,
    };
  }, [sales, saleReturns, purchases, expenses, products, range]);

  const sections: Section[] = [
    {
      key: 'sales',
      title: 'المبيعات',
      icon: 'cart-outline',
      color: Colors.primary,
      bg: Colors.primarySoft,
      items: [
        { label: 'تقرير مبيعات مفصل', type: 'sales-detailed', icon: 'file-document-outline' },
        { label: 'تقرير مبيعات مجمل', type: 'sales-summary', icon: 'file-chart-outline' },
        { label: 'تقرير مبيعات بالتصنيف', type: 'sales-by-category', icon: 'shape-outline' },
        { label: 'الفواتير الغير مسددة', type: 'unpaid-invoices', icon: 'alert-circle-outline' },
      ],
    },
    {
      key: 'profits',
      title: 'الأرباح',
      icon: 'trending-up',
      color: Colors.success,
      bg: Colors.successSoft,
      items: [
        { label: 'تقرير أرباح مفصل', type: 'profits-detailed', icon: 'chart-line-variant' },
        { label: 'تقرير أرباح مجمل', type: 'profits-summary', icon: 'chart-areaspline' },
        { label: 'تقرير أرباح الفواتير', type: 'profits-invoices', icon: 'receipt' },
      ],
    },
    {
      key: 'customers',
      title: 'العملاء',
      icon: 'account-group-outline',
      color: Colors.info,
      bg: Colors.infoSoft,
      items: [
        { label: 'مديونية العملاء', type: 'customers-debt', icon: 'cash-remove' },
        { label: 'المنتجات المباعة لعميل', type: 'customers-products', icon: 'package-variant' },
        { label: 'كشف حساب عميل', type: 'customers-statement', icon: 'account-cash-outline' },
        { label: 'إجمالي مبيعات العملاء', type: 'customers-total-sales', icon: 'sigma' },
      ],
    },
    {
      key: 'purchases',
      title: 'المشتريات',
      icon: 'shopping-outline',
      color: Colors.warning,
      bg: Colors.warningSoft,
      items: [
        { label: 'تقرير مشتريات مفصل', type: 'purchases-detailed', icon: 'file-document-outline' },
        { label: 'تقرير مشتريات مجمل', type: 'purchases-summary', icon: 'file-chart-outline' },
        { label: 'تقرير مشتريات بالتصنيف', type: 'purchases-by-category', icon: 'shape-outline' },
      ],
    },
    {
      key: 'suppliers',
      title: 'الموردين',
      icon: 'truck-outline',
      color: '#9333EA',
      bg: '#F3E8FF',
      items: [
        { label: 'المنتجات المشتراة من مورد', type: 'suppliers-products', icon: 'package-variant' },
        { label: 'كشف حساب مورد', type: 'suppliers-statement', icon: 'account-cash-outline' },
        { label: 'إجمالي مشتريات الموردين', type: 'suppliers-total-purchases', icon: 'sigma' },
      ],
    },
    {
      key: 'warehouses',
      title: 'المخازن',
      icon: 'warehouse',
      color: '#0EA5E9',
      bg: '#E0F2FE',
      items: [
        { label: 'جرد مفصل', type: 'inventory-detailed', icon: 'clipboard-list-outline' },
        { label: 'جرد مجمل', type: 'inventory-summary', icon: 'clipboard-text-outline' },
        { label: 'منتجات منخفضة الكمية', type: 'low-stock-detailed', icon: 'alert-octagon-outline' },
      ],
    },
    {
      key: 'expenses',
      title: 'المصروفات',
      icon: 'cash-minus',
      color: Colors.danger,
      bg: Colors.dangerSoft,
      items: [
        { label: 'تقرير المصروفات', type: 'expenses-report', icon: 'cash-multiple' },
      ],
    },
  ];

  function handleItem(item: ReportItem) {
    const params = new URLSearchParams({ type: item.type });
    if (period === 'custom') {
      params.append('p', 'custom');
      if (customFrom) params.append('from', String(customFrom));
      if (customTo) params.append('to', String(customTo));
    } else {
      params.append('p', period);
    }
    router.push(`/report-view?${params.toString()}` as any);
  }

  const periodDisplay =
    period === 'custom'
      ? `${customFrom ? formatDate(customFrom) : '—'} ← ${customTo ? formatDate(customTo) : '—'}`
      : PERIOD_LABELS[period];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="التقارير"
        subtitle="تقارير احترافية شاملة"
        right={
          <Pressable
            onPress={() => setPeriodPickerVisible(true)}
            style={styles.headerBtn}
            hitSlop={6}
          >
            <MaterialCommunityIcons name="calendar-month" size={22} color={Colors.primary} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero stats card */}
        <LinearGradient
          colors={['#0F766E', '#14B8A6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroHeader}>
            <Pressable
              onPress={() => setPeriodPickerVisible(true)}
              style={styles.periodChip}
              hitSlop={6}
            >
              <MaterialCommunityIcons name="calendar" size={14} color={Colors.white} />
              <Text style={styles.periodChipText}>{periodDisplay}</Text>
              <MaterialCommunityIcons name="chevron-down" size={14} color={Colors.white} />
            </Pressable>
            <Text style={styles.heroBadge}>ملخص الفترة</Text>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>
                {stats.totalSales.toLocaleString('en-US')}
              </Text>
              <Text style={styles.heroStatLabel}>صافي المبيعات</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatValue}>
                {stats.totalProfit.toLocaleString('en-US')}
              </Text>
              <Text style={styles.heroStatLabel}>الأرباح</Text>
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroSecondary}>
              <MaterialCommunityIcons name="cart-outline" size={14} color="rgba(255,255,255,0.85)" />
              <Text style={styles.heroSecondaryText}>
                {stats.salesCount} فاتورة
              </Text>
            </View>
            <View style={styles.heroSecondary}>
              <MaterialCommunityIcons
                name="cash-multiple"
                size={14}
                color="rgba(255,255,255,0.85)"
              />
              <Text style={styles.heroSecondaryText}>
                مصروفات: {stats.totalExpenses.toLocaleString('en-US')}
              </Text>
            </View>
            <View style={styles.heroSecondary}>
              <MaterialCommunityIcons
                name="undo-variant"
                size={14}
                color="rgba(255,255,255,0.85)"
              />
              <Text style={styles.heroSecondaryText}>
                مرتجع: {stats.totalReturns.toLocaleString('en-US')}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick KPIs */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpi, { borderLeftColor: Colors.primary }]}>
            <MaterialCommunityIcons name="trending-up" size={18} color={Colors.primary} />
            <Text style={styles.kpiValue}>
              {formatCurrency(stats.totalSales, settings.currency)}
            </Text>
            <Text style={styles.kpiLabel}>المبيعات</Text>
          </View>
          <View style={[styles.kpi, { borderLeftColor: Colors.success }]}>
            <MaterialCommunityIcons name="cash-check" size={18} color={Colors.success} />
            <Text style={styles.kpiValue}>
              {formatCurrency(stats.totalProfit, settings.currency)}
            </Text>
            <Text style={styles.kpiLabel}>الربح</Text>
          </View>
        </View>
        <View style={styles.kpiRow}>
          <View style={[styles.kpi, { borderLeftColor: Colors.warning }]}>
            <MaterialCommunityIcons name="shopping-outline" size={18} color={Colors.warning} />
            <Text style={styles.kpiValue}>
              {formatCurrency(stats.totalPurchases, settings.currency)}
            </Text>
            <Text style={styles.kpiLabel}>المشتريات</Text>
          </View>
          <View style={[styles.kpi, { borderLeftColor: Colors.danger }]}>
            <MaterialCommunityIcons name="cash-minus" size={18} color={Colors.danger} />
            <Text style={styles.kpiValue}>
              {formatCurrency(stats.totalExpenses, settings.currency)}
            </Text>
            <Text style={styles.kpiLabel}>المصروفات</Text>
          </View>
        </View>

        {/* Section divider */}
        <View style={styles.dividerWrap}>
          <Text style={styles.dividerText}>التقارير التفصيلية</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Sections */}
        {sections.map((section) => {
          const isOpen = !!expanded[section.key];
          return (
            <View key={section.key} style={styles.sectionCard}>
              <Pressable
                onPress={() =>
                  setExpanded((p) => ({ ...p, [section.key]: !isOpen }))
                }
                style={styles.sectionHeader}
              >
                <MaterialCommunityIcons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color={section.color}
                />
                <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionSub}>{section.items.length} تقرير</Text>
                </View>
                <View style={[styles.sectionIcon, { backgroundColor: section.bg }]}>
                  <MaterialCommunityIcons name={section.icon} size={20} color={section.color} />
                </View>
              </Pressable>
              {isOpen ? (
                <View style={styles.sectionItems}>
                  {section.items.map((item, idx) => (
                    <Pressable
                      key={item.type}
                      onPress={() => handleItem(item)}
                      style={({ pressed }) => [
                        styles.itemRow,
                        idx === section.items.length - 1 && { borderBottomWidth: 0 },
                        pressed && { backgroundColor: Colors.surfaceAlt },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="chevron-left"
                        size={18}
                        color={Colors.textMuted}
                      />
                      <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                        <Text style={styles.itemLabel}>{item.label}</Text>
                      </View>
                      <View style={[styles.itemIcon, { backgroundColor: section.bg }]}>
                        <MaterialCommunityIcons
                          name={item.icon}
                          size={16}
                          color={section.color}
                        />
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom date filter bar */}
      <View style={styles.bottomBar}>
        <Pressable
          onPress={() => {
            setPeriod('custom');
            setShowFromPicker(true);
          }}
          style={styles.dateBtn}
          hitSlop={6}
        >
          <MaterialCommunityIcons name="calendar-edit" size={18} color={Colors.primary} />
        </Pressable>
        <Pressable
          onPress={() => setPeriodPickerVisible(true)}
          style={styles.todayBtn}
          hitSlop={6}
        >
          <Text style={styles.todayText}>{periodDisplay}</Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={Colors.text} />
        </Pressable>
      </View>

      {/* Period picker modal */}
      <Modal
        visible={periodPickerVisible}
        onClose={() => setPeriodPickerVisible(false)}
        title="اختر الفترة"
      >
        {(['today', 'yesterday', 'thisMonth', 'lastMonth', 'thisYear', 'all'] as Period[]).map(
          (p) => (
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
          )
        )}
        <Pressable
          onPress={() => {
            setPeriodPickerVisible(false);
            setPeriod('custom');
            setShowFromPicker(true);
          }}
          style={[styles.menuRow, styles.menuRowCustom]}
        >
          <MaterialCommunityIcons
            name={period === 'custom' ? 'check-circle' : 'calendar-edit'}
            size={22}
            color={period === 'custom' ? Colors.primary : Colors.primary}
          />
          <Text style={[styles.menuLabel, { color: Colors.primary, fontWeight: FontWeight.bold }]}>
            تاريخ مخصص (يدوي)
          </Text>
        </Pressable>
      </Modal>

      <CustomDatePicker
        visible={showFromPicker}
        onClose={() => setShowFromPicker(false)}
        initialDate={customFrom || Date.now()}
        title="من تاريخ"
        onSelect={(ts) => {
          setCustomFrom(ts);
          setPeriod('custom');
          setTimeout(() => setShowToPicker(true), 250);
        }}
      />
      <CustomDatePicker
        visible={showToPicker}
        onClose={() => setShowToPicker(false)}
        initialDate={customTo || Date.now()}
        title="إلى تاريخ"
        endOfDay
        onSelect={(ts) => {
          setCustomTo(ts);
          setPeriod('custom');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  heroCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadow.md,
    gap: Spacing.md,
  },
  heroHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBadge: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  periodChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  periodChipText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  heroStats: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    color: Colors.white,
    fontSize: 26,
    fontWeight: FontWeight.bold,
  },
  heroStatLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  heroStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroStatsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  heroSecondary: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  heroSecondaryText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
  },
  kpiRow: {
    flexDirection: 'row-reverse',
    gap: Spacing.md,
  },
  kpi: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderLeftWidth: 4,
    ...Shadow.sm,
    gap: 4,
    alignItems: 'flex-end',
  },
  kpiValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  kpiLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  dividerWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  dividerText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  sectionSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionItems: { borderTopWidth: 1, borderTopColor: Colors.border },
  itemRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    minHeight: 56,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    textAlign: 'right',
  },
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
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
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
  menuRowCustom: {
    backgroundColor: Colors.primaryTint,
    borderTopWidth: 1,
    borderTopColor: Colors.primarySoft,
    marginTop: 4,
  },
  menuLabel: { flex: 1, color: Colors.text, fontSize: FontSize.md, textAlign: 'right' },
});
