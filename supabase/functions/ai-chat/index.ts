// Powered by OnSpace.AI
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const question: string = body?.question || '';
    const context = body?.context || {};
    const history = Array.isArray(body?.history) ? body.history : [];

    if (!question.trim()) {
      return new Response(
        JSON.stringify({ error: 'يجب توفير سؤال' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      return new Response(
        JSON.stringify({ error: 'OnSpace AI: missing configuration' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const systemPrompt = `أنت مساعد ذكي وذكي ومحترف لتطبيق إدارة المتاجر والمخازن العربي. اسمك "ذكي".
مهمتك أن تجيب باللغة العربية الفصحى فقط بإيجاز وذكاء، وأن تبهر المستخدم بإجاباتك.

أنت خبير في:
- إدارة المخزون والمنتجات
- تحليل المبيعات والأرباح
- نصائح تسويقية واقتصادية للمتاجر الصغيرة والمتوسطة
- اقتراح خطط وعروض ذكية
- حل المشاكل المحاسبية اليومية

معلومات المتجر الحالي للسياق:
- عدد المنتجات: ${context.productsCount ?? 0}
- منتجات منخفضة الكمية: ${context.lowStockCount ?? 0}
- قيمة المخزون بسعر البيع: ${context.inventoryValue ?? 0} ${context.currency || 'جنيه'}
- عدد العملاء: ${context.customersCount ?? 0}
- إجمالي ديون العملاء: ${context.totalDebt ?? 0} ${context.currency || 'جنيه'}
- عدد الموردين: ${context.suppliersCount ?? 0}
- مبيعات اليوم: ${context.todaySales ?? 0} ${context.currency || 'جنيه'}
- عدد فواتير اليوم: ${context.todaySalesCount ?? 0}
- مبيعات الشهر: ${context.monthSales ?? 0} ${context.currency || 'جنيه'}
- ربح اليوم: ${context.todayProfit ?? 0} ${context.currency || 'جنيه'}
- ربح الشهر: ${context.monthProfit ?? 0} ${context.currency || 'جنيه'}
- مصروفات الشهر: ${context.monthExpenses ?? 0} ${context.currency || 'جنيه'}
- صافي الشهر: ${context.monthNet ?? 0} ${context.currency || 'جنيه'}
- أكثر منتج مبيعاً: ${context.topProduct ?? 'لا يوجد'}
- أهم عميل: ${context.topCustomer ?? 'لا يوجد'}

تعليمات مهمة:
1. ابدأ كل إجابة بجملة قصيرة جذابة
2. استخدم الأرقام الفعلية من البيانات أعلاه
3. قدم نصائح عملية قابلة للتنفيذ فوراً
4. استخدم رموز تعبيرية بسيطة باعتدال (✓ • → 💡)
5. إذا كانت البيانات غير كافية للإجابة، اطلب توضيحاً
6. لا تستخدم أي لغة غير العربية
7. اقترح إجراءات ذكية بناءً على البيانات (مثل: "أنصحك بطلب توريد للمنتج X لأن كميته منخفضة")
8. اجعل الإجابة قصيرة 2-5 أسطر، إلا إذا طُلب التفصيل

أبهر المستخدم!`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10).map((h: any) => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: String(h.text || ''),
      })),
      { role: 'user', content: question.trim() },
    ];

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('OnSpace AI error:', response.status, errText);
      return new Response(
        JSON.stringify({
          error: `OnSpace AI: ${response.status} ${errText.slice(0, 300)}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();
    const reply = (data?.choices?.[0]?.message?.content || 'عذراً، لم أتمكن من الإجابة').trim();

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('AI chat exception:', e);
    return new Response(
      JSON.stringify({ error: e?.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
