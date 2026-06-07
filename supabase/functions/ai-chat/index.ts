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
    const isVoice: boolean = body?.voice === true;

    if (!question.trim()) {
      return new Response(
        JSON.stringify({ error: 'يجب توفير سؤال' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      return new Response(
        JSON.stringify({ error: 'OnSpace AI: missing configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cur = context.currency || 'جنيه';
    const systemPrompt = `أنت "ذكي"، مساعد ذكاء اصطناعي خبير لإدارة متاجر ومخازن باللغة العربية.

قواعد إجاباتك (مهم جداً):
- اللغة: العربية الفصحى الواضحة والسهلة فقط
- الطول: ${isVoice ? 'جملة أو جملتين قصيرتين فقط لأن إجابتك ستُنطق بصوت عالٍ' : '1-4 جمل قصيرة وذكية'}
- استخدم الأرقام الفعلية من البيانات أدناه دون تعديل
- ${isVoice ? 'ممنوع نهائياً استخدام أي رموز أو إيموجي أو أحرف خاصة (لأنها ستُقرأ بصوت)' : 'ممنوع استخدام إيموجي أو رموز معقدة'}
- كن مباشراً، عملياً، ودوداً، ذكياً، واقترح إجراءات قابلة للتنفيذ فوراً

بيانات المتجر اللحظية:
- المنتجات: ${context.productsCount ?? 0}
- منتجات منخفضة الكمية: ${context.lowStockCount ?? 0}
- قيمة المخزون بسعر البيع: ${context.inventoryValue ?? 0} ${cur}
- العملاء: ${context.customersCount ?? 0}
- إجمالي ديون العملاء: ${context.totalDebt ?? 0} ${cur}
- الموردين: ${context.suppliersCount ?? 0}
- مبيعات اليوم: ${context.todaySales ?? 0} ${cur} (${context.todaySalesCount ?? 0} فاتورة)
- ربح اليوم: ${context.todayProfit ?? 0} ${cur}
- مبيعات الشهر: ${context.monthSales ?? 0} ${cur}
- ربح الشهر: ${context.monthProfit ?? 0} ${cur}
- مصروفات الشهر: ${context.monthExpenses ?? 0} ${cur}
- صافي الشهر: ${context.monthNet ?? 0} ${cur}
- أكثر منتج مبيعاً: ${context.topProduct ?? 'لا يوجد'}
- أهم عميل: ${context.topCustomer ?? 'لا يوجد'}

أبهر المستخدم بإجابات قصيرة وذكية ومبنية على بياناته الحقيقية!`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8).map((h: any) => ({
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
        temperature: 0.55,
        max_tokens: isVoice ? 220 : 450,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('OnSpace AI error:', response.status, errText);
      return new Response(
        JSON.stringify({
          error: `OnSpace AI: ${response.status} ${errText.slice(0, 250)}`,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
