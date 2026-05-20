'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FAQ_RESPONSES: Record<string, string> = {
  prezzo: 'MechMind parte da €29/mese (piano Starter). Il piano Pro costa €79/mese e include tutte le funzionalità. 14 giorni di prova gratuita, nessuna carta richiesta.',
  costo: 'MechMind parte da €29/mese (piano Starter). Il piano Pro costa €79/mese e include tutte le funzionalità. 14 giorni di prova gratuita, nessuna carta richiesta.',
  quanto: 'MechMind parte da €29/mese (piano Starter). Il piano Pro costa €79/mese e include tutte le funzionalità. 14 giorni di prova gratuita, nessuna carta richiesta.',
  funziona: 'MechMind è un gestionale cloud: apri il browser, ti registri in 30 secondi, rispondi a 4 domande e la dashboard è pronta. Nessuna installazione.',
  come: 'MechMind è un gestionale cloud: apri il browser, ti registri in 30 secondi, rispondi a 4 domande e la dashboard è pronta. Nessuna installazione.',
  prova: 'Certo! 14 giorni gratis, nessuna carta di credito. Vai su mechmind.it/auth/register per iniziare subito.',
  gratis: 'Certo! 14 giorni gratis, nessuna carta di credito. Vai su mechmind.it/auth/register per iniziare subito.',
  sdi: 'Sì, la fatturazione elettronica SDI è integrata nativamente. Genera XML conformi, invio automatico, gestione PEC e bollo virtuale.',
  fattura: 'Sì, la fatturazione elettronica SDI è integrata nativamente. Genera XML conformi, invio automatico, gestione PEC e bollo virtuale.',
  sicurezza: 'I tuoi dati sono protetti con crittografia AES-256, GDPR compliant, backup giornalieri automatici, server in Europa. Isolamento dati per sede.',
  gdpr: 'MechMind è GDPR compliant nativamente: crittografia dati personali, diritto all\'oblio, esportazione dati, audit trail completo.',
  import: 'Puoi importare i clienti da file CSV/Excel. L\'import è guidato: carichi il file, mappi le colonne, e in 2 minuti hai tutti i dati dentro.',
  excel: 'Puoi importare i clienti da file CSV/Excel. L\'import è guidato: carichi il file, mappi le colonne, e in 2 minuti hai tutti i dati dentro.',
  mobile: 'MechMind è responsive e ottimizzato per tablet e smartphone. Puoi usarlo dal tablet in officina con touch target di almeno 44px.',
  tablet: 'MechMind è responsive e ottimizzato per tablet e smartphone. Puoi usarlo dal tablet in officina con touch target di almeno 44px.',
  supporto: 'Tutti i piani includono supporto in italiano. Il piano Pro ha supporto prioritario. Scrivici a info@mechmind.it.',
  cancella: 'Puoi cancellare in qualsiasi momento. Mantieni l\'accesso fino alla fine del periodo pagato. Dati disponibili per export per 90 giorni.',
  demo: 'Puoi provare MechMind gratis per 14 giorni oppure scrivici a info@mechmind.it per una demo guidata personalizzata.',
};

const QUICK_REPLIES = [
  { label: 'Quanto costa?', keyword: 'prezzo' },
  { label: 'Come funziona?', keyword: 'funziona' },
  { label: 'Posso provarlo?', keyword: 'prova' },
] as const;

interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user';
}

function findResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const [keyword, response] of Object.entries(FAQ_RESPONSES)) {
    if (lower.includes(keyword)) return response;
  }
  return 'Non ho capito la domanda. Prova a chiedere su prezzi, funzionalità, fatturazione SDI, sicurezza o supporto. Oppure scrivici a info@mechmind.it!';
}

export function ChatWidget(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', text: 'Ciao! Come posso aiutarti?', sender: 'bot' },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowBubble(true), 30000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(
    (text: string): void => {
      if (!text.trim()) return;
      const userMsg: Message = { id: Date.now().toString(), text, sender: 'user' };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setTimeout(() => {
        const response = findResponse(text);
        const botMsg: Message = { id: (Date.now() + 1).toString(), text: response, sender: 'bot' };
        setMessages((prev) => [...prev, botMsg]);
      }, 500);
    },
    [],
  );

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Bubble hint */}
      <AnimatePresence>
        {showBubble && !isOpen && (
          <motion.div
            className="fixed bottom-20 right-6 z-50 max-w-[200px] rounded-xl bg-[var(--surface-secondary)] p-3 text-sm text-[var(--text-primary)] shadow-xl dark:bg-[var(--surface-elevated)] dark:text-[var(--text-primary)]"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <button
              type="button"
              onClick={() => setShowBubble(false)}
              className="absolute -right-2 -top-2 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--border-default)] text-[var(--text-tertiary)] dark:bg-[var(--border-default)] dark:text-[var(--text-secondary)]"
              aria-label="Chiudi"
            >
              <span className="text-xs leading-none pointer-events-none" aria-hidden="true">&#10005;</span>
            </button>
            Hai domande? Chiedimi!
            <div className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 bg-[var(--surface-secondary)] dark:bg-[var(--surface-elevated)]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat toggle button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setShowBubble(false);
        }}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#0d0d0d] text-[var(--text-on-brand)] shadow-lg transition-all hover:bg-[var(--surface-secondary)] hover:text-[#0d0d0d] hover:shadow-xl active:scale-95"
        aria-label={isOpen ? 'Chiudi chat' : 'Apri chat'}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <span>&#10005;</span>
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <span className="text-lg font-bold">?</span>
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-24 right-6 z-50 w-[340px] overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-secondary)] shadow-2xl dark:border-[var(--border-default)] dark:bg-[var(--surface-elevated)] sm:w-[380px]"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-[var(--border-default)] bg-[#0d0d0d] px-4 py-3 dark:border-[var(--border-default)]">
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--text-on-brand)]">MechMind</p>
                <p className="text-xs text-[var(--text-on-brand)]/70">Rispondiamo subito</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-on-brand)]/70 transition-colors hover:bg-[var(--surface-secondary)]/10 hover:text-[var(--text-on-brand)]"
                aria-label="Chiudi chat"
              >
                <span className="pointer-events-none" aria-hidden="true">&#10005;</span>
              </button>
            </div>

            {/* Messages */}
            <div className="h-[300px] overflow-y-auto p-4 sm:h-[340px]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`mb-3 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#0d0d0d] text-[var(--text-on-brand)]'
                        : 'bg-[var(--surface-secondary)] text-[var(--text-primary)] dark:bg-[var(--surface-primary)] dark:text-[var(--text-primary)]'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />

              {messages.length <= 1 && (
                <div className="mt-2 flex flex-col gap-2">
                  {QUICK_REPLIES.map((qr) => (
                    <button
                      key={qr.keyword}
                      type="button"
                      onClick={() => sendMessage(qr.label)}
                      className="min-h-[44px] rounded-xl border border-[#0d0d0d]/20 dark:border-[var(--border-default)]/20 bg-[#0d0d0d]/5 dark:bg-[var(--surface-secondary)]/10 px-4 py-2.5 text-left text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-on-brand)] transition-colors hover:bg-[#0d0d0d]/10 dark:hover:bg-[var(--surface-secondary)]/15"
                    >
                      {qr.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 border-t border-[var(--border-default)] px-4 py-3 dark:border-[var(--border-default)]"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Scrivi..."
                className="min-h-[44px] flex-1 rounded-xl border border-[var(--border-default)] bg-[var(--surface-secondary)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] focus:border-[#0d0d0d] dark:focus:border-[var(--border-default)] focus:ring-2 focus:ring-[#0d0d0d]/20 dark:focus:ring-[var(--border-default)]/20 dark:border-[var(--border-default)] dark:bg-[var(--surface-primary)] dark:text-[var(--text-primary)]"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d0d0d] text-[var(--text-on-brand)] transition-colors hover:bg-[var(--surface-secondary)] hover:text-[#0d0d0d] disabled:opacity-40"
                aria-label="Invia messaggio"
              >
                <span>&#8599;</span>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
