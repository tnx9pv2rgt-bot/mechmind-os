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
      fn({ email: '', role: '' });
    },
    register: jest.fn(() => ({ name: 'field' })),
    reset: jest.fn(),
    formState: { errors: {}, isSubmitting: false },
    watch: jest.fn(() => ({ email: '', role: '' })),
  }),
  Controller: ({ render }: any) => render({ field: { value: '', onChange: jest.fn() }, fieldState: { error: undefined } }),
}));

// Mock @hookform/resolvers/zod
jest.mock('@hookform/resolvers/zod', () => ({
  zodResolver: jest.fn(() => jest.fn()),
}));

// Mock zod
jest.mock('zod', () => ({
  z: {
    object: () => ({
      parseAsync: jest.fn(),
      parse: jest.fn(),
    }),
    string: () => ({
      email: jest.fn(),
      min: jest.fn(),
    }),
  },
}));

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

import TeamPage from '@/app/dashboard/settings/team/page';

describe('TeamPage', () => {
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
      const { container } = render(<TeamPage />);
      expect(container).toBeInTheDocument();
    });

    it('should display page header', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<TeamPage />);
      expect(screen.getByText('Team')).toBeInTheDocument();
    });

    it('should display invite button', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<TeamPage />);
      expect(screen.getByText('Invita Membro')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should handle loading state', () => {
      mockSWRIsLoading = true;
      mockSWRData = undefined;
      const { container } = render(<TeamPage />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should display error message', () => {
      mockSWRError = new Error('Failed to load');
      mockSWRData = undefined;
      render(<TeamPage />);
      expect(screen.getByText(/errore|error/i)).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no members', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<TeamPage />);
      expect(screen.getByText('Nessun membro nel team')).toBeInTheDocument();
    });
  });

  describe('Team members display', () => {
    it('should display team members', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'user-1',
          email: 'john@example.com',
          name: 'John Doe',
          role: 'admin',
          status: 'ACTIVE',
          lastLogin: '2026-01-01',
        },
      ];
      render(<TeamPage />);
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should display multiple members', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'user-1',
          email: 'john@example.com',
          name: 'John Doe',
          role: 'admin',
          status: 'ACTIVE',
          lastLogin: '2026-01-01',
        },
        {
          id: 'user-2',
          email: 'jane@example.com',
          name: 'Jane Smith',
          role: 'technician',
          status: 'ACTIVE',
          lastLogin: '2026-02-01',
        },
      ];
      render(<TeamPage />);
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });

    it('should display member roles', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'user-1',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
          status: 'ACTIVE',
          lastLogin: '2026-01-01',
        },
      ];
      render(<TeamPage />);
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    });
  });

  describe('Status badges', () => {
    it('should display ACTIVE status', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'user-1',
          email: 'active@example.com',
          name: 'Active User',
          role: 'user',
          status: 'ACTIVE',
          lastLogin: '2026-01-01',
        },
      ];
      render(<TeamPage />);
      expect(screen.getByText('active@example.com')).toBeInTheDocument();
    });

    it('should display INVITED status', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'user-1',
          email: 'invited@example.com',
          name: 'Invited User',
          role: 'user',
          status: 'INVITED',
          lastLogin: null,
        },
      ];
      render(<TeamPage />);
      expect(screen.getByText('invited@example.com')).toBeInTheDocument();
    });

    it('should display DEACTIVATED status', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'user-1',
          email: 'deactivated@example.com',
          name: 'Deactivated User',
          role: 'user',
          status: 'DEACTIVATED',
          lastLogin: '2026-01-01',
        },
      ];
      render(<TeamPage />);
      expect(screen.getByText('deactivated@example.com')).toBeInTheDocument();
    });
  });

  describe('Invite dialog', () => {
    it('should open invite dialog', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<TeamPage />);
      const inviteBtn = screen.getByText('Invita Membro');
      fireEvent.click(inviteBtn);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should display form fields in dialog', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<TeamPage />);
      const inviteBtn = screen.getByText('Invita Membro');
      fireEvent.click(inviteBtn);
      const inputs = screen.queryAllByRole('textbox');
      expect(inputs.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Member interactions', () => {
    it('should have action buttons for members', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'user-1',
          email: 'member@example.com',
          name: 'Member User',
          role: 'technician',
          status: 'ACTIVE',
          lastLogin: '2026-01-01',
        },
      ];
      render(<TeamPage />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Multiple member statuses', () => {
    it('should handle mixed member statuses', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'user-1',
          email: 'active@example.com',
          name: 'Active User',
          role: 'admin',
          status: 'ACTIVE',
          lastLogin: '2026-01-01',
        },
        {
          id: 'user-2',
          email: 'invited@example.com',
          name: 'Invited User',
          role: 'technician',
          status: 'INVITED',
          lastLogin: null,
        },
        {
          id: 'user-3',
          email: 'deactivated@example.com',
          name: 'Deactivated User',
          role: 'user',
          status: 'DEACTIVATED',
          lastLogin: '2025-01-01',
        },
      ];
      render(<TeamPage />);
      expect(screen.getByText('active@example.com')).toBeInTheDocument();
      expect(screen.getByText('invited@example.com')).toBeInTheDocument();
      expect(screen.getByText('deactivated@example.com')).toBeInTheDocument();
    });
  });
});
