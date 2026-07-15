'use client';

import { useMemo, useState } from 'react';
import { useI18n } from './i18n-provider';
import LanguageSwitcher from './language-switcher';
import { categoriesFor, OTHER, MONTHS, deductibleShare } from '../lib/i18n';

const OTHERS = [OTHER.uk, OTHER.en];

export default function DashboardClient({ email, receipts }) {
  const { t, lang } = useI18n();

  const money = (n, cur) =>
    new Intl.NumberFormat(lang === 'uk' ? 'uk-UA' : 'en-CA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n || 0) + (cur ? ` ${cur}` : '');

  // ----- доступные годы и валюты -----
  const years = useMemo(() => {
    const s = new Set();
    receipts.forEach((r) => r.purchased_at && s.add(r.purchased_at.slice(0, 4)));
    return [...s].sort().reverse();
  }, [receipts]);

  const [year, setYear] = useState(years[0] || String(new Date().getFullYear()));
  const [cat, setCat] = useState('all');
  const [cur, setCur] = useState('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('new');

  // строки выбранного года (для аналитики)
  const yearRows = useMemo(
    () => (year === 'all' ? receipts : receipts.filter((r) => (r.purchased_at || '').startsWith(year))),
    [receipts, year]
  );

  // основная валюта — самая частая среди строк года
  const primaryCur = useMemo(() => {
    const c = {};
    yearRows.forEach((r) => (c[r.currency] = (c[r.currency] || 0) + 1));
    return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || 'CAD';
  }, [yearRows]);

  const analyticsRows = useMemo(
    () => yearRows.filter((r) => r.currency === primaryCur),
    [yearRows, primaryCur]
  );

  // ----- метрики -----
  const spending = analyticsRows.reduce((s, r) => s + Number(r.amount), 0);
  const deductible = analyticsRows.reduce(
    (s, r) => s + Number(r.amount) * deductibleShare(r.usage_type, r.business_percent),
    0
  );
  const isComplete = (r) => !!r.merchant && !!r.category && !OTHERS.includes(r.category);
  const filledCount = yearRows.filter(isComplete).length;
  const filledPct = yearRows.length ? Math.round((filledCount / yearRows.length) * 100) : 0;
  const noCatCount = yearRows.filter((r) => !r.category || OTHERS.includes(r.category)).length;
  const otherCurs = [...new Set(yearRows.filter((r) => r.currency !== primaryCur).map((r) => r.currency))];

  // ----- график по месяцам (выбранный год) -----
  const monthly = useMemo(() => {
    const arr = new Array(12).fill(0);
    analyticsRows.forEach((r) => {
      const m = Number((r.purchased_at || '').slice(5, 7)) - 1;
      if (m >= 0 && m < 12) arr[m] += Number(r.amount);
    });
    return arr;
  }, [analyticsRows]);
  const monthlyMax = Math.max(1, ...monthly);

  // ----- разбивка по категориям -----
  const byCat = useMemo(() => {
    const m = {};
    analyticsRows.forEach((r) => (m[r.category || OTHER[lang]] = (m[r.category || OTHER[lang]] || 0) + Number(r.amount)));
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [analyticsRows, lang]);
  const catMax = Math.max(1, ...byCat.map(([, v]) => v));

  // ----- дубликаты -----
  const dupKeys = useMemo(() => {
    const c = {};
    receipts.forEach((r) => {
      const k = `${r.amount}|${r.purchased_at}|${r.merchant || ''}`;
      c[k] = (c[k] || 0) + 1;
    });
    return c;
  }, [receipts]);

  function statusOf(r) {
    const k = `${r.amount}|${r.purchased_at}|${r.merchant || ''}`;
    if (dupKeys[k] > 1) return { cls: 'dup', label: t('stDup') };
    if (!r.category || OTHERS.includes(r.category)) return { cls: 'warn', label: t('stNoCat') };
    if (!r.merchant || !r.note) return { cls: 'info', label: t('stCheck') };
    return { cls: 'ok', label: t('stComplete') };
  }

  // ----- отфильтрованный список -----
  const filtered = useMemo(() => {
    let list = yearRows;
    if (cat !== 'all') list = list.filter((r) => r.category === cat);
    if (cur !== 'all') list = list.filter((r) => r.currency === cur);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((r) => (r.merchant || '').toLowerCase().includes(s));
    }
    list = [...list].sort((a, b) => {
      if (sort === 'amt-desc') return Number(b.amount) - Number(a.amount);
      if (sort === 'amt-asc') return Number(a.amount) - Number(b.amount);
      const cmp = (a.purchased_at || '').localeCompare(b.purchased_at || '');
      return sort === 'old' ? cmp : -cmp;
    });
    return list;
  }, [yearRows, cat, cur, q, sort]);

  // группировка по месяцам
  const groups = useMemo(() => {
    const g = [];
    const idx = {};
    filtered.forEach((r) => {
      const key = (r.purchased_at || '0000-00').slice(0, 7);
      if (!(key in idx)) {
        idx[key] = g.length;
        g.push({ key, items: [] });
      }
      g[idx[key]].items.push(r);
    });
    return g;
  }, [filtered]);

  const monthLabel = (key) => {
    const [y, m] = key.split('-');
    return `${MONTHS[lang][Number(m) - 1] || m} ${y}`;
  };
  const fmtDate = (d) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}.${m}.${y}`;
  };
  const catList = categoriesFor(lang);
  const allCurs = [...new Set(receipts.map((r) => r.currency))];

  return (
    <>
      <div className="topbar">
        <div className="brand">
          <span className="logo">₿</span>
          {t('appTitle')} <small>{email}</small>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <LanguageSwitcher />
          <form action="/auth/signout" method="post">
            <button className="btn secondary sm" type="submit">{t('logout')}</button>
          </form>
        </div>
      </div>

      <div className="container">
        {/* верхняя строка: год + добавить */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <select value={year} onChange={(e) => setYear(e.target.value)} style={{ width: 'auto', fontWeight: 600 }}>
            <option value="all">{t('allYears')}</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <a href="/add" className="btn">{t('addReceipt')}</a>
        </div>

        {receipts.length === 0 ? (
          <div className="card empty">
            {t('emptyLine1')}<br />{t('emptyLine2')}
          </div>
        ) : (
          <>
            {/* метрики */}
            <div className="metrics">
              <div className="metric">
                <div className="k"><span className="badge-ico" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>∑</span>{t('metricSpending')}</div>
                <div className="v">{money(spending)} <small>{primaryCur}</small></div>
              </div>
              <div className="metric">
                <div className="k"><span className="badge-ico" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>🧾</span>{t('metricReceipts')}</div>
                <div className="v">{yearRows.length}</div>
              </div>
              <div className="metric accent">
                <div className="k"><span className="badge-ico" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>✓</span>{t('metricDeductible')}</div>
                <div className="v">{money(deductible)} <small>{primaryCur}</small></div>
              </div>
              <div className="metric">
                <div className="k"><span className="badge-ico" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>◔</span>{t('metricFilled')}</div>
                <div className="v">{filledPct}<small>%</small></div>
              </div>
            </div>
            {otherCurs.length > 0 && (
              <div className="muted" style={{ margin: '2px 4px 10px' }}>
                + {otherCurs.join(', ')}
              </div>
            )}

            {/* готовность */}
            <div className="card readiness">
              <h3>{t('readinessTitle')}</h3>
              <div className="pct">{filledPct}%</div>
              <div className="bar"><span style={{ width: `${filledPct}%` }} /></div>
              {filledPct === 100 ? (
                <div className="hint ok"><span className="dot" />{t('allGood')}</div>
              ) : (
                <>
                  {noCatCount > 0 && <div className="hint"><span className="dot" />{t('hintNoCategory').replace('{n}', noCatCount)}</div>}
                </>
              )}
            </div>

            {/* графики */}
            <div className="split">
              <div className="card">
                <h3>{t('byMonth')} · {primaryCur}</h3>
                <div className="bars">
                  {monthly.map((v, i) => (
                    <div className="col" key={i} title={money(v, primaryCur)}>
                      <div className={`fill${v === 0 ? ' dim' : ''}`} style={{ height: `${(v / monthlyMax) * 100}%` }} />
                      <div className="m">{MONTHS[lang][i]}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <h3>{t('byCategory')} · {primaryCur}</h3>
                {byCat.length === 0 && <div className="muted">—</div>}
                {byCat.map(([name, v]) => (
                  <div className="cat-row" key={name}>
                    <span className="name" title={name}>{name}</span>
                    <span className="track"><span style={{ width: `${(v / catMax) * 100}%` }} /></span>
                    <span className="val">{money(v)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* для бухгалтера */}
            <div className="card">
              <h3>{t('forAccountant')}</h3>
              <div className="row" style={{ marginBottom: 12 }}>
                <div><div className="muted">{t('metricReceipts')}</div><b>{yearRows.length}</b></div>
                <div><div className="muted">{t('accFilled')}</div><b>{filledCount}</b></div>
                <div><div className="muted">{t('accNeedCheck')}</div><b>{yearRows.length - filledCount}</b></div>
              </div>
              <a href={`/api/export?lang=${lang}${year !== 'all' ? `&year=${year}` : ''}`} className="btn green block">
                {t('exportExcel')}
              </a>
            </div>

            {/* список */}
            <div className="section-title">{t('allReceipts')}</div>
            <div className="filters">
              <input className="search" placeholder={t('searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} />
              <select value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value="all">{t('filterCategoryAll')}</option>
                {catList.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {allCurs.length > 1 && (
                <select value={cur} onChange={(e) => setCur(e.target.value)}>
                  <option value="all">{t('filterCurrencyAll')}</option>
                  {allCurs.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="new">{t('sortNew')}</option>
                <option value="old">{t('sortOld')}</option>
                <option value="amt-desc">{t('sortAmtDesc')}</option>
                <option value="amt-asc">{t('sortAmtAsc')}</option>
              </select>
            </div>

            {groups.length === 0 && <div className="card empty">{t('nothingFound')}</div>}

            {groups.map((g) => {
              const mSum = {};
              g.items.forEach((r) => (mSum[r.currency] = (mSum[r.currency] || 0) + Number(r.amount)));
              return (
                <div key={g.key}>
                  <div className="month-head">
                    <span className="mt">{monthLabel(g.key)}</span>
                    <span className="ms">
                      {Object.entries(mSum).map(([c, s]) => `${money(s)} ${c}`).join(' · ')}
                    </span>
                  </div>
                  {g.items.map((r) => {
                    const st = statusOf(r);
                    return (
                      <div className="receipt" key={r.id}>
                        <a href={`/receipt/${r.id}`} className="open">
                          {r.thumb ? <img src={r.thumb} alt="" className="thumb" /> : <div className="thumb" />}
                          <div className="info">
                            <div className="top">
                              <span className="cat">{r.category}</span>
                              <span className="amt">{money(r.amount)} {r.currency}</span>
                            </div>
                            <div className="sub">
                              <span>{fmtDate(r.purchased_at)}</span>
                              {r.merchant && <span>· {r.merchant}</span>}
                              <span className={`badge ${st.cls}`}>{st.label}</span>
                            </div>
                          </div>
                        </a>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}
      </div>

      <a href="/add" className="fab">＋ {t('addReceipt').replace('+ ', '').replace('+', '')}</a>
    </>
  );
}
