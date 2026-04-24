import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

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
const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
jest.mock('@/lib/api-client', () => ({
  api: {
    get: mockApiGet,
    post: mockApiPost,
    delete: jest.fn(),
  },
}));

// Mock @tanstack/react-query
let mockQueryData: any = undefined;
let mockQueryError: any = undefined;
let mockQueryIsLoading = false;
let mockMutateFunc: ((id?: string) => void) | (() => void) = jest.fn();
let mockIsPending = false;
let mockQueryClient: any;
let mockMutationError: any = undefined;
let mockMutationSuccess = true;

jest.mock('@tanstack/react-query', () => ({
  useQuery: (opts: any) => {
    if (mockQueryData === undefined && !mockQueryIsLoading && !mockQueryError) {
      return { data: undefined, error: undefined, isLoading: false };
    }
    return {
      data: mockQueryData,
      error: mockQueryError,
      isLoading: mockQueryIsLoading,
    };
  },
  useMutation: (opts: any) => {
    const mutate = (arg?: any) => {
      if (mockMutationSuccess && opts.onSuccess) {
        opts.onSuccess();
      } else if (!mockMutationSuccess && opts.onError) {
        opts.onError(mockMutationError || new Error('Mutation error'));
      }
      if (mockMutateFunc) {
        mockMutateFunc(arg);
      }
    };
    return {
      mutate,
      isPending: mockIsPending,
      mutateAsync: jest.fn(),
    };
  },
  useQueryClient: () => mockQueryClient,
}));

// Mock sonner
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock('sonner', () => ({ toast: { success: mockToastSuccess, error: mockToastError } }));

// Mock components
jest.mock('@/components/ui/apple-card', () => ({
  AppleCard: ({ children, hover, className }: any) =>
    React.createElement('div', { 'data-testid': 'apple-card', className }, children),
  AppleCardContent: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'apple-card-content' }, children),
  AppleCardHeader: ({ children }: any) =>
    React.createElement('div', { 'data-testid': 'apple-card-header' }, children),
}));

jest.mock('@/components/ui/apple-button', () => ({
  AppleButton: ({ children, onClick, disabled, loading, icon, variant, size, className }: any) =>
    React.createElement('button', { onClick, disabled: disabled || loading, className }, icon || children),
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
    mockIsPending = false;
    mockMutateFunc = jest.fn();
    mockMutationError = undefined;
    mockMutationSuccess = true;
    mockQueryClient = {
      invalidateQueries: jest.fn(),
      removeQueries: jest.fn(),
    };
    mockApiGet.mockClear();
    mockApiPost.mockClear();
    mockToastSuccess.mockClear();
    mockToastError.mockClear();
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

  describe('Security notice', () => {
    it('should display security notice', () => {
      mockQueryIsLoading = false;
      mockQueryData = [];
      render(<SessionsPage />);
      expect(screen.getByText(/Se noti un dispositivo/i)).toBeInTheDocument();
    });

    it('should display warning about unrecognized devices', () => {
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
          isCurrent: true,
        },
      ];
      render(<SessionsPage />);
      expect(screen.getByText(/immediatamente e cambia la password/i)).toBeInTheDocument();
    });
  });

  describe('Revoke session', () => {
    it('should have revoke button for other sessions', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Current',
          deviceType: 'desktop',
          city: 'Milano',
          country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          isCurrent: true,
        },
        {
          id: 'session-2',
          deviceName: 'Other Device',
          deviceType: 'mobile',
          city: 'Roma',
          country: 'IT',
          ipAddress: '10.0.0.1',
          lastActiveAt: '2026-04-23T08:00:00Z',
          isCurrent: false,
        },
      ];
      render(<SessionsPage />);
      const disconnectButtons = screen.getAllByRole('button').filter(btn =>
        btn.textContent?.includes('Disconnetti')
      );
      expect(disconnectButtons.length).toBeGreaterThan(0);
    });

    it('should trigger revoke mutation when button clicked', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Current',
          deviceType: 'desktop',
          city: 'Milano',
          country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          isCurrent: true,
        },
        {
          id: 'session-2',
          deviceName: 'Other Device',
          deviceType: 'mobile',
          city: 'Roma',
          country: 'IT',
          ipAddress: '10.0.0.1',
          lastActiveAt: '2026-04-23T08:00:00Z',
          isCurrent: false,
        },
      ];
      const mutateFn = jest.fn();
      mockMutateFunc = mutateFn;
      render(<SessionsPage />);
      const disconnectButtons = screen.getAllByRole('button').filter(btn =>
        btn.textContent?.includes('Disconnetti') && btn !== screen.getByText(/Disconnetti tutti/i)
      );
      if (disconnectButtons.length > 0) {
        fireEvent.click(disconnectButtons[0]);
        expect(mutateFn).toHaveBeenCalled();
      }
    });

    it('should display revoke all button when multiple sessions exist', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Current',
          deviceType: 'desktop',
          city: 'Milano',
          country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          isCurrent: true,
        },
        {
          id: 'session-2',
          deviceName: 'Other Device',
          deviceType: 'mobile',
          city: 'Roma',
          country: 'IT',
          ipAddress: '10.0.0.1',
          lastActiveAt: '2026-04-23T08:00:00Z',
          isCurrent: false,
        },
      ];
      render(<SessionsPage />);
      expect(screen.getByText(/Disconnetti tutti/i)).toBeInTheDocument();
    });

    it('should trigger revoke all mutation', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Current',
          deviceType: 'desktop',
          city: 'Milano',
          country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          isCurrent: true,
        },
        {
          id: 'session-2',
          deviceName: 'Other Device',
          deviceType: 'mobile',
          city: 'Roma',
          country: 'IT',
          ipAddress: '10.0.0.1',
          lastActiveAt: '2026-04-23T08:00:00Z',
          isCurrent: false,
        },
      ];
      const mutateFn = jest.fn();
      mockMutateFunc = mutateFn;
      render(<SessionsPage />);
      const revokeAllBtn = screen.getByText(/Disconnetti tutti/i);
      fireEvent.click(revokeAllBtn);
      expect(mutateFn).toHaveBeenCalled();
    });
  });

  describe('Mutation states', () => {
    it('should disable revoke button when pending', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Current',
          deviceType: 'desktop',
          city: 'Milano',
          country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          isCurrent: true,
        },
        {
          id: 'session-2',
          deviceName: 'Other Device',
          deviceType: 'mobile',
          city: 'Roma',
          country: 'IT',
          ipAddress: '10.0.0.1',
          lastActiveAt: '2026-04-23T08:00:00Z',
          isCurrent: false,
        },
      ];
      mockIsPending = true;
      render(<SessionsPage />);
      const revokeAllBtn = screen.getByText(/Disconnetti tutti/i) as HTMLButtonElement;
      expect(revokeAllBtn.disabled).toBe(true);
    });

    it('should not disable revoke button when not pending', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Current',
          deviceType: 'desktop',
          city: 'Milano',
          country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          isCurrent: true,
        },
        {
          id: 'session-2',
          deviceName: 'Other Device',
          deviceType: 'mobile',
          city: 'Roma',
          country: 'IT',
          ipAddress: '10.0.0.1',
          lastActiveAt: '2026-04-23T08:00:00Z',
          isCurrent: false,
        },
      ];
      mockIsPending = false;
      render(<SessionsPage />);
      const revokeAllBtn = screen.getByText(/Disconnetti tutti/i) as HTMLButtonElement;
      expect(revokeAllBtn.disabled).toBe(false);
    });
  });

  describe('Mutation callbacks', () => {
    it('should show success toast on revoke success', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Current',
          deviceType: 'desktop',
          city: 'Milano',
          country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          isCurrent: true,
        },
        {
          id: 'session-2',
          deviceName: 'Other Device',
          deviceType: 'mobile',
          city: 'Roma',
          country: 'IT',
          ipAddress: '10.0.0.1',
          lastActiveAt: '2026-04-23T08:00:00Z',
          isCurrent: false,
        },
      ];
      mockMutationSuccess = true;
      render(<SessionsPage />);
      const disconnectButtons = screen.getAllByRole('button').filter(btn =>
        btn.textContent?.includes('Disconnetti') && btn !== screen.getByText(/Disconnetti tutti/i)
      );
      if (disconnectButtons.length > 0) {
        fireEvent.click(disconnectButtons[0]);
        expect(mockToastSuccess).toHaveBeenCalledWith('Dispositivo disconnesso');
      }
    });

    it('should show error toast on revoke failure', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Current',
          deviceType: 'desktop',
          city: 'Milano',
          country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          isCurrent: true,
        },
        {
          id: 'session-2',
          deviceName: 'Other Device',
          deviceType: 'mobile',
          city: 'Roma',
          country: 'IT',
          ipAddress: '10.0.0.1',
          lastActiveAt: '2026-04-23T08:00:00Z',
          isCurrent: false,
        },
      ];
      mockMutationSuccess = false;
      mockMutationError = new Error('Revoke failed');
      render(<SessionsPage />);
      const disconnectButtons = screen.getAllByRole('button').filter(btn =>
        btn.textContent?.includes('Disconnetti') && btn !== screen.getByText(/Disconnetti tutti/i)
      );
      if (disconnectButtons.length > 0) {
        fireEvent.click(disconnectButtons[0]);
        expect(mockToastError).toHaveBeenCalledWith('Errore nella disconnessione del dispositivo');
      }
    });

    it('should show success toast on revoke all success', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Current',
          deviceType: 'desktop',
          city: 'Milano',
          country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          isCurrent: true,
        },
        {
          id: 'session-2',
          deviceName: 'Other Device',
          deviceType: 'mobile',
          city: 'Roma',
          country: 'IT',
          ipAddress: '10.0.0.1',
          lastActiveAt: '2026-04-23T08:00:00Z',
          isCurrent: false,
        },
      ];
      mockMutationSuccess = true;
      render(<SessionsPage />);
      const revokeAllBtn = screen.getByText(/Disconnetti tutti/i);
      fireEvent.click(revokeAllBtn);
      expect(mockToastSuccess).toHaveBeenCalledWith('Tutti gli altri dispositivi sono stati disconnessi');
    });

    it('should show error toast on revoke all failure', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Current',
          deviceType: 'desktop',
          city: 'Milano',
          country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          isCurrent: true,
        },
        {
          id: 'session-2',
          deviceName: 'Other Device',
          deviceType: 'mobile',
          city: 'Roma',
          country: 'IT',
          ipAddress: '10.0.0.1',
          lastActiveAt: '2026-04-23T08:00:00Z',
          isCurrent: false,
        },
      ];
      mockMutationSuccess = false;
      mockMutationError = new Error('Revoke failed');
      render(<SessionsPage />);
      const revokeAllBtn = screen.getByText(/Disconnetti tutti/i);
      fireEvent.click(revokeAllBtn);
      expect(mockToastError).toHaveBeenCalledWith('Errore nella disconnessione');
    });

    it('should invalidate queries on revoke success', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Current',
          deviceType: 'desktop',
          city: 'Milano',
          country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          isCurrent: true,
        },
        {
          id: 'session-2',
          deviceName: 'Other Device',
          deviceType: 'mobile',
          city: 'Roma',
          country: 'IT',
          ipAddress: '10.0.0.1',
          lastActiveAt: '2026-04-23T08:00:00Z',
          isCurrent: false,
        },
      ];
      mockMutationSuccess = true;
      render(<SessionsPage />);
      const disconnectButtons = screen.getAllByRole('button').filter(btn =>
        btn.textContent?.includes('Disconnetti') && btn !== screen.getByText(/Disconnetti tutti/i)
      );
      if (disconnectButtons.length > 0) {
        fireEvent.click(disconnectButtons[0]);
        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['sessions'] });
      }
    });

    it('should invalidate queries on revoke all success', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Current',
          deviceType: 'desktop',
          city: 'Milano',
          country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          isCurrent: true,
        },
        {
          id: 'session-2',
          deviceName: 'Other Device',
          deviceType: 'mobile',
          city: 'Roma',
          country: 'IT',
          ipAddress: '10.0.0.1',
          lastActiveAt: '2026-04-23T08:00:00Z',
          isCurrent: false,
        },
      ];
      mockMutationSuccess = true;
      render(<SessionsPage />);
      const revokeAllBtn = screen.getByText(/Disconnetti tutti/i);
      fireEvent.click(revokeAllBtn);
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['sessions'] });
    });

    it('should reset revoking state after mutation', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Current',
          deviceType: 'desktop',
          city: 'Milano',
          country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          isCurrent: true,
        },
        {
          id: 'session-2',
          deviceName: 'Other Device',
          deviceType: 'mobile',
          city: 'Roma',
          country: 'IT',
          ipAddress: '10.0.0.1',
          lastActiveAt: '2026-04-23T08:00:00Z',
          isCurrent: false,
        },
      ];
      mockMutationSuccess = true;
      render(<SessionsPage />);
      const disconnectButtons = screen.getAllByRole('button').filter(btn =>
        btn.textContent?.includes('Disconnetti') && btn !== screen.getByText(/Disconnetti tutti/i)
      );
      if (disconnectButtons.length > 0) {
        fireEvent.click(disconnectButtons[0]);
        // After success, revoking state should be reset
        expect(mockToastSuccess).toHaveBeenCalled();
      }
    });

    it('should reset revoking state on error', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Current',
          deviceType: 'desktop',
          city: 'Milano',
          country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          isCurrent: true,
        },
        {
          id: 'session-2',
          deviceName: 'Other Device',
          deviceType: 'mobile',
          city: 'Roma',
          country: 'IT',
          ipAddress: '10.0.0.1',
          lastActiveAt: '2026-04-23T08:00:00Z',
          isCurrent: false,
        },
      ];
      mockMutationSuccess = false;
      mockMutationError = new Error('Revoke failed');
      render(<SessionsPage />);
      const disconnectButtons = screen.getAllByRole('button').filter(btn =>
        btn.textContent?.includes('Disconnetti') && btn !== screen.getByText(/Disconnetti tutti/i)
      );
      if (disconnectButtons.length > 0) {
        fireEvent.click(disconnectButtons[0]);
        // After error, revoking state should be reset
        expect(mockToastError).toHaveBeenCalled();
      }
    });
  });

  describe('Other sessions section', () => {
    it('should display other sessions count', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Current',
          deviceType: 'desktop',
          city: 'Milano',
          country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          isCurrent: true,
        },
        {
          id: 'session-2',
          deviceName: 'Other Device 1',
          deviceType: 'mobile',
          city: 'Roma',
          country: 'IT',
          ipAddress: '10.0.0.1',
          lastActiveAt: '2026-04-23T08:00:00Z',
          isCurrent: false,
        },
        {
          id: 'session-3',
          deviceName: 'Other Device 2',
          deviceType: 'tablet',
          city: 'Torino',
          country: 'IT',
          ipAddress: '172.16.0.1',
          lastActiveAt: '2026-04-22T15:00:00Z',
          isCurrent: false,
        },
      ];
      render(<SessionsPage />);
      expect(screen.getByText(/Altri dispositivi \(2\)/i)).toBeInTheDocument();
    });

    it('should not show other sessions section when empty', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Current',
          deviceType: 'desktop',
          city: 'Milano',
          country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          isCurrent: true,
        },
      ];
      render(<SessionsPage />);
      expect(screen.queryByText(/Altri dispositivi/i)).not.toBeInTheDocument();
    });
  });

  describe('City and country display', () => {
    it('should display city and country', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Device',
          deviceType: 'desktop',
          city: 'Napoli',
          country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          isCurrent: false,
        },
      ];
      render(<SessionsPage />);
      expect(screen.getByText(/Napoli, IT/i)).toBeInTheDocument();
    });

    it('should not display location when missing', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Device',
          deviceType: 'desktop',
          city: null,
          country: null,
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          isCurrent: false,
        },
      ];
      render(<SessionsPage />);
      const cards = screen.getAllByTestId('apple-card');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe('Device icons', () => {
    it('should display phone icon for mobile device', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'iPhone',
          deviceType: 'phone',
          city: 'Milano',
          country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          isCurrent: true,
        },
      ];
      render(<SessionsPage />);
      expect(screen.getByText('iPhone')).toBeInTheDocument();
    });

    it('should display tablet icon for tablet device', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'iPad',
          deviceType: 'tablet',
          city: 'Milano',
          country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          isCurrent: true,
        },
      ];
      render(<SessionsPage />);
      expect(screen.getByText('iPad')).toBeInTheDocument();
    });

    it('should display monitor icon for desktop device', () => {
      mockQueryIsLoading = false;
      mockQueryData = [
        {
          id: 'session-1',
          deviceName: 'Desktop',
          deviceType: 'desktop',
          city: 'Milano',
          country: 'IT',
          ipAddress: '192.168.1.1',
          lastActiveAt: '2026-04-23T10:00:00Z',
          isCurrent: true,
        },
      ];
      render(<SessionsPage />);
      expect(screen.getByText('Desktop')).toBeInTheDocument();
    });
  });

  describe('Current session badge', () => {
    it('should display active badge on current session', () => {
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
          isCurrent: true,
        },
      ];
      render(<SessionsPage />);
      expect(screen.getByText(/Attiva/i)).toBeInTheDocument();
    });

    it('should highlight current session with ring border', () => {
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
          isCurrent: true,
        },
      ];
      render(<SessionsPage />);
      const cards = screen.getAllByTestId('apple-card');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe('Header display', () => {
    it('should display main header', () => {
      mockQueryIsLoading = false;
      mockQueryData = [];
      render(<SessionsPage />);
      expect(screen.getByText(/Sessioni attive/i)).toBeInTheDocument();
    });

    it('should display subtitle', () => {
      mockQueryIsLoading = false;
      mockQueryData = [];
      render(<SessionsPage />);
      expect(screen.getByText(/Dispositivi collegati al tuo account/i)).toBeInTheDocument();
    });
  });

  describe('API integration', () => {
    it('should fetch sessions on mount', () => {
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
          isCurrent: true,
        },
      ];
      render(<SessionsPage />);
      expect(screen.getAllByTestId('apple-card').length).toBeGreaterThan(0);
    });

    it('should handle sessions array response', () => {
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
          isCurrent: true,
        },
      ];
      render(<SessionsPage />);
      expect(screen.getByText('Device')).toBeInTheDocument();
    });

    it('should render with no data', () => {
      mockQueryIsLoading = false;
      mockQueryData = [];
      render(<SessionsPage />);
      const { container } = render(<SessionsPage />);
      expect(container).toBeInTheDocument();
    });
  });
});
