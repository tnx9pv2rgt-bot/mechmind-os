"use client";

/**
 * AI Assistant Panel for Customer Form
 * Provides intelligent suggestions and real-time assistance
 */

import React, { useState, useCallback, memo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Lightbulb, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AIAssistantPanelProps {
  currentStep: number;
  formData: Record<string, unknown>;
  onSuggestionApply: (field: string, value: string) => void;
}

interface Suggestion {
  id: string;
  type: "info" | "warning" | "success" | "tip";
  field?: string;
  title: string;
  message: string;
  action?: {
    label: string;
    value: string;
  };
}

// AI Analysis functions
function analyzeEmail(email: string): Suggestion | null {
  if (!email) return null;
  
  const commonTypos: Record<string, string> = {
    "gmial.com": "gmail.com",
    "gmal.com": "gmail.com",
    "gamil.com": "gmail.com",
    "hotmal.com": "hotmail.com",
    "yahooo.it": "yahoo.it",
  };

  const domain = email.split("@")[1];
  if (domain && commonTypos[domain]) {
    return {
      id: "email-typo",
      type: "warning",
      field: "email",
      title: "Possibile errore di battitura",
      message: `Intendevi ${email.split("@")[0]}@${commonTypos[domain]}?`,
      action: {
        label: "Correggi",
        value: `${email.split("@")[0]}@${commonTypos[domain]}`,
      },
    };
  }

  return null;
}

function analyzePassword(password: string): Suggestion | null {
  if (!password || password.length < 8) return null;

  const patterns = [
    { regex: /^(.)\1+$/, message: "La password non dovrebbe contenere caratteri ripetuti" },
    { regex: /^(012|123|234|345|456|567|678|789|890)/, message: "Evita sequenze numeriche" },
    { regex: /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk)/i, message: "Evita sequenze di lettere" },
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(password)) {
      return {
        id: "password-pattern",
        type: "warning",
        field: "password",
        title: "Password debole",
        message: pattern.message,
      };
    }
  }

  return null;
}

function analyzePIVA(piva: string): Suggestion | null {
  if (!piva || piva.length !== 11) return null;

  // Check if all same digits
  if (/^(.)\1{10}$/.test(piva)) {
    return {
      id: "piva-invalid",
      type: "warning",
      field: "vatNumber",
      title: "Partita IVA sospetta",
      message: "Questa Partita IVA sembra non valida (cifre ripetute)",
    };
  }

  return null;
}

function generateTips(currentStep: number, formData: Record<string, unknown>): Suggestion[] {
  const tips: Suggestion[] = [];

  if (currentStep === 1) {
    if (!formData.email) {
      tips.push({
        id: "tip-email",
        type: "tip",
        title: "💡 Suggerimento",
        message: "Usa un'email che controlli regolarmente per ricevere notifiche importanti",
      });
    }
    if (!formData.password) {
      tips.push({
        id: "tip-password",
        type: "tip",
        title: "🔐 Sicurezza",
        message: "Una password forte include maiuscole, minuscole, numeri e simboli",
      });
    }
  }

  if (currentStep === 2) {
    if (formData.customerType === "business" && !formData.vatNumber) {
      tips.push({
        id: "tip-piva",
        type: "tip",
        field: "vatNumber",
        title: "🏢 Azienda",
        message: "Clicca su 'Verifica' dopo aver inserito la Partita IVA per auto-compilare i dati",
      });
    }
  }

  if (currentStep === 3) {
    tips.push({
      id: "tip-privacy",
      type: "info",
      title: "🛡️ GDPR",
      message: "I consensi possono essere modificati in qualsiasi momento dalle impostazioni account",
    });
  }

  return tips;
}

export const AIAssistantPanel = memo(function AIAssistantPanel({
  currentStep,
  formData,
  onSuggestionApply,
}: AIAssistantPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Analyze form data for suggestions
  useEffect(() => {
    const analyze = async () => {
      setIsAnalyzing(true);
      
      // Simulate AI processing delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      const newSuggestions: Suggestion[] = [];

      // Email analysis
      const emailSuggestion = analyzeEmail(formData.email as string);
      if (emailSuggestion && !dismissedIds.has(emailSuggestion.id)) {
        newSuggestions.push(emailSuggestion);
      }

      // Password analysis
      const passwordSuggestion = analyzePassword(formData.password as string);
      if (passwordSuggestion && !dismissedIds.has(passwordSuggestion.id)) {
        newSuggestions.push(passwordSuggestion);
      }

      // PIVA analysis
      const pivaSuggestion = analyzePIVA(formData.vatNumber as string);
      if (pivaSuggestion && !dismissedIds.has(pivaSuggestion.id)) {
        newSuggestions.push(pivaSuggestion);
      }

      // General tips
      const tips = generateTips(currentStep, formData);
      newSuggestions.push(...tips.filter((t) => !dismissedIds.has(t.id)));

      setSuggestions(newSuggestions);
      setIsAnalyzing(false);
    };

    analyze();
  }, [formData, currentStep, dismissedIds]);

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleApply = useCallback(
    (suggestion: Suggestion) => {
      if (suggestion.field && suggestion.action) {
        onSuggestionApply(suggestion.field, suggestion.action.value);
        handleDismiss(suggestion.id);
      }
    },
    [onSuggestionApply, handleDismiss]
  );

  const getIcon = (type: Suggestion["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case "tip":
        return <Lightbulb className="w-5 h-5 text-blue-500" />;
      default:
        return <Sparkles className="w-5 h-5 text-purple-500" />;
    }
  };

  const getBgColor = (type: Suggestion["type"]) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200";
      case "warning":
        return "bg-amber-50 border-amber-200";
      case "tip":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-purple-50 border-purple-200";
    }
  };

  if (suggestions.length === 0 && !isAnalyzing) {
    return null;
  }

  return (
    <div className="fixed right-4 top-20 z-40 w-80">
      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "absolute right-0 top-0 rounded-full shadow-lg transition-all duration-300",
          isOpen ? "opacity-0 pointer-events-none" : "opacity-100",
          suggestions.length > 0 && "animate-pulse"
        )}
        size="icon"
      >
        <Sparkles className="w-5 h-5" />
        {suggestions.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {suggestions.length}
          </span>
        )}
      </Button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <span className="font-semibold text-gray-800">Assistente AI</span>
              </div>
              <div className="flex items-center gap-1">
                {isAnalyzing && (
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Suggestions */}
            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
              {suggestions.length === 0 && !isAnalyzing ? (
                <p className="text-center text-gray-400 text-sm py-4">
                  Nessun suggerimento al momento
                </p>
              ) : (
                suggestions.map((suggestion) => (
                  <motion.div
                    key={suggestion.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      "p-3 rounded-xl border text-sm",
                      getBgColor(suggestion.type)
                    )}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getIcon(suggestion.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 mb-1">
                          {suggestion.title}
                        </h4>
                        <p className="text-gray-600 leading-relaxed">
                          {suggestion.message}
                        </p>
                        {suggestion.action && (
                          <Button
                            onClick={() => handleApply(suggestion)}
                            size="sm"
                            variant="outline"
                            className="mt-2 h-8 text-xs"
                          >
                            {suggestion.action.label}
                          </Button>
                        )}
                      </div>
                      <button
                        onClick={() => handleDismiss(suggestion.id)}
                        className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default AIAssistantPanel;
