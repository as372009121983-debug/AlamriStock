// Powered by OnSpace.AI
import * as FileSystem from 'expo-file-system';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/template';

export type OCRProduct = {
  name: string;
  quantity: number;
  price: number;
  unit?: string;
};

export type OCRResult =
  | { ok: true; products: OCRProduct[] }
  | { ok: false; error: string };

export async function extractProductsFromImage(imageUri: string): Promise<OCRResult> {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke('ocr-products', {
      body: { image: dataUrl },
    });

    if (error) {
      let msg = error.message || 'فشل التحليل';
      if (error instanceof FunctionsHttpError) {
        try {
          const text = await error.context?.text();
          if (text) {
            try {
              const parsed = JSON.parse(text);
              msg = parsed.error || msg;
            } catch {
              msg = text;
            }
          }
        } catch {}
      }
      return { ok: false, error: msg };
    }

    const products = Array.isArray(data?.products) ? data.products : [];
    const cleaned: OCRProduct[] = products
      .map((p: any) => ({
        name: String(p?.name || '').trim(),
        quantity: typeof p?.quantity === 'number' ? p.quantity : parseFloat(p?.quantity || '1') || 1,
        price: typeof p?.price === 'number' ? p.price : parseFloat(p?.price || '0') || 0,
        unit: p?.unit ? String(p.unit).trim() : undefined,
      }))
      .filter((p: OCRProduct) => p.name.length > 0);

    return { ok: true, products: cleaned };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'فشل التحليل' };
  }
}
