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
    { title: 'المنتجات', icon: 'cube-outline', route: '/(tabs)/products' },
    { title: 'المصروفات', icon: 'cash-multiple', route: '/expenses' },
    { title: 'المشتريات', icon: 'shopping-outline', route: '/purchases' },
    { title: 'المبيعات', icon: 'currency-usd', route: '/(tabs)/sales', filled: true },
    { title: 'الموردين', icon: 'truck-outline', route: '/suppliers' },
    { title: 'العملاء', icon: 'account-outline', route: '/(tabs)/customers' },
    { title: 'التقارير', icon: 'chart-line-variant', route: '/reports', filled: true },
    { title: 'المستخدمين', icon: 'account-group-outline', route: isOwner ? '/users' : '/(tabs)/more' },
  ];

  const tiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return baseTiles;
    return baseTiles.filter((t) => t.title.includes(q));
  }, [search, baseTiles]);

  const drawerItems: { label: string; icon: IconName; route?: string; danger?: boolean; onPress?: () => void; badge?: number }[] = [
    { label: 'فاتورة بيع جديدة', icon: 'cart-plus', route: '/new-sale' },
    { label: 'اليومية', icon: 'calendar-today', route: '/journal' },
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
    { label: 'استخراج بالذكاء الاصطناعي', icon: 'camera-iris', route: '/ocr-import' },
    { label: 'البيان', icon: 'history', route: '/activity-log' },
    { label: 'الإعدادات', icon: 'cog-outline', route: '/settings' },
    { label: 'حول البرنامج', icon: 'information-outline', route: '/about' },
    { label: 'تسجيل الخروج', icon: 'logout', danger: true, onPress: logout },
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
                <MaterialCommunityIcons name="close" size={24} color={Colors.text} />
              </Pressable>
              <Text style={styles.drawerTitle}>القائمة</Text>
            </View>

            <View style={styles.userBox}>
              <View style={styles.userAvatar}>
                <MaterialCommunityIcons
                  name={isOwner ? 'shield-crown' : 'account-circle'}
                  size={28}
                  color={Colors.primary}
                />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.userName}>{user?.name || 'مستخدم'}</Text>
                {user?.phone ? <Text style={styles.userPhone}>{user.phone}</Text> : null}
                <View style={styles.userBadge}>
                  <Text style={styles.userBadgeText}>{isOwner ? 'مالك النظام' : 'مستخدم فرعي'}</Text>
                </View>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {drawerItems.map((item) => (
                <Pressable
                  key={item.label}
                  onPress={() => {
                    setDrawerVisible(false);
                    if (item.onPress) item.onPress();
                    else if (item.route) setTimeout(() => router.push(item.route as any), 80);
                  }}
                  style={({ pressed }) => [
                    styles.drawerItem,
                    item.danger && { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: Spacing.sm },
                    pressed && { backgroundColor: Colors.surfaceAlt },
                  ]}
                >
                  <MaterialCommunityIcons name="chevron-left" size={20} color={Colors.textMuted} />
                  <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                    <View style={styles.drawerLabelRow}>
                      {item.badge && item.badge > 0 ? (
                        <View style={styles.drawerBadge}>
                          <Text style={styles.drawerBadgeText}>{item.badge}</Text>
                        </View>
                      ) : null}
                      <Text style={[styles.drawerItemLabel, item.danger && { color: Colors.danger }]}>
                        {item.label}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.drawerIcon, item.danger && { backgroundColor: Colors.dangerSoft }]}>
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={22}
                      color={item.danger ? Colors.danger : Colors.primary}
                    />
                  </View>
                </Pressable>
              ))}
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapFilled: {
    backgroundColor: Colors.primaryDark,
  },
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
  fab: {
    position: 'absolute',
    bottom: 28,
    left: 20,
    width: 60,
    height: 60,
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
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  drawerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  userBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: Colors.primaryTint,
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  userAvatar: {
    width: 48, height: 48, borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  userName: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text },
  userPhone: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  userBadge: {
    marginTop: 4,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  userBadgeText: { color: Colors.primary, fontSize: 10, fontWeight: FontWeight.bold },
  drawerItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
  },
  drawerIcon: {
    width: 40, height: 40, borderRadius: Radius.md,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center', justifyContent: 'center',
  },
  drawerLabelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  drawerItemLabel: { fontSize: FontSize.md, fontWeight: FontWeight.medium, color: Colors.text },
  drawerBadge: {
    backgroundColor: Colors.danger,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    minWidth: 20,
    alignItems: 'center',
  },
  drawerBadgeText: { color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold },
});
