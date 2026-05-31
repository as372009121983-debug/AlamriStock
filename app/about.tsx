// Powered by OnSpace.AI
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/ui/Header';
import { AppLogo } from '@/components/ui/AppLogo';
import { useStore } from '@/hooks/useStore';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';

const FEATURES: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; desc: string }[] = [
  { icon: 'package-variant-closed', title: 'إدارة المنتجات', desc: 'مع صور وأسعار متعددة وباركود' },
  { icon: 'cart-outline', title: 'فواتير البيع', desc: 'إنشاء وطباعة وتصدير PDF' },
  { icon: 'truck-delivery-outline', title: 'المشتريات والموردين', desc: 'إدارة كاملة لعمليات الشراء' },
  { icon: 'warehouse', title: 'مخازن ومعارض', desc: 'تعدد المخازن والمعارض' },
  { icon: 'swap-horizontal', title: 'التحويلات', desc: 'تحويل بضاعة بين المواقع' },
  { icon: 'undo-variant', title: 'المرتجعات', desc: 'مرتجعات بيع وشراء' },
  { icon: 'cash-minus', title: 'المصروفات', desc: 'تتبع وتصنيف المصاريف' },
  { icon: 'chart-box-outline', title: 'تقارير شاملة', desc: 'تقارير المبيعات والأرباح' },
  { icon: 'history', title: 'سجل العمليات', desc: 'تتبع جميع الأنشطة' },
  { icon: 'account-multiple-outline', title: 'صلاحيات متعددة', desc: 'مالك، مشاهد، حسابات منفصلة' },
];

export default function AboutScreen() {
  const { settings } = useStore();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="حول البرنامج" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[Colors.primaryDark, Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.logoOuter}>
            <AppLogo size={76} />
          </View>
          <Text style={styles.brandName}>{settings.companyName}</Text>
          <Text style={styles.brandTitle}>{settings.appTitle}</Text>
          <Text style={styles.brandSub}>الإصدار 2.0.0</Text>
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>المالك والمطور</Text>
          <View style={styles.ownerRow}>
            <View style={styles.ownerAvatar}>
              <Text style={styles.ownerInitial}>ع</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
              <Text style={styles.ownerName}>{settings.ownerName}</Text>
              <Text style={styles.ownerRole}>تطوير وملكية</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>الميزات الرئيسية</Text>
          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.feature}>
                <View style={styles.featureIcon}>
                  <MaterialCommunityIcons name={f.icon} size={22} color={Colors.primary} />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>معلومات النظام</Text>
          <Info label="الإصدار" value="2.0.0" />
          <Info label="منصة العمل" value="React Native / Expo" />
          <Info label="تخزين البيانات" value="حفظ محلي آمن" />
          <Info label="حقوق النشر" value={`© ${new Date().getFullYear()} ${settings.ownerName}`} />
        </View>

        <Text style={styles.copyright}>
          جميع الحقوق محفوظة لـ {settings.ownerName}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxxl },
  heroCard: { borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center', ...Shadow.md },
  logoOuter: { width: 96, height: 96, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  logoInner: { width: 76, height: 76, borderRadius: Radius.full, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  brandName: { color: Colors.white, fontSize: FontSize.xxxl, fontWeight: FontWeight.bold, marginTop: Spacing.md },
  brandTitle: { color: 'rgba(255,255,255,0.9)', fontSize: FontSize.md, marginTop: 4 },
  brandSub: { color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs, marginTop: 4 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text, marginBottom: Spacing.md, textAlign: 'right' },
  ownerRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  ownerAvatar: { width: 56, height: 56, borderRadius: Radius.full, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  ownerInitial: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  ownerName: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  ownerRole: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  features: { gap: Spacing.md },
  feature: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.md },
  featureIcon: { width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  featureDesc: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
  infoRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  infoValue: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  copyright: { textAlign: 'center', color: Colors.textMuted, fontSize: FontSize.xs, marginTop: Spacing.md },
});
