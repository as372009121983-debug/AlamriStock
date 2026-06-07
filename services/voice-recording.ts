// Powered by OnSpace.AI
import { Platform } from 'react-native';

// Web has its own SpeechRecognition path - this file is for native only
let Audio: any = null;
let FileSystem: any = null;

if (Platform.OS !== 'web') {
  try {
    Audio = require('expo-av').Audio;
  } catch {}
  try {
    FileSystem = require('expo-file-system');
  } catch {}
}

let currentRecording: any = null;
let recordingStartedAt = 0;

export const WEB_FALLBACK = 'WEB_FALLBACK';

export async function startRecording(): Promise<{ ok: boolean; error?: string }> {
  if (Platform.OS === 'web') {
    return { ok: false, error: WEB_FALLBACK };
  }
  if (!Audio) {
    return { ok: false, error: 'وحدة الصوت غير متاحة' };
  }

  try {
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      return {
        ok: false,
        error: 'لم يتم منح إذن الميكروفون. الرجاء تفعيله من إعدادات الجهاز.',
      };
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    if (currentRecording) {
      try {
        await currentRecording.stopAndUnloadAsync();
      } catch {}
      currentRecording = null;
    }

    const RECORDING_OPTIONS = {
      isMeteringEnabled: true,
      android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 64000,
      },
      ios: {
        extension: '.m4a',
        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        audioQuality: Audio.IOSAudioQuality.MEDIUM,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 64000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 64000,
      },
    };

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(RECORDING_OPTIONS);
    await recording.startAsync();
    currentRecording = recording;
    recordingStartedAt = Date.now();
    return { ok: true };
  } catch (e: any) {
    currentRecording = null;
    return { ok: false, error: e?.message || 'تعذر بدء التسجيل' };
  }
}

export async function stopRecording(): Promise<{
  ok: boolean;
  base64?: string;
  format?: string;
  durationMs?: number;
  error?: string;
}> {
  if (Platform.OS === 'web') {
    return { ok: false, error: WEB_FALLBACK };
  }
  if (!currentRecording) {
    return { ok: false, error: 'لا يوجد تسجيل نشط' };
  }
  const durationMs = Date.now() - recordingStartedAt;
  try {
    await currentRecording.stopAndUnloadAsync();
    const uri = currentRecording.getURI() || '';
    currentRecording = null;

    if (!uri) return { ok: false, error: 'لم يتم حفظ الملف الصوتي' };
    if (!FileSystem) return { ok: false, error: 'نظام الملفات غير متاح' };

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (!base64) return { ok: false, error: 'الملف الصوتي فارغ' };

    return { ok: true, base64, format: 'm4a', durationMs };
  } catch (e: any) {
    currentRecording = null;
    return { ok: false, error: e?.message || 'تعذر إيقاف التسجيل' };
  }
}

export async function cancelRecording(): Promise<void> {
  if (!currentRecording) return;
  try {
    await currentRecording.stopAndUnloadAsync();
  } catch {}
  currentRecording = null;
}

export function getCurrentDuration(): number {
  if (!currentRecording) return 0;
  return Date.now() - recordingStartedAt;
}

export function isRecordingActive(): boolean {
  return !!currentRecording;
}

export function isNativeRecordingSupported(): boolean {
  return Platform.OS !== 'web' && !!Audio;
}
