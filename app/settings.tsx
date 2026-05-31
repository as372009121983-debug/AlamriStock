// Powered by OnSpace.AI
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { exportAll, importAll } from '@/services/storage';

const CURRENCIES = ['ج.م', 'ر.س', 'د.إ', 'د.ك', 'د.ع', 'ر.ق', '$', '€'];

export default function SettingsScreen() {
  const { settings, updateSettings, resetAll, sales, products, customers, suppliers, purchases } = useStore();
  const { canEdit } = useAuth();
  const { showAlert } = useAlert();
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [appTitle, setAppTitle] = useState(settings.appTitle);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [taxNumber, setTaxNumber] = useState(settings.taxNumber);
  const [invoiceFooter, setInvoiceFooter] = useState(settings.invoiceFooter);
  const [currency, setCurrency] = useState(settings.currency);
  const [logo, setLogo] = useState(settings.logo);
  const [backup, setBackup] = useState('');

  function save() {
    updateSettings({
      companyName: companyName.trim() || 'متجري',
      appTitle: appTitle.trim() || 'نظام إدارة',
      phone, address, taxNumber, invoiceFooter, currency, logo,
    });
    showAlert('تم الحفظ', 'تم تحديث بيانات الشركة بنجاح');
  }
  async function pickLogo() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showAlert('تنبيه', 'يجب السماح بالوصول للصور');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });
      if (!res.canceled && res.assets[0]) {
        setLogo(res.assets[0].uri);
      }
    } catch {
      showAlert('خطأ', 'تعذر اختيار الصورة');
    }
  }
  async function handleBackup() {
    try {
      const data = await exportAll();
      setBackup(data);
      showAlert('تم النسخ الاحتياطي', 'انسخ النص أدناه أو احفظه في مكان آمن');
    } catch {
      showAlert('خطأ', 'تعذر إنشاء النسخة الاحتياطية');
    }
  }
  async function handleRestore() {
    if (!backup.trim()) {
      showAlert('تنبيه', 'الصق بيانات النسخة الاحتياطية في الصندوق أولاً');
      return;
    }
    showAlert('استعادة البيانات', 'سيتم استبدال جميع البيانات الحالية. هل أنت متأكد؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'استعادة',
        style: 'destructive',
        onPress: async () => {
          try {
            await importAll(backup);
            showAlert('تم', 'تم استعادة البيانات. يرجى إعادة تشغيل التطبيق.');
          } catch {
            showAlert('خطأ', 'تعذر قراءة النسخة الاحتياطية');
          }
        },
      },
    ]);
  }
  function handleReset() {
    showAlert('حذف جميع البيانات', 'سيتم حذف جميع البيانات نهائياً. لا يمكن التراجع.', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف الكل',
        style: 'destructive',
        onPress: async () => {
          await resetAll();
          showAlert('تم', 'تم حذف جميع البيانات');
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="الإعدادات" subtitle="تخصيص التطبيق" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionTitle title="شعار الشركة" />
        <View style={styles.logoCard}>
          {logo ? (
            <Image source={{ uri: logo }} style={styles.logoImg} />
          ) : (
            <View style={[styles.logoImg, styles.logoPlaceholder]}>
              <MaterialCommunityIcons name="image-outline" size={32} color={Colors.textMuted} />
            </View>
          )}
          <View style={{ flex: 1, gap: Spacing.sm }}>
            <Button title="اختيار شعار" icon="image-plus" variant="secondary" onPress={pickLogo} />
            {logo ? (
              <Button title="حذف الشعار" icon="close" variant="outline" size="sm" onPress={() => setLogo('')} />
            ) : null}
          </View>
        </View>

        <SectionTitle title="بيانات الشركة" />
        <View style={styles.card}>
          <Input label="اسم الشركة" value={companyName} onChangeText={setCompanyName} />
          <Input label="عنوان النظام" value={appTitle} onChangeText={setAppTitle} placeholder="نظام الأمري للمخازن" />
          <Input label="رقم الهاتف" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Input label="العنوان" value={address} onChangeText={setAddress} multiline />
          <Input label="الرقم الضريبي" value={taxNumber} onChangeText={setTaxNumber} />
          <Input label="نص ذيل الفاتورة" value={invoiceFooter} onChangeText={setInvoiceFooter} placeholder="شكراً لتعاملكم معنا" />
        </View>

        <SectionTitle title="العملة" />
        <View style={[styles.card, { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: Spacing.sm }]}>
          {CURRENCIES.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCurrency(c)}
              style={({ pressed }) => [styles.currencyChip, currency === c && styles.currencyChipActive, pressed && { opacity: 0.85 }]}
            >
              <Text style={[styles.currencyText, currency === c && { color: Colors.white }]}>{c}</Text>
            </Pressable>
          ))}
        </View>

        <Button title="حفظ التعديلات" icon="content-save-outline" onPress={save} fullWidth />

        <SectionTitle title="إحصائيات سريعة" />
        <View style={styles.statRow}>
          <View style={styles.statBox}><Text style={styles.statValue}>{products.length}</Text><Text style={styles.statLabel}>منتج</Text></View>
          <View style={styles.statBox}><Text style={styles.statValue}>{customers.length}</Text><Text style={styles.statLabel}>عميل</Text></View>
          <View style={styles.statBox}><Text style={styles.statValue}>{suppliers.length}</Text><Text style={styles.statLabel}>مورد</Text></View>
        </View>
        <View style={styles.statRow}>
          <View style={styles.statBox}><Text style={styles.statValue}>{sales.length}</Text><Text style={styles.statLabel}>فاتورة</Text></View>
          <View style={styles.statBox}><Text style={styles.statValue}>{purchases.length}</Text><Text style={styles.statLabel}>شراء</Text></View>
        </View>

        <SectionTitle title="النسخ الاحتياطي" />
        <View style={styles.card}>
          <Text style={styles.helpText}>احتفظ بنسخة احتياطية من بياناتك دورياً.</Text>
          <Input label="بيانات النسخة الاحتياطية" value={backup} onChangeText={setBackup} multiline numberOfLines={6} placeholder="اضغط على إنشاء نسخة لإنتاج البيانات هنا" style={{ minHeight: 120, textAlignVertical: 'top' }} />
          <View style={{ flexDirection: 'row-reverse', gap: Spacing.sm, marginTop: Spacing.md }}>
            <Button title="إنشاء نسخة" variant="secondary" icon="cloud-download-outline" onPress={handleBackup} style={{ flex: 1 }} />
            <Button title="استعادة" variant="outline" icon="cloud-upload-outline" onPress={handleRestore} style={{ flex: 1 }} />
          </View>
        </View>

        {canEdit ? (
          <>
            <SectionTitle title="منطقة الخطر" />
            <Pressable onPress={handleReset} style={({ pressed }) => [styles.dangerCard, pressed && { opacity: 0.85 }]}>
              <MaterialCommunityIcons name="alert-octagon-outline" size={24} color={Colors.danger} />
              <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                <Text style={styles.dangerTitle}>حذف جميع البيانات</Text>
                <Text style={styles.dangerDesc}>سيتم مسح كل شيء بشكل نهائي</Text>
              </View>
            </Pressable>
          </>
        ) : null}

        <View style={{ alignItems: 'center', gap: 4, marginTop: Spacing.xl, paddingBottom: Spacing.xl }}>
          <Text style={styles.developer}>تطوير وملكية: {settings.ownerName}</Text>
          <Text style={styles.version}>الإصدار 2.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md },
  logoCard: { flexDirection: 'row-reverse', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  logoImg: { width: 80, height: 80, borderRadius: Radius.lg, backgroundColor: Colors.surfaceAlt },
  logoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, gap: Spacing.md, ...Shadow.sm },
  currencyChip: { paddingHorizontal: Spacing.lg, paddingVertical: 10, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.full, minWidth: 64, alignItems: 'center' },
  currencyChipActive: { backgroundColor: Colors.primary },
  currencyText: { color: Colors.text, fontWeight: FontWeight.semibold, fontSize: FontSize.md },
  statRow: { flexDirection: 'row-reverse', gap: Spacing.md },
  statBox: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.primary },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4 },
  helpText: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'right', lineHeight: 20 },
  dangerCard: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: Colors.dangerSoft, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.danger },
  dangerTitle: { color: Colors.danger, fontWeight: FontWeight.bold, fontSize: FontSize.md },
  dangerDesc: { color: Colors.danger, fontSize: FontSize.xs, marginTop: 4, opacity: 0.8 },
  developer: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  version: { color: Colors.textMuted, fontSize: FontSize.xs },
});
