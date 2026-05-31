// Powered by OnSpace.AI
import * as XLSX from 'xlsx';

export async function parseExcelBase64(content: string): Promise<{
  headers: string[];
  rows: string[][];
}> {
  const workbook = XLSX.read(content, { type: 'base64' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };
  const sheet = workbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<any[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });
  if (!json.length) return { headers: [], rows: [] };
  const headers = (json[0] as any[]).map((h) => String(h || '').trim());
  const rows = json
    .slice(1)
    .map((row) =>
      (row as any[]).map((c) =>
        c === null || c === undefined ? '' : String(c).trim()
      )
    );
  return { headers, rows };
}
