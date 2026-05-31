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

export default function SignupScreen() {
  const router = useRouter();
  const { sendSignUpOTP, signInWithGoogle, googleLoading } = useAuth();
  const { showAlert } = useAlert();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (loading) return;
    if (!name.trim() || !email.trim() || !password.trim()) {
      showAlert('تنبيه', 'الرجاء إكمال جميع الحقول');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('تنبيه', 'كلمتا المرور غير متطابقتين');
      return;
    }
    setLoading(true);
    const res = await sendSignUpOTP({ name, email, password });
    setLoading(false);
    if (!res.ok) {
      showAlert('تعذر إرسال رمز التحقق', res.message || 'حاول مرة أخرى');
      return;
    }
    router.push('/verify-email');
  }

  async function handleGoogleSignIn() {
    if (googleLoading) return;
    const res = await signInWithGoogle();
    if (!res.ok) {
      showAlert('تسجيل بـ Google', res.message || 'تأكد من تفعيل Google من لوحة OnSpace Cloud');
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
              <Pressable
                onPress={() => router.replace('/login')}
                style={styles.backBtn}
                hitSlop={8}
              >
                <MaterialCommunityIcons name="arrow-right" size={22} color={Colors.white} />
              </Pressable>
              <View style={styles.brandWrap}>
                <View style={styles.logoOuter}>
                  <AppLogo size={72} />
                </View>
                <Text style={styles.brandName}>إنشاء حساب جديد</Text>
                <Text style={styles.brandSub}>سنرسل رمز تحقق إلى بريدك</Text>
              </View>
            </LinearGradient>

            <View style={styles.formCard}>
              <View style={styles.benefitsBox}>
                <View style={styles.benefit}>
                  <MaterialCommunityIcons name="email-check" size={16} color={Colors.primary} />
                  <Text style={styles.benefitText}>رمز تحقق من 4 أرقام</Text>
                </View>
                <View style={styles.benefit}>
                  <MaterialCommunityIcons name="cloud-check" size={16} color={Colors.primary} />
                  <Text style={styles.benefitText}>مزامنة سحابية فورية</Text>
                </View>
                <View style={styles.benefit}>
                  <MaterialCommunityIcons name="shield-check" size={16} color={Colors.primary} />
                  <Text style={styles.benefitText}>حماية كاملة لبياناتك</Text>
                </View>
              </View>

              <Input
                label="الاسم الكامل"
                value={name}
                onChangeText={setName}
                placeholder="مثال: عبدالرحمن سلامة"
              />
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
                placeholder="على الأقل 6 أحرف"
                secureTextEntry
              />
              <Input
                label="تأكيد كلمة المرور"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••"
                secureTextEntry
              />

              <Button
                title={loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
                icon="send-check-outline"
                onPress={handleSignup}
                loading={loading}
                fullWidth
                size="lg"
                style={{ marginTop: Spacing.lg }}
              />

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

              <View style={styles.signinBlock}>
                <Text style={styles.signinText}>لديك حساب بالفعل؟</Text>
                <Pressable onPress={() => router.replace('/login')} hitSlop={8}>
                  <Text style={styles.signinLink}>تسجيل الدخول</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerOwner}>تطوير وملكية</Text>
              <Text style={styles.footerName}>عبدالرحمن سلامة</Text>
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
    paddingBottom: 70,
    paddingHorizontal: Spacing.xl,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  backBtn: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  brandWrap: { alignItems: 'center', gap: 6 },
  logoOuter: {
    width: 96,
    height: 96,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  brandName: { fontSize: 26, color: Colors.white, fontWeight: FontWeight.bold },
  brandSub: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm },
  formCard: {
    marginHorizontal: Spacing.lg,
    marginTop: -50,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadow.md,
  },
  benefitsBox: {
    backgroundColor: Colors.primaryTint,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 8,
    marginBottom: Spacing.lg,
  },
  benefit: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  benefitText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
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
  signinBlock: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  signinText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  signinLink: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  footer: { alignItems: 'center', padding: Spacing.xl, gap: 4 },
  footerOwner: { color: Colors.textSecondary, fontSize: FontSize.xs },
  footerName: { color: Colors.primary, fontWeight: FontWeight.bold, fontSize: FontSize.md },
});
