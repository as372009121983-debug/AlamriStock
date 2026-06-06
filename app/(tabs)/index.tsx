// Powered by OnSpace.AI
import React, { useMemo, useState } from 'react';
import { Linking, Modal as RNModal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { SearchBar } from '@/components/ui/SearchBar';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

type Tile = {
  title: string;
  icon: IconName;
  route: string;
  filled?: boolean;
};

export default function DashboardScreen() {
  const router = useRouter();
  const { settings, products, customers, sales, expenses } = useStore();
  const { user, isOwner, logout, pendingUsersCount } = useAuth();
  const [search, setSearch] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);

  const baseTiles: Tile[] = [
    { title: 'المصروفات', icon: 'cash-multiple', route: '/expenses' },
    { title: 'المنتجات', icon: 'cube-outline', route: '/(tabs)/products' },
    { title: 'المبيعات', icon: 'currency-usd', route: '/(tabs)/sales', filled: true },
    { title: 'المشتريات', icon: 'shopping-outline', route: '/purchases' },
    { title: 'العملاء', icon: 'account-outline', route: '/(tabs)/customers' },
    { title: 'الموردين', icon: 'truck-outline', route: '/suppliers' },
    { title: 'المستخدمين', icon: 'account-group-outline', route: isOwner ? '/users' : '/(tabs)/more' },
    { title: 'التقارير', icon: 'chart-line-variant', route: '/reports', filled: true },
  ];

  const tiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return baseTiles;
    return baseTiles.filter((t) => t.title.includes(q));
  }, [search, baseTiles]);

  const drawerItems: { label: string; icon: IconName; route?: string; danger?: boolean; onPress?: () => void; badge?: number; divider?: boolean }[] = [
    { label: 'الخزينه', icon: 'wallet-outline', route: '/journal' },
    { label: 'الاعدادات', icon: 'cog-outline', route: '/settings' },
    { label: 'اعدادات الطباعة', icon: 'printer-outline', route: '/settings' },
    { label: 'تفعيل التطبيق', icon: 'check-circle-outline', divider: true, onPress: () => Linking.openURL('https://onspace.ai').catch(() => null) },
    { label: 'مشاركة التطبيق', icon: 'share-variant', onPress: () => Linking.openURL('https://onspace.ai').catch(() => null) },
    { label: 'تقييم التطبيق', icon: 'star-outline', onPress: () => Linking.openURL('https://onspace.ai').catch(() => null) },
    { label: 'تواصل مع خدمة العملاء', icon: 'message-text-outline', onPress: () => {
      const phone = settings.phone?.replace(/\D/g, '') || '201000000000';
      Linking.openURL(`https://wa.me/${phone}`).catch(() => null);
    }},
    { label: 'تسجيل خروج', icon: 'logout', onPress: logout },
    { label: 'مساعدة', icon: 'help-circle-outline', route: '/about' },
  ];

  const moreActions: { label: string; icon: IconName; route: string; badge?: number }[] = [
    { label: 'فاتورة بيع جديدة', icon: 'cart-plus', route: '/new-sale' },
    { label: 'الجرد', icon: 'clipboard-list-outline', route: '/inventory' },
    { label: 'الأرباح', icon: 'trending-up', route: '/profits' },
    { label: 'دفعات العملاء', icon: 'cash-plus', route: '/customer-payments' },
    { label: 'قبض العمال', icon: 'account-cash-outline', route: '/workers' },
    { label: 'سلفات العمال', icon: 'hand-coin-outline', route: '/worker-advances' },
    { label: 'المرتجعات', icon: 'undo-variant', route: '/returns' },
    { label: 'مرتجعات الشراء', icon: 'redo-variant', route: '/purchase-returns' },
    { label: 'التحويلات', icon: 'swap-horizontal', route: '/transfers' },
    { label: 'المخازن', icon: 'warehouse', route: '/warehouses' },
    ...(isOwner ? [{ label: 'طلبات الانضمام', icon: 'account-clock-outline' as IconName, route: '/join-requests', badge: pendingUsersCount }] : []),
    { label: 'استيراد منتجات', icon: 'file-excel-outline', route: '/import-products' },
    { label: 'استيراد عملاء', icon: 'file-import-outline', route: '/import-customers' },
    { label: 'البيان', icon: 'history', route: '/activity-log' },
  ];

  function openWhatsapp() {
    const phone = settings.phone?.replace(/\D/g, '') || '201000000000';
    const url = `https://wa.me/${phone}?text=${encodeURIComponent('مرحباً، أحتاج للدعم الفني')}`;
    Linking.openURL(url).catch(() => null);
  }

  function renderTile(tile: Tile, index: number) {
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
              size={36}
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
        <Text style={styles.brandTitle}>{settings.companyName || 'ShopUp'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchWrap}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="بحث" />
        </View>

        <View style={styles.grid}>
          {tiles.map(renderTile)}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBubble}>
            <Text style={styles.statValue}>{products.length}</Text>
            <Text style={styles.statLabel}>منتج</Text>
          </View>
          <View style={styles.statBubble}>
            <Text style={styles.statValue}>{customers.length}</Text>
            <Text style={styles.statLabel}>عميل</Text>
          </View>
          <View style={styles.statBubble}>
            <Text style={styles.statValue}>{sales.length}</Text>
            <Text style={styles.statLabel}>فاتورة</Text>
          </View>
          <View style={styles.statBubble}>
            <Text style={styles.statValue}>{expenses.length}</Text>
            <Text style={styles.statLabel}>مصروف</Text>
          </View>
        </View>

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
              <Text style={styles.shortcutLabel} numberOfLines={1}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      <Pressable
        onPress={openWhatsapp}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
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
        <Pressable
          style={styles.drawerBackdrop}
          onPress={() => setDrawerVisible(false)}
        />
        <SafeAreaView style={styles.drawerWrap} edges={['top', 'bottom']}>
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <Pressable onPress={() => setDrawerVisible(false)} hitSlop={10}>
                <MaterialCommunityIcons name="close" size={26} color={Colors.text} />
              </Pressable>
              <Text style={styles.drawerTitle}>{settings.companyName || 'ShopUp'}</Text>
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
                    <MaterialCommunityIcons name="chevron-left" size={22} color={Colors.textMuted} />
                    <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                      <Text style={[styles.drawerItemLabel, item.danger && { color: Colors.danger }]}>
                        {item.label}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={22}
                      color={Colors.text}
                    />
                  </Pressable>
                </View>
              ))}

              <Text style={styles.versionText}>اصدار التطبيق: 1.0.33</Text>
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
  menuBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  brandTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.text },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
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
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    minHeight: 130,
    ...Shadow.sm,
  },
  tilePressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  tileInner: { alignItems: 'flex-end', gap: Spacing.md },
  iconWrap: {
    width: 56, height: 56, borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapFilled: { backgroundColor: Colors.primaryDark },
  tileLabel: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row-reverse',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    paddingHorizontal: 4,
  },
  statBubble: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.primary },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
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
    width: 44, height: 44, borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  shortcutBadge: {
    position: 'absolute',
    top: -4, right: -4,
    backgroundColor: Colors.danger,
    paddingHorizontal: 6, paddingVertical: 1,
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
  fab: {
    position: 'absolute',
    bottom: 28, left: 20,
    width: 60, height: 60,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#25D366',
    ...Shadow.md,
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  drawerWrap: {
    position: 'absolute',
    top: 0, right: 0, bottom: 0,
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
    minHeight: 52,
  },
  drawerItemLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.medium, color: Colors.text },
  versionText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
});
