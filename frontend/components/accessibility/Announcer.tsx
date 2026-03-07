/**
 * Announcer Component
 * Componente live region per screen reader
 * WCAG 2.1 - Criterion 4.1.3: Status Messages
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type AnnouncePriority = 'polite' | 'assertive' | 'off';

export interface Announcement {
  id: string;
  message: string;
  priority: AnnouncePriority;
}

interface AnnouncerProps {
  /** ID per aria-live region */
  id?: string;
  /** Classe CSS aggiuntiva */
  className?: string;
}

// Stile per nascondere visivamente ma mantenere accessibile
const visuallyHiddenStyle: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: '0',
};

/**
 * Announcer - Live region per screen reader
 * Utilizza aria-live per annunciare cambiamenti dinamici
 */
export function Announcer({ id = 'a11y-announcer', className }: AnnouncerProps) {
  return (
    <>
      {/* Polite announcer - non interrompe */}
      <div
        id={`${id}-polite`}
        aria-live="polite"
        aria-atomic="true"
        style={visuallyHiddenStyle}
        className={className}
      />
      {/* Assertive announcer - interrompe */}
      <div
        id={`${id}-assertive`}
        aria-live="assertive"
        aria-atomic="true"
        style={visuallyHiddenStyle}
        className={className}
      />
      {/* Off announcer - disabilitato */}
      <div
        id={`${id}-off`}
        aria-live="off"
        aria-atomic="true"
        style={visuallyHiddenStyle}
        className={className}
      />
      {/* Language change announcer */}
      <div
        id="language-change-announcer"
        aria-live="polite"
        aria-atomic="true"
        style={visuallyHiddenStyle}
      />
    </>
  );
}

/**
 * Hook per utilizzare l'announcer
 */
let announceCallback: ((message: string, priority: AnnouncePriority) => void) | null = null;

export function registerAnnouncer(callback: (message: string, priority: AnnouncePriority) => void) {
  announceCallback = callback;
}

export function announce(message: string, priority: AnnouncePriority = 'polite') {
  if (announceCallback) {
    announceCallback(message, priority);
  } else {
    // Fallback: cerca elemento nel DOM
    const announcerId = priority === 'assertive' 
      ? 'a11y-announcer-assertive' 
      : 'a11y-announcer-polite';
    const element = document.getElementById(announcerId);
    if (element) {
      element.textContent = '';
      // Forza reflow
      void element.offsetWidth;
      element.textContent = message;
    }
  }
}

export function announceError(message: string) {
  announce(`Errore: ${message}`, 'assertive');
}

export function announceSuccess(message: string) {
  announce(`Successo: ${message}`, 'polite');
}

export function announceLoading(message: string = 'Caricamento in corso...') {
  announce(message, 'assertive');
}

export function announceStepChange(current: number, total: number, title?: string) {
  const stepInfo = `Step ${current} di ${total}`;
  const fullMessage = title ? `${stepInfo}, ${title}` : stepInfo;
  announce(fullMessage, 'polite');
}

/**
 * Announcer Provider - Gestisce gli annunci in un context
 */
interface AnnouncerContextValue {
  announce: (message: string, priority?: AnnouncePriority) => void;
  announceError: (message: string) => void;
  announceSuccess: (message: string) => void;
  announceLoading: (message?: string) => void;
  announceStepChange: (current: number, total: number, title?: string) => void;
}

const AnnouncerContext = React.createContext<AnnouncerContextValue | null>(null);

export function useAnnouncer(): AnnouncerContextValue {
  const context = React.useContext(AnnouncerContext);
  if (!context) {
    throw new Error('useAnnouncer must be used within an AnnouncerProvider');
  }
  return context;
}

interface AnnouncerProviderProps {
  children: React.ReactNode;
}

export function AnnouncerProvider({ children }: AnnouncerProviderProps) {
  const [announcements, setAnnouncements] = useState<Map<string, string>>(new Map());
  const { t } = useTranslation('a11y');

  const announce = React.useCallback((message: string, priority: AnnouncePriority = 'polite') => {
    const id = `${priority}-${Date.now()}`;
    
    setAnnouncements((prev) => {
      const next = new Map(prev);
      next.set(id, message);
      return next;
    });

    // Pulisci dopo un delay
    setTimeout(() => {
      setAnnouncements((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    }, 1000);
  }, []);

  const announceError = React.useCallback((message: string) => {
    announce(`Errore: ${message}`, 'assertive');
  }, [announce]);

  const announceSuccess = React.useCallback((message: string) => {
    announce(t('form.fieldCompleted', { field: message }), 'polite');
  }, [announce, t]);

  const announceLoading = React.useCallback((message?: string) => {
    announce(message || t('announcer.loading'), 'assertive');
  }, [announce, t]);

  const announceStepChange = React.useCallback((current: number, total: number, title?: string) => {
    const stepInfo = t('step.title', { current, total });
    const fullMessage = title ? `${stepInfo}, ${title}` : stepInfo;
    announce(fullMessage, 'polite');
  }, [announce, t]);

  const value = React.useMemo(
    () => ({
      announce,
      announceError,
      announceSuccess,
      announceLoading,
      announceStepChange,
    }),
    [announce, announceError, announceSuccess, announceLoading, announceStepChange]
  );

  // Ottieni messaggi per priorità
  const politeMessages = Array.from(announcements.entries())
    .filter(([id]) => id.startsWith('polite-'))
    .map(([, message]) => message)
    .join(' ');

  const assertiveMessages = Array.from(announcements.entries())
    .filter(([id]) => id.startsWith('assertive-'))
    .map(([, message]) => message)
    .join(' ');

  return (
    <AnnouncerContext.Provider value={value}>
      {children}
      {/* Live regions */}
      <div aria-live="polite" aria-atomic="true" style={visuallyHiddenStyle}>
        {politeMessages}
      </div>
      <div aria-live="assertive" aria-atomic="true" style={visuallyHiddenStyle}>
        {assertiveMessages}
      </div>
    </AnnouncerContext.Provider>
  );
}

export default Announcer;
