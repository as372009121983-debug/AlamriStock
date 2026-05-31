// Powered by OnSpace.AI
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/hooks/useStore';
import { Header } from '@/components/ui/Header';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { formatCurrency, formatDateTime, formatNumber } from '@/services/format';

export default function CustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { customers, sales, settings } = useStore();
  const customer = customers.find((c) => c.id === id);

  const customerSales = useMemo(
    () => (customer ? sales.filter((s) => s.customerId === customer.id) : []),
    [sales, customer]
  );

  const totals = useMemo(() => {
    const total = customerSales.reduce((s, sa) => s + sa.total, 0);
    return { total, count: customerSales.length };
  }, [customerSales]);

  if (!customer) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="عميل" />
        <EmptyState icon="account-question-outline" title="عميل غير موجود" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={customer.name} subtitle="ملف العميل" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{customer.name.slice(0, 2)}</Text>
          </View>
          <Text style={styles.name}>{customer.name}</Text>
          {customer.phone ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{customer.phone}</Text>
              <MaterialCommunityIcons name="phone-outline" size={16} color={Colors.textMuted} />
            </View>
          ) : null}
          {customer.address ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{customer.address}</Text>
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={16}
                color={Colors.textMuted}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatNumber(totals.count)}</Text>
            <Text style={styles.statLabel}>عدد المشتريات</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: Colors.primary }]}>
              {formatCurrency(totals.total, settings.currency)}
            </Text>
            <Text style={styles.statLabel}>إجمالي المشتريات</Text>
          </View>
          <View style={styles.stat}>
            <Text
              style={[
                styles.statValue,
                { color: customer.debt > 0 ? Colors.danger : Colors.success },
              ]}
            >
              {formatCurrency(customer.debt, settings.currency)}
            </Text>
            <Text style={styles.statLabel}>المديونية</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>سجل المشتريات</Text>

        {customerSales.length === 0 ? (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="cart-outline" size={28} color={Colors.textMuted} />
            <Text style={styles.emptyText}>لا توجد مشتريات لهذا العميل</Text>
          </View>
        ) : (
          customerSales.map((s) => (
            <View key={s.id} style={styles.saleRow}>
              <Text style={styles.saleAmount}>
                {formatCurrency(s.total, settings.currency)}
              </Text>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.saleNo}>فاتورة #{s.invoiceNo}</Text>
                <Text style={styles.saleDate}>{formatDateTime(s.date)}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxxl },
  profile: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: { color: Colors.white, fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  name: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  metaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 6 },
  metaText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  statsRow: { flexDirection: 'row-reverse', gap: Spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'right',
    marginTop: Spacing.md,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  saleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'space-between',
  },
  saleNo: { color: Colors.text, fontWeight: FontWeight.semibold, fontSize: FontSize.md },
  saleDate: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  saleAmount: { color: Colors.primary, fontWeight: FontWeight.bold, fontSize: FontSize.md },
});
