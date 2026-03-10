/**
 * Accessibility Components Index
 * Esporta tutti i componenti di accessibilità
 */

// Announcer per screen reader
export { Announcer, AnnouncerProvider, useAnnouncer, announce } from './Announcer';

// Skip Link
export { SkipLink, MainContent, SkipToNavigation } from './SkipLink';

// Language Switcher
export { LanguageSwitcher } from './LanguageSwitcher';

// Form Field accessibile
export { A11yFormField } from './A11yFormField';

// Modal accessibile
export { A11yModal, ConfirmDialog } from './A11yModal';

// Types
export type {
  AnnouncePriority,
  Announcement
} from './Announcer';

export type {
  A11yFormFieldProps
} from './A11yFormField';

export type {
  A11yModalProps,
  ConfirmDialogProps
} from './A11yModal';
