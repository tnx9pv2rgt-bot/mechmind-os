/**
 * LanguageSwitcher Component
 * Componente per cambiare lingua con accessibilità
 * WCAG 2.1 - Criterion 3.1.1: Language of Page
 * WCAG 2.1 - Criterion 3.1.2: Language of Parts
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  changeLanguage, 
  getCurrentLanguage, 
  Language, 
  LANGUAGE_NAMES,
  SUPPORTED_LANGUAGES 
} from '@/i18n';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { announce } from './Announcer';

interface LanguageSwitcherProps {
  /** Stile del componente */
  variant?: 'dropdown' | 'buttons' | 'select';
  /** Mostra solo icone */
  showFlagsOnly?: boolean;
  /** Classe CSS aggiuntiva */
  className?: string;
  /** Callback quando cambia lingua */
  onLanguageChange?: (lang: Language) => void;
}

/**
 * LanguageSwitcher - Componente per cambiare lingua
 * Accessibile con tastiera e screen reader
 */
export function LanguageSwitcher({
  variant = 'dropdown',
  showFlagsOnly = false,
  className = '',
  onLanguageChange,
}: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation('a11y');
  const currentLang = getCurrentLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Chiudi dropdown quando clicco fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Chiudi con Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Cambia lingua
  const handleLanguageChange = useCallback(async (lang: Language) => {
    if (lang === currentLang) {
      setIsOpen(false);
      return;
    }

    await changeLanguage(lang);
    announce(t('language.changed', { lang: LANGUAGE_NAMES[lang].name }), 'polite');
    setIsOpen(false);
    onLanguageChange?.(lang);
  }, [currentLang, onLanguageChange, t]);

  // Keyboard navigation per dropdown
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) return;

    const languages = SUPPORTED_LANGUAGES;
    const currentIndex = languages.indexOf(currentLang);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        {
          const nextIndex = (currentIndex + 1) % languages.length;
          const nextButton = menuRef.current?.querySelector(
            `[data-lang="${languages[nextIndex]}"]`
          ) as HTMLButtonElement;
          nextButton?.focus();
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        {
          const prevIndex = (currentIndex - 1 + languages.length) % languages.length;
          const prevButton = menuRef.current?.querySelector(
            `[data-lang="${languages[prevIndex]}"]`
          ) as HTMLButtonElement;
          prevButton?.focus();
        }
        break;
      case 'Home':
        event.preventDefault();
        {
          const firstButton = menuRef.current?.querySelector(
            `[data-lang="${languages[0]}"]`
          ) as HTMLButtonElement;
          firstButton?.focus();
        }
        break;
      case 'End':
        event.preventDefault();
        {
          const lastButton = menuRef.current?.querySelector(
            `[data-lang="${languages[languages.length - 1]}"]`
          ) as HTMLButtonElement;
          lastButton?.focus();
        }
        break;
    }
  };

  // Render variant: buttons
  if (variant === 'buttons') {
    return (
      <div 
        role="group" 
        aria-label={t('language.selector')}
        className={`flex gap-2 ${className}`}
      >
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isActive = lang === currentLang;
          const { flag, name, ariaLabel } = LANGUAGE_NAMES[lang];
          
          return (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              aria-label={ariaLabel}
              aria-pressed={isActive}
              className={`
                px-3 py-2 rounded-md font-medium transition-colors
                flex items-center gap-2
                ${isActive 
                  ? 'bg-[var(--brand)] text-[var(--text-on-brand)]' 
                  : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface-secondary)]/80'
                }
                focus:outline-none focus:ring-2 focus:ring-[var(--border-default)] focus:ring-offset-2
              `}
            >
              <span aria-hidden="true">{flag}</span>
              {!showFlagsOnly && <span>{name}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  // Render variant: select
  if (variant === 'select') {
    return (
      <div className={className}>
        <label htmlFor="language-select" className="sr-only">
          {t('language.selector')}
        </label>
        <select
          id="language-select"
          value={currentLang}
          onChange={(e) => handleLanguageChange(e.target.value as Language)}
          className="
            px-3 py-2 rounded-md border bg-[var(--surface-primary)]
            focus:outline-none focus:ring-2 focus:ring-[var(--border-default)]
          "
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {LANGUAGE_NAMES[lang].flag} {LANGUAGE_NAMES[lang].name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Render variant: dropdown (default)
  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        ref={buttonRef}
        id="language-menu-button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${t('language.current', { lang: LANGUAGE_NAMES[currentLang].name })}. ${t('language.selector')}`}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`
          px-3 py-2 rounded-md font-medium
          flex items-center gap-2
          bg-[var(--surface-secondary)] hover:bg-[var(--surface-secondary)]/80
          focus:outline-none focus:ring-2 focus:ring-[var(--border-default)] focus:ring-offset-2
          transition-colors
        `}
      >
        <span aria-hidden="true">{LANGUAGE_NAMES[currentLang].flag}</span>
        {!showFlagsOnly && <span>{LANGUAGE_NAMES[currentLang].name}</span>}
        <span aria-hidden="true" className="ml-1">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-labelledby="language-menu-button"
          className="
            absolute top-full left-0 mt-1
            bg-popover border rounded-md shadow-lg
            min-w-[150px] py-1
            z-50
          "
        >
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isActive = lang === currentLang;
            const { flag, name, ariaLabel } = LANGUAGE_NAMES[lang];
            
            return (
              <button
                key={lang}
                data-lang={lang}
                role="option"
                aria-selected={isActive}
                onClick={() => handleLanguageChange(lang)}
                className={`
                  w-full px-4 py-2 text-left
                  flex items-center gap-2
                  hover:bg-[var(--brand)] hover:text-accent-foreground
                  focus:outline-none focus:bg-[var(--brand)] focus:text-accent-foreground
                  ${isActive ? 'bg-[var(--brand)] text-accent-foreground' : ''}
                `}
              >
                <span aria-hidden="true">{flag}</span>
                <span>{name}</span>
                {isActive && (
                  <span className="sr-only">({t('common:status.active')})</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;
