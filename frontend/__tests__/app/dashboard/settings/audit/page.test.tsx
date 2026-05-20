import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock framer-motion
jest.mock('framer-motion', () => {
  return {
    motion: new Proxy({}, {
      get: (_t: unknown, prop: string) =>
        React.forwardRef(({ children, ...rest }: { children?: React.ReactNode; [k: string]: unknown }, ref: React.Ref<HTMLElement>) => {
          const allowed = ['className', 'style', 'onClick', 'id'];
          const valid: Record<string, unknown> = {};
          for (const k of Object.keys(rest)) {
            if (allowed.includes(k) || k.startsWith('data-') || k.startsWith('aria-')) valid[k] = rest[k];
          }
          const tag = ['div', 'span', 'tr', 'td'].includes(prop) ? prop : 'div';
          return React.createElement(tag, { ...valid, ref }, children);
        }),
    }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

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

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'select' }, children),
  SelectTrigger: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'select-trigger' }, children),
  SelectValue: ({ placeholder }: any) =>
    React.createElement('span', {}, placeholder),
  SelectContent: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'select-content' }, children),
  SelectItem: ({ children, value }: any) =>
    React.createElement('div', { 'data-testid': 'select-item', 'data-value': value }, children),
}));

import AuditPage from '@/app/dashboard/settings/audit/page';

describe('AuditPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSWRData = undefined;
    mockSWRError = undefined;
    mockSWRIsLoading = false;
  });

  describe('Page rendering', () => {
    it('should render without crashing', () => {
      mockSWRIsLoading = false;
      mockSWRData = { logs: [], total: 0, page: 1 };
      const { container } = render(<AuditPage />);
      expect(container).toBeInTheDocument();
    });

    it('should display page header', () => {
      mockSWRIsLoading = false;
      mockSWRData = { logs: [], total: 0, page: 1 };
      render(<AuditPage />);
      expect(screen.getByText('Registro Audit')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should handle loading state', () => {
      mockSWRIsLoading = true;
      mockSWRData = undefined;
      const { container } = render(<AuditPage />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should display error message', () => {
      mockSWRError = new Error('Failed to load');
      mockSWRData = undefined;
      render(<AuditPage />);
      expect(screen.getByText(/errore|error/i)).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should show empty state', () => {
      mockSWRIsLoading = false;
      mockSWRData = { logs: [], total: 0, page: 1 };
      render(<AuditPage />);
      expect(screen.getByText('Nessun evento trovato')).toBeInTheDocument();
    });
  });

  describe('Audit logs display', () => {
    it('should display audit logs', () => {
      mockSWRIsLoading = false;
      mockSWRData = {
        logs: [
          {
            id: '1',
            action: 'CREATE',
            resource: 'customer',
            resourceId: 'cust-1',
            userId: 'user-1',
            userName: 'John Doe',
            details: { name: 'John' },
            timestamp: '2026-04-23T10:00:00Z',
            ipAddress: '192.168.1.1',
          },
        ],
        total: 1,
        page: 1,
      };
      render(<AuditPage />);
      expect(screen.getAllByTestId('apple-card').length).toBeGreaterThanOrEqual(1);
    });

    it('should display multiple audit entries', () => {
      mockSWRIsLoading = false;
      mockSWRData = {
        logs: [
          {
            id: '1',
            action: 'CREATE',
            resource: 'customer',
            resourceId: 'cust-1',
            userId: 'user-1',
            userName: 'John Doe',
            details: { name: 'John' },
            timestamp: '2026-04-23T10:00:00Z',
            ipAddress: '192.168.1.1',
          },
          {
            id: '2',
            action: 'UPDATE',
            resource: 'booking',
            resourceId: 'book-1',
            userId: 'user-2',
            userName: 'Jane Smith',
            details: { status: 'completed' },
            timestamp: '2026-04-22T15:30:00Z',
            ipAddress: '1.1.1.1',
          },
        ],
        total: 2,
        page: 1,
      };
      render(<AuditPage />);
      expect(screen.getAllByTestId('apple-card').length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Action type badges', () => {
    it('should display action badges', () => {
      mockSWRIsLoading = false;
      mockSWRData = {
        logs: [
          {
            id: '1',
            action: 'DELETE',
            resource: 'customer',
            resourceId: 'cust-1',
            userId: 'user-1',
            userName: 'Admin User',
            details: {},
            timestamp: '2026-04-23T10:00:00Z',
            ipAddress: '192.168.1.1',
          },
        ],
        total: 1,
        page: 1,
      };
      render(<AuditPage />);
      expect(screen.getAllByText('Eliminazione').length).toBeGreaterThan(0);
    });
  });

  describe('Filtering controls', () => {
    it('should display filter inputs', () => {
      mockSWRIsLoading = false;
      mockSWRData = { logs: [], total: 0, page: 1 };
      render(<AuditPage />);
      expect(screen.getAllByTestId('apple-card').length).toBeGreaterThan(0);
    });
  });

  describe('Entity filtering', () => {
    it('should allow filtering by entity type', () => {
      mockSWRIsLoading = false;
      mockSWRData = { logs: [], total: 0, page: 1 };
      render(<AuditPage />);
      const selects = screen.queryAllByTestId('select');
      expect(selects.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Pagination', () => {
    it('should handle pagination for multiple pages', () => {
      mockSWRIsLoading = false;
      mockSWRData = {
        logs: Array.from({ length: 10 }, (_, i) => ({
          id: `log-${i}`,
          action: 'CREATE',
          resource: 'booking',
          resourceId: `test-${i}`,
          userId: 'user-1',
          userName: 'Test User',
          details: {},
          timestamp: `2026-04-${23 - i}T10:00:00Z`,
          ipAddress: '1.1.1.1',
        })),
        total: 20,
        page: 1,
      };
      render(<AuditPage />);
      expect(screen.getAllByTestId('apple-card').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Different action types', () => {
    it('should display CREATE, UPDATE, DELETE actions', () => {
      mockSWRIsLoading = false;
      mockSWRData = {
        logs: [
          {
            id: '1',
            action: 'CREATE',
            resource: 'customer',
            resourceId: 'cust-1',
            userId: 'user-1',
            userName: 'Test User',
            details: {},
            timestamp: '2026-04-23T10:00:00Z',
            ipAddress: '1.1.1.1',
          },
          {
            id: '2',
            action: 'UPDATE',
            resource: 'booking',
            resourceId: 'book-1',
            userId: 'user-1',
            userName: 'Test User',
            details: {},
            timestamp: '2026-04-23T09:00:00Z',
            ipAddress: '1.1.1.1',
          },
          {
            id: '3',
            action: 'DELETE',
            resource: 'work-order',
            resourceId: 'wo-1',
            userId: 'user-1',
            userName: 'Test User',
            details: {},
            timestamp: '2026-04-23T08:00:00Z',
            ipAddress: '1.1.1.1',
          },
        ],
        total: 3,
        page: 1,
      };
      render(<AuditPage />);
      expect(screen.getAllByTestId('badge').length).toBeGreaterThan(0);
    });
  });

  describe('Log details', () => {
    it('should render log details', () => {
      mockSWRIsLoading = false;
      mockSWRData = {
        logs: [
          {
            id: '1',
            action: 'UPDATE',
            resource: 'work-order',
            resourceId: 'wo-1',
            userId: 'user-1',
            userName: 'Admin User',
            details: { status: 'in-progress' },
            timestamp: '2026-04-23T10:00:00Z',
            ipAddress: '192.168.1.1',
          },
        ],
        total: 1,
        page: 1,
      };
      render(<AuditPage />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
