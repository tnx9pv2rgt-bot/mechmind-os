/**
 * Customer Validation Schemas
 * Re-exports from customer form schema
 */
export { customerFormSchema as customerSchema } from '@/components/customers/customer-form-schema';
export type { CustomerFormData, CustomerFormData as CustomerFormValues } from '@/components/customers/customer-form-schema';

/** Format a phone number for display */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('39') && cleaned.length > 2) {
    const number = cleaned.slice(2);
    return `+39 ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`.trim();
  }
  if (cleaned.length >= 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`.trim();
  }
  return phone;
}

/** Normalize phone number to E.164-like format */
export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('39')) return `+${cleaned}`;
  if (cleaned.startsWith('3') && cleaned.length >= 9) return `+39${cleaned}`;
  return phone;
}
