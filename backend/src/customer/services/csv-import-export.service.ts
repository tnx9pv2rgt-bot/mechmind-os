import { Injectable } from '@nestjs/common';
import { createObjectCsvStringifier } from 'csv-writer';
import { PrismaService } from '../../common/services/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';

interface CustomerCsvRow {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  customerType: string;
  codiceFiscale: string;
  partitaIva: string;
  address: string;
  city: string;
  postalCode: string;
  province: string;
}

interface VehicleCsvRow {
  licensePlate: string;
  make: string;
  model: string;
  year: string;
  vin: string;
  fuelType: string;
  mileage: string;
  status: string;
}

interface ImportResult {
  imported: number;
  errors: Array<{ row: number; error: string }>;
}

@Injectable()
export class CsvImportExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async exportCustomers(tenantId: string): Promise<Buffer> {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'firstName', title: 'firstName' },
        { id: 'lastName', title: 'lastName' },
        { id: 'email', title: 'email' },
        { id: 'phone', title: 'phone' },
        { id: 'customerType', title: 'customerType' },
        { id: 'codiceFiscale', title: 'codiceFiscale' },
        { id: 'partitaIva', title: 'partitaIva' },
        { id: 'address', title: 'address' },
        { id: 'city', title: 'city' },
        { id: 'postalCode', title: 'postalCode' },
        { id: 'province', title: 'province' },
      ],
    });

    const records: CustomerCsvRow[] = customers.map(c => ({
      firstName: c.encryptedFirstName ? this.encryption.decrypt(c.encryptedFirstName) : '',
      lastName: c.encryptedLastName ? this.encryption.decrypt(c.encryptedLastName) : '',
      email: c.encryptedEmail ? this.encryption.decrypt(c.encryptedEmail) : '',
      phone: this.encryption.decrypt(c.encryptedPhone),
      customerType: c.customerType ?? '',
      codiceFiscale: c.codiceFiscale ?? '',
      partitaIva: c.partitaIva ?? '',
      address: c.address ?? '',
      city: c.city ?? '',
      postalCode: c.postalCode ?? '',
      province: c.province ?? '',
    }));

    const csvContent = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

    return Buffer.from(csvContent, 'utf-8');
  }

  async exportVehicles(tenantId: string): Promise<Buffer> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        customer: { tenantId },
      },
      orderBy: { createdAt: 'asc' },
    });

    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'licensePlate', title: 'licensePlate' },
        { id: 'make', title: 'make' },
        { id: 'model', title: 'model' },
        { id: 'year', title: 'year' },
        { id: 'vin', title: 'vin' },
        { id: 'fuelType', title: 'fuelType' },
        { id: 'mileage', title: 'mileage' },
        { id: 'status', title: 'status' },
      ],
    });

    const records: VehicleCsvRow[] = vehicles.map(v => ({
      licensePlate: v.licensePlate,
      make: v.make,
      model: v.model,
      year: v.year?.toString() ?? '',
      vin: v.vin ?? '',
      fuelType: v.fuelType ?? '',
      mileage: v.mileage?.toString() ?? '',
      status: v.status,
    }));

    const csvContent = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

    return Buffer.from(csvContent, 'utf-8');
  }

  async importCustomers(tenantId: string, csvContent: string): Promise<ImportResult> {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      return { imported: 0, errors: [] };
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const phoneIndex = headers.indexOf('phone');
    const firstNameIndex = headers.indexOf('firstName');
    const lastNameIndex = headers.indexOf('lastName');
    const emailIndex = headers.indexOf('email');
    const customerTypeIndex = headers.indexOf('customerType');
    const codiceFiscaleIndex = headers.indexOf('codiceFiscale');
    const partitaIvaIndex = headers.indexOf('partitaIva');
    const addressIndex = headers.indexOf('address');
    const cityIndex = headers.indexOf('city');
    const postalCodeIndex = headers.indexOf('postalCode');
    const provinceIndex = headers.indexOf('province');

    let imported = 0;
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 1; i < lines.length; i++) {
      const fields = lines[i].split(',').map(f => f.trim());

      try {
        const phone = phoneIndex >= 0 ? fields[phoneIndex] : undefined;
        if (!phone) {
          errors.push({ row: i + 1, error: 'Missing required field: phone' });
          continue;
        }

        const firstName = firstNameIndex >= 0 ? fields[firstNameIndex] : undefined;
        const lastName = lastNameIndex >= 0 ? fields[lastNameIndex] : undefined;
        const email = emailIndex >= 0 ? fields[emailIndex] : undefined;

        const encryptedPhone = this.encryption.encrypt(phone);
        const phoneHash = this.encryption.hash(phone);
        const encryptedFirstName = firstName ? this.encryption.encrypt(firstName) : null;
        const encryptedLastName = lastName ? this.encryption.encrypt(lastName) : null;
        const encryptedEmail = email ? this.encryption.encrypt(email) : null;

        await this.prisma.customer.create({
          data: {
            tenantId,
            encryptedPhone,
            phoneHash,
            encryptedFirstName,
            encryptedLastName,
            encryptedEmail,
            customerType: (customerTypeIndex >= 0 ? fields[customerTypeIndex] : 'PERSONA') as never,
            codiceFiscale: codiceFiscaleIndex >= 0 ? fields[codiceFiscaleIndex] || null : null,
            partitaIva: partitaIvaIndex >= 0 ? fields[partitaIvaIndex] || null : null,
            address: addressIndex >= 0 ? fields[addressIndex] || null : null,
            city: cityIndex >= 0 ? fields[cityIndex] || null : null,
            postalCode: postalCodeIndex >= 0 ? fields[postalCodeIndex] || null : null,
            province: provinceIndex >= 0 ? fields[provinceIndex] || null : null,
          },
        });

        imported++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push({ row: i + 1, error: message });
      }
    }

    return { imported, errors };
  }
}
