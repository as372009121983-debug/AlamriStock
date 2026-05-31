// Powered by OnSpace.AI
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { formatCurrency, formatDateTime, formatNumber, formatDate } from './format';
import {
  Sale,
  Purchase,
  SaleReturn,
  PurchaseReturn,
  Transfer,
  Settings,
  Product,
  Warehouse,
  StockEntry,
  Expense,
} from '@/constants/types';

const ARABIC_FONT_CSS = `
  @page { size: A4; margin: 16mm 12mm; }
  * { box-sizing: border-box; }
  html, body {
    direction: rtl;
    font-family: 'Tajawal', 'Cairo', 'Segoe UI', 'Tahoma', sans-serif;
    color: #0F172A;
    margin: 0;
    padding: 0;
    background: #ffffff;
  }
  .doc { padding: 16px; }
  .brand { display:flex; flex-direction:row-reverse; align-items:center; gap:12px; padding:12px 0; border-bottom: 3px solid #0D9488; }
  .brand-logo {
    width: 64px; height: 64px; border-radius: 16px;
    background: linear-gradient(135deg,#0F766E,#14B8A6);
    color:#fff; display:flex; align-items:center; justify-content:center;
    font-size: 28px; font-weight: 800;
  }
  .brand-info { flex: 1; }
  .brand-name { font-size: 22px; font-weight: 800; color:#0F766E; }
  .brand-sub { font-size: 12px; color:#475569; margin-top:2px; }
  h1.title { font-size: 18px; margin: 16px 0 8px; color:#0F172A; }
  .meta { display:flex; flex-wrap:wrap; gap:8px; margin: 8px 0; }
  .meta-item { background:#F0FDFA; border:1px solid #CCFBF1; padding:6px 10px; border-radius:8px; font-size:12px; color:#0F766E; }
  .meta-item b { color:#0F172A; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
  thead th {
    background: #0D9488; color: #fff; padding: 10px 8px; text-align: right; font-weight: 700;
    border: 1px solid #0D9488;
  }
  tbody td { padding: 8px; border: 1px solid #E2E8F0; text-align: right; }
  tbody tr:nth-child(even) { background: #F8FAFC; }
  .totals { margin-top: 12px; display:flex; justify-content: flex-start; }
  .totals-card { width: 280px; background:#F0FDFA; border:1px solid #99F6E4; border-radius: 10px; padding: 12px; }
  .totals-row { display:flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .totals-final {
    margin-top: 6px; padding-top: 8px; border-top: 2px dashed #0D9488;
    display:flex; justify-content: space-between; font-size: 16px; font-weight: 800; color:#0F766E;
  }
  .signs { margin-top: 32px; display:flex; justify-content: space-between; gap: 16px; }
  .sign-box { flex:1; text-align:center; font-size: 12px; color:#475569; }
  .sign-line { border-top: 1px solid #94A3B8; margin: 28px 16px 6px; }
  .footer { margin-top: 24px; text-align:center; color:#64748B; font-size: 11px; border-top:1px dashed #CBD5E1; padding-top: 8px; }
  .pill { display:inline-block; padding:2px 8px; border-radius:999px; font-size: 11px; }
  .pill-r { background: #FEE2E2; color:#B91C1C; }
  .num { white-space: nowrap; }
`;

function brandHeader(settings: Settings): string {
  const logoSrc = settings.logo
    ? `<img src="${settings.logo}" style="width:64px;height:64px;border-radius:16px;object-fit:cover;" />`
    : `<div class="brand-logo">A</div>`;
  return `
    <div class="brand">
      ${logoSrc}
      <div class="brand-info">
        <div class="brand-name">${escapeHtml(settings.companyName || 'الأمري')}</div>
        <div class="brand-sub">${escapeHtml(settings.appTitle || 'نظام الأمري للمخازن')}</div>
        ${settings.phone ? `<div class="brand-sub">هاتف: ${escapeHtml(settings.phone)}</div>` : ''}
        ${settings.address ? `<div class="brand-sub">${escapeHtml(settings.address)}</div>` : ''}
        ${settings.taxNumber ? `<div class="brand-sub">رقم ضريبي: ${escapeHtml(settings.taxNumber)}</div>` : ''}
      </div>
    </div>
  `;
}

function brandFooter(settings: Settings): string {
  const owner = settings.ownerName || 'عبدالرحمن سلامة';
  const note = settings.invoiceFooter || 'شكراً لتعاملكم معنا';
  return `
    <div class="footer">
      <div>${escapeHtml(note)}</div>
      <div style="margin-top:4px">تطوير وملكية: ${escapeHtml(owner)}</div>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pageWrap(body: string): string {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>${ARABIC_FONT_CSS}</style>
      </head>
      <body>
        <div class="doc">${body}</div>
      </body>
    </html>
  `;
}

function metaItems(items: { label: string; value: string }[]): string {
  return `<div class="meta">${items
    .map((i) => `<div class="meta-item">${escapeHtml(i.label)}: <b>${escapeHtml(i.value)}</b></div>`)
    .join('')}</div>`;
}

function totalsCard(rows: { label: string; value: string; bold?: boolean }[], finalRow?: { label: string; value: string }): string {
  return `
    <div class="totals">
      <div class="totals-card">
        ${rows.map((r) => `<div class="totals-row"><span>${escapeHtml(r.label)}</span><span class="num">${escapeHtml(r.value)}</span></div>`).join('')}
        ${finalRow ? `<div class="totals-final"><span>${escapeHtml(finalRow.label)}</span><span class="num">${escapeHtml(finalRow.value)}</span></div>` : ''}
      </div>
    </div>
  `;
}

function signBlocks(): string {
  return `
    <div class="signs">
      <div class="sign-box"><div class="sign-line"></div>توقيع المستلم</div>
      <div class="sign-box"><div class="sign-line"></div>توقيع البائع</div>
    </div>
  `;
}

// ========== Sale Invoice ==========
export function buildSaleInvoiceHtml(sale: Sale, settings: Settings): string {
  const rows = sale.items
    .map(
      (it, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${escapeHtml(it.name)}</td>
          <td class="num">${formatNumber(it.quantity)}</td>
          <td>${escapeHtml(it.priceLabel || 'قطاعي')}</td>
          <td class="num">${formatCurrency(it.price, settings.currency)}</td>
          <td class="num">${formatCurrency(it.price * it.quantity, settings.currency)}</td>
        </tr>
      `
    )
    .join('');
  const remaining = Math.max(0, sale.total - (sale.paid || sale.total));
  const body = `
    ${brandHeader(settings)}
    <h1 class="title">فاتورة بيع ${sale.hasReturn ? '<span class="pill pill-r">يحتوي مرتجع</span>' : ''}</h1>
    ${metaItems([
      { label: 'رقم الفاتورة', value: `#${sale.invoiceNo}` },
      { label: 'التاريخ', value: formatDateTime(sale.date) },
      { label: 'العميل', value: sale.customerName || 'عميل نقدي' },
      { label: 'المخزن/المعرض', value: sale.warehouseName || '—' },
      { label: 'البائع', value: sale.userName || '—' },
    ])}
    <table>
      <thead>
        <tr><th>#</th><th>المنتج</th><th>الكمية</th><th>نوع السعر</th><th>السعر</th><th>الإجمالي</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${totalsCard(
      [
        { label: 'المجموع', value: formatCurrency(sale.subtotal, settings.currency) },
        { label: 'الخصم', value: `- ${formatCurrency(sale.discount, settings.currency)}` },
        { label: 'المدفوع', value: formatCurrency(sale.paid || sale.total, settings.currency) },
        { label: 'المتبقي', value: formatCurrency(remaining, settings.currency) },
      ],
      { label: 'الإجمالي المستحق', value: formatCurrency(sale.total, settings.currency) }
    )}
    ${signBlocks()}
    ${brandFooter(settings)}
  `;
  return pageWrap(body);
}

// ========== Purchase Invoice ==========
export function buildPurchaseInvoiceHtml(purchase: Purchase, settings: Settings): string {
  const rows = purchase.items
    .map(
      (it, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${escapeHtml(it.name)}</td>
          <td class="num">${formatNumber(it.quantity)}</td>
          <td class="num">${formatCurrency(it.price, settings.currency)}</td>
          <td class="num">${formatCurrency(it.price * it.quantity, settings.currency)}</td>
        </tr>
      `
    )
    .join('');
  const body = `
    ${brandHeader(settings)}
    <h1 class="title">فاتورة شراء</h1>
    ${metaItems([
      { label: 'رقم العملية', value: `#${purchase.purchaseNo || ''}` },
      { label: 'التاريخ', value: formatDateTime(purchase.date) },
      { label: 'المورد', value: purchase.supplierName },
      { label: 'المخزن', value: purchase.warehouseName || '—' },
      { label: 'المستخدم', value: purchase.userName || '—' },
    ])}
    <table>
      <thead><tr><th>#</th><th>المنتج</th><th>الكمية</th><th>سعر الشراء</th><th>الإجمالي</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${totalsCard([], { label: 'إجمالي الشراء', value: formatCurrency(purchase.total, settings.currency) })}
    ${signBlocks()}
    ${brandFooter(settings)}
  `;
  return pageWrap(body);
}

// ========== Sale Return ==========
export function buildSaleReturnHtml(ret: SaleReturn, settings: Settings): string {
  const rows = ret.items
    .map(
      (it, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${escapeHtml(it.name)}</td>
          <td class="num">${formatNumber(it.quantity)}</td>
          <td class="num">${formatCurrency(it.price, settings.currency)}</td>
          <td class="num">${formatCurrency(it.price * it.quantity, settings.currency)}</td>
        </tr>
      `
    )
    .join('');
  const body = `
    ${brandHeader(settings)}
    <h1 class="title">مرتجع بيع</h1>
    ${metaItems([
      { label: 'رقم المرتجع', value: `#${ret.returnNo}` },
      { label: 'فاتورة البيع', value: ret.invoiceNo ? `#${ret.invoiceNo}` : '—' },
      { label: 'التاريخ', value: formatDateTime(ret.date) },
      { label: 'العميل', value: ret.customerName },
      { label: 'المخزن', value: ret.warehouseName },
      { label: 'السبب', value: ret.reason || '—' },
    ])}
    <table>
      <thead><tr><th>#</th><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${totalsCard([], { label: 'إجمالي المرتجع', value: formatCurrency(ret.total, settings.currency) })}
    ${signBlocks()}
    ${brandFooter(settings)}
  `;
  return pageWrap(body);
}

// ========== Purchase Return ==========
export function buildPurchaseReturnHtml(ret: PurchaseReturn, settings: Settings): string {
  const rows = ret.items
    .map(
      (it, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${escapeHtml(it.name)}</td>
          <td class="num">${formatNumber(it.quantity)}</td>
          <td class="num">${formatCurrency(it.price, settings.currency)}</td>
          <td class="num">${formatCurrency(it.price * it.quantity, settings.currency)}</td>
        </tr>
      `
    )
    .join('');
  const body = `
    ${brandHeader(settings)}
    <h1 class="title">مرتجع شراء</h1>
    ${metaItems([
      { label: 'رقم المرتجع', value: `#${ret.returnNo}` },
      { label: 'التاريخ', value: formatDateTime(ret.date) },
      { label: 'المورد', value: ret.supplierName },
      { label: 'المخزن', value: ret.warehouseName },
      { label: 'السبب', value: ret.reason || '—' },
    ])}
    <table>
      <thead><tr><th>#</th><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${totalsCard([], { label: 'إجمالي المرتجع', value: formatCurrency(ret.total, settings.currency) })}
    ${signBlocks()}
    ${brandFooter(settings)}
  `;
  return pageWrap(body);
}

// ========== Transfer ==========
export function buildTransferHtml(t: Transfer, settings: Settings): string {
  const rows = t.items
    .map(
      (it, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${escapeHtml(it.name)}</td>
          <td class="num">${formatNumber(it.quantity)}</td>
        </tr>
      `
    )
    .join('');
  const body = `
    ${brandHeader(settings)}
    <h1 class="title">إذن تحويل بضاعة</h1>
    ${metaItems([
      { label: 'رقم التحويل', value: `#${t.transferNo}` },
      { label: 'التاريخ', value: formatDateTime(t.date) },
      { label: 'من', value: t.fromWarehouseName },
      { label: 'إلى', value: t.toWarehouseName },
      { label: 'المستخدم', value: t.userName || '—' },
    ])}
    <table>
      <thead><tr><th>#</th><th>المنتج</th><th>الكمية</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${t.notes ? `<p style="margin-top:8px;color:#475569;">ملاحظات: ${escapeHtml(t.notes)}</p>` : ''}
    ${signBlocks()}
    ${brandFooter(settings)}
  `;
  return pageWrap(body);
}

// ========== Inventory Print ==========
export function buildInventoryHtml(
  products: Product[],
  stocks: StockEntry[],
  warehouses: Warehouse[],
  warehouseFilter: string | null,
  settings: Settings
): string {
  const filteredWarehouses = warehouseFilter ? warehouses.filter((w) => w.id === warehouseFilter) : warehouses;
  const rows = products.flatMap((p) => {
    return filteredWarehouses
      .map((w) => {
        const entry = stocks.find((s) => s.productId === p.id && s.warehouseId === w.id);
        const qty = entry?.quantity || 0;
        if (warehouseFilter && qty === 0) return null;
        const value = qty * p.purchasePrice;
        return `
          <tr>
            <td>${escapeHtml(p.name)}</td>
            <td>${escapeHtml(p.barcode || '—')}</td>
            <td>${escapeHtml(w.name)}</td>
            <td>${escapeHtml(w.type === 'main' ? 'مخزن رئيسي' : 'معرض')}</td>
            <td class="num">${formatNumber(qty)}</td>
            <td class="num">${formatCurrency(p.purchasePrice, settings.currency)}</td>
            <td class="num">${formatCurrency(value, settings.currency)}</td>
          </tr>
        `;
      })
      .filter(Boolean);
  }).join('');
  const total = products.reduce((sum, p) => {
    return sum + filteredWarehouses.reduce((s2, w) => {
      const entry = stocks.find((st) => st.productId === p.id && st.warehouseId === w.id);
      return s2 + (entry?.quantity || 0) * p.purchasePrice;
    }, 0);
  }, 0);
  const totalQty = products.reduce((sum, p) => {
    return sum + filteredWarehouses.reduce((s2, w) => {
      const entry = stocks.find((st) => st.productId === p.id && st.warehouseId === w.id);
      return s2 + (entry?.quantity || 0);
    }, 0);
  }, 0);
  const target = warehouseFilter ? warehouses.find((w) => w.id === warehouseFilter)?.name : 'كل المواقع';
  const body = `
    ${brandHeader(settings)}
    <h1 class="title">بيان جرد المخزون</h1>
    ${metaItems([
      { label: 'النطاق', value: target || '' },
      { label: 'تاريخ الطباعة', value: formatDateTime(Date.now()) },
      { label: 'عدد الأصناف', value: formatNumber(products.length) },
    ])}
    <table>
      <thead>
        <tr><th>المنتج</th><th>الباركود</th><th>الموقع</th><th>النوع</th><th>الكمية</th><th>سعر الشراء</th><th>قيمة المخزون</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${totalsCard(
      [{ label: 'إجمالي القطع', value: formatNumber(totalQty) }],
      { label: 'قيمة المخزون', value: formatCurrency(total, settings.currency) }
    )}
    ${brandFooter(settings)}
  `;
  return pageWrap(body);
}

// ========== Generic Report ==========
export type ReportTable = {
  title: string;
  meta: { label: string; value: string }[];
  columns: string[];
  rows: string[][];
  totals?: { label: string; value: string }[];
  finalRow?: { label: string; value: string };
};

export function buildReportHtml(report: ReportTable, settings: Settings): string {
  const tbody = report.rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(String(c))}</td>`).join('')}</tr>`)
    .join('');
  const body = `
    ${brandHeader(settings)}
    <h1 class="title">${escapeHtml(report.title)}</h1>
    ${metaItems(report.meta)}
    <table>
      <thead><tr>${report.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>
      <tbody>${tbody}</tbody>
    </table>
    ${report.totals || report.finalRow ? totalsCard(report.totals || [], report.finalRow) : ''}
    ${brandFooter(settings)}
  `;
  return pageWrap(body);
}

// ========== Daily Journal ==========
export function buildJournalHtml(
  data: {
    sales: { invoiceNo: number; customer: string; user: string; total: number; itemCount: number; date: number }[];
    totalSales: number;
    totalProfit: number;
    invoicesCount: number;
    soldItems: number;
    expenses: { category: string; amount: number; user: string; notes: string }[];
    totalExpenses: number;
    fromDate: number | null;
    toDate: number | null;
  },
  settings: Settings
): string {
  const salesRows = data.sales
    .map(
      (s, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>#${s.invoiceNo}</td>
          <td>${escapeHtml(s.customer)}</td>
          <td>${escapeHtml(s.user)}</td>
          <td class="num">${formatNumber(s.itemCount)}</td>
          <td class="num">${formatCurrency(s.total, settings.currency)}</td>
          <td>${formatDateTime(s.date)}</td>
        </tr>
      `
    )
    .join('');
  const expensesRows = data.expenses
    .map(
      (e, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(e.category)}</td>
          <td>${escapeHtml(e.user)}</td>
          <td>${escapeHtml(e.notes || '—')}</td>
          <td class="num">${formatCurrency(e.amount, settings.currency)}</td>
        </tr>
      `
    )
    .join('');
  const periodLabel = data.fromDate && data.toDate
    ? `${formatDate(data.fromDate)} → ${formatDate(data.toDate)}`
    : data.fromDate
      ? formatDate(data.fromDate)
      : 'كل التواريخ';
  const body = `
    ${brandHeader(settings)}
    <h1 class="title">يومية النشاط</h1>
    ${metaItems([
      { label: 'الفترة', value: periodLabel },
      { label: 'تاريخ الطباعة', value: formatDateTime(Date.now()) },
    ])}
    <h1 class="title" style="font-size:14px;">المبيعات</h1>
    <table>
      <thead><tr><th>#</th><th>الفاتورة</th><th>العميل</th><th>المستخدم</th><th>الأصناف</th><th>الإجمالي</th><th>التاريخ</th></tr></thead>
      <tbody>${salesRows || '<tr><td colspan="7">لا توجد مبيعات</td></tr>'}</tbody>
    </table>
    ${data.expenses.length ? `
      <h1 class="title" style="font-size:14px;margin-top:16px;">المصروفات</h1>
      <table>
        <thead><tr><th>#</th><th>التصنيف</th><th>المستخدم</th><th>ملاحظات</th><th>المبلغ</th></tr></thead>
        <tbody>${expensesRows}</tbody>
      </table>
    ` : ''}
    ${totalsCard(
      [
        { label: 'عدد الفواتير', value: formatNumber(data.invoicesCount) },
        { label: 'الأصناف المباعة', value: formatNumber(data.soldItems) },
        { label: 'إجمالي المبيعات', value: formatCurrency(data.totalSales, settings.currency) },
        { label: 'إجمالي المصروفات', value: formatCurrency(data.totalExpenses, settings.currency) },
      ],
      { label: 'صافي الربح', value: formatCurrency(data.totalProfit - data.totalExpenses, settings.currency) }
    )}
    ${brandFooter(settings)}
  `;
  return pageWrap(body);
}

// ========== Print actions ==========
export type PrintAction = 'print' | 'pdf' | 'preview';

export async function performPrint(html: string, fileName: string, action: PrintAction): Promise<void> {
  if (action === 'pdf') {
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    if (Platform.OS === 'web') {
      // Open PDF in new tab
      // @ts-ignore
      if (typeof window !== 'undefined') window.open(uri, '_blank');
      return;
    }
    const safeName = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const target = `${FileSystem.documentDirectory}${safeName}.pdf`;
    try {
      await FileSystem.copyAsync({ from: uri, to: target });
    } catch {
      // ignore copy errors
    }
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: fileName });
    }
    return;
  }
  // print or preview both invoke Print.printAsync (shows preview before print)
  await Print.printAsync({ html });
}

// ========== CSV Export ==========
export async function exportCsv(rows: string[][], fileName: string): Promise<void> {
  const csv = '\uFEFF' + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  if (Platform.OS === 'web') {
    // @ts-ignore
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      // @ts-ignore
      const url = URL.createObjectURL(blob);
      // @ts-ignore
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.csv`;
      a.click();
      // @ts-ignore
      URL.revokeObjectURL(url);
    }
    return;
  }
  const safeName = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const path = `${FileSystem.documentDirectory}${safeName}.csv`;
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: fileName });
  }
}
