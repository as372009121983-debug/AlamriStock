// Powered by OnSpace.AI
import React, { useState } from 'react';
import {
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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const { showAlert } = useAlert();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (!email.trim()) {
      showAlert('تنبيه', 'الرجاء إدخال البريد الإلكتروني');
      return;
    }
    setLoading(true);
    const res = await resetPassword(email);
    setLoading(false);
    if (!res.ok) {
      showAlert('تعذر إرسال الرسالة', res.message || 'حاول مرة أخرى');
      return;
    }
    setSent(true);
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
              colors={[Colors.primaryDark, Colors.primary]}
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
                  <AppLogo size={64} />
                </View>
                <Text style={styles.brandName}>استرجاع كلمة المرور</Text>
                <Text style={styles.brandSub}>سنرسل لك رابط إعادة التعيين</Text>
              </View>
            </LinearGradient>

            <View style={styles.formCard}>
              {sent ? (
                <View style={styles.successBlock}>
                  <View style={styles.successIcon}>
                    <MaterialCommunityIcons
                      name="email-check"
                      size={48}
                      color={Colors.success}
                    />
                  </View>
                  <Text style={styles.successTitle}>تم إرسال الرسالة</Text>
                  <Text style={styles.successText}>
                    تحقق من بريدك الإلكتروني واتبع الرابط لإعادة تعيين كلمة المرور
                  </Text>
                  <Button
                    title="العودة لتسجيل الدخول"
                    icon="login"
                    onPress={() => router.replace('/login')}
                    fullWidth
                    style={{ marginTop: Spacing.lg }}
                  />
                </View>
              ) : (
                <>
                  <Text style={styles.formTitle}>نسيت كلمة المرور؟</Text>
                  <Text style={styles.formSub}>
                    أدخل بريدك الإلكتروني وسنرسل لك رسالة لإعادة تعيين كلمة المرور
                  </Text>

                  <View style={{ marginTop: Spacing.lg }}>
                    <Input
                      label="البريد الإلكتروني"
                      value={email}
                      onChangeText={setEmail}
                      placeholder="example@domain.com"
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />

                    <Button
                      title="إرسال رابط الاسترجاع"
                      icon="send"
                      onPress={handleReset}
                      loading={loading}
                      fullWidth
                      size="lg"
                      style={{ marginTop: Spacing.md }}
                    />

                    <View style={styles.hint}>
                      <MaterialCommunityIcons
                        name="information-outline"
                        size={14}
                        color={Colors.info}
                      />
                      <Text style={styles.hintText}>
                        سيتم إرسال رسالة تحتوي على رابط لإعادة تعيين كلمة المرور
                      </Text>
                    </View>

                    <View style={styles.signinBlock}>
                      <Text style={styles.signinText}>تذكرت كلمة المرور؟</Text>
                      <Pressable onPress={() => router.replace('/login')} hitSlop={8}>
                        <Text style={styles.signinLink}>تسجيل الدخول</Text>
                      </Pressable>
                    </View>
                  </View>
                </>
              )}
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
    width: 92,
    height: 92,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  brandName: { fontSize: 22, color: Colors.white, fontWeight: FontWeight.bold },
  brandSub: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm },
  formCard: {
    marginHorizontal: Spacing.lg,
    marginTop: -50,
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
  formSub: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    textAlign: 'right',
    marginTop: 4,
  },
  hint: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
    backgroundColor: Colors.infoSoft,
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  hintText: { color: Colors.info, fontSize: FontSize.xs, flex: 1, textAlign: 'right' },
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
  signinLink: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  successBlock: { alignItems: 'center', gap: 12 },
  successIcon: {
    width: 92,
    height: 92,
    borderRadius: Radius.full,
    backgroundColor: Colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  successText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
