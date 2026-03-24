type ShopType = 'meccanica' | 'carrozzeria' | 'elettrauto' | 'gommista' | 'multimarca' | 'concessionaria';
type TeamSize = 'solo' | '2-5' | '6+';
type MigrationSource = 'zero' | 'excel' | 'altro-gestionale';
type Priority = 'appuntamenti' | 'fatturare' | 'lavorazioni' | 'comunicare';

interface OnboardingAnswers {
  shopType: ShopType | null;
  teamSize: TeamSize | null;
  migration: MigrationSource | null;
  priorities: Priority[];
}

interface TenantModules {
  bookings: boolean;
  invoices: boolean;
  sdi: boolean;
  inspections: boolean;
  obd: boolean;
  bodywork: boolean;
  marketing: boolean;
  warranty: boolean;
}

interface TenantDefaults {
  laborRate: number;
  workingHours: { start: string; end: string };
  workingDays: string[];
  vatRate: number;
  currency: string;
  language: string;
}

interface TenantConfig {
  modules: TenantModules;
  dashboardPriority: string[];
  defaults: TenantDefaults;
  showImport: boolean;
  importType: string | null;
  checklist: string[];
}

const LABOR_RATES: Record<ShopType, number> = {
  meccanica: 45,
  carrozzeria: 50,
  elettrauto: 55,
  gommista: 35,
  multimarca: 48,
  concessionaria: 60,
};

const PRIORITY_LABELS: Record<Priority, string> = {
  appuntamenti: 'Gestione appuntamenti',
  fatturare: 'Fatturazione e pagamenti',
  lavorazioni: 'Ordini di lavoro',
  comunicare: 'Comunicazione clienti',
};

function buildModules(shopType: ShopType, teamSize: TeamSize): TenantModules {
  return {
    bookings: true,
    invoices: true,
    sdi: true,
    inspections: shopType !== 'gommista',
    obd: shopType === 'meccanica' || shopType === 'multimarca',
    bodywork: shopType === 'carrozzeria',
    marketing: teamSize !== 'solo',
    warranty:
      shopType === 'meccanica' ||
      shopType === 'multimarca' ||
      shopType === 'concessionaria',
  };
}

function buildChecklist(modules: TenantModules): string[] {
  const items: string[] = [
    'Aggiungi il primo cliente',
    'Crea il primo ordine di lavoro',
  ];

  if (modules.bookings) {
    items.push('Configura gli orari di apertura');
  }

  if (modules.invoices) {
    items.push('Inserisci i dati di fatturazione');
  }

  if (modules.sdi) {
    items.push('Configura il collegamento SDI');
  }

  if (modules.inspections) {
    items.push('Esegui la prima ispezione veicolo');
  }

  if (modules.obd) {
    items.push('Collega il primo dispositivo OBD');
  }

  if (modules.bodywork) {
    items.push('Configura le lavorazioni di carrozzeria');
  }

  if (modules.marketing) {
    items.push('Crea la prima campagna marketing');
  }

  if (modules.warranty) {
    items.push('Registra la prima garanzia');
  }

  return items;
}

export function generateTenantConfig(answers: OnboardingAnswers): TenantConfig {
  const shopType = answers.shopType ?? 'meccanica';
  const teamSize = answers.teamSize ?? 'solo';
  const migration = answers.migration ?? 'zero';

  const modules = buildModules(shopType, teamSize);

  const dashboardPriority = answers.priorities.map(
    (p) => PRIORITY_LABELS[p],
  );

  const defaults: TenantDefaults = {
    laborRate: LABOR_RATES[shopType],
    workingHours: { start: '08:30', end: '18:00' },
    workingDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    vatRate: 22,
    currency: 'EUR',
    language: 'it',
  };

  const showImport = migration !== 'zero';
  const importType = showImport ? migration : null;

  const checklist = buildChecklist(modules);

  return {
    modules,
    dashboardPriority,
    defaults,
    showImport,
    importType,
    checklist,
  };
}

export type {
  OnboardingAnswers,
  TenantModules,
  TenantDefaults,
  TenantConfig,
  ShopType,
  TeamSize,
  MigrationSource,
  Priority,
};
