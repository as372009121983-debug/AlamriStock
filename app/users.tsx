// Powered by OnSpace.AI
import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PhoneField } from '@/components/ui/PhoneField';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { AppUser, ROLE_COLORS, ROLE_LABELS, STATUS_COLORS, STATUS_LABELS, UserRole, UserStatus } from '@/constants/types';

const ROLE_OPTIONS: UserRole[] = ['manager', 'head', 'sales', 'warehouse'];
const ROLE_DESCRIPTIONS_SHORT: Record<UserRole, string> = {
  owner: 'صلاحيات كاملة',
  manager: 'إدارة كاملة عدا المستخدمين',
  head: 'مشاهدة فقط',
  sales: 'بيع وعملاء ومرتجعات',
  warehouse: 'مخزون ومشتريات',
};

export default function UsersScreen() {
  const { users, addUser, updateUser, deleteUser, approveUser, rejectUser, user, isOwner, pendingUsersCount } = useAuth();
  const { showAlert } = useAlert();

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('sales');
  const [status, setStatus] = useState<UserStatus>('approved');
  const [advancedVisible, setAdvancedVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOwner) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="المستخدمين" />
        <EmptyState icon="lock-outline" title="غير مسموح" description="هذه الصفحة للمالك فقط" />
      </SafeAreaView>
    );
  }

  function openCreate() {
    setEditing(null);
    setName('');
    setPhone('');
    setPassword('');
    setRole('sales');
    setStatus('approved');
    setAdvancedVisible(false);
    setModalVisible(true);
  }

  function openEdit(u: AppUser) {
    setEditing(u);
    setName(u.name);
    setPhone(u.phone || '');
    setPassword(u.password);
    setRole(u.role);
    setStatus(u.status);
    setAdvancedVisible(true);
    setModalVisible(true);
  }

  async function handleSubmit() {
    if (!name.trim()) {
      showAlert('تنبيه', 'الاسم مطلوب');
      return;
    }
    if (!phone.trim()) {
      showAlert('تنبيه', 'رقم الهاتف مطلوب');
      return;
    }
    const finalPassword = password.trim() || phone.trim().slice(-4) || '0000';
    setLoading(true);
    if (editing) {
      const res = await updateUser(editing.id, {
        name: name.trim(),
        phone: phone.trim(),
        password: finalPassword,
        role,
        status,
      });
      setLoading(false);
      if (!res.ok) {
        showAlert('خطأ', res.message || '');
        return;
      }
      setModalVisible(false);
    } else {
      const res = await addUser({
        name: name.trim(),
        phone: phone.trim(),
        email: '',
        password: finalPassword,
        role,
        status,
        active: true,
      });
      setLoading(false);
      if (!res.ok) {
        showAlert('خطأ', res.message || '');
        return;
      }
      setModalVisible(false);
      showAlert(
        'تم الحفظ',
        `تم إضافة "${name.trim()}" بكلمة مرور: ${finalPassword}`
      );
    }
  }

  function confirmDelete(u: AppUser) {
    showAlert('حذف مستخدم', `هل تريد حذف "${u.name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          const res = await deleteUser(u.id);
          if (!res.ok) showAlert('تعذر الحذف', res.message || '');
        },
      },
    ]);
  }

  async function handleApprove(u: AppUser) {
    const res = await approveUser(u.id);
    if (res.ok) showAlert('تم القبول', `تم قبول ${u.name}`);
    else showAlert('خطأ', res.message || '');
  }

  async function handleReject(u: AppUser) {
    const res = await rejectUser(u.id);
    if (res.ok) showAlert('تم الرفض', `تم رفض طلب ${u.name}`);
    else showAlert('خطأ', res.message || '');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="المستخدمين" subtitle={`${users.length} مستخدم`} />

      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.ownerCard}>
            <View style={styles.ownerAvatar}>
              <MaterialCommunityIcons name="account" size={26} color={Colors.primary} />
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
              <Text style={styles.ownerName}>حسابي</Text>
              <Text style={styles.ownerPhone}>+{user?.phone || '20'}</Text>
            </View>
            <Text style={styles.meTag}>أنا</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="account-multiple-outline"
            title="لا يوجد مستخدمين"
            description="اضغط + لإضافة مستخدم جديد"
          />
        }
        renderItem={({ item }) => {
          const colors = ROLE_COLORS[item.role];
          const statusColors = STATUS_COLORS[item.status];
          const isPending = item.status === 'pending';
          return (
            <View style={[styles.card, isPending && { borderColor: Colors.warning, borderWidth: 1.5 }]}>
              <View style={styles.cardRow}>
                <View style={[styles.avatar, { backgroundColor: colors.bg }]}>
                  <MaterialCommunityIcons name="account" size={24} color={colors.fg} />
                </View>
                <View style={{ flex: 1, marginRight: Spacing.md, alignItems: 'flex-end' }}>
                  <Text style={styles.userName}>{item.name}</Text>
                  {item.phone ? <Text style={styles.userPhone}>+{item.phone}</Text> : null}
                  <View style={styles.tagsRow}>
                    <View style={[styles.tag, { backgroundColor: colors.bg }]}>
                      <Text style={[styles.tagText, { color: colors.fg }]}>{ROLE_LABELS[item.role]}</Text>
                    </View>
                    <View style={[styles.tag, { backgroundColor: statusColors.bg }]}>
                      <Text style={[styles.tagText, { color: statusColors.fg }]}>{STATUS_LABELS[item.status]}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <Pressable onPress={() => openEdit(item)} hitSlop={8} style={styles.iconBtn}>
                    <MaterialCommunityIcons name="pencil-outline" size={18} color={Colors.info} />
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(item)} hitSlop={8} style={styles.iconBtn}>
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.danger} />
                  </Pressable>
                </View>
              </View>
              {isPending ? (
                <View style={styles.pendingActions}>
                  <Button title="قبول" icon="check" size="sm" onPress={() => handleApprove(item)} style={{ flex: 1 }} />
                  <Button title="رفض" icon="close" size="sm" variant="danger" onPress={() => handleReject(item)} style={{ flex: 1 }} />
                </View>
              ) : null}
            </View>
          );
        }}
      />

      {pendingUsersCount > 0 ? (
        <View style={styles.pendingBar}>
          <MaterialCommunityIcons name="bell-alert" size={18} color={Colors.warning} />
          <Text style={styles.pendingBarText}>
            {pendingUsersCount} طلب انضمام بانتظار الموافقة
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={openCreate}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
      >
        <MaterialCommunityIcons name="plus" size={28} color={Colors.white} />
      </Pressable>

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editing ? 'تعديل مستخدم' : 'اضف مستخدم جديد'}
        footer={
          <Button
            title={loading ? 'جاري الحفظ...' : 'حفظ'}
            onPress={handleSubmit}
            loading={loading}
            fullWidth
            size="lg"
          />
        }
      >
        <Input
          label="اسم المستخدم"
          value={name}
          onChangeText={setName}
          placeholder="اسم المستخدم"
        />
        <PhoneField
          label="رقم الهاتف"
          value={phone}
          onChangeText={setPhone}
          placeholder="01234..."
        />

        {!advancedVisible ? (
          <Pressable
            onPress={() => setAdvancedVisible(true)}
            style={styles.moreLink}
          >
            <MaterialCommunityIcons name="chevron-down" size={18} color={Colors.primary} />
            <Text style={styles.moreLinkText}>خيارات إضافية (الدور، كلمة المرور)</Text>
          </Pressable>
        ) : (
          <>
            <Input
              label="كلمة المرور (اختياري - سيستخدم آخر 4 أرقام من الهاتف)"
              value={password}
              onChangeText={setPassword}
              placeholder="••••"
              secureTextEntry
            />

            <Text style={styles.fieldLabel}>الدور</Text>
            <View style={{ gap: Spacing.sm }}>
              {ROLE_OPTIONS.map((r) => {
                const a = role === r;
                const colors = ROLE_COLORS[r];
                return (
                  <Pressable
                    key={r}
                    onPress={() => setRole(r)}
                    style={[styles.roleOption, a && styles.roleOptionActive]}
                  >
                    <MaterialCommunityIcons
                      name={a ? 'radiobox-marked' : 'radiobox-blank'}
                      size={20}
                      color={a ? Colors.primary : Colors.textMuted}
                    />
                    <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                      <Text style={[styles.roleTitle, a && { color: Colors.primary }]}>{ROLE_LABELS[r]}</Text>
                      <Text style={styles.roleDesc}>{ROLE_DESCRIPTIONS_SHORT[r]}</Text>
                    </View>
                    <View style={[styles.dot, { backgroundColor: colors.fg }]} />
                  </Pressable>
                );
              })}
            </View>

            {editing ? (
              <>
                <Text style={styles.fieldLabel}>حالة الحساب</Text>
                <View style={{ flexDirection: 'row-reverse', gap: Spacing.sm }}>
                  {(['pending', 'approved', 'rejected'] as UserStatus[]).map((s) => {
                    const a = status === s;
                    const sc = STATUS_COLORS[s];
                    return (
                      <Pressable
                        key={s}
                        onPress={() => setStatus(s)}
                        style={[styles.statusChip, { backgroundColor: a ? sc.fg : sc.bg }]}
                      >
                        <Text style={{ color: a ? Colors.white : sc.fg, fontWeight: FontWeight.bold, fontSize: FontSize.sm }}>
                          {STATUS_LABELS[s]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}
          </>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.lg, paddingBottom: 120 },
  ownerCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  ownerAvatar: {
    width: 44, height: 44, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  ownerName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  ownerPhone: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  meTag: { fontSize: FontSize.md, color: Colors.success, fontWeight: FontWeight.bold },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  cardRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.text },
  userPhone: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  tagsRow: { flexDirection: 'row-reverse', gap: 4, marginTop: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  tagText: { fontSize: 11, fontWeight: FontWeight.semibold },
  cardActions: { flexDirection: 'row-reverse', gap: 6 },
  iconBtn: { width: 32, height: 32, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  pendingActions: { flexDirection: 'row-reverse', gap: Spacing.sm, marginTop: Spacing.md },
  pendingBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.warningSoft,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.warning,
  },
  pendingBarText: { color: Colors.warning, fontSize: FontSize.sm, fontWeight: FontWeight.semibold, flex: 1, textAlign: 'right' },
  fab: {
    position: 'absolute',
    bottom: 28,
    left: 20,
    width: 60,
    height: 60,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  moreLink: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
  },
  moreLinkText: { color: Colors.primary, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  fieldLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, textAlign: 'right', marginTop: Spacing.sm },
  roleOption: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 8,
  },
  roleOptionActive: { backgroundColor: Colors.primaryTint, borderColor: Colors.primary },
  roleTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  roleDesc: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: Radius.full },
  statusChip: { flex: 1, paddingHorizontal: 8, paddingVertical: 10, borderRadius: Radius.md, alignItems: 'center' },
});
