import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '../../../lib/supabase/server';
import { categoriesFor, OTHER, CURRENCIES, DEFAULT_CURRENCY } from '../../../lib/i18n';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Принимает фото чека (base64 data URL) и язык, возвращает распознанные поля.
export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not set' },
      { status: 500 }
    );
  }

  let imageDataUrl;
  let lang = 'uk';
  try {
    const body = await request.json();
    imageDataUrl = body.image;
    if (body.lang === 'en') lang = 'en';
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  if (!imageDataUrl || !imageDataUrl.startsWith('data:image')) {
    return NextResponse.json({ error: 'No image' }, { status: 400 });
  }

  const categories = categoriesFor(lang);
  const other = OTHER[lang];

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `You extract data from a photo of a purchase receipt. Read:
- total amount actually paid (the final TOTAL, including tip/taxes if shown);
- purchase date in YYYY-MM-DD format;
- currency, one of: ${CURRENCIES.join(', ')} (default ${DEFAULT_CURRENCY} if unclear);
- merchant / store name;
- the single best expense category, chosen STRICTLY from this list: ${categories.join('; ')}.

Return ONLY JSON, no explanations:
{"amount": number, "date": "YYYY-MM-DD", "currency": "XXX", "merchant": "string", "category": "one item from the list", "confidence": number 0..1}
If a field is unreadable, set it to null (except category — use "${other}").`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageDataUrl, detail: 'high' } },
          ],
        },
      ],
      max_tokens: 400,
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);

    if (!categories.includes(parsed.category)) parsed.category = other;
    if (!CURRENCIES.includes(parsed.currency)) parsed.currency = DEFAULT_CURRENCY;

    return NextResponse.json({ data: parsed });
  } catch (err) {
    console.error('Parse error:', err);
    return NextResponse.json(
      { error: 'Recognition failed' },
      { status: 502 }
    );
  }
}
