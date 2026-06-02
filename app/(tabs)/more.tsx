// Powered by OnSpace.AI
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/ui/Header';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { formatNumber } from '@/services/format';

type Item = {
  title: string;
  subtitle: string;
  icon: keyof typeof import('@expo/vector-icons').MaterialCommunityIcons.glyphMap;
  color: string;
  bg: string;
  route: string;
  count?: number;
  badge?: string;
  alert?: number;
};

export default function MoreScreen() {
  const router = useRouter();
  const {
    suppliers,
    purchases,
    warehouses,
    transfers,
    saleReturns,
    purchaseReturns,
    expenses,
    customerPayments,
    workers,
    workerAdvances,
    settings,
  } = useStore();
  const { user, isOwner, logout, pendingUsersCount, isSubUser } = useAuth();

  const sections: { title: string; items: Item[] }[] = [
    {
      title: 'العمليات',
      items: [
        {
          title: 'الموردين',
          subtitle: 'إدارة بيانات الموردين',
          icon: 'truck-delivery-outline',
          color: Colors.warning,
          bg: Colors.warningSoft,
          route: '/suppliers',
          count: suppliers.length,
        },
        {
          title: 'المشتريات',
          subtitle: 'تسجيل عمليات الشراء',
          icon: 'cart-arrow-down',
          color: Colors.info,
          bg: Colors.infoSoft,
          route: '/purchases',
          count: purchases.length,
        },
        {
          title: 'المخازن والمعارض',
          subtitle: 'إدارة المخازن والمعارض',
          icon: 'warehouse',
          color: Colors.primary,
          bg: Colors.primarySoft,
          route: '/warehouses',
          count: warehouses.length,
        },
        {
          title: 'التحويلات',
          subtitle: 'تحويل بضاعة بين المواقع',
          icon: 'swap-horizontal',
          color: Colors.success,
          bg: Colors.successSoft,
          route: '/transfers',
          count: transfers.length,
        },
      ],
    },
    {
      title: 'المالية',
      items: [
        {
          title: 'دفعات العملاء',
          subtitle: 'تحصيل وسداد ديون العملاء',
          icon: 'cash-multiple',
          color: Colors.success,
          bg: Colors.successSoft,
          route: '/customer-payments',
          count: customerPayments.length,
        },
        {
          title: 'قبض العمال',
          subtitle: 'صرف مرتبات العمال مع حد أعلى',
          icon: 'account-cash-outline',
          color: Colors.warning,
          bg: Colors.warningSoft,
          route: '/workers',
          count: workers.length,
        },
        {
          title: 'سلفات العمال',
          subtitle: 'تسجيل السلف وتسديد الديون',
          icon: 'hand-coin-outline',
          color: Colors.info,
          bg: Colors.infoSoft,
          route: '/worker-advances',
          count: workerAdvances.length,
        },
        {
          title: 'المصروفات',
          subtitle: 'تسجيل المصاريف',
          icon: 'cash-minus',
          color: Colors.danger,
          bg: Colors.dangerSoft,
          route: '/expenses',
          count: expenses.length,
        },
      ],
    },
    {
      title: 'المرتجعات',
      items: [
        {
          title: 'مرتجعات البيع',
          subtitle: 'مرتجعات الفواتير من العملاء',
          icon: 'undo-variant',
          color: Colors.danger,
          bg: Colors.dangerSoft,
          route: '/returns',
          count: saleReturns.length,
        },
        {
          title: 'مرتجعات الشراء',
          subtitle: 'مرتجعات للموردين',
          icon: 'redo-variant',
          color: Colors.warning,
          bg: Colors.warningSoft,
          route: '/purchase-returns',
          count: purchaseReturns.length,
        },
      ],
    },
    {
      title: 'التقارير المالية',
      items: [
        {
          title: 'اليومية',
          subtitle: 'الوارد والمنصرف وصافي النقدية',
          icon: 'calendar-today',
          color: Colors.info,
          bg: Colors.infoSoft,
          route: '/journal',
        },
        {
          title: 'الجرد',
          subtitle: 'قيمة المخزون بسعري الشراء والبيع',
          icon: 'clipboard-list-outline',
          color: Colors.primary,
          bg: Colors.primarySoft,
          route: '/inventory',
        },
        {
          title: 'الأرباح',
          subtitle: 'الربح حسب الفترة والمنتج والفاتورة',
          icon: 'trending-up',
          color: Colors.success,
          bg: Colors.successSoft,
          route: '/profits',
        },
        {
          title: 'البيان',
          subtitle: 'سجل العمليات بالتفصيل',
          icon: 'history',
          color: Colors.textSecondary,
          bg: Colors.surfaceAlt,
          route: '/activity-log',
        },
      ],
    },
    {
      title: 'الاستيراد والذكاء الاصطناعي',
      items: [
        {
          title: 'استخراج المنتجات بالذكاء الاصطناعي',
          subtitle: 'تصوير قوائم الأسعار وقراءتها تلقائياً',
          icon: 'camera-iris',
          color: Colors.primary,
          bg: Colors.primarySoft,
          route: '/ocr-import',
          badge: 'AI',
        },
        {
          title: 'استيراد منتجات Excel/CSV',
          subtitle: 'استيراد قائمة منتجات من ملف',
          icon: 'file-excel',
          color: Colors.success,
          bg: Colors.successSoft,
          route: '/import-products',
        },
        {
          title: 'استيراد عملاء Excel/CSV',
          subtitle: 'استيراد قائمة عملاء من ملف',
          icon: 'file-import-outline',
          color: Colors.info,
          bg: Colors.infoSoft,
          route: '/import-customers',
        },
        {
          title: 'استيراد من جهات الاتصال',
          subtitle: 'إضافة عملاء من هاتفك',
          icon: 'contacts-outline',
          color: Colors.warning,
          bg: Colors.warningSoft,
          route: '/import-contacts',
        },
      ],
    },
    {
      title: 'الإعدادات',
      items: [
        ...(isOwner
          ? [
              {
                title: 'المستخدمون',
                subtitle: 'إدارة الحسابات والصلاحيات',
                icon: 'account-multiple-outline' as const,
                color: Colors.warning,
                bg: Colors.warningSoft,
                route: '/users',
                alert: pendingUsersCount,
              },
              {
                title: 'طلبات الانضمام',
                subtitle: 'مراجعة طلبات المستخدمين الجدد',
                icon: 'account-clock-outline' as const,
                color: Colors.danger,
                bg: Colors.dangerSoft,
                route: '/join-requests',
                alert: pendingUsersCount,
              },
            ]
          : []),
        {
          title: 'الإعدادات',
          subtitle: 'بيانات الشركة والعملة وكلمة مرور المدير',
          icon: 'cog-outline',
          color: Colors.primary,
          bg: Colors.primarySoft,
          route: '/settings',
        },
        {
          title: 'حول البرنامج',
          subtitle: 'معلومات النظام والمطور',
          icon: 'information-outline',
          color: Colors.info,
          bg: Colors.infoSoft,
          route: '/about',
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="المزيد" subtitle={settings.appTitle} showBack={false} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brandCard}>
          <View style={styles.brandIcon}>
            <MaterialCommunityIcons
              name={isSubUser ? 'account-circle' : 'shield-crown'}
              size={28}
              color={Colors.primary}
            />
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={styles.brandName}>{user?.name || 'مستخدم'}</Text>
            {user?.phone ? <Text style={styles.brandPhone}>{user.phone}</Text> : null}
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {isSubUser ? 'مستخدم فرعي' : 'مدير النظام'}
              </Text>
            </View>
          </View>
        </View>

        {pendingUsersCount > 0 && isOwner ? (
          <Pressable
            onPress={() => router.push('/join-requests')}
            style={({ pressed }) => [styles.alertBanner, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="bell-alert" size={22} color={Colors.danger} />
            <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
              <Text style={styles.alertTitle}>طلبات انضمام جديدة</Text>
              <Text style={styles.alertSub}>
                {pendingUsersCount} طلب بانتظار الموافقة
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-left" size={22} color={Colors.danger} />
          </Pressable>
        ) : null}

        {sections.map((section) => (
          <View key={section.title} style={{ marginTop: Spacing.md }}>
            <Text style={styles.sectionLabel}>{section.title}</Text>
            <View style={styles.list}>
              {section.items.map((item, idx) => (
                <Pressable
                  key={item.title}
                  onPress={() => router.push(item.route as any)}
                  style={({ pressed }) => [
                    styles.row,
                    idx === section.items.length - 1 && { borderBottomWidth: 0 },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <MaterialCommunityIcons name="chevron-left" size={22} color={Colors.textMuted} />
                  <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                    <Text style={styles.rowTitle}>{item.title}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>{item.subtitle}</Text>
                  </View>
                  {item.alert && item.alert > 0 ? (
                    <View style={styles.alertBadge}>
                      <Text style={styles.alertBadgeText}>{formatNumber(item.alert)}</Text>
                    </View>
                  ) : null}
                  {item.count !== undefined ? (
                    <View style={styles.countBadge}>
                      <Text style={styles.countText}>{formatNumber(item.count)}</Text>
                    </View>
                  ) : null}
                  {item.badge ? (
                    <View style={styles.aiBadge}>
                      <Text style={styles.aiBadgeText}>{item.badge}</Text>
                    </View>
                  ) : null}
                  <View style={[styles.icon, { backgroundColor: item.bg }]}>
                    <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Pressable
          onPress={logout}
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]}
        >
          <MaterialCommunityIcons name="logout" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </Pressable>

        <View style={{ alignItems: 'center', gap: 4, marginTop: Spacing.xl }}>
          <Text style={styles.developer}>تطوير وملكية: {settings.ownerName}</Text>
          <Text style={styles.version}>الإصدار 5.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  brandCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  brandIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  brandPhone: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  roleBadge: {
    marginTop: 4,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  roleText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  alertBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: Colors.dangerSoft,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.danger,
  },
  alertTitle: { color: Colors.danger, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  alertSub: { color: Colors.danger, fontSize: FontSize.xs, marginTop: 2 },
  alertBadge: {
    backgroundColor: Colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    marginLeft: Spacing.sm,
    minWidth: 24,
    alignItems: 'center',
  },
  alertBadgeText: { color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  list: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    minHeight: 64,
  },
  icon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.text },
  rowSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4 },
  countBadge: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginLeft: Spacing.sm,
  },
  countText: { fontSize: FontSize.xs, color: Colors.text, fontWeight: FontWeight.semibold },
  aiBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    marginLeft: Spacing.sm,
  },
  aiBadgeText: { color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  logoutBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.dangerSoft,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  logoutText: { color: Colors.danger, fontWeight: FontWeight.bold, fontSize: FontSize.md },
  developer: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  version: { color: Colors.textMuted, fontSize: FontSize.xs },
});
