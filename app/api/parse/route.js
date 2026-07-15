import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '../../../lib/supabase/server';
import { CATEGORIES } from '../../../lib/categories';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Принимает фото чека (base64 data URL), возвращает распознанные поля.
export async function POST(request) {
  // Проверяем, что пользователь залогинен
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY не задан в переменных окружения' },
      { status: 500 }
    );
  }

  let imageDataUrl;
  try {
    const body = await request.json();
    imageDataUrl = body.image;
  } catch {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
  }

  if (!imageDataUrl || !imageDataUrl.startsWith('data:image')) {
    return NextResponse.json({ error: 'Фото не передано' }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `Ты — помощник по распознаванию чеков. Определи по фото:
- итоговую сумму (total),
- дату покупки в формате YYYY-MM-DD,
- валюту (ISO-код, например USD, EUR, PLN, RUB),
- название магазина/продавца,
- наиболее подходящую категорию расхода СТРОГО из списка: ${CATEGORIES.join('; ')}.

Верни ТОЛЬКО JSON без пояснений:
{"amount": number, "date": "YYYY-MM-DD", "currency": "XXX", "merchant": "string", "category": "одно из списка", "confidence": number 0..1}
Если какое-то поле не читается — поставь null (кроме category — выбери "Прочее").`;

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

    // Подстраховка: категория должна быть из списка
    if (!CATEGORIES.includes(parsed.category)) {
      parsed.category = 'Прочее';
    }

    return NextResponse.json({ data: parsed });
  } catch (err) {
    console.error('Parse error:', err);
    return NextResponse.json(
      { error: 'Не удалось распознать чек. Введи данные вручную.' },
      { status: 502 }
    );
  }
}
