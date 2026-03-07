import { faker } from '@faker-js/faker/locale/it';

/**
 * Test Data Factory for E2E Tests
 * Generates realistic Italian test data
 */

// Types
export interface UserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'admin' | 'mechanic' | 'customer' | 'user';
}

export interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  taxCode: string; // Codice Fiscale
  vatNumber?: string; // Partita IVA
}

export interface VehicleData {
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vin: string;
  fuelType: 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'lpg';
  mileage: number;
}

export interface ServiceData {
  name: string;
  description: string;
  duration: number; // minutes
  price: number;
  category: string;
}

export interface BookingData {
  date: Date;
  time: string;
  service: string;
  notes?: string;
}

export interface InvoiceData {
  items: Array<{
    description: string;
    quantity: number;
    price: number;
  }>;
  taxRate: number;
}

// Vehicle makes and models common in Italy
const VEHICLE_MAKES = [
  'Fiat', 'Ford', 'Volkswagen', 'Toyota', 'Renault',
  'Peugeot', 'Citroën', 'Opel', 'BMW', 'Mercedes-Benz',
  'Audi', 'Lancia', 'Alfa Romeo', 'Jeep', 'Dacia',
  'Hyundai', 'Kia', 'Nissan', 'Seat', 'Skoda'
];

const MODELS_BY_MAKE: Record<string, string[]> = {
  'Fiat': ['Panda', '500', 'Tipo', 'Punto', '500X', '500L', 'Panda Cross', 'Doblò', 'Qubo'],
  'Ford': ['Fiesta', 'Focus', 'Puma', 'Kuga', 'EcoSport', 'Mondeo', 'S-Max'],
  'Volkswagen': ['Golf', 'Polo', 'Tiguan', 'T-Roc', 'Passat', 'T-Cross', 'Taigo'],
  'Toyota': ['Yaris', 'Corolla', 'RAV4', 'Aygo', 'C-HR', 'Prius', 'Yaris Cross'],
  'Renault': ['Clio', 'Captur', 'Megane', 'Arkana', 'Austral', 'Scenic', 'Zoe'],
  'Peugeot': ['208', '2008', '308', '3008', '5008', '408', 'Rifter'],
  'Citroën': ['C3', 'C3 Aircross', 'C4', 'C4 Cactus', 'C5 Aircross', 'Berlingo'],
  'Opel': ['Corsa', 'Astra', 'Mokka', 'Crossland', 'Grandland', 'Zafira'],
  'BMW': ['Serie 1', 'Serie 2', 'Serie 3', 'X1', 'X2', 'X3', 'X5'],
  'Mercedes-Benz': ['Classe A', 'Classe B', 'Classe C', 'GLA', 'GLB', 'GLC'],
  'Audi': ['A1', 'A3', 'Q2', 'Q3', 'Q5', 'A4', 'TT'],
  'Lancia': ['Ypsilon'],
  'Alfa Romeo': ['Giulietta', 'Tonale', 'Stelvio', 'Giulia'],
  'Jeep': ['Renegade', 'Compass', 'Wrangler', 'Avenger'],
  'Dacia': ['Sandero', 'Duster', 'Spring', 'Jogger', 'Logan'],
  'Hyundai': ['i10', 'i20', 'i30', 'Tucson', 'Kona', 'Bayon', 'Santa Fe'],
  'Kia': ['Picanto', 'Rio', 'Stonic', 'Sportage', 'Niro', 'Sorento'],
  'Nissan': ['Micra', 'Juke', 'Qashqai', 'Ariya', 'X-Trail'],
  'Seat': ['Ibiza', 'Arona', 'Leon', 'Ateca', 'Tarraco'],
  'Skoda': ['Fabia', 'Scala', 'Octavia', 'Kamiq', 'Karoq', 'Kodiaq'],
};

const SERVICE_CATEGORIES = [
  'Manutenzione',
  'Riparazione',
  'Gommista',
  'Elettrauto',
  'Carrozzeria',
  'Diagnostica',
  'Revisione',
  'Climatizzazione',
];

const SERVICES = [
  { name: 'Tagliando completo', duration: 120, price: 250 },
  { name: 'Cambio olio', duration: 30, price: 80 },
  { name: 'Cambio freni', duration: 90, price: 180 },
  { name: 'Cambio gomme', duration: 45, price: 60 },
  { name: 'Convergenza', duration: 60, price: 50 },
  { name: 'Diagnostica elettronica', duration: 45, price: 70 },
  { name: 'Revisione annuale', duration: 30, price: 70 },
  { name: 'Ricarica clima', duration: 45, price: 90 },
  { name: 'Cambio filtri', duration: 30, price: 50 },
  { name: 'Riparazione carrozzeria', duration: 180, price: 400 },
  { name: 'Lucidatura fari', duration: 30, price: 40 },
  { name: 'Cambio batteria', duration: 20, price: 120 },
];

const ITALIAN_CITIES = [
  'Roma', 'Milano', 'Napoli', 'Torino', 'Palermo', 'Genova', 'Bologna',
  'Firenze', 'Bari', 'Catania', 'Verona', 'Venezia', 'Messina', 'Padova',
  'Trieste', 'Brescia', 'Parma', 'Taranto', 'Prato', 'Modena'
];

/**
 * Generate a valid Italian license plate (format: AB123CD)
 */
function generateLicensePlate(): string {
  const letters = 'ABCDEFGHJKLMNPRSTVWXYZ';
  const numbers = '0123456789';
  
  let plate = '';
  plate += letters[Math.floor(Math.random() * letters.length)];
  plate += letters[Math.floor(Math.random() * letters.length)];
  plate += numbers[Math.floor(Math.random() * 10)];
  plate += numbers[Math.floor(Math.random() * 10)];
  plate += numbers[Math.floor(Math.random() * 10)];
  plate += letters[Math.floor(Math.random() * letters.length)];
  plate += letters[Math.floor(Math.random() * letters.length)];
  
  return plate;
}

/**
 * Generate a valid Italian tax code (Codice Fiscale)
 */
function generateTaxCode(): string {
  const consonants = 'BCDFGHJKLMNPQRSTVWXYZ';
  const vowels = 'AEIOU';
  const numbers = '0123456789';
  
  let code = '';
  // 3 consonants for surname
  for (let i = 0; i < 3; i++) {
    code += consonants[Math.floor(Math.random() * consonants.length)];
  }
  // 3 consonants for name
  for (let i = 0; i < 3; i++) {
    code += consonants[Math.floor(Math.random() * consonants.length)];
  }
  // 2 digits for year
  code += numbers[Math.floor(Math.random() * 10)];
  code += numbers[Math.floor(Math.random() * 10)];
  // 1 letter for month
  code += consonants[Math.floor(Math.random() * consonants.length)];
  // 2 digits for day
  code += numbers[Math.floor(Math.random() * 10)];
  code += numbers[Math.floor(Math.random() * 10)];
  // 4 characters for place
  for (let i = 0; i < 4; i++) {
    code += Math.random() > 0.5 
      ? numbers[Math.floor(Math.random() * 10)]
      : letters[Math.floor(Math.random() * letters.length)];
  }
  // 1 control character
  code += letters[Math.floor(Math.random() * letters.length)];
  
  return code;
}

/**
 * Generate a valid Italian VAT number (Partita IVA)
 */
function generateVatNumber(): string {
  let vat = 'IT';
  for (let i = 0; i < 11; i++) {
    vat += Math.floor(Math.random() * 10);
  }
  return vat;
}

/**
 * Generate a valid VIN number
 */
function generateVIN(): string {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
  let vin = '';
  for (let i = 0; i < 17; i++) {
    vin += chars[Math.floor(Math.random() * chars.length)];
  }
  return vin;
}

/**
 * Test Data Factory
 */
export const TestDataFactory = {
  
  /**
   * Generate a test user
   */
  user(role: UserData['role'] = 'customer'): UserData {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    return {
      email: faker.internet.email({ firstName, lastName, provider: 'mechmind.test' }),
      password: `Test${faker.string.alphanumeric(8)}!`,
      firstName,
      lastName,
      phone: `3${faker.string.numeric(9)}`,
      role,
    };
  },

  /**
   * Generate a customer with Italian data
   */
  customer(): CustomerData {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const city = faker.helpers.arrayElement(ITALIAN_CITIES);
    
    return {
      firstName,
      lastName,
      email: faker.internet.email({ firstName, lastName }),
      phone: `+39 3${faker.string.numeric(2)} ${faker.string.numeric(3)} ${faker.string.numeric(4)}`,
      address: faker.location.streetAddress(),
      city,
      postalCode: faker.string.numeric(5),
      taxCode: generateTaxCode(),
      vatNumber: Math.random() > 0.7 ? generateVatNumber() : undefined,
    };
  },

  /**
   * Generate a vehicle
   */
  vehicle(): VehicleData {
    const make = faker.helpers.arrayElement(VEHICLE_MAKES);
    const models = MODELS_BY_MAKE[make] || ['Modello Sconosciuto'];
    const year = faker.number.int({ min: 2010, max: 2024 });
    
    return {
      make,
      model: faker.helpers.arrayElement(models),
      year,
      licensePlate: generateLicensePlate(),
      vin: generateVIN(),
      fuelType: faker.helpers.arrayElement(['petrol', 'diesel', 'electric', 'hybrid', 'lpg']),
      mileage: faker.number.int({ min: 1000, max: 300000 }),
    };
  },

  /**
   * Generate a service
   */
  service(): ServiceData {
    const baseService = faker.helpers.arrayElement(SERVICES);
    return {
      ...baseService,
      description: faker.lorem.sentence(),
      category: faker.helpers.arrayElement(SERVICE_CATEGORIES),
    };
  },

  /**
   * Generate booking data
   */
  booking(options?: { minDate?: Date; maxDate?: Date }): BookingData {
    const minDate = options?.minDate || new Date();
    const maxDate = options?.maxDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    const hours = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', 
                   '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', 
                   '16:00', '16:30', '17:00', '17:30'];
    
    return {
      date: faker.date.between({ from: minDate, to: maxDate }),
      time: faker.helpers.arrayElement(hours),
      service: faker.helpers.arrayElement(SERVICES).name,
      notes: Math.random() > 0.5 ? faker.lorem.sentence() : undefined,
    };
  },

  /**
   * Generate invoice data
   */
  invoice(itemCount: number = 3): InvoiceData {
    const items = [];
    
    for (let i = 0; i < itemCount; i++) {
      items.push({
        description: faker.commerce.productName(),
        quantity: faker.number.int({ min: 1, max: 5 }),
        price: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }),
      });
    }

    return {
      items,
      taxRate: faker.helpers.arrayElement([4, 10, 22]),
    };
  },

  /**
   * Predefined test users for consistent testing
   */
  predefinedUsers: {
    admin: {
      email: 'admin@mechmind.local',
      password: 'AdminPassword123!',
      firstName: 'Admin',
      lastName: 'Test',
      phone: '+39 333 1234567',
      role: 'admin' as const,
    },
    mechanic: {
      email: 'mechanic@mechmind.local',
      password: 'MechanicPassword123!',
      firstName: 'Mario',
      lastName: 'Rossi',
      phone: '+39 333 2345678',
      role: 'mechanic' as const,
    },
    customer: {
      email: 'test@mechmind.local',
      password: 'TestPassword123!',
      firstName: 'Giuseppe',
      lastName: 'Verdi',
      phone: '+39 333 3456789',
      role: 'customer' as const,
    },
    mfaUser: {
      email: 'mfa@mechmind.local',
      password: 'MFAPassword123!',
      firstName: 'MFA',
      lastName: 'Test',
      phone: '+39 333 4567890',
      role: 'customer' as const,
    },
  },

  /**
   * Predefined test customer
   */
  predefinedCustomer: {
    firstName: 'Mario',
    lastName: 'Rossi',
    email: 'mario.rossi@example.com',
    phone: '+39 333 9876543',
    address: 'Via Roma 123',
    city: 'Milano',
    postalCode: '20121',
    taxCode: 'RSSMRA85M01H501Z',
  },

  /**
   * Predefined test vehicle
   */
  predefinedVehicle: {
    make: 'Fiat',
    model: 'Panda',
    year: 2020,
    licensePlate: 'AB123CD',
    vin: 'ZFA3120000J123456',
    fuelType: 'petrol' as const,
    mileage: 45000,
  },
};

// Re-export faker for advanced use cases
export { faker };
