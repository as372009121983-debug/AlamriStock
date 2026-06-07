// Powered by OnSpace.AI
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { speakArabic, silenceVoice } from '@/services/notify';
import { formatCurrency, isSameDay, isSameMonth } from '@/services/format';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  ts: number;
};

const SUGGESTIONS = [
  'مبيعات اليوم كم؟',
  'ما المنتجات منخفضة الكمية؟',
  'أعطني نصائح لزيادة المبيعات',
  'كيف أبدأ عرض ترويجي ذكي؟',
  'حلل لي أداء هذا الشهر',
];

export default function AIAssistantScreen() {
  const { products, customers, suppliers, sales, expenses, settings } = useStore();
  const { showAlert } = useAlert();
  const scrollRef = useRef<ScrollView | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: '✓ مرحباً! أنا "ذكي" مساعدك الذكي.\n\nأقدر أحلل بياناتك، أعطيك نصائح، أحسب أرباحك، أو أقترح أفكار جديدة لمتجرك. اسألني أي حاجة!',
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceOn, setVoiceOn] = useState<boolean>(settings.voiceEnabled !== false);

  // Build business context
  const businessContext = useMemo(() => {
    const now = Date.now();
    const todaySales = sales.filter((s) => isSameDay(s.date, now));
    const monthSales = sales.filter((s) => isSameMonth(s.date, now));
    const monthExpenses = expenses.filter((e) => isSameMonth(e.date, now)).reduce((sum, e) => sum + e.amount, 0);

    const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);
    const monthTotal = monthSales.reduce((sum, s) => sum + s.total, 0);

    const todayCost = todaySales.reduce(
      (sum, s) => sum + s.items.reduce((c, it) => c + it.purchasePrice * it.quantity, 0),
      0
    );
    const monthCost = monthSales.reduce(
      (sum, s) => sum + s.items.reduce((c, it) => c + it.purchasePrice * it.quantity, 0),
      0
    );

    const lowStock = products.filter((p) => p.quantity <= p.lowStockAlert);
    const inventoryValue = products.reduce((sum, p) => sum + p.quantity * p.salePrice, 0);
    const totalDebt = customers.reduce((sum, c) => sum + (c.debt || 0), 0);

    // Top product
    const productSales = new Map<string, { name: string; total: number }>();
    sales.forEach((s) => {
      s.items.forEach((it) => {
        const cur = productSales.get(it.productId) || { name: it.name, total: 0 };
        cur.total += it.salePrice * it.quantity;
        productSales.set(it.productId, cur);
      });
    });
    const topProduct = Array.from(productSales.values()).sort((a, b) => b.total - a.total)[0];

    // Top customer
    const customerSales = new Map<string, { name: string; total: number }>();
    sales.forEach((s) => {
      if (!s.customerId) return;
      const cur = customerSales.get(s.customerId) || { name: s.customerName, total: 0 };
      cur.total += s.total;
      customerSales.set(s.customerId, cur);
    });
    const topCustomer = Array.from(customerSales.values()).sort((a, b) => b.total - a.total)[0];

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
      topProduct: topProduct ? `${topProduct.name} (${Math.round(topProduct.total)} ${settings.currency})` : 'لا يوجد',
      topCustomer: topCustomer ? `${topCustomer.name} (${Math.round(topCustomer.total)} ${settings.currency})` : 'لا يوجد',
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
      // Stop any speech when leaving
      silenceVoice();
    };
  }, []);

  async function send(text?: string) {
    const question = (text ?? input).trim();
    if (!question || loading) return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: question,
      ts: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          question,
          context: businessContext,
          history: messages.slice(-10).map((m) => ({ role: m.role, text: m.text })),
        },
      });

      if (error) {
        let errorMessage = error.message || 'حدث خطأ';
        if (error instanceof FunctionsHttpError) {
          try {
            const text = await error.context?.text();
            if (text) {
              try {
                const parsed = JSON.parse(text);
                errorMessage = parsed.error || errorMessage;
              } catch {
                errorMessage = text.slice(0, 200);
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
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (voiceOn) {
        // Speak the reply (truncate long replies)
        const spoken = reply.length > 300 ? reply.slice(0, 300) + '...' : reply;
        speakArabic(spoken);
      }
    } catch (e: any) {
      const errorMsg: Message = {
        id: `e_${Date.now()}`,
        role: 'assistant',
        text: `⚠ حدث خطأ في الاتصال:\n${e?.message || 'تعذر الوصول للذكاء الاصطناعي'}\n\nتأكد من الاتصال بالإنترنت وحاول مرة أخرى.`,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    silenceVoice();
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: '✓ مرحباً! أنا "ذكي" مساعدك الذكي.\n\nأقدر أحلل بياناتك، أعطيك نصائح، أحسب أرباحك، أو أقترح أفكار جديدة لمتجرك. اسألني أي حاجة!',
        ts: Date.now(),
      },
    ]);
  }

  function toggleVoice() {
    if (voiceOn) silenceVoice();
    setVoiceOn((v) => !v);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header
        title="المساعد الذكي"
        subtitle="مدعوم بالذكاء الاصطناعي"
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={['#0F766E', '#14B8A6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name="robot-happy" size={32} color={Colors.white} />
            </View>
            <Text style={styles.heroTitle}>ذكي - مساعدك الذكي</Text>
            <Text style={styles.heroSub}>
              اسأل عن مبيعاتك، أرباحك، مخزونك أو احصل على نصائح ذكية لمتجرك
            </Text>
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
                    <MaterialCommunityIcons name="robot-happy-outline" size={14} color={Colors.primary} />
                  </View>
                  <Text style={styles.assistantName}>ذكي</Text>
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

          {loading ? (
            <View style={[styles.bubble, styles.bubbleAssistant]}>
              <View style={styles.assistantHeader}>
                <View style={styles.assistantAvatar}>
                  <MaterialCommunityIcons name="robot-happy-outline" size={14} color={Colors.primary} />
                </View>
                <Text style={styles.assistantName}>ذكي</Text>
              </View>
              <View style={styles.thinkingRow}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.thinkingText}>يفكر...</Text>
              </View>
            </View>
          ) : null}

          {messages.length <= 1 && !loading ? (
            <View style={styles.suggestionsWrap}>
              <Text style={styles.suggestionsTitle}>أمثلة جاهزة:</Text>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => send(s)}
                  style={({ pressed }) => [styles.suggestionChip, pressed && { opacity: 0.85 }]}
                >
                  <MaterialCommunityIcons name="message-text-outline" size={14} color={Colors.primary} />
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.composer}>
          <Pressable
            onPress={() => send()}
            disabled={!input.trim() || loading}
            style={({ pressed }) => [
              styles.sendBtn,
              (!input.trim() || loading) && { opacity: 0.5 },
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
            placeholder="اكتب سؤالك هنا..."
            placeholderTextColor={Colors.textMuted}
            style={styles.composerInput}
            multiline
            maxLength={500}
            textAlign="right"
            writingDirection="rtl"
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
  heroSub: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.92)', textAlign: 'right', lineHeight: 20 },
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
  assistantName: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.bold },
  bubbleText: { fontSize: FontSize.md, lineHeight: 22, textAlign: 'right' },
  bubbleTextUser: { color: Colors.white },
  bubbleTextAssistant: { color: Colors.text },
  thinkingRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingVertical: 4 },
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
});
