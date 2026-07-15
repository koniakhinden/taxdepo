'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { dictFor, DEFAULT_LANG } from '../lib/i18n';

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT_LANG);

  // Читаем сохранённый язык после монтирования (localStorage доступен только в браузере)
  useEffect(() => {
    const saved = localStorage.getItem('lang');
    if (saved === 'uk' || saved === 'en') setLangState(saved);
  }, []);

  function setLang(l) {
    setLangState(l);
    try {
      localStorage.setItem('lang', l);
      // Дублируем в cookie, чтобы серверная выгрузка тоже знала язык
      document.cookie = `lang=${l};path=/;max-age=31536000`;
    } catch {}
  }

  const dict = dictFor(lang);
  const t = (key) => dict[key] ?? key;

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) return { lang: DEFAULT_LANG, setLang: () => {}, t: (k) => k };
  return ctx;
}
