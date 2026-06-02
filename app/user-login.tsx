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
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';

type Mode = 'login' | 'request';

export default function UserLoginScreen() {
  const router = useRouter();
  const { signInWithPhone, requestJoinByPhone } = useAuth();
  const { showAlert } = useAlert();
  const [mode, setMode] = useState<Mode>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (loading) return;
    if (mode === 'login') {
      if (!phone.trim() || !password.trim()) {
        showAlert('تنبيه', 'الرجاء إدخال رقم الهاتف وكلمة المرور');
        return;
      }
      setLoading(true);
      setPendingMessage(null);
      const res = await signInWithPhone(phone, password);
      setLoading(false);

      if (!res.ok) {
        if (res.status === 'pending') {
          setPendingMessage(res.message || 'حسابك قيد المراجعة من قبل الإدارة');
          return;
        }
        if (res.status === 'rejected') {
          setPendingMessage(res.message || 'تم رفض طلب انضمامك');
          return;
        }
        showAlert('فشل تسجيل الدخول', res.message || 'تحقق من البيانات');
        return;
      }
    } else {
      if (!name.trim() || !phone.trim() || !password.trim()) {
        showAlert('تنبيه', 'يرجى ملء جميع الحقول');
        return;
      }
      if (password.length < 4) {
        showAlert('تنبيه', 'كلمة المرور يجب أن تكون 4 أحرف على الأقل');
        return;
      }
      setLoading(true);
      const res = await requestJoinByPhone(phone, password, name);
      setLoading(false);
      if (!res.ok) {
        showAlert('تعذر إرسال الطلب', res.message || 'حدث خطأ');
        return;
      }
      setPendingMessage(res.message || 'تم إرسال طلب الانضمام بنجاح. ستتمكن من الدخول بعد موافقة الإدارة');
      setMode('login');
    }
  }

  if (pendingMessage) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.primaryDark }}>
        <SafeAreaView style={{ flex: 1 }}>
          <LinearGradient
            colors={[Colors.primaryDark, Colors.primary]}
            style={styles.pendingHero}
          >
            <View style={styles.pendingIcon}>
              <MaterialCommunityIcons name="account-clock" size={56} color={Colors.white} />
            </View>
            <Text style={styles.pendingTitle}>في انتظار موافقة الإدارة</Text>
            <Text style={styles.pendingDesc}>{pendingMessage}</Text>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusBadgeText}>قيد المراجعة</Text>
            </View>
          </LinearGradient>

          <View style={styles.pendingBody}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="information" size={20} color={Colors.info} />
              <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                <Text style={styles.infoTitle}>ماذا يحدث الآن؟</Text>
                <Text style={styles.infoText}>تم إعلام الإدارة بطلبك. ستتمكن من الدخول بمجرد قبول طلبك.</Text>
              </View>
            </View>

            <View style={[styles.infoRow, { backgroundColor: Colors.warningSoft, borderColor: Colors.warning }]}>
              <MaterialCommunityIcons name="phone" size={20} color={Colors.warning} />
              <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                <Text style={[styles.infoTitle, { color: Colors.warning }]}>للتواصل مع الإدارة</Text>
                <Text style={[styles.infoText, { color: Colors.warning }]}>تواصل مع المالك لتسريع الموافقة على طلبك</Text>
              </View>
            </View>

            <Button
              title="إعادة المحاولة"
              icon="refresh"
              onPress={() => {
                setPendingMessage(null);
                setMode('login');
              }}
              fullWidth
              size="lg"
              style={{ marginTop: Spacing.xl }}
            />
            <Button
              title="العودة لتسجيل الدخول"
              icon="arrow-left"
              variant="outline"
              onPress={() => router.replace('/login')}
              fullWidth
              style={{ marginTop: Spacing.md }}
            />
          </View>
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
              colors={[Colors.primaryDark, Colors.success]}
              style={styles.heroBg}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Pressable
                onPress={() => router.back()}
                style={styles.backBtn}
                hitSlop={10}
              >
                <MaterialCommunityIcons name="arrow-right" size={22} color={Colors.white} />
              </Pressable>
              <View style={styles.brandWrap}>
                <View style={styles.logoOuter}>
                  <MaterialCommunityIcons name="account-group" size={64} color={Colors.white} />
                </View>
                <Text style={styles.brandTitle}>دخول المستخدمين</Text>
                <Text style={styles.brandSub}>تسجيل دخول الموظفين والعمال</Text>
              </View>
            </LinearGradient>

            <View style={styles.formCard}>
              <View style={styles.modeTabs}>
                <Pressable
                  onPress={() => setMode('login')}
                  style={[styles.modeTab, mode === 'login' && styles.modeTabActive]}
                >
                  <Text style={[styles.modeTabText, mode === 'login' && styles.modeTabTextActive]}>
                    تسجيل الدخول
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode('request')}
                  style={[styles.modeTab, mode === 'request' && styles.modeTabActive]}
                >
                  <Text style={[styles.modeTabText, mode === 'request' && styles.modeTabTextActive]}>
                    طلب انضمام
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.formTitle}>
                {mode === 'login' ? 'مرحباً بك' : 'إنشاء طلب انضمام'}
              </Text>
              <Text style={styles.formSub}>
                {mode === 'login'
                  ? 'أدخل رقم هاتفك وكلمة المرور للدخول'
                  : 'املأ بياناتك لإرسال طلب انضمام للإدارة'}
              </Text>

              <View style={{ marginTop: Spacing.lg }}>
                {mode === 'request' ? (
                  <Input
                    label="الاسم الكامل"
                    value={name}
                    onChangeText={setName}
                    placeholder="أدخل اسمك الكامل"
                  />
                ) : null}
                <Input
                  label="رقم الهاتف"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="01xxxxxxxxx"
                  keyboardType="phone-pad"
                />
                <Input
                  label="كلمة المرور"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••"
                  secureTextEntry
                />

                <Button
                  title={
                    loading
                      ? 'جاري المعالجة...'
                      : mode === 'login'
                      ? 'دخول'
                      : 'إرسال طلب الانضمام'
                  }
                  icon={mode === 'login' ? 'login' : 'send'}
                  onPress={handleSubmit}
                  loading={loading}
                  fullWidth
                  size="lg"
                  style={{ marginTop: Spacing.lg }}
                />

                {mode === 'request' ? (
                  <View style={styles.noteCard}>
                    <MaterialCommunityIcons name="information-outline" size={18} color={Colors.warning} />
                    <Text style={styles.noteText}>
                      لن تتمكن من الدخول حتى توافق الإدارة على طلبك. ستتلقى إشعاراً عند الموافقة.
                    </Text>
                  </View>
                ) : null}
              </View>
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
  },
  brandWrap: { alignItems: 'center', gap: 6, marginTop: Spacing.lg },
  logoOuter: {
    width: 116,
    height: 116,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  brandTitle: { fontSize: 28, color: Colors.white, fontWeight: FontWeight.bold },
  brandSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginTop: 2,
  },
  formCard: {
    marginHorizontal: Spacing.lg,
    marginTop: -56,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadow.md,
  },
  modeTabs: {
    flexDirection: 'row-reverse',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radius.full,
  },
  modeTabActive: { backgroundColor: Colors.primary },
  modeTabText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  modeTabTextActive: { color: Colors.white },
  formTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'right',
  },
  formSub: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'right', marginTop: 4 },
  noteCard: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.warningSoft,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  noteText: { flex: 1, color: Colors.warning, fontSize: FontSize.xs, textAlign: 'right', lineHeight: 18 },
  // Pending screen styles
  pendingHero: {
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  pendingIcon: {
    width: 100,
    height: 100,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingTitle: {
    color: Colors.white,
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  pendingDesc: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 24,
    marginHorizontal: Spacing.lg,
  },
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    marginTop: Spacing.md,
  },
  statusDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#FBBF24',
  },
  statusBadgeText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  pendingBody: { padding: Spacing.lg, gap: Spacing.md, flex: 1 },
  infoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    backgroundColor: Colors.infoSoft,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.info,
  },
  infoTitle: { color: Colors.info, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  infoText: { color: Colors.info, fontSize: FontSize.sm, marginTop: 4, lineHeight: 20 },
});
