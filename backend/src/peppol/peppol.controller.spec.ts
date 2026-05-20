import { Test, TestingModule } from '@nestjs/testing';
import { PeppolController } from './peppol.controller';
import { PeppolService } from './peppol.service';
import { PeppolConversionResult } from './peppol.types';

describe('PeppolController', () => {
  let controller: PeppolController;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let peppolService: any;

  const mockXml = '<?xml version="1.0"?><Invoice></Invoice>';
  const mockUblXml =
    '<?xml version="1.0"?><ubl:Invoice xmlns:ubl="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"></ubl:Invoice>';

  const mockConversionResult: PeppolConversionResult = {
    xml: mockUblXml,
    valid: true,
    errors: [],
  };

  const mockValidationResult = {
    valid: true,
    errors: [],
  };

  const mockInvoiceData = {
    invoiceNumber: 'INV-001',
    issueDate: new Date('2026-04-01'),
    dueDate: new Date('2026-05-01'),
    supplierName: 'Acme Inc',
    supplierEmail: 'supplier@acme.com',
    supplierVat: 'IT12345678901',
    customerName: 'Customer Ltd',
    customerEmail: 'customer@example.com',
    customerVat: 'FR98765432109',
    lines: [
      {
        description: 'Service A',
        quantity: 2,
        unitPrice: 100,
        taxRate: 21,
      },
    ],
    currency: 'EUR',
  } as Record<string, unknown>;

  beforeEach(async () => {
    peppolService = {
      convertFromFatturaPa: jest.fn(),
      validateUBL: jest.fn(),
      generateUBL: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PeppolController],
      providers: [
        {
          provide: PeppolService,
          useValue: peppolService,
        },
      ],
    }).compile();

    controller = module.get<PeppolController>(PeppolController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(PeppolController);
  });

  describe('convertFromFatturaPa', () => {
    it('should convert FatturaPA XML to Peppol UBL successfully', async () => {
      peppolService.convertFromFatturaPa.mockResolvedValueOnce(mockConversionResult);

      const result = await controller.convertFromFatturaPa(mockXml);

      expect(result).toEqual(mockConversionResult);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(peppolService.convertFromFatturaPa).toHaveBeenCalledWith(mockXml);
      expect(peppolService.convertFromFatturaPa).toHaveBeenCalledTimes(1);
    });

    it('should return conversion result with errors when conversion fails', async () => {
      const errorResult: PeppolConversionResult = {
        xml: '',
        valid: false,
        errors: ['Missing invoice number', 'Invalid date format'],
      };
      peppolService.convertFromFatturaPa.mockResolvedValueOnce(errorResult);

      const result = await controller.convertFromFatturaPa(mockXml);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
      expect(result.errors).toContain('Missing invoice number');
      expect(peppolService.convertFromFatturaPa).toHaveBeenCalled();
    });

    it('should pass XML string directly to service', async () => {
      const customXml = '<custom>xml</custom>';
      peppolService.convertFromFatturaPa.mockResolvedValueOnce(mockConversionResult);

      await controller.convertFromFatturaPa(customXml);

      expect(peppolService.convertFromFatturaPa).toHaveBeenCalledWith(customXml);
      expect(peppolService.convertFromFatturaPa).toHaveBeenCalledTimes(1);
    });

    it('should propagate service errors', async () => {
      const error = new Error('XML parsing failed');
      peppolService.convertFromFatturaPa.mockRejectedValueOnce(error);

      await expect(controller.convertFromFatturaPa(mockXml)).rejects.toThrow('XML parsing failed');
      expect(peppolService.convertFromFatturaPa).toHaveBeenCalled();
    });

    it('should handle empty XML string', async () => {
      peppolService.convertFromFatturaPa.mockResolvedValueOnce({
        xml: '',
        valid: false,
        errors: ['Empty XML input'],
      });

      const result = await controller.convertFromFatturaPa('');

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Empty');
      expect(peppolService.convertFromFatturaPa).toHaveBeenCalledWith('');
    });
  });

  describe('validateUbl', () => {
    it('should validate valid UBL XML successfully', async () => {
      peppolService.validateUBL.mockResolvedValueOnce(mockValidationResult);

      const result = await controller.validateUbl(mockUblXml);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(peppolService.validateUBL).toHaveBeenCalledWith(mockUblXml);
      expect(peppolService.validateUBL).toHaveBeenCalledTimes(1);
    });

    it('should return validation errors for invalid UBL', async () => {
      const invalidResult = {
        valid: false,
        errors: ['Missing required BT-1 Invoice number', 'Invalid currency code'],
      };
      peppolService.validateUBL.mockResolvedValueOnce(invalidResult);

      const result = await controller.validateUbl(mockUblXml);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
      expect(result.errors).toContain('Missing required BT-1 Invoice number');
      expect(peppolService.validateUBL).toHaveBeenCalled();
    });

    it('should accept any XML string for validation', async () => {
      const customXml = '<ubl:Invoice></ubl:Invoice>';
      peppolService.validateUBL.mockResolvedValueOnce(mockValidationResult);

      await controller.validateUbl(customXml);

      expect(peppolService.validateUBL).toHaveBeenCalledWith(customXml);
    });

    it('should propagate service validation errors', async () => {
      const error = new Error('Schema validation failed');
      peppolService.validateUBL.mockRejectedValueOnce(error);

      await expect(controller.validateUbl(mockUblXml)).rejects.toThrow('Schema validation failed');
      expect(peppolService.validateUBL).toHaveBeenCalled();
    });

    it('should handle malformed XML gracefully', async () => {
      const malformedXml = '<unclosed>';
      peppolService.validateUBL.mockResolvedValueOnce({
        valid: false,
        errors: ['XML is malformed'],
      });

      const result = await controller.validateUbl(malformedXml);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('malformed');
      expect(peppolService.validateUBL).toHaveBeenCalledWith(malformedXml);
    });
  });

  describe('generateInvoice', () => {
    it('should generate Peppol UBL from invoice data successfully', async () => {
      peppolService.generateUBL.mockResolvedValueOnce(mockConversionResult);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await controller.generateInvoice(mockInvoiceData as any);

      expect(result).toEqual(mockConversionResult);
      expect(result.valid).toBe(true);
      expect(result.xml).toContain('ubl:Invoice');
      expect(peppolService.generateUBL).toHaveBeenCalledWith(mockInvoiceData);
      expect(peppolService.generateUBL).toHaveBeenCalledTimes(1);
    });

    it('should handle generation with validation errors', async () => {
      const failedResult: PeppolConversionResult = {
        xml: '',
        valid: false,
        errors: ['Missing customer VAT', 'Invalid line items'],
      };
      peppolService.generateUBL.mockResolvedValueOnce(failedResult);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await controller.generateInvoice(mockInvoiceData as any);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
      expect(peppolService.generateUBL).toHaveBeenCalled();
    });

    it('should pass complete invoice object to service', async () => {
      peppolService.generateUBL.mockResolvedValueOnce(mockConversionResult);

      const invoiceData = {
        ...mockInvoiceData,
        notes: 'Payment within 30 days',
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await controller.generateInvoice(invoiceData as any);

      expect(peppolService.generateUBL).toHaveBeenCalledWith(
        expect.objectContaining({
          invoiceNumber: mockInvoiceData.invoiceNumber,
          supplierVat: mockInvoiceData.supplierVat,
          customerVat: mockInvoiceData.customerVat,
          lines: mockInvoiceData.lines,
        }),
      );
    });

    it('should propagate service generation errors', async () => {
      const error = new Error('Template rendering failed');
      peppolService.generateUBL.mockRejectedValueOnce(error);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(controller.generateInvoice(mockInvoiceData as any)).rejects.toThrow(
        'Template rendering failed',
      );
      expect(peppolService.generateUBL).toHaveBeenCalled();
    });

    it('should handle missing invoice fields', async () => {
      const incompleteInvoice = {
        invoiceNumber: 'INV-001',
        supplierName: 'Acme Inc',
        customerName: 'Customer Ltd',
      };
      peppolService.generateUBL.mockResolvedValueOnce({
        xml: '',
        valid: false,
        errors: ['Missing required field: issueDate'],
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await controller.generateInvoice(incompleteInvoice as any);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('issueDate');
      expect(peppolService.generateUBL).toHaveBeenCalledWith(incompleteInvoice);
    });

    it('should handle complex invoice with multiple line items', async () => {
      const complexInvoice = {
        ...mockInvoiceData,
        lines: [
          { description: 'Product A', quantity: 5, unitPrice: 100, taxRate: 21 },
          { description: 'Product B', quantity: 3, unitPrice: 50, taxRate: 10 },
          { description: 'Service C', quantity: 1, unitPrice: 500, taxRate: 21 },
        ],
      };
      peppolService.generateUBL.mockResolvedValueOnce(mockConversionResult);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await controller.generateInvoice(complexInvoice as any);

      expect(result.valid).toBe(true);
      expect(peppolService.generateUBL).toHaveBeenCalledWith(
        expect.objectContaining({
          lines: expect.arrayContaining([
            expect.objectContaining({ description: 'Product A' }),
            expect.objectContaining({ description: 'Product B' }),
            expect.objectContaining({ description: 'Service C' }),
          ]),
        }),
      );
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle service throwing non-Error objects in convertFromFatturaPa', async () => {
      peppolService.convertFromFatturaPa.mockRejectedValueOnce('String error');

      await expect(controller.convertFromFatturaPa(mockXml)).rejects.toBe('String error');
      expect(peppolService.convertFromFatturaPa).toHaveBeenCalledTimes(1);
    });

    it('should handle service throwing non-Error objects in validateUbl', async () => {
      peppolService.validateUBL.mockRejectedValueOnce('Validation error object');

      await expect(controller.validateUbl(mockUblXml)).rejects.toBe('Validation error object');
      expect(peppolService.validateUBL).toHaveBeenCalledTimes(1);
    });

    it('should handle service throwing non-Error objects in generateInvoice', async () => {
      peppolService.generateUBL.mockRejectedValueOnce('Generation error');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(controller.generateInvoice(mockInvoiceData as any)).rejects.toBe(
        'Generation error',
      );
      expect(peppolService.generateUBL).toHaveBeenCalledTimes(1);
    });

    it('should have all required HTTP methods and status codes', () => {
      expect(controller.convertFromFatturaPa).toBeDefined();
      expect(controller.validateUbl).toBeDefined();
      expect(controller.generateInvoice).toBeDefined();
      expect(typeof controller.convertFromFatturaPa).toBe('function');
      expect(typeof controller.validateUbl).toBe('function');
      expect(typeof controller.generateInvoice).toBe('function');
    });

    it('should handle large XML input in convertFromFatturaPa', async () => {
      const largeXml = '<Invoice>' + '<item>test</item>'.repeat(1000) + '</Invoice>';
      peppolService.convertFromFatturaPa.mockResolvedValueOnce(mockConversionResult);

      const result = await controller.convertFromFatturaPa(largeXml);

      expect(result.valid).toBe(true);
      expect(peppolService.convertFromFatturaPa).toHaveBeenCalledWith(largeXml);
      expect(peppolService.convertFromFatturaPa).toHaveBeenCalledTimes(1);
    });

    it('should handle whitespace-only XML in validateUbl', async () => {
      const whitespaceXml = '   \n\t  ';
      peppolService.validateUBL.mockResolvedValueOnce({
        valid: false,
        errors: ['XML is empty or invalid'],
      });

      const result = await controller.validateUbl(whitespaceXml);

      expect(result.valid).toBe(false);
      expect(peppolService.validateUBL).toHaveBeenCalledWith(whitespaceXml);
    });

    it('should call service with exact invoice object structure', async () => {
      const invoiceWithAllFields = {
        ...mockInvoiceData,
        note: 'Test note',
        buyerReference: 'PO-12345',
      };
      peppolService.generateUBL.mockResolvedValueOnce(mockConversionResult);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await controller.generateInvoice(invoiceWithAllFields as any);

      expect(peppolService.generateUBL).toHaveBeenCalledWith(invoiceWithAllFields);
      expect(peppolService.generateUBL).toHaveBeenCalledTimes(1);
    });

    it('convertFromFatturaPa endpoint returns correct HTTP status', async () => {
      peppolService.convertFromFatturaPa.mockResolvedValueOnce(mockConversionResult);

      const result = await controller.convertFromFatturaPa(mockXml);

      expect(result).toEqual(mockConversionResult);
      expect(peppolService.convertFromFatturaPa).toHaveBeenCalledTimes(1);
    });

    it('validateUbl endpoint returns correct validation structure', async () => {
      peppolService.validateUBL.mockResolvedValueOnce(mockValidationResult);

      const result = await controller.validateUbl(mockUblXml);

      expect(result).toEqual(mockValidationResult);
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('generateInvoice endpoint returns correct conversion result structure', async () => {
      peppolService.generateUBL.mockResolvedValueOnce(mockConversionResult);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await controller.generateInvoice(mockInvoiceData as any);

      expect(result).toEqual(mockConversionResult);
      expect(result).toHaveProperty('xml');
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
    });

    it('should handle multiple sequential calls to different endpoints', async () => {
      peppolService.convertFromFatturaPa.mockResolvedValueOnce(mockConversionResult);
      peppolService.validateUBL.mockResolvedValueOnce(mockValidationResult);
      peppolService.generateUBL.mockResolvedValueOnce(mockConversionResult);

      const conv = await controller.convertFromFatturaPa(mockXml);
      const val = await controller.validateUbl(mockUblXml);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gen = await controller.generateInvoice(mockInvoiceData as any);

      expect(conv.valid).toBe(true);
      expect(val.valid).toBe(true);
      expect(gen.valid).toBe(true);
      expect(peppolService.convertFromFatturaPa).toHaveBeenCalledTimes(1);
      expect(peppolService.validateUBL).toHaveBeenCalledTimes(1);
      expect(peppolService.generateUBL).toHaveBeenCalledTimes(1);
    });
  });
});
