// Powered by OnSpace.AI
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { parseExcelBase64 } from './excel-parser';

export type ParsedSheet = {
  headers: string[];
  rows: string[][];
  filename: string;
};

export type ImportPickResult =
  | { ok: true; data: ParsedSheet }
  | { ok: false; error: string; canceled?: boolean };

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const cleaned = content.replace(/^\uFEFF/, '');
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return { headers: [], rows: [] };
  const all = lines.map(parseCsvLine);
  return { headers: all[0] || [], rows: all.slice(1) };
}

export async function pickAndParseFile(): Promise<ImportPickResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) {
      return { ok: false, error: 'تم الإلغاء', canceled: true };
    }
    const file = result.assets[0];
    const name = (file.name || '').toLowerCase();

    if (name.endsWith('.csv') || name.endsWith('.txt')) {
      const content = await FileSystem.readAsStringAsync(file.uri);
      const data = parseCSV(content);
      return { ok: true, data: { ...data, filename: file.name } };
    }
    if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.xlsm')) {
      const content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: 'base64',
      });
      const data = await parseExcelBase64(content);
      return { ok: true, data: { ...data, filename: file.name } };
    }
    // Try as CSV by default
    try {
      const content = await FileSystem.readAsStringAsync(file.uri);
      const data = parseCSV(content);
      if (data.rows.length > 0) {
        return { ok: true, data: { ...data, filename: file.name } };
      }
    } catch {}
    return { ok: false, error: 'نوع الملف غير مدعوم. استخدم CSV أو Excel (xlsx, xls)' };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'فشل قراءة الملف' };
  }
}

const PRODUCT_HEADER_MAP: Record<string, string> = {
  name: 'name',
  product: 'name',
  'product name': 'name',
  'item': 'name',
  'item name': 'name',
  'الاسم': 'name',
  'اسم المنتج': 'name',
  'المنتج': 'name',
  'الصنف': 'name',
  barcode: 'barcode',
  code: 'barcode',
  sku: 'barcode',
  'الباركود': 'barcode',
  'الكود': 'barcode',
  'كود الصنف': 'barcode',
  category: 'category',
  'الفئة': 'category',
  'القسم': 'category',
  'التصنيف': 'category',
  unit: 'unit',
  'الوحدة': 'unit',
  'وحدة القياس': 'unit',
  'purchase price': 'purchasePrice',
  'cost': 'purchasePrice',
  'cost price': 'purchasePrice',
  'سعر الشراء': 'purchasePrice',
  'سعر التكلفة': 'purchasePrice',
  'التكلفة': 'purchasePrice',
  'sale price': 'salePrice',
  'price': 'salePrice',
  'selling price': 'salePrice',
  'سعر البيع': 'salePrice',
  'سعر القطاعي': 'salePrice',
  'السعر': 'salePrice',
  'wholesale price': 'wholesalePrice',
  'سعر الجملة': 'wholesalePrice',
  'half wholesale': 'halfWholesalePrice',
  'سعر نصف الجملة': 'halfWholesalePrice',
  'سعر نصف جملة': 'halfWholesalePrice',
  quantity: 'quantity',
  qty: 'quantity',
  'الكمية': 'quantity',
  'العدد': 'quantity',
  'low stock': 'lowStockAlert',
  'min stock': 'lowStockAlert',
  'حد التنبيه': 'lowStockAlert',
  'الحد الأدنى': 'lowStockAlert',
  notes: 'notes',
  'ملاحظات': 'notes',
};

const CUSTOMER_HEADER_MAP: Record<string, string> = {
  name: 'name',
  'customer': 'name',
  'customer name': 'name',
  'الاسم': 'name',
  'اسم العميل': 'name',
  phone: 'phone',
  mobile: 'phone',
  'phone number': 'phone',
  'tel': 'phone',
  'الهاتف': 'phone',
  'الجوال': 'phone',
  'رقم الهاتف': 'phone',
  'الموبايل': 'phone',
  address: 'address',
  'العنوان': 'address',
  'المدينة': 'address',
  notes: 'notes',
  'ملاحظات': 'notes',
};

export type ProductMappedRow = {
  name: string;
  barcode: string;
  category: string;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  wholesalePrice: number;
  halfWholesalePrice: number;
  quantity: number;
  lowStockAlert: number;
  notes: string;
};

export type CustomerMappedRow = {
  name: string;
  phone: string;
  address: string;
  notes: string;
};

function buildIndexMap(headers: string[], dictionary: Record<string, string>): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    const key = (h || '').toString().trim().toLowerCase();
    const mapped = dictionary[key];
    if (mapped && map[mapped] === undefined) map[mapped] = i;
  });
  return map;
}

function num(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = String(value).replace(/[,\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export function mapProductRows(parsed: ParsedSheet): ProductMappedRow[] {
  const idx = buildIndexMap(parsed.headers, PRODUCT_HEADER_MAP);
  return parsed.rows
    .map((row) => {
      // Try mapping by header first
      let name = idx.name !== undefined ? row[idx.name] : '';
      let barcode = idx.barcode !== undefined ? row[idx.barcode] : '';
      let category = idx.category !== undefined ? row[idx.category] : '';
      let unit = idx.unit !== undefined ? row[idx.unit] : '';
      let purchasePrice = num(idx.purchasePrice !== undefined ? row[idx.purchasePrice] : '0');
      let salePrice = num(idx.salePrice !== undefined ? row[idx.salePrice] : '0');
      let wholesalePrice = num(idx.wholesalePrice !== undefined ? row[idx.wholesalePrice] : '0');
      let halfWholesalePrice = num(
        idx.halfWholesalePrice !== undefined ? row[idx.halfWholesalePrice] : '0'
      );
      let quantity = num(idx.quantity !== undefined ? row[idx.quantity] : '0');
      let lowStockAlert = num(idx.lowStockAlert !== undefined ? row[idx.lowStockAlert] : '0');
      let notes = idx.notes !== undefined ? row[idx.notes] : '';

      // Fallback: if no header match, assume positional order
      if (!name && row[0]) name = row[0];
      if (!barcode && row.length >= 7 && idx.barcode === undefined) barcode = row[1] || '';
      if (purchasePrice === 0 && idx.purchasePrice === undefined && row[2])
        purchasePrice = num(row[2]);
      if (salePrice === 0 && idx.salePrice === undefined && row[3]) salePrice = num(row[3]);
      if (quantity === 0 && idx.quantity === undefined && row[4]) quantity = num(row[4]);

      return {
        name: (name || '').toString().trim(),
        barcode: (barcode || '').toString().trim(),
        category: (category || '').toString().trim(),
        unit: (unit || 'قطعة').toString().trim(),
        purchasePrice,
        salePrice,
        wholesalePrice,
        halfWholesalePrice,
        quantity,
        lowStockAlert,
        notes: (notes || '').toString().trim(),
      };
    })
    .filter((r) => r.name);
}

export function mapCustomerRows(parsed: ParsedSheet): CustomerMappedRow[] {
  const idx = buildIndexMap(parsed.headers, CUSTOMER_HEADER_MAP);
  return parsed.rows
    .map((row) => {
      let name = idx.name !== undefined ? row[idx.name] : '';
      let phone = idx.phone !== undefined ? row[idx.phone] : '';
      let address = idx.address !== undefined ? row[idx.address] : '';
      let notes = idx.notes !== undefined ? row[idx.notes] : '';

      if (!name && row[0]) name = row[0];
      if (!phone && row[1]) phone = row[1];
      if (!address && row[2]) address = row[2];

      return {
        name: (name || '').toString().trim(),
        phone: (phone || '').toString().trim(),
        address: (address || '').toString().trim(),
        notes: (notes || '').toString().trim(),
      };
    })
    .filter((r) => r.name);
}

export function generateProductTemplateCSV(): string {
  const header = 'الاسم,الباركود,الفئة,الوحدة,سعر الشراء,سعر البيع,سعر الجملة,سعر نصف الجملة,الكمية,حد التنبيه,ملاحظات';
  const example1 = 'كوع PVC قياس 50,1234567890,أنابيب,قطعة,5,12,10,11,100,10,';
  const example2 = 'صنبور خلاط فاخر,9876543210,خلاطات,قطعة,150,250,220,235,30,5,';
  return '\uFEFF' + [header, example1, example2].join('\n');
}

export function generateCustomerTemplateCSV(): string {
  const header = 'الاسم,الهاتف,العنوان,ملاحظات';
  const example1 = 'أحمد محمد,01012345678,القاهرة - مدينة نصر,';
  const example2 = 'محمود علي,01198765432,الجيزة - الدقي,عميل دائم';
  return '\uFEFF' + [header, example1, example2].join('\n');
}

export async function shareCSVTemplate(content: string, filename: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const uri = (FileSystem.cacheDirectory || '') + filename;
    await FileSystem.writeAsStringAsync(uri, content);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'text/csv',
        dialogTitle: 'حفظ القالب',
        UTI: 'public.comma-separated-values-text',
      });
      return { ok: true };
    }
    return { ok: false, message: 'المشاركة غير متاحة على هذا الجهاز' };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'فشل تصدير القالب' };
  }
}
