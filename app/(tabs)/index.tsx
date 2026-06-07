// Powered by OnSpace.AI
import React, { useMemo, useState } from 'react';
import {
  Linking,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { SearchBar } from '@/components/ui/SearchBar';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { formatCurrency } from '@/services/format';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

type Tile = {
  title: string;
  icon: IconName;
  route: string;
  filled?: boolean;
  color?: string;
};

export default function DashboardScreen() {
  const router = useRouter();
  const {
    settings,
    products,
    customers,
    sales,
    expenses,
    suppliers,
  } = useStore();
  const { isOwner, logout, pendingUsersCount } = useAuth();
  const [search, setSearch] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Live metrics for professional dashboard
  const metrics = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todaySales = sales.filter((s) => s.date >= startOfToday);
    const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);
    const todayCost = todaySales.reduce(
      (sum, s) =>
        sum + s.items.reduce((c, it) => c + it.purchasePrice * it.quantity, 0),
      0
    );
    const todayProfit = Math.max(0, todayTotal - todayCost);
    const lowStock = products.filter((p) => p.quantity <= p.lowStockAlert).length;
    const totalDebt = customers.reduce((sum, c) => sum + (c.debt || 0), 0);
    const inventoryValue = products.reduce(
      (sum, p) => sum + p.quantity * p.salePrice,
      0
    );
    return {
      todayTotal,
      todayProfit,
      todaySalesCount: todaySales.length,
      lowStock,
      totalDebt,
      inventoryValue,
    };
  }, [sales, products, customers]);

  const baseTiles: Tile[] = [
    { title: 'المنتجات', icon: 'cube-outline', route: '/(tabs)/products' },
    { title: 'المبيعات', icon: 'currency-usd', route: '/(tabs)/sales', filled: true },
    { title: 'المشتريات', icon: 'shopping-outline', route: '/purchases' },
    { title: 'العملاء', icon: 'account-outline', route: '/(tabs)/customers' },
    { title: 'الموردين', icon: 'truck-outline', route: '/suppliers' },
    { title: 'المصروفات', icon: 'cash-multiple', route: '/expenses' },
    { title: 'المخازن', icon: 'warehouse', route: '/warehouses' },
    { title: 'التقارير', icon: 'chart-line-variant', route: '/reports', filled: true },
  ];

  const tiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return baseTiles;
    return baseTiles.filter((t) => t.title.includes(q));
  }, [search, baseTiles]);

  const drawerItems: {
    label: string;
    icon: IconName;
    route?: string;
    danger?: boolean;
    onPress?: () => void;
    badge?: number;
    divider?: boolean;
  }[] = [
    ...(settings.aiEnabled !== false
      ? [{
          label: 'المساعد الذكي',
          icon: 'robot-happy-outline' as IconName,
          route: '/ai-assistant',
        }]
      : []),
    { label: 'الخزينة', icon: 'wallet-outline', route: '/journal' },
    { label: 'الجرد', icon: 'clipboard-list-outline', route: '/inventory' },
    { label: 'الأرباح', icon: 'trending-up', route: '/profits' },
    { label: 'البيان (سجل النشاط)', icon: 'history', route: '/activity-log' },
    ...(isOwner ? [{ label: 'المستخدمين', icon: 'account-group-outline' as IconName, route: '/users' }] : []),
    ...(isOwner ? [{
      label: 'طلبات الانضمام',
      icon: 'account-clock-outline' as IconName,
      route: '/join-requests',
      badge: pendingUsersCount,
    }] : []),
    { label: 'الإعدادات', icon: 'cog-outline', route: '/settings', divider: true },
    { label: 'مشاركة التطبيق', icon: 'share-variant', onPress: () => Linking.openURL('https://onspace.ai').catch(() => null) },
    { label: 'تواصل مع خدمة العملاء', icon: 'message-text-outline', onPress: () => {
      const phone = settings.phone?.replace(/\D/g, '') || '201000000000';
      const url = Platform.OS === 'web'
        ? `https://wa.me/${phone}`
        : `whatsapp://send?phone=${phone}`;
      Linking.openURL(url).catch(() => Linking.openURL(`https://wa.me/${phone}`).catch(() => null));
    }},
    { label: 'حول التطبيق', icon: 'information-outline', route: '/about' },
    { label: 'تسجيل خروج', icon: 'logout', onPress: logout, danger: true },
  ];

  const moreActions: { label: string; icon: IconName; route: string; badge?: number }[] = [
    { label: 'فاتورة بيع', icon: 'cart-plus', route: '/new-sale' },
    ...(settings.aiEnabled !== false
      ? [{ label: 'المساعد الذكي', icon: 'robot-happy-outline' as IconName, route: '/ai-assistant' }]
      : []),
    { label: 'الجرد', icon: 'clipboard-list-outline', route: '/inventory' },
    { label: 'الأرباح', icon: 'trending-up', route: '/profits' },
    { label: 'الخزينة', icon: 'wallet-outline', route: '/journal' },
    { label: 'دفعات العملاء', icon: 'cash-plus', route: '/customer-payments' },
    { label: 'العمال', icon: 'account-cash-outline', route: '/workers' },
    { label: 'سلفات العمال', icon: 'hand-coin-outline', route: '/worker-advances' },
    { label: 'المرتجعات', icon: 'undo-variant', route: '/returns' },
    { label: 'مرتجعات الشراء', icon: 'redo-variant', route: '/purchase-returns' },
    { label: 'تحويلات', icon: 'swap-horizontal', route: '/transfers' },
    { label: 'استيراد منتجات', icon: 'file-excel-outline', route: '/import-products' },
  ];

  function openWhatsapp() {
    const phone = settings.phone?.replace(/\D/g, '') || '201000000000';
    const url = `https://wa.me/${phone}?text=${encodeURIComponent('مرحباً، أحتاج للدعم الفني')}`;
    Linking.openURL(url).catch(() => null);
  }

  function renderTile(tile: Tile) {
    return (
      <Pressable
        key={tile.title}
        onPress={() => router.push(tile.route as any)}
        style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
      >
        <View style={styles.tileInner}>
          <View style={[styles.iconWrap, tile.filled && styles.iconWrapFilled]}>
            <MaterialCommunityIcons
              name={tile.icon}
              size={32}
              color={tile.filled ? Colors.white : Colors.primaryDark}
            />
          </View>
          <Text style={styles.tileLabel}>{tile.title}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => setDrawerVisible(true)}
          hitSlop={10}
          style={({ pressed }) => [styles.menuBtn, pressed && { opacity: 0.7 }]}
        >
          <MaterialCommunityIcons name="menu" size={28} color={Colors.text} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.brandTitle}>{settings.companyName || 'الأمري'}</Text>
          <Text style={styles.brandSub}>إدارة المخازن والمبيعات</Text>
        </View>
        <Pressable
          onPress={() => router.push('/new-sale' as any)}
          hitSlop={10}
          style={({ pressed }) => [styles.quickSaleBtn, pressed && { opacity: 0.85 }]}
        >
          <MaterialCommunityIcons name="cart-plus" size={22} color={Colors.white} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Live business hero card */}
        <LinearGradient
          colors={['#0F766E', '#14B8A6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroHeader}>
            <Pressable
              onPress={() => router.push('/journal' as any)}
              style={styles.heroDetails}
              hitSlop={6}
            >
              <Text style={styles.heroDetailsText}>تفاصيل اليوم</Text>
              <MaterialCommunityIcons name="chevron-left" size={16} color={Colors.white} />
            </Pressable>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.heroLabel}>مبيعات اليوم</Text>
              <Text style={styles.heroValue}>
                {formatCurrency(metrics.todayTotal, settings.currency)}
              </Text>
              <Text style={styles.heroSub}>
                {metrics.todaySalesCount} فاتورة • ربح {formatCurrency(metrics.todayProfit, settings.currency)}
              </Text>
            </View>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <MaterialCommunityIcons name="package-variant-closed" size={18} color={Colors.white} />
              <Text style={styles.heroStatValue}>{products.length}</Text>
              <Text style={styles.heroStatLabel}>منتج</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={Colors.white} />
              <Text style={styles.heroStatValue}>{metrics.lowStock}</Text>
              <Text style={styles.heroStatLabel}>قارب على النفاد</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <MaterialCommunityIcons name="cash-remove" size={18} color={Colors.white} />
              <Text style={styles.heroStatValue}>
                {Math.round(metrics.totalDebt).toLocaleString('en-US')}
              </Text>
              <Text style={styles.heroStatLabel}>ديون العملاء</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.searchWrap}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="ابحث عن قسم..." />
        </View>

        <View style={styles.grid}>{tiles.map(renderTile)}</View>

        {metrics.lowStock > 0 ? (
          <Pressable
            onPress={() => router.push('/inventory' as any)}
            style={({ pressed }) => [styles.alertCard, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="alert-octagon" size={22} color={Colors.warning} />
            <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
              <Text style={styles.alertTitle}>
                {metrics.lowStock} منتج قارب على النفاد
              </Text>
              <Text style={styles.alertSub}>اضغط لمراجعة المخزون</Text>
            </View>
            <MaterialCommunityIcons name="chevron-left" size={20} color={Colors.warning} />
          </Pressable>
        ) : null}

        <Text style={styles.shortcutsTitle}>اختصارات سريعة</Text>
        <View style={styles.shortcuts}>
          {moreActions.slice(0, 9).map((item) => (
            <Pressable
              key={item.label}
              onPress={() => router.push(item.route as any)}
              style={({ pressed }) => [styles.shortcut, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.shortcutIcon}>
                <MaterialCommunityIcons name={item.icon} size={22} color={Colors.primary} />
                {item.badge && item.badge > 0 ? (
                  <View style={styles.shortcutBadge}>
                    <Text style={styles.shortcutBadgeText}>{item.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.shortcutLabel} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <MaterialCommunityIcons name="account-group-outline" size={18} color={Colors.info} />
            <Text style={styles.summaryValue}>{customers.length}</Text>
            <Text style={styles.summaryLabel}>عميل</Text>
          </View>
          <View style={styles.summaryBox}>
            <MaterialCommunityIcons name="truck-outline" size={18} color={Colors.warning} />
            <Text style={styles.summaryValue}>{suppliers.length}</Text>
            <Text style={styles.summaryLabel}>مورد</Text>
          </View>
          <View style={styles.summaryBox}>
            <MaterialCommunityIcons name="receipt" size={18} color={Colors.success} />
            <Text style={styles.summaryValue}>{sales.length}</Text>
            <Text style={styles.summaryLabel}>فاتورة</Text>
          </View>
          <View style={styles.summaryBox}>
            <MaterialCommunityIcons name="cash-multiple" size={18} color={Colors.danger} />
            <Text style={styles.summaryValue}>{expenses.length}</Text>
            <Text style={styles.summaryLabel}>مصروف</Text>
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      <Pressable
        onPress={openWhatsapp}
        style={({ pressed }) => [
          styles.fab,
          pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] },
        ]}
        hitSlop={6}
      >
        <MaterialCommunityIcons name="whatsapp" size={28} color="#25D366" />
      </Pressable>

      <RNModal
        visible={drawerVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setDrawerVisible(false)}
      >
        <Pressable style={styles.drawerBackdrop} onPress={() => setDrawerVisible(false)} />
        <SafeAreaView style={styles.drawerWrap} edges={['top', 'bottom']}>
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <Pressable onPress={() => setDrawerVisible(false)} hitSlop={10}>
                <MaterialCommunityIcons name="close" size={26} color={Colors.text} />
              </Pressable>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.drawerTitle}>{settings.companyName || 'الأمري'}</Text>
                <Text style={styles.drawerSub}>إدارة المخازن</Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {drawerItems.map((item) => (
                <View key={item.label}>
                  {item.divider ? <View style={styles.divider} /> : null}
                  <Pressable
                    onPress={() => {
                      setDrawerVisible(false);
                      if (item.onPress) item.onPress();
                      else if (item.route) setTimeout(() => router.push(item.route as any), 80);
                    }}
                    style={({ pressed }) => [
                      styles.drawerItem,
                      pressed && { backgroundColor: Colors.surfaceAlt },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="chevron-left"
                      size={20}
                      color={Colors.textMuted}
                    />
                    <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                      <View style={styles.drawerLabelRow}>
                        {item.badge && item.badge > 0 ? (
                          <View style={styles.drawerBadge}>
                            <Text style={styles.drawerBadgeText}>{item.badge}</Text>
                          </View>
                        ) : null}
                        <Text
                          style={[
                            styles.drawerItemLabel,
                            item.danger && { color: Colors.danger },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </View>
                    </View>
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={22}
                      color={item.danger ? Colors.danger : Colors.text}
                    />
                  </Pressable>
                </View>
              ))}

              <Text style={styles.versionText}>الإصدار 5.0.0</Text>
            </ScrollView>
          </View>
        </SafeAreaView>
      </RNModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.text },
  brandSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  quickSaleBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  heroCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadow.md,
  },
  heroHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSize.sm,
    marginBottom: 4,
  },
  heroValue: {
    color: Colors.white,
    fontSize: 30,
    fontWeight: FontWeight.bold,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSize.xs,
    marginTop: 4,
  },
  heroDetails: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  heroDetailsText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: Spacing.md,
  },
  heroStats: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  heroStatValue: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  heroStatLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },
  heroStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  searchWrap: { marginBottom: Spacing.lg },
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  tile: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    minHeight: 120,
    ...Shadow.sm,
  },
  tilePressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  tileInner: { alignItems: 'flex-end', gap: Spacing.sm },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryTint,
  },
  iconWrapFilled: { backgroundColor: Colors.primaryDark },
  tileLabel: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'right',
  },
  alertCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: Colors.warningSoft,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  alertTitle: {
    color: Colors.warning,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.md,
  },
  alertSub: {
    color: Colors.warning,
    fontSize: FontSize.xs,
    opacity: 0.85,
    marginTop: 2,
  },
  shortcutsTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
    textAlign: 'right',
  },
  shortcuts: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  shortcut: {
    width: '31%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    minHeight: 92,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  shortcutIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.danger,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
    minWidth: 18,
    alignItems: 'center',
  },
  shortcutBadgeText: { color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold },
  shortcutLabel: {
    fontSize: FontSize.xs,
    color: Colors.text,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: FontWeight.medium,
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  summaryValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    left: 20,
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#25D366',
    ...Shadow.md,
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  drawerWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '85%',
    maxWidth: 360,
  },
  drawer: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  drawerHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  drawerTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.text },
  drawerSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  drawerItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    minHeight: 50,
  },
  drawerLabelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  drawerItemLabel: { fontSize: FontSize.md, fontWeight: FontWeight.medium, color: Colors.text },
  drawerBadge: {
    backgroundColor: Colors.danger,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
    minWidth: 20,
    alignItems: 'center',
  },
  drawerBadgeText: { color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold },
  versionText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
});
