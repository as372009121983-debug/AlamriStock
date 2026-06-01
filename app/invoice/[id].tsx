// Powered by OnSpace.AI
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/template';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { Header } from '@/components/ui/Header';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PrintMenu } from '@/components/ui/PrintMenu';
import { AppLogo } from '@/components/ui/AppLogo';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import { formatCurrency, formatDateTime, formatNumber } from '@/services/format';
import { buildSaleInvoiceHtml, performPrint, PrintAction } from '@/services/print';

export default function InvoiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { sales, settings, deleteSale } = useStore();
  const { canEdit } = useAuth();
  const { showAlert } = useAlert();
  const { guard } = useAdminGuard();
  const sale = sales.find((s) => s.id === id);
  const [printMenuVisible, setPrintMenuVisible] = useState(false);

  if (!sale) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header title="فاتورة" />
        <EmptyState icon="receipt" title="فاتورة غير موجودة" description="ربما تم حذفها" />
      </SafeAreaView>
    );
  }

  function handleDelete() {
    if (!sale) return;
    guard({
      title: 'حذف الفاتورة',
      description: `أدخل كلمة مرور المدير لحذف الفاتورة #${sale.invoiceNo}. سيتم استرجاع الكميات للمخزون.`,
      action: () => {
        deleteSale(sale.id);
        router.back();
      },
    });
  }

  async function handlePrint(action: PrintAction) {
    if (!sale) return;
    try {
      const html = buildSaleInvoiceHtml(sale, settings);
      await performPrint(html, `invoice-${sale.invoiceNo}`, action);
    } catch (e) {
      showAlert('خطأ', 'تعذر تنفيذ الطباعة');
    }
  }

  function handleReturn() {
    if (!sale) return;
    router.push({
      pathname: '/returns',
      params: { saleId: sale.id, action: 'new' },
    } as any);
  }

  const remaining = Math.max(0, sale.total - (sale.paid || sale.total));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title={`فاتورة #${sale.invoiceNo}`} subtitle={formatDateTime(sale.date)} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.invoice}>
          <View style={styles.brandWrap}>
            <AppLogo size={64} />
            <Text style={styles.brand}>{settings.companyName}</Text>
            <Text style={styles.brandTitle}>{settings.appTitle}</Text>
            {settings.phone ? <Text style={styles.brandSub}>{settings.phone}</Text> : null}
            {settings.address ? <Text style={styles.brandSub}>{settings.address}</Text> : null}
          </View>

          {sale.hasReturn ? (
            <View style={styles.returnBanner}>
              <MaterialCommunityIcons name="alert-circle" size={16} color={Colors.danger} />
              <Text style={styles.returnBannerText}>تحتوي هذه الفاتورة على مرتجعات</Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>رقم الفاتورة</Text>
              <Text style={styles.metaValue}>#{sale.invoiceNo}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>التاريخ</Text>
              <Text style={styles.metaValue}>{formatDateTime(sale.date)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>العميل</Text>
              <Text style={styles.metaValue}>{sale.customerName}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>المخزن/المعرض</Text>
              <Text style={styles.metaValue}>{sale.warehouseName || '—'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>البائع</Text>
              <Text style={styles.metaValue}>{sale.userName || '—'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1, textAlign: 'left' }]}>الإجمالي</Text>
            <Text style={[styles.th, { width: 60 }]}>الكمية</Text>
            <Text style={[styles.th, { width: 70 }]}>السعر</Text>
            <Text style={[styles.th, { flex: 1.5, textAlign: 'right' }]}>المنتج</Text>
          </View>

          {sale.items.map((it, idx) => (
            <View
              key={idx}
              style={[
                styles.tableRow,
                idx % 2 === 0 && { backgroundColor: Colors.surfaceAlt },
              ]}
            >
              <Text
                style={[styles.td, { flex: 1, textAlign: 'left', fontWeight: '700', color: Colors.primary }]}
              >
                {formatCurrency(it.price * it.quantity, settings.currency)}
              </Text>
              <Text style={[styles.td, { width: 60 }]}>×{formatNumber(it.quantity)}</Text>
              <Text style={[styles.td, { width: 70 }]}>{formatCurrency(it.price, settings.currency)}</Text>
              <View style={{ flex: 1.5 }}>
                <Text style={[styles.td, { textAlign: 'right' }]} numberOfLines={2}>
                  {it.name}
                </Text>
                {it.priceLabel ? <Text style={styles.priceTier}>{it.priceLabel}</Text> : null}
              </View>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>
              {formatCurrency(sale.subtotal, settings.currency)}
            </Text>
            <Text style={styles.summaryLabel}>المجموع</Text>
          </View>
          {sale.discount > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryValue, { color: Colors.danger }]}>
                - {formatCurrency(sale.discount, settings.currency)}
              </Text>
              <Text style={styles.summaryLabel}>الخصم</Text>
            </View>
          ) : null}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryValue}>
              {formatCurrency(sale.paid || sale.total, settings.currency)}
            </Text>
            <Text style={styles.summaryLabel}>المدفوع</Text>
          </View>
          {remaining > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryValue, { color: Colors.danger }]}>
                {formatCurrency(remaining, settings.currency)}
              </Text>
              <Text style={styles.summaryLabel}>المتبقي</Text>
            </View>
          ) : null}

          <View style={styles.totalBlock}>
            <Text style={styles.totalValue}>
              {formatCurrency(sale.total, settings.currency)}
            </Text>
            <Text style={styles.totalLabel}>الإجمالي المستحق</Text>
          </View>

          <View style={styles.signRow}>
            <View style={styles.signBox}>
              <View style={styles.signLine} />
              <Text style={styles.signLabel}>توقيع المستلم</Text>
            </View>
            <View style={styles.signBox}>
              <View style={styles.signLine} />
              <Text style={styles.signLabel}>توقيع البائع</Text>
            </View>
          </View>

          <Text style={styles.thanks}>{settings.invoiceFooter}</Text>
          <Text style={styles.developer}>تطوير وملكية: {settings.ownerName}</Text>
        </View>

        <View style={styles.actions}>
          <Button
            title="طباعة"
            icon="printer"
            onPress={() => setPrintMenuVisible(true)}
            variant="primary"
            style={{ flex: 1 }}
          />
          {canEdit ? (
            <>
              <Button
                title="مرتجع"
                icon="undo-variant"
                onPress={handleReturn}
                variant="outline"
                style={{ flex: 1 }}
              />
              <Button
                title="حذف"
                icon="trash-can-outline"
                onPress={handleDelete}
                variant="danger"
                style={{ flex: 1 }}
              />
            </>
          ) : null}
        </View>
      </ScrollView>

      <PrintMenu
        visible={printMenuVisible}
        onClose={() => setPrintMenuVisible(false)}
        onAction={handlePrint}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxxl },
  invoice: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  brandWrap: { alignItems: 'center', gap: 4, paddingVertical: Spacing.sm },
  logo: {
    width: 64, height: 64, borderRadius: Radius.full,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  brand: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text, marginTop: 8 },
  brandTitle: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
  brandSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  returnBanner: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    backgroundColor: Colors.dangerSoft, padding: Spacing.sm, borderRadius: Radius.md, marginTop: Spacing.md,
  },
  returnBannerText: { color: Colors.danger, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  metaGrid: { gap: 8 },
  metaItem: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  metaLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  metaValue: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  tableHeader: {
    flexDirection: 'row-reverse', backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
    borderRadius: Radius.sm, alignItems: 'center', gap: 4,
  },
  th: { color: Colors.white, fontWeight: FontWeight.semibold, fontSize: FontSize.xs },
  tableRow: {
    flexDirection: 'row-reverse', paddingHorizontal: Spacing.sm, paddingVertical: 8,
    alignItems: 'center', gap: 4, borderRadius: Radius.sm,
  },
  td: { color: Colors.text, fontSize: FontSize.sm },
  priceTier: { color: Colors.primary, fontSize: 10, marginTop: 2, textAlign: 'right' },
  summaryRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { color: Colors.textSecondary, fontSize: FontSize.md },
  summaryValue: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  totalBlock: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md,
  },
  totalLabel: { color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm },
  totalValue: { color: Colors.white, fontSize: FontSize.xxxl, fontWeight: FontWeight.bold },
  signRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: Spacing.xl, gap: Spacing.md },
  signBox: { flex: 1, alignItems: 'center' },
  signLine: { borderTopWidth: 1, borderTopColor: Colors.borderStrong, alignSelf: 'stretch', marginVertical: Spacing.lg },
  signLabel: { color: Colors.textSecondary, fontSize: FontSize.xs },
  thanks: { textAlign: 'center', color: Colors.textSecondary, marginTop: Spacing.lg, fontSize: FontSize.sm },
  developer: { textAlign: 'center', color: Colors.primary, marginTop: 4, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  actions: { flexDirection: 'row-reverse', gap: Spacing.md, flexWrap: 'wrap' },
});
