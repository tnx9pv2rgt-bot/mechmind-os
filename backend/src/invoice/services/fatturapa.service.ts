import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/services/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { S3Service } from '../../common/services/s3.service';
import { Decimal } from '@prisma/client/runtime/library';

interface FatturapaLineItem {
  numero: number;
  descrizione: string;
  quantita: number;
  prezzoUnitario: number;
  prezzoTotale: number;
  aliquotaIva: number;
  natura?: string;
}

interface FatturapaRiepilogoIva {
  aliquotaIva: number;
  imponibile: number;
  imposta: number;
  natura?: string;
}

interface FatturapaData {
  tenant: {
    ragioneSociale: string;
    partitaIva: string;
    codiceFiscale: string;
    regimeFiscale: string;
    indirizzo: string;
    cap: string;
    comune: string;
    provincia: string;
    nazione: string;
  };
  customer: {
    tipo: 'PERSONA' | 'AZIENDA';
    denominazione?: string;
    nome?: string;
    cognome?: string;
    partitaIva?: string;
    codiceFiscale?: string;
    sdiCode?: string;
    pecEmail?: string;
    indirizzo: string;
    cap: string;
    comune: string;
    provincia: string;
    nazione: string;
  };
  invoice: {
    tipoDocumento: string;
    numero: string;
    data: string;
    divisa: string;
    causale?: string;
    bollo?: boolean;
    ritenuta?: {
      tipoRitenuta: string;
      importoRitenuta: number;
      aliquotaRitenuta: number;
      causalePagamento: string;
    };
  };
  items: FatturapaLineItem[];
  riepilogoIva: FatturapaRiepilogoIva[];
  pagamento: {
    condizioniPagamento: string;
    modalitaPagamento: string;
    importoPagamento: number;
    dataScadenzaPagamento?: string;
  };
}

const TAX_REGIME_MAP: Record<string, string> = {
  ORDINARIO: 'RF01',
  SEMPLIFICATO: 'RF02',
  FORFETTARIO: 'RF19',
};

const PAYMENT_METHOD_MAP: Record<string, string> = {
  CONTANTI: 'MP01',
  ASSEGNO: 'MP02',
  BONIFICO: 'MP05',
  CARTA: 'MP08',
  BNPL: 'MP05',
};

const PAYMENT_TERMS_MAP: Record<string, string> = {
  IMMEDIATO: 'TP02',
  TRENTA_GIORNI: 'TP01',
  SESSANTA_GIORNI: 'TP01',
  FINE_MESE: 'TP01',
};

const DOC_TYPE_MAP: Record<string, string> = {
  FATTURA: 'TD01',
  NOTA_CREDITO: 'TD04',
  PROFORMA: 'TD01',
};

@Injectable()
export class FatturapaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly s3: S3Service,
  ) {}

  async generateXml(invoiceId: string, tenantId: string): Promise<string> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { invoiceItems: true, customer: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with id ${invoiceId} not found`);
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const tenantSettings = (tenant.settings ?? {}) as Record<string, string>;
    const tenantPiva = tenantSettings.partitaIva ?? '';

    if (!tenantPiva || tenantPiva.trim() === '') {
      throw new BadRequestException(
        'Impossibile generare FatturaPA: P.IVA tenant mancante. Configurare in Impostazioni.',
      );
    }

    const customer = invoice.customer;

    if (!customer.codiceFiscale && !customer.partitaIva) {
      throw new BadRequestException(
        'Customer must have at least codiceFiscale or partitaIva for FatturaPA',
      );
    }

    if (customer.codiceFiscale && !/^[A-Z0-9]{16}$/.test(customer.codiceFiscale.toUpperCase())) {
      throw new BadRequestException('Codice Fiscale non valido');
    }

    const customerName = customer.encryptedFirstName
      ? this.encryption.decrypt(customer.encryptedFirstName)
      : '';
    const customerSurname = customer.encryptedLastName
      ? this.encryption.decrypt(customer.encryptedLastName)
      : '';

    const items = this.buildLineItems(invoice.invoiceItems, invoice.items);
    const riepilogoIva = this.buildRiepilogoIva(items);

    const data: FatturapaData = {
      tenant: {
        ragioneSociale: tenantSettings.ragioneSociale ?? tenant.name,
        partitaIva: tenantSettings.partitaIva ?? '',
        codiceFiscale: tenantSettings.codiceFiscale ?? '',
        regimeFiscale: TAX_REGIME_MAP[invoice.taxRegime] ?? 'RF01',
        indirizzo: tenantSettings.indirizzo ?? '',
        cap: tenantSettings.cap ?? '00000',
        comune: tenantSettings.comune ?? '',
        provincia: tenantSettings.provincia ?? 'RM',
        nazione: tenantSettings.nazione ?? 'IT',
      },
      customer: {
        tipo: customer.customerType === 'AZIENDA' ? 'AZIENDA' : 'PERSONA',
        denominazione:
          customer.customerType === 'AZIENDA' ? customerName || customerSurname : undefined,
        nome: customer.customerType !== 'AZIENDA' ? customerName : undefined,
        cognome: customer.customerType !== 'AZIENDA' ? customerSurname : undefined,
        partitaIva: customer.partitaIva ?? undefined,
        codiceFiscale: customer.codiceFiscale ?? undefined,
        sdiCode: customer.sdiCode ?? '0000000',
        pecEmail: customer.pecEmail ?? undefined,
        indirizzo: customer.address ?? '',
        cap: customer.postalCode ?? '00000',
        comune: customer.city ?? '',
        provincia: customer.province ?? 'RM',
        nazione: customer.country ?? 'IT',
      },
      invoice: {
        tipoDocumento: DOC_TYPE_MAP[invoice.documentType] ?? 'TD01',
        numero: invoice.invoiceNumber,
        // Art. 226 #8: use operationDate if set, otherwise createdAt
        data: (invoice.operationDate ?? invoice.createdAt).toISOString().split('T')[0],
        divisa: 'EUR',
        causale: invoice.notes ?? undefined,
        bollo: invoice.stampDuty,
        ritenuta: invoice.ritenutaType
          ? {
              tipoRitenuta: invoice.ritenutaType,
              importoRitenuta: Number(invoice.ritenutaAmount ?? 0),
              aliquotaRitenuta: Number(invoice.ritenutaRate ?? 0),
              causalePagamento: invoice.ritenutaCausale ?? 'A',
            }
          : undefined,
      },
      items,
      riepilogoIva,
      pagamento: {
        condizioniPagamento: PAYMENT_TERMS_MAP[invoice.paymentTerms] ?? 'TP02',
        modalitaPagamento: PAYMENT_METHOD_MAP[invoice.paymentMethod ?? 'BONIFICO'] ?? 'MP05',
        importoPagamento: Number(invoice.total),
        dataScadenzaPagamento: invoice.dueDate
          ? invoice.dueDate.toISOString().split('T')[0]
          : undefined,
      },
    };

    const xml = this.buildXml(data);

    const key = `fatturapa/${tenantId}/${invoice.invoiceNumber}.xml`;
    const result = await this.s3.uploadBuffer(
      Buffer.from(xml, 'utf-8'),
      key,
      'application/xml',
      tenantId,
    );

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { xmlUrl: result.Location },
    });

    return xml;
  }

  private buildLineItems(
    invoiceItems: Array<{
      position: number;
      description: string;
      quantity: Decimal;
      unitPrice: Decimal;
      vatRate: Decimal;
      discount: Decimal;
      subtotal: Decimal;
      naturaIva?: string | null;
    }>,
    legacyItems: unknown,
  ): FatturapaLineItem[] {
    if (invoiceItems && invoiceItems.length > 0) {
      return invoiceItems.map((item, idx) => {
        const qty = Number(item.quantity);
        const price = Number(item.unitPrice);
        const discount = Number(item.discount);
        const discountMultiplier = 1 - discount / 100;
        const prezzoTotale = qty * price * discountMultiplier;
        const aliquotaIva = Number(item.vatRate);
        return {
          numero: item.position || idx + 1,
          descrizione: item.description,
          quantita: qty,
          prezzoUnitario: price,
          prezzoTotale,
          aliquotaIva,
          natura: aliquotaIva === 0 ? (item.naturaIva ?? 'N4') : undefined,
        };
      });
    }

    if (legacyItems && Array.isArray(legacyItems)) {
      return (legacyItems as Array<Record<string, unknown>>).map((item, idx) => {
        const qty = Number(item.quantity ?? 1);
        const price = Number(item.unitPrice ?? 0);
        const discount = Number(item.discount ?? 0);
        const discountMultiplier = 1 - discount / 100;
        return {
          numero: idx + 1,
          descrizione: String(item.description ?? ''),
          quantita: qty,
          prezzoUnitario: price,
          prezzoTotale: qty * price * discountMultiplier,
          aliquotaIva: Number(item.vatRate ?? 22),
        };
      });
    }

    return [];
  }

  private buildRiepilogoIva(items: FatturapaLineItem[]): FatturapaRiepilogoIva[] {
    // Group by rate+natura key to handle multiple Natura codes at 0%
    const byKey = new Map<
      string,
      { aliquotaIva: number; imponibile: number; imposta: number; natura?: string }
    >();

    for (const item of items) {
      const natura = item.aliquotaIva === 0 ? (item.natura ?? 'N4') : undefined;
      const key = natura ? `0_${natura}` : String(item.aliquotaIva);
      const existing = byKey.get(key) ?? {
        aliquotaIva: item.aliquotaIva,
        imponibile: 0,
        imposta: 0,
        natura,
      };
      existing.imponibile += item.prezzoTotale;
      existing.imposta += item.prezzoTotale * (item.aliquotaIva / 100);
      byKey.set(key, existing);
    }

    return Array.from(byKey.values()).map(({ aliquotaIva, imponibile, imposta, natura }) => ({
      aliquotaIva,
      imponibile,
      imposta,
      natura,
    }));
  }

  buildXml(data: FatturapaData): string {
    const codiceDestinatario = data.customer.sdiCode || '0000000';

    return `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2.2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" versione="FPR12" xsi:schemaLocation="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2.2 Schema_del_file_xml_FatturaPA_v1.2.2.xsd">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>${this.escapeXml(data.tenant.partitaIva)}</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>${this.escapeXml(data.invoice.numero)}</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>${this.escapeXml(codiceDestinatario)}</CodiceDestinatario>${
        data.customer.pecEmail
          ? `
      <PECDestinatario>${this.escapeXml(data.customer.pecEmail)}</PECDestinatario>`
          : ''
      }
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>${this.escapeXml(data.tenant.partitaIva)}</IdCodice>
        </IdFiscaleIVA>
        <CodiceFiscale>${this.escapeXml(data.tenant.codiceFiscale)}</CodiceFiscale>
        <Anagrafica>
          <Denominazione>${this.escapeXml(data.tenant.ragioneSociale)}</Denominazione>
        </Anagrafica>
        <RegimeFiscale>${this.escapeXml(data.tenant.regimeFiscale)}</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${this.escapeXml(data.tenant.indirizzo)}</Indirizzo>
        <CAP>${this.escapeXml(data.tenant.cap)}</CAP>
        <Comune>${this.escapeXml(data.tenant.comune)}</Comune>
        <Provincia>${this.escapeXml(data.tenant.provincia)}</Provincia>
        <Nazione>${this.escapeXml(data.tenant.nazione)}</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>${
        data.customer.partitaIva
          ? `
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>${this.escapeXml(data.customer.partitaIva!)}</IdCodice>
        </IdFiscaleIVA>`
          : ''
      }${
        data.customer.codiceFiscale
          ? `
        <CodiceFiscale>${this.escapeXml(data.customer.codiceFiscale)}</CodiceFiscale>`
          : ''
      }
        <Anagrafica>${
          data.customer.tipo === 'AZIENDA'
            ? `
          <Denominazione>${this.escapeXml(data.customer.denominazione || '')}</Denominazione>`
            : `
          <Nome>${this.escapeXml(data.customer.nome || '')}</Nome>
          <Cognome>${this.escapeXml(data.customer.cognome || '')}</Cognome>`
        }
        </Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${this.escapeXml(data.customer.indirizzo)}</Indirizzo>
        <CAP>${this.escapeXml(data.customer.cap)}</CAP>
        <Comune>${this.escapeXml(data.customer.comune)}</Comune>
        <Provincia>${this.escapeXml(data.customer.provincia)}</Provincia>
        <Nazione>${this.escapeXml(data.customer.nazione)}</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>${this.escapeXml(data.invoice.tipoDocumento)}</TipoDocumento>
        <Divisa>${this.escapeXml(data.invoice.divisa)}</Divisa>
        <Data>${this.escapeXml(data.invoice.data)}</Data>
        <Numero>${this.escapeXml(data.invoice.numero)}</Numero>${
          data.invoice.bollo
            ? `
        <DatiBollo>
          <BolloVirtuale>SI</BolloVirtuale>
          <ImportoBollo>2.00</ImportoBollo>
        </DatiBollo>`
            : ''
        }${
          data.invoice.ritenuta
            ? `
        <DatiRitenuta>
          <TipoRitenuta>${this.escapeXml(data.invoice.ritenuta.tipoRitenuta)}</TipoRitenuta>
          <ImportoRitenuta>${data.invoice.ritenuta.importoRitenuta.toFixed(2)}</ImportoRitenuta>
          <AliquotaRitenuta>${data.invoice.ritenuta.aliquotaRitenuta.toFixed(2)}</AliquotaRitenuta>
          <CausalePagamento>${this.escapeXml(data.invoice.ritenuta.causalePagamento)}</CausalePagamento>
        </DatiRitenuta>`
            : ''
        }${
          data.invoice.causale
            ? `
        <Causale>${this.escapeXml(data.invoice.causale)}</Causale>`
            : ''
        }
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
${data.items
  .map(
    item => `      <DettaglioLinee>
        <NumeroLinea>${item.numero}</NumeroLinea>
        <Descrizione>${this.escapeXml(item.descrizione)}</Descrizione>
        <Quantita>${item.quantita.toFixed(2)}</Quantita>
        <PrezzoUnitario>${item.prezzoUnitario.toFixed(2)}</PrezzoUnitario>
        <PrezzoTotale>${item.prezzoTotale.toFixed(2)}</PrezzoTotale>
        <AliquotaIVA>${item.aliquotaIva.toFixed(2)}</AliquotaIVA>${
          item.natura
            ? `
        <Natura>${item.natura}</Natura>`
            : ''
        }
      </DettaglioLinee>`,
  )
  .join('\n')}
${data.riepilogoIva
  .map(
    r => `      <DatiRiepilogo>
        <AliquotaIVA>${r.aliquotaIva.toFixed(2)}</AliquotaIVA>
        <ImponibileImporto>${r.imponibile.toFixed(2)}</ImponibileImporto>
        <Imposta>${r.imposta.toFixed(2)}</Imposta>
        <EsigibilitaIVA>I</EsigibilitaIVA>${
          r.natura
            ? `
        <Natura>${r.natura}</Natura>`
            : ''
        }
      </DatiRiepilogo>`,
  )
  .join('\n')}
    </DatiBeniServizi>
    <DatiPagamento>
      <CondizioniPagamento>${this.escapeXml(data.pagamento.condizioniPagamento)}</CondizioniPagamento>
      <DettaglioPagamento>
        <ModalitaPagamento>${this.escapeXml(data.pagamento.modalitaPagamento)}</ModalitaPagamento>${
          data.pagamento.dataScadenzaPagamento
            ? `
        <DataScadenzaPagamento>${this.escapeXml(data.pagamento.dataScadenzaPagamento)}</DataScadenzaPagamento>`
            : ''
        }
        <ImportoPagamento>${data.pagamento.importoPagamento.toFixed(2)}</ImportoPagamento>
      </DettaglioPagamento>
    </DatiPagamento>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
