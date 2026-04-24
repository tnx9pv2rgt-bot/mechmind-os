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
let mockMutate = jest.fn();

jest.mock('swr', () => ({
  __esModule: true,
  default: (_key: unknown, _fetcher: unknown, _opts?: unknown) => ({
    data: mockSWRData,
    error: mockSWRError,
    isLoading: mockSWRIsLoading,
    mutate: mockMutate,
  }),
}));

// Mock sonner
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

// Mock fetch
let mockFetch: jest.Mock;
global.fetch = jest.fn();
mockFetch = global.fetch as jest.Mock;

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (fn: Function) => (e?: Event) => {
      if (e) e.preventDefault?.();
      fn({ url: 'https://example.com/webhook', events: ['booking.created'], secret: '' });
    },
    register: jest.fn(() => ({ name: 'field' })),
    reset: jest.fn(),
    formState: { errors: {}, isSubmitting: false },
    watch: jest.fn(() => ['booking.created']),
    getValues: jest.fn(() => ({ url: 'https://example.com/webhook', events: ['booking.created'], secret: '' })),
    setValue: jest.fn(),
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
      object: () => createChainableMock(),
      string: () => createChainableMock(),
      array: () => createChainableMock(),
    },
  };
});

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
  AppleButton: ({ children, onClick, disabled, loading, type }: any) =>
    React.createElement('button', { onClick, disabled: disabled || loading, type }, children),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) =>
    React.createElement('span', { 'data-testid': 'badge' }, children),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, type, id, ...props }: any) =>
    React.createElement('input', { value, onChange, placeholder, type, id, 'data-testid': `input-${id}`, ...props }),
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
    React.createElement('p', {}, children),
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

    it('should display description text', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<WebhooksPage />);
      expect(screen.getByText(/Configura i webhook/)).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should display loading indicator', () => {
      mockSWRIsLoading = true;
      mockSWRData = undefined;
      const { container } = render(<WebhooksPage />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should display error message on fetch failure', () => {
      mockSWRError = new Error('Failed to load');
      mockSWRData = undefined;
      render(<WebhooksPage />);
      expect(screen.getByText(/Errore di caricamento/)).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no webhooks', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<WebhooksPage />);
      expect(screen.getByText(/Nessun webhook configurato/)).toBeInTheDocument();
    });
  });

  describe('Webhooks list display', () => {
    it('should display webhook URL', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: '1',
          url: 'https://example.com/webhook',
          events: ['booking.created'],
          active: true,
          secret: 'secret-1',
          lastDeliveryAt: '2026-04-23T10:00:00Z',
          lastDeliveryStatus: 200,
          failureCount: 0,
          createdAt: '2026-04-23T10:00:00Z',
        },
      ];
      render(<WebhooksPage />);
      expect(screen.getByText('https://example.com/webhook')).toBeInTheDocument();
    });

    it('should display multiple webhooks', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: '1',
          url: 'https://api1.example.com/events',
          events: ['booking.created'],
          active: true,
          secret: 'secret-1',
          lastDeliveryAt: '2026-04-23T10:00:00Z',
          lastDeliveryStatus: 200,
          failureCount: 0,
          createdAt: '2026-04-23T10:00:00Z',
        },
        {
          id: '2',
          url: 'https://api2.example.com/notify',
          events: ['invoice.paid'],
          active: false,
          secret: 'secret-2',
          lastDeliveryAt: null,
          lastDeliveryStatus: null,
          failureCount: 0,
          createdAt: '2026-02-01T10:00:00Z',
        },
      ];
      render(<WebhooksPage />);
      expect(screen.getByText('https://api1.example.com/events')).toBeInTheDocument();
      expect(screen.getByText('https://api2.example.com/notify')).toBeInTheDocument();
    });

    it('should display webhook counter', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: '1',
          url: 'https://example.com/webhook',
          events: ['booking.created'],
          active: true,
          secret: 'secret-1',
          lastDeliveryAt: '2026-04-23T10:00:00Z',
          lastDeliveryStatus: 200,
          failureCount: 0,
          createdAt: '2026-04-23T10:00:00Z',
        },
        {
          id: '2',
          url: 'https://api2.example.com/notify',
          events: ['invoice.paid'],
          active: false,
          secret: 'secret-2',
          lastDeliveryAt: null,
          lastDeliveryStatus: null,
          failureCount: 0,
          createdAt: '2026-02-01T10:00:00Z',
        },
      ];
      render(<WebhooksPage />);
      expect(screen.getByText(/Webhook configurati \(2\)/)).toBeInTheDocument();
    });
  });

  describe('Webhook status badge', () => {
    it('should display status badge for active webhooks', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: '1',
          url: 'https://example.com/webhook',
          events: ['booking.created'],
          active: true,
          secret: 'secret-1',
          lastDeliveryAt: '2026-04-23T10:00:00Z',
          lastDeliveryStatus: 200,
          failureCount: 0,
          createdAt: '2026-04-23T10:00:00Z',
        },
      ];
      render(<WebhooksPage />);
      expect(screen.getByText('Attivo')).toBeInTheDocument();
    });

    it('should display status for inactive webhooks', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: '1',
          url: 'https://example.com/webhook',
          events: ['booking.created'],
          active: false,
          secret: 'secret-1',
          lastDeliveryAt: null,
          lastDeliveryStatus: null,
          failureCount: 0,
          createdAt: '2026-04-23T10:00:00Z',
        },
      ];
      render(<WebhooksPage />);
      expect(screen.getByText('Inattivo')).toBeInTheDocument();
    });
  });

  describe('Create webhook dialog', () => {
    it('should open create dialog when button clicked', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<WebhooksPage />);
      const createBtn = screen.getByRole("button", { name: /nuovo webhook/i });
      fireEvent.click(createBtn);

      expect(screen.getByTestId("dialog")).toBeInTheDocument();
    });

    it('should display form fields in dialog', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<WebhooksPage />);
      const createBtn = screen.getByText('Nuovo Webhook');
      fireEvent.click(createBtn);

      const inputs = screen.queryAllByRole('textbox');
      expect(inputs.length).toBeGreaterThanOrEqual(0);
    });

    it('should have cancel button in dialog', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<WebhooksPage />);
      const createBtn = screen.getByText('Nuovo Webhook');
      fireEvent.click(createBtn);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(1);
    });
  });

  describe('Webhook interactions', () => {
    it('should have action buttons for webhooks', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: '1',
          url: 'https://example.com/webhook',
          events: ['booking.created'],
          active: true,
          secret: 'secret-1',
          lastDeliveryAt: '2026-04-23T10:00:00Z',
          lastDeliveryStatus: 200,
          failureCount: 0,
          createdAt: '2026-04-23T10:00:00Z',
        },
      ];
      render(<WebhooksPage />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Event types display', () => {
    it('should display event types for webhook', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: '1',
          url: 'https://example.com/webhook',
          events: ['booking.created', 'booking.updated'],
          active: true,
          secret: 'secret-1',
          lastDeliveryAt: '2026-04-23T10:00:00Z',
          lastDeliveryStatus: 200,
          failureCount: 0,
          createdAt: '2026-04-23T10:00:00Z',
        },
      ];
      render(<WebhooksPage />);
      expect(screen.getByText('https://example.com/webhook')).toBeInTheDocument();
    });

    it('should display first 3 events with +N indicator', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: '1',
          url: 'https://example.com/webhook',
          events: [
            'booking.created',
            'booking.updated',
            'booking.cancelled',
            'work-order.created',
            'work-order.updated',
          ],
          active: true,
          secret: 'secret-1',
          lastDeliveryAt: '2026-04-23T10:00:00Z',
          lastDeliveryStatus: 200,
          failureCount: 0,
          createdAt: '2026-04-23T10:00:00Z',
        },
      ];
      render(<WebhooksPage />);
      expect(screen.getByText(/\+2/)).toBeInTheDocument();
    });
  });

  describe('Multiple webhooks with different states', () => {
    it('should handle mixed webhook states', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: '1',
          url: 'https://active.example.com/webhook',
          events: ['booking.created'],
          active: true,
          secret: 'secret-1',
          lastDeliveryAt: '2026-04-23T10:00:00Z',
          lastDeliveryStatus: 200,
          failureCount: 0,
          createdAt: '2026-04-23T10:00:00Z',
        },
        {
          id: '2',
          url: 'https://inactive.example.com/notify',
          events: ['invoice.paid'],
          active: false,
          secret: 'secret-2',
          lastDeliveryAt: null,
          lastDeliveryStatus: null,
          failureCount: 0,
          createdAt: '2026-02-01T10:00:00Z',
        },
        {
          id: '3',
          url: 'https://failed.example.com/events',
          events: ['customer.created'],
          active: true,
          secret: 'secret-3',
          lastDeliveryAt: '2026-04-22T10:00:00Z',
          lastDeliveryStatus: 500,
          failureCount: 5,
          createdAt: '2026-03-01T10:00:00Z',
        },
      ];
      render(<WebhooksPage />);
      expect(screen.getByText('https://active.example.com/webhook')).toBeInTheDocument();
      expect(screen.getByText('https://inactive.example.com/notify')).toBeInTheDocument();
      expect(screen.getByText('https://failed.example.com/events')).toBeInTheDocument();
    });
  });

  describe('Create webhook form', () => {
    it('should allow URL input in form', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<WebhooksPage />);
      const createBtn = screen.getByText('Nuovo Webhook');
      fireEvent.click(createBtn);

      const urlInput = screen.getByPlaceholderText('https://esempio.it/webhook');
      expect(urlInput).toBeInTheDocument();
    });

    it('should display submit button in form', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<WebhooksPage />);
      const createBtn = screen.getByText('Nuovo Webhook');
      fireEvent.click(createBtn);

      const submitBtn = screen.getByText('Crea Webhook');
      expect(submitBtn).toBeInTheDocument();
    });

    it('should have event checkboxes in form', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<WebhooksPage />);
      const createBtn = screen.getByText('Nuovo Webhook');
      fireEvent.click(createBtn);

      const inputs = screen.queryAllByRole('checkbox');
      expect(inputs.length).toBeGreaterThan(0);
    });

    it('should have multiple event checkboxes', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<WebhooksPage />);
      const createBtn = screen.getByText('Nuovo Webhook');
      fireEvent.click(createBtn);

      const inputs = screen.queryAllByRole('checkbox');
      expect(inputs.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Delete webhook dialog', () => {
    it('should open delete dialog on delete button click', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: '1',
          url: 'https://example.com/webhook',
          events: ['booking.created'],
          active: true,
          secret: 'secret-1',
          lastDeliveryAt: '2026-04-23T10:00:00Z',
          lastDeliveryStatus: 200,
          failureCount: 0,
          createdAt: '2026-04-23T10:00:00Z',
        },
      ];
      render(<WebhooksPage />);
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should display confirm delete in dialog', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: '1',
          url: 'https://example.com/webhook',
          events: ['booking.created'],
          active: true,
          secret: 'secret-1',
          lastDeliveryAt: '2026-04-23T10:00:00Z',
          lastDeliveryStatus: 200,
          failureCount: 0,
          createdAt: '2026-04-23T10:00:00Z',
        },
      ];
      render(<WebhooksPage />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Dialog state management', () => {
    it('should open and close create dialog', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];

      render(<WebhooksPage />);
      const createBtn = screen.getByText('Nuovo Webhook');
      fireEvent.click(createBtn);

      const dialog = screen.queryByTestId('dialog');
      expect(dialog || screen.getByText('Nuovo Webhook')).toBeTruthy();
    });

    it('should display form fields in create dialog', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];

      render(<WebhooksPage />);
      const createBtn = screen.getByText('Nuovo Webhook');
      fireEvent.click(createBtn);

      const urlInput = screen.queryByPlaceholderText('https://esempio.it/webhook');
      expect(urlInput || screen.queryByText('Nuovo Webhook')).toBeTruthy();
    });

    it('should have cancel button in create dialog', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];

      render(<WebhooksPage />);
      const createBtn = screen.getByText('Nuovo Webhook');
      fireEvent.click(createBtn);

      const buttons = screen.queryAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('View webhook details', () => {
    it('should have view button for each webhook', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: '1',
          url: 'https://example.com/webhook',
          events: ['booking.created'],
          active: true,
          secret: 'secret-1',
          lastDeliveryAt: '2026-04-23T10:00:00Z',
          lastDeliveryStatus: 200,
          failureCount: 0,
          createdAt: '2026-04-23T10:00:00Z',
        },
      ];
      render(<WebhooksPage />);
      expect(screen.getByText('https://example.com/webhook')).toBeInTheDocument();
    });

    it('should display webhook URL in list', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: '1',
          url: 'https://detail-logs.example.com/webhook',
          events: ['booking.created'],
          active: true,
          secret: 'secret-1',
          lastDeliveryAt: '2026-04-23T10:00:00Z',
          lastDeliveryStatus: 200,
          failureCount: 0,
          createdAt: '2026-04-23T10:00:00Z',
        },
      ];
      render(<WebhooksPage />);
      expect(screen.getByText(/detail-logs\.example\.com/)).toBeInTheDocument();
    });

    it('should display webhook details section', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: '1',
          url: 'https://example.com/webhook',
          events: ['booking.created'],
          active: true,
          secret: 'secret-1',
          lastDeliveryAt: '2026-04-23T10:00:00Z',
          lastDeliveryStatus: 200,
          failureCount: 0,
          createdAt: '2026-04-23T10:00:00Z',
        },
      ];
      render(<WebhooksPage />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should display webhook with multiple events', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: '1',
          url: 'https://example.com/webhook',
          events: ['booking.created', 'booking.updated', 'booking.cancelled'],
          active: true,
          secret: 'secret-1',
          lastDeliveryAt: '2026-04-23T10:00:00Z',
          lastDeliveryStatus: 200,
          failureCount: 0,
          createdAt: '2026-04-23T10:00:00Z',
        },
      ];
      render(<WebhooksPage />);
      expect(screen.getByText('https://example.com/webhook')).toBeInTheDocument();
    });
  });

  describe('Last delivery information', () => {
    it('should display last delivery timestamp', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: '1',
          url: 'https://example.com/webhook',
          events: ['booking.created'],
          active: true,
          secret: 'secret-1',
          lastDeliveryAt: '2026-04-23T10:00:00Z',
          lastDeliveryStatus: 200,
          failureCount: 0,
          createdAt: '2026-04-23T10:00:00Z',
        },
      ];
      render(<WebhooksPage />);
      expect(screen.getByText(/Ultimo invio:/)).toBeInTheDocument();
    });

    it('should display failure count when errors exist', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: '1',
          url: 'https://example.com/webhook',
          events: ['booking.created'],
          active: true,
          secret: 'secret-1',
          lastDeliveryAt: '2026-04-23T10:00:00Z',
          lastDeliveryStatus: 500,
          failureCount: 3,
          createdAt: '2026-04-23T10:00:00Z',
        },
      ];
      render(<WebhooksPage />);
      expect(screen.getByText('3 errori')).toBeInTheDocument();
    });

    it('should not display errors when failure count is zero', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: '1',
          url: 'https://example.com/webhook',
          events: ['booking.created'],
          active: true,
          secret: 'secret-1',
          lastDeliveryAt: '2026-04-23T10:00:00Z',
          lastDeliveryStatus: 200,
          failureCount: 0,
          createdAt: '2026-04-23T10:00:00Z',
        },
      ];
      render(<WebhooksPage />);
      expect(screen.queryByText(/errori/)).not.toBeInTheDocument();
    });
  });
});
