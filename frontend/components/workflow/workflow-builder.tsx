'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Zap,
  Mail,
  MessageSquare,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Users,
  Receipt,
  Wrench,
  Car,
  ArrowRight,
  Save,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────
type TriggerType =
  | 'work_order_status'
  | 'booking_created'
  | 'invoice_overdue'
  | 'warranty_expiring'
  | 'vehicle_maintenance'
  | 'new_customer';

type ActionType =
  | 'send_sms'
  | 'send_email'
  | 'create_invoice'
  | 'change_status'
  | 'create_task'
  | 'webhook'
  | 'delay';

interface WorkflowTrigger {
  type: TriggerType;
  config: Record<string, string | number | boolean>;
}

interface WorkflowAction {
  id: string;
  type: ActionType;
  config: Record<string, string | number | boolean>;
}

interface Workflow {
  id?: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  enabled: boolean;
}

// ─── Trigger/Action definitions ─────────────────────────────────────
const TRIGGERS: { type: TriggerType; label: string; icon: typeof Zap; description: string }[] = [
  { type: 'work_order_status', label: 'Ordine di lavoro cambia stato', icon: Wrench, description: 'Quando un ordine di lavoro cambia stato (es: completato)' },
  { type: 'booking_created', label: 'Nuova prenotazione', icon: Calendar, description: 'Quando viene creata una nuova prenotazione' },
  { type: 'invoice_overdue', label: 'Fattura scaduta', icon: Receipt, description: 'Quando una fattura supera la data di scadenza' },
  { type: 'warranty_expiring', label: 'Garanzia in scadenza', icon: AlertTriangle, description: 'Quando una garanzia sta per scadere' },
  { type: 'vehicle_maintenance', label: 'Manutenzione veicolo', icon: Car, description: 'Quando un veicolo necessita manutenzione' },
  { type: 'new_customer', label: 'Nuovo cliente', icon: Users, description: 'Quando viene registrato un nuovo cliente' },
];

const ACTIONS: { type: ActionType; label: string; icon: typeof Zap; description: string }[] = [
  { type: 'send_sms', label: 'Invia SMS', icon: MessageSquare, description: 'Invia un SMS al cliente' },
  { type: 'send_email', label: 'Invia Email', icon: Mail, description: 'Invia una email al cliente' },
  { type: 'create_invoice', label: 'Crea Fattura', icon: FileText, description: 'Genera automaticamente una fattura' },
  { type: 'change_status', label: 'Cambia Stato', icon: CheckCircle2, description: 'Cambia lo stato di un\'entita' },
  { type: 'create_task', label: 'Crea Attivita', icon: Plus, description: 'Crea un\'attivita per un membro del team' },
  { type: 'delay', label: 'Attendi', icon: Clock, description: 'Attendi un periodo di tempo prima della prossima azione' },
  { type: 'webhook', label: 'Webhook', icon: Zap, description: 'Invia una richiesta HTTP a un URL esterno' },
];

// ─── Component ──────────────────────────────────────────────────────
export function WorkflowBuilder(): React.ReactElement {
  const [workflow, setWorkflow] = useState<Workflow>({
    name: '',
    description: '',
    trigger: { type: 'work_order_status', config: {} },
    actions: [],
    enabled: true,
  });

  const [showTriggerSelect, setShowTriggerSelect] = useState(false);
  const [showActionSelect, setShowActionSelect] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const setTrigger = (type: TriggerType): void => {
    setWorkflow((prev) => ({ ...prev, trigger: { type, config: {} } }));
    setShowTriggerSelect(false);
  };

  const addAction = (type: ActionType): void => {
    const newAction: WorkflowAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      config: {},
    };
    setWorkflow((prev) => ({ ...prev, actions: [...prev.actions, newAction] }));
    setShowActionSelect(false);
  };

  const removeAction = (id: string): void => {
    setWorkflow((prev) => ({
      ...prev,
      actions: prev.actions.filter((a) => a.id !== id),
    }));
  };

  const updateActionConfig = (id: string, key: string, value: string | number | boolean): void => {
    setWorkflow((prev) => ({
      ...prev,
      actions: prev.actions.map((a) =>
        a.id === id ? { ...a, config: { ...a.config, [key]: value } } : a
      ),
    }));
  };

  const handleSave = async (): Promise<void> => {
    if (!workflow.name.trim()) {
      toast.error('Inserisci un nome per il workflow');
      return;
    }
    if (workflow.actions.length === 0) {
      toast.error('Aggiungi almeno un\'azione');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(workflow),
      });
      if (!res.ok) throw new Error('Errore nel salvataggio');
      toast.success('Workflow salvato con successo');
    } catch {
      toast.error('Errore nel salvataggio del workflow');
    } finally {
      setIsSaving(false);
    }
  };

  const currentTrigger = TRIGGERS.find((t) => t.type === workflow.trigger.type);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Workflow Name */}
      <div className="space-y-3">
        <input
          type="text"
          value={workflow.name}
          onChange={(e) => setWorkflow((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Nome del workflow..."
          className="w-full text-xl font-semibold bg-transparent border-none focus:outline-none text-[var(--text-primary)] dark:text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
        />
        <input
          type="text"
          value={workflow.description}
          onChange={(e) => setWorkflow((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Descrizione (opzionale)..."
          className="w-full text-sm bg-transparent border-none focus:outline-none text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] placeholder:text-[var(--text-tertiary)]"
        />
      </div>

      {/* Trigger */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] uppercase tracking-wider">
            Quando
          </h3>
        </div>

        <button
          onClick={() => setShowTriggerSelect(!showTriggerSelect)}
          className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10 hover:border-amber-400 dark:hover:border-amber-600 transition-colors text-left"
        >
          {currentTrigger && (
            <>
              <currentTrigger.icon className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{currentTrigger.label}</p>
                <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">{currentTrigger.description}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)] shrink-0" />
            </>
          )}
        </button>

        {/* Trigger Select Dropdown */}
        <AnimatePresence>
          {showTriggerSelect && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-xl border border-[var(--border-default)] dark:border-[var(--border-default)] overflow-hidden"
            >
              {TRIGGERS.map((trigger) => (
                <button
                  key={trigger.type}
                  onClick={() => setTrigger(trigger.type)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white dark:hover:bg-[var(--surface-hover)] transition-colors',
                    workflow.trigger.type === trigger.type && 'bg-amber-50 dark:bg-amber-900/20'
                  )}
                >
                  <trigger.icon className="h-4 w-4 text-[var(--text-secondary)] shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{trigger.label}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{trigger.description}</p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions Flow */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-[var(--brand)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] uppercase tracking-wider">
            Allora
          </h3>
        </div>

        {/* Action List */}
        <div className="space-y-2">
          {workflow.actions.map((action, index) => {
            const actionDef = ACTIONS.find((a) => a.type === action.type);
            if (!actionDef) return null;

            return (
              <motion.div
                key={action.id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-start gap-2"
              >
                {/* Connector line */}
                {index > 0 && (
                  <div className="absolute -mt-2 ml-5 w-px h-2 bg-gray-300 dark:bg-gray-600" />
                )}
                <div className="flex-1 p-4 rounded-xl border border-[var(--border-default)] dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-primary)] hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-[var(--brand)]/10 dark:bg-blue-900/30">
                        <actionDef.icon className="h-4 w-4 text-[var(--brand)] dark:text-[var(--brand)]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                          {index + 1}. {actionDef.label}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">{actionDef.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeAction(action.id)}
                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
                      aria-label="Rimuovi azione"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Action Config Fields */}
                  <div className="mt-3 space-y-2">
                    {action.type === 'send_sms' && (
                      <textarea
                        value={(action.config.message as string) ?? ''}
                        onChange={(e) => updateActionConfig(action.id, 'message', e.target.value)}
                        placeholder="Messaggio SMS... Usa {nome}, {targa}, {data} come variabili"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-default)] dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] resize-none"
                        rows={2}
                      />
                    )}
                    {action.type === 'send_email' && (
                      <>
                        <input
                          type="text"
                          value={(action.config.subject as string) ?? ''}
                          onChange={(e) => updateActionConfig(action.id, 'subject', e.target.value)}
                          placeholder="Oggetto email..."
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-default)] dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)]"
                        />
                        <textarea
                          value={(action.config.body as string) ?? ''}
                          onChange={(e) => updateActionConfig(action.id, 'body', e.target.value)}
                          placeholder="Corpo email..."
                          className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-default)] dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)] resize-none"
                          rows={3}
                        />
                      </>
                    )}
                    {action.type === 'delay' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={(action.config.days as number) ?? 1}
                          onChange={(e) => updateActionConfig(action.id, 'days', parseInt(e.target.value) || 1)}
                          min={1}
                          className="w-20 px-3 py-2 text-sm rounded-lg border border-[var(--border-default)] dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)]"
                        />
                        <span className="text-sm text-[var(--text-secondary)]">giorni</span>
                      </div>
                    )}
                    {action.type === 'webhook' && (
                      <input
                        type="url"
                        value={(action.config.url as string) ?? ''}
                        onChange={(e) => updateActionConfig(action.id, 'url', e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-default)] dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)]"
                      />
                    )}
                    {action.type === 'change_status' && (
                      <select
                        value={(action.config.newStatus as string) ?? ''}
                        onChange={(e) => updateActionConfig(action.id, 'newStatus', e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-default)] dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-elevated)]"
                      >
                        <option value="">Seleziona nuovo stato...</option>
                        <option value="completed">Completato</option>
                        <option value="in_progress">In Lavorazione</option>
                        <option value="pending">In Attesa</option>
                        <option value="cancelled">Annullato</option>
                      </select>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Add Action Button */}
        <div className="relative">
          <button
            onClick={() => setShowActionSelect(!showActionSelect)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[var(--border-default)] dark:border-[var(--border-default)] text-[var(--text-secondary)] dark:text-[var(--text-tertiary)] hover:border-blue-400 hover:text-[var(--brand)] dark:hover:border-[var(--brand)] dark:hover:text-[var(--brand)] transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium">Aggiungi azione</span>
          </button>

          <AnimatePresence>
            {showActionSelect && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-full left-0 right-0 mt-1 z-20 rounded-xl border border-[var(--border-default)] dark:border-[var(--border-default)] bg-white dark:bg-[var(--surface-primary)] shadow-lg overflow-hidden"
              >
                {ACTIONS.map((action) => (
                  <button
                    key={action.type}
                    onClick={() => addAction(action.type)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white dark:hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <action.icon className="h-4 w-4 text-[var(--text-secondary)] shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{action.label}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{action.description}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Save Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-default)] dark:border-[var(--border-default)]">
        <Button variant="outline" onClick={() => toast.info('Test del workflow in arrivo...')} className="gap-2">
          <Play className="h-4 w-4" />
          Testa
        </Button>
        <Button onClick={handleSave} loading={isSaving} className="gap-2">
          <Save className="h-4 w-4" />
          Salva Workflow
        </Button>
      </div>
    </div>
  );
}
