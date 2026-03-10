'use client';

import React from 'react';

interface InvoiceFormProps {
  onSubmit?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
  initialData?: Record<string, unknown>;
}

export function InvoiceForm({ onSubmit, onCancel }: InvoiceFormProps): React.ReactElement {
  return (
    <div>
      <p>Invoice Form - Coming Soon</p>
    </div>
  );
}
