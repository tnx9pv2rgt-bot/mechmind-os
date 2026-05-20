/**
 * A11yModal Component
 * Modal/Dialog accessibile WCAG 2.1 AA
 * WCAG 2.1 - Criterion 1.4.13: Content on Hover or Focus
 * WCAG 2.1 - Criterion 2.1.2: No Keyboard Trap
 * WCAG 2.1 - Criterion 2.4.3: Focus Order
 * WCAG 2.1 - Criterion 2.4.7: Focus Visible
 */

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { announce } from './Announcer';
import { createPortal } from 'react-dom';

export interface A11yModalProps {
  /** Se il modal è aperto */
  isOpen: boolean;
  /** Callback chiusura */
  onClose: () => void;
  /** Titolo del modal (obbligatorio per a11y) */
  title: string;
  /** Descrizione aggiuntiva */
  description?: string;
  /** Contenuto */
  children: React.ReactNode;
  /** Azioni footer */
  footer?: React.ReactNode;
  /** Se chiudibile con Escape */
  closeOnEscape?: boolean;
  /** Se chiudibile cliccando fuori */
  closeOnOverlayClick?: boolean;
  /** Dimensione */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Classe CSS aggiuntiva */
  className?: string;
  /** ID per aria-describedby */
  describedById?: string;
  /** Callback dopo apertura */
  onAfterOpen?: () => void;
  /** Callback dopo chiusura */
  onAfterClose?: () => void;
}

/**
 * A11yModal - Modal dialog completamente accessibile
 */
export function A11yModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  closeOnEscape = true,
  closeOnOverlayClick = true,
  size = 'md',
  className = '',
  describedById,
  onAfterOpen,
  onAfterClose,
}: A11yModalProps) {
  const { t } = useTranslation('a11y');
  const { prefersReducedMotion } = useReducedMotion();
  const titleId = useRef(`modal-title-${Math.random().toString(36).substr(2, 9)}`).current;
  const descriptionId = useRef(`modal-desc-${Math.random().toString(36).substr(2, 9)}`).current;
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const { containerRef } = useFocusTrap({
    isActive: isOpen,
    onEscapeFocus: closeOnEscape ? onClose : undefined,
  });

  // Salva elemento attivo precedente
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      announce(t('navigation.modalOpened'), 'polite');
      onAfterOpen?.();
    } else {
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
      onAfterClose?.();
    }
  }, [isOpen, onAfterOpen, onAfterClose, t]);

  // Blocca scroll body quando modal è aperto
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Gestione click overlay
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (closeOnOverlayClick && e.target === e.currentTarget) {
        onClose();
      }
    },
    [closeOnOverlayClick, onClose]
  );

  // Dimensioni
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full m-4',
  };

  // Animazioni
  const animationClass = prefersReducedMotion 
    ? '' 
    : 'animate-in fade-in zoom-in-95 duration-200';
  const backdropAnimation = prefersReducedMotion
    ? ''
    : 'animate-in fade-in duration-200';

  if (!isOpen) return null;

  const modal = (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--surface-primary)]/50 ${backdropAnimation}`}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedById || (description ? descriptionId : undefined)}
        className={`
          relative w-full ${sizeClasses[size]}
          bg-[var(--surface-primary)] rounded-lg shadow-lg
          outline-none
          ${animationClass}
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="
              p-2 rounded-md
              hover:bg-[var(--brand)] hover:text-accent-foreground
              focus:outline-none focus:ring-2 focus:ring-[var(--border-default)] focus:ring-offset-2
            "
            aria-label={t('actions:close')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Description (for screen readers) */}
        {description && (
          <p id={descriptionId} className="sr-only">
            {description}
          </p>
        )}

        {/* Content */}
        <div className="p-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex justify-end gap-2 p-4 border-t">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // Render in portal
  if (typeof document !== 'undefined') {
    return createPortal(modal, document.body);
  }

  return null;
}

/**
 * ConfirmDialog - Dialog di conferma accessibile
 */
export interface ConfirmDialogProps extends Omit<A11yModalProps, 'children' | 'footer'> {
  /** Messaggio di conferma */
  message: string;
  /** Testo pulsante conferma */
  confirmText?: string;
  /** Testo pulsante annulla */
  cancelText?: string;
  /** Callback conferma */
  onConfirm: () => void;
  /** Variante */
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
  message,
  confirmText,
  cancelText,
  onConfirm,
  onClose,
  variant = 'info',
  ...props
}: ConfirmDialogProps) {
  const { t } = useTranslation(['common', 'a11y']);

  const variantClasses = {
    danger: 'bg-[var(--status-error)] text-[var(--status-error)]-foreground hover:bg-[var(--status-error)]/90',
    warning: 'bg-[var(--status-warning)] text-warning-foreground hover:bg-[var(--status-warning)]/90',
    info: 'bg-[var(--brand)] text-[var(--text-on-brand)] hover:bg-[var(--brand)]/90',
  };

  return (
    <A11yModal
      {...props}
      onClose={onClose}
      footer={
        <>
          <button
            onClick={onClose}
            className="
              px-4 py-2 rounded-md
              border border-input bg-[var(--surface-primary)]
              hover:bg-[var(--brand)] hover:text-accent-foreground
              focus:outline-none focus:ring-2 focus:ring-[var(--border-default)] focus:ring-offset-2
            "
          >
            {cancelText || t('common:actions.cancel')}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`
              px-4 py-2 rounded-md
              focus:outline-none focus:ring-2 focus:ring-[var(--border-default)] focus:ring-offset-2
              ${variantClasses[variant]}
            `}
            autoFocus
          >
            {confirmText || t('common:actions.confirm')}
          </button>
        </>
      }
    >
      <p className="text-[var(--text-primary)]">{message}</p>
    </A11yModal>
  );
}

export default A11yModal;
