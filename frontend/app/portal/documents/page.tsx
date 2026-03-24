'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr-fetcher';
import { toast } from 'sonner';
import { FileText, Search, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PortalPageWrapper } from '@/components/portal';
import { DocumentList } from '@/components/portal';
import { Pagination } from '@/components/ui/pagination';
import { Document, Customer } from '@/lib/types/portal';

// ============================================
// MAIN COMPONENT
// ============================================

export default function PortalDocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'invoices' | 'estimates' | 'inspections' | 'warranties' | 'other'>(
    'all'
  );
  const [customer] = useState<Customer | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const {
    data: rawData,
    error: swrError,
    isLoading,
    mutate,
  } = useSWR<{ data: Document[] }>('/api/portal/documents', fetcher);

  const documents = rawData?.data || [];
  const error = swrError
    ? swrError instanceof Error
      ? swrError.message
      : 'Errore nel caricamento dei documenti'
    : null;

  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    // Filter by tab
    if (activeTab !== 'all') {
      const typeMap: Record<string, string[]> = {
        invoices: ['invoice', 'receipt'],
        estimates: ['estimate'],
        inspections: ['inspection_report'],
        warranties: ['warranty_claim'],
        other: ['maintenance_record'],
      };
      const types = typeMap[activeTab] || [];
      filtered = filtered.filter(d => types.includes(d.type));
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        d => d.title.toLowerCase().includes(query) || d.documentNumber.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [activeTab, searchQuery, documents]);

  const handleDownload = (id: string) => {
    window.open(`/api/portal/documents/${id}/download`, '_blank');
    toast.success('Download avviato');
  };

  const handleView = (id: string) => {
    window.open(`/api/portal/documents/${id}`, '_blank');
  };

  if (isLoading) {
    return (
      <PortalPageWrapper title='Documenti' customer={customer || undefined}>
        <div className='flex items-center justify-center h-64'>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className='w-8 h-8 border-2 border-apple-blue border-t-transparent rounded-full'
          />
        </div>
      </PortalPageWrapper>
    );
  }

  if (error) {
    return (
      <PortalPageWrapper title='Documenti' customer={customer || undefined}>
        <div className='text-center py-16'>
          <p className='text-apple-red mb-4'>{error}</p>
          <button
            onClick={() => mutate()}
            className='text-apple-blue hover:underline'
          >
            Riprova
          </button>
        </div>
      </PortalPageWrapper>
    );
  }

  return (
    <PortalPageWrapper
      title='Documenti'
      subtitle='Fatture, ricevute e report di ispezione'
      customer={customer || undefined}
    >
      {/* Search */}
      <div className='mb-6'>
        <div className='relative'>
          <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-apple-gray' />
          <Input
            placeholder='Cerca per numero documento o titolo...'
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
            className='pl-12 h-12 rounded-xl bg-white dark:bg-[#2f2f2f]'
            aria-label='Cerca documenti'
          />
        </div>
      </div>

      {/* Tabs */}
      <div className='flex flex-wrap items-center gap-2 mb-6'>
        {[
          { key: 'all', label: 'Tutti' },
          { key: 'invoices', label: 'Fatture' },
          { key: 'estimates', label: 'Preventivi' },
          { key: 'inspections', label: 'Ispezioni' },
          { key: 'warranties', label: 'Garanzie' },
          { key: 'other', label: 'Altro' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key as typeof activeTab); setPage(1); }}
            className={`
              px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${
                activeTab === tab.key
                  ? 'bg-apple-blue text-white shadow-apple'
                  : 'bg-white dark:bg-[#2f2f2f] text-apple-gray dark:text-[#636366] hover:text-apple-dark dark:hover:text-[#ececec] shadow-apple'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Documents List */}
      <DocumentList documents={filteredDocuments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)} onDownload={handleDownload} onView={handleView} />
      <Pagination
        page={page}
        totalPages={Math.ceil(filteredDocuments.length / PAGE_SIZE)}
        onPageChange={setPage}
      />
    </PortalPageWrapper>
  );
}
