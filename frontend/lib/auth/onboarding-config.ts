type ShopType =
  | 'meccanica'
  | 'carrozzeria'
  | 'elettrauto'
  | 'gommista'
  | 'multimarca'
  | 'concessionaria';
type TeamSize = 'solo' | '2-5' | '6+';
type MigrationSource = 'zero' | 'excel' | 'altro-gestionale';
type Priority = 'appuntamenti' | 'fatturare' | 'lavorazioni' | 'comunicare';
type SectorAnswers = Record<string, string>;

interface OnboardingAnswers {
  shopName?: string;
  shopCity?: string;
  shopType: ShopType | null;
  teamSize: TeamSize | null;
  migration?: MigrationSource | null;
  priorities: Priority[];
  sectorAnswers?: SectorAnswers;
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
  deposit: boolean;
  fleet: boolean;
  insurance: boolean;
}

interface TenantDefaults {
  laborRate: number;
  workingHours: { start: string; end: string };
  workingDays: string[];
  vatRate: number;
  currency: string;
  language: string;
  terminology: Record<string, string>;
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

const SECTOR_TERMINOLOGY: Record<ShopType, Record<string, string>> = {
  meccanica: {
    workOrder: 'Commessa',
    estimate: 'Preventivo',
    inspection: 'Ispezione',
  },
  carrozzeria: {
    workOrder: 'Perizia',
    estimate: 'Preventivo sinistro',
    inspection: 'Perizia danni',
    phase: 'Fase di lavorazione',
  },
  elettrauto: {
    workOrder: 'Intervento elettrico',
    estimate: 'Preventivo impianto',
    inspection: 'Diagnosi',
    fault: 'Anomalia diagnostica',
  },
  gommista: {
    workOrder: 'Intervento gomme',
    estimate: 'Preventivo pneumatici',
    warehouse: 'Deposito stagionale',
    swap: 'Inversione stagionale',
  },
  multimarca: {
    workOrder: 'Job Card',
    estimate: 'Preventivo',
    part: 'Ricambio OEM',
    rate: 'Labour Rate',
  },
  concessionaria: {
    workOrder: 'Service Plan',
    estimate: 'Offerta commerciale',
    vehicle: 'Unità (VIN)',
    customer: 'Account cliente',
  },
};

function buildModules(
  shopType: ShopType,
  teamSize: TeamSize,
  sectorAnswers: SectorAnswers
): TenantModules {
  const sa = sectorAnswers;
  return {
    bookings: true,
    invoices: true,
    sdi: true,
    inspections: shopType !== 'gommista',
    obd:
      shopType === 'meccanica' ||
      shopType === 'multimarca' ||
      sa['hasOBD'] === 'si' ||
      sa['hasOEMSoftware'] === 'si',
    bodywork: shopType === 'carrozzeria',
    marketing: teamSize !== 'solo',
    warranty:
      shopType === 'meccanica' ||
      shopType === 'multimarca' ||
      shopType === 'concessionaria' ||
      sa['hasWarranty'] === 'si',
    deposit: shopType === 'gommista' && sa['hasDeposit'] === 'si',
    fleet: shopType === 'concessionaria' && sa['hasFleet'] === 'si',
    insurance: shopType === 'carrozzeria' && sa['hasInsurance'] === 'si',
  };
}

const SECTOR_CHECKLIST: Record<ShopType, string[]> = {
  meccanica: [
    'Crea il primo ordine di lavoro',
    'Configura il tariffario orario',
    'Importa clienti esistenti',
  ],
  carrozzeria: [
    'Crea il primo preventivo perizia',
    'Configura le convenzioni assicurative',
    'Imposta le fasi di lavorazione (smontaggio → verniciatura → montaggio)',
  ],
  elettrauto: [
    'Crea il primo intervento elettrico',
    'Configura il catalogo batterie',
    'Aggiungi il primo veicolo ibrido/EV',
  ],
  gommista: [
    'Configura il deposito pneumatici',
    'Imposta le scadenze di inversione stagionale',
    'Aggiungi il primo cliente stagionale',
  ],
  multimarca: [
    'Configura le marche prevalenti',
    'Imposta il listino per marche',
    'Importa il catalogo ricambi',
  ],
  concessionaria: [
    'Aggiungi il primo veicolo in stock',
    'Configura i service plan',
    'Imposta la gestione flotte aziendali',
  ],
};

function buildChecklist(
  shopType: ShopType,
  modules: TenantModules,
  sectorAnswers: SectorAnswers
): string[] {
  const items: string[] = [...SECTOR_CHECKLIST[shopType]];

  if (modules.sdi) items.push('Configura il collegamento SDI per fatturazione elettronica');
  if (modules.obd && !items.some(i => i.includes('OBD')))
    items.push('Collega il primo dispositivo OBD');
  if (modules.insurance) items.push('Configura il modulo sinistri assicurativi');
  if (modules.deposit) items.push('Imposta le tariffe di deposito pneumatici');
  if (modules.fleet) items.push('Configura i contratti flotte aziendali');
  if (modules.warranty && !items.some(i => i.includes('garanzia')))
    items.push('Registra la prima garanzia');
  if (modules.marketing) items.push('Crea la prima campagna di comunicazione clienti');

  if (sectorAnswers['hasEstimator'] === 'si')
    items.push('Configura integrazione con estimatore esterno');
  if (sectorAnswers['hasAlignment'] === 'si')
    items.push('Aggiungi convergenza e assetto al listino servizi');
  if (sectorAnswers['hasEV'] === 'si') items.push('Configura il profilo veicoli EV/ibridi');

  return items;
}

export function generateTenantConfig(answers: OnboardingAnswers): TenantConfig {
  const shopType = answers.shopType ?? 'meccanica';
  const teamSize = answers.teamSize ?? 'solo';
  const migration = answers.migration ?? 'zero';
  const sectorAnswers = answers.sectorAnswers ?? {};

  const modules = buildModules(shopType, teamSize, sectorAnswers);

  const dashboardPriority = answers.priorities.map(p => PRIORITY_LABELS[p]);

  const defaults: TenantDefaults = {
    laborRate: LABOR_RATES[shopType],
    workingHours: { start: '08:30', end: '18:00' },
    workingDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
    vatRate: 22,
    currency: 'EUR',
    language: 'it',
    terminology: SECTOR_TERMINOLOGY[shopType],
  };

  const showImport = migration !== 'zero';
  const importType = showImport ? migration : null;

  const checklist = buildChecklist(shopType, modules, sectorAnswers);

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
  SectorAnswers,
};
