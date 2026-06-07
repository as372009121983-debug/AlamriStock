// Powered by OnSpace.AI
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { Header } from '@/components/ui/Header';
import { useStore } from '@/hooks/useStore';
import { useAlert, getSupabaseClient } from '@/template';
import { Colors, FontSize, FontWeight, Radius, Shadow, Spacing } from '@/constants/theme';
import {
  speakArabic,
  silenceVoice,
  isSpeaking,
  isTtsSupported,
} from '@/services/notify';
import {
  startRecording,
  stopRecording,
  cancelRecording,
  isNativeRecordingSupported,
} from '@/services/voice-recording';
import {
  startWebRecognition,
  stopWebRecognition,
  abortWebRecognition,
  isWebSpeechSupported,
} from '@/services/web-speech';
import { isSameDay, isSameMonth } from '@/services/format';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  ts: number;
  voice?: boolean;
};

const SUGGESTIONS = [
  'مبيعات اليوم كم؟',
  'ما المنتجات منخفضة الكمية؟',
  'أعطني نصائح لزيادة المبيعات',
  'حلل لي أداء هذا الشهر',
];

const isWeb = Platform.OS === 'web';

export default function AIAssistantScreen() {
  const { products, customers, suppliers, sales, expenses, settings } = useStore();
  const { showAlert } = useAlert();
  const scrollRef = useRef<ScrollView | null>(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const recordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveModeRef = useRef(false);
  const cancelledRef = useRef(false);
  const partialRef = useRef('');

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: isWeb
        ? 'مرحباً، أنا "ذكي" مساعدك الذكي. اسألني عن مبيعاتك أو أرباحك بالكتابة، أو اضغط على الميكروفون وكلمني صوتياً، أو فعّل وضع المحادثة الحية.'
        : 'مرحباً، أنا "ذكي" مساعدك الذكي. اسألني عن مبيعاتك أو أرباحك أو اطلب نصائح ذكية.',
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceOn, setVoiceOn] = useState<boolean>(
    settings.voiceEnabled !== false && isTtsSupported()
  );
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');

  const voiceInputAvailable = isWeb
    ? isWebSpeechSupported()
    : isNativeRecordingSupported();

  // Live business data summary
  const businessContext = useMemo(() => {
    const now = Date.now();
    const todaySales = sales.filter((s) => isSameDay(s.date, now));
    const monthSales = sales.filter((s) => isSameMonth(s.date, now));
    const monthExpenses = expenses
      .filter((e) => isSameMonth(e.date, now))
      .reduce((sum, e) => sum + e.amount, 0);

    const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);
    const monthTotal = monthSales.reduce((sum, s) => sum + s.total, 0);

    const todayCost = todaySales.reduce(
      (sum, s) =>
        sum + s.items.reduce((c, it) => c + it.purchasePrice * it.quantity, 0),
      0
    );
    const monthCost = monthSales.reduce(
      (sum, s) =>
        sum + s.items.reduce((c, it) => c + it.purchasePrice * it.quantity, 0),
      0
    );

    const lowStock = products.filter((p) => p.quantity <= p.lowStockAlert);
    const inventoryValue = products.reduce(
      (sum, p) => sum + p.quantity * p.salePrice,
      0
    );
    const totalDebt = customers.reduce((sum, c) => sum + (c.debt || 0), 0);

    const productSales = new Map<string, { name: string; total: number }>();
    sales.forEach((s) => {
      s.items.forEach((it) => {
        const cur = productSales.get(it.productId) || { name: it.name, total: 0 };
        cur.total += it.price * it.quantity;
        productSales.set(it.productId, cur);
      });
    });
    const topProduct = Array.from(productSales.values()).sort(
      (a, b) => b.total - a.total
    )[0];

    const customerSales = new Map<string, { name: string; total: number }>();
    sales.forEach((s) => {
      if (!s.customerId) return;
      const cur = customerSales.get(s.customerId) || {
        name: s.customerName,
        total: 0,
      };
      cur.total += s.total;
      customerSales.set(s.customerId, cur);
    });
    const topCustomer = Array.from(customerSales.values()).sort(
      (a, b) => b.total - a.total
    )[0];

    return {
      productsCount: products.length,
      lowStockCount: lowStock.length,
      inventoryValue: Math.round(inventoryValue),
      customersCount: customers.length,
      suppliersCount: suppliers.length,
      totalDebt: Math.round(totalDebt),
      todaySales: Math.round(todayTotal),
      todaySalesCount: todaySales.length,
      monthSales: Math.round(monthTotal),
      todayProfit: Math.round(todayTotal - todayCost),
      monthProfit: Math.round(monthTotal - monthCost),
      monthExpenses: Math.round(monthExpenses),
      monthNet: Math.round(monthTotal - monthCost - monthExpenses),
      topProduct: topProduct
        ? `${topProduct.name} (${Math.round(topProduct.total)} ${settings.currency})`
        : 'لا يوجد',
      topCustomer: topCustomer
        ? `${topCustomer.name} (${Math.round(topCustomer.total)} ${settings.currency})`
        : 'لا يوجد',
      currency: settings.currency,
    };
  }, [products, customers, suppliers, sales, expenses, settings.currency]);

  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(t);
  }, [messages]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      liveModeRef.current = false;
      silenceVoice();
      if (isWeb) abortWebRecognition();
      else cancelRecording();
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (recording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(0);
    }
  }, [recording, pulseAnim]);

  function clearRecordingTimer() {
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
  }

  function startRecordingTimer() {
    clearRecordingTimer();
    setDuration(0);
    recordIntervalRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  }

  async function send(text?: string, isVoice: boolean = false) {
    const question = (text ?? input).trim();
    if (!question || loading) return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: question,
      ts: Date.now(),
      voice: isVoice,
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!isVoice) setInput('');
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          question,
          context: businessContext,
          history: messages.slice(-8).map((m) => ({ role: m.role, text: m.text })),
          voice: voiceOn || isVoice,
        },
      });

      if (error) {
        let errorMessage = error.message || 'حدث خطأ';
        if (error instanceof FunctionsHttpError) {
          try {
            const t = await error.context?.text();
            if (t) {
              try {
                const p = JSON.parse(t);
                errorMessage = p.error || errorMessage;
              } catch {
                errorMessage = t.slice(0, 200);
              }
            }
          } catch {}
        }
        throw new Error(errorMessage);
      }

      const reply = (data?.reply || 'عذراً، لم أتمكن من الإجابة').trim();
      const assistantMsg: Message = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        text: reply,
        ts: Date.now(),
        voice: isVoice,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Always speak if voice toggle on, OR if user used voice input
      if (voiceOn || isVoice) {
        const spoken = reply.length > 600 ? reply.slice(0, 600) + '...' : reply;
        speakArabic(spoken);
      }

      // Live mode: auto-listen again after AI finishes speaking
      if (isVoice && liveModeRef.current && !cancelledRef.current) {
        let waited = 0;
        const max = 25000;
        while (waited < max && (await isSpeaking())) {
          await new Promise((r) => setTimeout(r, 250));
          waited += 250;
        }
        await new Promise((r) => setTimeout(r, 400));
        if (liveModeRef.current && !cancelledRef.current) {
          handleStartRecord();
        }
      }
    } catch (e: any) {
      const errorMsg: Message = {
        id: `e_${Date.now()}`,
        role: 'assistant',
        text: `حدث خطأ في الاتصال: ${
          e?.message || 'تعذر الوصول للذكاء الاصطناعي'
        }. تأكد من الاتصال بالإنترنت ثم حاول مرة أخرى.`,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      if (liveModeRef.current) {
        liveModeRef.current = false;
        setLiveMode(false);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleStartRecord() {
    if (recording || processing || loading) return;
    if (!voiceInputAvailable) {
      showAlert(
        'الميكروفون غير متاح',
        isWeb
          ? 'متصفحك لا يدعم التعرف على الصوت. استخدم Chrome أو Safari أو Edge.'
          : 'الميكروفون غير متاح على هذا الجهاز'
      );
      return;
    }
    silenceVoice();
    partialRef.current = '';
    setPartialTranscript('');

    if (isWeb) {
      // Web: Use SpeechRecognition (no audio upload)
      setRecording(true);
      startRecordingTimer();

      const result = await startWebRecognition({
        onStart: () => {
          // Recognition started
        },
        onPartial: (text) => {
          partialRef.current = text;
          setPartialTranscript(text);
        },
        onResult: (text) => {
          setRecording(false);
          clearRecordingTimer();
          setDuration(0);
          setPartialTranscript('');
          if (text && text.length > 0) {
            send(text, true);
          } else if (liveModeRef.current) {
            // No speech detected in live mode, retry once after delay
            setTimeout(() => {
              if (liveModeRef.current && !cancelledRef.current) {
                handleStartRecord();
              }
            }, 600);
          }
        },
        onError: (error) => {
          setRecording(false);
          clearRecordingTimer();
          setDuration(0);
          setPartialTranscript('');
          if (error && error.length > 0) {
            showAlert('تعذر التعرف على الصوت', error);
            liveModeRef.current = false;
            setLiveMode(false);
          }
        },
        onEnd: () => {
          setRecording(false);
          clearRecordingTimer();
          setPartialTranscript('');
        },
      });

      if (!result.ok) {
        setRecording(false);
        clearRecordingTimer();
        setDuration(0);
        showAlert('غير متاح', result.error || 'لا يمكن استخدام الميكروفون');
        liveModeRef.current = false;
        setLiveMode(false);
      }
      return;
    }

    // Native: Use audio recording
    const result = await startRecording();
    if (!result.ok) {
      showAlert('تعذر التسجيل', result.error || 'لم يتم منح إذن الميكروفون');
      liveModeRef.current = false;
      setLiveMode(false);
      return;
    }
    setRecording(true);
    startRecordingTimer();
  }

  async function handleStopRecord(shouldSend = true) {
    if (!recording) return;

    if (isWeb) {
      // Web: stop recognition (will trigger onResult or onEnd)
      if (shouldSend) {
        stopWebRecognition();
      } else {
        abortWebRecognition();
        setRecording(false);
        clearRecordingTimer();
        setDuration(0);
        setPartialTranscript('');
      }
      return;
    }

    // Native: stop audio recording
    setRecording(false);
    clearRecordingTimer();
    const result = await stopRecording();
    setDuration(0);

    if (!result.ok || !result.base64) {
      if (shouldSend) showAlert('تعذر التسجيل', result.error || 'حدث خطأ');
      return;
    }
    if ((result.durationMs || 0) < 700) {
      if (shouldSend) {
        showAlert('التسجيل قصير', 'اضغط واستمر بالكلام لمدة ثانية على الأقل');
      }
      return;
    }
    if (shouldSend) await sendVoice(result.base64, result.format || 'm4a');
  }

  async function handleCancelRecord() {
    if (!recording) return;
    setRecording(false);
    clearRecordingTimer();
    setDuration(0);
    setPartialTranscript('');
    if (isWeb) {
      abortWebRecognition();
    } else {
      await cancelRecording();
    }
  }

  // Native-only: send audio bytes to ai-voice-chat
  async function sendVoice(base64: string, format: string) {
    setProcessing(true);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.functions.invoke('ai-voice-chat', {
        body: {
          audio: base64,
          format,
          context: businessContext,
          history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
        },
      });

      if (error) {
        let errorMessage = error.message || 'حدث خطأ';
        if (error instanceof FunctionsHttpError) {
          try {
            const t = await error.context?.text();
            if (t) {
              try {
                const p = JSON.parse(t);
                errorMessage = p.error || errorMessage;
              } catch {
                errorMessage = t.slice(0, 200);
              }
            }
          } catch {}
        }
        throw new Error(errorMessage);
      }

      const transcription = (data?.transcription || '').trim();
      const reply = (data?.reply || 'لم أفهم، حاول مرة أخرى').trim();

      const userMsg: Message = {
        id: `u_${Date.now()}`,
        role: 'user',
        text: transcription || 'رسالة صوتية',
        ts: Date.now(),
        voice: true,
      };
      const aiMsg: Message = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        text: reply,
        ts: Date.now() + 1,
        voice: true,
      };
      setMessages((prev) => [...prev, userMsg, aiMsg]);

      const spoken = reply.length > 600 ? reply.slice(0, 600) + '...' : reply;
      speakArabic(spoken);

      if (liveModeRef.current && !cancelledRef.current) {
        let waited = 0;
        const max = 25000;
        while (waited < max && (await isSpeaking())) {
          await new Promise((r) => setTimeout(r, 250));
          waited += 250;
        }
        await new Promise((r) => setTimeout(r, 400));
        if (liveModeRef.current && !cancelledRef.current && !processing) {
          handleStartRecord();
        }
      }
    } catch (e: any) {
      const errorMsg: Message = {
        id: `e_${Date.now()}`,
        role: 'assistant',
        text: `تعذر معالجة الرسالة الصوتية: ${
          e?.message || 'حاول مرة أخرى'
        }. جرب الكتابة بدلاً من الصوت.`,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      liveModeRef.current = false;
      setLiveMode(false);
    } finally {
      setProcessing(false);
    }
  }

  function clearChat() {
    silenceVoice();
    liveModeRef.current = false;
    setLiveMode(false);
    handleCancelRecord();
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: 'مرحباً، أنا "ذكي" مساعدك الذكي. اسألني أي شيء عن متجرك.',
        ts: Date.now(),
      },
    ]);
  }

  function toggleVoice() {
    if (voiceOn) silenceVoice();
    setVoiceOn((v) => !v);
  }

  async function toggleLiveMode() {
    if (!voiceInputAvailable) {
      showAlert(
        'غير متاح',
        isWeb
          ? 'متصفحك لا يدعم التعرف على الصوت. استخدم Chrome أو Safari أو Edge.'
          : 'الميكروفون غير متاح على هذا الجهاز'
      );
      return;
    }
    if (liveModeRef.current) {
      liveModeRef.current = false;
      setLiveMode(false);
      silenceVoice();
      await handleCancelRecord();
    } else {
      liveModeRef.current = true;
      setLiveMode(true);
      setTimeout(() => handleStartRecord(), 150);
    }
  }

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="المساعد الذكي"
        subtitle={
          liveMode
            ? 'وضع المحادثة الحية نشط'
            : processing
            ? 'يستمع ويفكر...'
            : recording
            ? 'يستمع الآن...'
            : 'مدعوم بالذكاء الاصطناعي'
        }
        right={
          <View style={{ flexDirection: 'row-reverse', gap: 4 }}>
            <Pressable onPress={toggleVoice} hitSlop={8} style={styles.headerBtn}>
              <MaterialCommunityIcons
                name={voiceOn ? 'volume-high' : 'volume-off'}
                size={22}
                color={voiceOn ? Colors.primary : Colors.textMuted}
              />
            </Pressable>
            <Pressable onPress={clearChat} hitSlop={8} style={styles.headerBtn}>
              <MaterialCommunityIcons name="broom" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={liveMode ? ['#DC2626', '#F97316'] : ['#0F766E', '#14B8A6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons
                name={liveMode ? 'phone-in-talk' : 'robot-happy'}
                size={32}
                color={Colors.white}
              />
            </View>
            <Text style={styles.heroTitle}>
              {liveMode ? 'محادثة حية مفتوحة' : 'ذكي - مساعدك الذكي'}
            </Text>
            <Text style={styles.heroSub}>
              {liveMode
                ? 'كلّم بشكل طبيعي. الميكروفون يستمع تلقائياً بعد كل رد.'
                : voiceInputAvailable
                ? 'اضغط الميكروفون وكلمني، أو فعّل المحادثة الحية للكلام المستمر'
                : 'اكتب سؤالك في الأسفل وسأجيبك بذكاء'}
            </Text>

            {voiceInputAvailable ? (
              <Pressable
                onPress={toggleLiveMode}
                style={[styles.liveModeBtn, liveMode && styles.liveModeBtnActive]}
              >
                <MaterialCommunityIcons
                  name={liveMode ? 'phone-hangup' : 'phone-in-talk'}
                  size={18}
                  color={liveMode ? Colors.danger : Colors.white}
                />
                <Text
                  style={[
                    styles.liveModeText,
                    liveMode && { color: Colors.danger },
                  ]}
                >
                  {liveMode ? 'إنهاء المكالمة' : 'بدء محادثة حية'}
                </Text>
              </Pressable>
            ) : null}
          </LinearGradient>

          {messages.map((m) => (
            <View
              key={m.id}
              style={[
                styles.bubble,
                m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
              ]}
            >
              {m.role === 'assistant' ? (
                <View style={styles.assistantHeader}>
                  <View style={styles.assistantAvatar}>
                    <MaterialCommunityIcons
                      name="robot-happy-outline"
                      size={14}
                      color={Colors.primary}
                    />
                  </View>
                  <Text style={styles.assistantName}>ذكي</Text>
                  {m.voice ? (
                    <MaterialCommunityIcons
                      name="volume-high"
                      size={12}
                      color={Colors.primary}
                    />
                  ) : null}
                </View>
              ) : null}
              {m.role === 'user' && m.voice ? (
                <View style={styles.userVoiceBadge}>
                  <MaterialCommunityIcons
                    name="microphone"
                    size={11}
                    color="rgba(255,255,255,0.85)"
                  />
                  <Text style={styles.userVoiceText}>صوتي</Text>
                </View>
              ) : null}
              <Text
                style={[
                  styles.bubbleText,
                  m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant,
                ]}
              >
                {m.text}
              </Text>
            </View>
          ))}

          {loading || processing ? (
            <View style={[styles.bubble, styles.bubbleAssistant]}>
              <View style={styles.assistantHeader}>
                <View style={styles.assistantAvatar}>
                  <MaterialCommunityIcons
                    name="robot-happy-outline"
                    size={14}
                    color={Colors.primary}
                  />
                </View>
                <Text style={styles.assistantName}>ذكي</Text>
              </View>
              <View style={styles.thinkingRow}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.thinkingText}>
                  {processing ? 'يستمع ويفكر...' : 'يفكر...'}
                </Text>
              </View>
            </View>
          ) : null}

          {messages.length <= 1 && !loading && !processing ? (
            <View style={styles.suggestionsWrap}>
              <Text style={styles.suggestionsTitle}>أمثلة جاهزة:</Text>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => send(s)}
                  style={({ pressed }) => [
                    styles.suggestionChip,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="message-text-outline"
                    size={14}
                    color={Colors.primary}
                  />
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>

        {recording ? (
          <View style={styles.recordingBanner}>
            <Pressable
              onPress={handleCancelRecord}
              hitSlop={8}
              style={styles.recCancelBtn}
            >
              <MaterialCommunityIcons name="close" size={20} color={Colors.danger} />
            </Pressable>
            <Animated.View
              style={[
                styles.recDot,
                {
                  opacity: pulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                  transform: [
                    {
                      scale: pulseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.4],
                      }),
                    },
                  ],
                },
              ]}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.recText}>
                {partialTranscript ? partialTranscript : 'يستمع...'}
              </Text>
            </View>
            <Text style={styles.recTimer}>{formatDuration(duration)}</Text>
            <Pressable
              onPress={() => handleStopRecord(true)}
              style={styles.recDoneBtn}
              hitSlop={8}
            >
              <MaterialCommunityIcons name="check" size={22} color={Colors.white} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.composer}>
          {voiceInputAvailable ? (
            <Pressable
              onPress={recording ? () => handleStopRecord(true) : handleStartRecord}
              disabled={loading || processing}
              style={({ pressed }) => [
                styles.micBtn,
                recording && styles.micBtnRecording,
                (loading || processing) && { opacity: 0.5 },
                pressed && { opacity: 0.85 },
              ]}
              hitSlop={6}
            >
              <MaterialCommunityIcons
                name={recording ? 'stop' : 'microphone'}
                size={22}
                color={recording ? Colors.white : Colors.primary}
              />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => send()}
            disabled={!input.trim() || loading || processing}
            style={({ pressed }) => [
              styles.sendBtn,
              (!input.trim() || loading || processing) && { opacity: 0.5 },
              pressed && { opacity: 0.85 },
            ]}
            hitSlop={6}
          >
            <MaterialCommunityIcons
              name="send"
              size={22}
              color={Colors.white}
              style={{ transform: [{ scaleX: -1 }] }}
            />
          </Pressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={
              voiceInputAvailable
                ? 'اكتب أو اضغط الميكروفون...'
                : 'اكتب سؤالك هنا...'
            }
            placeholderTextColor={Colors.textMuted}
            style={styles.composerInput}
            multiline
            maxLength={500}
            textAlign="right"
            writingDirection="rtl"
            editable={!recording && !processing}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  chatScroll: { flex: 1 },
  chatContent: { padding: Spacing.lg, paddingBottom: 20, gap: Spacing.md },
  heroCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    alignItems: 'flex-end',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  heroTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.white },
  heroSub: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'right',
    lineHeight: 20,
    marginBottom: 8,
  },
  liveModeBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderRadius: Radius.full,
    alignSelf: 'flex-end',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  liveModeBtnActive: {
    backgroundColor: Colors.white,
    borderColor: Colors.white,
  },
  liveModeText: {
    color: Colors.white,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.sm,
  },
  bubble: {
    maxWidth: '88%',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    gap: 6,
  },
  bubbleUser: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 4,
  },
  bubbleAssistant: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.surface,
    borderTopRightRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  assistantHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  assistantAvatar: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantName: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  userVoiceBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    alignSelf: 'flex-end',
  },
  userVoiceText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: FontWeight.bold,
  },
  bubbleText: { fontSize: FontSize.md, lineHeight: 22, textAlign: 'right' },
  bubbleTextUser: { color: Colors.white },
  bubbleTextAssistant: { color: Colors.text },
  thinkingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  thinkingText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  suggestionsWrap: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  suggestionsTitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
    textAlign: 'right',
    marginBottom: 4,
  },
  suggestionChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryTint,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
  },
  suggestionText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    flex: 1,
    textAlign: 'right',
  },
  recordingBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.dangerSoft,
    borderTopWidth: 1,
    borderColor: Colors.danger,
  },
  recCancelBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  recDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.danger,
  },
  recText: {
    color: Colors.danger,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.sm,
    textAlign: 'right',
  },
  recTimer: {
    color: Colors.danger,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.md,
    fontVariant: ['tabular-nums'],
    minWidth: 50,
    textAlign: 'center',
  },
  recDoneBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composer: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  composerInput: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    maxHeight: 110,
    minHeight: 44,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  micBtnRecording: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
  },
});
