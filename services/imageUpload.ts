// Powered by OnSpace.AI
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { decode as base64Decode } from 'base64-arraybuffer';
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();
const BUCKET = 'app-images';

export type UploadResult = {
  ok: boolean;
  url?: string;
  error?: string;
};

function inferExtension(uri: string): string {
  const m = uri.split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
  if (m) return m[1].toLowerCase();
  return 'jpg';
}

function inferContentType(ext: string): string {
  const e = ext.toLowerCase();
  if (e === 'png') return 'image/png';
  if (e === 'webp') return 'image/webp';
  return 'image/jpeg';
}

export function isCloudImageUrl(uri: string): boolean {
  if (!uri) return false;
  return /^https?:\/\//i.test(uri);
}

export async function uploadImage(
  localUri: string,
  ownerId: string,
  prefix: string = 'images'
): Promise<UploadResult> {
  try {
    if (!localUri) return { ok: false, error: 'لا توجد صورة' };
    if (isCloudImageUrl(localUri)) {
      return { ok: true, url: localUri };
    }

    const ext = inferExtension(localUri);
    const contentType = inferContentType(ext);
    const fileName = `${ownerId}/${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    let fileData: ArrayBuffer | Blob;

    if (Platform.OS === 'web') {
      const response = await fetch(localUri);
      fileData = await response.blob();
    } else {
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      fileData = base64Decode(base64);
    }

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, fileData as any, {
        contentType,
        upsert: false,
      });

    if (error) {
      return { ok: false, error: error.message };
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    return { ok: true, url: pub.publicUrl };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'فشل رفع الصورة' };
  }
}

export async function uploadImages(
  localUris: string[],
  ownerId: string,
  prefix: string = 'images'
): Promise<{ urls: string[]; failed: number }> {
  const urls: string[] = [];
  let failed = 0;
  for (const uri of localUris) {
    if (!uri) continue;
    if (isCloudImageUrl(uri)) {
      urls.push(uri);
      continue;
    }
    const r = await uploadImage(uri, ownerId, prefix);
    if (r.ok && r.url) {
      urls.push(r.url);
    } else {
      failed++;
    }
  }
  return { urls, failed };
}
