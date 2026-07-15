'use client';

import { useI18n } from './i18n-provider';

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <div className="lang-switch">
      <button className={lang === 'uk' ? 'active' : ''} onClick={() => setLang('uk')} type="button">
        UA
      </button>
      <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')} type="button">
        EN
      </button>
    </div>
  );
}
