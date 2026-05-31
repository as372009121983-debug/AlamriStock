// Powered by OnSpace.AI
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const image: string | undefined = body?.image;

    if (!image || typeof image !== 'string') {
      return new Response(
        JSON.stringify({ error: 'يجب توفير صورة صالحة' }),
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

    const systemPrompt = `أنت خبير في استخراج بيانات المنتجات من فواتير وقوائم أسعار وإيصالات.
المهمة: استخرج المنتجات من الصورة وأرجع JSON array فقط بدون أي شرح أو markdown.
كل عنصر يجب أن يكون كائن بهذا الشكل بالضبط:
{"name": "اسم المنتج", "quantity": رقم, "price": رقم, "unit": "الوحدة (اختياري)"}
- name: اسم المنتج كما يظهر في الصورة (احتفظ بالعربية كما هي)
- quantity: الكمية كرقم (افتراضي 1 إذا غير موجودة)
- price: السعر كرقم (افتراضي 0 إذا غير موجود، استخرج فقط الرقم بدون عملة)
- unit: وحدة القياس مثل "قطعة" أو "كرتون" (اختياري)
إذا لم تجد منتجات أرجع [].
أرجع JSON صحيح وصالح فقط. لا تضع \`\`\`json أو أي تنسيق آخر.`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'استخرج المنتجات من هذه الصورة وأرجع JSON array فقط. لا تضع أي شرح أو markdown.',
              },
              { type: 'image_url', image_url: { url: image } },
            ],
          },
        ],
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
    let content: string = data?.choices?.[0]?.message?.content || '[]';

    // Clean potential markdown wrapping
    content = content.trim();
    content = content.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    content = content.trim();

    // Extract JSON array from content
    let products: any[] = [];
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        products = parsed;
      } else if (parsed && Array.isArray(parsed.products)) {
        products = parsed.products;
      }
    } catch {
      // Try to find JSON array within text
      const match = content.match(/\[\s*[\s\S]*?\s*\]/);
      if (match) {
        try {
          products = JSON.parse(match[0]);
        } catch {
          products = [];
        }
      }
    }

    // Sanitize entries
    products = products
      .map((p: any) => ({
        name: String(p?.name || '').trim(),
        quantity:
          typeof p?.quantity === 'number'
            ? p.quantity
            : parseFloat(String(p?.quantity || '1')) || 1,
        price:
          typeof p?.price === 'number'
            ? p.price
            : parseFloat(String(p?.price || '0')) || 0,
        unit: p?.unit ? String(p.unit).trim() : undefined,
      }))
      .filter((p: any) => p.name.length > 0);

    return new Response(JSON.stringify({ products }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('OCR function exception:', e);
    return new Response(
      JSON.stringify({ error: e?.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
