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
  CustomerPayment,
  WorkerPayment,
  Worker,
  WorkerAdvance,
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
  .totals-card { width: 320px; background:#F0FDFA; border:1px solid #99F6E4; border-radius: 10px; padding: 12px; }
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
  .pill-g { background: #D1FAE5; color:#065F46; }
  .num { white-space: nowrap; }
  .stat-grid { display:grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 12px; }
  .stat-card { background:#F8FAFC; border:1px solid #E2E8F0; border-radius:10px; padding:10px; }
  .stat-label { font-size: 11px; color:#64748B; }
  .stat-value { font-size: 18px; font-weight: 800; color:#0F172A; margin-top: 4px; }
  .pos { color: #059669; }
  .neg { color: #DC2626; }
  .totals-section-title { font-size: 14px; font-weight: 800; color:#0F766E; margin: 6px 0 4px; }
  .summary-block { background: linear-gradient(135deg,#0F766E,#14B8A6); color:#fff; padding: 14px; border-radius: 12px; margin-top: 12px; }
  .summary-block .lbl { font-size: 12px; opacity: 0.85; }
  .summary-block .val { font-size: 22px; font-weight: 800; margin-top: 4px; }
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

// ========== Inventory Print ==========
export function buildInventoryHtml(
  data: {
    rows: { name: string; barcode: string; qty: number; purchasePrice: number; salePrice: number; purchaseValue: number; saleValue: number }[];
    totalQty: number;
    totalPurchaseValue: number;
    totalSaleValue: number;
    fromDate: number | null;
    toDate: number | null;
  },
  settings: Settings
): string {
  const rows = data.rows.map((r) => `
    <tr>
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.barcode || '—')}</td>
      <td class="num">${formatNumber(r.qty)}</td>
      <td class="num">${formatCurrency(r.purchasePrice, settings.currency)}</td>
      <td class="num">${formatCurrency(r.purchaseValue, settings.currency)}</td>
      <td class="num">${formatCurrency(r.salePrice, settings.currency)}</td>
      <td class="num">${formatCurrency(r.saleValue, settings.currency)}</td>
    </tr>
  `).join('');
  const period = data.fromDate || data.toDate
    ? `${data.fromDate ? formatDate(data.fromDate) : '—'} → ${data.toDate ? formatDate(data.toDate) : '—'}`
    : 'الحالة الحالية';
  const body = `
    ${brandHeader(settings)}
    <h1 class="title">جرد المخزون</h1>
    ${metaItems([
      { label: 'الفترة', value: period },
      { label: 'تاريخ الطباعة', value: formatDateTime(Date.now()) },
      { label: 'عدد الأصناف', value: formatNumber(data.rows.length) },
    ])}
    <table>
      <thead>
        <tr>
          <th>المنتج</th>
          <th>الباركود</th>
          <th>الكمية</th>
          <th>سعر الشراء</th>
          <th>قيمة الشراء</th>
          <th>سعر البيع</th>
          <th>قيمة البيع</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${totalsCard(
      [
        { label: 'إجمالي القطع', value: formatNumber(data.totalQty) },
        { label: 'قيمة المخزون بسعر الشراء', value: formatCurrency(data.totalPurchaseValue, settings.currency) },
      ],
      { label: 'قيمة المخزون بسعر البيع', value: formatCurrency(data.totalSaleValue, settings.currency) }
    )}
    ${brandFooter(settings)}
  `;
  return pageWrap(body);
}

// ========== Profits Print ==========
export function buildProfitsHtml(
  data: {
    perInvoice: { invoiceNo: number; date: number; customer: string; total: number; cost: number; profit: number }[];
    perProduct: { name: string; qty: number; revenue: number; cost: number; profit: number }[];
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    fromDate: number | null;
    toDate: number | null;
  },
  settings: Settings
): string {
  const period = data.fromDate || data.toDate
    ? `${data.fromDate ? formatDate(data.fromDate) : '—'} → ${data.toDate ? formatDate(data.toDate) : '—'}`
    : 'كل الفترات';
  const invRows = data.perInvoice.slice(0, 200).map((i) => `
    <tr>
      <td>#${i.invoiceNo}</td>
      <td>${formatDate(i.date)}</td>
      <td>${escapeHtml(i.customer)}</td>
      <td class="num">${formatCurrency(i.total, settings.currency)}</td>
      <td class="num">${formatCurrency(i.cost, settings.currency)}</td>
      <td class="num pos">${formatCurrency(i.profit, settings.currency)}</td>
    </tr>
  `).join('');
  const prodRows = data.perProduct.slice(0, 200).map((p) => `
    <tr>
      <td>${escapeHtml(p.name)}</td>
      <td class="num">${formatNumber(p.qty)}</td>
      <td class="num">${formatCurrency(p.revenue, settings.currency)}</td>
      <td class="num">${formatCurrency(p.cost, settings.currency)}</td>
      <td class="num pos">${formatCurrency(p.profit, settings.currency)}</td>
    </tr>
  `).join('');
  const body = `
    ${brandHeader(settings)}
    <h1 class="title">تقرير الأرباح</h1>
    ${metaItems([
      { label: 'الفترة', value: period },
      { label: 'تاريخ الطباعة', value: formatDateTime(Date.now()) },
    ])}
    <div class="summary-block">
      <div class="lbl">إجمالي الربح خلال الفترة</div>
      <div class="val">${formatCurrency(data.totalProfit, settings.currency)}</div>
    </div>
    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">الإيرادات</div><div class="stat-value">${formatCurrency(data.totalRevenue, settings.currency)}</div></div>
      <div class="stat-card"><div class="stat-label">التكلفة</div><div class="stat-value">${formatCurrency(data.totalCost, settings.currency)}</div></div>
    </div>

    <h1 class="title" style="font-size:14px; margin-top:16px;">الأرباح حسب الفاتورة</h1>
    <table>
      <thead><tr><th>الفاتورة</th><th>التاريخ</th><th>العميل</th><th>الإجمالي</th><th>التكلفة</th><th>الربح</th></tr></thead>
      <tbody>${invRows || '<tr><td colspan="6">لا توجد فواتير</td></tr>'}</tbody>
    </table>

    <h1 class="title" style="font-size:14px; margin-top:16px;">الأرباح حسب المنتج</h1>
    <table>
      <thead><tr><th>المنتج</th><th>الكمية المباعة</th><th>الإيراد</th><th>التكلفة</th><th>الربح</th></tr></thead>
      <tbody>${prodRows || '<tr><td colspan="5">لا توجد بيانات</td></tr>'}</tbody>
    </table>
    ${brandFooter(settings)}
  `;
  return pageWrap(body);
}

// ========== Customer Payments Print ==========
export function buildCustomerPaymentsHtml(
  payments: CustomerPayment[],
  total: number,
  fromDate: number | null,
  toDate: number | null,
  settings: Settings
): string {
  const period = fromDate || toDate
    ? `${fromDate ? formatDate(fromDate) : '—'} → ${toDate ? formatDate(toDate) : '—'}`
    : 'كل الفترات';
  const rows = payments.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(p.customerName)}</td>
      <td class="num">${formatCurrency(p.amount, settings.currency)}</td>
      <td>${formatDateTime(p.date)}</td>
      <td>${escapeHtml(p.notes || '—')}</td>
      <td>${escapeHtml(p.userName)}</td>
    </tr>
  `).join('');
  const body = `
    ${brandHeader(settings)}
    <h1 class="title">سجل دفعات العملاء</h1>
    ${metaItems([
      { label: 'الفترة', value: period },
      { label: 'عدد الدفعات', value: formatNumber(payments.length) },
    ])}
    <table>
      <thead><tr><th>#</th><th>العميل</th><th>المبلغ</th><th>التاريخ</th><th>ملاحظات</th><th>المستخدم</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6">لا توجد دفعات</td></tr>'}</tbody>
    </table>
    ${totalsCard([], { label: 'إجمالي الدفعات', value: formatCurrency(total, settings.currency) })}
    ${brandFooter(settings)}
  `;
  return pageWrap(body);
}

// ========== Worker Payments Print ==========
export function buildWorkerPaymentsHtml(
  data: {
    workers: { worker: Worker; paid: number; remaining: number; payments: WorkerPayment[] }[];
    fromDate: number | null;
    toDate: number | null;
  },
  settings: Settings
): string {
  const period = data.fromDate || data.toDate
    ? `${data.fromDate ? formatDate(data.fromDate) : '—'} → ${data.toDate ? formatDate(data.toDate) : '—'}`
    : 'كل الفترات';
  const rows = data.workers.map((w) => `
    <tr>
      <td>${escapeHtml(w.worker.name)}</td>
      <td>${escapeHtml(w.worker.jobTitle || '—')}</td>
      <td class="num">${formatCurrency(w.worker.maxAllowed, settings.currency)}</td>
      <td class="num">${formatCurrency(w.paid, settings.currency)}</td>
      <td class="num pos">${formatCurrency(w.remaining, settings.currency)}</td>
    </tr>
  `).join('');
  const totalAllowed = data.workers.reduce((s, x) => s + x.worker.maxAllowed, 0);
  const totalPaid = data.workers.reduce((s, x) => s + x.paid, 0);
  const totalRemaining = data.workers.reduce((s, x) => s + Math.max(0, x.remaining), 0);
  const body = `
    ${brandHeader(settings)}
    <h1 class="title">قبض العمال</h1>
    ${metaItems([
      { label: 'الفترة', value: period },
      { label: 'عدد العمال', value: formatNumber(data.workers.length) },
    ])}
    <table>
      <thead><tr><th>الاسم</th><th>الوظيفة</th><th>الحد المسموح</th><th>المصروف</th><th>المتبقي</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5">لا توجد بيانات</td></tr>'}</tbody>
    </table>
    ${totalsCard(
      [
        { label: 'إجمالي الحدود', value: formatCurrency(totalAllowed, settings.currency) },
        { label: 'إجمالي المصروف', value: formatCurrency(totalPaid, settings.currency) },
      ],
      { label: 'إجمالي المتبقي', value: formatCurrency(totalRemaining, settings.currency) }
    )}
    ${brandFooter(settings)}
  `;
  return pageWrap(body);
}

// ========== Daily Journal (Income / Expenses / Net) ==========
export function buildJournalHtml(
  data: {
    salesPaid: { invoiceNo: number; customer: string; user: string; total: number; date: number }[];
    customerPayments: { customerName: string; amount: number; date: number; notes: string }[];
    expenses: { category: string; amount: number; user: string; notes: string; date: number }[];
    workerPayments: { workerName: string; amount: number; date: number; notes: string }[];
    saleReturns: { returnNo: number; total: number; date: number; customerName: string }[];
    totalSalesPaid: number;
    totalCustomerPayments: number;
    totalIncome: number;
    totalExpenses: number;
    totalWorkerPayments: number;
    totalOutflow: number;
    netCash: number;
    totalSaleReturns: number;
    fromDate: number | null;
    toDate: number | null;
  },
  settings: Settings
): string {
  const period = data.fromDate || data.toDate
    ? `${data.fromDate ? formatDate(data.fromDate) : '—'} → ${data.toDate ? formatDate(data.toDate) : '—'}`
    : 'كل الفترات';
  const salesRows = data.salesPaid.map((s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>#${s.invoiceNo}</td>
      <td>${escapeHtml(s.customer)}</td>
      <td>${escapeHtml(s.user)}</td>
      <td class="num pos">${formatCurrency(s.total, settings.currency)}</td>
      <td>${formatDateTime(s.date)}</td>
    </tr>
  `).join('');
  const cpRows = data.customerPayments.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(p.customerName)}</td>
      <td>${escapeHtml(p.notes || '—')}</td>
      <td class="num pos">${formatCurrency(p.amount, settings.currency)}</td>
      <td>${formatDateTime(p.date)}</td>
    </tr>
  `).join('');
  const expRows = data.expenses.map((e, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(e.category)}</td>
      <td>${escapeHtml(e.user)}</td>
      <td>${escapeHtml(e.notes || '—')}</td>
      <td class="num neg">${formatCurrency(e.amount, settings.currency)}</td>
      <td>${formatDateTime(e.date)}</td>
    </tr>
  `).join('');
  const wpRows = data.workerPayments.map((w, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(w.workerName)}</td>
      <td>${escapeHtml(w.notes || '—')}</td>
      <td class="num neg">${formatCurrency(w.amount, settings.currency)}</td>
      <td>${formatDateTime(w.date)}</td>
    </tr>
  `).join('');
  const retRows = data.saleReturns.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>#${r.returnNo}</td>
      <td>${escapeHtml(r.customerName)}</td>
      <td class="num neg">${formatCurrency(r.total, settings.currency)}</td>
      <td>${formatDateTime(r.date)}</td>
    </tr>
  `).join('');

  const body = `
    ${brandHeader(settings)}
    <h1 class="title">يومية النشاط - الوارد والمنصرف</h1>
    ${metaItems([
      { label: 'الفترة', value: period },
      { label: 'تاريخ الطباعة', value: formatDateTime(Date.now()) },
    ])}

    <div class="summary-block">
      <div class="lbl">صافي النقدية الفعلي</div>
      <div class="val">${formatCurrency(data.netCash, settings.currency)}</div>
    </div>

    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">إجمالي الوارد</div><div class="stat-value pos">${formatCurrency(data.totalIncome, settings.currency)}</div></div>
      <div class="stat-card"><div class="stat-label">إجمالي المنصرف</div><div class="stat-value neg">${formatCurrency(data.totalOutflow, settings.currency)}</div></div>
      <div class="stat-card"><div class="stat-label">المبيعات المدفوعة</div><div class="stat-value">${formatCurrency(data.totalSalesPaid, settings.currency)}</div></div>
      <div class="stat-card"><div class="stat-label">دفعات العملاء</div><div class="stat-value">${formatCurrency(data.totalCustomerPayments, settings.currency)}</div></div>
      <div class="stat-card"><div class="stat-label">المصروفات</div><div class="stat-value">${formatCurrency(data.totalExpenses, settings.currency)}</div></div>
      <div class="stat-card"><div class="stat-label">قبض العمال</div><div class="stat-value">${formatCurrency(data.totalWorkerPayments, settings.currency)}</div></div>
      <div class="stat-card"><div class="stat-label">المرتجعات (منفصلة)</div><div class="stat-value neg">${formatCurrency(data.totalSaleReturns, settings.currency)}</div></div>
    </div>

    <div class="totals-section-title">الوارد - المبيعات المدفوعة</div>
    <table>
      <thead><tr><th>#</th><th>الفاتورة</th><th>العميل</th><th>المستخدم</th><th>المدفوع</th><th>التاريخ</th></tr></thead>
      <tbody>${salesRows || '<tr><td colspan="6">لا توجد فواتير</td></tr>'}</tbody>
    </table>

    <div class="totals-section-title">الوارد - دفعات العملاء</div>
    <table>
      <thead><tr><th>#</th><th>العميل</th><th>ملاحظات</th><th>المبلغ</th><th>التاريخ</th></tr></thead>
      <tbody>${cpRows || '<tr><td colspan="5">لا توجد دفعات</td></tr>'}</tbody>
    </table>

    <div class="totals-section-title">المنصرف - المصروفات</div>
    <table>
      <thead><tr><th>#</th><th>التصنيف</th><th>المستخدم</th><th>ملاحظات</th><th>المبلغ</th><th>التاريخ</th></tr></thead>
      <tbody>${expRows || '<tr><td colspan="6">لا توجد مصروفات</td></tr>'}</tbody>
    </table>

    <div class="totals-section-title">المنصرف - قبض العمال</div>
    <table>
      <thead><tr><th>#</th><th>العامل</th><th>ملاحظات</th><th>المبلغ</th><th>التاريخ</th></tr></thead>
      <tbody>${wpRows || '<tr><td colspan="5">لا يوجد قبض</td></tr>'}</tbody>
    </table>

    ${data.saleReturns.length ? `
      <div class="totals-section-title">المرتجعات (لا تحتسب من المبيعات)</div>
      <table>
        <thead><tr><th>#</th><th>المرتجع</th><th>العميل</th><th>القيمة</th><th>التاريخ</th></tr></thead>
        <tbody>${retRows}</tbody>
      </table>
    ` : ''}

    ${totalsCard(
      [
        { label: 'إجمالي الوارد', value: formatCurrency(data.totalIncome, settings.currency) },
        { label: 'إجمالي المنصرف', value: formatCurrency(data.totalOutflow, settings.currency) },
      ],
      { label: 'صافي النقدية', value: formatCurrency(data.netCash, settings.currency) }
    )}
    ${brandFooter(settings)}
  `;
  return pageWrap(body);
}

// ========== Worker Advances Print ==========
export function buildWorkerAdvancesHtml(
  data: {
    advances: WorkerAdvance[];
    byWorker: { worker: Worker; totalAdvances: number; totalRepayments: number; balance: number; operationsCount: number }[];
    totalAdvances: number;
    totalRepayments: number;
    balance: number;
    fromDate: number | null;
    toDate: number | null;
  },
  settings: Settings
): string {
  const period = data.fromDate || data.toDate
    ? `${data.fromDate ? formatDate(data.fromDate) : '—'} → ${data.toDate ? formatDate(data.toDate) : '—'}`
    : 'كل الفترات';
  const workerRows = data.byWorker.map((s) => `
    <tr>
      <td>${escapeHtml(s.worker.name)}</td>
      <td>${escapeHtml(s.worker.jobTitle || '—')}</td>
      <td class="num">${formatCurrency(s.totalAdvances, settings.currency)}</td>
      <td class="num pos">${formatCurrency(s.totalRepayments, settings.currency)}</td>
      <td class="num ${s.balance > 0 ? 'neg' : 'pos'}">${formatCurrency(s.balance, settings.currency)}</td>
    </tr>
  `).join('');
  const opsRows = data.advances.slice(0, 200).map((a, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(a.workerName)}</td>
      <td><span class="pill ${a.type === 'advance' ? 'pill-r' : 'pill-g'}">${a.type === 'advance' ? 'سلفة' : 'تسديد'}</span></td>
      <td class="num ${a.type === 'advance' ? 'neg' : 'pos'}">${a.type === 'advance' ? '-' : '+'}${formatCurrency(a.amount, settings.currency)}</td>
      <td>${escapeHtml(a.notes || '—')}</td>
      <td>${formatDateTime(a.date)}</td>
    </tr>
  `).join('');
  const body = `
    ${brandHeader(settings)}
    <h1 class="title">سلفات العمال - كشف حساب</h1>
    ${metaItems([
      { label: 'الفترة', value: period },
      { label: 'تاريخ الطباعة', value: formatDateTime(Date.now()) },
      { label: 'عدد العمليات', value: formatNumber(data.advances.length) },
    ])}

    <div class="summary-block">
      <div class="lbl">إجمالي الرصيد المتبقي على العمال</div>
      <div class="val">${formatCurrency(data.balance, settings.currency)}</div>
    </div>

    <div class="stat-grid">
      <div class="stat-card"><div class="stat-label">إجمالي السلفات</div><div class="stat-value neg">${formatCurrency(data.totalAdvances, settings.currency)}</div></div>
      <div class="stat-card"><div class="stat-label">إجمالي التسديد</div><div class="stat-value pos">${formatCurrency(data.totalRepayments, settings.currency)}</div></div>
    </div>

    <div class="totals-section-title">كشف حساب العمال</div>
    <table>
      <thead><tr><th>الاسم</th><th>الوظيفة</th><th>السلفات</th><th>المسدد</th><th>الرصيد</th></tr></thead>
      <tbody>${workerRows || '<tr><td colspan="5">لا توجد بيانات</td></tr>'}</tbody>
    </table>

    <div class="totals-section-title">سجل العمليات</div>
    <table>
      <thead><tr><th>#</th><th>العامل</th><th>النوع</th><th>المبلغ</th><th>ملاحظات</th><th>التاريخ</th></tr></thead>
      <tbody>${opsRows || '<tr><td colspan="6">لا توجد عمليات</td></tr>'}</tbody>
    </table>

    ${totalsCard(
      [
        { label: 'إجمالي السلفات', value: formatCurrency(data.totalAdvances, settings.currency) },
        { label: 'إجمالي التسديد', value: formatCurrency(data.totalRepayments, settings.currency) },
      ],
      { label: 'الرصيد المتبقي', value: formatCurrency(data.balance, settings.currency) }
    )}
    ${brandFooter(settings)}
  `;
  return pageWrap(body);
}

// ========== Print actions ==========
export type PrintAction = 'print' | 'pdf' | 'preview';

function openWebPrintWindow(html: string, fileName: string): any {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('غير متاح في هذه البيئة');
  }
  const printWindow = window.open(
    'about:blank',
    '_blank',
    'width=900,height=700,scrollbars=yes,resizable=yes'
  );
  if (!printWindow) {
    throw new Error('برجاء السماح بالنوافذ المنبثقة من المتصفح ثم حاول مرة أخرى');
  }
  try {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } catch {
    try { printWindow.close(); } catch {}
    throw new Error('تعذر فتح النافذة الجديدة');
  }
  try {
    printWindow.document.title = fileName || 'تقرير';
  } catch {}
  return printWindow;
}

export async function performPrint(
  html: string,
  fileName: string,
  action: PrintAction
): Promise<void> {
  // Web: open in a new window/tab to avoid printing the parent page
  if (Platform.OS === 'web') {
    const w = openWebPrintWindow(html, fileName);
    if (action === 'preview') return;
    // wait for content/fonts to render before printing or save-as-PDF
    await new Promise((r) => setTimeout(r, 700));
    try {
      w.focus();
      // Both 'print' and 'pdf' on web use the browser print dialog
      // (user picks "Save as PDF" from the destination)
      w.print();
    } catch {}
    return;
  }

  // Native
  if (action === 'pdf') {
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const safeName = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const target = `${FileSystem.documentDirectory}${safeName}.pdf`;
    try {
      await FileSystem.copyAsync({ from: uri, to: target });
    } catch {}
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: fileName });
    }
    return;
  }
  await Print.printAsync({ html });
}

// ========== Excel Export ==========
// Builds an HTML-table-as-Excel file (.xls). Excel opens these natively
// and renders RTL/Arabic correctly via the office namespace hints.
export async function exportXlsx(
  data: {
    title: string;
    meta?: { label: string; value: string }[];
    columns: string[];
    rows: (string | number)[][];
    totalLabel?: string;
    totalValue?: string;
  },
  fileName: string
): Promise<void> {
  const headerHtml = data.columns
    .map(
      (c) =>
        `<th style="background:#0D9488;color:#fff;padding:10px;text-align:right;border:1px solid #0D9488;font-weight:bold;">${escapeHtml(
          c
        )}</th>`
    )
    .join('');
  const rowsHtml = data.rows
    .map(
      (r) =>
        `<tr>${r
          .map(
            (c) =>
              `<td style="border:1px solid #999;padding:8px;text-align:right;">${escapeHtml(
                String(c ?? '')
              )}</td>`
          )
          .join('')}</tr>`
    )
    .join('');
  const metaHtml = (data.meta || [])
    .map(
      (m) =>
        `<tr><td colspan="${data.columns.length}" style="background:#F0FDFA;color:#0F766E;padding:6px;text-align:right;border:1px solid #99F6E4;">${escapeHtml(
          m.label
        )}: <b>${escapeHtml(m.value)}</b></td></tr>`
    )
    .join('');
  const totalHtml =
    data.totalLabel && data.totalValue
      ? `<tr><td colspan="${Math.max(
          1,
          data.columns.length - 1
        )}" style="background:#F0FDFA;color:#0F766E;font-weight:bold;padding:10px;text-align:right;border:2px solid #0D9488;">${escapeHtml(
          data.totalLabel
        )}</td><td style="background:#F0FDFA;color:#0F766E;font-weight:bold;padding:10px;text-align:right;border:2px solid #0D9488;">${escapeHtml(
          data.totalValue
        )}</td></tr>`
      : '';

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(data.title)}</title>
<!--[if gte mso 9]>
<xml>
  <x:ExcelWorkbook>
    <x:ExcelWorksheets>
      <x:ExcelWorksheet>
        <x:Name>${escapeHtml(data.title.slice(0, 30))}</x:Name>
        <x:WorksheetOptions>
          <x:DisplayRightToLeft/>
        </x:WorksheetOptions>
      </x:ExcelWorksheet>
    </x:ExcelWorksheets>
  </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body { direction: rtl; font-family: 'Tahoma', Arial, sans-serif; padding: 16px; }
  table { border-collapse: collapse; width: 100%; }
  h1 { color: #0F766E; text-align: right; border-bottom: 2px solid #0D9488; padding-bottom: 8px; }
</style>
</head>
<body>
  <h1>${escapeHtml(data.title)}</h1>
  <table>
    ${metaHtml ? `<thead>${metaHtml}</thead>` : ''}
    <thead><tr>${headerHtml}</tr></thead>
    <tbody>${rowsHtml}</tbody>
    ${totalHtml ? `<tfoot>${totalHtml}</tfoot>` : ''}
  </table>
</body>
</html>`;

  const safeName = fileName.replace(/[^a-zA-Z0-9_\-\.\u0600-\u06FF]/g, '_');

  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('غير متاح في هذه البيئة');
    }
    const blob = new Blob(['\uFEFF' + html], {
      type: 'application/vnd.ms-excel;charset=utf-8',
    });
    // @ts-ignore
    const url = URL.createObjectURL(blob);
    // @ts-ignore
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.xls`;
    // @ts-ignore
    document.body.appendChild(a);
    a.click();
    // @ts-ignore
    document.body.removeChild(a);
    // @ts-ignore
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  const path = `${FileSystem.documentDirectory}${safeName}.xls`;
  await FileSystem.writeAsStringAsync(path, '\uFEFF' + html, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'application/vnd.ms-excel',
      dialogTitle: fileName,
    });
  }
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
