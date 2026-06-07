// Powered by OnSpace.AI
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchBar } from '@/components/ui/SearchBar';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';

type SimpleContact = {
  id: string;
  name: string;
  phone: string;
};

export default function ImportContactsScreen() {
  const { addCustomer, customers } = useStore();
  const { canEdit } = useAuth();
  const { showAlert } = useAlert();

  const [permission, setPermission] = useState<'pending' | 'granted' | 'denied' | 'unavailable'>('pending');
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<SimpleContact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [manualVisible, setManualVisible] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');

  useEffect(() => {
    requestAndLoad();
  }, []);

  async function requestAndLoad() {
    if (Platform.OS === 'web') {
      setPermission('unavailable');
      setErrorMessage('استيراد جهات الاتصال غير متاح على المتصفح. استخدم التطبيق على الهاتف.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      let { status } = await Contacts.getPermissionsAsync();
      if (status !== 'granted') {
        const result = await Contacts.requestPermissionsAsync();
        status = result.status;
      }
      if (status !== 'granted') {
        setPermission('denied');
        setLoading(false);
        return;
      }
      setPermission('granted');
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.FirstName],
      });
      const list: SimpleContact[] = [];
      const seen = new Set<string>();
      for (const c of data) {
        const phone = c.phoneNumbers?.[0]?.number;
        const name = c.name || c.firstName || '';
        if (!name.trim() || !phone) continue;
        const cleaned = phone.replace(/[\s\-()]/g, '');
        if (seen.has(cleaned)) continue;
        seen.add(cleaned);
        list.push({ id: c.id || `c_${list.length}`, name: name.trim(), phone: cleaned });
      }
      list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
      setContacts(list);
      if (list.length === 0) {
        setErrorMessage('لا توجد جهات اتصال بأرقام هاتف على هذا الجهاز');
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'فشل قراءة جهات الاتصال');
      showAlert('تعذر التحميل', e?.message || 'فشل قراءة جهات الاتصال');
    } finally {
      setLoading(false);
    }
  }

  async function openSystemSettings() {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch {
      showAlert('تنبيه', 'افتح إعدادات الجهاز يدوياً وامنح صلاحية جهات الاتصال للتطبيق');
    }
  }

  function handleManualSave() {
    if (!manualName.trim()) {
      showAlert('تنبيه', 'الاسم مطلوب');
      return;
    }
    addCustomer({
      name: manualName.trim(),
      phone: manualPhone.trim(),
      address: '',
    });
    showAlert('تم', `تم إضافة "${manualName.trim()}" كعميل جديد`);
    setManualName('');
    setManualPhone('');
    setManualVisible(false);
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.trim().toLowerCase();
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [contacts, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (filtered.every((c) => selected.has(c.id))) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const c of filtered) next.delete(c.id);
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const c of filtered) next.add(c.id);
        return next;
      });
    }
  }

  async function handleImport() {
    if (selected.size === 0) {
      showAlert('تنبيه', 'اختر جهة اتصال واحدة على الأقل');
      return;
    }
    setImporting(true);
    let success = 0;
    let skipped = 0;
    for (const c of contacts) {
      if (!selected.has(c.id)) continue;
      if (skipDuplicates && customers.some((cu) => cu.phone === c.phone)) {
        skipped++;
        continue;
      }
      addCustomer({ name: c.name, phone: c.phone, address: '' });
      success++;
    }
    setImporting(false);
    showAlert(
      'اكتمل الاستيراد',
      `تمت إضافة ${success} عميل${skipped > 0 ? ` - تم تخطي ${skipped} مكرر` : ''}`,
      [{ text: 'موافق', onPress: () => setSelected(new Set()) }]
    );
  }

  if (!canEdit) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="استيراد جهات الاتصال" />
        <EmptyState icon="lock" title="غير مسموح" description="ليس لديك صلاحية" />
      </SafeAreaView>
    );
  }

  if (permission === 'pending' || loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="استيراد جهات الاتصال" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (permission === 'denied' || permission === 'unavailable') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="استيراد جهات الاتصال" />
        <View style={styles.center}>
          <View style={[styles.iconBig, { backgroundColor: Colors.warningSoft, borderColor: Colors.warning }]}>
            <MaterialCommunityIcons name="contacts-outline" size={64} color={Colors.warning} />
          </View>
          <Text style={styles.title}>
            {permission === 'unavailable' ? 'غير متاح' : 'لم يتم منح الصلاحية'}
          </Text>
          <Text style={styles.sub}>
            {permission === 'unavailable'
              ? 'استيراد جهات الاتصال غير مدعوم على المتصفح. افتح التطبيق على الهاتف لاستخدام هذه الميزة.'
              : 'لم يستطع التطبيق الوصول لجهات الاتصال. قد تحتاج لفتح إعدادات الجهاز ومنح الصلاحية يدوياً.'}
          </Text>

          <View style={styles.actionsBox}>
            <Button title="إعادة المحاولة" onPress={requestAndLoad} icon="refresh" fullWidth />
            {permission === 'denied' ? (
              <Button
                title="فتح إعدادات الجهاز"
                onPress={openSystemSettings}
                icon="cog-outline"
                variant="secondary"
                fullWidth
              />
            ) : null}
            <View style={styles.divider} />
            <Text style={styles.altLabel}>أو أضف عميلاً يدوياً:</Text>
            <Button
              title="إضافة عميل يدوياً"
              onPress={() => setManualVisible(true)}
              icon="account-plus"
              variant="outline"
              fullWidth
            />
          </View>
        </View>

        <Modal
          visible={manualVisible}
          onClose={() => setManualVisible(false)}
          title="إضافة عميل يدوياً"
          footer={<Button title="حفظ" onPress={handleManualSave} fullWidth size="lg" />}
        >
          <Input
            label="اسم العميل"
            value={manualName}
            onChangeText={setManualName}
            placeholder="اسم العميل"
          />
          <Input
            label="رقم الهاتف"
            value={manualPhone}
            onChangeText={setManualPhone}
            placeholder="رقم الهاتف"
            keyboardType="phone-pad"
          />
        </Modal>
      </SafeAreaView>
    );
  }

  if (contacts.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="استيراد جهات الاتصال" />
        <View style={styles.center}>
          <View style={[styles.iconBig, { backgroundColor: Colors.surfaceAlt, borderColor: Colors.border }]}>
            <MaterialCommunityIcons name="contacts-outline" size={64} color={Colors.textMuted} />
          </View>
          <Text style={styles.title}>لا توجد جهات اتصال</Text>
          <Text style={styles.sub}>
            {errorMessage || 'لم نجد جهات اتصال بأرقام هاتف على هذا الجهاز'}
          </Text>
          <View style={styles.actionsBox}>
            <Button title="إعادة المحاولة" onPress={requestAndLoad} icon="refresh" fullWidth />
            <Button
              title="إضافة عميل يدوياً"
              onPress={() => setManualVisible(true)}
              icon="account-plus"
              variant="outline"
              fullWidth
            />
          </View>
        </View>

        <Modal
          visible={manualVisible}
          onClose={() => setManualVisible(false)}
          title="إضافة عميل يدوياً"
          footer={<Button title="حفظ" onPress={handleManualSave} fullWidth size="lg" />}
        >
          <Input label="اسم العميل" value={manualName} onChangeText={setManualName} placeholder="اسم العميل" />
          <Input label="رقم الهاتف" value={manualPhone} onChangeText={setManualPhone} placeholder="رقم الهاتف" keyboardType="phone-pad" />
        </Modal>
      </SafeAreaView>
    );
  }

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="جهات الاتصال"
        subtitle={`${contacts.length} جهة • محدد ${selected.size}`}
      />

      <View style={styles.toolbar}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="ابحث بالاسم أو الرقم" />
      </View>

      <View style={styles.actionsBar}>
        <Pressable onPress={() => setSkipDuplicates(!skipDuplicates)} style={styles.actBtn}>
          <View style={[styles.smallCheck, skipDuplicates && styles.smallCheckActive]}>
            {skipDuplicates ? <MaterialCommunityIcons name="check" size={12} color={Colors.white} /> : null}
          </View>
          <Text style={styles.actText}>تخطي المكرر</Text>
        </Pressable>
        <Pressable onPress={toggleAll} style={styles.actBtn}>
          <MaterialCommunityIcons
            name={allSelected ? 'checkbox-multiple-blank-outline' : 'checkbox-multiple-marked'}
            size={18}
            color={Colors.primary}
          />
          <Text style={[styles.actText, { color: Colors.primary }]}>
            {allSelected ? 'إلغاء' : 'تحديد الكل'}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={{ paddingTop: Spacing.xxxl }}>
            <EmptyState icon="magnify" title="لا نتائج" description="جرب كلمة بحث أخرى" />
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id);
          const isDuplicate = customers.some((c) => c.phone === item.phone);
          return (
            <Pressable
              onPress={() => toggle(item.id)}
              style={({ pressed }) => [
                styles.row,
                isSelected && styles.rowActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                {isSelected ? <MaterialCommunityIcons name="check" size={14} color={Colors.white} /> : null}
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  {isDuplicate ? (
                    <View style={styles.dupBadge}>
                      <Text style={styles.dupText}>موجود</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.itemPhone}>{item.phone}</Text>
              </View>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.slice(0, 1).toUpperCase()}</Text>
              </View>
            </Pressable>
          );
        }}
      />

      <View style={styles.bottomBar}>
        <Button
          title={importing ? 'جاري الإضافة...' : `إضافة ${selected.size} عميل`}
          icon="account-plus"
          onPress={handleImport}
          loading={importing}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  loadingText: { color: Colors.textSecondary, fontSize: FontSize.md },
  iconBig: {
    width: 120, height: 120, borderRadius: Radius.full,
    backgroundColor: Colors.warningSoft, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.warning,
  },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.text, marginTop: Spacing.md },
  sub: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', paddingHorizontal: Spacing.xl, lineHeight: 20 },
  actionsBox: { width: '100%', gap: Spacing.sm, marginTop: Spacing.lg, paddingHorizontal: Spacing.lg },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  altLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center' },
  toolbar: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  actionsBar: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  actBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  actText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  smallCheck: {
    width: 18, height: 18, borderRadius: Radius.sm, borderWidth: 1.5,
    borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center',
  },
  smallCheckActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  list: { padding: Spacing.lg, gap: 8, paddingBottom: 90 },
  row: {
    backgroundColor: Colors.surface, flexDirection: 'row-reverse', alignItems: 'center',
    padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, marginBottom: 6,
  },
  rowActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryTint },
  checkbox: {
    width: 24, height: 24, borderRadius: Radius.sm, borderWidth: 2,
    borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  avatar: {
    width: 44, height: 44, borderRadius: Radius.full, backgroundColor: Colors.warningSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.warning },
  itemHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  itemName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  itemPhone: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
  dupBadge: { backgroundColor: Colors.warningSoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm },
  dupText: { fontSize: 10, color: Colors.warning, fontWeight: FontWeight.bold },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.surface,
    padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border, ...Shadow.md,
  },
});
