'use client';

/**
 * PersonalDataStep Component
 * 
 * Step per l'inserimento dei dati personali (per utenti privati).
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Calendar, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PersonalDataStepProps {
  stepId: string;
  answers: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    birthDate?: string;
  };
  onAnswersChange: (answers: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    birthDate?: string;
  }) => void;
  onNext: () => void;
  className?: string;
}

interface FormField {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  icon: React.ElementType;
  required: boolean;
  validation?: (value: string) => boolean;
}

const fields: FormField[] = [
  {
    id: 'firstName',
    label: 'Nome',
    type: 'text',
    placeholder: 'Mario',
    icon: User,
    required: true,
    validation: (v) => v.length >= 2,
  },
  {
    id: 'lastName',
    label: 'Cognome',
    type: 'text',
    placeholder: 'Rossi',
    icon: User,
    required: true,
    validation: (v) => v.length >= 2,
  },
  {
    id: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'mario.rossi@example.com',
    icon: Mail,
    required: true,
    validation: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  },
  {
    id: 'phone',
    label: 'Telefono',
    type: 'tel',
    placeholder: '+39 123 456 7890',
    icon: Phone,
    required: false,
    validation: (v) => v.length >= 8 || v === '',
  },
  {
    id: 'birthDate',
    label: 'Data di nascita',
    type: 'date',
    placeholder: '',
    icon: Calendar,
    required: false,
  },
];

export const PersonalDataStep: React.FC<PersonalDataStepProps> = ({
  stepId,
  answers,
  onAnswersChange,
  onNext,
  className,
}) => {
  const [localAnswers, setLocalAnswers] = useState(answers);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Sync with parent
  useEffect(() => {
    const timeout = setTimeout(() => {
      onAnswersChange(localAnswers);
    }, 300);
    return () => clearTimeout(timeout);
  }, [localAnswers, onAnswersChange]);

  const handleChange = (fieldId: string, value: string) => {
    setLocalAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleBlur = (fieldId: string) => {
    setTouched((prev) => ({ ...prev, [fieldId]: true }));
    setFocusedField(null);
  };

  const isFieldValid = (field: FormField): boolean => {
    const value = localAnswers[field.id as keyof typeof localAnswers] || '';
    if (!field.required && !value) return true;
    if (field.required && !value) return false;
    return field.validation ? field.validation(value) : true;
  };

  const allRequiredValid = fields
    .filter((f) => f.required)
    .every(isFieldValid);

  return (
    <motion.div
      className={cn('py-4', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          I tuoi dati personali
        </h2>
        <p className="text-gray-600">
          Inserisci le informazioni richieste per completare il tuo profilo
        </p>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        {fields.map((field, index) => {
          const Icon = field.icon;
          const value = localAnswers[field.id as keyof typeof localAnswers] || '';
          const isValid = isFieldValid(field);
          const isTouched = touched[field.id];
          const isFocused = focusedField === field.id;
          const showError = isTouched && !isValid;
          const showSuccess = isTouched && isValid && value;

          return (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              
              <div className="relative">
                <div
                  className={cn(
                    'absolute left-3 top-1/2 -translate-y-1/2 transition-colors',
                    isFocused ? 'text-blue-500' : 'text-gray-400',
                    showError && 'text-red-400',
                    showSuccess && 'text-green-500'
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>

                <input
                  type={field.type}
                  value={value}
                  onChange={(e) => handleChange(field.id, e.target.value)}
                  onFocus={() => setFocusedField(field.id)}
                  onBlur={() => handleBlur(field.id)}
                  placeholder={field.placeholder}
                  className={cn(
                    'w-full pl-10 pr-4 py-3 rounded-xl border-2 transition-all duration-200',
                    'focus:outline-none',
                    isFocused && 'border-blue-500 ring-4 ring-blue-100',
                    showError && 'border-red-300 bg-red-50',
                    showSuccess && 'border-green-300 bg-green-50',
                    !isFocused && !showError && !showSuccess && 'border-gray-200 hover:border-gray-300'
                  )}
                />

                {/* Success indicator */}
                {showSuccess && (
                  <motion.div
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500 }}
                  >
                    <Check className="w-5 h-5 text-green-500" />
                  </motion.div>
                )}
              </div>

              {/* Error message */}
              {showError && (
                <motion.p
                  className="mt-1 text-sm text-red-600"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {field.required && !value
                    ? 'Campo obbligatorio'
                    : `Inserisci un ${field.label.toLowerCase()} valido`}
                </motion.p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Validation summary */}
      <motion.div
        className="mt-6 flex items-center justify-between"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="text-sm text-gray-500">
          <span className="font-medium">
            {fields.filter((f) => isFieldValid(f)).length}
          </span>
          {' / '}
          <span>{fields.length}</span> campi completati
        </div>

        {allRequiredValid && (
          <motion.div
            className="flex items-center gap-1 text-sm text-green-600 font-medium"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Check className="w-4 h-4" />
            Pronto per continuare
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default PersonalDataStep;
