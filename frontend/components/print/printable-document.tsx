'use client';

import React from 'react';

export interface TenantPrintInfo {
  ragioneSociale: string;
  partitaIva?: string;
  codiceFiscale?: string;
  sdiCode?: string;
  pecEmail?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
}

interface PrintableDocumentProps {
  title: string;
  documentNumber?: string;
  date?: string;
  tenant: TenantPrintInfo;
  children: React.ReactNode;
}

export function PrintableDocument({
  title,
  documentNumber,
  date,
  tenant,
  children,
}: PrintableDocumentProps) {
  return (
    <>
      <div className='no-print mb-4 flex gap-2'>
        <button
          onClick={() => window.print()}
          className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium'
        >
          Stampa
        </button>
      </div>

      <div className='print-page'>
        {/* Header */}
        <div className='print-header'>
          <div>
            {tenant.logoUrl && (
              <img src={tenant.logoUrl} alt='Logo' className='mb-2' style={{ maxHeight: '60px' }} />
            )}
            <h2 className='text-lg font-bold'>{tenant.ragioneSociale}</h2>
            {tenant.address && (
              <p className='text-sm text-gray-600'>
                {tenant.address}
                {tenant.postalCode && `, ${tenant.postalCode}`}
                {tenant.city && ` ${tenant.city}`}
                {tenant.province && ` (${tenant.province})`}
              </p>
            )}
            {tenant.partitaIva && (
              <p className='text-sm text-gray-600'>P.IVA: {tenant.partitaIva}</p>
            )}
            {tenant.phone && <p className='text-sm text-gray-600'>Tel: {tenant.phone}</p>}
          </div>
          <div className='text-right'>
            <h1 className='text-2xl font-bold'>{title}</h1>
            {documentNumber && <p className='text-sm text-gray-600'>N. {documentNumber}</p>}
            {date && <p className='text-sm text-gray-600'>Data: {date}</p>}
          </div>
        </div>

        {/* Content */}
        <div className='mt-4'>{children}</div>

        {/* Footer */}
        <div className='print-footer'>
          <p>
            {tenant.ragioneSociale}
            {tenant.partitaIva && ` — P.IVA ${tenant.partitaIva}`}
            {tenant.codiceFiscale && ` — C.F. ${tenant.codiceFiscale}`}
            {tenant.address && ` — ${tenant.address}, ${tenant.city}`}
            {tenant.sdiCode && ` — SDI: ${tenant.sdiCode}`}
            {tenant.pecEmail && ` — PEC: ${tenant.pecEmail}`}
          </p>
        </div>
      </div>
    </>
  );
}
