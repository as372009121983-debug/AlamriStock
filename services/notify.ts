// Powered by OnSpace.AI
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

let lastSpokenAt = 0;
let lastSpokenText = '';
let arabicVoiceId: string | null = null;
let voiceLookupTried = false;

async function findArabicVoice(): Promise<string | undefined> {
  if (voiceLookupTried) return arabicVoiceId || undefined;
  voiceLookupTried = true;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const arabic = voices.filter(
      (v) => (v.language || '').toLowerCase().startsWith('ar')
    );
    if (arabic.length === 0) {
      arabicVoiceId = '';
      return undefined;
    }
    // Prefer enhanced quality, then ar-SA, then any Arabic voice
    const enhanced = arabic.find(
      (v) => (v as any).quality === Speech.VoiceQuality?.Enhanced
    );
    const saudi = arabic.find(
      (v) => (v.language || '').toLowerCase() === 'ar-sa'
    );
    const egypt = arabic.find(
      (v) => (v.language || '').toLowerCase() === 'ar-eg'
    );
    const chosen = enhanced || saudi || egypt || arabic[0];
    arabicVoiceId = chosen?.identifier || '';
    return arabicVoiceId || undefined;
  } catch {
    arabicVoiceId = '';
    return undefined;
  }
}

// Strip emojis, markdown, special symbols so TTS doesn't read them aloud
function cleanForSpeech(text: string): string {
  return String(text || '')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, ' ') // emojis
    .replace(/[\u{2600}-\u{27BF}]/gu, ' ')   // misc symbols
    .replace(/[\u{1F000}-\u{1F2FF}]/gu, ' ') // more symbols
    .replace(/[•✓✗→←↑↓★☆●○◆◇▪▫■□▶◀▼▲]/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')         // code blocks
    .replace(/`[^`]*`/g, ' ')                // inline code
    .replace(/[#*_~`]/g, '')                 // markdown markers
    .replace(/\.\s*\.\s*\./g, '.')           // dot dot dot
    .replace(/\n+/g, '. ')                   // newlines as pauses
    .replace(/\s+/g, ' ')                    // collapse whitespace
    .trim();
}

export async function playNotifySound() {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Silent
  }
}

export async function speakArabic(
  text: string,
  opts: { rate?: number; pitch?: number; voice?: string } = {}
) {
  try {
    const cleaned = cleanForSpeech(text);
    if (!cleaned) return;

    const now = Date.now();
    if (cleaned === lastSpokenText && now - lastSpokenAt < 1500) return;
    lastSpokenText = cleaned;
    lastSpokenAt = now;

    try {
      if (await Speech.isSpeakingAsync()) {
        await Speech.stop();
      }
    } catch {}

    const voice = opts.voice || (await findArabicVoice());

    // Faster default rates - user complained voice was too slow
    // iOS rate 0.5 = system default (slow). 1.0 = max (very fast).
    // Android default 1.0 = normal.
    const defaultRate = Platform.OS === 'ios' ? 0.62 : 1.18;

    Speech.speak(cleaned, {
      language: 'ar-SA',
      pitch: opts.pitch ?? 1.0,
      rate: opts.rate ?? defaultRate,
      volume: 1.0,
      voice,
    });
  } catch {
    // Silent
  }
}

export async function notifyAction(
  message: string,
  options: { sound?: boolean; voice?: boolean } = {}
) {
  const { sound = true, voice = true } = options;
  const tasks: Promise<void>[] = [];
  if (sound) tasks.push(playNotifySound());
  if (voice) {
    tasks.push(
      new Promise<void>((resolve) => {
        setTimeout(() => {
          speakArabic(message).finally(() => resolve());
        }, 80);
      })
    );
  }
  await Promise.allSettled(tasks);
}

export async function silenceVoice() {
  try {
    await Speech.stop();
  } catch {}
}

export async function isSpeaking(): Promise<boolean> {
  try {
    return await Speech.isSpeakingAsync();
  } catch {
    return false;
  }
}
