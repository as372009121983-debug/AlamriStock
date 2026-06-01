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
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { AppUser, ROLE_COLORS, ROLE_DESCRIPTIONS, ROLE_LABELS, STATUS_COLORS, STATUS_LABELS, UserRole, UserStatus } from '@/constants/types';
import { formatDateTime } from '@/services/format';

type FormState = {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  active: boolean;
  status: UserStatus;
};
const empty: FormState = { email: '', password: '', name: '', role: 'sales', active: true, status: 'pending' };

const ROLE_OPTIONS: UserRole[] = ['manager', 'head', 'sales', 'warehouse'];

export default function UsersScreen() {
  const { users, addUser, updateUser, deleteUser, approveUser, rejectUser, user, isOwner, pendingUsersCount } = useAuth();
  const { showAlert } = useAlert();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | UserStatus>('all');

  if (!isOwner) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="المستخدمون" />
        <EmptyState icon="lock" title="غير مسموح" description="هذه الصفحة للمالك فقط" />
      </SafeAreaView>
    );
  }

  const filteredUsers = filter === 'all' ? users : users.filter((u) => u.status === filter);

  function openCreate() {
    setEditing(null);
    setForm({ ...empty, status: 'approved' });
    setModalVisible(true);
  }
  function openEdit(u: AppUser) {
    setEditing(u);
    setForm({ email: u.email, password: u.password, name: u.name, role: u.role, active: u.active, status: u.status });
    setModalVisible(true);
  }
  async function handleSubmit() {
    if (!form.email.trim() || !form.password.trim() || !form.name.trim()) {
      showAlert('تنبيه', 'الحقول المطلوبة فارغة');
      return;
    }
    setLoading(true);
    if (editing) {
      const res = await updateUser(editing.id, form);
      setLoading(false);
      if (!res.ok) {
        showAlert('خطأ', res.message || '');
        return;
      }
      setModalVisible(false);
    } else {
      const res = await addUser(form);
      setLoading(false);
      if (!res.ok) {
        showAlert('خطأ', res.message || '');
        return;
      }
      setModalVisible(false);
      if (form.status === 'pending') {
        showAlert('تم الإرسال', 'تم إرسال طلب الانضمام، يحتاج إلى موافقتك من صفحة طلبات الانضمام');
      }
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
  async function toggleActive(u: AppUser) {
    await updateUser(u.id, { active: !u.active });
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
      <Header
        title="المستخدمون"
        subtitle={`${users.length} مستخدم${pendingUsersCount > 0 ? ` • ${pendingUsersCount} بانتظار` : ''}`}
        right={
          <Pressable onPress={openCreate} hitSlop={8} style={styles.headerBtn}>
            <MaterialCommunityIcons name="account-plus" size={20} color={Colors.white} />
          </Pressable>
        }
      />

      <View style={styles.ownerCard}>
        <View style={[styles.avatar, { backgroundColor: ROLE_COLORS.owner.bg }]}>
          <MaterialCommunityIcons name="shield-crown" size={22} color={ROLE_COLORS.owner.fg} />
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={[styles.tag, { backgroundColor: ROLE_COLORS.owner.bg, marginTop: 4 }]}>
            <Text style={[styles.tagText, { color: ROLE_COLORS.owner.fg }]}>المالك (أنت)</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabsRow}>
        <FilterChip label={`الكل (${users.length})`} active={filter === 'all'} onPress={() => setFilter('all')} />
        <FilterChip label={`بانتظار (${users.filter((u) => u.status === 'pending').length})`} active={filter === 'pending'} onPress={() => setFilter('pending')} />
        <FilterChip label={`مقبول (${users.filter((u) => u.status === 'approved').length})`} active={filter === 'approved'} onPress={() => setFilter('approved')} />
        <FilterChip label={`مرفوض (${users.filter((u) => u.status === 'rejected').length})`} active={filter === 'rejected'} onPress={() => setFilter('rejected')} />
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(u) => u.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon="account-multiple" title="لا يوجد مستخدمون" description="ابدأ بإضافة مستخدم جديد" />
        }
        renderItem={({ item }) => {
          const colors = ROLE_COLORS[item.role];
          const statusColors = STATUS_COLORS[item.status];
          const isPending = item.status === 'pending';
          return (
            <View style={[styles.card, isPending && { borderColor: Colors.warning, borderWidth: 1.5 }]}>
              <View style={{ flexDirection: 'row-reverse', gap: 6 }}>
                <Pressable onPress={() => confirmDelete(item)} hitSlop={8} style={styles.actBtn}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.danger} />
                </Pressable>
                <Pressable onPress={() => toggleActive(item)} hitSlop={8} style={styles.actBtn}>
                  <MaterialCommunityIcons
                    name={item.active ? 'pause-circle-outline' : 'play-circle-outline'}
                    size={18}
                    color={item.active ? Colors.warning : Colors.success}
                  />
                </Pressable>
                <Pressable onPress={() => openEdit(item)} hitSlop={8} style={styles.actBtn}>
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={Colors.info} />
                </Pressable>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.email}>{item.email}</Text>
                <View style={styles.tags}>
                  <View style={[styles.tag, { backgroundColor: colors.bg }]}>
                    <Text style={[styles.tagText, { color: colors.fg }]}>{ROLE_LABELS[item.role]}</Text>
                  </View>
                  <View style={[styles.tag, { backgroundColor: statusColors.bg }]}>
                    <Text style={[styles.tagText, { color: statusColors.fg }]}>{STATUS_LABELS[item.status]}</Text>
                  </View>
                  {item.active ? (
                    <View style={[styles.tag, { backgroundColor: Colors.successSoft }]}>
                      <Text style={[styles.tagText, { color: Colors.success }]}>نشط</Text>
                    </View>
                  ) : (
                    <View style={[styles.tag, { backgroundColor: Colors.dangerSoft }]}>
                      <Text style={[styles.tagText, { color: Colors.danger }]}>معطل</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.meta}>أُضيف: {formatDateTime(item.createdAt)}</Text>
                {isPending ? (
                  <View style={styles.pendingActions}>
                    <Button title="قبول" icon="check" size="sm" onPress={() => handleApprove(item)} />
                    <Button title="رفض" icon="close" size="sm" variant="danger" onPress={() => handleReject(item)} />
                  </View>
                ) : null}
              </View>
              <View style={[styles.avatar, { backgroundColor: colors.bg }]}>
                <Text style={[styles.avatarText, { color: colors.fg }]}>{(item.name || '?').slice(0, 1)}</Text>
              </View>
            </View>
          );
        }}
      />

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editing ? 'تعديل مستخدم' : 'إضافة مستخدم'}
        footer={
          <>
            <Button title="إلغاء" variant="secondary" onPress={() => setModalVisible(false)} style={{ flex: 1 }} />
            <Button title="حفظ" onPress={handleSubmit} loading={loading} style={{ flex: 1 }} />
          </>
        }
      >
        <Input label="الاسم الكامل" value={form.name} onChangeText={(t) => setForm((p) => ({ ...p, name: t }))} />
        <Input
          label="البريد الإلكتروني"
          value={form.email}
          onChangeText={(t) => setForm((p) => ({ ...p, email: t }))}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="example@domain.com"
        />
        <Input
          label="كلمة المرور"
          value={form.password}
          onChangeText={(t) => setForm((p) => ({ ...p, password: t }))}
          secureTextEntry
        />

        <Text style={styles.fieldLabel}>الدور والصلاحيات</Text>
        <View style={{ gap: Spacing.sm }}>
          {ROLE_OPTIONS.map((role) => {
            const a = form.role === role;
            const colors = ROLE_COLORS[role];
            return (
              <Pressable
                key={role}
                onPress={() => setForm((p) => ({ ...p, role }))}
                style={({ pressed }) => [styles.roleOption, a && styles.roleOptionActive, pressed && { opacity: 0.85 }]}
              >
                <MaterialCommunityIcons
                  name={a ? 'radiobox-marked' : 'radiobox-blank'}
                  size={22}
                  color={a ? Colors.primary : Colors.textMuted}
                />
                <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.roleTitle, a && { color: Colors.primary }]}>{ROLE_LABELS[role]}</Text>
                    <View style={[styles.dotTag, { backgroundColor: colors.bg }]}>
                      <View style={[styles.dot, { backgroundColor: colors.fg }]} />
                    </View>
                  </View>
                  <Text style={styles.roleDesc} numberOfLines={2}>{ROLE_DESCRIPTIONS[role]}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.fieldLabel}>حالة الحساب</Text>
        <View style={{ flexDirection: 'row-reverse', gap: Spacing.sm }}>
          {(['pending', 'approved', 'rejected'] as UserStatus[]).map((s) => {
            const a = form.status === s;
            const sc = STATUS_COLORS[s];
            return (
              <Pressable
                key={s}
                onPress={() => setForm((p) => ({ ...p, status: s }))}
                style={({ pressed }) => [
                  styles.statusChip,
                  { backgroundColor: a ? sc.fg : sc.bg },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text style={[styles.statusChipText, { color: a ? Colors.white : sc.fg }]}>
                  {STATUS_LABELS[s]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={() => setForm((p) => ({ ...p, active: !p.active }))} style={styles.checkRow}>
          <View style={[styles.check, form.active && styles.checkActive]}>
            {form.active ? <MaterialCommunityIcons name="check" size={14} color={Colors.white} /> : null}
          </View>
          <Text style={styles.checkText}>الحساب نشط</Text>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.filterChip, active && styles.filterChipActive, pressed && { opacity: 0.85 }]}
    >
      <Text style={[styles.filterChipText, active && { color: Colors.white }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerBtn: { backgroundColor: Colors.primary, width: 40, height: 40, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  ownerCard: {
    flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: Colors.surface,
    margin: Spacing.lg, marginBottom: 0, padding: Spacing.lg, borderRadius: Radius.lg,
    borderWidth: 2, borderColor: Colors.primarySoft, ...Shadow.sm,
  },
  tabsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { color: Colors.text, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  list: { padding: Spacing.lg, paddingTop: 0, gap: Spacing.md },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md,
    flexDirection: 'row-reverse', alignItems: 'flex-start', ...Shadow.sm,
  },
  actBtn: { width: 36, height: 36, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 48, height: 48, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  name: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  email: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
  tags: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  tagText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  meta: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 6 },
  pendingActions: { flexDirection: 'row-reverse', gap: Spacing.sm, marginTop: Spacing.sm },
  fieldLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, textAlign: 'right', marginTop: Spacing.sm },
  roleOption: { flexDirection: 'row-reverse', alignItems: 'center', padding: Spacing.md, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1.5, borderColor: 'transparent' },
  roleOptionActive: { backgroundColor: Colors.primaryTint, borderColor: Colors.primary },
  roleTitle: { color: Colors.text, fontWeight: FontWeight.bold, fontSize: FontSize.md },
  roleDesc: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2, textAlign: 'right' },
  dotTag: { width: 14, height: 14, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: Radius.full },
  statusChip: { flex: 1, paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: Radius.md, alignItems: 'center' },
  statusChipText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  checkRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: Spacing.lg },
  check: { width: 22, height: 22, borderRadius: Radius.sm, borderWidth: 2, borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkText: { color: Colors.text, fontSize: FontSize.sm },
});
