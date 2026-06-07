// Powered by OnSpace.AI
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

// Lazy-load native modules only on native platforms (avoids web crash)
let Speech: any = null;
let Haptics: any = null;

if (!isWeb) {
  try {
    Speech = require('expo-speech');
  } catch {}
  try {
    Haptics = require('expo-haptics');
  } catch {}
}

let lastSpokenAt = 0;
let lastSpokenText = '';
let nativeArabicVoiceId: string | null = null;
let nativeVoiceLookupTried = false;

// Web Speech API voice cache
let webArabicVoice: any = null;
let webVoicesLoaded = false;

function loadWebVoices() {
  if (!isWeb || typeof window === 'undefined') return;
  try {
    const synth = (window as any).speechSynthesis;
    if (!synth) return;
    const voices = (synth.getVoices() || []) as any[];
    if (voices.length === 0) return;
    webVoicesLoaded = true;
    const arabic = voices.filter((v) => (v.lang || '').toLowerCase().startsWith('ar'));
    const saudi = arabic.find((v) => (v.lang || '').toLowerCase() === 'ar-sa');
    const egypt = arabic.find((v) => (v.lang || '').toLowerCase() === 'ar-eg');
    const xa = arabic.find((v) => (v.lang || '').toLowerCase() === 'ar-xa');
    webArabicVoice = saudi || egypt || xa || arabic[0] || null;
  } catch {
    // ignore
  }
}

if (isWeb && typeof window !== 'undefined') {
  loadWebVoices();
  try {
    const synth = (window as any).speechSynthesis;
    if (synth && typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', loadWebVoices);
    } else if (synth) {
      synth.onvoiceschanged = loadWebVoices;
    }
  } catch {}
}

async function findNativeArabicVoice(): Promise<string | undefined> {
  if (isWeb || !Speech) return undefined;
  if (nativeVoiceLookupTried) return nativeArabicVoiceId || undefined;
  nativeVoiceLookupTried = true;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const arabic = voices.filter((v: any) =>
      (v.language || '').toLowerCase().startsWith('ar')
    );
    if (arabic.length === 0) {
      nativeArabicVoiceId = '';
      return undefined;
    }
    const enhanced = arabic.find(
      (v: any) => v.quality === Speech.VoiceQuality?.Enhanced
    );
    const saudi = arabic.find(
      (v: any) => (v.language || '').toLowerCase() === 'ar-sa'
    );
    const egypt = arabic.find(
      (v: any) => (v.language || '').toLowerCase() === 'ar-eg'
    );
    const chosen = enhanced || saudi || egypt || arabic[0];
    nativeArabicVoiceId = chosen?.identifier || '';
    return nativeArabicVoiceId || undefined;
  } catch {
    nativeArabicVoiceId = '';
    return undefined;
  }
}

// Strip emojis/markdown so TTS doesn't read them aloud
function cleanForSpeech(text: string): string {
  return String(text || '')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, ' ')
    .replace(/[\u{2600}-\u{27BF}]/gu, ' ')
    .replace(/[\u{1F000}-\u{1F2FF}]/gu, ' ')
    .replace(/[•✓✗→←↑↓★☆●○◆◇▪▫■□▶◀▼▲]/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/[#*_~`]/g, '')
    .replace(/\.\s*\.\s*\./g, '.')
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function playNotifySound() {
  if (isWeb || !Haptics) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {}
}

function speakWeb(text: string, opts: { rate?: number; pitch?: number } = {}): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const synth = (window as any).speechSynthesis;
    if (!synth) return false;

    // Cancel any ongoing speech to avoid queuing
    try {
      synth.cancel();
    } catch {}

    if (!webVoicesLoaded) loadWebVoices();

    const SpeechSynthesisUtterance = (window as any).SpeechSynthesisUtterance;
    if (!SpeechSynthesisUtterance) return false;

    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'ar-SA';
    utt.rate = Math.max(0.5, Math.min(2.0, opts.rate ?? 1.0));
    utt.pitch = Math.max(0.5, Math.min(2.0, opts.pitch ?? 1.0));
    utt.volume = 1.0;
    if (webArabicVoice) {
      utt.voice = webArabicVoice;
    }

    // Some browsers need a small delay after cancel before speak()
    setTimeout(() => {
      try {
        synth.speak(utt);
      } catch {}
    }, 50);

    return true;
  } catch {
    return false;
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

    if (isWeb) {
      speakWeb(cleaned, opts);
      return;
    }

    if (!Speech) return;

    try {
      if (await Speech.isSpeakingAsync()) {
        await Speech.stop();
      }
    } catch {}

    const voice = opts.voice || (await findNativeArabicVoice());

    // Conservative rates that work reliably
    // iOS rate 0.5 = system default. Slightly faster for clarity.
    // Android default 1.0 = normal speed.
    const defaultRate = Platform.OS === 'ios' ? 0.55 : 1.0;

    Speech.speak(cleaned, {
      language: 'ar-SA',
      pitch: opts.pitch ?? 1.0,
      rate: opts.rate ?? defaultRate,
      volume: 1.0,
      voice,
    });
  } catch {
    // Silent fail
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
    if (isWeb) {
      if (typeof window !== 'undefined') {
        const synth = (window as any).speechSynthesis;
        if (synth) synth.cancel();
      }
      return;
    }
    if (Speech) await Speech.stop();
  } catch {}
}

export async function isSpeaking(): Promise<boolean> {
  try {
    if (isWeb) {
      if (typeof window === 'undefined') return false;
      const synth = (window as any).speechSynthesis;
      return !!(synth && synth.speaking);
    }
    if (!Speech) return false;
    return await Speech.isSpeakingAsync();
  } catch {
    return false;
  }
}

export function isTtsSupported(): boolean {
  if (isWeb) {
    if (typeof window === 'undefined') return false;
    return !!(window as any).speechSynthesis;
  }
  return !!Speech;
}
