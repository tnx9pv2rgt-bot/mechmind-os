export interface PeppolParty {
  name: string;
  vatNumber: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
}

export interface PeppolLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  lineTotal: number;
}

export interface PeppolInvoice {
  invoiceNumber: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string;
  currency: string; // EUR
  seller: PeppolParty;
  buyer: PeppolParty;
  lines: PeppolLineItem[];
  taxableAmount: number;
  vatAmount: number;
  totalAmount: number;
  note?: string;
  buyerReference?: string; // PO number
}

export interface PeppolConversionResult {
  xml: string;
  valid: boolean;
  errors: string[];
}
