import { toast } from 'sonner';

export function useCrudToast(entityName: string) {
  return {
    onCreateSuccess: (): void => {
      toast.success(`${entityName} creato con successo`);
    },
    onUpdateSuccess: (): void => {
      toast.success(`${entityName} aggiornato con successo`);
    },
    onDeleteSuccess: (): void => {
      toast.success(`${entityName} eliminato con successo`);
    },
    onError: (error?: string): void => {
      toast.error(error || "Errore durante l'operazione");
    },
  };
}
