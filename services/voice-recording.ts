// Powered by OnSpace.AI
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

let currentRecording: Audio.Recording | null = null;
let recordingStartedAt = 0;

const RECORDING_OPTIONS: Audio.RecordingOptions = {
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

export async function startRecording(): Promise<{ ok: boolean; error?: string }> {
  try {
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      return { ok: false, error: 'لم يتم منح إذن الميكروفون. الرجاء تفعيله من إعدادات الجهاز.' };
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
  if (!currentRecording) {
    return { ok: false, error: 'لا يوجد تسجيل نشط' };
  }
  const durationMs = Date.now() - recordingStartedAt;
  try {
    await currentRecording.stopAndUnloadAsync();
    const uri = currentRecording.getURI() || '';
    currentRecording = null;

    if (!uri) return { ok: false, error: 'لم يتم حفظ الملف الصوتي' };

    let base64 = '';
    if (Platform.OS === 'web') {
      const res = await fetch(uri);
      const blob = await res.blob();
      base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const str = reader.result as string;
          resolve((str || '').split(',')[1] || '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }

    if (!base64) return { ok: false, error: 'الملف الصوتي فارغ' };

    const format = Platform.OS === 'web' ? 'webm' : 'm4a';
    return { ok: true, base64, format, durationMs };
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
