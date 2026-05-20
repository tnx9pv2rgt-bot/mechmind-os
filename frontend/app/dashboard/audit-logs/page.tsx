'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { AppleCard, AppleCardContent, AppleCardHeader } from '@/components/ui/apple-card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Shield, Search, Clock, User, Database } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  tableName: string;
  recordId?: string;
  userId?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface AuditLogsResponse {
  success: boolean;
  data: AuditLog[];
  total: number;
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [tableName, setTableName] = useState('');

  const params = new URLSearchParams({ page: String(page), limit: '50' });
  if (action) params.set('action', action);
  if (tableName) params.set('tableName', tableName);

  const { data, isLoading } = useSWR<AuditLogsResponse>(
    `/api/dashboard/settings/audit?${params}`,
    fetcher,
  );

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / 50);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-blue-500" />
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <span className="text-sm text-muted-foreground ml-auto">{total} record totali</span>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Filtra per azione..."
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
          />
        </div>
        <div className="relative flex-1">
          <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Filtra per tabella..."
            value={tableName}
            onChange={(e) => { setTableName(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <AppleCard>
        <AppleCardHeader title="Attività recenti" />
        <AppleCardContent>
          {isLoading ? (
            <div className="flex justify-center py-12 text-muted-foreground">Caricamento...</div>
          ) : logs.length === 0 ? (
            <div className="flex justify-center py-12 text-muted-foreground">Nessun log trovato</div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log) => (
                <div key={log.id} className="py-3 flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-md bg-muted">
                    <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{log.action}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {log.tableName}
                      </span>
                    </div>
                    {log.recordId && (
                      <p className="text-xs text-muted-foreground mt-0.5">ID: {log.recordId}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    {log.userId && <><User className="w-3 h-3" /><span>{log.userId.slice(0, 8)}</span></>}
                    <Clock className="w-3 h-3 ml-1" />
                    <span>{new Date(log.createdAt).toLocaleString('it-IT')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AppleCardContent>
      </AppleCard>

      {pages > 1 && (
        <Pagination page={page} totalPages={pages} onPageChange={setPage} />
      )}
    </div>
  );
}
