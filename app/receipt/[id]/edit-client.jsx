'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import { useI18n } from '../../i18n-provider';
import LanguageSwitcher from '../../language-switcher';
import { processImage } from '../../../lib/image';
import { categoriesFor, CURRENCIES, DEFAULT_CURRENCY, OTHER } from '../../../lib/i18n';

export default function EditClient({ receipt, photoUrl }) {
  const router = useRouter();
  const supabase = createClient();
  const { t, lang } = useI18n();
  const fileRef = useRef(null);

  const categories = categoriesFor(lang);

  const [preview, setPreview] = useState(photoUrl || '');
  const [newBlob, setNewBlob] = useState(null); // если заменили фото
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(
    receipt
      ? {
          purchased_at: receipt.purchased_at || '',
          category: receipt.category || OTHER[lang],
          amount: receipt.amount != null ? String(receipt.amount) : '',
          currency: receipt.currency || DEFAULT_CURRENCY,
          merchant: receipt.merchant || '',
          note: receipt.note || '',
        }
      : null
  );

  if (!receipt) {
    return (
      <>
        <div className="topbar">
          <div className="brand">{t('editReceipt')}</div>
          <a href="/" className="btn secondary">{t('back')}</a>
        </div>
        <div className="container">
          <div className="card empty">{t('notFound')}</div>
        </div>
      </>
    );
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setProcessing(true);
    try {
      const { dataUrl, blob } = await processImage(file);
      setPreview(dataUrl);
      setNewBlob(blob);
    } catch {
      setError(t('notRecognized'));
    } finally {
      setProcessing(false);
    }
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

      let imagePath = receipt.image_path;

      // Если заменили фото — грузим новое и удаляем старое
      if (newBlob) {
        const path = `${user.id}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from('receipts')
          .upload(path, newBlob, { contentType: 'image/jpeg' });
        if (upErr) throw upErr;
        if (receipt.image_path) {
          await supabase.storage.from('receipts').remove([receipt.image_path]);
        }
        imagePath = path;
      }

      const { error: updErr } = await supabase
        .from('receipts')
        .update({
          purchased_at: form.purchased_at,
          category: form.category,
          amount: Number(form.amount),
          currency: form.currency || DEFAULT_CURRENCY,
          merchant: form.merchant || null,
          note: form.note || null,
          image_path: imagePath,
        })
        .eq('id', receipt.id);
      if (updErr) throw updErr;

      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(t('deleteConfirm'))) return;
    setDeleting(true);
    try {
      if (receipt.image_path) {
        await supabase.storage.from('receipts').remove([receipt.image_path]);
      }
      const { error } = await supabase.from('receipts').delete().eq('id', receipt.id);
      if (error) throw error;
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(t('deleteFail') + err.message);
      setDeleting(false);
    }
  }

  const categoryOptions = categories.includes(form.category)
    ? categories
    : [form.category, ...categories];

  return (
    <>
      <div className="topbar">
        <div className="brand">{t('editReceipt')}</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <LanguageSwitcher />
          <a href="/" className="btn secondary">{t('back')}</a>
        </div>
      </div>

      <div className="container">
        <div className="card">
          {preview ? (
            <img src={preview} alt="" className="preview-full" />
          ) : (
            <div className="empty">—</div>
          )}
          <button
            className="btn secondary"
            style={{ marginTop: 10 }}
            onClick={() => fileRef.current?.click()}
            type="button"
          >
            {t('replacePhoto')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFile}
            style={{ display: 'none' }}
          />
          {processing && (
            <div className="muted" style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'rgba(37,99,235,.3)' }} />
              {t('processingPhoto')}
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
            {categoryOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label>{t('merchantLabel')}</label>
          <input value={form.merchant} onChange={(e) => set('merchant', e.target.value)} placeholder={t('optional')} />

          <label>{t('noteLabel')}</label>
          <textarea rows={2} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder={t('optional')} />

          {error && <div className="error">{error}</div>}

          <button className="btn block" style={{ marginTop: 16 }} disabled={saving || deleting || processing}>
            {saving ? <span className="spinner" /> : t('updateBtn')}
          </button>
          <button
            type="button"
            className="btn danger block"
            style={{ marginTop: 10 }}
            onClick={remove}
            disabled={saving || deleting}
          >
            {deleting ? '…' : t('deleteBtn')}
          </button>
        </form>
      </div>
    </>
  );
}
