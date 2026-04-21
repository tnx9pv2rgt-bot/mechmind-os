import { Injectable, BadRequestException } from '@nestjs/common';
import { LoggerService } from '../common/services/logger.service';
import { PeppolInvoice, PeppolConversionResult, PeppolLineItem, PeppolParty } from './peppol.types';

@Injectable()
export class PeppolService {
  constructor(private readonly logger: LoggerService) {}

  /**
   * Genera XML UBL 2.1 Peppol BIS 3.0 da un invoice Peppol
   */
  generateUBL(invoice: PeppolInvoice): PeppolConversionResult {
    const errors: string[] = [];

    // Validazione base campi obbligatori EN 16931
    if (!invoice.invoiceNumber) errors.push('invoiceNumber required');
    if (!invoice.issueDate) errors.push('issueDate required');
    if (!invoice.dueDate) errors.push('dueDate required');
    if (!invoice.currency) errors.push('currency required');
    if (!invoice.seller?.name) errors.push('seller.name required');
    if (!invoice.seller?.vatNumber) errors.push('seller.vatNumber required');
    if (!invoice.buyer?.name) errors.push('buyer.name required');
    if (!invoice.lines?.length) errors.push('At least one line item required');

    if (errors.length > 0) {
      return { xml: '', valid: false, errors };
    }

    try {
      const xml = this.buildUBLXml(invoice);
      return { xml, valid: true, errors: [] };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`UBL generation failed: ${errMsg}`);
      return {
        xml: '',
        valid: false,
        errors: [errMsg],
      };
    }
  }

  /**
   * Validazione base: verifica presenza tag obbligatori EN 16931
   */
  validateUBL(xml: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!xml || xml.trim().length === 0) {
      errors.push('XML is empty');
      return { valid: false, errors };
    }

    // Check required elements per EN 16931 — support both prefixed (cbc:, cac:) and unprefixed tags
    const requiredElements = [
      { name: 'Invoice', prefixes: [''] },
      { name: 'ID', prefixes: ['cbc:'] },
      { name: 'IssueDate', prefixes: ['cbc:'] },
      { name: 'InvoiceTypeCode', prefixes: ['cbc:'] },
      { name: 'DocumentCurrencyCode', prefixes: ['cbc:'] },
      { name: 'AccountingSupplierParty', prefixes: ['cac:'] },
      { name: 'AccountingCustomerParty', prefixes: ['cac:'] },
      { name: 'InvoiceLine', prefixes: ['cac:'] },
      { name: 'LegalMonetaryTotal', prefixes: ['cac:'] },
      { name: 'TaxTotal', prefixes: ['cac:'] },
    ];

    for (const element of requiredElements) {
      let found = false;
      for (const prefix of element.prefixes) {
        const tagPattern = `<${prefix}${element.name}`;
        if (xml.includes(tagPattern)) {
          found = true;
          break;
        }
      }
      if (!found) {
        errors.push(`Missing required element: ${element.name}`);
      }
    }

    // Check UBL namespace
    if (!xml.includes('urn:oasis:names:specification:ubl:schema:xsd:Invoice-2')) {
      errors.push('Missing required UBL namespace');
    }

    // Check Peppol customization
    if (!xml.includes('urn:fdc:peppol.eu:2017:poacc:billing:3.0')) {
      errors.push('Missing Peppol BIS 3.0 customization ID');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Converte XML FatturaPA in UBL Peppol BIS 3.0
   */
  convertFromFatturaPa(fatturaXml: string): PeppolConversionResult {
    const errors: string[] = [];

    try {
      // Parsing FatturaPA header
      const invoiceNumber = this.extractXmlValue(fatturaXml, 'Numero');
      const issueDate = this.extractXmlValue(fatturaXml, 'Data');

      if (!invoiceNumber || !issueDate) {
        errors.push('Missing invoice number or issue date in FatturaPA');
        return { xml: '', valid: false, errors };
      }

      // Parsing seller (CedentePrestatore) — extract from first occurrence
      const sellerBlock = this.extractXmlBlock(fatturaXml, 'CedentePrestatore');
      const seller: PeppolParty = {
        name: this.extractXmlValue(sellerBlock, 'Denominazione') || '',
        vatNumber: this.extractXmlValue(sellerBlock, 'IdCodice') || '',
        address: this.extractXmlValue(sellerBlock, 'Indirizzo') || '',
        city: this.extractXmlValue(sellerBlock, 'Comune') || '',
        country: this.extractXmlValue(sellerBlock, 'Nazione') || 'IT',
        postalCode: this.extractXmlValue(sellerBlock, 'CAP') || '',
      };

      // Parsing buyer (CessionarioCommittente) — extract from second party block
      const buyerBlock = this.extractXmlBlock(fatturaXml, 'CessionarioCommittente');
      const buyer: PeppolParty = {
        name: this.extractXmlValue(buyerBlock, 'Denominazione') || '',
        vatNumber: this.extractXmlValue(buyerBlock, 'IdCodice') || '',
        address: this.extractXmlValue(buyerBlock, 'Indirizzo') || '',
        city: this.extractXmlValue(buyerBlock, 'Comune') || '',
        country: this.extractXmlValue(buyerBlock, 'Nazione') || 'IT',
        postalCode: this.extractXmlValue(buyerBlock, 'CAP') || '',
      };

      // Parsing line items
      const lines = this.extractLineItems(fatturaXml);
      if (lines.length === 0) {
        errors.push('No line items found in FatturaPA');
        return { xml: '', valid: false, errors };
      }

      // Calculate totals
      const taxableAmount = lines.reduce((sum, line) => sum + line.lineTotal, 0);
      const vatAmount = lines.reduce((sum, line) => sum + (line.lineTotal * line.vatRate) / 100, 0);
      const totalAmount = taxableAmount + vatAmount;

      // Build Peppol invoice
      const peppolInvoice: PeppolInvoice = {
        invoiceNumber,
        issueDate,
        dueDate: this.extractXmlValue(fatturaXml, 'DataScadenzaPagamento') || issueDate,
        currency: 'EUR',
        seller,
        buyer,
        lines,
        taxableAmount: Math.round(taxableAmount * 100) / 100,
        vatAmount: Math.round(vatAmount * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
      };

      // Generate UBL from converted invoice
      return this.generateUBL(peppolInvoice);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`FatturaPA conversion failed: ${errMsg}`);
      return {
        xml: '',
        valid: false,
        errors: [errMsg],
      };
    }
  }

  /**
   * Genera Peppol ID dal VAT number italiano
   * Formato: "0211:" + vatNumber (Italian VAT scheme in Peppol network)
   */
  generatePeppolId(vatNumber: string): string {
    if (!vatNumber) {
      throw new BadRequestException('VAT number is required');
    }
    return `0211:${vatNumber}`;
  }

  // ==================== PRIVATE HELPERS ====================

  private buildUBLXml(invoice: PeppolInvoice): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:cec="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${this.escapeXml(invoice.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${invoice.issueDate}</cbc:IssueDate>
  <cbc:DueDate>${invoice.dueDate}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${invoice.currency}</cbc:DocumentCurrencyCode>
  ${invoice.note ? `<cbc:Note>${this.escapeXml(invoice.note)}</cbc:Note>` : ''}
  ${
    invoice.buyerReference
      ? `<cbc:BuyerReference>${this.escapeXml(invoice.buyerReference)}</cbc:BuyerReference>`
      : ''
  }

  <!-- Seller -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:EndpointID schemeID="0210">${this.escapeXml(this.generatePeppolId(invoice.seller.vatNumber))}</cbc:EndpointID>
      <cac:PostalAddress>
        <cbc:StreetName>${this.escapeXml(invoice.seller.address)}</cbc:StreetName>
        <cbc:CityName>${this.escapeXml(invoice.seller.city)}</cbc:CityName>
        <cbc:PostalZone>${this.escapeXml(invoice.seller.postalCode)}</cbc:PostalZone>
        <cbc:CountrySubentity>IT</cbc:CountrySubentity>
        <cac:Country>
          <cbc:IdentificationCode>${invoice.seller.country}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${this.escapeXml(invoice.seller.vatNumber)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${this.escapeXml(invoice.seller.name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:ID>${this.escapeXml(this.generatePeppolId(invoice.seller.vatNumber))}</cbc:ID>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Buyer -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      ${invoice.buyer.vatNumber ? `<cbc:EndpointID schemeID="0210">${this.escapeXml(this.generatePeppolId(invoice.buyer.vatNumber))}</cbc:EndpointID>` : ''}
      <cac:PostalAddress>
        <cbc:StreetName>${this.escapeXml(invoice.buyer.address)}</cbc:StreetName>
        <cbc:CityName>${this.escapeXml(invoice.buyer.city)}</cbc:CityName>
        <cbc:PostalZone>${this.escapeXml(invoice.buyer.postalCode)}</cbc:PostalZone>
        <cbc:CountrySubentity>IT</cbc:CountrySubentity>
        <cac:Country>
          <cbc:IdentificationCode>${invoice.buyer.country}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      ${
        invoice.buyer.vatNumber
          ? `
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${this.escapeXml(invoice.buyer.vatNumber)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      `
          : ''
      }
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${this.escapeXml(invoice.buyer.name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- Line Items -->
${invoice.lines.map((line, index) => this.buildInvoiceLine(line, index + 1)).join('\n')}

  <!-- Tax Total -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${invoice.currency}">${this.formatDecimal(invoice.vatAmount)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${invoice.currency}">${this.formatDecimal(invoice.taxableAmount)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${invoice.currency}">${this.formatDecimal(invoice.vatAmount)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${invoice.lines[0]?.vatRate || 22}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <!-- Legal Monetary Total -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${invoice.currency}">${this.formatDecimal(invoice.taxableAmount)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${invoice.currency}">${this.formatDecimal(invoice.taxableAmount)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${invoice.currency}">${this.formatDecimal(invoice.totalAmount)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${invoice.currency}">${this.formatDecimal(invoice.totalAmount)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;
  }

  private buildInvoiceLine(line: PeppolLineItem, lineNumber: number): string {
    const lineExtensionAmount = line.lineTotal;
    const taxAmount = (lineExtensionAmount * line.vatRate) / 100;

    return `  <cac:InvoiceLine>
    <cbc:ID>${lineNumber}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">${this.formatDecimal(line.quantity)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="EUR">${this.formatDecimal(lineExtensionAmount)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${this.escapeXml(line.description)}</cbc:Description>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="EUR">${this.formatDecimal(line.unitPrice)}</cbc:PriceAmount>
      <cbc:BaseQuantity unitCode="C62">${this.formatDecimal(line.quantity)}</cbc:BaseQuantity>
    </cac:Price>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="EUR">${this.formatDecimal(taxAmount)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="EUR">${this.formatDecimal(lineExtensionAmount)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="EUR">${this.formatDecimal(taxAmount)}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:ID>${line.vatRate === 0 ? 'Z' : 'S'}</cbc:ID>
          <cbc:Percent>${line.vatRate}</cbc:Percent>
          <cac:TaxScheme>
            <cbc:ID>VAT</cbc:ID>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
  </cac:InvoiceLine>`;
  }

  private extractXmlBlock(xml: string, blockName: string): string {
    const pattern = new RegExp(`<${blockName}[^>]*>([\\s\\S]*?)<\\/${blockName}>`, 'i');
    const match = xml.match(pattern);
    return match ? match[1] : '';
  }

  private extractXmlValue(xml: string, tagName: string, context?: string): string {
    let pattern: RegExp;
    if (context) {
      // Look for tag within context (case-insensitive, non-greedy)
      pattern = new RegExp(
        `<${context}[^>]*>([\\s\\S]*?)<${tagName}[^>]*>([^<]+)<\/${tagName}>`,
        'i',
      );
    } else {
      // Direct tag search (case-insensitive)
      pattern = new RegExp(`<${tagName}[^>]*>([^<]+)<\/${tagName}>`, 'i');
    }
    const match = xml.match(pattern);
    return match ? (match[2] || match[1]).trim() : '';
  }

  private extractLineItems(xml: string): PeppolLineItem[] {
    const lines: PeppolLineItem[] = [];
    // Match DettaglioLinee pattern in FatturaPA
    const linePattern = /<DettaglioLinee>([\s\S]*?)<\/DettaglioLinee>/g;
    let match;

    let lineId = 1;
    while ((match = linePattern.exec(xml)) !== null) {
      const lineXml = match[1];
      const numeroLinea = this.extractXmlValue(lineXml, 'NumeroLinea');
      const descrizione = this.extractXmlValue(lineXml, 'Descrizione');
      const quantita = parseFloat(this.extractXmlValue(lineXml, 'Quantita')) || 1;
      const prezzoUnitario = parseFloat(this.extractXmlValue(lineXml, 'PrezzoUnitario'));
      const aliquotaIVA = parseFloat(this.extractXmlValue(lineXml, 'AliquotaIVA'));

      if (descrizione && !isNaN(prezzoUnitario) && !isNaN(aliquotaIVA)) {
        lines.push({
          id: numeroLinea || lineId.toString(),
          description: descrizione,
          quantity: quantita,
          unitPrice: prezzoUnitario,
          vatRate: aliquotaIVA,
          lineTotal: quantita * prezzoUnitario,
        });
        lineId++;
      }
    }

    return lines;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private formatDecimal(value: number): string {
    return value.toFixed(2);
  }
}
