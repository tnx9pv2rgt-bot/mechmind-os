/**
 * SkipLink Component
 * Link per saltare al contenuto principale
 * WCAG 2.1 - Criterion 2.4.1: Bypass Blocks
 */

'use client';

import React from 'react';

interface SkipLinkProps {
  /** ID dell'elemento target */
  targetId?: string;
  /** Testo del link (default: "Vai al contenuto principale") */
  text?: string;
  /** Classe CSS aggiuntiva */
  className?: string;
}

/**
 * SkipLink - Link nascosto che appare al focus
 * Permette agli utenti di tastiera di saltare la navigazione
 */
export function SkipLink({
  targetId = 'main-content',
  text,
  className = '',
}: SkipLinkProps) {

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      // Imposta tabindex se non presente
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
      target.focus();
      // Scrolla all'elemento
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={`
        sr-only focus:not-sr-only
        fixed top-4 left-4 z-50
        px-4 py-3
        bg-[var(--brand)] text-[var(--text-on-brand)]
        font-medium
        rounded-md
        shadow-lg
        focus:outline-none focus:ring-2 focus:ring-[var(--border-default)] focus:ring-offset-2
        transition-all
        ${className}
      `}
    >
      {text || 'Vai al contenuto principale'}
    </a>
  );
}

/**
 * MainContent - Wrapper per il contenuto principale
 * Include l'ID necessario per SkipLink
 */
interface MainContentProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
  /** Se è una regione landmark */
  asLandmark?: boolean;
}

export function MainContent({ 
  children, 
  id = 'main-content',
  className = '',
  asLandmark = true,
}: MainContentProps) {
  const Component = asLandmark ? 'main' : 'div';
  
  return (
    <Component
      id={id}
      role={asLandmark ? undefined : 'main'}
      className={className}
      tabIndex={-1}
    >
      {children}
    </Component>
  );
}

/**
 * SkipToNavigation - Link per saltare alla navigazione
 */
interface SkipToNavigationProps {
  navId?: string;
  className?: string;
}

export function SkipToNavigation({
  navId = 'main-navigation',
  className = '',
}: SkipToNavigationProps) {

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(navId);
    if (target) {
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
      target.focus();
    }
  };

  return (
    <a
      href={`#${navId}`}
      onClick={handleClick}
      className={`
        sr-only focus:not-sr-only
        fixed top-4 left-48 z-50
        px-4 py-3
        bg-[var(--surface-secondary)] text-[var(--text-secondary)]-foreground
        font-medium
        rounded-md
        shadow-lg
        focus:outline-none focus:ring-2 focus:ring-[var(--border-default)] focus:ring-offset-2
        transition-all
        ${className}
      `}
    >
      {'Vai alla navigazione'}
    </a>
  );
}

export default SkipLink;
