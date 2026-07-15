'use client';

import { useI18n } from './i18n-provider';
import LanguageSwitcher from './language-switcher';
import ReceiptList from './receipt-list';

export default function DashboardClient({ email, receipts }) {
  const { t, lang } = useI18n();

  const totals = {};
  for (const r of receipts) {
    totals[r.currency] = (totals[r.currency] || 0) + Number(r.amount);
  }

  return (
    <>
      <div className="topbar">
        <div className="brand">
          {t('appTitle')} <small>{email}</small>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <LanguageSwitcher />
          <form action="/auth/signout" method="post">
            <button className="btn secondary" type="submit">{t('logout')}</button>
          </form>
        </div>
      </div>

      <div className="container">
        <div className="row" style={{ marginBottom: 14 }}>
          <a href="/add" className="btn block">{t('addReceipt')}</a>
          <a href={`/api/export?lang=${lang}`} className="btn secondary block">{t('exportBtn')}</a>
        </div>

        {receipts.length > 0 && (
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div className="muted">{t('totalReceipts')} <b style={{ color: 'var(--text)' }}>{receipts.length}</b></div>
            <div className="muted">
              {t('totalSum')}{' '}
              {Object.entries(totals).map(([cur, sum], i) => (
                <b key={cur} style={{ color: 'var(--text)', marginLeft: i ? 8 : 4 }}>
                  {sum.toFixed(2)} {cur}
                </b>
              ))}
            </div>
          </div>
        )}

        <ReceiptList initial={receipts} />
      </div>
    </>
  );
}
