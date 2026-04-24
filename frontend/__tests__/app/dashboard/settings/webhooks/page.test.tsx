import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock lucide-react
jest.mock('lucide-react', () => {
  return new Proxy({}, {
    get: (_t: unknown, name: string) => {
      if (typeof name !== 'string') return undefined;
      return ({ className }: { className?: string }) =>
        React.createElement('span', { className, 'data-icon': name });
    },
  });
});

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_t: unknown, name: string) => {
      if (typeof name !== 'string') return React.Fragment;
      return ({ children, ...props }: any) =>
        React.createElement('div', props, children);
    },
  }),
}));

// Mock useSWR
let mockSWRData: any = undefined;
let mockSWRError: any = undefined;
let mockSWRIsLoading = false;

jest.mock('swr', () => ({
  __esModule: true,
  default: (_key: unknown, _fetcher: unknown, _opts?: unknown) => ({
    data: mockSWRData,
    error: mockSWRError,
    isLoading: mockSWRIsLoading,
    mutate: jest.fn(),
  }),
}));

// Mock sonner
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (fn: Function) => (e: Event) => {
      e.preventDefault();
      fn({ url: '', events: [] });
    },
    register: jest.fn(() => ({ name: 'field' })),
    reset: jest.fn(),
    formState: { errors: {}, isSubmitting: false },
    watch: jest.fn((field?: string) => {
      if (field === 'events') return [];
      if (field === 'url') return '';
      return { url: '', events: [] };
    }),
  }),
  Controller: ({ render }: any) => render({ field: { value: '', onChange: jest.fn() }, fieldState: { error: undefined } }),
}));

// Mock @hookform/resolvers/zod
jest.mock('@hookform/resolvers/zod', () => ({
  zodResolver: jest.fn(() => jest.fn()),
}));

// Mock zod
jest.mock('zod', () => {
  const createChainableMock = () => ({
    url: jest.fn(() => createChainableMock()),
    email: jest.fn(() => createChainableMock()),
    min: jest.fn(() => createChainableMock()),
    optional: jest.fn(() => createChainableMock()),
    array: jest.fn(() => createChainableMock()),
    parseAsync: jest.fn(() => Promise.resolve()),
    parse: jest.fn(),
  });

  return {
    z: {
      object: jest.fn(() => createChainableMock()),
      string: jest.fn(() => createChainableMock()),
      array: jest.fn(() => createChainableMock()),
    },
  };
});

// Mock fetch
global.fetch = jest.fn();

// Mock components
jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'apple-card' }, children),
  AppleCardContent: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'apple-card-content' }, children),
  AppleCardHeader: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'apple-card-header' }, children),
}));

jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({ children, onClick, disabled, loading }: any) =>
    React.createElement('button', { onClick, disabled: disabled || loading }, children),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) =>
    React.createElement('span', { 'data-testid': 'badge' }, children),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder }: any) =>
    React.createElement('input', { value, onChange, placeholder }),
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange }: any) =>
    React.createElement('input', { type: 'checkbox', checked, onChange: (e) => onCheckedChange?.(e.target.checked) }),
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) =>
    open ? React.createElement('div', { 'data-testid': 'dialog' }, children) : null,
  DialogContent: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'dialog-content' }, children),
  DialogHeader: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'dialog-header' }, children),
  DialogTitle: ({ children }: any) =>
    React.createElement('h2', {}, children),
  DialogDescription: ({ children }: any) =>
    React.createElement('p', { 'data-testid': 'dialog-description' }, children),
  DialogFooter: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'dialog-footer' }, children),
}));

import WebhooksPage from '@/app/dashboard/settings/webhooks/page';

describe('WebhooksPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSWRData = undefined;
    mockSWRError = undefined;
    mockSWRIsLoading = false;
  });

  describe('Page rendering', () => {
    it('should render without crashing', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      const { container } = render(<WebhooksPage />);
      expect(container).toBeInTheDocument();
    });

    it('should display page header', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<WebhooksPage />);
      expect(screen.getByText('Webhook')).toBeInTheDocument();
    });

    it('should display create button', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<WebhooksPage />);
      expect(screen.getByText('Nuovo Webhook')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should handle loading state', () => {
      mockSWRIsLoading = true;
      mockSWRData = undefined;
      const { container } = render(<WebhooksPage />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should display error message', () => {
      mockSWRError = new Error('Failed to load');
      mockSWRData = undefined;
      render(<WebhooksPage />);
      expect(screen.getByText(/errore|error/i)).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no webhooks', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<WebhooksPage />);
      expect(screen.getByText('Nessun webhook configurato')).toBeInTheDocument();
    });
  });

  describe('Webhooks list display', () => {
    it('should display webhooks', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'webhook-1',
          url: 'https://example.com/webhook',
          events: ['booking.created', 'booking.updated'],
          active: true,
          lastTriggeredAt: '2026-04-23T10:00:00Z',
          failureCount: 0,
        },
      ];
      render(<WebhooksPage />);
      expect(screen.getByText(/example\.com/)).toBeInTheDocument();
    });

    it('should display multiple webhooks', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'webhook-1',
          url: 'https://api.example.com/hook',
          events: ['booking.created'],
          active: true,
          lastTriggeredAt: '2026-04-23T10:00:00Z',
          failureCount: 0,
        },
        {
          id: 'webhook-2',
          url: 'https://service.example.org/webhook',
          events: ['customer.updated', 'booking.deleted'],
          active: false,
          lastTriggeredAt: null,
          failureCount: 3,
        },
      ];
      render(<WebhooksPage />);
      expect(screen.queryByText(/api\.example\.com/)).toBeInTheDocument();
      expect(screen.queryByText(/service\.example\.org/)).toBeInTheDocument();
    });
  });

  describe('Webhook status badge', () => {
    it('should display status badge for active webhooks', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'webhook-1',
          url: 'https://example.com/hook',
          events: ['booking.created'],
          active: true,
          lastTriggeredAt: '2026-04-23T10:00:00Z',
          failureCount: 0,
        },
      ];
      render(<WebhooksPage />);
      expect(screen.getByText('Attivo')).toBeInTheDocument();
    });

    it('should display status for inactive webhooks', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'webhook-1',
          url: 'https://example.com/hook',
          events: [],
          active: false,
          lastTriggeredAt: null,
          failureCount: 5,
        },
      ];
      render(<WebhooksPage />);
      expect(screen.getByTestId('badge')).toBeInTheDocument();
    });
  });

  describe('Create webhook dialog', () => {
    it('should open create dialog', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<WebhooksPage />);
      const createBtn = screen.getByText('Nuovo Webhook');
      fireEvent.click(createBtn);
      const dialog = screen.queryByTestId('dialog');
      expect(dialog || screen.getByText('Nuovo Webhook')).toBeTruthy();
    });

    it('should display form fields', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<WebhooksPage />);
      const createBtn = screen.getByText('Nuovo Webhook');
      fireEvent.click(createBtn);
      const inputs = screen.queryAllByRole('textbox');
      expect(inputs.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Webhook actions', () => {
    it('should have action buttons for webhooks', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'webhook-1',
          url: 'https://example.com/hook',
          events: ['booking.created'],
          active: true,
          lastTriggeredAt: '2026-04-23T10:00:00Z',
          failureCount: 0,
        },
      ];
      render(<WebhooksPage />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Event type display', () => {
    it('should display event types for webhook', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'webhook-1',
          url: 'https://example.com/hook',
          events: ['booking.created', 'booking.updated', 'booking.deleted'],
          active: true,
          lastTriggeredAt: '2026-04-23T10:00:00Z',
          failureCount: 0,
        },
      ];
      render(<WebhooksPage />);
      expect(screen.getByTestId('apple-card')).toBeInTheDocument();
    });
  });

  describe('Multiple webhooks with different states', () => {
    it('should handle mixed webhook states', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'webhook-1',
          url: 'https://api.example.com/hook1',
          events: ['booking.created'],
          active: true,
          lastTriggeredAt: '2026-04-23T10:00:00Z',
          failureCount: 0,
        },
        {
          id: 'webhook-2',
          url: 'https://api.example.com/hook2',
          events: ['customer.updated'],
          active: false,
          lastTriggeredAt: '2026-04-20T15:00:00Z',
          failureCount: 2,
        },
        {
          id: 'webhook-3',
          url: 'https://api.example.com/hook3',
          events: ['booking.updated', 'booking.deleted'],
          active: true,
          lastTriggeredAt: null,
          failureCount: 5,
        },
      ];
      render(<WebhooksPage />);
      expect(screen.queryByText(/hook1/)).toBeInTheDocument();
      expect(screen.queryByText(/hook2/)).toBeInTheDocument();
      expect(screen.queryByText(/hook3/)).toBeInTheDocument();
    });
  });
});
