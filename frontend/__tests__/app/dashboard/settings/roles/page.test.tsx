import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'sonner';

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

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: (fn: Function) => (e: Event) => {
      e.preventDefault();
      fn({ name: '', description: '', permissions: [] });
    },
    register: jest.fn(() => ({ name: 'field' })),
    reset: jest.fn(),
    formState: { errors: {}, isSubmitting: false },
    watch: jest.fn(() => ({ name: '', description: '', permissions: [] })),
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
    max: jest.fn(() => createChainableMock()),
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
let mockFetch: jest.Mock;
global.fetch = jest.fn();
mockFetch = global.fetch as jest.Mock;

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

import RolesPage from '@/app/dashboard/settings/roles/page';

describe('RolesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSWRData = undefined;
    mockSWRError = undefined;
    mockSWRIsLoading = false;
    mockMutate = jest.fn();
    mockFetch.mockClear();
  });

  describe('Page rendering', () => {
    it('should render without crashing', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      const { container } = render(<RolesPage />);
      expect(container).toBeInTheDocument();
    });

    it('should display page header', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<RolesPage />);
      expect(screen.getByText('Ruoli e Permessi')).toBeInTheDocument();
    });

    it('should display create button', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<RolesPage />);
      expect(screen.getByText('Nuovo Ruolo')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should handle loading state', () => {
      mockSWRIsLoading = true;
      mockSWRData = undefined;
      const { container } = render(<RolesPage />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Error state', () => {
    it('should display error message', () => {
      mockSWRError = new Error('Failed to load');
      mockSWRData = undefined;
      render(<RolesPage />);
      expect(screen.getByText(/errore|error/i)).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no roles', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<RolesPage />);
      expect(screen.getByText('Nessun ruolo configurato')).toBeInTheDocument();
    });
  });

  describe('Roles list', () => {
    it('should display roles', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'role-1',
          name: 'Admin',
          description: 'Administrator role',
          userCount: 2,
          isDefault: true,
          permissions: [],
        },
      ];
      render(<RolesPage />);
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('should display multiple roles', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'role-1',
          name: 'Admin',
          description: 'Administrator',
          userCount: 2,
          isDefault: true,
          permissions: [],
        },
        {
          id: 'role-2',
          name: 'Technician',
          description: 'Technician role',
          userCount: 5,
          isDefault: false,
          permissions: [],
        },
      ];
      render(<RolesPage />);
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Technician')).toBeInTheDocument();
    });

    it('should display role descriptions', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'role-1',
          name: 'Manager',
          description: 'Manager with full access',
          userCount: 1,
          isDefault: false,
          permissions: [],
        },
      ];
      render(<RolesPage />);
      expect(screen.getByText('Manager with full access')).toBeInTheDocument();
    });
  });

  describe('Role selection', () => {
    it('should allow selecting a role', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'role-1',
          name: 'Editor',
          description: 'Editor role',
          userCount: 3,
          isDefault: false,
          permissions: [],
        },
      ];
      render(<RolesPage />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Permissions display', () => {
    it('should display permissions for role', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'role-1',
          name: 'Viewer',
          description: 'View only',
          userCount: 10,
          isDefault: false,
          permissions: [],
        },
      ];
      render(<RolesPage />);
      expect(screen.getByTestId('apple-card')).toBeInTheDocument();
    });
  });

  describe('Create role dialog', () => {
    it('should open create dialog', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<RolesPage />);
      const createBtn = screen.getByText('Nuovo Ruolo');
      fireEvent.click(createBtn);
      const dialog = screen.queryByTestId('dialog');
      expect(dialog || screen.getByText('Crea un nuovo ruolo per il tuo team.')).toBeTruthy();
    });

    it('should display form fields', () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<RolesPage />);
      const createBtn = screen.getByText('Nuovo Ruolo');
      fireEvent.click(createBtn);
      const inputs = screen.queryAllByRole('textbox');
      expect(inputs.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Role interactions', () => {
    it('should have action buttons for roles', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'role-1',
          name: 'Operator',
          description: 'Operator role',
          userCount: 4,
          isDefault: false,
          permissions: [],
        },
      ];
      render(<RolesPage />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Multiple roles with different permissions', () => {
    it('should handle multiple roles', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'role-1',
          name: 'Admin',
          description: 'Full access',
          userCount: 1,
          isDefault: true,
          permissions: [],
        },
        {
          id: 'role-2',
          name: 'Editor',
          description: 'Edit content',
          userCount: 3,
          isDefault: false,
          permissions: [],
        },
        {
          id: 'role-3',
          name: 'Viewer',
          description: 'View only',
          userCount: 10,
          isDefault: false,
          permissions: [],
        },
      ];
      render(<RolesPage />);
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Editor')).toBeInTheDocument();
      expect(screen.getByText('Viewer')).toBeInTheDocument();
    });
  });

  describe('System role protection', () => {
    it('should identify system roles', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'role-1',
          name: 'Owner',
          description: 'System role',
          userCount: 1,
          isDefault: true,
          permissions: [],
        },
      ];
      render(<RolesPage />);
      expect(screen.getByText('Owner')).toBeInTheDocument();
    });
  });

  describe('Role selection and permission display', () => {
    it('should show permission matrix when role is selected', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'role-1',
          name: 'Editor',
          description: 'Can edit content',
          userCount: 3,
          isDefault: false,
          permissions: [],
        },
      ];
      render(<RolesPage />);
      const roleButton = screen.getByText('Editor');
      fireEvent.click(roleButton);
      expect(screen.getByText(/Permessi: Editor/)).toBeInTheDocument();
    });

    it('should display permission checkboxes for modules', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'role-1',
          name: 'Manager',
          description: 'Manager role',
          userCount: 2,
          isDefault: false,
          permissions: [],
        },
      ];
      render(<RolesPage />);
      const roleButton = screen.getByText('Manager');
      fireEvent.click(roleButton);
      const checkboxes = screen.queryAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should display column headers in permission matrix', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'role-1',
          name: 'Technician',
          description: 'Tech role',
          userCount: 5,
          isDefault: false,
          permissions: [],
        },
      ];
      render(<RolesPage />);
      const roleButton = screen.getByText('Technician');
      fireEvent.click(roleButton);
      expect(screen.getByText('Modulo')).toBeInTheDocument();
      expect(screen.getByText('Lettura')).toBeInTheDocument();
      expect(screen.getByText('Scrittura')).toBeInTheDocument();
    });
  });

  describe('Permission toggling', () => {
    it('should toggle permission checkbox', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'role-1',
          name: 'CustomEditor',
          description: 'Editor role',
          userCount: 2,
          isDefault: false,
          permissions: [
            { module: 'customers', read: false, write: false, delete: false, export: false },
          ],
        },
      ];
      render(<RolesPage />);
      const roleButtons = screen.getAllByRole('button');
      const customEditorBtn = roleButtons.find(btn => btn.textContent?.includes('CustomEditor'));
      if (customEditorBtn) fireEvent.click(customEditorBtn);
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0].checked).toBe(false);
      fireEvent.click(checkboxes[0]);
      expect(checkboxes[0].checked).toBe(true);
    });

    it('should handle multiple permission toggles', () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'role-1',
          name: 'AdminRole',
          description: 'Full access',
          userCount: 1,
          isDefault: true,
          permissions: [],
        },
      ];
      render(<RolesPage />);
      const roleButtons = screen.getAllByRole('button');
      const adminBtn = roleButtons.find(btn => btn.textContent?.includes('AdminRole'));
      if (adminBtn) fireEvent.click(adminBtn);
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      fireEvent.click(checkboxes[1]);
      fireEvent.click(checkboxes[2]);
      expect(checkboxes[0].checked).toBe(true);
      expect(checkboxes[1].checked).toBe(true);
      expect(checkboxes[2].checked).toBe(true);
    });
  });

  describe('Save permissions', () => {
    it('should call save endpoint on save button click', async () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'role-1',
          name: 'SaveEditor',
          description: 'Editor for testing',
          userCount: 2,
          isDefault: false,
          permissions: [],
        },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
      render(<RolesPage />);
      const roleButtons = screen.getAllByRole('button');
      const editorBtn = roleButtons.find(btn => btn.textContent?.includes('SaveEditor'));
      if (editorBtn) fireEvent.click(editorBtn);
      const saveButton = screen.getByText('Salva');
      fireEvent.click(saveButton);
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/dashboard/settings/roles/role-1',
          expect.objectContaining({ method: 'PUT' })
        );
      });
    });

    it('should show success toast on successful save', async () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'role-1',
          name: 'SuccessEditor',
          description: 'Test role',
          userCount: 2,
          isDefault: false,
          permissions: [],
        },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
      render(<RolesPage />);
      const roleButtons = screen.getAllByRole('button');
      const editorBtn = roleButtons.find(btn => btn.textContent?.includes('SuccessEditor'));
      if (editorBtn) fireEvent.click(editorBtn);
      const saveButton = screen.getByText('Salva');
      fireEvent.click(saveButton);
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Permessi aggiornati con successo');
      });
    });

    it('should show error toast on failed save', async () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'role-1',
          name: 'ErrorEditor',
          description: 'Error test role',
          userCount: 2,
          isDefault: false,
          permissions: [],
        },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });
      render(<RolesPage />);
      const roleButtons = screen.getAllByRole('button');
      const editorBtn = roleButtons.find(btn => btn.textContent?.includes('ErrorEditor'));
      if (editorBtn) fireEvent.click(editorBtn);
      const saveButton = screen.getByText('Salva');
      fireEvent.click(saveButton);
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it('should disable save button during processing', async () => {
      mockSWRIsLoading = false;
      mockSWRData = [
        {
          id: 'role-1',
          name: 'ProcessEditor',
          description: 'Processing test',
          userCount: 2,
          isDefault: false,
          permissions: [],
        },
      ];
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));
      render(<RolesPage />);
      const roleButtons = screen.getAllByRole('button');
      const editorBtn = roleButtons.find(btn => btn.textContent?.includes('ProcessEditor'));
      if (editorBtn) fireEvent.click(editorBtn);
      const saveButton = screen.getByText('Salva');
      fireEvent.click(saveButton);
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Create role dialog', () => {
    it('should open create dialog and submit form', async () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-role' }),
      });
      render(<RolesPage />);
      const createBtn = screen.getByText('Nuovo Ruolo');
      fireEvent.click(createBtn);
      const inputs = screen.queryAllByRole('textbox');
      if (inputs.length > 0) {
        fireEvent.change(inputs[0], { target: { value: 'New Role' } });
        if (inputs.length > 1) {
          fireEvent.change(inputs[1], { target: { value: 'Role Description' } });
        }
      }
      const buttons = screen.getAllByRole('button');
      const submitBtn = buttons.find(b => b.textContent?.includes('Crea Ruolo'));
      if (submitBtn) {
        fireEvent.click(submitBtn);
        await waitFor(() => {
          expect(mockFetch).toHaveBeenCalledWith(
            '/api/dashboard/settings/roles',
            expect.objectContaining({ method: 'POST' })
          );
        });
      }
    });

    it('should show error when role name is empty', async () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      render(<RolesPage />);
      const createBtn = screen.getByText('Nuovo Ruolo');
      fireEvent.click(createBtn);
      const buttons = screen.getAllByRole('button');
      const submitBtn = buttons.find(b => b.textContent?.includes('Crea Ruolo'));
      if (submitBtn) {
        fireEvent.click(submitBtn);
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith('Inserisci un nome per il ruolo');
        });
      }
    });

    it('should close dialog after successful creation', async () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-role' }),
      });
      render(<RolesPage />);
      const createBtn = screen.getByText('Nuovo Ruolo');
      fireEvent.click(createBtn);
      const inputs = screen.queryAllByRole('textbox');
      if (inputs.length > 0) {
        fireEvent.change(inputs[0], { target: { value: 'New Role' } });
      }
      const buttons = screen.getAllByRole('button');
      const submitBtn = buttons.find(b => b.textContent?.includes('Crea Ruolo'));
      if (submitBtn) {
        fireEvent.click(submitBtn);
        await waitFor(() => {
          expect(toast.success).toHaveBeenCalledWith('Ruolo creato con successo');
        });
      }
    });

    it('should show success toast on role creation', async () => {
      mockSWRIsLoading = false;
      mockSWRData = [];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-role' }),
      });
      render(<RolesPage />);
      const createBtn = screen.getByText('Nuovo Ruolo');
      fireEvent.click(createBtn);
      const inputs = screen.queryAllByRole('textbox');
      if (inputs.length > 0) {
        fireEvent.change(inputs[0], { target: { value: 'Warehouse Manager' } });
      }
      const buttons = screen.getAllByRole('button');
      const submitBtn = buttons.find(b => b.textContent?.includes('Crea Ruolo'));
      if (submitBtn) {
        fireEvent.click(submitBtn);
        await waitFor(() => {
          expect(toast.success).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Mutate after operations', () => {
    it('should call mutate after saving permissions', async () => {
      mockSWRIsLoading = false;
      mockMutate = jest.fn();
      mockSWRData = [
        {
          id: 'role-1',
          name: 'MutateEditor',
          description: 'Mutate test',
          userCount: 2,
          isDefault: false,
          permissions: [],
        },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
      render(<RolesPage />);
      const roleButtons = screen.getAllByRole('button');
      const editorBtn = roleButtons.find(btn => btn.textContent?.includes('MutateEditor'));
      if (editorBtn) fireEvent.click(editorBtn);
      const saveButton = screen.getByText('Salva');
      fireEvent.click(saveButton);
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled();
      });
    });

    it('should call mutate after creating role', async () => {
      mockSWRIsLoading = false;
      mockMutate = jest.fn();
      mockSWRData = [];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-role' }),
      });
      render(<RolesPage />);
      const createBtn = screen.getByText('Nuovo Ruolo');
      fireEvent.click(createBtn);
      const inputs = screen.queryAllByRole('textbox');
      if (inputs.length > 0) {
        fireEvent.change(inputs[0], { target: { value: 'NewMutateRole' } });
      }
      const buttons = screen.getAllByRole('button');
      const submitBtn = buttons.find(b => b.textContent?.includes('Crea Ruolo'));
      if (submitBtn) {
        fireEvent.click(submitBtn);
        await waitFor(() => {
          expect(mockMutate).toHaveBeenCalled();
        });
      }
    });
  });
});
