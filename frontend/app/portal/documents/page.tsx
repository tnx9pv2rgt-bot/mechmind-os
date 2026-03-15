'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PortalPageWrapper } from '@/components/portal';
import { DocumentList } from '@/components/portal';
import { Document, Customer } from '@/lib/types/portal';

// ============================================
// MAIN COMPONENT
// ============================================

export default function PortalDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'invoices' | 'maintenance' | 'inspections'>(
    'all'
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/portal/documents');

        if (!response.ok) {
          throw new Error(`Failed to load documents (${response.status})`);
        }

        const result = await response.json();
        const data = (result.data || []) as Document[];
        setDocuments(data);
        setFilteredDocuments(data);
      } catch (err) {
        console.error('Documents load error:', err);
        setError(err instanceof Error ? err.message : 'Errore nel caricamento dei documenti');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    let filtered = documents;

    // Filter by tab
    if (activeTab !== 'all') {
      const typeMap = {
        invoices: ['invoice', 'receipt'],
        maintenance: ['maintenance_record'],
        inspections: ['inspection_report', 'warranty_claim'],
      };
      filtered = filtered.filter(d => typeMap[activeTab].includes(d.type));
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        d => d.title.toLowerCase().includes(query) || d.documentNumber.toLowerCase().includes(query)
      );
    }

    setFilteredDocuments(filtered);
  }, [activeTab, searchQuery, documents]);

  const handleDownload = (id: string) => {
    window.open(`/api/portal/documents/${id}/download`, '_blank');
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
            onClick={() => window.location.reload()}
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
            onChange={e => setSearchQuery(e.target.value)}
            className='pl-12 h-12 rounded-xl bg-white dark:bg-[#2f2f2f]'
          />
        </div>
      </div>

      {/* Tabs */}
      <div className='flex flex-wrap items-center gap-2 mb-6'>
        {[
          { key: 'all', label: 'Tutti' },
          { key: 'invoices', label: 'Fatture' },
          { key: 'maintenance', label: 'Manutenzione' },
          { key: 'inspections', label: 'Ispezioni' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
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
      <DocumentList documents={filteredDocuments} onDownload={handleDownload} onView={handleView} />
    </PortalPageWrapper>
  );
}
