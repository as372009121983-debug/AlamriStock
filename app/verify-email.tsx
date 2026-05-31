// Powered by OnSpace.AI
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { Button } from '@/components/ui/Button';
import { AppLogo } from '@/components/ui/AppLogo';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';

const RESEND_COOLDOWN = 60;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const {
    pendingSignup,
    verifyEmailOTP,
    resendSignUpOTP,
    clearPendingSignup,
    user,
  } = useAuth();
  const { showAlert } = useAlert();

  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!pendingSignup && !success && !user) {
      router.replace('/signup');
    }
  }, [pendingSignup, success, user]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [countdown]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  async function handleVerify() {
    if (verifying) return;
    if (otp.length < 4) {
      showAlert('تنبيه', 'أدخل رمز التحقق المكون من 4 أرقام');
      return;
    }
    setVerifying(true);
    const res = await verifyEmailOTP(otp);
    setVerifying(false);
    if (res.ok) {
      setSuccess(true);
    } else {
      showAlert('فشل التحقق', res.message || 'رمز غير صحيح');
      setOtp('');
      inputRef.current?.focus();
    }
  }

  async function handleResend() {
    if (countdown > 0 || resending) return;
    setResending(true);
    const res = await resendSignUpOTP();
    setResending(false);
    if (res.ok) {
      setCountdown(RESEND_COOLDOWN);
      setOtp('');
      showAlert('تم الإرسال', 'تم إرسال رمز جديد إلى بريدك الإلكتروني');
      inputRef.current?.focus();
    } else {
      showAlert('تعذر الإرسال', res.message || 'حاول مرة أخرى');
    }
  }

  function handleChangeEmail() {
    showAlert('تغيير البريد', 'هل تريد العودة وتغيير البريد الإلكتروني؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تغيير',
        onPress: () => {
          clearPendingSignup();
          router.replace('/signup');
        },
      },
    ]);
  }

  if (success) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.primaryDark }}>
        <SafeAreaView style={{ flex: 1 }}>
          <LinearGradient
            colors={[Colors.primaryDark, Colors.primary, '#0EA5A4']}
            style={styles.successContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.successIconWrap}>
              <View style={styles.successIcon}>
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={88}
                  color={Colors.white}
                />
              </View>
            </View>
            <Text style={styles.successTitle}>تم تأكيد البريد بنجاح!</Text>
            <Text style={styles.successSub}>تم تفعيل حسابك وجاري تسجيل الدخول</Text>
            <ActivityIndicator
              size="large"
              color={Colors.white}
              style={{ marginTop: Spacing.xl }}
            />
            <View style={styles.checkList}>
              <View style={styles.checkItem}>
                <MaterialCommunityIcons name="check-circle" size={18} color={Colors.white} />
                <Text style={styles.checkText}>تم إنشاء الحساب السحابي</Text>
              </View>
              <View style={styles.checkItem}>
                <MaterialCommunityIcons name="check-circle" size={18} color={Colors.white} />
                <Text style={styles.checkText}>تم تأكيد البريد الإلكتروني</Text>
              </View>
              <View style={styles.checkItem}>
                <MaterialCommunityIcons name="check-circle" size={18} color={Colors.white} />
                <Text style={styles.checkText}>جاري تجهيز بياناتك...</Text>
              </View>
            </View>
          </LinearGradient>
        </SafeAreaView>
      </View>
    );
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
                onPress={handleChangeEmail}
                style={styles.backBtn}
                hitSlop={8}
              >
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={22}
                  color={Colors.white}
                />
              </Pressable>
              <View style={styles.brandWrap}>
                <View style={styles.logoOuter}>
                  <AppLogo size={64} />
                </View>
                <Text style={styles.brandName}>تأكيد البريد الإلكتروني</Text>
                <View style={styles.emailChip}>
                  <MaterialCommunityIcons
                    name="email-outline"
                    size={14}
                    color={Colors.white}
                  />
                  <Text style={styles.emailChipText} numberOfLines={1}>
                    {pendingSignup?.email || 'بريدك'}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.formCard}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons
                  name="email-fast-outline"
                  size={48}
                  color={Colors.primary}
                />
              </View>

              <Text style={styles.formTitle}>أدخل رمز التحقق</Text>
              <Text style={styles.formSub}>
                أرسلنا رمز تحقق من 4 أرقام إلى بريدك الإلكتروني{'\n'}
                <Text style={{ fontWeight: FontWeight.bold, color: Colors.text }}>
                  افتح صندوق البريد وأدخل الرمز هنا
                </Text>
              </Text>

              <Pressable
                onPress={() => inputRef.current?.focus()}
                style={styles.otpDisplay}
              >
                {[0, 1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.otpBox,
                      otp[i] !== undefined && styles.otpBoxFilled,
                      otp.length === i && styles.otpBoxActive,
                    ]}
                  >
                    <Text style={styles.otpDigit}>{otp[i] || ''}</Text>
                  </View>
                ))}
              </Pressable>

              <TextInput
                ref={inputRef}
                style={styles.hiddenInput}
                value={otp}
                onChangeText={(text) => {
                  const cleaned = text.replace(/\D/g, '').slice(0, 4);
                  setOtp(cleaned);
                  if (cleaned.length === 4) {
                    setTimeout(() => handleVerifyAuto(cleaned), 100);
                  }
                }}
                keyboardType="number-pad"
                maxLength={4}
                textContentType="oneTimeCode"
                autoComplete={Platform.OS === 'ios' ? 'one-time-code' : 'sms-otp'}
                caretHidden
                editable={!verifying}
              />

              <Button
                title={verifying ? 'جاري التحقق...' : 'تأكيد الرمز'}
                icon="check-circle-outline"
                onPress={handleVerify}
                loading={verifying}
                fullWidth
                size="lg"
                style={{ marginTop: Spacing.lg }}
              />

              <View style={styles.resendBlock}>
                <Text style={styles.resendQuestion}>لم يصلك الرمز؟</Text>
                {countdown > 0 ? (
                  <View style={styles.countdownRow}>
                    <MaterialCommunityIcons
                      name="timer-sand"
                      size={14}
                      color={Colors.textMuted}
                    />
                    <Text style={styles.countdownText}>
                      إعادة الإرسال خلال {countdown} ثانية
                    </Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={handleResend}
                    hitSlop={8}
                    disabled={resending}
                    style={({ pressed }) => [
                      styles.resendBtn,
                      (pressed || resending) && { opacity: 0.7 },
                    ]}
                  >
                    {resending ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <MaterialCommunityIcons
                        name="refresh"
                        size={16}
                        color={Colors.primary}
                      />
                    )}
                    <Text style={styles.resendText}>
                      {resending ? 'جاري الإرسال...' : 'إعادة إرسال الرمز'}
                    </Text>
                  </Pressable>
                )}
              </View>

              <Pressable
                onPress={handleChangeEmail}
                hitSlop={8}
                style={styles.changeEmailBtn}
              >
                <MaterialCommunityIcons
                  name="email-edit-outline"
                  size={16}
                  color={Colors.textSecondary}
                />
                <Text style={styles.changeEmailText}>تغيير البريد الإلكتروني</Text>
              </Pressable>

              <View style={styles.tipBox}>
                <MaterialCommunityIcons
                  name="lightbulb-outline"
                  size={16}
                  color={Colors.warning}
                />
                <Text style={styles.tipText}>
                  تحقق من مجلد الرسائل غير المرغوب فيها (Spam) إن لم يصل الرمز
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );

  async function handleVerifyAuto(code: string) {
    if (verifying) return;
    setVerifying(true);
    const res = await verifyEmailOTP(code);
    setVerifying(false);
    if (res.ok) {
      setSuccess(true);
    } else {
      showAlert('فشل التحقق', res.message || 'رمز غير صحيح');
      setOtp('');
      inputRef.current?.focus();
    }
  }
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
  emailChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    marginTop: 6,
    maxWidth: '90%',
  },
  emailChipText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  formCard: {
    marginHorizontal: Spacing.lg,
    marginTop: -50,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadow.md,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.primarySoft,
  },
  formTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  formSub: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  otpDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  otpBox: {
    width: 56,
    height: 64,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: {
    backgroundColor: Colors.primaryTint,
    borderColor: Colors.primary,
  },
  otpBoxActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  otpDigit: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  resendBlock: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    gap: 4,
  },
  resendQuestion: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  countdownRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  countdownText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  resendBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryTint,
  },
  resendText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  changeEmailBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  changeEmailText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  tipBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
    backgroundColor: Colors.warningSoft,
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  tipText: { flex: 1, color: Colors.warning, fontSize: FontSize.xs, textAlign: 'right' },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  successIconWrap: {
    width: 160,
    height: 160,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  successIcon: {
    width: 130,
    height: 130,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 26,
    fontWeight: FontWeight.bold,
    color: Colors.white,
    textAlign: 'center',
  },
  successSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: FontSize.md,
    textAlign: 'center',
    marginTop: 8,
  },
  checkList: {
    marginTop: Spacing.xxxl,
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    width: '100%',
    maxWidth: 360,
  },
  checkItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  checkText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});
