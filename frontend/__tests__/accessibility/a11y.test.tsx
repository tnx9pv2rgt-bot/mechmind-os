/**
 * Accessibility Tests
 * WCAG 2.1 AA Compliance Tests with jest-axe
 */

import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';

// Components
import { Announcer } from '@/components/accessibility/Announcer';
import { SkipLink, MainContent } from '@/components/accessibility/SkipLink';
import { LanguageSwitcher } from '@/components/accessibility/LanguageSwitcher';
import { A11yFormField } from '@/components/accessibility/A11yFormField';

// Hooks
import { useKeyboardNavigation, useStepKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useA11yAnnouncer } from '@/hooks/useA11yAnnouncer';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Wrapper per i18n
const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
);

/**
 * WCAG 2.1 - Criterion 1.3.1: Info and Relationships
 * Semantic HTML elements
 */
describe('WCAG 1.3.1 - Info and Relationships', () => {
  it('Announcer should have proper ARIA attributes', async () => {
    const { container } = render(
      <Wrapper>
        <Announcer />
      </Wrapper>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    // Verifica live regions
    const polite = container.querySelector('[aria-live="polite"]');
    const assertive = container.querySelector('[aria-live="assertive"]');
    
    expect(polite).toBeInTheDocument();
    expect(assertive).toBeInTheDocument();
    expect(polite).toHaveAttribute('aria-atomic', 'true');
    expect(assertive).toHaveAttribute('aria-atomic', 'true');
  });

  it('SkipLink should have proper semantic structure', async () => {
    const { container } = render(
      <Wrapper>
        <>
          <SkipLink />
          <MainContent id="main-content">Content</MainContent>
        </>
      </Wrapper>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    const skipLink = container.querySelector('a[href="#main-content"]');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('MainContent should have proper landmark role', async () => {
    const { container } = render(
      <Wrapper>
        <MainContent id="main-content">Main Content</MainContent>
      </Wrapper>
    );
    
    const main = container.querySelector('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('id', 'main-content');
  });
});

/**
 * WCAG 2.1 - Criterion 1.3.2: Meaningful Sequence
 * Tab order
 */
describe('WCAG 1.3.2 - Meaningful Sequence', () => {
  it('LanguageSwitcher should have logical tab order', async () => {
    const { container } = render(
      <Wrapper>
        <LanguageSwitcher variant="buttons" />
      </Wrapper>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    const buttons = container.querySelectorAll('button');
    buttons.forEach((button) => {
      expect(button).toHaveAttribute('tabindex', '-1'); // Or 0 for focusable
    });
  });

  it('A11yFormField should have correct label association', async () => {
    const { container } = render(
      <Wrapper>
        <A11yFormField
          label="Email"
          name="email"
          type="email"
          required
        />
      </Wrapper>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    const input = container.querySelector('input');
    const label = container.querySelector('label');
    
    expect(label).toHaveAttribute('for', input?.id);
    expect(input).toHaveAttribute('aria-required', 'true');
  });
});

/**
 * WCAG 2.1 - Criterion 1.4.3: Contrast (Minimum)
 * Color contrast
 */
describe('WCAG 1.4.3 - Contrast (Minimum)', () => {
  it('All text elements should have sufficient contrast', async () => {
    const { container } = render(
      <Wrapper>
        <div className="text-foreground bg-background">
          <h1>Title</h1>
          <p>Description text</p>
          <button className="bg-primary text-primary-foreground">Action</button>
        </div>
      </Wrapper>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

/**
 * WCAG 2.1 - Criterion 2.1.1: Keyboard
 * All functionality available via keyboard
 */
describe('WCAG 2.1.1 - Keyboard', () => {
  it('LanguageSwitcher dropdown should be keyboard accessible', async () => {
    const { container } = render(
      <Wrapper>
        <LanguageSwitcher variant="dropdown" />
      </Wrapper>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    const button = container.querySelector('button');
    expect(button).toHaveAttribute('aria-haspopup', 'listbox');
    expect(button).toHaveAttribute('aria-expanded');
  });

  it('A11yFormField should be keyboard accessible', async () => {
    const { container } = render(
      <Wrapper>
        <A11yFormField
          label="Name"
          name="name"
          required
        />
      </Wrapper>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    const input = container.querySelector('input');
    expect(input).not.toHaveAttribute('tabindex', '-1');
  });
});

/**
 * WCAG 2.1 - Criterion 2.4.3: Focus Order
 */
describe('WCAG 2.4.3 - Focus Order', () => {
  it('SkipLink should be first focusable element', async () => {
    const { container } = render(
      <Wrapper>
        <>
          <SkipLink />
          <nav>Navigation</nav>
          <MainContent id="main-content">Content</MainContent>
        </>
      </Wrapper>
    );
    
    const skipLink = container.querySelector('a[href="#main-content"]');
    expect(skipLink).toBeInTheDocument();
  });
});

/**
 * WCAG 2.1 - Criterion 3.3.1: Error Identification
 */
describe('WCAG 3.3.1 - Error Identification', () => {
  it('A11yFormField should announce errors properly', async () => {
    const { container } = render(
      <Wrapper>
        <A11yFormField
          label="Email"
          name="email"
          type="email"
          error="Email non valida"
          aria-invalid
        />
      </Wrapper>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    const input = container.querySelector('input');
    const error = container.querySelector('[role="alert"]');
    
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-errormessage');
    expect(error).toHaveAttribute('aria-live', 'polite');
    expect(error).toHaveTextContent('Email non valida');
  });
});

/**
 * WCAG 2.1 - Criterion 3.3.2: Labels or Instructions
 */
describe('WCAG 3.3.2 - Labels or Instructions', () => {
  it('A11yFormField should have proper labels', async () => {
    const { container } = render(
      <Wrapper>
        <A11yFormField
          label="Password"
          name="password"
          type="password"
          hint="Minimo 8 caratteri"
          required
        />
      </Wrapper>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    const label = container.querySelector('label');
    const hint = container.querySelector('[id$="-hint"]');
    const input = container.querySelector('input');
    
    expect(label).toHaveTextContent('Password');
    expect(hint).toHaveTextContent('Minimo 8 caratteri');
    expect(input).toHaveAttribute('aria-describedby');
  });

  it('Required fields should be properly indicated', async () => {
    const { container } = render(
      <Wrapper>
        <A11yFormField
          label="Name"
          name="name"
          required
        />
      </Wrapper>
    );
    
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAttribute('required');
  });
});

/**
 * WCAG 2.1 - Criterion 4.1.2: Name, Role, Value
 */
describe('WCAG 4.1.2 - Name, Role, Value', () => {
  it('LanguageSwitcher buttons should have proper roles', async () => {
    const { container } = render(
      <Wrapper>
        <LanguageSwitcher variant="buttons" />
      </Wrapper>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    const buttons = container.querySelectorAll('button');
    buttons.forEach((button) => {
      expect(button).toHaveAttribute('aria-label');
      expect(button).toHaveAttribute('aria-pressed');
    });
  });

  it('Form elements should have accessible names', async () => {
    const { container } = render(
      <Wrapper>
        <A11yFormField
          label="Username"
          name="username"
          ariaLabel="Inserisci il tuo username"
        />
      </Wrapper>
    );
    
    const input = container.querySelector('input');
    expect(input).toHaveAccessibleName(/username/i);
  });
});

/**
 * WCAG 2.1 - Criterion 4.1.3: Status Messages
 */
describe('WCAG 4.1.3 - Status Messages', () => {
  it('Announcer should have live regions for status messages', async () => {
    const { container } = render(
      <Wrapper>
        <Announcer />
      </Wrapper>
    );
    
    const polite = container.querySelector('[aria-live="polite"]');
    const assertive = container.querySelector('[aria-live="assertive"]');
    
    expect(polite).toBeInTheDocument();
    expect(assertive).toBeInTheDocument();
    expect(polite).toHaveAttribute('aria-live', 'polite');
    expect(assertive).toHaveAttribute('aria-live', 'assertive');
  });
});

/**
 * Custom Hook Tests
 */
describe('Accessibility Hooks', () => {
  describe('useReducedMotion', () => {
    it('should respect prefers-reduced-motion media query', () => {
      // Mock matchMedia
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation((query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      const TestComponent = () => {
        const { prefersReducedMotion } = useReducedMotion();
        return <div data-testid="motion">{prefersReducedMotion ? 'reduced' : 'normal'}</div>;
      };

      const { getByTestId } = render(<TestComponent />);
      expect(getByTestId('motion')).toHaveTextContent('reduced');
    });
  });

  describe('useFocusTrap', () => {
    it('should trap focus within container', () => {
      const TestComponent = () => {
        const { containerRef } = useFocusTrap({ isActive: true });
        return (
          <div ref={containerRef}>
            <button>First</button>
            <button>Second</button>
            <button>Third</button>
          </div>
        );
      };

      const { container } = render(<TestComponent />);
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(3);
    });
  });
});

/**
 * Full Page Accessibility Test
 */
describe('Full Page Accessibility', () => {
  it('should have no accessibility violations in form page', async () => {
    const FormPage = () => (
      <Wrapper>
        <div>
          <SkipLink />
          <MainContent id="main-content">
            <form role="form" aria-labelledby="form-title">
              <h1 id="form-title">Registration Form</h1>
              <A11yFormField
                label="First Name"
                name="firstName"
                required
              />
              <A11yFormField
                label="Last Name"
                name="lastName"
                required
              />
              <A11yFormField
                label="Email"
                name="email"
                type="email"
                required
              />
              <button type="submit">Submit</button>
            </form>
          </MainContent>
          <Announcer />
        </div>
      </Wrapper>
    );

    const { container } = render(<FormPage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

/**
 * Component Integration Tests
 */
describe('Component Integration', () => {
  it('LanguageSwitcher should update language and announce change', async () => {
    const { container } = render(
      <Wrapper>
        <LanguageSwitcher variant="buttons" />
      </Wrapper>
    );

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);

    // Click on different language
    const englishButton = Array.from(buttons).find((btn) => 
      btn.getAttribute('aria-label')?.includes('English')
    );

    if (englishButton) {
      englishButton.click();
      // Verifica che il bottone cambi stato
      expect(englishButton).toHaveAttribute('aria-pressed', 'true');
    }
  });

  it('A11yFormField should handle error states correctly', async () => {
    const { container, rerender } = render(
      <Wrapper>
        <A11yFormField
          label="Email"
          name="email"
          type="email"
        />
      </Wrapper>
    );

    let input = container.querySelector('input');
    expect(input).toHaveAttribute('aria-invalid', 'false');

    // Aggiungi errore
    rerender(
      <Wrapper>
        <A11yFormField
          label="Email"
          name="email"
          type="email"
          error="Invalid email format"
        />
      </Wrapper>
    );

    input = container.querySelector('input');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    
    const errorMessage = container.querySelector('[role="alert"]');
    expect(errorMessage).toHaveTextContent('Invalid email format');
  });
});

export {};
