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
        JSON.stringify({ error: 'OnSpace AI: missing configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cur = context.currency || 'جنيه';

    // Map format to MIME type
    const mimeMap: Record<string, string> = {
      m4a: 'audio/mp4',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      webm: 'audio/webm',
      aac: 'audio/aac',
      ogg: 'audio/ogg',
    };
    const mimeType = mimeMap[audioFormat] || 'audio/mp4';

    const systemPrompt = `أنت "ذكي"، مساعد ذكاء اصطناعي عربي خبير في إدارة المتاجر والمخازن.

المستخدم سجّل صوتاً بالعربية (مصرية أو فصحى أو خليجية). استمع جيداً وأعطني الإجابة كـ JSON بالشكل التالي بالضبط:
{"transcription":"<النص المسموع كما قاله المستخدم بالحرف>","reply":"<ردك الذكي القصير>"}

قواعد ردك:
- ردك قصير جداً (جملة أو جملتين فقط لأنه سيُنطق بصوت)
- بالعربية الفصحى الواضحة فقط
- استخدم الأرقام الحقيقية من البيانات
- ممنوع أي رموز أو إيموجي أو أحرف خاصة في ردك
- كن مباشراً، عملياً، ذكياً، ودوداً
- لو مفيش بيانات للإجابة، اطلب توضيحاً قصيراً

بيانات المتجر اللحظية:
- المنتجات: ${context.productsCount ?? 0} (${context.lowStockCount ?? 0} منخفضة الكمية)
- قيمة المخزون: ${context.inventoryValue ?? 0} ${cur}
- العملاء: ${context.customersCount ?? 0}
- ديون العملاء: ${context.totalDebt ?? 0} ${cur}
- مبيعات اليوم: ${context.todaySales ?? 0} ${cur} (${context.todaySalesCount ?? 0} فاتورة)
- ربح اليوم: ${context.todayProfit ?? 0} ${cur}
- مبيعات الشهر: ${context.monthSales ?? 0} ${cur}
- ربح الشهر: ${context.monthProfit ?? 0} ${cur}
- مصروفات الشهر: ${context.monthExpenses ?? 0} ${cur}
- صافي الشهر: ${context.monthNet ?? 0} ${cur}
- أكثر منتج مبيعاً: ${context.topProduct ?? 'لا يوجد'}
- أهم عميل: ${context.topCustomer ?? 'لا يوجد'}

تذكّر: JSON فقط، بدون أي نص قبله أو بعده.`;

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
              format: audioFormat === 'webm' ? 'webm' : audioFormat === 'mp3' ? 'mp3' : audioFormat === 'wav' ? 'wav' : 'm4a',
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
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('Voice AI error:', response.status, errText);
      return new Response(
        JSON.stringify({
          error: `OnSpace AI: ${response.status} - ${errText.slice(0, 250)}`,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = (data?.choices?.[0]?.message?.content || '{}').trim();

    let parsed: { transcription?: string; reply?: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try extracting JSON from markdown or freeform text
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
      JSON.stringify({ error: e?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
