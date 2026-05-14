/**
 * Tests for useCrudToast hook (hooks/use-crud-toast.ts)
 * Tests: success messages (create, update, delete), error messages.
 */

import { useCrudToast } from '@/hooks/use-crud-toast';
import { toast } from 'sonner';

// =============================================================================
// Mocks
// =============================================================================
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// =============================================================================
// Tests
// =============================================================================
describe('useCrudToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns object with CRUD toast methods', () => {
    const result = useCrudToast('Utente');
    expect(result).toHaveProperty('onCreateSuccess');
    expect(result).toHaveProperty('onUpdateSuccess');
    expect(result).toHaveProperty('onDeleteSuccess');
    expect(result).toHaveProperty('onError');
    expect(typeof result.onCreateSuccess).toBe('function');
    expect(typeof result.onUpdateSuccess).toBe('function');
    expect(typeof result.onDeleteSuccess).toBe('function');
    expect(typeof result.onError).toBe('function');
  });

  it('onCreateSuccess calls toast.success with entity name', () => {
    const mockSuccess = toast.success as jest.Mock;
    const result = useCrudToast('Prodotto');

    result.onCreateSuccess();

    expect(mockSuccess).toHaveBeenCalledWith('Prodotto creato con successo');
    expect(mockSuccess).toHaveBeenCalledTimes(1);
  });

  it('onUpdateSuccess calls toast.success with entity name', () => {
    const mockSuccess = toast.success as jest.Mock;
    const result = useCrudToast('Veicolo');

    result.onUpdateSuccess();

    expect(mockSuccess).toHaveBeenCalledWith('Veicolo aggiornato con successo');
    expect(mockSuccess).toHaveBeenCalledTimes(1);
  });

  it('onDeleteSuccess calls toast.success with entity name', () => {
    const mockSuccess = toast.success as jest.Mock;
    const result = useCrudToast('Cliente');

    result.onDeleteSuccess();

    expect(mockSuccess).toHaveBeenCalledWith('Cliente eliminato con successo');
    expect(mockSuccess).toHaveBeenCalledTimes(1);
  });

  it('onError calls toast.error with provided error message', () => {
    const mockError = toast.error as jest.Mock;
    const result = useCrudToast('Utente');

    result.onError('Utente non trovato');

    expect(mockError).toHaveBeenCalledWith('Utente non trovato');
    expect(mockError).toHaveBeenCalledTimes(1);
  });

  it('onError calls toast.error with default message when no error provided', () => {
    const mockError = toast.error as jest.Mock;
    const result = useCrudToast('Utente');

    result.onError();

    expect(mockError).toHaveBeenCalledWith("Errore durante l'operazione");
    expect(mockError).toHaveBeenCalledTimes(1);
  });

  it('onError uses provided error message over default', () => {
    const mockError = toast.error as jest.Mock;
    const result = useCrudToast('Prenotazione');
    const customError = 'La data selezionata non è disponibile';

    result.onError(customError);

    expect(mockError).toHaveBeenCalledWith(customError);
    expect(mockError).not.toHaveBeenCalledWith("Errore durante l'operazione");
  });

  it('supports different entity names', () => {
    const mockSuccess = toast.success as jest.Mock;
    const entities = ['Fattura', 'Ricevuta', 'Preventivo'];

    entities.forEach(entity => {
      jest.clearAllMocks();
      const result = useCrudToast(entity);
      result.onCreateSuccess();
      expect(mockSuccess).toHaveBeenCalledWith(`${entity} creato con successo`);
    });
  });

  it('does not affect other entity toasts when one is called', () => {
    const mockSuccess = toast.success as jest.Mock;
    const result1 = useCrudToast('Ordine');
    const result2 = useCrudToast('Articolo');

    result1.onCreateSuccess();

    expect(mockSuccess).toHaveBeenCalledWith('Ordine creato con successo');
    expect(mockSuccess).toHaveBeenCalledTimes(1);

    result2.onDeleteSuccess();

    expect(mockSuccess).toHaveBeenCalledTimes(2);
    expect(mockSuccess).toHaveBeenLastCalledWith('Articolo eliminato con successo');
  });
});
