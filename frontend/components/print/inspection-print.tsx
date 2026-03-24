'use client';

import React from 'react';
import { TenantPrintInfo } from './printable-document';

interface InspectionItem {
  id: string;
  name: string;
  category: string;
  severity: 'OK' | 'WARNING' | 'CRITICAL';
  notes?: string;
}

interface InspectionPhoto {
  id: string;
  url: string;
  caption?: string;
}

interface InspectionPrintData {
  id: string;
  number?: string;
  date: string;
  technicianName?: string;
  vehiclePlate: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleVin?: string;
  customerName: string;
  mileage?: number;
  items: InspectionItem[];
  photos?: InspectionPhoto[];
  overallNotes?: string;
}

interface InspectionPrintProps {
  inspection: InspectionPrintData;
  tenant: TenantPrintInfo;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const severityConfig: Record<string, { label: string; color: string; bg: string }> = {
  OK: { label: 'OK', color: '#16a34a', bg: '#f0fdf4' },
  WARNING: { label: 'Attenzione', color: '#d97706', bg: '#fffbeb' },
  CRITICAL: { label: 'Critico', color: '#dc2626', bg: '#fef2f2' },
};

export function InspectionPrint({ inspection, tenant }: InspectionPrintProps) {
  // Group items by category
  const grouped: Record<string, InspectionItem[]> = {};
  for (const item of inspection.items) {
    const cat = item.category || 'Altro';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  // Severity counts
  const counts = { OK: 0, WARNING: 0, CRITICAL: 0 };
  for (const item of inspection.items) {
    counts[item.severity] = (counts[item.severity] || 0) + 1;
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .inspection-print-container,
          .inspection-print-container * {
            visibility: visible;
          }
          .inspection-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            min-height: 297mm;
            padding: 12mm 18mm;
            font-size: 9pt;
            line-height: 1.3;
            color: #000;
            background: #fff;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>

      <div className="inspection-print-container bg-white text-black print:block hidden">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-3 mb-4">
          <div>
            {tenant.logoUrl && (
              <img src={tenant.logoUrl} alt="Logo" className="mb-2" style={{ maxHeight: '40px' }} />
            )}
            <h2 className="text-base font-bold">{tenant.ragioneSociale}</h2>
            {tenant.address && (
              <p className="text-[8pt] text-gray-600">
                {tenant.address}
                {tenant.city && `, ${tenant.city}`}
              </p>
            )}
            {tenant.phone && (
              <p className="text-[8pt] text-gray-600">Tel: {tenant.phone}</p>
            )}
          </div>
          <div className="text-right">
            <h1 className="text-xl font-bold">ISPEZIONE VEICOLO</h1>
            {inspection.number && <p className="text-sm">N. {inspection.number}</p>}
            <p className="text-sm">Data: {formatDate(inspection.date)}</p>
          </div>
        </div>

        {/* Vehicle + Customer Info */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-2 border border-gray-300 rounded">
            <p className="text-[8pt] font-semibold text-gray-500 uppercase mb-1">Veicolo</p>
            <p className="font-bold text-sm">{inspection.vehiclePlate}</p>
            {(inspection.vehicleMake || inspection.vehicleModel) && (
              <p className="text-sm">
                {inspection.vehicleMake} {inspection.vehicleModel}
                {inspection.vehicleYear && ` (${inspection.vehicleYear})`}
              </p>
            )}
            {inspection.vehicleVin && (
              <p className="text-[8pt] text-gray-600">VIN: {inspection.vehicleVin}</p>
            )}
            {inspection.mileage && (
              <p className="text-sm">Km: {inspection.mileage.toLocaleString('it-IT')}</p>
            )}
          </div>
          <div className="p-2 border border-gray-300 rounded">
            <p className="text-[8pt] font-semibold text-gray-500 uppercase mb-1">Cliente</p>
            <p className="font-bold text-sm">{inspection.customerName}</p>
            {inspection.technicianName && (
              <p className="text-sm mt-2">
                <span className="text-[8pt] text-gray-500 uppercase">Tecnico: </span>
                {inspection.technicianName}
              </p>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="flex gap-4 mb-4 p-2 bg-gray-50 rounded border border-gray-200">
          <div className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: '#16a34a' }}
            />
            <span className="text-sm font-medium">{counts.OK} OK</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: '#d97706' }}
            />
            <span className="text-sm font-medium">{counts.WARNING} Attenzione</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: '#dc2626' }}
            />
            <span className="text-sm font-medium">{counts.CRITICAL} Critici</span>
          </div>
        </div>

        {/* Checklist by Category */}
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mb-4 break-inside-avoid">
            <h3 className="text-sm font-bold bg-gray-100 px-2 py-1 border border-gray-300 rounded-t">
              {category}
            </h3>
            <table className="w-full border-collapse">
              <tbody>
                {items.map(item => {
                  const sev = severityConfig[item.severity] || severityConfig.OK;
                  return (
                    <tr key={item.id} className="break-inside-avoid">
                      <td className="border border-gray-300 px-2 py-1.5 text-sm w-2/5">
                        {item.name}
                      </td>
                      <td
                        className="border border-gray-300 px-2 py-1.5 text-sm text-center w-24 font-semibold"
                        style={{ color: sev.color, backgroundColor: sev.bg }}
                      >
                        {sev.label}
                      </td>
                      <td className="border border-gray-300 px-2 py-1.5 text-[8pt] text-gray-600">
                        {item.notes || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

        {/* Photos */}
        {inspection.photos && inspection.photos.length > 0 && (
          <div className="page-break mb-4">
            <h3 className="text-sm font-bold mb-2">Documentazione Fotografica</h3>
            <div className="grid grid-cols-3 gap-2">
              {inspection.photos.map(photo => (
                <div key={photo.id} className="break-inside-avoid">
                  <img
                    src={photo.url}
                    alt={photo.caption || 'Foto ispezione'}
                    className="w-full h-32 object-cover rounded border border-gray-300"
                  />
                  {photo.caption && (
                    <p className="text-[7pt] text-gray-600 mt-0.5 text-center">{photo.caption}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {inspection.overallNotes && (
          <div className="mb-6">
            <p className="text-[8pt] font-semibold text-gray-500 uppercase mb-1">Note Generali</p>
            <p className="text-sm whitespace-pre-wrap">{inspection.overallNotes}</p>
          </div>
        )}

        {/* Signature */}
        <div className="mt-8 grid grid-cols-2 gap-8">
          <div>
            <p className="text-[8pt] text-gray-500 uppercase mb-8">Firma Tecnico</p>
            <div className="border-b border-gray-400 w-48" />
            <p className="text-sm mt-1">{inspection.technicianName || ''}</p>
          </div>
          <div>
            <p className="text-[8pt] text-gray-500 uppercase mb-8">Firma Cliente</p>
            <div className="border-b border-gray-400 w-48" />
            <p className="text-sm mt-1">{inspection.customerName}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 px-[18mm] pb-[8mm]">
          <div className="border-t border-gray-300 pt-2 text-center">
            <p className="text-[7pt] text-gray-500">
              {tenant.ragioneSociale}
              {tenant.partitaIva && ` - P.IVA ${tenant.partitaIva}`}
              {tenant.address && ` - ${tenant.address}, ${tenant.city}`}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
