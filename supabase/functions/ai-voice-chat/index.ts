// Powered by OnSpace.AI
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const audioBase64: string = body?.audio || '';
    const audioFormat: string = (body?.format || 'm4a').toLowerCase();
    const context = body?.context || {};
    const history = Array.isArray(body?.history) ? body.history : [];

    if (!audioBase64) {
      return new Response(
        JSON.stringify({ error: 'يجب توفير ملف صوتي' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      return new Response(
        JSON.stringify({ error: 'إعدادات الذكاء الاصطناعي غير متوفرة' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OpenRouter input_audio supports primarily wav and mp3
    // m4a (AAC in MP4 container) → try as 'mp3' (similar AAC family)
    let apiFormat = 'mp3';
    if (audioFormat === 'wav') apiFormat = 'wav';
    else if (audioFormat === 'mp3') apiFormat = 'mp3';
    else if (audioFormat === 'webm') apiFormat = 'mp3'; // webm is uncommon, attempt mp3
    else apiFormat = 'mp3'; // default fallback for m4a/aac

    const cur = context.currency || 'جنيه';

    const systemPrompt = `أنت "ذكي"، مساعد عربي خبير في إدارة المتاجر والمخازن.
المستخدم سجّل صوتاً بالعربية. استمع وأعطني JSON بالضبط بالشكل التالي:
{"transcription":"<النص الذي قاله المستخدم بالحرف>","reply":"<رد قصير وذكي>"}

قواعد الرد:
- ردك جملة أو جملتين قصيرتين فقط (سيُنطق بصوت)
- بالعربية الفصحى الواضحة
- استخدم الأرقام الحقيقية من البيانات أدناه
- ممنوع أي رموز أو إيموجي أو أحرف خاصة في ردك
- كن مباشراً، عملياً، ودوداً
- لو لم تفهم الصوت، اطلب توضيحاً قصيراً

البيانات اللحظية للمتجر:
- المنتجات: ${context.productsCount ?? 0} (${context.lowStockCount ?? 0} منخفضة الكمية)
- قيمة المخزون: ${context.inventoryValue ?? 0} ${cur}
- العملاء: ${context.customersCount ?? 0}
- ديون العملاء: ${context.totalDebt ?? 0} ${cur}
- مبيعات اليوم: ${context.todaySales ?? 0} ${cur} (${context.todaySalesCount ?? 0} فاتورة)
- ربح اليوم: ${context.todayProfit ?? 0} ${cur}
- مبيعات الشهر: ${context.monthSales ?? 0} ${cur}
- ربح الشهر: ${context.monthProfit ?? 0} ${cur}
- صافي الشهر: ${context.monthNet ?? 0} ${cur}
- أكثر منتج مبيعاً: ${context.topProduct ?? 'لا يوجد'}
- أهم عميل: ${context.topCustomer ?? 'لا يوجد'}

تذكّر: JSON فقط بدون أي نص قبله أو بعده.`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-4).map((h: any) => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: String(h.text || ''),
      })),
      {
        role: 'user',
        content: [
          { type: 'text', text: 'استمع للصوت ثم أعطني JSON بالنص المسموع وردك الذكي.' },
          {
            type: 'input_audio',
            input_audio: {
              data: audioBase64,
              format: apiFormat,
            },
          },
        ],
      },
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
        temperature: 0.4,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('Voice AI error:', response.status, errText);

      const userMsg =
        response.status === 400
          ? 'الصيغة الصوتية غير مدعومة من قبل خدمة الذكاء الاصطناعي. جرب الكتابة بدلاً من الصوت.'
          : `خدمة الصوت غير متاحة (${response.status}). جرب الكتابة بدلاً من الصوت.`;

      return new Response(
        JSON.stringify({ error: userMsg, details: errText.slice(0, 300) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = (data?.choices?.[0]?.message?.content || '{}').trim();

    let parsed: { transcription?: string; reply?: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          parsed = { transcription: '', reply: content };
        }
      } else {
        parsed = { transcription: '', reply: content };
      }
    }

    return new Response(
      JSON.stringify({
        transcription: (parsed.transcription || '').trim(),
        reply: (parsed.reply || 'لم أفهم، حاول مرة أخرى').trim(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('Voice chat exception:', e);
    return new Response(
      JSON.stringify({ error: e?.message || 'حدث خطأ في الخادم' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
