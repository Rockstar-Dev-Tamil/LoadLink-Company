import { useState, useEffect } from 'react';
import { strings } from '../locales/strings';

type LangCode = 'en' | 'hi' | 'ta';

export function useI18n() {
  const [lang, setLangState] = useState<LangCode>(() => {
    const stored = localStorage.getItem('loadlink_lang');
    return (stored as LangCode) || 'en';
  });

  const setLang = (newLang: LangCode) => {
    setLangState(newLang);
    localStorage.setItem('loadlink_lang', newLang);
  };

  const t = (path: string): string => {
    const keys = path.split('.');
    let value: any = (strings as Record<string, any>)[lang];
    for (const key of keys) {
      if (!value || typeof value !== 'object' || !value[key]) return path;
      value = value[key];
    }
    return typeof value === 'string' ? value : path;
  };

  return { lang, setLang, t };
}
