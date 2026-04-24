'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

// ============================================================================
// WEB SPEECH API TYPES
// ============================================================================
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

// Icons
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  X,
  MessageSquare,
  Wand2,
  Building2,
  MapPin,
  Check,
  AlertCircle,
  Lightbulb,
  Bot,
  User,
  Loader2,
} from 'lucide-react';

// UI Components
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

// ============================================================================
// TYPES
// ============================================================================
type Step = 1 | 2 | 3 | 4;
type AIStatus = 'idle' | 'thinking' | 'success' | 'error';
type MessageRole = 'user' | 'assistant' | 'system';

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  suggestions?: string[];
  actions?: AIAction[];
}

interface AIAction {
  label: string;
  action: string;
  data?: Record<string, unknown>;
}

interface ParsedAddress {
  street: string;
  number: string;
  zip: string;
  city: string;
  province: string;
  country: string;
}

interface CompanyData {
  companyName?: string;
  industry?: string;
  vat?: string;
  address?: string;
  city?: string;
  province?: string;
  zip?: string;
}

interface AIFormAssistantProps {
  currentStep: Step;
  formData: Record<string, unknown>;
  onUpdateField: (field: string, value: unknown) => void;
  className?: string;
}

// ============================================================================
// CONTEXTUAL SUGGESTIONS PER STEP
// ============================================================================
const stepSuggestions: Record<Step, string[]> = {
  1: [
    'Usa email aziendale per sbloccare funzioni team',
    'La password deve contenere almeno 8 caratteri',
    'Aggiungi prefisso internazionale al telefono',
  ],
  2: [
    "L'indirizzo PEC è obbligatorio per fatturazione elettronica",
    'Il codice SDI serve per ricevere fatture elettroniche',
    "Puoi verificare la Partita IVA con l'Agenzia Entrate",
    "Scrivi l'indirizzo completo, l'AI lo parserà automaticamente",
  ],
  3: [
    'Puoi modificare i consensi in qualsiasi momento dal profilo',
    'I dati sono crittografati con standard bancari',
    'Il consenso marketing è facoltativo',
  ],
  4: [
    "Verifica che l'email sia corretta prima di confermare",
    "Controlla che l'indirizzo sia completo",
    'Puoi tornare indietro per modificare i dati',
  ],
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const generateId = () => Math.random().toString(36).substring(2, 9);

// ============================================================================
// VOICE INPUT COMPONENT
// ============================================================================
interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
}

const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({ onTranscript, className }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Check for Web Speech API support
    if (typeof window === 'undefined' || !('webkitSpeechRecognition' in window)) {
      setIsSupported(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'it-IT';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');

      if (event.results[0].isFinal) {
        onTranscript(transcript);
        setIsRecording(false);
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [onTranscript]);

  const toggleRecording = () => {
    if (!recognitionRef.current || !isSupported) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  if (!isSupported) return null;

  return (
    <motion.button
      type='button'
      onClick={toggleRecording}
      className={cn(
        'relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
        'bg-[var(--surface-secondary)] hover:bg-[var(--surface-secondary)] border border-[var(--border-default)] hover:border-[var(--brand)]',
        isRecording && 'border-[var(--status-error)] bg-[var(--status-error-subtle)]',
        className
      )}
      whileTap={{ scale: 0.95 }}
    >
      {isRecording ? (
        <>
          <MicOff className='w-4 h-4 text-[var(--status-error)]' />
          {/* Sound wave animation */}
          <span className='absolute inset-0 rounded-full bg-[var(--status-error-subtle)]0/20 animate-ping' />
          <motion.span
            className='absolute inset-[-4px] rounded-full border-2 border-[var(--status-error)]/40'
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        </>
      ) : (
        <Mic className='w-4 h-4 text-[var(--text-tertiary)]' />
      )}
    </motion.button>
  );
};

// ============================================================================
// SMART ADDRESS INPUT COMPONENT
// ============================================================================
interface SmartAddressInputProps {
  value: string;
  onChange: (address: string, parsed?: ParsedAddress) => void;
  onParse: (parsed: ParsedAddress) => void;
  className?: string;
}

const SmartAddressInput: React.FC<SmartAddressInputProps> = ({
  value,
  onChange,
  onParse,
  className,
}) => {
  const [status, setStatus] = useState<AIStatus>('idle');
  const [showParser, setShowParser] = useState(false);

  const parseAddress = async (rawAddress: string) => {
    if (rawAddress.length < 10) return;

    setStatus('thinking');

    // Simulate AI parsing with timeout
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simple regex-based parsing as fallback
    const parsed = parseAddressHeuristic(rawAddress);

    setStatus('success');
    onParse(parsed);

    setTimeout(() => setStatus('idle'), 2000);
  };

  const parseAddressHeuristic = (address: string): ParsedAddress => {
    // Italian address format: Via/Piazza [Name] [Number], [ZIP] [City] ([Province])
    const zipMatch = address.match(/\b(\d{5})\b/);
    const provinceMatch = address.match(/\(([A-Za-z]{2})\)/);
    const numberMatch = address.match(/\s+(\d+\/?[a-zA-Z]?)\s*[,-]/);

    const parts = address.split(',').map(p => p.trim());

    return {
      street: parts[0]?.replace(/\s+\d+[a-zA-Z]?\s*$/, '').trim() || '',
      number: numberMatch?.[1] || '',
      zip: zipMatch?.[1] || '',
      city: parts[1]?.replace(/^\d{5}\s*/, '').trim() || '',
      province: provinceMatch?.[1]?.toUpperCase() || '',
      country: 'IT',
    };
  };

  return (
    <div className={cn('relative', className)}>
      <div className='relative flex items-center gap-2'>
        <div className='relative flex-1'>
          <MapPin className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-tertiary)]' />
          <Input
            type='text'
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder='Via Roma 123, 20121 Milano (MI)'
            className={cn(
              'pl-12 pr-24 h-14 bg-[var(--surface-secondary)] border-[var(--border-default)] rounded-apple-lg',
              'focus:border-[var(--brand)] focus:ring-2 focus:ring-apple-blue/20',
              status === 'success' && 'border-[var(--status-success)] pr-28'
            )}
          />
          <div className='absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1'>
            {status === 'thinking' && (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                <Sparkles className='w-4 h-4 text-[var(--brand)]' />
              </motion.div>
            )}
            {status === 'success' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className='flex items-center gap-1 text-[var(--status-success)]'
              >
                <Check className='w-4 h-4' />
                <span className='text-xs'>OK</span>
              </motion.div>
            )}
            <VoiceInputButton
              onTranscript={text => {
                onChange(text);
                parseAddress(text);
              }}
            />
          </div>
        </div>
        <motion.button
          type='button'
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setShowParser(!showParser);
            if (!showParser && value) parseAddress(value);
          }}
          className={cn(
            'px-4 h-14 rounded-apple-lg border transition-all duration-300',
            'bg-[var(--surface-secondary)] border-[var(--border-default)] hover:border-[var(--brand)]',
            showParser && 'bg-[var(--brand)] text-[var(--text-on-brand)] border-[var(--brand)]'
          )}
        >
          <Wand2 className='w-5 h-5' />
        </motion.button>
      </div>

      {/* AI Parse Results */}
      <AnimatePresence>
        {showParser && status === 'success' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className='mt-3 p-4 bg-[var(--status-info-subtle)]/50 backdrop-blur rounded-apple-lg border border-[var(--status-info)]/10'
          >
            <div className='flex items-center gap-2 mb-2 text-sm text-[var(--brand)]'>
              <Sparkles className='w-4 h-4' />
              <span className='font-medium'>Indirizzo analizzato dall&apos;AI</span>
            </div>
            <div className='grid grid-cols-3 gap-2 text-sm'>
              <div className='bg-[var(--surface-secondary)]/70 p-2 rounded-lg'>
                <span className='text-[var(--text-tertiary)] text-xs'>Via</span>
                <p className='font-medium truncate'>{parseAddressHeuristic(value).street}</p>
              </div>
              <div className='bg-[var(--surface-secondary)]/70 p-2 rounded-lg'>
                <span className='text-[var(--text-tertiary)] text-xs'>Civico</span>
                <p className='font-medium'>{parseAddressHeuristic(value).number}</p>
              </div>
              <div className='bg-[var(--surface-secondary)]/70 p-2 rounded-lg'>
                <span className='text-[var(--text-tertiary)] text-xs'>CAP</span>
                <p className='font-medium'>{parseAddressHeuristic(value).zip}</p>
              </div>
              <div className='bg-[var(--surface-secondary)]/70 p-2 rounded-lg'>
                <span className='text-[var(--text-tertiary)] text-xs'>Città</span>
                <p className='font-medium'>{parseAddressHeuristic(value).city}</p>
              </div>
              <div className='bg-[var(--surface-secondary)]/70 p-2 rounded-lg'>
                <span className='text-[var(--text-tertiary)] text-xs'>Provincia</span>
                <p className='font-medium'>{parseAddressHeuristic(value).province}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// COMPANY INTELLIGENCE COMPONENT
// ============================================================================
interface CompanyIntelligenceProps {
  email: string;
  onEnrich: (data: CompanyData) => void;
  className?: string;
}

const CompanyIntelligence: React.FC<CompanyIntelligenceProps> = ({
  email,
  onEnrich,
  className,
}) => {
  const [status, setStatus] = useState<AIStatus>('idle');
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);

  const enrichCompanyData = async (domain: string) => {
    setStatus('thinking');

    try {
      const res = await fetch(`/api/customers/enrich?domain=${encodeURIComponent(domain)}`);
      if (res.ok) {
        const data: CompanyData = await res.json();
        setCompanyData(data);
        setStatus('success');
        return;
      }
    } catch {
      // API unavailable — fallback below
    }

    // Fallback: derive company name from domain
    const data: CompanyData = {
      companyName: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1),
      industry: 'Altro',
    };

    setCompanyData(data);
    setStatus('success');
  };

  const domain = email?.split('@')[1];
  const isBusinessEmail =
    domain &&
    !['gmail.com', 'yahoo.com', 'hotmail.com', 'libero.it', 'outlook.com'].includes(domain);

  if (!isBusinessEmail) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 rounded-apple-lg border bg-gradient-to-r from-[var(--status-info)]/5/50 to-[var(--brand)]/5/50 backdrop-blur',
        status === 'success' ? 'border-[var(--status-success-subtle)]' : 'border-[var(--status-info)]/10',
        className
      )}
    >
      <div className='flex items-start gap-3'>
        <div className='w-10 h-10 rounded-xl bg-[var(--surface-secondary)] flex items-center justify-center shrink-0'>
          <Building2 className='w-5 h-5 text-[var(--brand)]' />
        </div>
        <div className='flex-1 min-w-0'>
          <p className='text-sm font-medium text-[var(--text-primary)]'>Dominio aziendale rilevato</p>
          <p className='text-xs text-[var(--text-tertiary)] truncate'>@{domain}</p>

          {status === 'idle' && (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => enrichCompanyData(domain)}
              className='mt-2 h-8 text-xs text-[var(--brand)] hover:text-[var(--brand)]-hover'
            >
              <Sparkles className='w-3 h-3 mr-1' />
              Arricchisci dati aziendali
            </Button>
          )}

          {status === 'thinking' && (
            <div className='mt-2 flex items-center gap-2 text-xs text-[var(--text-tertiary)]'>
              <Loader2 className='w-3 h-3 animate-spin' />
              Ricerca informazioni...
            </div>
          )}

          {status === 'success' && companyData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className='mt-3 space-y-2'
            >
              <div className='flex items-center gap-2'>
                <Check className='w-4 h-4 text-[var(--status-success)]' />
                <span className='text-sm font-medium'>{companyData.companyName}</span>
              </div>
              {companyData.vat && (
                <p className='text-xs text-[var(--text-tertiary)]'>P.IVA: {companyData.vat}</p>
              )}
              <Button
                type='button'
                size='sm'
                onClick={() => onEnrich(companyData)}
                className='mt-2 h-8 text-xs bg-[var(--brand)] hover:bg-[var(--brand)]-hover'
              >
                Applica dati al form
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// PREDICTIVE INPUT COMPONENT
// ============================================================================
interface PredictiveInputProps {
  field: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
}

const fieldSuggestions: Record<string, string[]> = {
  city: [
    'Milano',
    'Roma',
    'Torino',
    'Napoli',
    'Bologna',
    'Firenze',
    'Venezia',
    'Verona',
    'Padova',
    'Brescia',
    'Modena',
    'Parma',
    'Reggio Emilia',
    'Genova',
    'Trieste',
  ],
  province: [
    'MI',
    'RM',
    'TO',
    'NA',
    'BO',
    'FI',
    'VE',
    'VR',
    'PD',
    'BS',
    'MO',
    'PR',
    'RE',
    'GE',
    'TS',
  ],
  companyName: [
    'Rossi S.r.l.',
    'Bianchi S.p.A.',
    'Verdi & Associati',
    'Ferrari Auto S.r.l.',
    'Mario Rossi Autofficina',
    'New Car Service S.r.l.',
  ],
};

const PredictiveInput: React.FC<PredictiveInputProps> = ({
  field,
  value,
  onChange,
  onSelect,
  placeholder,
  className,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value.length >= 2) {
      const suggestions = fieldSuggestions[field] || [];
      const filtered = suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()));
      setFilteredSuggestions(filtered.slice(0, 5));
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [value, field]);

  const handleSelect = (suggestion: string) => {
    onSelect(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className={cn('relative', className)}>
      <div className='relative'>
        <Input
          ref={inputRef}
          type='text'
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className='pr-12'
        />
        <VoiceInputButton
          onTranscript={onSelect}
          className='absolute right-2 top-1/2 -translate-y-1/2'
        />
      </div>

      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className='absolute z-50 w-full mt-1 bg-[var(--surface-secondary)]/90 backdrop-blur-xl rounded-apple-lg border border-[var(--border-default)] shadow-lg overflow-hidden'
          >
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={index}
                type='button'
                onClick={() => handleSelect(suggestion)}
                className='w-full px-4 py-3 text-left hover:bg-[var(--status-info-subtle)]/50 transition-colors flex items-center gap-2'
              >
                <Sparkles className='w-3 h-3 text-[var(--brand)]' />
                <span className='text-sm'>{suggestion}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// AI VALIDATION COMPONENT
// ============================================================================
interface AIValidationProps {
  field: string;
  value: string;
  onValidate: (isValid: boolean, message?: string) => void;
}

const useAIValidation = (field: string, value: string, delay = 500) => {
  const [status, setStatus] = useState<AIStatus>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (!value || value.length < 3) {
      setStatus('idle');
      return;
    }

    const timer = setTimeout(async () => {
      setStatus('thinking');

      // Simulate AI validation
      await new Promise(resolve => setTimeout(resolve, 400));

      // Simple heuristics for demo
      let isValid = true;
      let msg = '';

      switch (field) {
        case 'address':
          isValid = /(via|piazza|corso|viale|largo|borgo)\s+\w+/i.test(value);
          msg = isValid ? '' : 'Questo non sembra un indirizzo valido. Es: Via Roma 123';
          break;
        case 'fiscalCode':
          isValid = /^[A-Za-z]{6}\d{2}[A-Za-z]\d{2}[A-Za-z]\d{3}[A-Za-z]$/i.test(value);
          msg = isValid ? '' : 'Formato codice fiscale non valido';
          break;
        case 'companyName':
          isValid = value.length >= 3;
          msg = isValid ? '' : 'Nome azienda troppo corto';
          break;
        default:
          isValid = true;
      }

      setStatus(isValid ? 'success' : 'error');
      setMessage(msg);
    }, delay);

    return () => clearTimeout(timer);
  }, [field, value, delay]);

  return { status, message };
};

const AIValidationMessage: React.FC<{ field: string; value: string }> = ({ field, value }) => {
  const { status, message } = useAIValidation(field, value);

  if (status === 'idle' || status === 'thinking') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-center gap-2 mt-1 text-xs',
        status === 'error' ? 'text-[var(--status-error)]' : 'text-[var(--status-success)]'
      )}
    >
      {status === 'error' ? <AlertCircle className='w-3 h-3' /> : <Check className='w-3 h-3' />}
      <span>{status === 'error' ? message : 'Valido'}</span>
    </motion.div>
  );
};

// ============================================================================
// AI CHAT COMPONENT
// ============================================================================
interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentStep: Step;
  formData: Record<string, unknown>;
  onUpdateField: (field: string, value: unknown) => void;
}

const AIChat: React.FC<AIChatProps> = ({
  isOpen,
  onClose,
  currentStep,
  formData,
  onUpdateField,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: generateId(),
          role: 'assistant',
          content:
            'Ciao! Sono il tuo assistente AI. Posso aiutarti a compilare il modulo più velocemente. Cosa posso fare per te?',
          timestamp: new Date(),
          suggestions: stepSuggestions[currentStep],
        },
      ]);
    }
  }, [messages.length, currentStep]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update suggestions when step changes
  useEffect(() => {
    if (messages.length > 0) {
      setMessages(prev => [
        ...prev,
        {
          id: generateId(),
          role: 'system',
          content: `Step ${currentStep} attivo`,
          timestamp: new Date(),
          suggestions: stepSuggestions[currentStep],
        },
      ]);
    }
  }, [currentStep]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 1000));

    const aiResponse = generateAIResponse(inputValue, currentStep, formData);
    setMessages(prev => [...prev, aiResponse]);
    setIsTyping(false);
  };

  const generateAIResponse = (
    input: string,
    step: Step,
    data: Record<string, unknown>
  ): Message => {
    const lowerInput = input.toLowerCase();

    // Simple intent detection
    if (lowerInput.includes('help') || lowerInput.includes('aiuto')) {
      return {
        id: generateId(),
        role: 'assistant',
        content: 'Ecco alcuni suggerimenti per questo step:',
        timestamp: new Date(),
        suggestions: stepSuggestions[step],
      };
    }

    if (lowerInput.includes('indirizzo') || lowerInput.includes('address')) {
      return {
        id: generateId(),
        role: 'assistant',
        content:
          "Puoi scrivere l'indirizzo completo in un unico campo e l'AI lo parserà automaticamente in Via, Civico, CAP, Città e Provincia.",
        timestamp: new Date(),
      };
    }

    if (lowerInput.includes('pec') || lowerInput.includes('sdi')) {
      return {
        id: generateId(),
        role: 'assistant',
        content:
          "La PEC è obbligatoria per la fatturazione elettronica. Il codice SDI (7 caratteri) serve per ricevere le fatture elettroniche. Se non lo conosci, puoi usare '0000000'.",
        timestamp: new Date(),
      };
    }

    return {
      id: generateId(),
      role: 'assistant',
      content:
        'Ho capito! Continua a compilare il modulo. Se hai bisogno di aiuto specifico, fammi sapere qual è il campo che ti crea difficoltà.',
      timestamp: new Date(),
      suggestions: stepSuggestions[step],
    };
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessages(prev => [
      ...prev,
      {
        id: generateId(),
        role: 'assistant',
        content: `💡 ${suggestion}`,
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className='fixed bottom-24 right-6 w-[380px] max-h-[500px] bg-[var(--surface-secondary)]/90 backdrop-blur-3xl rounded-[32px] shadow-2xl border border-[var(--border-default)]/50 overflow-hidden z-50'
        >
          {/* Header */}
          <div className='bg-gradient-to-r from-[var(--surface-secondary)] to-[var(--surface-secondary)] p-4 border-b border-[var(--border-default)] flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--status-info)] flex items-center justify-center'>
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                >
                  <Sparkles className='w-5 h-5 text-[var(--text-on-brand)]' />
                </motion.div>
              </div>
              <div>
                <h3 className='font-semibold text-[var(--text-primary)]'>AI Assistant</h3>
                <p className='text-xs text-[var(--text-tertiary)]'>Sempre pronto ad aiutarti</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className='w-8 h-8 rounded-full bg-[var(--surface-secondary)] hover:bg-[var(--surface-secondary)] flex items-center justify-center transition-colors'
            >
              <X className='w-4 h-4 text-[var(--text-tertiary)]' />
            </button>
          </div>

          {/* Messages */}
          <div className='h-[320px] overflow-y-auto p-4 space-y-4'>
            {messages.map(message => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'flex gap-2',
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                    message.role === 'user'
                      ? 'bg-[var(--brand)]'
                      : 'bg-gradient-to-br from-[var(--brand)] to-[var(--status-info)]'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className='w-4 h-4 text-[var(--text-on-brand)]' />
                  ) : (
                    <Bot className='w-4 h-4 text-[var(--text-on-brand)]' />
                  )}
                </div>
                <div
                  className={cn(
                    'max-w-[75%] p-3 rounded-2xl text-sm',
                    message.role === 'user'
                      ? 'bg-[var(--brand)] text-[var(--text-on-brand)] rounded-br-md'
                      : 'bg-[var(--surface-secondary)]/70 backdrop-blur border border-[var(--border-default)] rounded-bl-md'
                  )}
                >
                  {message.content}
                </div>
              </motion.div>
            ))}

            {/* Suggestions */}
            {messages[messages.length - 1]?.suggestions && (
              <div className='flex flex-wrap gap-2 ml-10'>
                {messages[messages.length - 1].suggestions?.map((suggestion, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className='px-3 py-1.5 bg-[var(--surface-secondary)]/70 hover:bg-[var(--surface-secondary)] border border-[var(--border-default)] hover:border-[var(--brand)] rounded-full text-xs text-[var(--text-primary)] transition-all duration-200 flex items-center gap-1'
                  >
                    <Lightbulb className='w-3 h-3 text-[var(--brand)]' />
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            )}

            {isTyping && (
              <div className='flex items-center gap-2 ml-10'>
                <div className='w-8 h-8 rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--status-info)] flex items-center justify-center'>
                  <Bot className='w-4 h-4 text-[var(--text-on-brand)]' />
                </div>
                <div className='bg-[var(--surface-secondary)]/70 p-3 rounded-2xl rounded-bl-md flex items-center gap-1'>
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className='w-2 h-2 bg-[var(--text-tertiary)] rounded-full'
                  />
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
                    className='w-2 h-2 bg-[var(--text-tertiary)] rounded-full'
                  />
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
                    className='w-2 h-2 bg-[var(--text-tertiary)] rounded-full'
                  />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className='p-4 border-t border-[var(--border-default)] bg-[var(--surface-secondary)]'>
            <div className='flex items-center gap-2'>
              <Input
                type='text'
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder='Scrivi un messaggio...'
                className='flex-1 bg-[var(--surface-secondary)]/70 border-[var(--border-default)] rounded-full px-4 h-10'
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className='w-10 h-10 rounded-full bg-[var(--brand)] hover:bg-[var(--brand)]-hover text-[var(--text-on-brand)] flex items-center justify-center disabled:opacity-50 transition-colors'
              >
                <Send className='w-4 h-4' />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// MAIN AI ASSISTANT COMPONENT
// ============================================================================
export const AIFormAssistant: React.FC<AIFormAssistantProps> = ({
  currentStep,
  formData,
  onUpdateField,
  className,
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasUnreadSuggestions, setHasUnreadSuggestions] = useState(true);

  // Show notification badge for new step suggestions
  useEffect(() => {
    setHasUnreadSuggestions(true);
  }, [currentStep]);

  return (
    <div className={cn('relative', className)}>
      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setIsChatOpen(!isChatOpen);
          setHasUnreadSuggestions(false);
        }}
        className={cn(
          'fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center z-50',
          'bg-gradient-to-br from-[var(--brand)] to-[var(--status-info)] hover:from-[var(--status-info)] hover:to-[var(--status-info)]',
          'border-2 border-[var(--border-default)]/20 backdrop-blur-xl',
          isChatOpen && 'bg-[var(--surface-primary)]'
        )}
      >
        <AnimatePresence mode='wait'>
          {isChatOpen ? (
            <motion.div
              key='close'
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className='w-6 h-6 text-[var(--text-on-brand)]' />
            </motion.div>
          ) : (
            <motion.div
              key='chat'
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              className='relative'
            >
              <MessageSquare className='w-6 h-6 text-[var(--text-on-brand)]' />
              {hasUnreadSuggestions && (
                <span className='absolute -top-1 -right-1 w-3 h-3 bg-[var(--status-error-subtle)]0 rounded-full border-2 border-[var(--border-default)]' />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Interface */}
      <AIChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentStep={currentStep}
        formData={formData}
        onUpdateField={onUpdateField}
      />
    </div>
  );
};

// ============================================================================
// EXPORT INDIVIDUAL COMPONENTS
// ============================================================================
export {
  VoiceInputButton,
  SmartAddressInput,
  CompanyIntelligence,
  PredictiveInput,
  AIValidationMessage,
  useAIValidation,
  stepSuggestions,
};

export type { AIStatus, Message, ParsedAddress, CompanyData, AIAction };

export default AIFormAssistant;
