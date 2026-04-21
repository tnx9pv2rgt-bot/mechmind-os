'use client';

import { useState, useRef } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Loader2,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatDate } from '@/lib/utils/format';

type DocType = 'LIBRETTO' | 'ASSICURAZIONE' | 'REVISIONE' | 'BOLLO' | 'ALTRO';

const DOC_TYPE_LABELS: Record<DocType, string> = {
  LIBRETTO: 'Libretto',
  ASSICURAZIONE: 'Assicurazione',
  REVISIONE: 'Revisione',
  BOLLO: 'Bollo',
  ALTRO: 'Altro',
};

const DOC_TYPE_COLORS: Record<DocType, string> = {
  LIBRETTO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  ASSICURAZIONE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  REVISIONE: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  BOLLO: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  ALTRO: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

interface VehicleDoc {
  id: string;
  name: string;
  docType: DocType;
  mimeType: string;
  sizeBytes: number;
  expiryDate?: string | null;
  createdAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocCard({
  doc,
  vehicleId,
  onDeleted,
}: {
  doc: VehicleDoc;
  vehicleId: string;
  onDeleted: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/dashboard/vehicles/${vehicleId}/documents/${doc.id}/download`);
      const json = await res.json() as { data?: { url?: string } };
      const url = json.data?.url;
      if (!url) throw new Error('URL non disponibile');
      window.open(url, '_blank');
    } catch {
      toast.error('Errore durante il download');
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/dashboard/vehicles/${vehicleId}/documents/${doc.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      toast.success('Documento eliminato');
      onDeleted();
    } catch {
      toast.error('Errore durante l\'eliminazione');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();
  const expiringIn = doc.expiryDate
    ? Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <>
      <AppleCard hover={false}>
        <AppleCardContent>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-apple-blue/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-apple-blue" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span
                  className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${DOC_TYPE_COLORS[doc.docType]}`}
                >
                  {DOC_TYPE_LABELS[doc.docType]}
                </span>
                {isExpired && (
                  <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    Scaduto
                  </span>
                )}
                {!isExpired && expiringIn != null && expiringIn <= 60 && (
                  <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                    Scade in {expiringIn} giorni
                  </span>
                )}
              </div>
              <p className="text-body font-medium text-apple-dark dark:text-[var(--text-primary)] truncate">
                {doc.name}
              </p>
              <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)] mt-0.5">
                {formatBytes(doc.sizeBytes)} • {formatDate(doc.createdAt)}
                {doc.expiryDate && ` • Scadenza: ${formatDate(doc.expiryDate)}`}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <AppleButton
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                aria-label="Scarica documento"
                icon={downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              />
              <AppleButton
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                aria-label="Elimina documento"
                icon={<Trash2 className="h-3.5 w-3.5" />}
              />
            </div>
          </div>
        </AppleCardContent>
      </AppleCard>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={(open) => { if (!open) setConfirmDelete(false); }}
        title="Elimina documento"
        description={`Sei sicuro di voler eliminare "${doc.name}"? L'azione non può essere annullata.`}
        confirmLabel="Elimina"
        variant="danger"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
}

interface UploadFormProps {
  vehicleId: string;
  onUploaded: () => void;
}

function UploadForm({ vehicleId, onUploaded }: UploadFormProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<DocType>('ALTRO');
  const [name, setName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error('Seleziona un file'); return; }
    if (!name.trim()) { toast.error('Inserisci un nome'); return; }

    const fd = new FormData();
    fd.append('file', file);
    fd.append('docType', docType);
    fd.append('name', name.trim());
    if (expiryDate) fd.append('expiryDate', expiryDate);

    setUploading(true);
    try {
      const res = await fetch(`/api/dashboard/vehicles/${vehicleId}/documents`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json() as { message?: string };
        throw new Error(err.message ?? 'Errore upload');
      }
      toast.success('Documento caricato');
      setOpen(false);
      setName('');
      setExpiryDate('');
      if (fileRef.current) fileRef.current.value = '';
      onUploaded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore durante il caricamento');
    } finally {
      setUploading(false);
    }
  };

  if (!open) {
    return (
      <AppleButton
        variant="secondary"
        icon={<Upload className="h-4 w-4" />}
        onClick={() => setOpen(true)}
      >
        Carica documento
      </AppleButton>
    );
  }

  return (
    <AppleCard hover={false}>
      <AppleCardContent>
        <h3 className="text-body font-semibold text-apple-dark dark:text-[var(--text-primary)] mb-4">
          Nuovo documento
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-footnote font-medium text-apple-gray dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Tipo *
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocType)}
                className="w-full h-10 px-3 rounded-md border border-apple-border/50 dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-body text-apple-dark dark:text-[var(--text-primary)] focus:outline-none"
              >
                {(Object.entries(DOC_TYPE_LABELS) as [DocType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-footnote font-medium text-apple-gray dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Nome *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="es. Assicurazione 2025"
                className="w-full h-10 px-3 rounded-md border border-apple-border/50 dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-body text-apple-dark dark:text-[var(--text-primary)] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-footnote font-medium text-apple-gray dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Data scadenza
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-apple-border/50 dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] text-body text-apple-dark dark:text-[var(--text-primary)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-footnote font-medium text-apple-gray dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                File * (PDF, JPEG, PNG — max 10MB)
              </label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="w-full text-footnote text-apple-gray dark:text-[var(--text-secondary)] file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-footnote file:font-medium file:bg-apple-blue/10 file:text-apple-blue cursor-pointer"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <AppleButton
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Annulla
            </AppleButton>
            <AppleButton
              type="submit"
              variant="primary"
              icon={uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            >
              {uploading ? 'Caricamento...' : 'Carica'}
            </AppleButton>
          </div>
        </form>
      </AppleCardContent>
    </AppleCard>
  );
}

interface VehicleDocumentsProps {
  vehicleId: string;
}

export function VehicleDocuments({ vehicleId }: VehicleDocumentsProps) {
  const { data, error, isLoading, mutate } = useSWR<{ data: VehicleDoc[] }>(
    `/api/dashboard/vehicles/${vehicleId}/documents`,
    fetcher,
  );

  const docs = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-apple-blue" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-10 w-10 text-apple-red/40 mb-3" />
        <p className="text-body text-apple-gray dark:text-[var(--text-secondary)]">Impossibile caricare i documenti</p>
        <AppleButton variant="ghost" className="mt-3" onClick={() => mutate()}>Riprova</AppleButton>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)]">Documenti</h2>
          <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)] mt-0.5">
            Libretto, assicurazione, revisione, bollo e altri documenti del veicolo
          </p>
        </div>
        <UploadForm vehicleId={vehicleId} onUploaded={() => mutate()} />
      </div>

      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen className="h-12 w-12 text-apple-gray/40 mb-4" />
          <p className="text-body font-medium text-apple-dark dark:text-[var(--text-primary)]">Nessun documento</p>
          <p className="text-footnote text-apple-gray dark:text-[var(--text-secondary)] mt-1">
            Carica libretto, assicurazione, revisione o bollo del veicolo.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <DocCard
              key={doc.id}
              doc={doc}
              vehicleId={vehicleId}
              onDeleted={() => mutate()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
