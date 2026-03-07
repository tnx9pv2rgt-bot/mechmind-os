# EU Architecture Blueprint for Nexo MechMind OS

> **Document Version**: 1.0.0  
> **Last Updated**: 2026-03-06  
> **Classification**: Strategic Technical Architecture  
> **Owner**: EU Compliance Architecture Team  
> **Status**: DRAFT - Pending Review

---

## Executive Summary

This document presents the master architecture blueprint for transforming Nexo MechMind OS from a generic automotive SaaS platform into a fully EU-compliant platform achieving **100/100 compliance score**. This blueprint addresses:

- **TecDoc/TecRMI Integration** - European automotive parts standardization
- **EU AI Act Compliance** - High-risk AI system governance (CRITICAL: August 2026 deadline)
- **Digital Product Passport (DPP)** - ESPR regulation compliance for automotive parts
- **E-invoicing** - Country-specific fiscal compliance (Italy SDI, France Chorus Pro, etc.)
- **GDPR Enhancement** - AI-specific data protection measures
- **UNECE WP.29** - Vehicle cybersecurity and software update compliance

---

## 1. System Architecture for EU Market

### 1.1 High-Level EU-Compliant Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    PRESENTATION LAYER                                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐    │
│  │   Next.js Web   │  │  React Native   │  │   Voice (Vapi)  │  │  Partner APIs       │    │
│  │   (24 langs)    │  │   Mobile App    │  │   (EU Region)   │  │  (TecDoc/TecRMI)    │    │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └──────────┬──────────┘    │
└───────────┼────────────────────┼────────────────────┼─────────────────────┼────────────────┘
            │                    │                    │                     │
            └────────────────────┴─────────┬──────────┴─────────────────────┘
                                           │
┌──────────────────────────────────────────┼──────────────────────────────────────────────────┐
│                                    API GATEWAY (EU Region)                                   │
│  ┌───────────────────────────────────────┼─────────────────────────────────────────────┐   │
│  │  Kong/AWS ALB (Frankfurt/Paris region)│  Rate Limit │ WAF │ DDoS Protection        │   │
│  └───────────────────────────────────────┼─────────────────────────────────────────────┘   │
└──────────────────────────────────────────┼──────────────────────────────────────────────────┘
                                           │
┌──────────────────────────────────────────┼──────────────────────────────────────────────────┐
│                         NESTJS APPLICATION LAYER (EU-Compliant)                              │
│                                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                    EU COMPLIANCE MIDDLEWARE LAYER                                     │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │   │
│  │  │ GDPR Enforcer│ │ AI Act Guard │ │  DPP Handler │ │ E-Invoicing  │ │ Audit Logger│ │   │
│  │  │   (Art 5-34) │ │(High-Risk AI)│ │ (ESPR Comp)  │ │ (Fiscal)     │ │ (Immutable) │ │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────────────────────┘   │
│                                           │                                                  │
│  ┌────────────────────────────────────────┼────────────────────────────────────────────┐    │
│  │                    FEATURE MODULES (EU-Enhanced)                                      │    │
│  │                                                                                       │    │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌─────────────────────┐   │    │
│  │  │  AI/ML Module │  │  Parts Module │  │  Billing Mod  │  │   Workshop Module   │   │    │
│  │  │  ├─ Churn Pred │  │  ├─ TecDoc WS │  │  ├─ Peppol    │  │  ├─ Inspections    │   │    │
│  │  │  ├─ Labor Est  │  │  ├─ TecRMI    │  │  ├─ SDI (IT)  │  │  ├─ Scheduling     │   │    │
│  │  │  ├─ Scheduling │  │  ├─ DPP Track │  │  ├─ Chorus(FR)│  │  ├─ Voice Booking  │   │    │
│  │  │  ├─ Doc Scan   │  │  ├─ Suppliers │  │  ├─ XRechnung │  │  ├─ OBD Integration│   │    │
│  │  │  └─ EU Risk Log│  │  └─ ETC/ACEA  │  │  └─ Factur-X  │  │  └─ Multi-lang     │   │    │
│  │  └───────────────┘  └───────────────┘  └───────────────┘  └─────────────────────┘   │    │
│  │                                                                                       │    │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌─────────────────────┐   │    │
│  │  │  Auth Module  │  │  Customer Mod │  │ Analytics Mod │  │   Compliance Mod    │   │    │
│  │  │  ├─ eIDAS 2.0 │  │  ├─ Consent   │  │  ├─ AI Metrics│  │  ├─ AI Act Portal   │   │    │
│  │  │  ├─ QWAC/QSEAL│  │  ├─ DPP View  │  │  ├─ Bias Audit│  │  ├─ DPP Registry    │   │    │
│  │  │  ├─ Strong Auth│  │  ├─ Data Exp  │  │  ├─ Explain   │  │  ├─ ETSI Reporting  │   │    │
│  │  │  └─ EUDI Wallet│  │  └─ Right2Port│  │  └─ Retention │  │  └─ Cert Management │   │    │
│  │  └───────────────┘  └───────────────┘  └───────────────┘  └─────────────────────┘   │    │
│  └────────────────────────────────────────┼────────────────────────────────────────────┘    │
│                                           │                                                  │
│  ┌────────────────────────────────────────┼────────────────────────────────────────────┐    │
│  │              EVENT-DRIVEN ARCHITECTURE (EU-Specific Events)                           │    │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐   │    │
│  │  │  AI.ACT.AUDIT  │  │  DPP.CREATED   │  │ E-INVOICE.SENT │  │ GDPR.DELETE.REQ  │   │    │
│  │  │  AI.ACT.INCIDENT│  │  DPP.UPDATED   │  │ E-INVOICE.FAIL │  │ GDPR.EXPORT.COMP │   │    │
│  │  └────────────────┘  └────────────────┘  └────────────────┘  └──────────────────┘   │    │
│  └────────────────────────────────────────┼────────────────────────────────────────────┘    │
└───────────────────────────────────────────┼──────────────────────────────────────────────────┘
                                            │
┌───────────────────────────────────────────┼──────────────────────────────────────────────────┐
│                           DATA & INTEGRATION LAYER (EU)                                      │
│                                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐   │
│  │   PostgreSQL     │  │     Redis        │  │  Blockchain      │  │   External APIs    │   │
│  │   (EU Regions)   │  │   (EU Cache)     │  │  (DPP - Private) │  │                    │   │
│  │                  │  │                  │  │                  │  │  ┌──────────────┐  │   │
│  │  ├─ RLS Policies │  │  ├─ Session Store│  │  ├─ Hyperledger │  │  │ TecDoc WS 2.0│  │   │
│  │  ├─ Encrypted PII│  │  ├─ BullMQ Jobs  │  │  ├─ Ethereum L2 │  │  │ TecRMI API   │  │   │
│  │  ├─ AI Audit Log │  │  └─ Rate Limit   │  │  └─ IPFS Storage│  │  │ Distributor  │  │   │
│  │  ├─ DPP Registry │  │                  │  │                  │  │  │   APIs       │  │   │
│  │  └─ E-Invoice Store│                  │  │                  │  │  │ Government   │  │   │
│  │                  │  │                  │  │                  │  │  │   Platforms  │  │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │  └──────────────┘  │   │
│                                                                     └────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Regional Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              EU DATA RESIDENCY ARCHITECTURE                                  │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│   ┌─────────────────────────────────┐     ┌─────────────────────────────────┐               │
│   │      EU-WEST (Primary)          │     │      EU-CENTRAL (DR)           │               │
│   │      Frankfurt (eu-west-3)      │◄───►│      Paris (eu-central-3)      │               │
│   │                                 │     │                                 │               │
│   │  ┌─────────────────────────┐    │     │  ┌─────────────────────────┐    │               │
│   │  │   Primary PostgreSQL    │    │     │  │   Replica PostgreSQL    │    │               │
│   │  │   (Multi-AZ, Encrypted) │    │     │  │   (Read Replica)        │    │               │
│   │  └─────────────────────────┘    │     │  └─────────────────────────┘    │               │
│   │                                 │     │                                 │               │
│   │  ┌─────────────────────────┐    │     │  ┌─────────────────────────┐    │               │
│   │  │   Redis Cluster         │    │     │  │   Redis Replica         │    │               │
│   │  │   (ElastiCache)         │    │     │  │   (Backup)              │    │               │
│   │  └─────────────────────────┘    │     │  └─────────────────────────┘    │               │
│   │                                 │     │                                 │               │
│   │  ┌─────────────────────────┐    │     │  ┌─────────────────────────┐    │               │
│   │  │   ECS/Fargate Cluster   │    │     │  │   ECS/Fargate (Standby) │    │               │
│   │  │   (NestJS Applications) │    │     │  │   (Failover Ready)      │    │               │
│   │  └─────────────────────────┘    │     │  └─────────────────────────┘    │               │
│   └─────────────────────────────────┘     └─────────────────────────────────┘               │
│                │                                        │                                    │
│                └────────────────┬───────────────────────┘                                    │
│                                 │                                                          │
│                    ┌────────────▼────────────┐                                              │
│                    │   Route 53 Health Check │                                              │
│                    │   (Failover Routing)    │                                              │
│                    └─────────────────────────┘                                              │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Integration Points with EU-Specific Services

### 2.1 TecDoc/TecRMI Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              TECDOC INTEGRATION ARCHITECTURE                                 │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                         TECDOC WEBSERVICE 2.0 LAYER                                  │   │
│  │                                                                                      │   │
│  │  ┌───────────────────────────────────────────────────────────────────────────────┐  │   │
│  │  │                    SOAP/REST API Client (Node.js)                              │  │   │
│  │  │                                                                                │  │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │  │   │
│  │  │  │  Parts Search│  │  Vehicle    │  │   Prices    │  │  Cross-References   │  │  │   │
│  │  │  │  (Articles)  │  │  Linkage    │  │  (Optional) │  │  (OE ↔ Aftermarket) │  │  │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘  │  │   │
│  │  │                                                                                │  │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │  │   │
│  │  │  │  Assembly   │  │  Documents  │  │   Assets    │  │     ETD/EAR         │  │  │   │
│  │  │  │  Groups     │  │  (PDF/TDS)  │  │  (Images)   │  │  (Expected Delivery)│  │  │   │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘  │  │   │
│  │  └───────────────────────────────────────────────────────────────────────────────┘  │   │
│  │                                    │                                                │   │
│  │  ┌─────────────────────────────────▼─────────────────────────────────────────────┐  │   │
│  │  │                         LOCAL CACHE LAYER                                      │  │   │
│  │  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                  │  │   │
│  │  │  │  Redis Cache   │  │  PostgreSQL    │  │   CDN (S3)     │                  │  │   │
│  │  │  │  (Hot Data)    │  │  (TecDoc Tables)│  │  (Images/PDFs) │                  │  │   │
│  │  │  │  - 24hr TTL    │  │  - Parts Cache  │  │  - 30 day TTL  │                  │  │   │
│  │  │  │  - LRU Eviction│  │  - Vehicle Links│  │  - EU Region   │                  │  │   │
│  │  │  └────────────────┘  └────────────────┘  └────────────────┘                  │  │   │
│  │  └───────────────────────────────────────────────────────────────────────────────┘  │   │
│  │                                    │                                                │   │
│  │  ┌─────────────────────────────────▼─────────────────────────────────────────────┐  │   │
│  │  │                      BACKGROUND SYNC JOBS (BullMQ)                             │  │   │
│  │  │                                                                                │  │   │
│  │  │  • Daily Parts Price Updates                                                   │  │   │
│  │  │  • Weekly Vehicle Database Sync                                                │  │   │
│  │  │  • Monthly Asset Refresh                                                       │  │   │
│  │  │  • Real-time Cross-Reference Updates                                           │  │   │
│  │  └───────────────────────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                         TECRMI INTEGRATION LAYER                                     │   │
│  │                                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐ │   │
│  │  │ Maintenance │  │   Repair    │  │   Wiring    │  │     Labor Times (SMR)       │ │   │
│  │  │  Schedules  │  │  Manuals    │  │  Diagrams   │  │  - Standard Times           │ │   │
│  │  │  (Wartung)  │  │  (Reparatur)│  │  (Schaltpl.)│  │  - Vehicle-Specific         │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │  - Skill Level Adjust       │ │   │
│  │                                                     └─────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Digital Product Passport (DPP) Integration

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                          DIGITAL PRODUCT PASSPORT ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│  │                         DPP DATA COLLECTION LAYER                                    │   │
│  │                                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │   │
│  │  │   Supplier  │  │    OBD      │  │   Manual    │  │      Certification          │  │   │
│  │  │    APIs     │  │  Telemetry  │  │    Entry    │  │       Bodies                │  │   │
│  │  │             │  │             │  │             │  │                             │  │   │
│  │  │ • Temot     │  │ • Emissions │  │ • Parts     │  │ • TÜV                       │  │   │
│  │  │ • Groupauto │  │ • Wear Data │  │ • Labor     │  │ • DEKRA                     │  │   │
│  │  │ • Nexus     │  │ • Recalls   │  │ • Materials │  │ • Bureau Veritas            │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────────────┬───────────────┘  │   │
│  │         │                │                │                       │                  │   │
│  │         └────────────────┴────────────────┴───────────────────────┘                  │   │
│  │                                    │                                                 │   │
│  │  ┌─────────────────────────────────▼───────────────────────────────────────────────┐  │   │
│  │  │                         DPP COMPOSITION ENGINE                                   │  │   │
│  │  │                                                                                │  │   │
│  │  │  ┌─────────────────────────────────────────────────────────────────────────┐  │  │   │
│  │  │  │                    DPP Data Model (JSON-LD + ESPR Schema)                │  │  │   │
│  │  │  │                                                                             │  │  │   │
│  │  │  │  {                                                                          │  │  │   │
│  │  │  │    "@context": "https://europa.eu/dpp/context/v1",                        │  │  │   │
│  │  │  │    "productIdentifier": "urn:epc:id:sgtin:...",                          │  │  │   │
│  │  │  │    "sustainability": { ... },                                             │  │  │   │
│  │  │  │    "circularity": { ... },                                                │  │  │   │
│  │  │  │    "compliance": { ... },                                                 │  │  │   │
│  │  │  │    "carbonFootprint": { ... },                                            │  │  │   │
│  │  │  │    "repairInformation": { ... },                                          │  │  │   │
│  │  │  │    "supplyChain": { ... }                                                 │  │  │   │
│  │  │  │  }                                                                          │  │  │   │
│  │  │  └─────────────────────────────────────────────────────────────────────────┘  │  │   │
│  │  └───────────────────────────────────────────────────────────────────────────────┘  │   │
│  │                                    │                                                 │   │
│  │  ┌─────────────────────────────────▼───────────────────────────────────────────────┐  │   │
│  │  │                      BLOCKCHAIN REGISTRATION (Hyperledger Fabric)                │  │   │
│  │  │                                                                                │  │   │
│  │  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                  │  │   │
│  │  │  │   EU Node 1    │  │   EU Node 2    │  │   EU Node 3    │  ← EU DPP Nodes  │  │   │
│  │  │  │   (Frankfurt)  │  │   (Paris)      │  │   (Amsterdam)  │                  │  │   │
│  │  │  └────────────────┘  └────────────────┘  └────────────────┘                  │  │   │
│  │  │                                                                                │  │   │
│  │  │  Smart Contract Functions:                                                     │  │   │
│  │  │  • registerDPP()        • updateDPP()        • verifyDPP()                     │  │   │
│  │  │  • transferOwnership()  • retireDPP()        • queryHistory()                  │  │   │
│  │  └───────────────────────────────────────────────────────────────────────────────┘  │   │
│  │                                    │                                                 │   │
│  │  ┌─────────────────────────────────▼───────────────────────────────────────────────┐  │   │
│  │  │                         DPP ACCESS LAYER                                         │  │   │
│  │  │                                                                                │  │   │
│  │  │  • QR Code Generation (Data Matrix / GS1 Digital Link)                        │  │   │
│  │  │  • Public DPP Portal (Consumer Access)                                        │  │   │
│  │  │  • Workshop Integration (B2B Access)                                          │  │   │
│  │  │  • Regulatory Reporting (Authority Access)                                    │  │   │
│  │  └───────────────────────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow Diagrams

### 3.1 EU AI Act High-Risk AI System Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                    EU AI ACT HIGH-RISK AI SYSTEM DATA FLOW                                   │
│                    (Annex III - Biometric, Critical Infrastructure, etc.)                    │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│   User Request                                  AI Processing                                │
│        │                                             │                                       │
│        ▼                                             ▼                                       │
│   ┌─────────┐    ┌──────────────┐    ┌───────────────────────────┐    ┌─────────────┐       │
│   │ Request │───►│  AI Act Gate │───►│   Risk Assessment Engine  │───►│   AI/ML     │       │
│   │ Input   │    │  (Pre-check) │    │   (Real-time Scoring)     │    │   Service   │       │
│   └─────────┘    └──────────────┘    └───────────────────────────┘    └──────┬──────┘       │
│        │                     │                      │                        │              │
│        │                     │    ┌─────────────────┼────────────────┐       │              │
│        │                     │    ▼                 ▼                ▼       │              │
│        │                     │ ┌────────┐    ┌──────────┐    ┌──────────┐    │              │
│        │                     │ │ Prohibited?│    │ High-Risk? │    │ Limited? │    │              │
│        │                     │ │ (REJECT)   │    │ (ENHANCED) │    │ (LOG)    │    │              │
│        │                     │ └────────┘    └──────────┘    └──────────┘    │              │
│        │                     │                      │                        │              │
│        │                     └──────────────────────┘                        │              │
│        │                                            │                         │              │
│        ▼                                            ▼                         ▼              │
│   ┌─────────┐                              ┌──────────────────┐    ┌─────────────┐          │
│   │  Audit  │◄─────────────────────────────│  AI Decision Log │◄───│ AI Output   │          │
│   │  Trail  │                              │  (Immutable)     │    │ (Response)  │          │
│   └────┬────┘                              └──────────────────┘    └──────┬─────┘          │
│        │                                                                  │                 │
│        │                    ┌────────────────────────────────────────────┘                 │
│        │                    │                                                               │
│        ▼                    ▼                                                               │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐       │
│   │                         POST-PROCESSING LAYER                                    │       │
│   │                                                                                  │       │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │       │
│   │  │  Explainable │  │   Bias Check │  │  Human       │  │  Incident Detection  │ │       │
│   │  │  AI (XAI)    │  │   (Fairness) │  │  Oversight   │  │  (Anomaly Detection) │ │       │
│   │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────────┘ │       │
│   └─────────────────────────────────────────────────────────────────────────────────┘       │
│        │                                                                                     │
│        ▼                                                                                     │
│   ┌─────────┐                                                                                │
│   │  User   │                                                                                │
│   │ Response│                                                                                │
│   └─────────┘                                                                                │
│                                                                                              │
│   LEGEND:                                                                                    │
│   ─────────────────────────────────────────────────────────────────────────────────────      │
│   • All AI decisions logged with: Input, Output, Confidence, Timestamp, User ID             │
│   • Human oversight triggered for high-risk scenarios                                        │
│   • 6-year retention required for high-risk AI systems (Article 12)                          │
│   • Regular bias audits (Article 10)                                                         │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 E-Invoicing Flow (Multi-Country)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                         E-INVOICING DATA FLOW (EU-WIDE)                                      │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│   Workshop                                  Nexo Platform                 Government          │
│      │                                          │                           Platform          │
│      │  1. Create Invoice                       │                             │               │
│      │─────────────────────────────────────────►│                             │               │
│      │                                          │                             │               │
│      │  2. Validate Invoice Data                │                             │               │
│      │◄─────────────────────────────────────────│                             │               │
│      │                                          │                             │               │
│      │  3. Confirm & Submit                     │                             │               │
│      │─────────────────────────────────────────►│                             │               │
│      │                                          │                             │               │
│      │                                          │────┐  4. Country Detection  │               │
│      │                                          │    │    (VAT Number)        │               │
│      │                                          │◄───┘                        │               │
│      │                                          │                             │               │
│      │                                          │  ┌─────────────────────────┐│               │
│      │                                          │  │   FORMAT CONVERSION     ││               │
│      │                                          │  │  ┌───────────────────┐  ││               │
│      │                                          │  │  │  Italy → FatturaPA │  ││               │
│      │                                          │  │  │  France → Factur-X │  ││               │
│      │                                          │  │  │  Germany → XRechnung│ ││               │
│      │                                          │  │  │  EU → EN 16931     │  ││               │
│      │                                          │  │  │  Peppol → BIS 3.0  │  ││               │
│      │                                          │  │  └───────────────────┘  ││               │
│      │                                          │  └─────────────────────────┘│               │
│      │                                          │                             │               │
│      │                                          │  ┌─────────────────────────┐│               │
│      │                                          │  │   DIGITAL SIGNATURE     ││               │
│      │                                          │  │  • XAdES (Italy)        ││               │
│      │                                          │  │  • CAdES (France)       ││               │
│      │                                          │  │  • PAdES (Germany)      ││               │
│      │                                          │  │  • Qualified ETSI       ││               │
│      │                                          │  └─────────────────────────┘│               │
│      │                                          │                             │               │
│      │                                          │  5. Transmit Invoice        │               │
│      │                                          │─────────────────────────────►│               │
│      │                                          │                             │               │
│      │                                          │  6. Delivery Receipt        │               │
│      │                                          │◄─────────────────────────────│               │
│      │                                          │                             │               │
│      │  7. Update Status                        │                             │               │
│      │◄─────────────────────────────────────────│                             │               │
│      │                                          │                             │               │
│      │                                          │  8. Async Response          │               │
│      │                                          │◄─────────────────────────────│               │
│      │  9. Notify User                          │                             │               │
│      │◄─────────────────────────────────────────│                             │               │
│      │                                          │                             │               │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              SUPPORTED E-INVOICING FORMATS                                   │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  Country    │ Format          │ Standard      │ Gateway        │ Signature    │ Status       │
│  ───────────┼─────────────────┼───────────────┼────────────────┼──────────────┼──────────────│
│  Italy      │ FatturaPA       │ SDI           │ SDI (Agenzia   │ XAdES-EPES   │ Mandatory    │
│             │                 │ XML 1.2.2     │ Entrate)       │              │ B2B/B2C      │
│  ───────────┼─────────────────┼───────────────┼────────────────┼──────────────┼──────────────│
│  France     │ Factur-X        │ EN 16931      │ Chorus Pro     │ CAdES-BES    │ Mandatory    │
│             │                 │ (Hybrid PDF)  │                │              │ B2G          │
│  ───────────┼─────────────────┼───────────────┼────────────────┼──────────────┼──────────────│
│  Germany    │ XRechnung       │ EN 16931      │ ZRE/OZG-RE     │ XML-DSig     │ Mandatory    │
│             │                 │ (CII/UBL)     │                │              │ B2G          │
│  ───────────┼─────────────────┼───────────────┼────────────────┼──────────────┼──────────────│
│  Spain      │ FacturaE        │ EN 16931      │ FACe           │ XAdES-EPES   │ Mandatory    │
│             │                 │               │                │              │ B2G          │
│  ───────────┼─────────────────┼───────────────┼────────────────┼──────────────┼──────────────│
│  Poland     │ FA_VAT          │ EN 16931      │ KSeF           │ XML-DSig     │ Mandatory    │
│             │                 │               │                │              │ B2B/B2C      │
│  ───────────┼─────────────────┼───────────────┼────────────────┼──────────────┼──────────────│
│  EU-Wide    │ Peppol BIS 3.0  │ EN 16931      │ Peppol         │ AS4          │ Voluntary    │
│             │                 │               │ Network        │              │ B2B          │
│  ───────────┼─────────────────┼───────────────┼────────────────┼──────────────┼──────────────│
│  General    │ ZUGFeRD         │ EN 16931      │ Direct/Email   │ PDF/A-3      │ Voluntary    │
│             │                 │               │                │              │ B2B          │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Security Architecture for EU Regulations

### 4.1 Zero-Trust Security Model

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                         ZERO-TRUST SECURITY ARCHITECTURE (EU)                                │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│                              ┌─────────────────────────┐                                     │
│                              │      NEVER TRUST       │                                     │
│                              │      ALWAYS VERIFY     │                                     │
│                              └─────────────────────────┘                                     │
│                                         │                                                    │
│    ┌────────────────────────────────────┼────────────────────────────────────┐               │
│    │                                    │                                    │               │
│    ▼                                    ▼                                    ▼               │
│ ┌──────────┐                      ┌──────────┐                      ┌──────────┐             │
│ │ Identity │                      │  Device  │                      │ Network  │             │
│ │ Verify   │                      │  Verify  │                      │ Segment  │             │
│ └────┬─────┘                      └────┬─────┘                      └────┬─────┘             │
│      │                                 │                                 │                   │
│      ▼                                 ▼                                 ▼                   │
│ ┌─────────────────────────────────────────────────────────────────────────────────────┐     │
│ │                              SECURITY CONTROL LAYERS                                 │     │
│ │                                                                                      │     │
│ │  Layer 1: Identity (eIDAS 2.0 / EUDI Wallet)                                        │     │
│ │  ┌─────────────────────────────────────────────────────────────────────────────┐    │     │
│ │  │  • Strong Customer Authentication (SCA) - PSD2                                │    │     │
│ │  │  • Multi-factor Authentication (MFA) - TOTP/SMS/Biometric                     │    │     │
│ │  │  • eIDAS Qualified Certificates (QWAC/QSEAL)                                  │    │     │
│ │  │  • EUDI Wallet Integration (European Digital Identity)                        │    │     │
│ │  └─────────────────────────────────────────────────────────────────────────────┘    │     │
│ │                                                                                      │     │
│ │  Layer 2: Application Security                                                       │     │
│ │  ┌─────────────────────────────────────────────────────────────────────────────┐    │     │
│ │  │  • OWASP Top 10 Protection (WAF)                                              │    │     │
│ │  │  • API Rate Limiting (429 Protection)                                         │    │     │
│ │  │  • Input Validation & Sanitization                                            │    │     │
│ │  │  • JWT Token Security (RS256, Short Expiry)                                   │    │     │
│ │  │  • HMAC for Webhooks (Voice/Partner APIs)                                     │    │     │
│ │  └─────────────────────────────────────────────────────────────────────────────┘    │     │
│ │                                                                                      │     │
│ │  Layer 3: Data Protection (GDPR + AI Act)                                           │     │
│ │  ┌─────────────────────────────────────────────────────────────────────────────┐    │     │
│ │  │  • Encryption at Rest: AES-256-GCM (PostgreSQL TDE)                           │    │     │
│ │  │  • Encryption in Transit: TLS 1.3 (Minimum)                                   │    │     │
│ │  │  • PII Field-Level Encryption (Customer Data)                                 │    │     │
│ │  │  • AI Training Data Anonymization                                             │    │     │
│ │  │  • Data Residency Enforcement (EU-Only Storage)                               │    │     │
│ │  │  • Right to Erasure Automation                                                │    │     │
│ │  └─────────────────────────────────────────────────────────────────────────────┘    │     │
│ │                                                                                      │     │
│ │  Layer 4: Infrastructure Security                                                    │     │
│ │  ┌─────────────────────────────────────────────────────────────────────────────┐    │     │
│ │  │  • VPC Isolation (Private Subnets)                                            │    │     │
│ │  │  • Security Groups (Least Privilege)                                          │    │     │
│ │  │  • DDoS Protection (AWS Shield / CloudFlare)                                  │    │     │
│ │  │  • Container Security (Scanning/No Root)                                      │    │     │
│ │  │  • Secrets Management (AWS Secrets Manager / HashiCorp Vault)                 │    │     │
│ │  └─────────────────────────────────────────────────────────────────────────────┘    │     │
│ │                                                                                      │     │
│ │  Layer 5: AI System Security (EU AI Act)                                            │     │
│ │  ┌─────────────────────────────────────────────────────────────────────────────┐    │     │
│ │  │  • Model Input Validation (Prompt Injection Prevention)                       │    │     │
│ │  │  • Model Output Filtering (Harmful Content Detection)                         │    │     │
│ │  │  • Training Data Integrity Verification                                       │    │     │
│ │  │  • Adversarial Attack Detection                                               │    │     │
│ │  │  • Explainability Layer (XAI)                                                 │    │     │
│ │  │  • Human-in-the-Loop for Critical Decisions                                   │    │     │
│ │  └─────────────────────────────────────────────────────────────────────────────┘    │     │
│ └─────────────────────────────────────────────────────────────────────────────────────┘     │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 AI Act Security Controls

| Control Category | Requirement | Implementation | Priority |
|------------------|-------------|----------------|----------|
| **Risk Management** | Article 9 - Risk Management System | Continuous risk assessment with automated scoring | CRITICAL |
| **Data Governance** | Article 10 - Training Data Quality | Data validation pipelines, bias detection, provenance tracking | CRITICAL |
| **Transparency** | Article 13 - Instructions for Use | AI decision explanations, confidence scores, limitations | HIGH |
| **Human Oversight** | Article 14 - Human Oversight | Real-time monitoring dashboard, override capabilities | HIGH |
| **Accuracy** | Article 15 - Accuracy, Robustness, Cybersecurity | Model performance monitoring, adversarial testing | HIGH |
| **Record Keeping** | Article 12 - Record Keeping | Immutable audit logs, 6-year retention | CRITICAL |
| **Conformity** | Article 19 - Conformity Assessment | CE marking process, notified body engagement | CRITICAL |

---

## 5. Integration Architecture Summary

### 5.1 Key EU Integration Points

| System | Protocol | Authentication | Data Residency | Status |
|--------|----------|----------------|----------------|--------|
| **TecDoc WebService 2.0** | SOAP/XML | API Key + IP Whitelist | EU (Germany) | Required |
| **TecRMI API** | REST/JSON | OAuth 2.0 | EU (Germany) | Required |
| **SDI Italy** | SOAP + PEC | Digital Signature (XAdES) | Italy | Required |
| **Chorus Pro France** | REST + SFTP | Oauth 2.0 + Certificate | France | Required |
| **Peppol Network** | AS4/ebXML | PKI Certificates | EU | Recommended |
| **EU DPP Registry** | REST/JSON | eIDAS Certificate | EU | Required 2027 |
| **eIDAS 2.0** | OIDC/SAML | EUDI Wallet | EU | Future |

### 5.2 Data Sovereignty Compliance

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              DATA SOVEREIGNTY MATRIX                                         │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  Data Category         │ Primary Location │ Backup Location │ Cross-Border │ Encryption     │
│  ──────────────────────┼──────────────────┼─────────────────┼──────────────┼────────────────│
│  Customer PII          │ EU-West (DE)     │ EU-Central (FR) │ No           │ AES-256-GCM    │
│  AI Training Data      │ EU-West (DE)     │ EU-Central (FR) │ No           │ AES-256-GCM    │
│  AI Audit Logs         │ EU-West (DE)     │ EU-Central (FR) │ No           │ AES-256-GCM    │
│  DPP Records           │ Blockchain (EU)  │ IPFS (EU Nodes) │ No           │ On-chain Hash  │
│  E-Invoices            │ Per Country      │ EU-Central      │ No           │ XAdES/CAdES    │
│  TecDoc Cache          │ EU-West (DE)     │ Edge (EU)       │ No           │ TLS 1.3        │
│  Session Data          │ EU-West (DE)     │ EU-Central (FR) │ No           │ Redis AUTH     │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Implementation Phases

### Phase 1: Foundation (Months 1-3)
- EU data residency setup (Frankfurt/Paris)
- TecDoc WebService 2.0 integration
- Basic e-invoicing (Italy SDI)
- GDPR enhancement for AI

### Phase 2: AI Act Compliance (Months 4-8) - CRITICAL
- Risk management system
- AI audit logging
- Human oversight interface
- Conformity assessment preparation

### Phase 3: Digital Product Passport (Months 6-12)
- DPP data collection
- Blockchain integration
- Supplier API connections
- Consumer portal

### Phase 4: Full EU Coverage (Months 9-18)
- All e-invoicing formats
- eIDAS 2.0 integration
- Complete TecRMI integration
- Multi-language (24 languages)

---

## Appendix A: EU Regulatory References

| Regulation | Reference | Effective Date | Nexo Impact |
|------------|-----------|----------------|-------------|
| EU AI Act | Regulation (EU) 2024/1689 | Aug 2026 (High-Risk) | CRITICAL |
| ESPR | Regulation (EU) 2024/1781 | 2027 (DPP mandatory) | HIGH |
| GDPR | Regulation (EU) 2016/679 | Active | HIGH |
| eIDAS 2.0 | Regulation (EU) 2024/1183 | 2026 | MEDIUM |
| UNECE WP.29 | R155/R156 | Active (Vehicle) | MEDIUM |
| EN 16931 | European Standard | Active (E-invoicing) | HIGH |
| TecDoc Standard | TAF 3.0 | Active | REQUIRED |

---

*Document maintained by EU Compliance Architecture Team*  
*Next Review: 2026-06-01*
