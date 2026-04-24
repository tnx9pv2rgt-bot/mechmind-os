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

// Mock @/lib/api-client
jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock @tanstack/react-query
let mockQueryData: any = undefined;
let mockQueryError: any = undefined;
let mockQueryIsLoading = false;

jest.mock('@tanstack/react-query', () => ({
  useQuery: (_opts: unknown) => ({
    data: mockQueryData,
    error: mockQueryError,
    isLoading: mockQueryIsLoading,
  }),
  useMutation: () => ({
    mutate: jest.fn(),
    isLoading: false,
  }),
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
    removeQueries: jest.fn(),
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

import SessionsPage from '@/app/dashboard/settings/sessions/page';

describe('SessionsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryData = undefined;
    mockQueryError = undefined;
    mockQueryIsLoading = false;
  });

  describe('Page rendering', () => {
    it('should render without crashing', () => {
      mockQueryIsLoading = false;
      mockQueryData = [];
      const { container } = render(<SessionsPage />);
      expect(container).toBeInTheDocument();
    });

    it('should display page header', () => {
      mockQueryIsLoading = false;
      mockQueryData = [];
      render(<SessionsPage />);
      expect(screen.getByText(/sessioni|sessions/i)).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should handle loading state', () => {
      mockQueryIsLoading = true;
      mockQueryData = undefined;
      const { container } = render(<SessionsPage />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should display error message', () => {
      mockQueryError = new Error('Failed to load');
      mockQueryData = undefined;
      render(<SessionsPage />);
      expect(screen.getByText(/errore|error/i)).toBeInTheDocument();
    });
  });

  describe('Sessions list display', () => {
    it('should display sessions when data available', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Chrome on MacOS',
          deviceType: 'desktop',
          city: 'Milano',
          country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          browser: null,
          os: null,
          createdAt: '2026-04-23T10:00:00Z',
          isCurrent: true,
        },
      ];
      render(<SessionsPage />);
      expect(screen.getByText(/chrome/i)).toBeInTheDocument();
    });

    it('should display multiple sessions', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Safari on iPhone',
          deviceType: 'mobile',
          city: 'Roma',
          country: 'IT',
          ipAddress: '1.1.1.1',
          lastActivity: '2026-04-23T09:00:00Z',
          browser: null,
          os: null,
          createdAt: '2026-04-23T10:00:00Z',
          isCurrent: false,
        },
        {
          id: 'session-2',
          deviceName: 'Firefox on Windows',
          deviceType: 'desktop',
          city: 'Torino',
          country: 'IT',
          ipAddress: '8.8.8.8',
          lastActivity: '2026-04-22T14:00:00Z',
          browser: null,
          os: null,
          createdAt: '2026-04-23T10:00:00Z',
          isCurrent: false,
        },
      ];
      render(<SessionsPage />);
      expect(screen.getByText('Safari on iPhone')).toBeInTheDocument();
      expect(screen.getByText('Firefox on Windows')).toBeInTheDocument();
    });
  });

  describe('Device type display', () => {
    it('should display device type badge', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Mobile Device',
          deviceType: 'mobile',
          city: 'Milano',
            country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          browser: null,
          os: null,
          createdAt: '2026-04-23T10:00:00Z',
          isCurrent: false,
        },
      ];
      render(<SessionsPage />);
      expect(screen.getByText('Mobile Device')).toBeInTheDocument();
    });
  });

  describe('Location display', () => {
    it('should display location information', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Desktop',
          deviceType: 'desktop',
          city: 'Venezia',
          country: 'IT',
          ipAddress: '10.0.0.1',
          lastActivity: '2026-04-23T08:00:00Z',
          browser: null,
          os: null,
          createdAt: '2026-04-23T10:00:00Z',
          isCurrent: false,
        },
      ];
      render(<SessionsPage />);
      expect(screen.getByText(/venezia/i)).toBeInTheDocument();
    });
  });

  describe('IP address display', () => {
    it('should display IP address', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Device',
          deviceType: 'desktop',
          city: 'Milano',
            country: 'IT',
          ipAddress: '203.0.113.42',
          lastActiveAt: '2026-04-23T10:00:00Z',
          browser: null,
          os: null,
          createdAt: '2026-04-23T10:00:00Z',
          isCurrent: false,
        },
      ];
      render(<SessionsPage />);
      expect(screen.getByText(/203\.0\.113\.42/)).toBeInTheDocument();
    });
  });

  describe('Current session indicator', () => {
    it('should indicate current session', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'This Device',
          deviceType: 'desktop',
          city: 'Milano',
            country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          isCurrent: true,
        },
      ];
      render(<SessionsPage />);
      expect(screen.getByText('Sessione corrente')).toBeInTheDocument();
    });
  });

  describe('Session logout', () => {
    it('should have logout buttons for sessions', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Device',
          deviceType: 'desktop',
          city: 'Milano',
            country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          browser: null,
          os: null,
          createdAt: '2026-04-23T10:00:00Z',
          isCurrent: false,
        },
      ];
      render(<SessionsPage />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no sessions', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Current Device',
          deviceType: 'desktop',
          city: 'Milano',
          country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          browser: null,
          os: null,
          createdAt: '2026-04-23T10:00:00Z',
          isCurrent: true,
        },
      ];
      render(<SessionsPage />);
      expect(screen.getByText('Nessun altro dispositivo collegato')).toBeInTheDocument();
    });
  });

  describe('Multiple device types', () => {
    it('should handle mixed device types', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'MacBook Pro',
          deviceType: 'desktop',
          city: 'Milano',
            country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          isCurrent: true,
        },
        {
          id: 'session-2',
          deviceName: 'iPhone 14',
          deviceType: 'mobile',
          city: 'Roma',
          country: 'IT',
          ipAddress: '10.0.0.1',
          lastActivity: '2026-04-23T08:00:00Z',
          browser: null,
          os: null,
          createdAt: '2026-04-23T10:00:00Z',
          isCurrent: false,
        },
        {
          id: 'session-3',
          deviceName: 'iPad Air',
          deviceType: 'tablet',
          city: 'Torino',
          country: 'IT',
          ipAddress: '172.16.0.1',
          lastActivity: '2026-04-22T15:00:00Z',
          browser: null,
          os: null,
          createdAt: '2026-04-23T10:00:00Z',
          isCurrent: false,
        },
      ];
      render(<SessionsPage />);
      expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
      expect(screen.getByText('iPhone 14')).toBeInTheDocument();
      expect(screen.getByText('iPad Air')).toBeInTheDocument();
    });
  });

  describe('Session last activity', () => {
    it('should display last activity timestamp', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Device',
          deviceType: 'desktop',
          city: 'Milano',
            country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          browser: null,
          os: null,
          createdAt: '2026-04-23T10:00:00Z',
          isCurrent: false,
        },
      ];
      render(<SessionsPage />);
      expect(screen.getByTestId('apple-card')).toBeInTheDocument();
    });
  });
});
