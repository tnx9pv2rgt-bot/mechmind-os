'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AppleCard, AppleCardContent } from '@/components/ui/apple-card';
import { AppleButton } from '@/components/ui/apple-button';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Breadcrumb } from '@/components/ui/breadcrumb';

interface CsvRow {
  [key: string]: string;
}

interface ImportResult {
  imported: number;
  errors: number;
  details: string[];
}

const CUSTOMER_FIELDS = [
  { key: 'firstName', label: 'Nome' },
  { key: 'lastName', label: 'Cognome' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Telefono' },
  { key: 'fiscalCode', label: 'Codice Fiscale' },
  { key: 'vatNumber', label: 'Partita IVA' },
  { key: 'address', label: 'Indirizzo' },
  { key: 'city', label: 'Città' },
  { key: 'zipCode', label: 'CAP' },
  { key: 'province', label: 'Provincia' },
  { key: 'notes', label: 'Note' },
  { key: '_skip', label: '-- Ignora colonna --' },
];

function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(/[,;\t]/).map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/[,;\t]/).map((v) => v.trim().replace(/^"|"$/g, ''));
    const row: CsvRow = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

export default function CustomerImportPage(): React.ReactElement {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith('.csv') && !f.type.includes('csv') && !f.type.includes('text/plain')) {
      toast.error('Il file deve essere in formato CSV');
      return;
    }
    setFile(f);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCsv(text);
      setCsvHeaders(headers);
      setCsvRows(rows);

      // Auto-map columns by matching names
      const autoMapping: Record<string, string> = {};
      headers.forEach((h) => {
        const lower = h.toLowerCase();
        if (lower.includes('nome') && !lower.includes('cognome')) autoMapping[h] = 'firstName';
        else if (lower.includes('cognome') || lower.includes('surname')) autoMapping[h] = 'lastName';
        else if (lower.includes('email') || lower.includes('e-mail')) autoMapping[h] = 'email';
        else if (lower.includes('telef') || lower.includes('phone') || lower.includes('cellulare')) autoMapping[h] = 'phone';
        else if (lower.includes('fiscal') || lower.includes('codice')) autoMapping[h] = 'fiscalCode';
        else if (lower.includes('iva') || lower.includes('vat')) autoMapping[h] = 'vatNumber';
        else if (lower.includes('indirizzo') || lower.includes('address') || lower.includes('via')) autoMapping[h] = 'address';
        else if (lower.includes('città') || lower.includes('citta') || lower.includes('city')) autoMapping[h] = 'city';
        else if (lower.includes('cap') || lower.includes('zip')) autoMapping[h] = 'zipCode';
        else if (lower.includes('provincia') || lower.includes('prov')) autoMapping[h] = 'province';
        else autoMapping[h] = '_skip';
      });
      setColumnMapping(autoMapping);
    };
    reader.readAsText(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleImport = useCallback(async () => {
    if (csvRows.length === 0) return;

    setIsImporting(true);
    setProgress(0);
    let imported = 0;
    let errors = 0;
    const details: string[] = [];

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      const customerData: Record<string, string> = {};

      Object.entries(columnMapping).forEach(([csvCol, field]) => {
        if (field !== '_skip' && row[csvCol]) {
          customerData[field] = row[csvCol];
        }
      });

      // Must have at least phone or email
      if (!customerData.phone && !customerData.email) {
        errors++;
        details.push(`Riga ${i + 2}: telefono e email mancanti`);
        continue;
      }

      try {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            firstName: customerData.firstName || '',
            lastName: customerData.lastName || '',
            phone: customerData.phone || '',
            email: customerData.email || '',
            notes: customerData.notes || '',
            gdprConsent: true,
            gdprConsentAt: new Date().toISOString(),
            gdprPrivacyVersion: '2.0',
            gdprConsentMethod: 'csv-import',
          }),
        });

        if (res.ok) {
          imported++;
        } else {
          errors++;
          const errData = await res.json().catch(() => null);
          const msg = (errData as Record<string, unknown>)?.error || `Errore HTTP ${res.status}`;
          details.push(`Riga ${i + 2}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
        }
      } catch {
        errors++;
        details.push(`Riga ${i + 2}: errore di rete`);
      }

      setProgress(Math.round(((i + 1) / csvRows.length) * 100));
    }

    setImportResult({ imported, errors, details });
    setIsImporting(false);
    if (imported > 0) {
      toast.success(`${imported} clienti importati con successo`);
    }
    if (errors > 0) {
      toast.error(`${errors} righe con errori`);
    }
  }, [csvRows, columnMapping]);

  return (
    <div>
      <header>
        <div className='px-4 sm:px-8 py-5'>
          <Breadcrumb
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Clienti', href: '/dashboard/customers' },
              { label: 'Importa CSV' },
            ]}
          />
          <div className='flex items-center justify-between mt-2'>
            <div>
              <h1 className='text-headline text-apple-dark dark:text-[var(--text-primary)]'>Importa Clienti</h1>
              <p className='text-apple-gray dark:text-[var(--text-secondary)] text-body mt-1'>
                Carica un file CSV per importare clienti in blocco
              </p>
            </div>
            <Link href='/dashboard/customers'>
              <AppleButton variant='secondary' icon={<ArrowLeft className='h-4 w-4' />}>
                Indietro
              </AppleButton>
            </Link>
          </div>
        </div>
      </header>

      <div className='p-4 sm:p-8 space-y-6 max-w-4xl mx-auto'>
        {/* Step 1: Upload */}
        {!file && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AppleCard>
              <AppleCardContent>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
                    dragOver
                      ? 'border-apple-blue bg-blue-50 dark:bg-blue-900/20'
                      : 'border-apple-border dark:border-[var(--border-default)] hover:border-apple-blue hover:bg-apple-light-gray/30 dark:hover:bg-[var(--surface-hover)]'
                  }`}
                  role='button'
                  tabIndex={0}
                  aria-label='Carica file CSV'
                >
                  <Upload className='h-12 w-12 mx-auto mb-4 text-apple-gray dark:text-[var(--text-secondary)]' />
                  <h3 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)] mb-2'>
                    Trascina il file CSV qui
                  </h3>
                  <p className='text-body text-apple-gray dark:text-[var(--text-secondary)] mb-4'>
                    oppure clicca per selezionare un file
                  </p>
                  <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                    Formato supportato: .csv (separatore: virgola, punto e virgola o tabulazione)
                  </p>
                  <input
                    ref={fileInputRef}
                    type='file'
                    accept='.csv,text/csv,text/plain'
                    className='hidden'
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                </div>
              </AppleCardContent>
            </AppleCard>
          </motion.div>
        )}

        {/* Step 2: Preview + Mapping */}
        {file && !importResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='space-y-6'
          >
            {/* File info */}
            <AppleCard>
              <AppleCardContent className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <FileSpreadsheet className='h-8 w-8 text-apple-green' />
                  <div>
                    <p className='text-body font-medium text-apple-dark dark:text-[var(--text-primary)]'>{file.name}</p>
                    <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                      {csvRows.length} righe trovate - {csvHeaders.length} colonne
                    </p>
                  </div>
                </div>
                <AppleButton
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    setFile(null);
                    setCsvHeaders([]);
                    setCsvRows([]);
                    setColumnMapping({});
                  }}
                >
                  Cambia file
                </AppleButton>
              </AppleCardContent>
            </AppleCard>

            {/* Column Mapping */}
            <AppleCard>
              <AppleCardContent>
                <h3 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] mb-4'>
                  Mappatura Colonne
                </h3>
                <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)] mb-4'>
                  Associa ogni colonna del CSV al campo corrispondente del cliente
                </p>
                <div className='space-y-3'>
                  {csvHeaders.map((header) => (
                    <div key={header} className='flex items-center gap-4'>
                      <span className='text-footnote font-medium text-apple-dark dark:text-[var(--text-primary)] w-40 truncate'>
                        {header}
                      </span>
                      <span className='text-apple-gray dark:text-[var(--text-secondary)]'>&rarr;</span>
                      <select
                        value={columnMapping[header] || '_skip'}
                        onChange={(e) =>
                          setColumnMapping((prev) => ({ ...prev, [header]: e.target.value }))
                        }
                        className='flex-1 h-10 px-3 rounded-lg border border-apple-border/50 dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-hover)] text-body text-apple-dark dark:text-[var(--text-primary)]'
                      >
                        {CUSTOMER_FIELDS.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </AppleCardContent>
            </AppleCard>

            {/* Preview */}
            <AppleCard>
              <AppleCardContent>
                <h3 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] mb-4'>
                  Anteprima (prime 5 righe)
                </h3>
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead>
                      <tr className='border-b border-apple-border/20 dark:border-[var(--border-default)]'>
                        {csvHeaders.map((h) => (
                          <th
                            key={h}
                            className='px-3 py-2 text-left text-xs font-medium text-apple-dark dark:text-[var(--text-primary)]'
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.slice(0, 5).map((row, i) => (
                        <tr
                          key={i}
                          className='border-b border-apple-border/10 dark:border-[var(--border-default)] last:border-0'
                        >
                          {csvHeaders.map((h) => (
                            <td
                              key={h}
                              className='px-3 py-2 text-apple-dark dark:text-[var(--text-primary)] truncate max-w-[200px]'
                            >
                              {row[h] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AppleCardContent>
            </AppleCard>

            {/* Import Button */}
            <div className='flex justify-end gap-3'>
              <AppleButton
                variant='secondary'
                onClick={() => {
                  setFile(null);
                  setCsvHeaders([]);
                  setCsvRows([]);
                }}
              >
                Annulla
              </AppleButton>
              <AppleButton
                onClick={handleImport}
                disabled={isImporting || csvRows.length === 0}
                icon={isImporting ? <Loader2 className='h-4 w-4 animate-spin' /> : <Upload className='h-4 w-4' />}
              >
                {isImporting ? `Importazione... ${progress}%` : `Importa ${csvRows.length} clienti`}
              </AppleButton>
            </div>

            {/* Progress Bar */}
            {isImporting && (
              <div className='w-full bg-apple-light-gray dark:bg-[var(--surface-active)] rounded-full h-3'>
                <div
                  className='bg-apple-blue h-3 rounded-full transition-all duration-300'
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </motion.div>
        )}

        {/* Step 3: Results */}
        {importResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className='space-y-6'
          >
            <AppleCard>
              <AppleCardContent className='text-center py-8'>
                {importResult.errors === 0 ? (
                  <CheckCircle className='h-16 w-16 text-apple-green mx-auto mb-4' />
                ) : importResult.imported === 0 ? (
                  <XCircle className='h-16 w-16 text-apple-red mx-auto mb-4' />
                ) : (
                  <AlertCircle className='h-16 w-16 text-apple-orange mx-auto mb-4' />
                )}
                <h2 className='text-title-2 font-semibold text-apple-dark dark:text-[var(--text-primary)] mb-2'>
                  Importazione Completata
                </h2>
                <div className='flex items-center justify-center gap-8 mt-4'>
                  <div>
                    <p className='text-title-1 font-bold text-apple-green' style={{ fontVariantNumeric: 'tabular-nums' }}>{importResult.imported}</p>
                    <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>Importati</p>
                  </div>
                  <div>
                    <p className='text-title-1 font-bold text-apple-red' style={{ fontVariantNumeric: 'tabular-nums' }}>{importResult.errors}</p>
                    <p className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>Errori</p>
                  </div>
                </div>
              </AppleCardContent>
            </AppleCard>

            {importResult.details.length > 0 && (
              <AppleCard>
                <AppleCardContent>
                  <h3 className='text-title-3 font-semibold text-apple-dark dark:text-[var(--text-primary)] mb-3'>
                    Dettaglio Errori
                  </h3>
                  <div className='max-h-60 overflow-y-auto space-y-1'>
                    {importResult.details.map((detail, i) => (
                      <p key={i} className='text-footnote text-apple-gray dark:text-[var(--text-secondary)]'>
                        {detail}
                      </p>
                    ))}
                  </div>
                </AppleCardContent>
              </AppleCard>
            )}

            <div className='flex justify-center gap-3'>
              <AppleButton
                variant='secondary'
                onClick={() => {
                  setFile(null);
                  setCsvHeaders([]);
                  setCsvRows([]);
                  setColumnMapping({});
                  setImportResult(null);
                }}
              >
                Importa altro file
              </AppleButton>
              <AppleButton onClick={() => router.push('/dashboard/customers')}>
                Vai ai Clienti
              </AppleButton>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
