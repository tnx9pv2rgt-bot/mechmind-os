/**
 * URL Sync utilities for Conditional Form Flow
 * 
 * Gestisce la sincronizzazione dello step corrente con l'URL
 * per permettere refresh e condivisione del link
 */

import { URLSyncOptions, FormAnswers } from './types';

const DEFAULT_OPTIONS: URLSyncOptions = {
  enabled: true,
  paramName: 'step',
  useHash: false,
  replace: true,
};

/**
 * Sincronizza lo step corrente con l'URL
 */
export function syncWithURL(
  stepIndex: number,
  options: Partial<URLSyncOptions> = {}
): void {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  if (!config.enabled || typeof window === 'undefined') return;
  
  const url = new URL(window.location.href);
  const paramValue = String(stepIndex + 1); // 1-based per URL
  
  if (config.useHash) {
    // Hash-based routing
    url.hash = `${config.paramName}=${paramValue}`;
  } else {
    // Query param routing
    url.searchParams.set(config.paramName, paramValue);
  }
  
  const newUrl = config.useHash 
    ? `${url.pathname}${url.hash}`
    : `${url.pathname}${url.search}`;
  
  if (config.replace) {
    window.history.replaceState({ step: stepIndex }, '', newUrl);
  } else {
    window.history.pushState({ step: stepIndex }, '', newUrl);
  }
}

/**
 * Ottiene lo step corrente dall'URL
 */
export function getStepFromURL(options: Partial<URLSyncOptions> = {}): number {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  if (typeof window === 'undefined') return 0;
  
  let stepValue: string | null = null;
  
  if (config.useHash) {
    // Parse hash
    const hash = window.location.hash.slice(1); // Rimuovi #
    const params = new URLSearchParams(hash);
    stepValue = params.get(config.paramName);
  } else {
    // Parse query params
    const url = new URL(window.location.href);
    stepValue = url.searchParams.get(config.paramName);
  }
  
  if (stepValue === null) return 0;
  
  const stepIndex = parseInt(stepValue, 10) - 1; // Converti da 1-based a 0-based
  return isNaN(stepIndex) || stepIndex < 0 ? 0 : stepIndex;
}

/**
 * Pulisce i parametri URL relativi al form
 */
export function clearURLParams(
  paramsToClear: string[] = ['step'],
  options: { useHash?: boolean } = {}
): void {
  if (typeof window === 'undefined') return;
  
  if (options.useHash) {
    window.history.replaceState({}, '', window.location.pathname);
  } else {
    const url = new URL(window.location.href);
    paramsToClear.forEach((param) => url.searchParams.delete(param));
    window.history.replaceState({}, '', url.toString());
  }
}

/**
 * Serializza le risposte per l'URL (condivisione parziale)
 * Nota: salva solo i dati non sensibili
 */
export function serializeAnswersToURL(
  answers: FormAnswers,
  allowedFields: string[] = ['customerType', 'country']
): string {
  if (typeof window === 'undefined') return '';
  
  const filteredAnswers: FormAnswers = {};
  allowedFields.forEach((field) => {
    if (answers[field] !== undefined) {
      filteredAnswers[field] = answers[field];
    }
  });
  
  if (Object.keys(filteredAnswers).length === 0) return '';
  
  try {
    const encoded = btoa(JSON.stringify(filteredAnswers));
    return encodeURIComponent(encoded);
  } catch {
    return '';
  }
}

/**
 * Parse delle risposte dall'URL
 */
export function parseAnswersFromURL(
  paramName: string = 'data'
): FormAnswers | null {
  if (typeof window === 'undefined') return null;
  
  const url = new URL(window.location.href);
  const encoded = url.searchParams.get(paramName);
  
  if (!encoded) return null;
  
  try {
    const decoded = decodeURIComponent(encoded);
    const json = atob(decoded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Hook per gestire popstate events (back/forward browser)
 */
export function createPopStateHandler(
  callback: (stepIndex: number) => void,
  options: Partial<URLSyncOptions> = {}
): () => void {
  const handler = () => {
    const stepIndex = getStepFromURL(options);
    callback(stepIndex);
  };
  
  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', handler);
  }
  
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('popstate', handler);
    }
  };
}

/**
 * Verifica se l'URL contiene parametri del form
 */
export function hasFormParams(
  paramNames: string[] = ['step'],
  options: { useHash?: boolean } = {}
): boolean {
  if (typeof window === 'undefined') return false;
  
  if (options.useHash) {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    return paramNames.some((name) => params.has(name));
  } else {
    const url = new URL(window.location.href);
    return paramNames.some((name) => url.searchParams.has(name));
  }
}

/**
 * Costruisce un URL condivisibile che include lo step e i dati
 */
export function buildShareableURL(
  baseUrl: string,
  stepIndex: number,
  answers: FormAnswers,
  options: {
    includeAnswers?: boolean;
    allowedFields?: string[];
    paramName?: string;
  } = {}
): string {
  const { includeAnswers = false, allowedFields = ['customerType'], paramName = 'step' } = options;
  
  const url = new URL(baseUrl);
  
  // Aggiungi step
  url.searchParams.set(paramName, String(stepIndex + 1));
  
  // Aggiungi dati se richiesto
  if (includeAnswers) {
    const data = serializeAnswersToURL(answers, allowedFields);
    if (data) {
      url.searchParams.set('data', data);
    }
  }
  
  return url.toString();
}
