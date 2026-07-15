'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { useI18n } from '../i18n-provider';
import LanguageSwitcher from '../language-switcher';
import { processImage } from '../../lib/image';
import { categoriesFor, CURRENCIES, DEFAULT_CURRENCY, OTHER } from '../../lib/i18n';

export default function AddReceiptPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t, lang } = useI18n();
  const fileRef = useRef(null);

  const categories = categoriesFor(lang);

  const [preview, setPreview] = useState('');
  const [blob, setBlob] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    purchased_at: '',
    category: OTHER[lang],
    amount: '',
    currency: DEFAULT_CURRENCY,
    merchant: '',
    note: '',
  });

  useEffect(() => {
    setForm((f) => (categories.includes(f.category) ? f : { ...f, category: OTHER[lang] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setProcessing(true);
    try {
      const { dataUrl, blob: outBlob } = await processImage(file);
      setPreview(dataUrl);
      setBlob(outBlob);
      setProcessing(false);
      analyze(dataUrl);
    } catch (err) {
      setProcessing(false);
      setError(t('notRecognized'));
    }
  }

  async function analyze(dataUrl) {
    setAnalyzing(true);
    setError('');
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, lang }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'error');
      const d = json.data || {};

      if (d.amount == null && !d.date) setError(t('notRecognized'));

      setForm((f) => ({
        ...f,
        purchased_at: d.date || f.purchased_at,
        amount: d.amount != null ? String(d.amount) : f.amount,
        currency: CURRENCIES.includes(d.currency) ? d.currency : f.currency,
        merchant: d.merchant || f.merchant,
        category: categories.includes(d.category) ? d.category : f.category,
      }));
    } catch (err) {
      setError(t('notRecognized'));
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
      setError(t('fillDateAmount'));
      return;
    }
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error(t('sessionExpired'));

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
        currency: form.currency || DEFAULT_CURRENCY,
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

  const busy = processing || analyzing;

  return (
    <>
      <div className="topbar">
        <div className="brand">{t('newReceipt')}</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <LanguageSwitcher />
          <a href="/" className="btn secondary">{t('back')}</a>
        </div>
      </div>

      <div className="container">
        <div className="card">
          {!preview ? (
            <div className="dropzone" onClick={() => fileRef.current?.click()}>
              <div style={{ fontSize: 40 }}>📷</div>
              <div style={{ fontWeight: 600, marginTop: 8 }}>{t('takePhoto')}</div>
              <div className="muted" style={{ marginTop: 4 }}>{t('autoRecognized')}</div>
            </div>
          ) : (
            <>
              <img src={preview} alt="" className="preview" />
              <button
                className="btn secondary"
                style={{ marginTop: 10 }}
                onClick={() => fileRef.current?.click()}
                type="button"
              >
                {t('replacePhoto')}
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
          {busy && (
            <div className="muted" style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'rgba(37,99,235,.3)' }} />
              {processing ? t('processingPhoto') : t('recognizing')}
            </div>
          )}
        </div>

        <form className="card" onSubmit={save}>
          <label>{t('dateLabel')}</label>
          <input type="date" value={form.purchased_at} onChange={(e) => set('purchased_at', e.target.value)} required />

          <div className="form-row" style={{ marginTop: 10 }}>
            <div>
              <label style={{ marginTop: 0 }}>{t('amountLabel')}</label>
              <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => set('amount', e.target.value)} required />
            </div>
            <div style={{ maxWidth: 120 }}>
              <label style={{ marginTop: 0 }}>{t('currencyLabel')}</label>
              <select value={form.currency} onChange={(e) => set('currency', e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <label>{t('categoryLabel')}</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label>{t('merchantLabel')}</label>
          <input value={form.merchant} onChange={(e) => set('merchant', e.target.value)} placeholder={t('optional')} />

          <label>{t('noteLabel')}</label>
          <textarea rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder={t('optional')} />

          {error && <div className="error">{error}</div>}

          <button className="btn block" style={{ marginTop: 16 }} disabled={saving || busy}>
            {saving ? <span className="spinner" /> : t('saveBtn')}
          </button>
        </form>
      </div>
    </>
  );
}
