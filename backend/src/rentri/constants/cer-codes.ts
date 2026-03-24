export interface CerCode {
  code: string;
  description: string;
  hazardClass: 'PERICOLOSO' | 'NON_PERICOLOSO';
  defaultPhysicalState: string;
  commonName: string;
  category: string;
}

export const AUTO_REPAIR_CER_CODES: CerCode[] = [
  { code: '130205*', description: 'Oli minerali per motori, ingranaggi e lubrificazione, non clorurati', hazardClass: 'PERICOLOSO', defaultPhysicalState: 'LIQUIDO', commonName: 'Olio motore esausto', category: 'Oli' },
  { code: '130208*', description: 'Altri oli per motori, ingranaggi e lubrificazione', hazardClass: 'PERICOLOSO', defaultPhysicalState: 'LIQUIDO', commonName: 'Olio cambio/differenziale', category: 'Oli' },
  { code: '130502*', description: 'Fanghi di separatori olio/acqua', hazardClass: 'PERICOLOSO', defaultPhysicalState: 'FANGOSO', commonName: 'Fanghi separatore olio', category: 'Oli' },
  { code: '150110*', description: 'Imballaggi contenenti residui di sostanze pericolose', hazardClass: 'PERICOLOSO', defaultPhysicalState: 'SOLIDO', commonName: 'Contenitori contaminati', category: 'Imballaggi' },
  { code: '150202*', description: 'Assorbenti, materiali filtranti contaminati da sostanze pericolose', hazardClass: 'PERICOLOSO', defaultPhysicalState: 'SOLIDO', commonName: 'Filtri olio', category: 'Filtri' },
  { code: '150203', description: 'Assorbenti, materiali filtranti non contaminati', hazardClass: 'NON_PERICOLOSO', defaultPhysicalState: 'SOLIDO', commonName: 'Filtri aria/abitacolo', category: 'Filtri' },
  { code: '160103', description: 'Pneumatici fuori uso', hazardClass: 'NON_PERICOLOSO', defaultPhysicalState: 'SOLIDO', commonName: 'Pneumatici usati', category: 'Pneumatici' },
  { code: '160107*', description: 'Filtri dell\'olio', hazardClass: 'PERICOLOSO', defaultPhysicalState: 'SOLIDO', commonName: 'Filtri olio motore', category: 'Filtri' },
  { code: '160113*', description: 'Liquidi per freni', hazardClass: 'PERICOLOSO', defaultPhysicalState: 'LIQUIDO', commonName: 'Liquido freni esausto', category: 'Liquidi' },
  { code: '160114*', description: 'Liquidi antigelo contenenti sostanze pericolose', hazardClass: 'PERICOLOSO', defaultPhysicalState: 'LIQUIDO', commonName: 'Antigelo esausto', category: 'Liquidi' },
  { code: '160115', description: 'Liquidi antigelo diversi da quelli di cui alla voce 160114', hazardClass: 'NON_PERICOLOSO', defaultPhysicalState: 'LIQUIDO', commonName: 'Antigelo (non pericoloso)', category: 'Liquidi' },
  { code: '160117', description: 'Metalli ferrosi', hazardClass: 'NON_PERICOLOSO', defaultPhysicalState: 'SOLIDO', commonName: 'Dischi freno, marmitte, parti metalliche', category: 'Metalli' },
  { code: '160118', description: 'Metalli non ferrosi', hazardClass: 'NON_PERICOLOSO', defaultPhysicalState: 'SOLIDO', commonName: 'Cerchi in lega, radiatori alluminio', category: 'Metalli' },
  { code: '160119', description: 'Plastica', hazardClass: 'NON_PERICOLOSO', defaultPhysicalState: 'SOLIDO', commonName: 'Paraurti, parti in plastica', category: 'Carrozzeria' },
  { code: '160120', description: 'Vetro', hazardClass: 'NON_PERICOLOSO', defaultPhysicalState: 'SOLIDO', commonName: 'Parabrezza, vetri', category: 'Carrozzeria' },
  { code: '160601*', description: 'Batterie al piombo', hazardClass: 'PERICOLOSO', defaultPhysicalState: 'SOLIDO', commonName: 'Batterie auto', category: 'Batterie' },
  { code: '160604', description: 'Batterie alcaline', hazardClass: 'NON_PERICOLOSO', defaultPhysicalState: 'SOLIDO', commonName: 'Batterie alcaline', category: 'Batterie' },
  { code: '130110*', description: 'Oli minerali per circuiti idraulici, non clorurati', hazardClass: 'PERICOLOSO', defaultPhysicalState: 'LIQUIDO', commonName: 'Olio idraulico esausto', category: 'Oli' },
];
