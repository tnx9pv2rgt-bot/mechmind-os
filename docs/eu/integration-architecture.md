# EU Integration Architecture for Nexo MechMind OS

> **Document Version**: 1.0.0  
> **Last Updated**: 2026-03-06  
> **Classification**: Technical Integration Guide  
> **Owner**: Integration Architecture Team  
> **Status**: DRAFT

---

## Executive Summary

This document defines the comprehensive integration architecture for connecting Nexo MechMind OS with EU-specific automotive data sources, government platforms, and industry standards. The integrations enable full compliance with EU automotive regulations while providing workshops with accurate, real-time parts and repair information.

---

## 1. TecDoc WebService 2.0 Integration Pattern

### 1.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                           TECDOC WEBSERVICE 2.0 INTEGRATION                                  │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│   Nexo Platform                              TecAlliance Cloud                              │
│        │                                          │                                           │
│        │      ┌──────────────────────────────┐   │                                           │
│        │      │   API Gateway (Rate Limit)   │   │                                           │
│        │      │   • 1000 req/min limit       │   │                                           │
│        │      │   • IP whitelist             │   │                                           │
│        │      └──────────────┬───────────────┘   │                                           │
│        │                     │                    │                                           │
│        │      ┌──────────────▼───────────────┐   │                                           │
│        │      │   Integration Layer (NestJS) │   │                                           │
│        │      │                              │   │      ┌──────────────────────────────┐   │
│        │      │  ┌────────────────────────┐  │   │      │   TecDoc WebService 2.0      │   │
│        │      │  │  SOAP Client           │  │◄──┼──────┤   WSDL Endpoints             │   │
│        │      │  │  • soap library        │  │   │      │   • ArticleService           │   │
│        │      │  │  • WSSecurity          │  │   │      │   • VehicleService           │   │
│        │      │  │  • XML parsing         │  │   │      │   • AssemblyGroupService     │   │
│        │      │  └────────────────────────┘  │   │      │   • AssetService             │   │
│        │      │                              │   │      │   • EtdEarService            │   │
│        │      │  ┌────────────────────────┐  │   │      └──────────────────────────────┘   │
│        │      │  │  REST Client           │  │   │                                           │
│        │      │  │  • axios               │  │   │                                           │
│        │      │  │  • JSON parsing        │  │   │                                           │
│        │      │  └────────────────────────┘  │   │                                           │
│        │      └──────────────┬───────────────┘   │                                           │
│        │                     │                    │                                           │
│        │      ┌──────────────▼───────────────┐   │                                           │
│        │      │   Caching Layer (Redis)      │   │                                           │
│        │      │   • Hot data: 24hr TTL       │   │                                           │
│        │      │   • Warm data: 7 day TTL     │   │                                           │
│        │      │   • Cold data: 30 day TTL    │   │                                           │
│        │      └──────────────┬───────────────┘   │                                           │
│        │                     │                    │                                           │
│        │      ┌──────────────▼───────────────┐   │                                           │
│        │      │   Local Cache (PostgreSQL)   │   │                                           │
│        │      │   • tecdoc_articles          │   │                                           │
│        │      │   • tecdoc_vehicles          │   │                                           │
│        │      │   • tecdoc_cross_references  │   │                                           │
│        │      │   • tecdoc_prices            │   │                                           │
│        │      └──────────────────────────────┘   │                                           │
│        │                                         │                                           │
│        ▼                                         ▼                                           │
│   Workshop UI                           TecDoc Backend (Germany)                            │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 SOAP Integration Implementation

```typescript
// src/tecdoc/soap-client.ts
import * as soap from 'soap';
import { createClientAsync, Client } from 'soap';
import https from 'https';

export interface TecDocSoapConfig {
  providerId: string;
  apiKey: string;
  wsdlUrl: string;
  endpoint: string;
  clientCert?: Buffer;
  clientKey?: Buffer;
  caCert?: Buffer;
}

export class TecDocSoapClient {
  private client: Client | null = null;
  private config: TecDocSoapConfig;

  constructor(config: TecDocSoapConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    const options: soap.IOptions = {
      endpoint: this.config.endpoint,
      request: axios.create({
        timeout: 30000,
        httpsAgent: new https.Agent({
          cert: this.config.clientCert,
          key: this.config.clientKey,
          ca: this.config.caCert,
          rejectUnauthorized: true
        })
      })
    };

    this.client = await createClientAsync(this.config.wsdlUrl, options);
    
    // Set WS-Security
    this.client.setSecurity(new soap.WSSecurity(
      this.config.providerId,
      this.config.apiKey,
      {
        passwordType: 'PasswordText',
        hasTimeStamp: true
      }
    ));
  }

  // Article Search
  async searchArticles(
    query: string,
    searchType: 'articleNumber' | 'oeNumber' | 'tradeName',
    options: ArticleSearchOptions = {}
  ): Promise<Article[]> {
    const args = {
      providerId: this.config.providerId,
      articleCountry: options.country || 'IT',
      lang: options.language || 'it',
      searchingQuery: query,
      searchType,
      includeGenericArticles: true,
      includeArticleCriteria: true,
      includeLinks: true,
      includeImages: options.includeImages || false,
      perPage: options.limit || 50,
      page: options.page || 1
    };

    const [result] = await this.client!.searchArticlesAsync(args);
    return this.mapArticleResponse(result);
  }

  // Vehicle Linkage
  async getVehicleLinkages(
    articleId: string,
    linkageTargetType: 'P' | 'O' // Passenger or Commercial
  ): Promise<VehicleLinkage[]> {
    const args = {
      providerId: this.config.providerId,
      articleCountry: 'IT',
      lang: 'it',
      articleId,
      linkageTargetType,
      includeTechnicalData: true
    };

    const [result] = await this.client!.getLinkageTargetsAsync(args);
    return this.mapVehicleLinkageResponse(result);
  }

  // Assembly Groups
  async getAssemblyGroups(
    vehicleId: number,
    assemblyGroupNodeId?: number
  ): Promise<AssemblyGroup[]> {
    const args = {
      providerId: this.config.providerId,
      lang: 'it',
      linkageTargetId: vehicleId,
      linkageTargetType: 'P',
      assemblyGroupNodeId: assemblyGroupNodeId || 0,
      includeParentNodes: true
    };

    const [result] = await this.client!.getAssemblyGroupFacetsAsync(args);
    return this.mapAssemblyGroupResponse(result);
  }

  // Cross References (OE ↔ Aftermarket)
  async getCrossReferences(
    articleNumber: string,
    brandId: number
  ): Promise<CrossReference[]> {
    const args = {
      providerId: this.config.providerId,
      articleCountry: 'IT',
      lang: 'it',
      articleNumber,
      brandId,
      includeOENumbers: true,
      includeComparableNumbers: true
    };

    const [result] = await this.client!.getArticlesCrossReferenceAsync(args);
    return this.mapCrossReferenceResponse(result);
  }

  // ETD/EAR (Expected Delivery)
  async getAvailability(
    articleIds: string[],
    supplierIds: number[]
  ): Promise<AvailabilityInfo[]> {
    const args = {
      providerId: this.config.providerId,
      articleCountry: 'IT',
      lang: 'it',
      articleList: articleIds.map(id => ({ articleId: id })),
      supplierList: supplierIds.map(id => ({ supplierId: id })),
      includeExpectedDelivery: true,
      includePriceInformation: true
    };

    const [result] = await this.client!.getArticlesEtdEarAsync(args);
    return this.mapAvailabilityResponse(result);
  }

  // Document Retrieval (PDF, TDS)
  async getDocuments(
    articleId: string,
    documentTypes: DocumentType[]
  ): Promise<Document[]> {
    const args = {
      providerId: this.config.providerId,
      articleCountry: 'IT',
      lang: 'it',
      articleId,
      documentTypeList: documentTypes,
      includeDocumentData: true
    };

    const [result] = await this.client!.getArticleDocumentsAsync(args);
    return this.mapDocumentResponse(result);
  }

  private mapArticleResponse(result: any): Article[] {
    // Transform SOAP response to internal model
    return result.data.array.map((item: any) => ({
      id: item.articleId,
      number: item.articleNumber,
      brand: {
        id: item.brandId,
        name: item.brandName
      },
      genericArticle: {
        id: item.genericArticleId,
        name: item.genericArticleName,
        description: item.genericArticleDescription
      },
      criteria: item.criteria?.array?.map((c: any) => ({
        id: c.criteriaId,
        name: c.criteriaName,
        value: c.criteriaValue
      })) || [],
      images: item.images?.array?.map((img: any) => ({
        url: img.imageURL200,
        thumbnail: img.imageURL50
      })) || [],
      linkedVehicles: item.linkageTargets?.array?.length || 0
    }));
  }

  // Additional mapping methods...
}
```

### 1.3 REST API Integration (Modern)

```typescript
// src/tecdoc/rest-client.ts
import axios, { AxiosInstance } from 'axios';

export class TecDocRestClient {
  private client: AxiosInstance;
  private config: TecDocRestConfig;

  constructor(config: TecDocRestConfig) {
    this.config = config;
    
    this.client = axios.create({
      baseURL: 'https://webservice.tecalliance.services/pegasus-3-0',
      timeout: 30000,
      headers: {
        'X-Api-Key': config.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Request interceptor for authentication
    this.client.interceptors.request.use((request) => {
      request.headers['X-Provider-ID'] = this.config.providerId;
      return request;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 429) {
          // Rate limit hit - implement exponential backoff
          return this.handleRateLimit(error);
        }
        throw this.mapTecDocError(error);
      }
    );
  }

  async searchArticles(query: ArticleSearchQuery): Promise<ArticleSearchResult> {
    const response = await this.client.post('/articles/search', {
      providerId: this.config.providerId,
      articleCountry: query.country || 'IT',
      lang: query.language || 'it',
      query: query.term,
      searchType: query.searchType,
      filters: {
        includeGenericArticles: true,
        includeCriteria: true,
        includeLinks: true,
        includeImages: query.includeImages || false
      },
      pagination: {
        perPage: query.limit || 50,
        page: query.page || 1
      }
    });

    return response.data;
  }

  async getVehicleTree(vehicleId: number): Promise<VehicleTree> {
    const response = await this.client.get(`/vehicles/${vehicleId}/tree`, {
      params: {
        includeAssemblyGroups: true,
        includeTechnicalData: true
      }
    });

    return response.data;
  }

  async getRealTimePricing(
    articleIds: string[],
    suppliers: number[]
  ): Promise<PricingInfo[]> {
    const response = await this.client.post('/pricing/realtime', {
      providerId: this.config.providerId,
      articles: articleIds,
      suppliers,
      includeAvailability: true,
      includeDeliveryTime: true,
      currency: 'EUR'
    });

    return response.data.pricing;
  }

  private async handleRateLimit(error: any): Promise<any> {
    const retryAfter = error.response.headers['retry-after'] || 60;
    await this.sleep(retryAfter * 1000);
    return this.client.request(error.config);
  }

  private mapTecDocError(error: any): TecDocError {
    return new TecDocError(
      error.response?.data?.message || error.message,
      error.response?.status || 500,
      error.response?.data?.code
    );
  }
}
```

### 1.4 Caching Strategy

```typescript
// src/tecdoc/cache-manager.ts
import { Redis } from 'ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class TecDocCacheManager {
  constructor(
    private redis: Redis,
    @InjectRepository(TecDocArticle)
    private articleRepo: Repository<TecDocArticle>,
    @InjectRepository(TecDocVehicle)
    private vehicleRepo: Repository<TecDocVehicle>
  ) {}

  // Redis hot cache (24 hours)
  async getFromHotCache<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(`tecdoc:hot:${key}`);
    return cached ? JSON.parse(cached) : null;
  }

  async setHotCache<T>(key: string, value: T, ttl: number = 86400): Promise<void> {
    await this.redis.setex(
      `tecdoc:hot:${key}`,
      ttl,
      JSON.stringify(value)
    );
  }

  // PostgreSQL warm cache (synced weekly)
  async getArticleFromCache(articleId: string): Promise<TecDocArticle | null> {
    return this.articleRepo.findOne({
      where: { articleId },
      relations: ['criteria', 'images', 'vehicles']
    });
  }

  async cacheArticle(article: TecDocArticle): Promise<void> {
    await this.articleRepo.save(article);
  }

  // Cache warming job (runs nightly)
  @Cron('0 2 * * *')
  async warmCache(): Promise<void> {
    const popularArticles = await this.getPopularArticles();
    
    for (const articleId of popularArticles) {
      try {
        const fresh = await this.tecdocClient.getArticle(articleId);
        await this.cacheArticle(fresh);
        await this.setHotCache(articleId, fresh);
      } catch (error) {
        this.logger.error(`Failed to warm cache for ${articleId}`, error);
      }
    }
  }
}
```

---

## 2. TecRMI API Integration

### 2.1 Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              TECRMI API INTEGRATION                                          │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  Nexo Workshop                                TecRMI Cloud                                   │
│       │                                           │                                          │
│       │  1. Search Vehicle (KBA/HsnTsn/VIN)       │                                          │
│       │──────────────────────────────────────────►│                                          │
│       │                                           │                                          │
│       │  2. Vehicle Data + Supported Operations   │                                          │
│       │◄──────────────────────────────────────────│                                          │
│       │                                           │                                          │
│       │  3. Request Maintenance Schedule          │                                          │
│       │──────────────────────────────────────────►│                                          │
│       │                                           │                                          │
│       │  4. Maintenance Intervals (Wartung)       │                                          │
│       │◄──────────────────────────────────────────│                                          │
│       │                                           │                                          │
│       │  5. Request Repair Manual                 │                                          │
│       │──────────────────────────────────────────►│                                          │
│       │                                           │                                          │
│       │  6. Step-by-step Repair Instructions      │                                          │
│       │◄──────────────────────────────────────────│                                          │
│       │                                           │                                          │
│       │  7. Request Wiring Diagram                │                                          │
│       │──────────────────────────────────────────►│                                          │
│       │                                           │                                          │
│       │  8. Interactive Wiring Diagram            │                                          │
│       │◄──────────────────────────────────────────│                                          │
│       │                                           │                                          │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Implementation

```typescript
// src/tecrmi/client.ts
export class TecRMIClient {
  private client: AxiosInstance;

  constructor(private config: TecRMIConfig) {
    this.client = axios.create({
      baseURL: 'https://api.tecrmi.tecalliance.com/v1',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'X-Client-ID': config.clientId,
        'Accept': 'application/json'
      }
    });
  }

  // Vehicle Identification
  async identifyVehicle(query: VehicleQuery): Promise<VehicleIdentification[]> {
    const response = await this.client.get('/vehicles/search', {
      params: {
        ...(query.kba && { kba: query.kba }),
        ...(query.hsnTsn && { hsnTsn: query.hsnTsn }),
        ...(query.vin && { vin: query.vin }),
        ...(query.licensePlate && { plate: query.licensePlate, country: query.country }),
        lang: query.language || 'en'
      }
    });

    return response.data.vehicles;
  }

  // Maintenance Schedules (Wartung)
  async getMaintenanceSchedule(
    vehicleId: number,
    options: MaintenanceOptions
  ): Promise<MaintenanceSchedule> {
    const response = await this.client.get(`/vehicles/${vehicleId}/maintenance`, {
      params: {
        mileage: options.mileage,
        registrationDate: options.registrationDate,
        serviceHistory: options.serviceHistory?.join(','),
        includeSpecialOperations: true,
        lang: options.language || 'en'
      }
    });

    return {
      vehicle: response.data.vehicle,
      intervals: response.data.intervals.map((i: any) => ({
        operation: i.operationName,
        description: i.description,
        intervalType: i.intervalType, // TIME or MILEAGE
        intervalValue: i.intervalValue,
        nextDue: this.calculateNextDue(i, options),
        severity: i.severity,
        estimatedLaborTime: i.laborTimeMinutes,
        requiredParts: i.parts?.map((p: any) => ({
          name: p.name,
          oeNumber: p.oeNumber,
          quantity: p.quantity,
          notes: p.notes
        })) || []
      }))
    };
  }

  // Repair Instructions (Reparatur)
  async getRepairInstructions(
    vehicleId: number,
    assemblyGroupId: number,
    operationType: string
  ): Promise<RepairInstructions> {
    const response = await this.client.get(`/vehicles/${vehicleId}/repairs`, {
      params: {
        assemblyGroupId,
        operationType,
        includeImages: true,
        includeTorqueSpecs: true,
        includeWarnings: true,
        lang: 'en'
      }
    });

    return {
      title: response.data.title,
      estimatedTime: response.data.laborTimeMinutes,
      difficulty: response.data.difficulty,
      requiredTools: response.data.tools,
      steps: response.data.steps.map((step: any) => ({
        sequence: step.sequence,
        description: step.description,
        images: step.imageUrls,
        warnings: step.warnings,
        torqueSpecs: step.torqueSpecifications?.map((t: any) => ({
          component: t.component,
          value: t.value,
          unit: t.unit,
          angle: t.angle,
          sequence: t.sequence
        })),
        specialTools: step.specialTools
      })),
      safetyNotes: response.data.safetyNotes,
      disposalNotes: response.data.disposalNotes
    };
  }

  // Wiring Diagrams (Schaltplan)
  async getWiringDiagram(
    vehicleId: number,
    circuitId: string
  ): Promise<WiringDiagram> {
    const response = await this.client.get(`/vehicles/${vehicleId}/wiring`, {
      params: {
        circuitId,
        format: 'interactive', // or 'pdf'
        includeComponents: true
      }
    });

    return {
      circuitName: response.data.circuitName,
      interactiveSvg: response.data.svgData,
      components: response.data.components.map((c: any) => ({
        id: c.componentId,
        name: c.name,
        location: c.location,
        pinout: c.pinout,
        wireColors: c.wireColors,
        svgCoordinates: c.coordinates
      })),
      troubleshooting: response.data.troubleshootingSteps
    };
  }

  // Standard Maintenance & Repair Times (SMR)
  async getLaborTimes(
    vehicleId: number,
    operationCode: string
  ): Promise<LaborTimeInfo> {
    const response = await this.client.get(`/vehicles/${vehicleId}/labor-times`, {
      params: {
        operationCode,
        includeSkillLevel: true,
        includeVariants: true
      }
    });

    return {
      baseTime: response.data.baseTimeMinutes,
      skillLevel: response.data.skillLevel, // 1-5
      variants: response.data.variants?.map((v: any) => ({
        description: v.description,
        additionalTime: v.additionalMinutes,
        conditions: v.conditions
      })) || [],
      notes: response.data.notes
    };
  }
}
```

---

## 3. Distributor API Integrations

### 3.1 Multi-Distributor Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                        DISTRIBUTOR API INTEGRATION HUB                                       │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│   │                         UNIFIED DISTRIBUTOR INTERFACE                                │   │
│   │                                                                                      │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │   │
│   │  │   Temot     │  │ Groupauto   │  │   Nexus     │  │     Other Distributors      │ │   │
│   │  │  Adapter    │  │  Adapter    │  │  Adapter    │  │      (Extensible)           │ │   │
│   │  │             │  │             │  │             │  │                             │ │   │
│   │  │ • SOAP API  │  │ • REST API  │  │ • REST API  │  │  • API standardization      │ │   │
│   │  │ • EDI       │  │ • OAuth 2.0 │  │ • API Key   │  │  • Common data model        │ │   │
│   │  │ • EDIFACT   │  │ • JSON      │  │ • XML       │  │  • Error handling           │ │   │
│   │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────────────┬───────────────┘ │   │
│   │         │                │                │                       │                 │   │
│   │         └────────────────┴────────────────┴───────────────────────┘                 │   │
│   │                                    │                                                 │   │
│   │  ┌─────────────────────────────────▼─────────────────────────────────────────────┐   │   │
│   │  │                      NORMALIZATION LAYER                                       │   │   │
│   │  │  • Common product model (TecDoc mapping)                                       │   │   │
│   │  │  • Price normalization (EUR, currency conversion)                              │   │   │
│   │  │  • Availability standardization (stock levels, ETD)                            │   │   │
│   │  │  • Error mapping (unified error codes)                                         │   │   │
│   │  └───────────────────────────────────────────────────────────────────────────────┘   │   │
│   │                                    │                                                 │   │
│   │  ┌─────────────────────────────────▼─────────────────────────────────────────────┐   │   │
│   │  │                      UNIFIED RESPONSE                                          │   │   │
│   │  │  {                                                                             │   │   │
│   │  │    distributor: "temot",                                                       │   │   │
│   │  │    product: { tecdocId, oeNumber, brand, ... },                                │   │   │
│   │  │    pricing: { netPrice, currency, vatRate, discounts },                        │   │   │
│   │  │    availability: { stock, warehouse, eta, quantity },                          │   │   │
│   │  │    shipping: { methods, costs, restrictions }                                  │   │   │
│   │  │  }                                                                             │   │   │
│   │  └───────────────────────────────────────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Temot International Integration

```typescript
// src/distributors/temot/client.ts
export class TemotClient implements DistributorClient {
  private soapClient: soap.Client;
  private config: TemotConfig;

  async initialize(): Promise<void> {
    this.soapClient = await soap.createClientAsync(
      'https://b2b.temot-international.com/wsdl/OrderService.wsdl'
    );
    
    this.soapClient.setSecurity(new soap.BasicAuthSecurity(
      this.config.username,
      this.config.password
    ));
  }

  async searchProducts(query: ProductQuery): Promise<DistributorProduct[]> {
    const response = await this.soapClient.searchProductsAsync({
      customerNumber: this.config.customerNumber,
      searchTerm: query.term,
      searchType: this.mapSearchType(query.type),
      maxResults: query.limit || 50
    });

    return response[0].products.map((p: any) => this.normalizeProduct(p));
  }

  async getPricing(productIds: string[]): Promise<PricingInfo[]> {
    const response = await this.soapClient.getPriceListAsync({
      customerNumber: this.config.customerNumber,
      articleNumbers: productIds,
      currency: 'EUR',
      includeDiscounts: true,
      validityDate: new Date().toISOString()
    });

    return response[0].prices.map((p: any) => ({
      distributorSku: p.articleNumber,
      tecdocId: p.tecdocId,
      netPrice: parseFloat(p.netPrice),
      currency: p.currency,
      vatRate: parseFloat(p.vatRate),
      discounts: p.discounts?.map((d: any) => ({
        type: d.discountType,
        percentage: parseFloat(d.percentage),
        validFrom: d.validFrom,
        validTo: d.validTo
      })) || [],
      priceValidUntil: p.validTo
    }));
  }

  async getAvailability(productIds: string[]): Promise<AvailabilityInfo[]> {
    const response = await this.soapClient.getStockAsync({
      customerNumber: this.config.customerNumber,
      articleNumbers: productIds,
      warehouses: this.config.warehouses,
      includePendingDeliveries: true
    });

    return response[0].stockInfos.map((s: any) => ({
      distributorSku: s.articleNumber,
      totalStock: s.quantity,
      warehouseBreakdown: s.warehouses?.map((w: any) => ({
        warehouseId: w.warehouseCode,
        location: w.location,
        quantity: w.quantity,
        reserved: w.reservedQuantity
      })) || [],
      estimatedDelivery: s.eta ? new Date(s.eta) : null,
      nextDelivery: s.nextDeliveryDate ? new Date(s.nextDeliveryDate) : null,
      orderable: s.quantity > 0 || s.canBackorder
    }));
  }

  async createOrder(order: DistributorOrder): Promise<OrderConfirmation> {
    const response = await this.soapClient.createOrderAsync({
      customerNumber: this.config.customerNumber,
      orderReference: order.reference,
      deliveryAddress: this.mapAddress(order.deliveryAddress),
      orderLines: order.items.map(item => ({
        articleNumber: item.distributorSku,
        quantity: item.quantity,
        customerReference: item.customerReference,
        requestedDeliveryDate: item.requestedDeliveryDate?.toISOString()
      })),
      shippingMethod: order.shippingMethod,
      specialInstructions: order.notes
    });

    return {
      orderId: response[0].orderNumber,
      distributorReference: response[0].distributorOrderNumber,
      status: response[0].status,
      totalAmount: parseFloat(response[0].totalAmount),
      currency: response[0].currency,
      estimatedDelivery: response[0].estimatedDeliveryDate,
      orderLines: response[0].lines.map((l: any) => ({
        lineNumber: l.lineNumber,
        status: l.status,
        confirmedQuantity: l.confirmedQuantity,
        backorderQuantity: l.backorderQuantity,
        unitPrice: parseFloat(l.unitPrice)
      }))
    };
  }

  private normalizeProduct(product: any): DistributorProduct {
    return {
      distributor: 'temot',
      distributorSku: product.articleNumber,
      tecdocId: product.tecdocId,
      oeNumber: product.oeNumber,
      brand: {
        id: product.brandId,
        name: product.brandName
      },
      description: product.description,
      specifications: product.specifications,
      weight: product.weight ? parseFloat(product.weight) : undefined,
      dimensions: product.dimensions,
      replacementFor: product.replacementArticles,
      ean: product.ean
    };
  }
}
```

### 3.3 Groupauto Integration

```typescript
// src/distributors/groupauto/client.ts
export class GroupautoClient implements DistributorClient {
  private client: AxiosInstance;
  private token: string;

  constructor(private config: GroupautoConfig) {
    this.client = axios.create({
      baseURL: 'https://api.groupauto.com/v2',
      timeout: 30000
    });
  }

  async authenticate(): Promise<void> {
    const response = await this.client.post('/auth/token', {
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: 'catalog pricing inventory ordering'
    });

    this.token = response.data.access_token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
  }

  async searchProducts(query: ProductQuery): Promise<DistributorProduct[]> {
    const response = await this.client.get('/catalog/search', {
      params: {
        q: query.term,
        type: query.type,
        brand: query.brand,
        limit: query.limit || 50,
        offset: query.offset || 0
      }
    });

    return response.data.items.map((item: any) => this.normalizeProduct(item));
  }

  async getRealTimeInventory(sku: string): Promise<InventoryDetail> {
    const response = await this.client.get(`/inventory/${sku}/realtime`, {
      params: {
        memberId: this.config.memberId,
        includeNearbyWarehouses: true,
        includeTransferOptions: true
      }
    });

    return {
      sku: response.data.sku,
      totalAvailable: response.data.totalQuantity,
      locations: response.data.warehouses.map((w: any) => ({
        warehouseCode: w.code,
        warehouseName: w.name,
        distance: w.distanceKm,
        available: w.quantity,
        transferAvailable: w.transferPossible,
        transferTime: w.transferDays
      })),
      alternativeProducts: response.data.alternatives?.map((a: any) => ({
        sku: a.sku,
        brand: a.brand,
        availability: a.availability,
        compatibility: a.compatibilityScore
      })) || []
    };
  }

  async createOrder(order: DistributorOrder): Promise<OrderConfirmation> {
    const response = await this.client.post('/orders', {
      memberId: this.config.memberId,
      customerReference: order.reference,
      delivery: {
        type: order.deliveryType, // 'warehouse', 'delivery', 'express'
        address: order.deliveryAddress,
        contact: order.contactPerson,
        instructions: order.deliveryInstructions
      },
      items: order.items.map(item => ({
        sku: item.distributorSku,
        quantity: item.quantity,
        customerLineRef: item.customerReference,
        priceAcceptance: item.acceptPriceVariance || false
      })),
      payment: {
        terms: order.paymentTerms || 'net30',
        method: order.paymentMethod || 'account'
      },
      shipping: {
        method: order.shippingMethod,
        carrierPreference: order.carrierPreference
      }
    });

    return {
      orderId: response.data.orderId,
      status: response.data.status,
      total: {
        net: response.data.totals.net,
        vat: response.data.totals.vat,
        gross: response.data.totals.gross,
        currency: response.data.currency
      },
      delivery: {
        estimatedDate: response.data.estimatedDelivery,
        shippingCost: response.data.shipping.cost,
        trackingAvailable: response.data.shipping.trackingEnabled
      },
      items: response.data.items.map((item: any) => ({
        lineId: item.lineId,
        sku: item.sku,
        status: item.fulfillmentStatus,
        confirmedQty: item.confirmedQuantity,
        unitPrice: item.pricing.unit,
        lineTotal: item.pricing.total
      }))
    };
  }
}
```

---

## 4. Government Platform Integrations

### 4.1 Italy - SDI (Sistema di Interscambio)

```typescript
// src/e-invoicing/italy/sdi-service.ts
@Injectable()
export class SDIService implements EInvoicingService {
  private soapClient: soap.Client;
  private certManager: CertificateManager;

  constructor(
    private config: SDIConfig,
    private auditLogger: AuditLogger
  ) {
    this.certManager = new CertificateManager(config.certificatePath);
  }

  async initialize(): Promise<void> {
    // SDI uses mutual TLS authentication
    const cert = await this.certManager.loadCertificate();
    
    this.soapClient = await soap.createClientAsync(
      'https://servizi.fatturapa.it/ricevi_fatture?wsdl',
      {
        request: axios.create({
          httpsAgent: new https.Agent({
            cert: cert.certificate,
            key: cert.privateKey,
            rejectUnauthorized: true
          })
        })
      }
    );
  }

  async sendInvoice(invoice: Invoice): Promise<InvoiceSubmissionResult> {
    // 1. Generate FatturaPA XML
    const fatturaPA = this.generateFatturaPA(invoice);
    
    // 2. Sign with XAdES-EPES
    const signedInvoice = await this.signWithXAdES(fatturaPA);
    
    // 3. Compress if > 5MB
    const payload = signedInvoice.length > 5 * 1024 * 1024
      ? await this.compress(signedInvoice)
      : signedInvoice;

    // 4. Submit to SDI
    const response = await this.soapClient.RiceviFattureAsync({
      IdentificativoSdI: this.generateSdiId(),
      NomeFile: `${invoice.number}.xml.p7m`,
      File: Buffer.from(payload).toString('base64'),
      Hash: crypto.createHash('sha256').update(payload).digest('base64')
    });

    // 5. Log submission
    await this.auditLogger.log({
      event: 'EINVOICE_SUBMITTED',
      country: 'IT',
      invoiceId: invoice.id,
      sdiId: response.IdentificativoSdI,
      timestamp: new Date()
    });

    return {
      submissionId: response.IdentificativoSdI,
      submissionDate: response.DataOraRicezione,
      status: 'SUBMITTED',
      errors: response.Errori?.map((e: any) => ({
        code: e.Codice,
        description: e.Descrizione
      }))
    };
  }

  async checkStatus(sdiId: string): Promise<InvoiceStatus> {
    const response = await this.soapClient.ConsultaStatoFatturaAsync({
      IdentificativoSdI: sdiId
    });

    return {
      sdiId,
      currentStatus: this.mapSdiStatus(response.Stato),
      statusDate: response.DataOraAggiornamento,
      recipientStatus: response.StatoDestinatario,
      deliveryDate: response.DataConsegna,
      rejectionReason: response.MotivoRifiuto
    };
  }

  async receiveNotifications(): Promise<SdiNotification[]> {
    // Poll for delivery notifications (EsitoCommittente)
    const response = await this.soapClient.RiceviNotificaAsync({
      IdentificativoSdI: undefined // Get all pending
    });

    return response.Notifiche?.map((n: any) => ({
      type: n.TipoNotifica,
      sdiId: n.IdentificativoSdI,
      invoiceNumber: n.NumeroFattura,
      recipientVat: n.PartitaIVADestinatario,
      status: n.Esito,
      message: n.Messaggio,
      receivedAt: new Date()
    })) || [];
  }

  private generateFatturaPA(invoice: Invoice): string {
    const builder = new XMLBuilder({
      ignoreAttributes: false,
      format: true
    });

    const fattura = {
      'p:FatturaElettronica': {
        '@xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
        '@xmlns:p': 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2',
        '@versione': 'FPR12',
        'FatturaElettronicaHeader': {
          'DatiTrasmissione': {
            'IdTrasmittente': {
              'IdPaese': invoice.sender.country,
              'IdCodice': invoice.sender.vatNumber
            },
            'ProgressivoInvio': invoice.number,
            'FormatoTrasmissione': 'FPR12',
            'CodiceDestinatario': invoice.recipient.sdiCode
          },
          'CedentePrestatore': this.mapSupplier(invoice.sender),
          'CessionarioCommittente': this.mapCustomer(invoice.recipient)
        },
        'FatturaElettronicaBody': {
          'DatiGenerali': {
            'DatiGeneraliDocumento': {
              'TipoDocumento': this.mapDocumentType(invoice.type),
              'Numero': invoice.number,
              'Data': invoice.date.toISOString().split('T')[0],
              'ImportoTotaleDocumento': invoice.total.toFixed(2)
            }
          },
          'DatiBeniServizi': {
            'DettaglioLinee': invoice.items.map((item, index) => ({
              'NumeroLinea': index + 1,
              'Descrizione': item.description,
              'Quantita': item.quantity.toFixed(2),
              'PrezzoUnitario': item.unitPrice.toFixed(2),
              'PrezzoTotale': item.total.toFixed(2),
              'AliquotaIVA': (item.vatRate * 100).toFixed(2)
            }))
          },
          'DatiPagamento': {
            'CondizioniPagamento': this.mapPaymentTerms(invoice.paymentTerms),
            'DettaglioPagamento': {
              'ModalitaPagamento': this.mapPaymentMethod(invoice.paymentMethod),
              'ImportoPagamento': invoice.total.toFixed(2)
            }
          }
        }
      }
    };

    return builder.build(fattura);
  }

  private async signWithXAdES(xml: string): Promise<string> {
    const sig = new SignedXml({
      privateKey: await this.certManager.getPrivateKey(),
      publicCert: await this.certManager.getCertificate()
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

### 4.2 France - Chorus Pro

```typescript
// src/e-invoicing/france/chorus-pro-service.ts
@Injectable()
export class ChorusProService implements EInvoicingService {
  private client: AxiosInstance;
  private token: string;

  constructor(
    private config: ChorusProConfig,
    private auditLogger: AuditLogger
  ) {}

  async authenticate(): Promise<void> {
    // OAuth 2.0 authentication via PISTE platform
    const response = await axios.post(
      'https://oauth.piste.gouv.fr/api/oauth/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        scope: 'cpro-facturation'
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    this.token = response.data.access_token;
  }

  async sendInvoice(invoice: Invoice): Promise<InvoiceSubmissionResult> {
    // 1. Create Factur-X hybrid PDF
    const facturX = await this.createFacturX(invoice);

    // 2. Submit via API
    const formData = new FormData();
    formData.append('fichier', facturX, {
      filename: `${invoice.number}.pdf`,
      contentType: 'application/pdf'
    });
    formData.append('nomFichier', `${invoice.number}.pdf`);
    formData.append('formatDepot', 'FacturX');
    formData.append('circuit', this.determineCircuit(invoice.recipient));

    const response = await axios.post(
      'https://api.piste.gouv.fr/cpro/facturation/v1/factures/deposer/flux',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.token}`,
          'cpro-department': invoice.departmentCode
        }
      }
    );

    return {
      submissionId: response.data.numeroFluxDepot,
      submissionDate: new Date(),
      status: 'SUBMITTED',
      technicalId: response.data.technicalId
    };
  }

  async checkStatus(technicalId: string): Promise<InvoiceStatus> {
    const response = await axios.get(
      `https://api.piste.gouv.fr/cpro/facturation/v1/factures/consulter/${technicalId}`,
      {
        headers: { 'Authorization': `Bearer ${this.token}` }
      }
    );

    return {
      technicalId,
      currentStatus: this.mapChorusStatus(response.data.statut),
      statusDate: response.data.dateStatut,
      recipientService: response.data.codeServiceDestinataire,
      rejectionReason: response.data.motifRejet
    };
  }

  private async createFacturX(invoice: Invoice): Promise<Buffer> {
    // Generate PDF/A-3 with embedded XML
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();

    // Add invoice content
    this.renderInvoiceContent(page, invoice);

    // Create Factur-X XML (CII format)
    const ciiXml = this.generateCII(invoice);

    // Embed XML as attachment
    pdfDoc.attach(Buffer.from(ciiXml), 'factur-x.xml', {
      mimeType: 'text/xml',
      description: 'Factur-X 2.1 Minimum',
      creationDate: new Date(),
      modificationDate: new Date()
    });

    // Set PDF/A-3 compliance
    pdfDoc.setTitle(`Invoice ${invoice.number}`);
    pdfDoc.setAuthor(invoice.sender.name);
    pdfDoc.setCreationDate(invoice.date);
    pdfDoc.setKeywords(['Factur-X', 'invoice']);

    return await pdfDoc.save({
      useObjectStreams: false // Required for PDF/A-3
    });
  }

  private generateCII(invoice: Invoice): string {
    // Generate CII (Cross Industry Invoice) XML
    const cii = {
      'rsm:CrossIndustryInvoice': {
        '@xmlns:rsm': 'urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100',
        '@xmlns:ram': 'urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100',
        '@xmlns:udt': 'urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100',
        'rsm:ExchangedDocumentContext': {
          'ram:BusinessProcessSpecifiedDocumentContextParameter': {
            'ram:ID': 'urn:fdc:peppol.eu:2017:poacc:billing:01:1.0'
          },
          'ram:GuidelineSpecifiedDocumentContextParameter': {
            'ram:ID': 'urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:minimum'
          }
        },
        'rsm:ExchangedDocument': {
          'ram:ID': invoice.number,
          'ram:TypeCode': '380',
          'ram:IssueDateTime': {
            'udt:DateTimeString': {
              '@format': '102',
              '#text': invoice.date.toISOString().split('T')[0].replace(/-/g, '')
            }
          }
        },
        'rsm:SupplyChainTradeTransaction': {
          'ram:ApplicableHeaderTradeAgreement': {
            'ram:SellerTradeParty': this.mapSeller(invoice.sender),
            'ram:BuyerTradeParty': this.mapBuyer(invoice.recipient)
          },
          'ram:ApplicableHeaderTradeDelivery': {},
          'ram:ApplicableHeaderTradeSettlement': {
            'ram:SpecifiedTradeSettlementHeaderMonetarySummation': {
              'ram:TaxBasisTotalAmount': invoice.subtotal.toFixed(2),
              'ram:TaxTotalAmount': {
                '@currencyID': 'EUR',
                '#text': invoice.vatTotal.toFixed(2)
              },
              'ram:GrandTotalAmount': invoice.total.toFixed(2)
            }
          }
        }
      }
    };

    return new XMLBuilder({ format: true }).build(cii);
  }
}
```

### 4.3 Germany - XRechnung (ZRE/OZG-RE)

```typescript
// src/e-invoicing/germany/xrechnung-service.ts
@Injectable()
export class XRechnungService implements EInvoicingService {
  private zreClient: AxiosInstance;
  private ozgClient: AxiosInstance;

  constructor(private config: XRechnungConfig) {
    this.zreClient = axios.create({
      baseURL: 'https://erechnung-bund.de/api/v1',
      timeout: 60000
    });

    this.ozgClient = axios.create({
      baseURL: 'https://ozg-rechnung.de/api/v1',
      timeout: 60000
    });
  }

  async sendInvoice(invoice: Invoice): Promise<InvoiceSubmissionResult> {
    // 1. Convert to XRechnung (CII or UBL)
    const xrechnung = this.convertToXRechnung(invoice);

    // 2. Determine correct gateway (ZRE for federal, OZG-RE for states)
    const gateway = await this.determineGateway(invoice.recipient);

    // 3. Submit
    const client = gateway === 'ZRE' ? this.zreClient : this.ozgClient;
    
    const response = await client.post('/invoices', {
      invoice: Buffer.from(xrechnung).toString('base64'),
      format: 'CII', // or 'UBL'
      testMode: this.config.testMode
    }, {
      headers: {
        'X-Participant-ID': this.config.participantId,
        'X-Token': this.config.apiToken,
        'Content-Type': 'application/json'
      }
    });

    return {
      submissionId: response.data.invoiceId,
      submissionDate: new Date(),
      status: 'SUBMITTED',
      gateway,
      referenceNumber: response.data.referenceNumber
    };
  }

  async checkStatus(invoiceId: string, gateway: 'ZRE' | 'OZG'): Promise<InvoiceStatus> {
    const client = gateway === 'ZRE' ? this.zreClient : this.ozgClient;
    
    const response = await client.get(`/invoices/${invoiceId}/status`, {
      headers: {
        'X-Participant-ID': this.config.participantId,
        'X-Token': this.config.apiToken
      }
    });

    return {
      submissionId: invoiceId,
      currentStatus: response.data.status,
      statusDate: response.data.statusDate,
      routingInfo: response.data.routing,
      validationReport: response.data.validation
    };
  }

  private convertToXRechnung(invoice: Invoice): string {
    // Generate XRechnung-compliant CII
    // Must comply with EN 16931 and XRechnung specification
    const cii = this.generateCII(invoice);
    
    // Validate against XRechnung schematron
    this.validateXRechnung(cii);
    
    return cii;
  }

  private async determineGateway(recipient: Recipient): Promise<'ZRE' | 'OZG'> {
    // Check if recipient is federal or state/municipal
    if (recipient.leiCode?.startsWith('529900')) {
      // Use official LEI registry lookup
      const entityInfo = await this.lookupLei(recipient.leiCode);
      return entityInfo.jurisdiction === 'DE-FEDERAL' ? 'ZRE' : 'OZG';
    }
    
    // Fallback to routing table
    return this.config.routingTable[recipient.buyerReference] || 'ZRE';
  }
}
```

---

## 5. Integration Monitoring & Observability

### 5.1 Health Check Architecture

```typescript
// src/integrations/health.service.ts
@Injectable()
export class IntegrationHealthService {
  constructor(
    private tecdocClient: TecDocClient,
    private tecrmiClient: TecRMIClient,
    private distributors: DistributorClient[],
    private eInvoicingServices: EInvoicingService[],
    private metrics: MetricsService
  ) {}

  @Interval(60000) // Check every minute
  async runHealthChecks(): Promise<void> {
    const checks = await Promise.all([
      this.checkTecDocHealth(),
      this.checkTecRMIHealth(),
      ...this.distributors.map(d => this.checkDistributorHealth(d)),
      ...this.eInvoicingServices.map(s => this.checkEInvoicingHealth(s))
    ]);

    for (const check of checks) {
      this.metrics.recordIntegrationHealth(check);
      
      if (check.status === 'DOWN') {
        await this.alertService.sendAlert({
          severity: 'CRITICAL',
          component: check.name,
          message: check.error
        });
      }
    }
  }

  private async checkTecDocHealth(): Promise<HealthCheck> {
    try {
      const start = Date.now();
      await this.tecdocClient.searchArticles('TEST', 'articleNumber', { limit: 1 });
      const latency = Date.now() - start;

      return {
        name: 'TecDoc',
        status: latency < 5000 ? 'UP' : 'DEGRADED',
        latency,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        name: 'TecDoc',
        status: 'DOWN',
        error: error.message,
        lastChecked: new Date()
      };
    }
  }

  private async checkDistributorHealth(distributor: DistributorClient): Promise<HealthCheck> {
    try {
      const start = Date.now();
      await distributor.searchProducts({ term: 'TEST', limit: 1 });
      const latency = Date.now() - start;

      return {
        name: distributor.getName(),
        status: latency < 3000 ? 'UP' : 'DEGRADED',
        latency,
        lastChecked: new Date()
      };
    } catch (error) {
      return {
        name: distributor.getName(),
        status: 'DOWN',
        error: error.message,
        lastChecked: new Date()
      };
    }
  }
}
```

### 5.2 Metrics Dashboard

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| TecDoc Response Time | SOAP/REST API | >5s p95 |
| TecDoc Error Rate | SOAP/REST API | >1% |
| TecRMI Response Time | REST API | >3s p95 |
| Distributor Response Time | Various | >3s p95 |
| E-Invoice Submission Success | Government APIs | <99% |
| E-Invoice Delivery Time | Government APIs | >24h |
| Cache Hit Rate | Redis | <80% |
| Cache Refresh Failures | Background jobs | >0 |

---

*Document maintained by Integration Architecture Team*  
*Next Review: 2026-04-01*
