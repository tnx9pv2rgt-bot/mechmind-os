/**
 * Zod validation schemas — Italian business fields
 * MechMind OS
 */

import { z } from 'zod';

/**
 * Codice Fiscale — 16 character Italian fiscal code
 * Format: 6 letters + 2 digits + 1 letter + 2 digits + 1 letter + 3 digits + 1 letter
 */
export const codiceFiscaleSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/,
    'Codice fiscale non valido. Deve essere di 16 caratteri alfanumerici.'
  );

/**
 * Partita IVA — 11 digits
 */
export const partitaIvaSchema = z
  .string()
  .trim()
  .regex(
    /^\d{11}$/,
    'Partita IVA non valida. Deve essere composta da 11 cifre.'
  );

/**
 * Targa — Italian license plate
 * New format: AA000AA | Old format: AA000000 (province + numbers)
 */
export const targaSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^([A-Z]{2}\d{3}[A-Z]{2}|[A-Z]{2}\d{5,6})$/,
    'Targa non valida. Formato accettato: AB123CD (nuovo) o AA000000 (vecchio).'
  );

/**
 * CAP — 5 digit Italian ZIP code
 */
export const capSchema = z
  .string()
  .trim()
  .regex(
    /^\d{5}$/,
    'CAP non valido. Deve essere composto da 5 cifre.'
  );

/**
 * Telefono — Italian phone number with +39 prefix
 */
export const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^(\+39\s?)?(3\d{2}[\s.]?\d{3}[\s.]?\d{4}|0\d{1,3}[\s.]?\d{4,8})$/,
    'Numero di telefono non valido. Usa il formato +39 3XX XXX XXXX.'
  );

/**
 * Email — standard email validation
 */
export const emailSchema = z
  .string()
  .trim()
  .email('Indirizzo email non valido.');

/**
 * Codice SDI — 7 character alphanumeric code for electronic invoicing
 */
export const sdiCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z0-9]{7}$/,
    'Codice SDI non valido. Deve essere composto da 7 caratteri alfanumerici.'
  );

/**
 * PEC Email — Italian certified email
 */
export const pecEmailSchema = z
  .string()
  .trim()
  .email('Indirizzo PEC non valido.')
  .regex(
    /\.(pec\.it|legalmail\.it|postecert\.it|sicurezzapostale\.it|cert\.it)$/i,
    'Indirizzo PEC non valido. Deve terminare con un dominio PEC certificato (es. @pec.it).'
  );

/**
 * IBAN — Italian IBAN format
 * IT + 2 check digits + 1 CIN letter + 5 ABI digits + 5 CAB digits + 12 account digits
 */
export const ibanSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^IT\d{2}[A-Z]\d{22}$/,
    "IBAN non valido. Il formato italiano è: IT00A0000000000000000000000 (27 caratteri)."
  );
