// Powered by OnSpace.AI
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AppLogo } from '@/components/ui/AppLogo';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signInWithGoogle, googleLoading } = useAuth();
  const { showAlert } = useAlert();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (loading) return;
    if (!email.trim() || !password.trim()) {
      showAlert('تنبيه', 'الرجاء إدخال البريد وكلمة المرور');
      return;
    }
    setLoading(true);
    const res = await signIn(email, password, remember);
    setLoading(false);
    if (!res.ok) {
      const msg = res.message || 'تحقق من البيانات';
      if (msg.includes('غير مسجل')) {
        showAlert(
          'حساب غير موجود',
          msg + '\n\nهل تريد إنشاء حساب جديد بهذا البريد؟',
          [
            { text: 'إلغاء', style: 'cancel' },
            { text: 'إنشاء حساب', onPress: () => router.push('/signup') },
          ]
        );
      } else {
        showAlert('فشل تسجيل الدخول', msg);
      }
      return;
    }
  }

  async function handleGoogleSignIn() {
    if (googleLoading) return;
    const res = await signInWithGoogle();
    if (!res.ok) {
      showAlert('تسجيل الدخول بـ Google', res.message || 'حدث خطأ');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.primaryDark }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <LinearGradient
              colors={[Colors.primaryDark, Colors.primary, '#0EA5A4']}
              style={styles.heroBg}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.brandWrap}>
                <View style={styles.logoOuter}>
                  <AppLogo size={88} />
                </View>
                <Text style={styles.brandName}>الأمري</Text>
                <Text style={styles.brandTitle}>نظام الأمري للمخازن</Text>
                <View style={styles.cloudBadge}>
                  <MaterialCommunityIcons name="cloud-check" size={14} color={Colors.white} />
                  <Text style={styles.cloudBadgeText}>مزامنة سحابية</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.formCard}>
              <Text style={styles.formTitle}>تسجيل دخول المالك</Text>
              <Text style={styles.formSub}>أدخل بياناتك للوصول إلى حسابك السحابي</Text>

              <View style={{ marginTop: Spacing.lg }}>
                <Input
                  label="البريد الإلكتروني"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="example@domain.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <Input
                  label="كلمة المرور"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••"
                  secureTextEntry
                />

                <View style={styles.optionsRow}>
                  <Pressable
                    onPress={() => setRemember(!remember)}
                    style={({ pressed }) => [styles.remember, pressed && { opacity: 0.8 }]}
                  >
                    <View style={[styles.check, remember && styles.checkActive]}>
                      {remember ? (
                        <MaterialCommunityIcons name="check" size={14} color={Colors.white} />
                      ) : null}
                    </View>
                    <Text style={styles.rememberText}>تذكرني</Text>
                  </Pressable>
                  <Pressable onPress={() => router.push('/forgot-password')} hitSlop={8}>
                    <Text style={styles.forgotText}>نسيت كلمة المرور؟</Text>
                  </Pressable>
                </View>

                <Button
                  title={loading ? 'جاري الدخول...' : 'تسجيل دخول المالك'}
                  icon="login"
                  onPress={handleLogin}
                  loading={loading}
                  fullWidth
                  size="lg"
                  style={{ marginTop: Spacing.lg }}
                />

                <Pressable
                  onPress={() => router.push('/user-login')}
                  style={({ pressed }) => [styles.userLoginBtn, pressed && { opacity: 0.85 }]}
                >
                  <MaterialCommunityIcons name="account-group" size={20} color={Colors.white} />
                  <Text style={styles.userLoginText}>تسجيل دخول المستخدمين</Text>
                  <View style={styles.phoneIcon}>
                    <MaterialCommunityIcons name="cellphone" size={14} color={Colors.white} />
                  </View>
                </Pressable>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>أو</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Pressable
                  onPress={handleGoogleSignIn}
                  disabled={googleLoading}
                  style={({ pressed }) => [
                    styles.googleBtn,
                    (pressed || googleLoading) && { opacity: 0.7 },
                  ]}
                >
                  {googleLoading ? (
                    <ActivityIndicator size="small" color={Colors.text} />
                  ) : (
                    <View style={styles.googleIcon}>
                      <Text style={styles.googleG}>G</Text>
                    </View>
                  )}
                  <Text style={styles.googleText}>
                    {googleLoading ? 'جاري المعالجة...' : 'المتابعة بـ Google'}
                  </Text>
                </Pressable>

                <View style={styles.signupBlock}>
                  <Text style={styles.signupText}>ليس لديك حساب؟</Text>
                  <Pressable onPress={() => router.push('/signup')} hitSlop={8}>
                    <Text style={styles.signupLink}>إنشاء حساب جديد</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerOwner}>تطوير وملكية</Text>
              <Text style={styles.footerName}>عبدالرحمن سلامة</Text>
              <Text style={styles.footerVer}>الإصدار 5.0.0 • نظام متعدد المستخدمين</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, backgroundColor: Colors.background },
  heroBg: {
    paddingTop: Spacing.xxxl,
    paddingBottom: 80,
    paddingHorizontal: Spacing.xl,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  brandWrap: { alignItems: 'center', gap: 6 },
  logoOuter: {
    width: 116,
    height: 116,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  brandName: { fontSize: 32, color: Colors.white, fontWeight: FontWeight.bold },
  brandTitle: {
    color: Colors.white,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginTop: 4,
  },
  cloudBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginTop: 6,
  },
  cloudBadgeText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  formCard: {
    marginHorizontal: Spacing.lg,
    marginTop: -56,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadow.md,
  },
  formTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'right',
  },
  formSub: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'right', marginTop: 4 },
  optionsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  remember: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  check: {
    width: 22,
    height: 22,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  rememberText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  forgotText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  userLoginBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.success,
    borderRadius: Radius.md,
    paddingVertical: 14,
    marginTop: Spacing.md,
    minHeight: 52,
  },
  userLoginText: { color: Colors.white, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  phoneIcon: {
    width: 24, height: 24, borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  dividerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textMuted, fontSize: FontSize.sm },
  googleBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 12,
    marginTop: Spacing.md,
    minHeight: 48,
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: { color: '#fff', fontSize: 14, fontWeight: '700' },
  googleText: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  signupBlock: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  signupText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  signupLink: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  footer: { alignItems: 'center', padding: Spacing.xl, gap: 4 },
  footerOwner: { color: Colors.textSecondary, fontSize: FontSize.xs },
  footerName: { color: Colors.primary, fontWeight: FontWeight.bold, fontSize: FontSize.md },
  footerVer: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 8 },
});
