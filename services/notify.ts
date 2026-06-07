// Powered by OnSpace.AI
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

let lastSpokenAt = 0;
let lastSpokenText = '';

export async function playNotifySound() {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Silent fail
  }
}

export async function speakArabic(text: string) {
  try {
    if (!text || typeof text !== 'string') return;
    // Throttle: don't repeat same text within 1.5s
    const now = Date.now();
    if (text === lastSpokenText && now - lastSpokenAt < 1500) return;
    lastSpokenText = text;
    lastSpokenAt = now;

    const speaking = await Speech.isSpeakingAsync();
    if (speaking) {
      try {
        await Speech.stop();
      } catch {}
    }

    Speech.speak(text, {
      language: 'ar',
      pitch: 1.0,
      rate: Platform.OS === 'ios' ? 0.5 : 0.9,
      volume: 1.0,
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
    // Run after a tiny delay so haptic and speech don't collide
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
