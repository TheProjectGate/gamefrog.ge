import React from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '../store/useStore';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../i18n/config';

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'EN',
  ka: 'KA',
};

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const language = useStore(state => state.language);
  const setLanguage = useStore(state => state.setLanguage);

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
  };

  return (
    <div className="flex items-stretch h-10 border-4 border-black bg-white">
      {SUPPORTED_LANGUAGES.map((lang) => (
        <button
          key={lang}
          onClick={() => handleLanguageChange(lang)}
          className={`px-4 font-bold uppercase text-sm transition-colors flex items-center ${
            language === lang
              ? 'bg-[#FFD700] text-black'
              : 'text-black hover:bg-gray-200'
          }`}
          aria-label={`Switch to ${LANGUAGE_NAMES[lang]}`}
        >
          {LANGUAGE_NAMES[lang]}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;

