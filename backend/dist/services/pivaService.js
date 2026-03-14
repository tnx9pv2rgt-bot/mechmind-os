"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanPiva = cleanPiva;
exports.validatePivaFormat = validatePivaFormat;
exports.verifyPivaCheckDigit = verifyPivaCheckDigit;
exports.validatePiva = validatePiva;
exports.extractProvinceFromPiva = extractProvinceFromPiva;
exports.extractProvinceSiglaFromPiva = extractProvinceSiglaFromPiva;
exports.getPivaData = getPivaData;
exports.isPivaCached = isPivaCached;
exports.invalidatePivaCache = invalidatePivaCache;
exports.cleanupExpiredPivaCache = cleanupExpiredPivaCache;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function isPivaAnagraficaData(data) {
    return (typeof data === 'object' &&
        data !== null &&
        'isValid' in data &&
        typeof data.isValid === 'boolean' &&
        'ragioneSociale' in data &&
        typeof data.ragioneSociale === 'string' &&
        'indirizzo' in data &&
        typeof data.indirizzo === 'string' &&
        'cap' in data &&
        typeof data.cap === 'string' &&
        'città' in data &&
        typeof data.città === 'string' &&
        'provincia' in data &&
        typeof data.provincia === 'string');
}
const PROVINCE_CODES = {
    '01': 'Torino',
    '02': 'Varese',
    '03': 'Bergamo',
    '04': 'Milano',
    '05': 'Brescia',
    '06': 'Lecco',
    '07': 'Como',
    '08': 'Sondrio',
    '09': 'Monza e Brianza',
    '10': 'Novara',
    '11': 'Cuneo',
    '12': 'Asti',
    '13': 'Alessandria',
    '14': 'Biella',
    '15': 'Verbano-Cusio-Ossola',
    '16': 'Genova',
    '17': 'Savona',
    '18': 'Imperia',
    '19': 'La Spezia',
    '20': 'Milano (provincia storica)',
    '21': 'Pavia',
    '22': 'Lodi',
    '23': 'Cremona',
    '24': 'Mantova',
    '25': 'Brescia (provincia storica)',
    '26': 'Varese (provincia storica)',
    '27': 'Bergamo (provincia storica)',
    '28': 'Como (provincia storica)',
    '29': 'Piacenza',
    '30': 'Venezia',
    '31': 'Treviso',
    '32': 'Verona',
    '33': 'Vicenza',
    '34': 'Padova',
    '35': 'Rovigo',
    '36': 'Belluno',
    '37': 'Udine',
    '38': 'Gorizia',
    '39': 'Trieste',
    '40': 'Bologna',
    '41': 'Modena',
    '42': 'Parma',
    '43': 'Reggio Emilia',
    '44': 'Ferrara',
    '45': 'Ravenna',
    '46': 'Forlì-Cesena',
    '47': 'Rimini',
    '48': 'Pesaro e Urbino',
    '49': 'Ancona',
    '50': 'Firenze',
    '51': 'Pistoia',
    '52': 'Prato',
    '53': 'Lucca',
    '54': 'Massa-Carrara',
    '55': 'Livorno',
    '56': 'Pisa',
    '57': 'Arezzo',
    '58': 'Siena',
    '59': 'Grosseto',
    '60': 'Perugia',
    '61': 'Terni',
    '62': 'Viterbo',
    '63': 'Rieti',
    '64': 'Roma',
    '65': 'Latina',
    '66': 'Frosinone',
    '67': "L'Aquila",
    '68': 'Teramo',
    '69': 'Pescara',
    '70': 'Chieti',
    '71': 'Campobasso',
    '72': 'Isernia',
    '73': 'Caserta',
    '74': 'Benevento',
    '75': 'Napoli',
    '76': 'Avellino',
    '77': 'Salerno',
    '78': 'Foggia',
    '79': 'Bari',
    '80': 'Taranto',
    '81': 'Brindisi',
    '82': 'Lecce',
    '83': 'Bari (provincia storica)',
    '84': 'Potenza',
    '85': 'Matera',
    '86': 'Cosenza',
    '87': 'Catanzaro',
    '88': 'Reggio Calabria',
    '89': 'Crotone',
    '90': 'Palermo',
    '91': 'Agrigento',
    '92': 'Caltanissetta',
    '93': 'Enna',
    '94': 'Catania',
    '95': 'Messina',
    '96': 'Ragusa',
    '97': 'Siracusa',
    '98': 'Sassari',
    '99': 'Nuoro',
};
const PROVINCE_SIGLE = {
    '01': 'TO',
    '02': 'VA',
    '03': 'BG',
    '04': 'MI',
    '05': 'BS',
    '06': 'LC',
    '07': 'CO',
    '08': 'SO',
    '09': 'MB',
    '10': 'NO',
    '11': 'CN',
    '12': 'AT',
    '13': 'AL',
    '14': 'BI',
    '15': 'VB',
    '16': 'GE',
    '17': 'SV',
    '18': 'IM',
    '19': 'SP',
    '20': 'MI',
    '21': 'PV',
    '22': 'LO',
    '23': 'CR',
    '24': 'MN',
    '25': 'BS',
    '26': 'VA',
    '27': 'BG',
    '28': 'CO',
    '29': 'PC',
    '30': 'VE',
    '31': 'TV',
    '32': 'VR',
    '33': 'VI',
    '34': 'PD',
    '35': 'RO',
    '36': 'BL',
    '37': 'UD',
    '38': 'GO',
    '39': 'TS',
    '40': 'BO',
    '41': 'MO',
    '42': 'PR',
    '43': 'RE',
    '44': 'FE',
    '45': 'RA',
    '46': 'FC',
    '47': 'RN',
    '48': 'PU',
    '49': 'AN',
    '50': 'FI',
    '51': 'PT',
    '52': 'PO',
    '53': 'LU',
    '54': 'MS',
    '55': 'LI',
    '56': 'PI',
    '57': 'AR',
    '58': 'SI',
    '59': 'GR',
    '60': 'PG',
    '61': 'TR',
    '62': 'VT',
    '63': 'RI',
    '64': 'RM',
    '65': 'LT',
    '66': 'FR',
    '67': 'AQ',
    '68': 'TE',
    '69': 'PE',
    '70': 'CH',
    '71': 'CB',
    '72': 'IS',
    '73': 'CE',
    '74': 'BN',
    '75': 'NA',
    '76': 'AV',
    '77': 'SA',
    '78': 'FG',
    '79': 'BA',
    '80': 'TA',
    '81': 'BR',
    '82': 'LE',
    '83': 'BA',
    '84': 'PZ',
    '85': 'MT',
    '86': 'CS',
    '87': 'CZ',
    '88': 'RC',
    '89': 'KR',
    '90': 'PA',
    '91': 'AG',
    '92': 'CL',
    '93': 'EN',
    '94': 'CT',
    '95': 'ME',
    '96': 'RG',
    '97': 'SR',
    '98': 'SS',
    '99': 'NU',
};
const MOCK_COMPANIES = {
    '12345678901': {
        ragioneSociale: 'ACME Srl',
        indirizzo: 'Via Roma 123',
        cap: '00100',
        città: 'Roma',
        provincia: 'RM',
    },
    '98765432109': {
        ragioneSociale: 'Tech Solutions SpA',
        indirizzo: 'Corso Italia 456',
        cap: '20100',
        città: 'Milano',
        provincia: 'MI',
    },
    '11111111111': {
        ragioneSociale: 'Officina Rossi & Figli',
        indirizzo: "Via dell'Artigianato 7",
        cap: '50100',
        città: 'Firenze',
        provincia: 'FI',
    },
    '22222222222': {
        ragioneSociale: 'AutoService Napoli',
        indirizzo: 'Via dei Mille 42',
        cap: '80100',
        città: 'Napoli',
        provincia: 'NA',
    },
    '33333333333': {
        ragioneSociale: 'Meccanica Torino',
        indirizzo: 'Corso Torino 88',
        cap: '10100',
        città: 'Torino',
        provincia: 'TO',
    },
};
function cleanPiva(piva) {
    return piva.replace(/\s/g, '').replace(/\D/g, '');
}
function validatePivaFormat(piva) {
    const errors = [];
    const cleaned = cleanPiva(piva);
    if (cleaned.length !== 11) {
        errors.push(`La Partita IVA deve essere composta da 11 cifre (trovate: ${cleaned.length})`);
    }
    if (!/^\d{11}$/.test(cleaned)) {
        errors.push('La Partita IVA deve contenere solo cifre numeriche');
    }
    if (/^(\d)\1{10}$/.test(cleaned)) {
        errors.push('La Partita IVA non può essere composta da cifre tutte uguali');
    }
    return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
    };
}
function calculateLuhnCheckDigit(piva) {
    const digits = piva.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 10; i++) {
        let digit = digits[i];
        if (i % 2 === 0) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }
        sum += digit;
    }
    return (10 - (sum % 10)) % 10;
}
function verifyPivaCheckDigit(piva) {
    const cleaned = cleanPiva(piva);
    if (cleaned.length !== 11) {
        return false;
    }
    const firstTen = cleaned.substring(0, 10);
    const checkDigit = parseInt(cleaned.charAt(10), 10);
    const calculatedCheckDigit = calculateLuhnCheckDigit(firstTen);
    return checkDigit === calculatedCheckDigit;
}
function validatePiva(piva) {
    const formatValidation = validatePivaFormat(piva);
    if (!formatValidation.isValid) {
        return formatValidation;
    }
    const cleaned = cleanPiva(piva);
    const errors = [];
    if (!verifyPivaCheckDigit(cleaned)) {
        errors.push('Codice di controllo non valido');
    }
    const provinceCode = cleaned.substring(0, 2);
    if (!PROVINCE_CODES[provinceCode]) {
        errors.push(`Codice ufficio provinciale non valido: ${provinceCode}`);
    }
    return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
    };
}
function extractProvinceFromPiva(piva) {
    const cleaned = cleanPiva(piva);
    if (cleaned.length !== 11)
        return null;
    const provinceCode = cleaned.substring(0, 2);
    return PROVINCE_CODES[provinceCode] || null;
}
function extractProvinceSiglaFromPiva(piva) {
    const cleaned = cleanPiva(piva);
    if (cleaned.length !== 11)
        return null;
    const provinceCode = cleaned.substring(0, 2);
    return PROVINCE_SIGLE[provinceCode] || null;
}
async function getCachedPivaData(piva) {
    try {
        const cleaned = cleanPiva(piva);
        const cached = await prisma.pivaCache.findUnique({
            where: { piva: cleaned },
        });
        if (!cached)
            return null;
        if (new Date() > cached.expiresAt) {
            await prisma.pivaCache.delete({
                where: { piva: cleaned },
            });
            return null;
        }
        if (!isPivaAnagraficaData(cached.data)) {
            await prisma.pivaCache.delete({ where: { piva: cleaned } });
            return null;
        }
        return {
            piva: cached.piva,
            data: cached.data,
            cachedAt: cached.cachedAt,
            expiresAt: cached.expiresAt,
        };
    }
    catch (error) {
        console.error('Errore recupero cache P.IVA:', error);
        return null;
    }
}
async function cachePivaData(piva, data) {
    try {
        const cleaned = cleanPiva(piva);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        await prisma.pivaCache.upsert({
            where: { piva: cleaned },
            update: {
                data: data,
                cachedAt: now,
                expiresAt,
            },
            create: {
                piva: cleaned,
                data: data,
                cachedAt: now,
                expiresAt,
            },
        });
    }
    catch (error) {
        console.error('Errore salvataggio cache P.IVA:', error);
    }
}
async function fetchPivaDataFromAPI(piva) {
    const cleaned = cleanPiva(piva);
    const validation = validatePiva(piva);
    if (!validation.isValid) {
        return {
            isValid: false,
            ragioneSociale: '',
            indirizzo: '',
            cap: '',
            città: '',
            provincia: '',
        };
    }
    try {
        const viesUrl = process.env.VIES_API_URL ||
            'https://ec.europa.eu/taxation_customs/vies/rest-api/ms/IT/vat/' + cleaned;
        const response = await fetch(viesUrl, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
            const data = await response.json();
            if (data.isValid || data.valid) {
                const provinceSigla = extractProvinceSiglaFromPiva(piva) || '';
                return {
                    isValid: true,
                    ragioneSociale: data.name || data.traderName || '',
                    indirizzo: data.address || data.traderAddress || '',
                    cap: '',
                    città: '',
                    provincia: provinceSigla,
                };
            }
        }
    }
    catch {
    }
    if (process.env.NODE_ENV !== 'production') {
        const mockData = MOCK_COMPANIES[cleaned];
        if (mockData) {
            return {
                isValid: true,
                ragioneSociale: mockData.ragioneSociale || 'Dato non disponibile',
                indirizzo: mockData.indirizzo || 'Dato non disponibile',
                cap: mockData.cap || 'Dato non disponibile',
                città: mockData.città || 'Dato non disponibile',
                provincia: mockData.provincia || extractProvinceSiglaFromPiva(piva) || 'Dato non disponibile',
            };
        }
    }
    return {
        isValid: true,
        ragioneSociale: '',
        indirizzo: '',
        cap: '',
        città: extractProvinceFromPiva(piva) || '',
        provincia: extractProvinceSiglaFromPiva(piva) || '',
    };
}
async function getPivaData(piva, skipCache = false) {
    const cleaned = cleanPiva(piva);
    const validation = validatePiva(piva);
    if (!validation.isValid) {
        return {
            isValid: false,
            ragioneSociale: '',
            indirizzo: '',
            cap: '',
            città: '',
            provincia: '',
        };
    }
    if (!skipCache) {
        const cached = await getCachedPivaData(cleaned);
        if (cached) {
            return cached.data;
        }
    }
    const data = await fetchPivaDataFromAPI(cleaned);
    if (data.isValid) {
        await cachePivaData(cleaned, data);
    }
    return data;
}
async function isPivaCached(piva) {
    const cached = await getCachedPivaData(piva);
    return cached !== null;
}
async function invalidatePivaCache(piva) {
    try {
        const cleaned = cleanPiva(piva);
        await prisma.pivaCache.deleteMany({
            where: { piva: cleaned },
        });
    }
    catch (error) {
        console.error('Errore invalidazione cache P.IVA:', error);
    }
}
async function cleanupExpiredPivaCache() {
    try {
        const result = await prisma.pivaCache.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });
        return result.count;
    }
    catch (error) {
        console.error('Errore pulizia cache P.IVA:', error);
        return 0;
    }
}
exports.default = {
    cleanPiva,
    validatePivaFormat,
    verifyPivaCheckDigit,
    validatePiva,
    extractProvinceFromPiva,
    extractProvinceSiglaFromPiva,
    getPivaData,
    isPivaCached,
    invalidatePivaCache,
    cleanupExpiredPivaCache,
};
