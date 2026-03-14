/**
 * Abandonment Prevention Modal
 * Mostra un modal di aiuto quando l'utente mostra segni di frustrazione
 */

import React, { useCallback } from 'react';
import { AbandonmentRisk } from '../../lib/analytics/behavioral';

export interface AbandonmentPreventionModalProps {
  open: boolean;
  onClose: () => void;
  riskLevel: AbandonmentRisk;
  score: number;
  formId?: string;
  currentStep?: string;
  onOpenChat?: () => void;
  onRequestCallback?: () => void;
  onOpenGuide?: () => void;
  onSaveAndContinue?: () => void;
  title?: string;
  message?: string;
  variant?: 'default' | 'minimal' | 'proactive';
  showSaveAndContinue?: boolean;
  className?: string;
}

export const AbandonmentPreventionModal: React.FC<AbandonmentPreventionModalProps> = ({
  open,
  onClose,
  riskLevel,
  score,
  formId,
  currentStep,
  onOpenChat,
  onRequestCallback,
  onOpenGuide,
  onSaveAndContinue,
  title,
  message,
  variant = 'default',
  showSaveAndContinue = true,
  className,
}) => {
  const handleOpenChat = useCallback(() => {
    const win = window as Window & { analytics?: { track: (event: string, properties: Record<string, string | number | undefined>) => void } };
    if (typeof window !== 'undefined' && win.analytics) {
      win.analytics.track('Support Chat Opened', {
        source: 'abandonment_prevention',
        formId,
        riskLevel,
        score,
        step: currentStep,
      });
    }
    onOpenChat?.();
    onClose();
  }, [onOpenChat, onClose, formId, riskLevel, score, currentStep]);

  const getDefaultTitle = (): string => {
    if (riskLevel === 'high') return 'Stai incontrando difficoltà?';
    return 'Hai bisogno di aiuto?';
  };

  const getDefaultMessage = (): string => {
    if (riskLevel === 'high') {
      return 'Abbiamo notato alcuni segni di frustrazione. Il nostro team è qui per aiutarti.';
    }
    return 'Siamo qui per aiutarti a completare questo passaggio.';
  };

  const getRiskColor = (): string => {
    switch (riskLevel) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-amber-500';
      default: return 'text-blue-500';
    }
  };

  if (!open) return null;

  if (variant === 'minimal') {
    return (
      <div className={`fixed inset-0 flex items-center justify-center bg-black/50 z-50 ${className}`}>
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full bg-gray-100`}>
              <span className={getRiskColor()}>🆘</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{title || getDefaultTitle()}</h3>
              <p className="text-gray-600 mt-1 text-sm">{message || getDefaultMessage()}</p>
              
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={handleOpenChat}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  💬 Chat
                </button>
                <button 
                  onClick={onClose}
                  className="flex-1 border border-gray-300 px-4 py-2 rounded hover:bg-gray-50"
                >
                  Continua
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'proactive') {
    return (
      <div className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-xl shadow-lg border p-4 z-50 ${className}`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full bg-gray-100 shrink-0`}>
            <span className={getRiskColor()}>🆘</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm">{title || getDefaultTitle()}</h4>
            <p className="text-xs text-gray-500 mt-1">{message || getDefaultMessage()}</p>
            <div className="flex gap-2 mt-3">
              <button 
                onClick={handleOpenChat}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded"
              >
                Chatta ora
              </button>
              <button 
                onClick={onClose}
                className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5"
              >
                Chiudi
              </button>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={`fixed inset-0 flex items-center justify-center bg-black/50 z-50 ${className}`}>
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <div className="flex items-center gap-4 mb-4">
          <div className={`p-4 rounded-full bg-gray-100`}>
            <span className={`text-3xl ${getRiskColor()}`}>
              {riskLevel === 'high' ? '⚠️' : '🆘'}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-semibold">{title || getDefaultTitle()}</h3>
            <p className="text-gray-600 text-sm">{message || getDefaultMessage()}</p>
            {process.env.NODE_ENV === 'development' && (
              <span className="text-xs text-gray-400">Risk Score: {score}/100</span>
            )}
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <button
            onClick={handleOpenChat}
            className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
          >
            <span className="p-2 bg-blue-600 text-white rounded-full">💬</span>
            <div className="flex-1">
              <div className="font-medium text-sm">Chatta con noi</div>
              <div className="text-xs text-gray-500">Risposta immediata via chat</div>
            </div>
            <span>→</span>
          </button>

          <button
            onClick={() => { onRequestCallback?.(); onClose(); }}
            className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
          >
            <span className="p-2 bg-gray-100 rounded-full">📞</span>
            <div className="flex-1">
              <div className="font-medium text-sm">Chiamata gratuita</div>
              <div className="text-xs text-gray-500">Ti richiamiamo entro 5 minuti</div>
            </div>
            <span>→</span>
          </button>

          <button
            onClick={() => { onOpenGuide?.(); onClose(); }}
            className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
          >
            <span className="p-2 bg-gray-100 rounded-full">❓</span>
            <div className="flex-1">
              <div className="font-medium text-sm">Guida passo passo</div>
              <div className="text-xs text-gray-500">Istruzioni dettagliate</div>
            </div>
            <span>→</span>
          </button>
        </div>

        <div className="flex gap-2">
          {showSaveAndContinue && (
            <button
              onClick={() => { onSaveAndContinue?.(); onClose(); }}
              className="flex-1 border border-gray-300 px-4 py-2 rounded hover:bg-gray-50"
            >
              Salva e continua dopo
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 text-gray-600 hover:text-gray-800 px-4 py-2"
          >
            No grazie, continuo da solo
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t text-xs text-gray-500">
          <span>🟢 Supporto 24/7</span>
          <span>🟢 Tempo medio risposta: 2 min</span>
        </div>
      </div>
    </div>
  );
};

export default AbandonmentPreventionModal;
