'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Loader2, 
  Check,
  X,
  Navigation,
  Building,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  autocompleteAddress,
  getAddressDetails,
  validatePostalCode,
  AddressPrediction,
  AddressDetails,
} from '@/lib/validation';

export interface AddressAutocompleteFieldProps {
  value: string;
  onChange: (value: string, details: Partial<AddressDetails> | null) => void;
  onBlur?: () => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showMapLink?: boolean;
  debounceMs?: number;
  size?: 'sm' | 'md' | 'lg';
  country?: string;
}

const sizeClasses = {
  sm: 'h-9 text-sm',
  md: 'h-11 text-base',
  lg: 'h-14 text-lg',
};

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export function AddressAutocompleteField({
  value,
  onChange,
  onBlur,
  label = 'Indirizzo',
  placeholder = 'Cerca un indirizzo...',
  required = false,
  disabled = false,
  className,
  showMapLink = true,
  debounceMs = 300,
  size = 'md',
  country = 'it',
}: AddressAutocompleteFieldProps) {
  const [predictions, setPredictions] = useState<AddressPrediction[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<AddressDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced autocomplete
  const debouncedSearch = useCallback((input: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!input || input.length < 3) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    debounceTimer.current = setTimeout(async () => {
      try {
        const results = await autocompleteAddress(input, { country });
        setPredictions(results);
        setIsOpen(results.length > 0);
        setHighlightedIndex(-1);
      } catch {
        setPredictions([]);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);
  }, [debounceMs, country]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue, null);
    setSelectedDetails(null);
    debouncedSearch(newValue);
    setError(null);
  };

  const handleSelect = useCallback(async (prediction: AddressPrediction) => {
    setIsOpen(false);
    setIsLoading(true);
    
    try {
      const details = await getAddressDetails(prediction.placeId);
      if (details) {
        setSelectedDetails(details);
        onChange(details.formattedAddress, details);
        
        // Cross-validazione CAP-Città se disponibile
        if (details.postalCode && details.city) {
          const postalValidation = await validatePostalCode(details.postalCode);
          if (postalValidation.valid && postalValidation.city) {
            if (postalValidation.city.toLowerCase() !== details.city.toLowerCase()) {
              setError(`Attenzione: il CAP ${details.postalCode} corrisponde a ${postalValidation.city}, non a ${details.city}`);
            }
          }
        }
      }
    } catch {
      onChange(prediction.description, null);
    } finally {
      setIsLoading(false);
      inputRef.current?.blur();
    }
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < predictions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : predictions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleSelect(predictions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleBlur = () => {
    setTouched(true);
    setTimeout(() => {
      if (!isOpen) {
        onBlur?.();
      }
    }, 200);
  };

  const clearField = () => {
    onChange('', null);
    setSelectedDetails(null);
    setPredictions([]);
    setIsOpen(false);
    setError(null);
    inputRef.current?.focus();
  };

  // Map link
  const mapLink = useMemo(() => {
    if (!selectedDetails) return null;
    const query = encodeURIComponent(selectedDetails.formattedAddress);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }, [selectedDetails]);

  const hasValue = value.length > 0;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-1.5">
          {label}
          {required && <span className="text-[var(--status-error)] ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Icona sinistra */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
          <MapPin className={iconSizes[size]} />
        </div>

        {/* Input */}
        <motion.input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            'w-full rounded-lg border bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)]',
            'pl-10 pr-10',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            sizeClasses[size],
            error
              ? 'border-[var(--status-error)]/30 focus:border-[var(--status-error)] focus:ring-[var(--status-error)]/20'
              : selectedDetails
                ? 'border-[var(--status-success)]/30 focus:border-[var(--status-success)] focus:ring-[var(--status-success)]/20'
                : 'border-[var(--border-default)] dark:border-[var(--border-default)] focus:border-[var(--status-info)] focus:ring-[var(--status-info)]/20'
          )}
          whileFocus={{ scale: 1.005 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        />

        {/* Right side indicators */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {/* Clear button */}
          {hasValue && !disabled && (
            <motion.button
              type="button"
              onClick={clearField}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <X className={cn('text-[var(--text-tertiary)]', iconSizes[size === 'lg' ? 'md' : 'sm'])} />
            </motion.button>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <Loader2 className={cn('animate-spin text-[var(--status-info)]', iconSizes[size])} />
          )}

          {/* Success indicator */}
          {selectedDetails && !isLoading && (
            <Check className={cn('text-[var(--status-success)]', iconSizes[size])} />
          )}
        </div>
      </div>

      {/* Autocomplete dropdown */}
      <AnimatePresence>
        {isOpen && predictions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-default)] shadow-lg max-h-72 overflow-auto"
          >
            {predictions.map((prediction, index) => (
              <button
                key={prediction.placeId}
                type="button"
                onClick={() => handleSelect(prediction)}
                className={cn(
                  'w-full px-4 py-3 text-left transition-colors flex items-start gap-3',
                  index === highlightedIndex
                    ? 'bg-[var(--status-info-subtle)] dark:bg-[var(--status-info-subtle)]'
                    : 'hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)]'
                )}
              >
                <MapPin className="w-5 h-5 text-[var(--text-tertiary)] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] truncate">
                    {prediction.mainText}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] truncate">
                    {prediction.secondaryText}
                  </p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <AnimatePresence>
        {/* Error message */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 text-sm text-[var(--status-error)] flex items-center gap-1.5"
          >
            <Navigation className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.p>
        )}

        {/* Address details card */}
        {selectedDetails && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-3 p-4 bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)]/50 rounded-lg border border-[var(--border-default)] dark:border-[var(--border-default)]"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[var(--status-info-subtle)] dark:bg-[var(--status-info)]/40/30 rounded-lg">
                <Building className="w-5 h-5 text-[var(--status-info)] dark:text-[var(--status-info)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                  {selectedDetails.street} {selectedDetails.number}
                </p>
                <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-primary)]">
                  {selectedDetails.postalCode} {selectedDetails.city}
                </p>
                <p className="text-sm text-[var(--text-tertiary)]">
                  {selectedDetails.province && `${selectedDetails.province} - `}
                  {selectedDetails.country}
                </p>
                
                {/* Map link */}
                {showMapLink && mapLink && (
                  <a
                    href={mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-sm text-[var(--status-info)] hover:text-[var(--status-info)]"
                  >
                    <Navigation className="w-4 h-4" />
                    Visualizza su Google Maps
                  </a>
                )}

                {/* Coordinates */}
                {(selectedDetails.latitude !== 0 || selectedDetails.longitude !== 0) && (
                  <p className="mt-2 text-xs text-[var(--text-tertiary)] font-mono">
                    {selectedDetails.latitude.toFixed(6)}, {selectedDetails.longitude.toFixed(6)}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden inputs per form */}
      {selectedDetails && (
        <>
          <input type="hidden" name="address_street" value={selectedDetails.street} />
          <input type="hidden" name="address_number" value={selectedDetails.number} />
          <input type="hidden" name="address_city" value={selectedDetails.city} />
          <input type="hidden" name="address_postal_code" value={selectedDetails.postalCode} />
          <input type="hidden" name="address_province" value={selectedDetails.province} />
          <input type="hidden" name="address_country" value={selectedDetails.country} />
          <input type="hidden" name="address_lat" value={selectedDetails.latitude} />
          <input type="hidden" name="address_lng" value={selectedDetails.longitude} />
        </>
      )}
    </div>
  );
}

export default AddressAutocompleteField;
