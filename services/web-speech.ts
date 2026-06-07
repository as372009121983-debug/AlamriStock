// Powered by OnSpace.AI
import { Platform } from 'react-native';

let recognition: any = null;
let recognitionActive = false;

export function isWebSpeechSupported(): boolean {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined') return false;
  return !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
}

export type WebRecognitionCallbacks = {
  onResult: (text: string) => void;
  onError: (error: string) => void;
  onEnd?: () => void;
  onStart?: () => void;
  onPartial?: (text: string) => void;
};

export async function startWebRecognition(
  callbacks: WebRecognitionCallbacks
): Promise<{ ok: boolean; error?: string }> {
  if (!isWebSpeechSupported()) {
    return {
      ok: false,
      error: 'متصفحك لا يدعم التعرف على الصوت. استخدم Chrome أو Safari أو Edge للحصول على دعم الميكروفون',
    };
  }

  try {
    // Stop any active recognition
    if (recognition && recognitionActive) {
      try {
        recognition.abort();
      } catch {}
    }

    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognition = new SR();
    recognition.lang = 'ar-SA';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let finalTranscript = '';

    recognition.onstart = () => {
      recognitionActive = true;
      if (callbacks.onStart) callbacks.onStart();
    };

    recognition.onresult = (event: any) => {
      try {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }
        if (interim && callbacks.onPartial) {
          callbacks.onPartial(interim.trim());
        }
      } catch {}
    };

    recognition.onerror = (event: any) => {
      const errMap: Record<string, string> = {
        'not-allowed':
          'لم يتم منح إذن الميكروفون. اضغط على أيقونة القفل في شريط العنوان وفعّل الميكروفون',
        'permission-denied':
          'لم يتم منح إذن الميكروفون. تحقق من إعدادات المتصفح',
        'no-speech': 'لم يُكتشف صوت. تحدث بوضوح وحاول مرة أخرى',
        'audio-capture': 'لا يوجد ميكروفون متاح على الجهاز',
        network: 'مشكلة في الاتصال بالإنترنت',
        aborted: '',
        'language-not-supported': 'اللغة العربية غير مدعومة في هذا المتصفح',
        'service-not-allowed': 'خدمة التعرف على الصوت غير متاحة',
      };
      const msg = event.error in errMap ? errMap[event.error] : event.error;
      if (msg) callbacks.onError(msg);
      recognitionActive = false;
    };

    recognition.onend = () => {
      recognitionActive = false;
      const text = finalTranscript.trim();
      if (text) {
        callbacks.onResult(text);
      }
      if (callbacks.onEnd) callbacks.onEnd();
    };

    recognition.start();
    return { ok: true };
  } catch (e: any) {
    recognitionActive = false;
    return { ok: false, error: e?.message || 'تعذر بدء التعرف على الصوت' };
  }
}

export function stopWebRecognition() {
  try {
    if (recognition && recognitionActive) {
      recognition.stop();
    }
  } catch {}
}

export function abortWebRecognition() {
  try {
    if (recognition) {
      recognition.abort();
    }
  } catch {}
  recognitionActive = false;
}

export function isRecognitionActive(): boolean {
  return recognitionActive;
}
