// Powered by OnSpace.AI
// Web stub: xlsx has bundling issues on web, use CSV instead
export async function parseExcelBase64(_content: string): Promise<{
  headers: string[];
  rows: string[][];
}> {
  throw new Error(
    'استيراد Excel غير مدعوم على المتصفح، استخدم تطبيق الجوال أو حوّل الملف إلى CSV'
  );
}
