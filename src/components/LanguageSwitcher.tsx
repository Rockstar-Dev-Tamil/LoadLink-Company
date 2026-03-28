import React from 'react';
import { useTranslation } from 'react-i18next';

const langs = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ta', label: 'TA', name: 'Tamil' },
  { code: 'hi', label: 'HI', name: 'Hindi' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const currentIndex = Math.max(
    0,
    langs.findIndex((lang) => lang.code === i18n.language),
  );
  const current = langs[currentIndex] ?? langs[0];
  const next = langs[(currentIndex + 1) % langs.length];

  return (
    <button
      onClick={() => i18n.changeLanguage(next.code)}
      className="px-3.5 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all duration-300 bg-[var(--surface-soft)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-strong)] hover:border-[var(--border-strong)]"
      title={`Switch to ${next.name}`}
    >
      {current.label}
    </button>
  );
}
