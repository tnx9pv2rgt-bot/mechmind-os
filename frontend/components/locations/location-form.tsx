'use client';

import React from 'react';

interface LocationFormProps {
  onSubmit?: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
  initialData?: Record<string, unknown>;
}

export function LocationForm({ onSubmit, onCancel }: LocationFormProps): React.ReactElement {
  return (
    <div>
      <p>Location Form - Coming Soon</p>
    </div>
  );
}
