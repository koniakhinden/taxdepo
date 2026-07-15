import { createClient } from '../lib/supabase/server';
import ReceiptList from './receipt-list';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: receipts } = await supabase
    .from('receipts')
    .select('*')
    .order('purchased_at', { ascending: false })
    .order('created_at', { ascending: false });

  const list = receipts || [];

  // Подписанные ссылки на превью фото
  const paths = list.filter((r) => r.image_path).map((r) => r.image_path);
  let urlMap = {};
  if (paths.length) {
    const { data: signed } = await supabase.storage
      .from('receipts')
      .createSignedUrls(paths, 3600);
    (signed || []).forEach((s) => {
      if (s.path && s.signedUrl) urlMap[s.path] = s.signedUrl;
    });
  }

  const withUrls = list.map((r) => ({
    ...r,
    thumb: r.image_path ? urlMap[r.image_path] || null : null,
  }));

  // Итоги по валютам
  const totals = {};
  for (const r of list) {
    totals[r.currency] = (totals[r.currency] || 0) + Number(r.amount);
  }

  return (
    <>
      <div className="topbar">
        <div className="brand">
          Учёт чеков <small>{user?.email}</small>
        </div>
        <form action="/auth/signout" method="post">
          <button className="btn secondary" type="submit">Выйти</button>
        </form>
      </div>

      <div className="container">
        <div className="row" style={{ marginBottom: 14 }}>
          <a href="/add" className="btn block">+ Добавить чек</a>
          <a href="/api/export" className="btn secondary block">⬇ Выгрузить для бухгалтера</a>
        </div>

        {list.length > 0 && (
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div className="muted">Всего чеков: <b style={{ color: 'var(--text)' }}>{list.length}</b></div>
            <div className="muted">
              Сумма:{' '}
              {Object.entries(totals).map(([cur, sum], i) => (
                <b key={cur} style={{ color: 'var(--text)', marginLeft: i ? 8 : 4 }}>
                  {sum.toFixed(2)} {cur}
                </b>
              ))}
            </div>
          </div>
        )}

        <ReceiptList initial={withUrls} />
      </div>
    </>
  );
}
