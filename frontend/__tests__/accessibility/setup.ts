/**
 * Test Setup for Accessibility Tests
 */

import '@testing-library/jest-dom';

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      // Simple translation mock
      const translations: Record<string, string> = {
        'common:meta.skipToContent': 'Skip to main content',
        'common:meta.mainNavigation': 'Main navigation',
        'a11y:language.changed': 'Language changed to {{lang}}',
        'a11y:language.current': 'Current language: {{lang}}',
        'a11y:language.selector': 'Select language',
        'form:aria.firstName': 'First name field',
        'form:errors.required': 'This field is required',
        'form:errors.invalidEmail': 'Invalid email address',
        'form:aria.email': 'Email field',
        'form:aria.password': 'Password field',
        'form:aria.name': 'Name field',
        'form:aria.username': 'Username field',
        'validation:messages.required': 'This field is required',
        'validation:messages.email': 'Please enter a valid email',
        'a11y:screenReader.help.required': 'Required field',
        'a11y:screenReader.instructions.formNavigation': 'Use Tab to navigate',
        'a11y:form.fieldCompleted': '{{field}} completed',
        'a11y:announcer.loading': 'Loading...',
        'form:step.title': 'Step {{current}} of {{total}}',
      };
      
      let result = translations[key] || key;
      
      // Simple interpolation
      if (options) {
        Object.entries(options).forEach(([k, v]) => {
          result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
        });
      }
      
      return result;
    },
    i18n: {
      changeLanguage: jest.fn(),
      language: 'it',
    },
  }),
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe = jest.fn();
  disconnect = jest.fn();
  unobserve = jest.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserverMock,
});

// Suppress console errors during tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods
  // error: jest.fn(),
  // warn: jest.fn(),
};

// Extend matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R;
    }
  }
}
