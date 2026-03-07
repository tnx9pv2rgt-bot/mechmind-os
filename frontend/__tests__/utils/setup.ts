/**
 * Test Setup for Integration Tests
 * 
 * Configures Jest with MSW and other test utilities
 * 
 * @module __tests__/utils/setup
 * @version 1.0.0
 */

import '@testing-library/jest-dom'

// Mock fetch for MSW
global.fetch = fetch

// Mock TextEncoder/TextDecoder
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as typeof global.TextDecoder

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe = jest.fn()
  disconnect = jest.fn()
  unobserve = jest.fn()
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserverMock,
})

// Mock ResizeObserver
class ResizeObserverMock {
  observe = jest.fn()
  disconnect = jest.fn()
  unobserve = jest.fn()
}
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ResizeObserverMock,
})

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
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
      }

      let result = translations[key] || key

      if (options) {
        Object.entries(options).forEach(([k, v]) => {
          result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(v))
        })
      }

      return result
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
}))

// Suppress console errors during tests (optional)
const originalError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Filter out specific React warnings if needed
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Warning: useLayoutEffect'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Extend matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R
    }
  }
}
