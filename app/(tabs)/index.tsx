// Powered by OnSpace.AI
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { StatCard } from '@/components/ui/StatCard';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { AppLogo } from '@/components/ui/AppLogo';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { formatCurrency, formatDateTime, formatNumber, isSameDay } from '@/services/format';

export default function DashboardScreen() {
  const router = useRouter();
  const { products, customers, suppliers, sales, purchases, settings, warehouses, expenses } =
    useStore();
  const { user, logout } = useAuth();

  const stats = useMemo(() => {
    const totalRevenue = sales.reduce((s, sa) => s + sa.total, 0);
    const totalCost = sales.reduce(
      (s, sa) => s + sa.items.reduce((sum, it) => sum + it.purchasePrice * it.quantity, 0),
      0
    );
    const totalDiscount = sales.reduce((s, sa) => s + sa.discount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit - totalExpenses;
    const stockValue = products.reduce((s, p) => s + p.purchasePrice * p.quantity, 0);
    const today = Date.now();
    const todaySales = sales.filter((s) => isSameDay(s.date, today));
    const todayTotal = todaySales.reduce((s, sa) => s + sa.total, 0);
    const lowStock = products.filter((p) => p.quantity <= p.lowStockAlert);
    const mainWh = warehouses.filter((w) => w.type === 'main').length;
    const showWh = warehouses.filter((w) => w.type === 'showroom').length;
    return {
      totalRevenue,
      grossProfit,
      netProfit,
      totalDiscount,
      totalExpenses,
      stockValue,
      todayTotal,
      todayCount: todaySales.length,
      lowStock,
      mainWh,
      showWh,
    };
  }, [sales, products, expenses, warehouses]);

  const recentSales = sales.slice(0, 4);
  const recentPurchases = purchases.slice(0, 3);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[Colors.primaryDark, Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroRow}>
            <View style={styles.heroIcon}>
              <AppLogo size={44} />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={styles.heroSubtitle}>{user ? `مرحباً، ${user.name}` : 'مرحباً'}</Text>
              <Text style={styles.heroTitle} numberOfLines={1}>
                {settings.appTitle}
              </Text>
            </View>
            <Pressable
              onPress={logout}
              style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]}
              hitSlop={6}
            >
              <MaterialCommunityIcons name="logout" size={18} color={Colors.white} />
            </Pressable>
          </View>

          <View style={styles.heroStat}>
            <Text style={styles.heroLabel}>مبيعات اليوم</Text>
            <Text style={styles.heroAmount}>
              {formatCurrency(stats.todayTotal, settings.currency)}
            </Text>
            <View style={styles.heroBadge}>
              <MaterialCommunityIcons name="receipt" size={14} color={Colors.white} />
              <Text style={styles.heroBadgeText}>
                {formatNumber(stats.todayCount)} فاتورة اليوم
              </Text>
            </View>
          </View>
        </LinearGradient>

        <SectionTitle title="نظرة عامة" hint="الأرقام الرئيسية" />
        <View style={styles.grid}>
          <StatCard
            title="قيمة المخزون"
            value={formatCurrency(stats.stockValue, settings.currency)}
            icon="warehouse"
            color={Colors.primary}
            bg={Colors.primarySoft}
          />
          <StatCard
            title="إجمالي الأرباح"
            value={formatCurrency(stats.grossProfit, settings.currency)}
            icon="trending-up"
            color={Colors.success}
            bg={Colors.successSoft}
          />
          <StatCard
            title="إجمالي المبيعات"
            value={formatCurrency(stats.totalRevenue, settings.currency)}
            icon="chart-line"
            color={Colors.info}
            bg={Colors.infoSoft}
          />
          <StatCard
            title="صافي الربح"
            value={formatCurrency(stats.netProfit, settings.currency)}
            icon="cash-multiple"
            color={Colors.warning}
            bg={Colors.warningSoft}
          />
        </View>

        <View style={styles.miniGrid}>
          <MiniStat
            value={formatNumber(products.length)}
            label="منتج"
            icon="package-variant-closed"
            color={Colors.primary}
          />
          <MiniStat
            value={formatNumber(customers.length)}
            label="عميل"
            icon="account-group-outline"
            color={Colors.info}
          />
          <MiniStat
            value={formatNumber(suppliers.length)}
            label="مورد"
            icon="truck-delivery-outline"
            color={Colors.warning}
          />
        </View>
        <View style={styles.miniGrid}>
          <MiniStat
            value={formatNumber(stats.mainWh)}
            label="مخزن"
            icon="warehouse"
            color={Colors.primary}
          />
          <MiniStat
            value={formatNumber(stats.showWh)}
            label="معرض"
            icon="storefront-outline"
            color={Colors.success}
          />
          <MiniStat
            value={formatNumber(stats.lowStock.length)}
            label="نقص"
            icon="alert-outline"
            color={Colors.danger}
          />
        </View>

        <SectionTitle title="إجراءات سريعة" />
        <View style={styles.quickRow}>
          <QuickAction
            label="فاتورة بيع"
            icon="cart-plus"
            color={Colors.primary}
            onPress={() => router.push('/new-sale')}
          />
          <QuickAction
            label="منتج جديد"
            icon="plus-box-outline"
            color={Colors.info}
            onPress={() => router.push('/(tabs)/products?new=1' as any)}
          />
          <QuickAction
            label="مشتريات"
            icon="truck-fast-outline"
            color={Colors.warning}
            onPress={() => router.push('/purchases')}
          />
          <QuickAction
            label="تحويلات"
            icon="swap-horizontal"
            color={Colors.success}
            onPress={() => router.push('/transfers')}
          />
          <QuickAction
            label="مرتجعات"
            icon="undo-variant"
            color={Colors.danger}
            onPress={() => router.push('/returns')}
          />
          <QuickAction
            label="التقارير"
            icon="chart-box-outline"
            color={Colors.info}
            onPress={() => router.push('/reports')}
          />
        </View>

        {stats.lowStock.length > 0 ? (
          <>
            <SectionTitle
              title="تنبيه المخزون"
              hint={`${formatNumber(stats.lowStock.length)} منتج`}
            />
            <View style={styles.lowStockCard}>
              {stats.lowStock.slice(0, 4).map((p) => (
                <View key={p.id} style={styles.lowRow}>
                  <View style={styles.lowBadge}>
                    <Text style={styles.lowBadgeText}>{formatNumber(p.quantity)}</Text>
                  </View>
                  <Text style={styles.lowName} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <MaterialCommunityIcons name="alert" size={20} color={Colors.warning} />
                </View>
              ))}
            </View>
          </>
        ) : null}

        <SectionTitle title="آخر المبيعات" />
        {recentSales.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="cart-off" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>لا توجد مبيعات بعد</Text>
          </View>
        ) : (
          recentSales.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => router.push(`/invoice/${s.id}` as any)}
              style={({ pressed }) => [styles.saleCard, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.saleLeft}>
                <Text style={styles.saleAmount}>
                  {formatCurrency(s.total, settings.currency)}
                </Text>
                <Text style={styles.saleDate}>{formatDateTime(s.date)}</Text>
              </View>
              <View style={styles.saleRight}>
                <Text style={styles.saleNo}>#{s.invoiceNo}</Text>
                <Text style={styles.saleCustomer} numberOfLines={1}>
                  {s.customerName}
                </Text>
              </View>
            </Pressable>
          ))
        )}

        {recentPurchases.length > 0 ? (
          <>
            <SectionTitle title="آخر المشتريات" />
            {recentPurchases.map((p) => (
              <View key={p.id} style={styles.saleCard}>
                <View style={styles.saleLeft}>
                  <Text style={[styles.saleAmount, { color: Colors.warning }]}>
                    {formatCurrency(p.total, settings.currency)}
                  </Text>
                  <Text style={styles.saleDate}>{formatDateTime(p.date)}</Text>
                </View>
                <View style={styles.saleRight}>
                  <Text style={styles.saleNo}>#{p.purchaseNo}</Text>
                  <Text style={styles.saleCustomer} numberOfLines={1}>
                    {p.supplierName}
                  </Text>
                </View>
              </View>
            ))}
          </>
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MiniStat({
  value,
  label,
  icon,
  color,
}: {
  value: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
}) {
  return (
    <View style={styles.mini}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function QuickAction({
  label,
  icon,
  color,
  onPress,
}: {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickItem,
        { borderColor: color + '33' },
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={[styles.quickIcon, { backgroundColor: color + '1A' }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  hero: { borderRadius: Radius.xl, padding: Spacing.xl, ...Shadow.md },
  heroRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.md },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.white },
  heroSubtitle: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.85)' },
  heroStat: { marginTop: Spacing.xl, alignItems: 'flex-end' },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm },
  heroAmount: {
    color: Colors.white,
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    marginTop: 4,
  },
  heroBadge: {
    marginTop: Spacing.md,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  heroBadgeText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: Spacing.md },
  miniGrid: { flexDirection: 'row-reverse', gap: Spacing.sm, marginTop: Spacing.sm },
  mini: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  miniValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  miniLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  quickRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: Spacing.md },
  quickItem: {
    flex: 1,
    minWidth: 140,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'flex-end',
    borderWidth: 1,
    ...Shadow.sm,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  quickLabel: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text },
  lowStockCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.warningSoft,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  lowRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: Spacing.md, paddingVertical: 6 },
  lowBadge: {
    backgroundColor: Colors.warningSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    minWidth: 36,
    alignItems: 'center',
  },
  lowBadgeText: { color: Colors.warning, fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  lowName: { flex: 1, color: Colors.text, fontSize: FontSize.md, textAlign: 'right' },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: { marginTop: 8, fontSize: FontSize.md, color: Colors.text },
  saleCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  saleRight: { alignItems: 'flex-end' },
  saleNo: { fontSize: FontSize.xs, color: Colors.textMuted },
  saleCustomer: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginTop: 2,
  },
  saleLeft: { alignItems: 'flex-start' },
  saleAmount: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.primary },
  saleDate: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
});
