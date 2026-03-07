# EU Technology Stack Recommendations for Nexo MechMind OS

> **Document Version**: 1.0.0  
> **Last Updated**: 2026-03-06  
> **Classification**: Technical Implementation Guide  
> **Owner**: Platform Engineering Team  
> **Status**: DRAFT

---

## Executive Summary

This document provides comprehensive technology stack recommendations for transforming Nexo MechMind OS into a fully EU-compliant automotive SaaS platform. All recommendations prioritize:

- **EU Data Residency** - Services with EU regions
- **GDPR Compliance** - Privacy-by-design architectures
- **EU AI Act Readiness** - High-risk AI system governance
- **eIDAS Compatibility** - Electronic identification standards

---

## 1. TecDoc API Client Libraries (Node.js/TypeScript)

### 1.1 Recommended: Custom TecDoc Client with `soap` + `axios`

```typescript
// lib/tecdoc/client.ts
import * as soap from 'soap';
import axios, { AxiosInstance } from 'axios';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

export interface TecDocConfig {
  providerId: string;
  apiKey: string;
  language: string;
  region: 'EU' | 'NA';
  wsdlUrl: string;
  timeout?: number;
}

export class TecDocClient {
  private client: soap.Client;
  private restClient: AxiosInstance;
  private config: TecDocConfig;

  constructor(config: TecDocConfig) {
    this.config = {
      timeout: 30000,
      ...config
    };
    
    this.restClient = axios.create({
      baseURL: 'https://webservice.tecalliance.services/pegasus-3-0',
      timeout: this.config.timeout,
      headers: {
        'X-Api-Key': config.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  async initialize(): Promise<void> {
    // SOAP Client for legacy operations
    this.client = await soap.createClientAsync(this.config.wsdlUrl, {
      endpoint: 'https://webservice.tecalliance.services/pegasus-3-0/services/Article?wsdl',
      request: axios.create({
        timeout: this.config.timeout,
        httpsAgent: new https.Agent({
          cert: process.env.TECDOC_CLIENT_CERT,
          key: process.env.TECDOC_CLIENT_KEY
        })
      })
    });
    
    this.client.setSecurity(new soap.WSSecurity(
      this.config.providerId,
      this.config.apiKey
    ));
  }
}
```

### 1.2 Package Dependencies

```json
{
  "dependencies": {
    "soap": "^1.0.0",
    "axios": "^1.6.0",
    "fast-xml-parser": "^4.3.0",
    "xmlbuilder2": "^3.1.0",
    "iconv-lite": "^0.6.3"
  },
  "devDependencies": {
    "@types/soap": "^0.21.0"
  }
}
```

### 1.3 Alternative: Commercial TecDoc SDK

| Provider | Product | Cost | Pros | Cons |
|----------|---------|------|------|------|
| **TecAlliance** | Official SDK | €€€ | Full support, Latest features | Expensive, Vendor lock-in |
| **Dieselschrauber** | Open-source | Free | Community support | Limited features |
| **Custom Build** | In-house | € | Full control | Maintenance burden |

**Recommendation**: Build custom client with official WSDL references for flexibility and cost control.

---

## 2. EU AI Act Compliance Frameworks

### 2.1 AI Governance: `aigovernance-ts` (Conceptual)

```typescript
// lib/ai-act/governance-framework.ts

export interface AIActComplianceConfig {
  riskLevel: 'minimal' | 'limited' | 'high' | 'unacceptable';
  domain: 'automotive' | 'healthcare' | 'finance' | 'general';
  retentionPeriod: number; // months
  humanOversightRequired: boolean;
}

export class AIActGovernance {
  constructor(private config: AIActComplianceConfig) {}

  async validateInput(input: unknown): Promise<ValidationResult> {
    // Article 10 - Data Quality
    // Check for prohibited content, bias indicators
  }

  async logDecision(decision: AIDecision): Promise<void> {
    // Article 12 - Record Keeping
    // Immutable audit logging
  }

  async explainDecision(decisionId: string): Promise<Explanation> {
    // Article 13 - Transparency
    // XAI explanation generation
  }
}
```

### 2.2 Recommended AI/ML Stack for EU Compliance

| Component | Recommendation | Version | EU AI Act Support |
|-----------|----------------|---------|-------------------|
| **ML Framework** | TensorFlow.js / ONNX Runtime | Latest | Bias detection, Explainability |
| **Model Serving** | Triton Inference Server (NVIDIA) | 2.40+ | Production-grade, Monitoring |
| **Model Registry** | MLflow (self-hosted EU) | 2.10+ | EU data residency |
| **Feature Store** | Feast (PostgreSQL backend) | 0.35+ | GDPR-compliant lineage |
| **Monitoring** | Evidently AI + Grafana | Latest | Drift detection, Bias metrics |
| **Explainability** | SHAP / LIME / Captum | Latest | XAI for Article 13 |

### 2.3 Bias Detection & Fairness Libraries

```typescript
// lib/ai-act/fairness-checker.ts
import { FairnessMetrics } from 'ml-fairness-explainability';

export class AIFairnessChecker {
  async checkBias(
    predictions: number[],
    sensitiveAttributes: Record<string, any[]>,
    thresholds: FairnessThresholds
  ): Promise<BiasReport> {
    const metrics = new FairnessMetrics();
    
    return {
      demographicParity: metrics.demographicParity(predictions, sensitiveAttributes),
      equalizedOdds: metrics.equalizedOdds(predictions, sensitiveAttributes),
      disparateImpact: metrics.disparateImpact(predictions, sensitiveAttributes),
      timestamp: new Date(),
      compliant: this.isCompliant(metrics, thresholds)
    };
  }
}

// package.json additions
{
  "dependencies": {
    "ml-fairness-explainability": "^0.3.0",
    "shap": "^0.42.0",
    "lime": "^0.2.0",
    "evidently": "^0.4.0"
  }
}
```

---

## 3. Digital Product Passport (DPP) Blockchain Platforms

### 3.1 Comparison: Hyperledger Fabric vs Ethereum

| Criteria | Hyperledger Fabric 2.5 | Ethereum (Enterprise) | Recommendation |
|----------|------------------------|----------------------|----------------|
| **Privacy** | Private channels | Public/Private layers | **Hyperledger** |
| **Performance** | 3,000+ TPS | 15-30 TPS | **Hyperledger** |
| **Energy** | Low (PBFT) | High (PoW) / Low (PoS) | **Hyperledger** |
| **Governance** | Consortium-based | Decentralized | **Hyperledger** |
| **ESPR Compliance** | Native asset tracking | Smart contract required | **Hyperledger** |
| **EU Support** | Strong (Linux Foundation) | Moderate | **Hyperledger** |
| **Integration** | Enterprise SDKs | Web3 libraries | **Hyperledger** |

### 3.2 Recommended: Hyperledger Fabric 2.5

```typescript
// lib/dpp/hyperledger-client.ts
import { Gateway, Wallets } from 'fabric-network';
import * as path from 'path';

export class DPPBlockchainClient {
  private gateway: Gateway;
  private contract: any;

  async connect(config: FabricConfig): Promise<void> {
    const wallet = await Wallets.newFileSystemWallet(config.walletPath);
    
    const gatewayOptions = {
      wallet,
      identity: config.userId,
      discovery: { enabled: true, asLocalhost: false },
      tlsInfo: {
        verify: true,
        cert: config.tlsCert
      }
    };

    this.gateway = new Gateway();
    await this.gateway.connect(config.connectionProfile, gatewayOptions);
    
    const network = this.gateway.getNetwork(config.channelName);
    this.contract = network.getContract(config.chaincodeName);
  }

  async registerDPP(dpp: DigitalProductPassport): Promise<string> {
    const result = await this.contract.submitTransaction(
      'registerDPP',
      dpp.productIdentifier,
      JSON.stringify(dpp.sustainability),
      JSON.stringify(dpp.circularity),
      JSON.stringify(dpp.compliance)
    );
    return result.toString();
  }

  async queryDPP(productId: string): Promise<DPPRecord> {
    const result = await this.contract.evaluateTransaction('queryDPP', productId);
    return JSON.parse(result.toString());
  }
}

// Chaincode (Go)
// dpp-chaincode/dpp.go
/*
package main

import (
    "encoding/json"
    "fmt"
    "github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type DPPContract struct {
    contractapi.Contract
}

func (c *DPPContract) RegisterDPP(
    ctx contractapi.TransactionContextInterface,
    productID string,
    sustainability string,
    circularity string,
    compliance string,
) error {
    // ESPR-compliant DPP registration
    // Validation logic
    // Event emission for audit
}
*/
```

### 3.3 IPFS for DPP Document Storage

```typescript
// lib/dpp/ipfs-storage.ts
import { create, IPFSHTTPClient } from 'ipfs-http-client';
import { createHash } from 'crypto';

export class DPPStorageService {
  private ipfs: IPFSHTTPClient;

  constructor(config: IPFSConfig) {
    this.ipfs = create({
      host: config.host, // EU-based IPFS node
      port: config.port,
      protocol: 'https',
      headers: {
        authorization: 'Bearer ' + config.apiKey
      }
    });
  }

  async storeDocument(document: Buffer, metadata: DocumentMetadata): Promise<string> {
    // Add to IPFS
    const result = await this.ipfs.add(document, {
      pin: true,
      cidVersion: 1
    });

    // Calculate hash for blockchain anchoring
    const hash = createHash('sha256').update(document).digest('hex');

    return {
      ipfsHash: result.cid.toString(),
      documentHash: hash,
      size: result.size,
      timestamp: new Date().toISOString()
    };
  }

  async retrieveDocument(ipfsHash: string): Promise<Buffer> {
    const chunks = [];
    for await (const chunk of this.ipfs.cat(ipfsHash)) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
}
```

### 3.4 DPP Package Dependencies

```json
{
  "dependencies": {
    "fabric-network": "^2.2.20",
    "ipfs-http-client": "^60.0.1",
    "multiformats": "^12.0.0",
    "@ipld/dag-json": "^10.0.0",
    "jsonld": "^8.3.0"
  }
}
```

---

## 4. E-Invoicing Libraries by Country

### 4.1 Italy - SDI (Sistema di Interscambio)

```typescript
// lib/e-invoicing/italy/sdi-client.ts
import { SoapClient } from 'soap';
import { SignedXml } from 'xml-crypto';
import { DOMParser } from '@xmldom/xmldom';

export class SDIClient {
  private soapClient: SoapClient;
  private cert: Buffer;
  private key: Buffer;

  constructor(config: SDIConfig) {
    this.cert = config.certificate;
    this.key = config.privateKey;
  }

  async sendInvoice(invoice: FatturaPAInvoice): Promise<SDIResponse> {
    // 1. Convert to FatturaPA XML
    const xml = this.buildFatturaPA(invoice);
    
    // 2. Sign with XAdES-EPES
    const signedXml = this.signInvoice(xml);
    
    // 3. Compress (if needed)
    const compressed = await this.compressIfNeeded(signedXml);
    
    // 4. Send via SOAP
    const result = await this.soapClient.RiceviFattureAsync({
      IdentificativoSdI: invoice.metadata.id,
      NomeFile: `${invoice.metadata.id}.xml.p7m`,
      File: compressed
    });

    return {
      identificativoSdI: result.IdentificativoSdI,
      dataOraRicezione: result.DataOraRicezione,
      errore: result.Errore
    };
  }

  private signInvoice(xml: string): string {
    const sig = new SignedXml({
      privateKey: this.key,
      publicCert: this.cert
    });
    
    sig.addReference(
      "//*[local-name(.)='FatturaElettronica']",
      ['http://www.w3.org/2000/09/xmldsig#enveloped-signature'],
      'http://www.w3.org/2001/04/xmlenc#sha256'
    );
    
    sig.canonicalizationAlgorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#';
    sig.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
    
    sig.computeSignature(xml);
    return sig.getSignedXml();
  }
}
```

**Italy Dependencies:**
```json
{
  "dependencies": {
    "xml-crypto": "^6.0.0",
    "xmldom": "^0.6.0",
    "@xmldom/xmldom": "^0.8.10",
    "node-forge": "^1.3.1",
    "jszip": "^3.10.1"
  }
}
```

### 4.2 France - Chorus Pro

```typescript
// lib/e-invoicing/france/chorus-pro-client.ts
import axios, { AxiosInstance } from 'axios';
import { PDFDocument, PDFPage, rgb } from 'pdf-lib';

export class ChorusProClient {
  private client: AxiosInstance;
  private pisteOAuth: OAuth2Client;

  constructor(config: ChorusProConfig) {
    this.pisteOAuth = new OAuth2Client({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      tokenEndpoint: 'https://oauth.piste.gouv.fr/api/oauth/token'
    });

    this.client = axios.create({
      baseURL: 'https://api.piste.gouv.fr/cpro/facturation',
      timeout: 60000
    });

    // Interceptor for OAuth token
    this.client.interceptors.request.use(async (config) => {
      const token = await this.pisteOAuth.getToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  async submitInvoice(invoice: FacturXInvoice): Promise<DepotResponse> {
    // Create Factur-X hybrid PDF
    const facturXPdf = await this.createFacturX(invoice);
    
    const formData = new FormData();
    formData.append('fichier', facturXPdf, {
      filename: `${invoice.id}.pdf`,
      contentType: 'application/pdf'
    });
    formData.append('nomFichier', `${invoice.id}.pdf`);
    formData.append('formatDepot', 'FacturX');

    const response = await this.client.post('/factures/deposer', formData, {
      headers: formData.getHeaders()
    });

    return response.data;
  }

  private async createFacturX(invoice: FacturXInvoice): Promise<Buffer> {
    // Generate PDF/A-3 with embedded XML
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    
    // Add invoice content to PDF
    this.renderInvoiceToPDF(page, invoice);
    
    // Embed Factur-X XML (EN 16931 compliant)
    const xmlData = this.buildFacturXXML(invoice);
    pdfDoc.attach(xmlData, 'factur-x.xml', {
      mimeType: 'text/xml',
      description: 'Factur-X invoice data'
    });

    return await pdfDoc.save();
  }
}
```

**France Dependencies:**
```json
{
  "dependencies": {
    "pdf-lib": "^1.17.1",
    "simple-oauth2": "^5.0.0",
    "form-data": "^4.0.0"
  }
}
```

### 4.3 Germany - XRechnung

```typescript
// lib/e-invoicing/germany/xrechnung-client.ts
import { convertUBLToXRechnung } from 'xrechnung-converter';
import { ZREClient } from './zre-client';

export class XRechnungClient {
  private zreClient: ZREClient;
  private ozgClient: OZGREClient;

  constructor(config: XRechnungConfig) {
    this.zreClient = new ZREClient(config.zre);
    this.ozgClient = new OZGREClient(config.ozg);
  }

  async sendInvoice(invoice: Invoice, recipient: string): Promise<SubmissionResult> {
    // 1. Convert to XRechnung (CII or UBL)
    const xrechnungXml = this.convertToXRechnung(invoice);
    
    // 2. Sign the invoice (optional but recommended)
    const signedXml = await this.signXRechnung(xrechnungXml);
    
    // 3. Determine correct gateway
    const gateway = this.selectGateway(recipient);
    
    // 4. Submit
    if (gateway === 'ZRE') {
      return this.zreClient.submit(signedXml);
    } else {
      return this.ozgClient.submit(signedXml);
    }
  }

  private convertToXRechnung(invoice: Invoice): string {
    // EN 16931 compliant conversion
    const cii = {
      'rsm:CrossIndustryInvoice': {
        '@xmlns:rsm': 'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100',
        '@xmlns:a': 'urn:un:unece:uncefact:data:standard:QualifiedDataType:100',
        'rsm:ExchangedDocumentContext': {
          'rsm:BusinessProcessSpecifiedDocumentContextParameter': {
            'ram:ID': 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0'
          }
        },
        'rsm:ExchangedDocument': {
          'ram:ID': invoice.id,
          'ram:TypeCode': '380',
          'ram:IssueDateTime': {
            'udt:DateTimeString': this.formatDate(invoice.date)
          }
        }
        // ... more CII fields
      }
    };
    
    return this.buildXML(cii);
  }
}
```

### 4.4 E-Invoicing Library Comparison

| Country | Format | Library | Community | Maintenance |
|---------|--------|---------|-----------|-------------|
| Italy | FatturaPA | `fatturapa-js` | Active | Good |
| France | Factur-X | `factur-x` | Moderate | Good |
| Germany | XRechnung | `xrechnung` | Active | Excellent |
| Spain | FacturaE | `facturae-js` | Moderate | Moderate |
| EU-Wide | Peppol | `peppol-transport` | Active | Good |
| EU-Wide | EN 16931 | `en16931-converter` | Active | Good |

---

## 5. Internationalization (i18n) for 24 EU Languages

### 5.1 Recommended: `next-intl` for Next.js + `react-i18next` for React Native

```typescript
// lib/i18n/config.ts
import { getRequestConfig } from 'next-intl/server';

export const locales = [
  'en',      // English
  'de',      // German
  'fr',      // French
  'it',      // Italian
  'es',      // Spanish
  'pl',      // Polish
  'nl',      // Dutch
  'ro',      // Romanian
  'pt',      // Portuguese
  'el',      // Greek
  'cs',      // Czech
  'hu',      // Hungarian
  'sv',      // Swedish
  'bg',      // Bulgarian
  'da',      // Danish
  'fi',      // Finnish
  'sk',      // Slovak
  'lt',      // Lithuanian
  'hr',      // Croatian
  'sl',      // Slovenian
  'lv',      // Latvian
  'et',      // Estonian
  'mt',      // Maltese
  'ga'       // Irish
] as const;

export type Locale = typeof locales[number];

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default,
  timeZone: 'Europe/Brussels',
  now: new Date(),
  formats: {
    dateTime: {
      short: {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      },
      long: {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      }
    },
    number: {
      currency: {
        style: 'currency',
        currency: 'EUR'
      }
    }
  }
}));
```

### 5.2 Translation Management: Crowdin or Phrase

```typescript
// lib/i18n/sync-crowdin.ts
import Crowdin from '@crowdin/crowdin-api-client';

export class TranslationSync {
  private client: Crowdin;

  constructor(token: string, projectId: number) {
    this.client = new Crowdin({ token });
  }

  async syncTranslations(): Promise<void> {
    // 1. Upload source strings
    await this.uploadSourceFiles();
    
    // 2. Check translation progress
    const progress = await this.getTranslationProgress();
    
    // 3. Download completed translations
    for (const locale of locales) {
      if (progress[locale] >= 95) {
        await this.downloadTranslations(locale);
      }
    }
  }

  private async uploadSourceFiles(): Promise<void> {
    const sourceFiles = await this.extractSourceStrings();
    
    for (const file of sourceFiles) {
      await this.client.sourceFilesApi.createFile(this.projectId, {
        name: file.name,
        title: file.title,
        type: file.type,
        directoryId: file.directoryId
      });
    }
  }
}
```

### 5.3 i18n Dependencies

```json
{
  "dependencies": {
    "next-intl": "^3.5.0",
    "react-i18next": "^13.5.0",
    "i18next": "^23.7.0",
    "i18next-http-backend": "^2.4.0",
    "i18next-browser-languagedetector": "^7.2.0",
    "accept-language-parser": "^1.5.0"
  },
  "devDependencies": {
    "@crowdin/crowdin-api-client": "^1.25.0",
    "i18next-parser": "^8.13.0"
  }
}
```

### 5.4 Regional Formatting

```typescript
// lib/i18n/formatting.ts
export class RegionalFormatter {
  static formatCurrency(amount: number, locale: string): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.getCurrencyForLocale(locale)
    }).format(amount);
  }

  static formatDate(date: Date, locale: string, format: 'short' | 'long'): string {
    const options: Intl.DateTimeFormatOptions = format === 'short'
      ? { day: 'numeric', month: 'short', year: 'numeric' }
      : { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: 'numeric' };
    
    return new Intl.DateTimeFormat(locale, options).format(date);
  }

  static formatVATNumber(vatNumber: string, country: string): string {
    // Format VAT according to country rules
    const formatters: Record<string, (v: string) => string> = {
      'IT': (v) => `IT ${v.slice(0, 3)} ${v.slice(3, 6)} ${v.slice(6, 9)} ${v.slice(9, 11)}`,
      'DE': (v) => `DE ${v.slice(0, 3)} ${v.slice(3, 6)} ${v.slice(6, 9)}`,
      'FR': (v) => `FR ${v.slice(0, 2)} ${v.slice(2, 5)} ${v.slice(5, 8)} ${v.slice(8, 11)}`
    };
    
    return formatters[country]?.(vatNumber.replace(/\D/g, '')) || vatNumber;
  }

  private static getCurrencyForLocale(locale: string): string {
    const currencyMap: Record<string, string> = {
      'en-GB': 'GBP',
      'pl-PL': 'PLN',
      'hu-HU': 'HUF',
      'cz-CZ': 'CZK',
      'ro-RO': 'RON',
      'bg-BG': 'BGN',
      'se-SE': 'SEK',
      'dk-DK': 'DKK'
    };
    return currencyMap[locale] || 'EUR';
  }
}
```

---

## 6. Security & Compliance Libraries

### 6.1 eIDAS 2.0 Integration

```typescript
// lib/eidas/eudi-wallet-client.ts
export class EUDIWalletClient {
  async authenticate(
    credentialRequest: CredentialRequest
  ): Promise<AuthenticationResult> {
    // EUDI Wallet integration for EU Digital Identity
    const response = await fetch(
      'https://api.eudi-wallet.eu/openid4vp/authorize',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentialRequest)
      }
    );
    
    return this.processEUDIResponse(await response.json());
  }
}

// Dependencies
{
  "dependencies": {
    "openid-client": "^5.6.0",
    "jose": "^5.1.0"
  }
}
```

### 6.2 Data Anonymization for AI Training

```typescript
// lib/gdpr/anonymization.ts
import { anonymize } from 'k-anonymity';
import { lDiversity } from 'l-diversity';

export class GDPRAnonymizer {
  async anonymizeForAITraining(
    data: CustomerRecord[],
    k: number = 5,
    l: number = 2
  ): Promise<AnonymizedRecord[]> {
    // k-anonymity for quasi-identifiers
    const kAnonymized = anonymize(data, {
      k,
      quasiIdentifiers: ['age', 'postal_code', 'gender'],
      sensitiveAttributes: ['service_history', 'churn_status']
    });

    // l-diversity for sensitive attributes
    const lDiverse = lDiversity(kAnonymized, {
      l,
      sensitiveAttributes: ['service_history']
    });

    return lDiverse;
  }
}

// Dependencies
{
  "dependencies": {
    "k-anonymity": "^2.0.0",
    "l-diversity": "^1.0.0",
    "crypto-js": "^4.2.0"
  }
}
```

---

## 7. Summary: Recommended Stack

### 7.1 Core Dependencies

```json
{
  "name": "nexo-mechmind-eu",
  "dependencies": {
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@prisma/client": "^5.7.0",
    "soap": "^1.0.0",
    "axios": "^1.6.0",
    "fabric-network": "^2.2.20",
    "ipfs-http-client": "^60.0.1",
    "next-intl": "^3.5.0",
    "react-i18next": "^13.5.0",
    "xml-crypto": "^6.0.0",
    "pdf-lib": "^1.17.1",
    "jose": "^5.1.0",
    "bullmq": "^4.15.0",
    "ioredis": "^5.3.0",
    "helmet": "^7.1.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1"
  }
}
```

### 7.2 Infrastructure Components

| Component | Service | Region | Compliance |
|-----------|---------|--------|------------|
| Compute | AWS ECS Fargate | eu-west-3 (Paris) | GDPR |
| Database | AWS RDS PostgreSQL | eu-central-1 (Frankfurt) | GDPR |
| Cache | AWS ElastiCache Redis | eu-west-3 (Paris) | GDPR |
| Storage | AWS S3 (EU) | EU | GDPR |
| CDN | AWS CloudFront | EU Edge | GDPR |
| Secrets | AWS Secrets Manager | eu-west-3 | GDPR |
| Blockchain | Hyperledger Fabric | EU Consortium | ESPR |
| IPFS | Self-hosted | EU nodes | ESPR |

---

*Document maintained by Platform Engineering Team*  
*Next Review: 2026-06-01*
