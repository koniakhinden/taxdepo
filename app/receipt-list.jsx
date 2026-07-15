'use client';

import { useState } from 'react';
import { createClient } from '../lib/supabase/client';

export default function ReceiptList({ initial }) {
  const supabase = createClient();
  const [items, setItems] = useState(initial);
  const [busyId, setBusyId] = useState(null);

  async function remove(r) {
    if (!confirm('Удалить этот чек?')) return;
    setBusyId(r.id);
    try {
      if (r.image_path) {
        await supabase.storage.from('receipts').remove([r.image_path]);
      }
      const { error } = await supabase.from('receipts').delete().eq('id', r.id);
      if (error) throw error;
      setItems((list) => list.filter((x) => x.id !== r.id));
    } catch (err) {
      alert('Не удалось удалить: ' + err.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!items.length) {
    return (
      <div className="card empty">
        Пока нет чеков.<br />
        Нажми «Добавить чек» и сфотографируй первый.
      </div>
    );
  }

  return (
    <div>
      {items.map((r) => (
        <div className="receipt" key={r.id}>
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
          <button
            className="btn danger"
            onClick={() => remove(r)}
            disabled={busyId === r.id}
            title="Удалить"
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
