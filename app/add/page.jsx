'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { CATEGORIES } from '../../lib/categories';

export default function AddReceiptPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef(null);

  const [preview, setPreview] = useState('');   // data URL для показа + загрузки
  const [blob, setBlob] = useState(null);       // сжатый jpeg для Storage
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    purchased_at: '',
    category: 'Прочее',
    amount: '',
    currency: 'USD',
    merchant: '',
    note: '',
  });

  // Сжимает изображение через canvas: макс. сторона 1600px, jpeg 0.8
  async function compress(file) {
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
    const max = 1600;
    let { width, height } = img;
    if (width > max || height > max) {
      const k = Math.min(max / width, max / height);
      width = Math.round(width * k);
      height = Math.round(height * k);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const outBlob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.8));
    return { dataUrl, outBlob };
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    const { dataUrl, outBlob } = await compress(file);
    setPreview(dataUrl);
    setBlob(outBlob);
    analyze(dataUrl);
  }

  async function analyze(dataUrl) {
    setAnalyzing(true);
    setError('');
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Ошибка распознавания');
      const d = json.data || {};
      setForm((f) => ({
        ...f,
        purchased_at: d.date || f.purchased_at,
        amount: d.amount != null ? String(d.amount) : f.amount,
        currency: d.currency || f.currency,
        merchant: d.merchant || f.merchant,
        category: CATEGORIES.includes(d.category) ? d.category : 'Прочее',
      }));
    } catch (err) {
      setError(err.message + ' — заполни поля вручную.');
    } finally {
      setAnalyzing(false);
    }
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    if (!form.purchased_at || !form.amount) {
      setError('Укажи дату и сумму.');
      return;
    }
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Сессия истекла, войди заново.');

      let imagePath = null;
      if (blob) {
        const path = `${user.id}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from('receipts')
          .upload(path, blob, { contentType: 'image/jpeg' });
        if (upErr) throw upErr;
        imagePath = path;
      }

      const { error: insErr } = await supabase.from('receipts').insert({
        user_id: user.id,
        purchased_at: form.purchased_at,
        category: form.category,
        amount: Number(form.amount),
        currency: form.currency || 'USD',
        merchant: form.merchant || null,
        note: form.note || null,
        image_path: imagePath,
      });
      if (insErr) throw insErr;

      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <div className="brand">Новый чек</div>
        <a href="/" className="btn secondary">← Назад</a>
      </div>

      <div className="container">
        <div className="card">
          {!preview ? (
            <div className="dropzone" onClick={() => fileRef.current?.click()}>
              <div style={{ fontSize: 40 }}>📷</div>
              <div style={{ fontWeight: 600, marginTop: 8 }}>Сфотографировать / выбрать чек</div>
              <div className="muted" style={{ marginTop: 4 }}>
                Данные распознаются автоматически
              </div>
            </div>
          ) : (
            <>
              <img src={preview} alt="Чек" className="preview" />
              <button
                className="btn secondary"
                style={{ marginTop: 10 }}
                onClick={() => fileRef.current?.click()}
                type="button"
              >
                Заменить фото
              </button>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFile}
            style={{ display: 'none' }}
          />
          {analyzing && (
            <div className="muted" style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'rgba(37,99,235,.3)' }} />
              Распознаю чек…
            </div>
          )}
        </div>

        <form className="card" onSubmit={save}>
          <div className="row">
            <div>
              <label>Дата покупки</label>
              <input type="date" value={form.purchased_at} onChange={(e) => set('purchased_at', e.target.value)} required />
            </div>
            <div>
              <label>Сумма</label>
              <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => set('amount', e.target.value)} required />
            </div>
            <div style={{ maxWidth: 110 }}>
              <label>Валюта</label>
              <input value={form.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} maxLength={3} />
            </div>
          </div>

          <label>Категория</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label>Магазин / продавец</label>
          <input value={form.merchant} onChange={(e) => set('merchant', e.target.value)} placeholder="Необязательно" />

          <label>Заметка</label>
          <textarea rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Необязательно" />

          {error && <div className="error">{error}</div>}

          <button className="btn block" style={{ marginTop: 16 }} disabled={saving || analyzing}>
            {saving ? <span className="spinner" /> : 'Сохранить чек'}
          </button>
        </form>
      </div>
    </>
  );
}
