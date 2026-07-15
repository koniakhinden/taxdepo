'use client';

import { useState } from 'react';
import { createClient } from '../lib/supabase/client';
import { useI18n } from './i18n-provider';

export default function ReceiptList({ initial }) {
  const supabase = createClient();
  const { t } = useI18n();
  const [items, setItems] = useState(initial);
  const [busyId, setBusyId] = useState(null);

  async function remove(r) {
    if (!confirm(t('deleteConfirm'))) return;
    setBusyId(r.id);
    try {
      if (r.image_path) {
        await supabase.storage.from('receipts').remove([r.image_path]);
      }
      const { error } = await supabase.from('receipts').delete().eq('id', r.id);
      if (error) throw error;
      setItems((list) => list.filter((x) => x.id !== r.id));
    } catch (err) {
      alert(t('deleteFail') + err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!items.length) {
    return (
      <div className="card empty">
        {t('emptyLine1')}<br />
        {t('emptyLine2')}
      </div>
    );
  }

  return (
    <div>
      {items.map((r) => (
        <div className="receipt" key={r.id}>
          <a href={`/receipt/${r.id}`} className="open">
            {r.thumb ? (
              <img src={r.thumb} alt="" className="thumb" />
            ) : (
              <div className="thumb" />
            )}
            <div className="info">
              <div className="top">
                <span className="cat">{r.category}</span>
                <span className="amt">
                  {Number(r.amount).toFixed(2)} {r.currency}
                </span>
              </div>
              <div className="sub">
                {formatDate(r.purchased_at)}
                {r.merchant ? ` · ${r.merchant}` : ''}
                {r.note ? ` · ${r.note}` : ''}
              </div>
            </div>
          </a>
          <button
            className="btn danger"
            onClick={() => remove(r)}
            disabled={busyId === r.id}
            title="✕"
          >
            {busyId === r.id ? '…' : '✕'}
          </button>
        </div>
      ))}
    </div>
  );
}

function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
}
