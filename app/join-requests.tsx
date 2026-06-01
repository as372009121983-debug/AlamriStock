// Powered by OnSpace.AI
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { AppUser, ROLE_COLORS, ROLE_LABELS, STATUS_COLORS, STATUS_LABELS } from '@/constants/types';
import { formatDateTime } from '@/services/format';

export default function JoinRequestsScreen() {
  const { users, approveUser, rejectUser, deleteUser, isOwner } = useAuth();
  const { showAlert } = useAlert();
  const [busy, setBusy] = useState<string | null>(null);

  const pendingUsers = useMemo(() => users.filter((u) => u.status === 'pending'), [users]);
  const rejectedUsers = useMemo(() => users.filter((u) => u.status === 'rejected'), [users]);

  if (!isOwner) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="طلبات الانضمام" />
        <EmptyState icon="lock" title="غير مسموح" description="هذه الصفحة للمالك فقط" />
      </SafeAreaView>
    );
  }

  async function handleApprove(u: AppUser) {
    setBusy(u.id);
    const res = await approveUser(u.id);
    setBusy(null);
    if (!res.ok) showAlert('خطأ', res.message || '');
    else showAlert('تم القبول', `تم قبول ${u.name}. يمكنه الآن الدخول واستخدام النظام`);
  }

  async function handleReject(u: AppUser) {
    showAlert('رفض الطلب', `هل تريد رفض طلب ${u.name}؟`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'رفض',
        style: 'destructive',
        onPress: async () => {
          setBusy(u.id);
          const res = await rejectUser(u.id);
          setBusy(null);
          if (!res.ok) showAlert('خطأ', res.message || '');
        },
      },
    ]);
  }

  async function handleDelete(u: AppUser) {
    showAlert('حذف الطلب', `سيتم حذف طلب ${u.name} نهائياً`, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          const res = await deleteUser(u.id);
          if (!res.ok) showAlert('خطأ', res.message || '');
        },
      },
    ]);
  }

  function renderRequest(u: AppUser, isPending: boolean) {
    const roleColors = ROLE_COLORS[u.role];
    const statusColors = STATUS_COLORS[u.status];
    return (
      <View key={u.id} style={[styles.card, isPending && { borderColor: Colors.warning, borderWidth: 1.5 }]}>
        <View style={styles.cardTop}>
          <View style={[styles.avatar, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.avatarText, { color: statusColors.fg }]}>
              {(u.name || '?').slice(0, 1)}
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
            <Text style={styles.name}>{u.name}</Text>
            <Text style={styles.email}>{u.email}</Text>
            <View style={styles.tags}>
              <View style={[styles.tag, { backgroundColor: roleColors.bg }]}>
                <Text style={[styles.tagText, { color: roleColors.fg }]}>{ROLE_LABELS[u.role]}</Text>
              </View>
              <View style={[styles.tag, { backgroundColor: statusColors.bg }]}>
                <Text style={[styles.tagText, { color: statusColors.fg }]}>{STATUS_LABELS[u.status]}</Text>
              </View>
            </View>
            <Text style={styles.meta}>تاريخ الطلب: {formatDateTime(u.createdAt)}</Text>
          </View>
        </View>
        <View style={styles.actionsRow}>
          {isPending ? (
            <>
              <Button
                title="قبول"
                icon="check-circle"
                onPress={() => handleApprove(u)}
                loading={busy === u.id}
                style={{ flex: 1 }}
              />
              <Button
                title="رفض"
                icon="close-circle"
                variant="danger"
                onPress={() => handleReject(u)}
                disabled={busy === u.id}
                style={{ flex: 1 }}
              />
            </>
          ) : (
            <>
              <Button
                title="إعادة قبول"
                icon="refresh"
                onPress={() => handleApprove(u)}
                loading={busy === u.id}
                style={{ flex: 1 }}
              />
              <Button
                title="حذف"
                icon="trash-can-outline"
                variant="danger"
                onPress={() => handleDelete(u)}
                style={{ flex: 1 }}
              />
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="طلبات الانضمام"
        subtitle={`${pendingUsers.length} طلب جديد • ${rejectedUsers.length} مرفوض`}
      />
      <FlatList
        data={[]}
        keyExtractor={() => 'empty'}
        renderItem={() => null}
        ListHeaderComponent={
          <View style={{ padding: Spacing.lg, gap: Spacing.md }}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <MaterialCommunityIcons name="account-clock" size={28} color={Colors.warning} />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
                <Text style={styles.summaryTitle}>طلبات بانتظار المراجعة</Text>
                <Text style={styles.summaryValue}>{pendingUsers.length}</Text>
                <Text style={styles.summarySub}>راجعها واتخذ القرار المناسب</Text>
              </View>
            </View>

            {pendingUsers.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>طلبات جديدة</Text>
                {pendingUsers.map((u) => renderRequest(u, true))}
              </>
            ) : null}

            {rejectedUsers.length > 0 ? (
              <>
                <Text style={[styles.sectionTitle, { marginTop: Spacing.lg }]}>مرفوضة سابقاً</Text>
                {rejectedUsers.map((u) => renderRequest(u, false))}
              </>
            ) : null}

            {pendingUsers.length === 0 && rejectedUsers.length === 0 ? (
              <EmptyState
                icon="account-check-outline"
                title="لا توجد طلبات"
                description="جميع المستخدمين مقبولون. ستظهر هنا أي طلبات انضمام جديدة"
              />
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  summaryCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: Colors.warningSoft,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.warning,
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: { color: Colors.warning, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  summaryValue: { color: Colors.warning, fontSize: FontSize.display, fontWeight: FontWeight.bold, marginTop: 2 },
  summarySub: { color: Colors.warning, fontSize: FontSize.xs, opacity: 0.8 },
  sectionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, textAlign: 'right' },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
    gap: Spacing.md,
  },
  cardTop: { flexDirection: 'row-reverse', alignItems: 'flex-start' },
  avatar: { width: 48, height: 48, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  name: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  email: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
  tags: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  tagText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  meta: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 6 },
  actionsRow: { flexDirection: 'row-reverse', gap: Spacing.md },
});
