# MechMind OS v10 - Voice AI Architecture Documentation

## Executive Summary

This document provides comprehensive technical documentation for the MechMind OS Voice AI Platform, a production-grade conversational AI system designed for Italian automotive repair shops. The architecture leverages Vapi.ai for voice orchestration, Twilio for PSTN connectivity, and a multi-layer fallback strategy ensuring 99.9% call handling reliability.

**Version:** 10.0.0  
**Last Updated:** 2026-02-28  
**Classification:** Internal Engineering Documentation

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Vapi.ai Integration](#2-vapiai-integration)
3. [Intent Handler System](#3-intent-handler-system)
4. [Tools Layer](#4-tools-layer)
5. [Twilio Integration](#5-twilio-integration)
6. [Multi-Layer Fallback Strategy](#6-multi-layer-fallback-strategy)
7. [Webhook Processing & Security](#7-webhook-processing--security)
8. [Performance & Latency](#8-performance--latency)
9. [Operational Runbooks](#9-operational-runbooks)

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           MECHMIND OS V10 - VOICE AI PLATFORM                        │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   ┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐                │
│   │   PSTN/GSM   │────►│  Twilio Voice   │────►│   Vapi.ai AI     │                │
│   │   Network    │     │   Platform      │     │   Orchestrator   │                │
│   └──────────────┘     └────────┬────────┘     └────────┬─────────┘                │
│                                  │                       │                          │
│                                  │    WebSocket/SIP      │ Webhooks                 │
│                                  │                       ▼                          │
│                                  │            ┌────────────────────┐               │
│                                  │            │  Voice AI Layer    │               │
│                                  │            │  (This System)     │               │
│                                  │            └─────────┬──────────┘               │
│                                  │                      │                          │
│                                  │         ┌────────────┼────────────┐             │
│                                  │         ▼            ▼            ▼             │
│                                  │    ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│                                  │    │ Intents │  │  Tools  │  │Fallback │       │
│                                  │    │Handler  │  │  Layer  │  │ Manager │       │
│                                  │    └────┬────┘  └────┬────┘  └────┬────┘       │
│                                  │         └────────────┼────────────┘             │
│                                  │                      │                          │
│                                  │                      ▼                          │
│                                  │            ┌────────────────────┐               │
│                                  │            │   Backend API      │               │
│                                  │            │  (Core Platform)   │               │
│                                  │            └────────────────────┘               │
│                                  │                                                  │
│                                  └────────────────────────────────► SMS Gateway     │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         CALL LIFECYCLE FLOW                                          │
└─────────────────────────────────────────────────────────────────────────────────────┘

[CALLER]          [TWILIO]           [VAPI]            [VOICE LAYER]        [BACKEND]
   │                  │                 │                     │                  │
   │─── Dial ────────►│                 │                     │                  │
   │                  │─── Init Call ──►│                     │                  │
   │                  │                 │──── call.started ──►│                  │
   │                  │                 │                     │── Lookup Cust ──►│
   │                  │                 │                     │◄─────────────────│
   │                  │                 │◄─── Response ───────│                  │
   │                  │◄── TwiML ──────│                     │                  │
   │◄── Greeting ─────│                 │                     │                  │
   │                  │                 │                     │                  │
   │── "Prenota..." ─►│                 │                     │                  │
   │                  │── Transcript ──►│                     │                  │
   │                  │                 │── function_call ──►│                  │
   │                  │                 │                     │── Get Slots ────►│
   │                  │                 │                     │◄─────────────────│
   │                  │                 │◄── Result ─────────│                  │
   │                  │◄── Response ───│                     │                  │
   │◄── Slots list ───│                 │                     │                  │
   │                  │                 │                     │                  │
   │── Select slot ──►│                 │                     │                  │
   │                  │                 │── function_call ──►│                  │
   │                  │                 │                     │── Create Book ──►│
   │                  │                 │                     │◄─────────────────│
   │                  │                 │───── SMS sent ─────►│── Send SMS ─────►│
   │                  │                 │                     │                  │
   │                  │                 │◄── Confirmation ───│                  │
   │◄── Confirmed ────│                 │                     │                  │
   │                  │                 │                     │                  │
```

---

## 2. Vapi.ai Integration

### 2.1 Configuration Architecture

The Vapi.ai integration is configured via `vapi-config.json`, implementing a declarative configuration pattern for the AI assistant "MechSecretary".

#### 2.1.1 Model Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| Provider | Groq | LPU (Language Processing Unit) inference |
| Model | llama-3.1-70b-versatile | 70B parameter MoE model |
| Temperature | 0.7 | Balanced creativity/consistency |
| Max Tokens | 150 | Optimal for voice responses |
| API Key | `{{GROQ_API_KEY}}` | Injected via environment |

```javascript
// Model Configuration Structure
{
  "assistant": {
    "name": "MechSecretary",
    "model": {
      "provider": "groq",
      "model": "llama-3.1-70b-versatile",
      "temperature": 0.7,
      "maxTokens": 150,
      "apiKey": "{{GROQ_API_KEY}}"
    }
  }
}
```

**Rationale for Groq LPU:**
- **Latency:** <100ms token generation (vs 300-500ms GPU)
- **Throughput:** 500+ tokens/second sustained
- **Cost:** 10x lower per token vs GPT-4
- **Privacy:** EU data residency compliance

#### 2.1.2 Voice Configuration (ElevenLabs)

| Parameter | Value | Impact |
|-----------|-------|--------|
| Provider | 11labs | Premium voice synthesis |
| Voice ID | alice | Female Italian-optimized |
| Model | eleven_turbo_v2_5 | Lowest latency model |
| Stability | 0.5 | Natural variation |
| Similarity Boost | 0.75 | Clarity enhancement |
| Speed | 1.1 | Slightly faster than normal |
| Filler Injection | true | Natural conversation flow |
| Optimize Latency | 3 | Maximum optimization |

```javascript
{
  "voice": {
    "provider": "11labs",
    "voiceId": "alice",
    "model": "eleven_turbo_v2_5",
    "stability": 0.5,
    "similarityBoost": 0.75,
    "speed": 1.1,
    "fillerInjectionEnabled": true,
    "punctuationBoundaries": [".", ",", "?", "!", ";", ":"],
    "optimizeStreamingLatency": 3
  }
}
```

#### 2.1.3 Streaming & Transcription Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| Transcriber Provider | Deepgram | Best-in-class ASR |
| Model | nova-2 | Latest multilingual model |
| Language | it | Italian language pack |
| Smart Format | true | Auto-punctuation |
| Endpointing | 250ms | VAD silence threshold |
| VAD Mode | aggressive | Fast turn detection |
| Silence Threshold | 300ms | End-of-speech detection |
| Speech Threshold | 150ms | Start-of-speech detection |

```javascript
{
  "streaming": {
    "enabled": true,
    "provider": "deepgram",
    "model": "nova-2",
    "language": "it",
    "smartFormat": true,
    "interimResults": true
  },
  "transcriber": {
    "provider": "deepgram",
    "model": "nova-2",
    "language": "it",
    "smartFormat": true,
    "endpointing": 250,
    "vad": {
      "mode": "aggressive",
      "silenceThreshold": 300,
      "speechThreshold": 150
    }
  }
}
```

### 2.2 Function Definitions

The system exposes 7 functions to the AI assistant:

#### Function Registry

```javascript
const FUNCTION_REGISTRY = {
  // Customer Identification
  lookup_customer_by_phone: {
    description: "Cerca cliente nel database per numero telefonico",
    parameters: {
      phone_number: { type: "string", format: "E.164" }
    },
    latency_sla: "<500ms",
    cache_ttl: "5min"
  },
  
  // Vehicle Information
  get_vehicle_history: {
    description: "Recupera storico veicolo e ultimi interventi",
    parameters: {
      customer_id: { type: "string", required: true },
      license_plate: { type: "string", optional: true }
    },
    latency_sla: "<800ms"
  },
  
  // Availability
  get_available_slots: {
    description: "Ottiene slot disponibili per prenotazione",
    parameters: {
      shop_id: { type: "string", required: true },
      service_type: { type: "string", enum: ["revisione", "tagliando", "riparazione", "emergenza"] },
      days_ahead: { type: "integer", default: 14 },
      urgency: { type: "string", enum: ["low", "medium", "high", "emergency"] }
    },
    latency_sla: "<1s"
  },
  
  // Booking Operations
  create_booking: {
    description: "Crea una nuova prenotazione",
    parameters: {
      customer_id: { type: "string", required: true },
      shop_id: { type: "string", required: true },
      vehicle_id: { type: "string", required: true },
      service_type: { type: "string", required: true },
      scheduled_at: { type: "string", format: "ISO 8601" },
      duration_minutes: { type: "integer", default: 60 },
      notes: { type: "string" },
      urgency: { type: "string", enum: ["low", "medium", "high", "emergency"] }
    },
    latency_sla: "<1.5s",
    idempotency_key: "customer_id + scheduled_at"
  },
  
  // Status Check
  check_booking_status: {
    description: "Verifica stato lavorazione veicolo",
    parameters: {
      customer_id: { type: "string", required: true },
      license_plate: { type: "string", optional: true }
    },
    latency_sla: "<600ms"
  },
  
  // Escalation
  escalate_to_human: {
    description: "Trasferisce chiamata a operatore umano",
    parameters: {
      reason: { type: "string", required: true },
      priority: { type: "string", enum: ["low", "normal", "high", "urgent"], default: "normal" },
      context: { type: "string" }
    },
    latency_sla: "<2s"
  },
  
  // Notifications
  send_sms_confirmation: {
    description: "Invia SMS di conferma prenotazione",
    parameters: {
      phone_number: { type: "string", format: "E.164" },
      booking_id: { type: "string", required: true },
      message_type: { type: "string", enum: ["confirmation", "reminder", "cancellation", "ready"] }
    },
    latency_sla: "async (<10s)"
  }
};
```

### 2.3 Optimization Parameters

| Parameter | Min | Max | Adaptive | Purpose |
|-----------|-----|-----|----------|---------|
| responseDelay | 0ms | 100ms | Yes | Natural conversation pacing |
| llmRequestDelay | 0ms | 50ms | Yes | Reduce token consumption |
| silenceTimeout | - | 30s | - | Call abandonment detection |
| maxDuration | - | 600s | - | Prevent runaway calls |

```javascript
{
  "responseDelay": {
    "min": 0,
    "max": 100,
    "adaptive": true  // AI adjusts based on conversation flow
  },
  "llmRequestDelay": {
    "min": 0,
    "max": 50
  },
  "silenceTimeoutSeconds": 30,
  "maxDurationSeconds": 600
}
```

---

## 3. Intent Handler System

### 3.1 Intent Detection Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTENT DETECTION PIPELINE                     │
└─────────────────────────────────────────────────────────────────┘

[Transcript Input]
       │
       ▼
┌──────────────────────┐
│ Regex Pattern Match  │──── Pattern scoring
│ (Primary Detection)  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Confidence Scoring   │──── Position × Length × Keyword weight
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐     No match ───► Unknown Intent Handler
│ Threshold Check      │
│ (Confidence > 0.7)   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Intent Router        │──── Route to appropriate handler
└──────────┬───────────┘
           │
    ┌──────┴──────┬──────────┬──────────┐
    ▼             ▼          ▼          ▼
[Booking]    [Status]   [Complaint]  [General]
```

### 3.2 Booking Intent Handler

**File:** `intents/booking-intent.js`

#### Intent Patterns

```javascript
const BOOKING_PATTERNS = {
  new_booking: [
    /(?:prenot|vorrei|voglio|devo|ho bisogno).{0,30}(?:prenot|appunt|visita|controllo)/i,
    /(?:revisione|tagliando|cambio|riparazione|gomme)/i,
    /(?:quando|quanto).{0,20}(?:libero|disponibile|posto)/i
  ],
  
  modify_booking: [
    /(?:spost|modific|cambi).{0,30}(?:prenot|appunt)/i,
    /(?:non posso|non riesco).{0,20}(?:venire|presentarmi)/i,
    /(?:altro|diverso).{0,10}(?:giorno|orario|ora)/i
  ],
  
  cancel_booking: [
    /(?:cancell|annull|elimin).{0,30}(?:prenot|appunt)/i,
    /(?:non serve più|non ho più bisogno)/i
  ],
  
  check_availability: [
    /(?:quando|quali).{0,20}(?:libero|disponibile|orari)/i,
    /(?:avete|ci sono).{0,20}(?:posto|slot)/i
  ]
};
```

#### Booking Flow State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                    BOOKING FLOW STATE MACHINE                    │
└─────────────────────────────────────────────────────────────────┘

                         ┌─────────────┐
                         │    START    │
                         └──────┬──────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Customer Lookup      │
                    │  (by phone)           │
                    └───────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                                   │
              ▼                                   ▼
    ┌─────────────────┐                ┌─────────────────┐
    │ Existing        │                │ New Customer    │
    │ Customer        │                │                 │
    └────────┬────────┘                └────────┬────────┘
             │                                  │
             ▼                                  ▼
    ┌─────────────────┐                ┌─────────────────┐
    │ Select Vehicle  │                │ Collect Info    │
    │ (if multiple)   │                │ (name, email)   │
    └────────┬────────┘                └────────┬────────┘
             │                                  │
             └────────────────┬─────────────────┘
                              │
                              ▼
                    ┌───────────────────────┐
                    │  Service Type         │
                    │  Detection            │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Urgency Assessment   │
                    │  (extract keywords)   │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Slot Query           │
                    │  (backend API)        │
                    └───────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                                   │
              ▼                                   ▼
    ┌─────────────────┐                ┌─────────────────┐
    │ Slots Found     │                │ No Slots        │
    └────────┬────────┘                └────────┬────────┘
             │                                  │
             ▼                                  ▼
    ┌─────────────────┐                ┌─────────────────┐
    │ Present Options │                │ Offer Waitlist  │
    └────────┬────────┘                └────────┬────────┘
             │                                  │
             ▼                                  ▼
    ┌─────────────────┐                ┌─────────────────┐
    │ Confirm Booking │                │ Schedule        │
    │ Create Record   │                │ Callback        │
    └────────┬────────┘                └────────┬────────┘
             │                                  │
             └────────────────┬─────────────────┘
                              │
                              ▼
                    ┌───────────────────────┐
                    │  Send SMS             │
                    │  Confirmation         │
                    └───────────┬───────────┘
                                │
                                ▼
                         ┌─────────────┐
                         │    END      │
                         └─────────────┘
```

#### Service Type Extraction

```javascript
function extractServiceType(transcript) {
  const patterns = {
    'revisione': /revisione/i,
    'tagliando': /tagliando/i,
    'riparazione': /riparazione|guasto|rotto|non funziona/i,
    'gomme': /gomm|pneumatic|ruote/i,
    'elettronica': /elettronic|batteria|sensor|spia/i,
    'carrozzeria': /carrozzeri|ammacc|graffi|vernice/i,
    'emergenza': /emergenza|urgente|subito|immediat|fumo|perdita/i
  };
  
  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(transcript)) return type;
  }
  return null; // Requires clarification
}
```

### 3.3 Status Intent Handler

**File:** `intents/status-intent.js`

#### Status Workflows

| Status | Italian Description | Response Pattern |
|--------|---------------------|------------------|
| pending | in attesa di inizio | "Prenotazione confermata per [data]" |
| confirmed | confermata | "Ti aspettiamo [data] alle [ora]" |
| checked_in | consegnata | "Veicolo consegnato, entra in officina a breve" |
| in_progress | in lavorazione | "Siamo al [X]%, completamento previsto per [ora]" |
| waiting_parts | in attesa ricambi | "In attesa pezzi, arrivo stimato [data]" |
| quality_check | in controllo qualità | "Controllo finale in corso" |
| ready | pronta per il ritiro | "Buone notizie! Pronta per il ritiro" |
| completed | completata | "Lavorazione completata, grazie!" |

### 3.4 Complaint Intent Handler

**File:** `intents/complaint-intent.js`

#### Sentiment Analysis Algorithm

```javascript
const SENTIMENT_THRESHOLDS = {
  MILD: -0.3,      // De-escalation response
  MODERATE: -0.6,  // Prepare escalation
  SEVERE: -0.8     // Immediate escalation
};

function calculateSentimentScore(transcript) {
  const negativeWords = {
    severe: ['denunci', 'avvocat', 'tribunal', 'legge', 'scandalo', 'vergogn', 'furios', 'arrabbiatissimo'],
    moderate: ['arrabbiat', 'delus', 'insoddisfatt', 'stanco', 'frustrat', 'peggio', 'rovinato'],
    mild: ['male', 'non bene', 'problema', 'errore', 'sbagliato']
  };

  let score = 0;
  const text = transcript.toLowerCase();

  negativeWords.severe.forEach(word => {
    if (text.includes(word)) score -= 0.4;
  });

  negativeWords.moderate.forEach(word => {
    if (text.includes(word)) score -= 0.25;
  });

  negativeWords.mild.forEach(word => {
    if (text.includes(word)) score -= 0.1;
  });

  // Intensifiers multiply impact
  const intensifiers = ['molto', 'troppo', 'veramente', 'assolutamente', 'completamente'];
  intensifiers.forEach(intensifier => {
    if (text.includes(intensifier)) score *= 1.2;
  });

  return Math.max(-1, Math.min(0, score));
}
```

#### De-escalation Response Matrix

| Severity | Response Type | Example |
|----------|--------------|---------|
| Mild | Acknowledgment | "Mi scuso per l'inconveniente" |
| Moderate | Action promise | "Verifichiamo subito la situazione" |
| Severe | Immediate escalation | "Ti passo subito al responsabile" |

### 3.5 General Intent Handler

**File:** `intents/general-intent.js`

#### Supported General Intents

```javascript
const GENERAL_PATTERNS = {
  opening_hours: /(?:orari|quando|che ore).{0,20}(?:apert|chius)/i,
  location: /(?:dove|indirizzo|siete|trovate)/i,
  services: /(?:cosa|cose|servizi|fate|offrite)/i,
  pricing: /(?:quanto|prezzo|costo|tariffa)/i,
  emergency: /(?:emergenza|urgente|soccorso)/i,
  gdpr: /(?:privacy|dati|gdpr|consenso)/i
};
```

---

## 4. Tools Layer

### 4.1 Customer Lookup Tool

**File:** `tools/customer-lookup.js`

#### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOMER LOOKUP FLOW                          │
└─────────────────────────────────────────────────────────────────┘

[Phone Number Input]
         │
         ▼
┌─────────────────────┐
│ Check Cache (5min)  │──── Cache Hit? ────► Return Cached Data
└──────────┬──────────┘
           │ Cache Miss
           ▼
┌─────────────────────┐
│ Backend API Call    │──── GET /customers/lookup?phone={phone}
│ (with timeout)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Response Handler    │
└──────────┬──────────┘
           │
     ┌─────┴─────┬──────────┐
     ▼           ▼          ▼
[200 OK]   [404 Not Found] [Error]
     │           │          │
     ▼           ▼          ▼
[Enrich]    [New Customer] [Fallback]
     │       Response      Mode
     ▼
[Cache]     [Cache Negative]
     │
     ▼
[Return]
```

#### Enriched Customer Data Structure

```javascript
{
  found: true,
  isNewCustomer: false,
  customer: {
    id: "cust_xxx",
    firstName: "Mario",
    lastName: "Rossi",
    fullName: "Mario Rossi",
    email: "mario@example.com",
    phone: "+393331234567",
    gdprConsent: true,
    gdprConsentDate: "2024-01-15T10:30:00Z",
    preferredContact: "phone",
    isVIP: false,
    loyaltyPoints: 150
  },
  vehicles: [{
    id: "veh_xxx",
    licensePlate: "AB123CD",
    make: "Fiat",
    model: "Panda",
    year: 2020,
    mileage: 45000,
    lastService: "2024-11-15",
    nextServiceDue: "2025-05-15",
    inspectionDue: "2026-01-15"
  }],
  stats: {
    totalBookings: 12,
    totalSpent: 2450.00,
    lastVisit: "2024-11-15",
    averageRating: 4.8
  },
  activeBookings: []
}
```

### 4.2 Slot Query Tool

**File:** `tools/slot-query.js`

#### Service Configuration Matrix

| Service Type | Duration | Buffer | Priority | Max Advance |
|--------------|----------|--------|----------|-------------|
| revisione | 60 min | 15 min | normal | 90 days |
| tagliando | 90 min | 15 min | normal | 90 days |
| riparazione | 120 min | 30 min | normal | 60 days |
| gomme | 45 min | 10 min | normal | 60 days |
| elettronica | 60 min | 15 min | normal | 60 days |
| carrozzeria | 180 min | 30 min | normal | 60 days |
| emergenza | 30 min | 0 min | high | 7 days |
| diagnosi | 45 min | 15 min | normal | 30 days |

#### Urgency Configuration

```javascript
const URGENCY_CONFIG = {
  emergency: {
    daysToSearch: 2,
    allowSameDay: true,
    allowAfterHours: true,
    priority: 10
  },
  high: {
    daysToSearch: 3,
    allowSameDay: true,
    allowAfterHours: false,
    priority: 5
  },
  medium: {
    daysToSearch: 14,
    allowSameDay: false,
    allowAfterHours: false,
    priority: 3
  },
  low: {
    daysToSearch: 30,
    allowSameDay: false,
    allowAfterHours: false,
    priority: 1
  }
};
```

### 4.3 Booking Tools

**File:** `tools/booking-tools.js`

#### Booking Configuration

```javascript
const BOOKING_CONFIG = {
  CONFIRMATION_CODE_LENGTH: 6,
  REMINDER_HOURS_BEFORE: 24,
  MAX_RESCHEDULE_ATTEMPTS: 3,
  CANCELLATION_DEADLINE_HOURS: 2
};
```

#### Confirmation Code Generation

```javascript
function generateConfirmationCode() {
  // Excluding confusing characters: I, L, O, 0, 1
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < BOOKING_CONFIG.CONFIRMATION_CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
// Example: "A7B9K2"
```

### 4.4 Escalation Tools

**File:** `tools/escalation-tools.js`

#### Escalation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ESCALATION FLOW                               │
└─────────────────────────────────────────────────────────────────┘

[Escalation Request]
         │
         ▼
┌─────────────────────┐
│ Build Context       │──── Conversation summary
│ Summary             │──── Customer data
└──────────┬──────────┘──── Reason & priority
           │
           ▼
┌─────────────────────┐
│ Check Staff         │──── Staff availability endpoint
│ Availability        │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
[Available] [Not Available]
     │           │
     ▼           ▼
[Direct     [Check Queue]
 Transfer]
     │           │
     │      ┌────┴────┐
     │      ▼         ▼
     │   [Short]   [Long]
     │   Wait      Wait
     │      │         │
     │      ▼         ▼
     │   [Queue]  [Callback]
     │              Offer
     │
     └─────────────────┐
                       ▼
              ┌─────────────────┐
              │ Log Escalation  │──── Analytics
              │ Notify Manager  │──── Alerting
              └─────────────────┘
```

---

## 5. Twilio Integration

### 5.1 SMS Architecture

**File:** `twilio/sms.js`

#### SMS Templates

```javascript
const MESSAGE_TEMPLATES = {
  booking_confirmation: (data) => 
    `Conferma prenotazione ${data.confirmationCode}: ${data.serviceType} il ${data.date} alle ${data.time}. ` +
    `Indirizzo: ${data.shopAddress}. Per modifiche chiama ${data.shopPhone}`,
  
  booking_reminder: (data) =>
    `Promemoria: domani alle ${data.time} hai ${data.serviceType} in officina. ` +
    `Conferma: ${data.confirmationCode}. Ci vediamo presto!`,
  
  work_ready: (data) =>
    `Buone notizie! La tua ${data.vehicle} è pronta per il ritiro. ` +
    `Orari: ${data.shopHours}. A presto!`,
  
  call_drop_recap: (data) =>
    `Grazie per aver chiamato ${data.shopName}. Ti richiamiamo al più presto per assisterti.`,
  
  gdpr_consent_request: (data) =>
    `${data.shopName}: Per inviarti promemoria e offerte, abbiamo bisogno del tuo consenso. ` +
    `Rispondi SI per accettare o NO per rifiutare.`
};
```

#### SMS Incoming Handler

```javascript
function parseSMSIntent(message) {
  const text = message.toLowerCase().trim();

  // GDPR consent
  if (/^(si|sì|yes|ok|accetto)$/i.test(text)) {
    return { type: 'gdpr_consent', value: true };
  }
  if (/^(no|non|rifiuto)$/i.test(text)) {
    return { type: 'gdpr_consent', value: false };
  }

  // Booking confirmation
  if (/^(confermo|ok|si|sì)$/i.test(text)) {
    return { type: 'booking_confirm', value: true };
  }

  // Booking cancellation
  if (/^(cancella|annulla|no)$/i.test(text)) {
    return { type: 'booking_cancel', value: true };
  }

  // Callback request
  if (/(richiam|chiam|telefon)/i.test(text)) {
    return { type: 'callback_request' };
  }

  return { type: 'unknown', text };
}
```

### 5.2 Call Transfer Architecture

**File:** `twilio/transfer.js`

#### Transfer Configuration

```javascript
const CONFIG = {
  FALLBACK_NUMBER: process.env.FALLBACK_SHOP_NUMBER,
  CONFERENCE_TIMEOUT: 30,
  DIAL_TIMEOUT: 20,
  RECORD_CALLS: true
};
```

#### Staff Selection Algorithm

```javascript
function selectStaffForTransfer(staff, priority) {
  return staff
    .sort((a, b) => {
      // Availability score (ready > wrap-up > busy)
      const availScore = (s) => {
        if (s.status === 'ready') return 2;
        if (s.status === 'wrap-up') return 1;
        return 0;
      };
      
      if (availScore(a) !== availScore(b)) {
        return availScore(b) - availScore(a);
      }

      // Queue length (shortest first)
      return (a.queueLength || 0) - (b.queueLength || 0);
    })[0];
}
```

---

## 6. Multi-Layer Fallback Strategy

### 6.1 Fallback Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              MULTI-LAYER FALLBACK ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LAYER 1: Vapi.ai Primary (< 1.2s target)                        │
│  ├─ Groq LPU for inference                                       │
│  ├─ Deepgram Nova-2 for transcription                            │
│  └─ ElevenLabs Turbo v2.5 for synthesis                          │
│                                                                  │
│  LAYER 2: IVR Fallback (trigger @ 2.5s timeout)                  │
│  ├─ Twilio IVR menu                                              │
│  ├─ Touch-tone selection                                         │
│  └─ Automated callback scheduling                                │
│                                                                  │
│  LAYER 3: Human Transfer                                         │
│  ├─ Direct mechanic transfer                                     │
│  ├─ Queue with hold music                                        │
│  └─ Context passing to operator                                  │
│                                                                  │
│  LAYER 4: Voicemail + Callback                                   │
│  ├─ Record customer message                                      │
│  ├─ Automatic transcription                                      │
│  └─ Scheduled callback within 30min                              │
│                                                                  │
│  LAYER 5: Alternative AI (Retell)                                │
│  ├─ Fallback AI provider                                         │
│  ├─ Same function interface                                      │
│  └─ Circuit breaker pattern                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Fallback Decision Matrix

| Trigger Condition | Latency Threshold | Action | Message to Caller |
|-------------------|-------------------|--------|-------------------|
| AI timeout | > 2.5s | IVR fallback | "Sistema automatico non disponibile" |
| Unknown intent | 2 turns | Human transfer | "Ti passo a un collega" |
| Negative sentiment | Score < -0.6 | Priority escalation | De-escalation attempt |
| Service error | Any | IVR + alert | Service unavailable message |
| Max queue time | > 5 min | Callback offer | "Ti richiamiamo entro 30 min" |

### 6.3 IVR Fallback Implementation

**File:** `fallback/ivr-fallback.js`

```javascript
class IVRFallback {
  generateIVRMenu(shopConfig = {}) {
    const twiml = new Twilio.twiml.VoiceResponse();
    
    twiml.say(
      { voice: 'alice', language: 'it-IT' },
      'Grazie per aver chiamato. Al momento il nostro sistema automatico non è disponibile.'
    );
    
    const gather = twiml.gather({
      numDigits: 1,
      timeout: 5,
      action: '/twilio/ivr-handler',
      method: 'POST',
    });
    
    gather.say(
      { voice: 'alice', language: 'it-IT' },
      'Per una nuova prenotazione, premi 1. Per controllare lo stato del tuo veicolo, premi 2. ' +
      'Per parlare con un operatore, premi 3. Per lasciare un messaggio, premi 4.'
    );
    
    return twiml.toString();
  }
}
```

### 6.4 Latency Monitoring

**File:** `fallback/index.js`

```javascript
class VoiceFallbackManager {
  async monitorLatency(callId, latencyMs, error = null) {
    this.metrics.totalCalls++;
    this.metrics.latencySum += latencyMs;
    
    const avgLatency = this.metrics.latencySum / this.metrics.totalCalls;
    const fallbackDecision = this.ivr.shouldTriggerFallback(latencyMs, error);
    
    if (fallbackDecision.trigger) {
      this.metrics.fallbackCount++;
      
      // Alert if fallback rate > 10%
      if (this.metrics.fallbackCount / this.metrics.totalCalls > 0.10) {
        logger.error('FALLBACK_RATE_CRITICAL', {
          rate: this.metrics.fallbackCount / this.metrics.totalCalls,
          threshold: 0.10,
        });
        // Trigger PagerDuty alert
      }
      
      return {
        action: 'FALLBACK_TO_IVR',
        reason: fallbackDecision.reason,
        ivrUrl: '/webhooks/ivr-menu',
      };
    }
    
    return { action: 'CONTINUE' };
  }
}
```

---

## 7. Webhook Processing & Security

### 7.1 Webhook Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    WEBHOOK PROCESSING FLOW                       │
└─────────────────────────────────────────────────────────────────┘

[Incoming Request]
         │
         ▼
┌─────────────────────┐
│ Rate Limit Check    │──── 100 req/min per IP
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ HMAC Verification   │──── Signature validation
│ (Timing-safe)       │──── Timestamp tolerance (5min)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Body Parsing        │──── JSON validation
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Event Router        │──── Route by event type
└──────────┬──────────┘
           │
    ┌──────┴──────┬──────────┬──────────┐
    ▼             ▼          ▼          ▼
[call.started] [call.ended] [function] [status]
    │              │           │          │
    ▼              ▼           ▼          ▼
[Prefetch]    [Analytics]  [Execute]  [Monitor]
[Customer]    [SMS recap]  [Function] [Transfer]
```

### 7.2 HMAC Security

**File:** `utils/hmac.js`

```javascript
const SECURITY_CONFIG = {
  TIMESTAMP_TOLERANCE_SECONDS: 300, // 5 minutes
  MAX_SIGNATURE_AGE_MS: 5 * 60 * 1000,
  SIGNATURE_ALGORITHM: 'sha256',
  SIGNATURE_ENCODING: 'hex'
};

function verifyHmacSignature(payload, signature, secret) {
  // Parse signature header: "t=timestamp,v=signature"
  const { timestamp, signatureValue } = parseSignatureHeader(signature);

  // Validate timestamp (prevent replay attacks)
  const timestampAge = Date.now() - (parseInt(timestamp) * 1000);
  if (timestampAge > SECURITY_CONFIG.MAX_SIGNATURE_AGE_MS) {
    return false;
  }

  // Build signed content
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signedContent = timestamp ? `${timestamp}.${payloadString}` : payloadString;

  // Compute expected signature
  const expectedSignature = crypto
    .createHmac(SECURITY_CONFIG.SIGNATURE_ALGORITHM, secret)
    .update(signedContent, 'utf8')
    .digest(SECURITY_CONFIG.SIGNATURE_ENCODING);

  // Timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(signatureValue.toLowerCase(), 'hex'),
    Buffer.from(expectedSignature.toLowerCase(), 'hex')
  );
}
```

### 7.3 Event Handlers

**File:** `webhooks/call-event-handler.js`

#### Event Types

| Event | Handler | Purpose |
|-------|---------|---------|
| call.started | handleCallStarted | Customer lookup, context init |
| call.ended | handleCallEnded | Analytics, SMS recap if dropped |
| function_call | handleFunctionCallEvent | Execute business logic |
| status_update | handleStatusUpdate | Monitor health, trigger fallback |
| transcript | handleTranscript | QA logging, sentiment analysis |

#### Function Call Handler

**File:** `webhooks/function-handler.js`

```javascript
async function handleFunctionCall(name, parameters, context) {
  const functionMap = {
    'lookup_customer_by_phone': lookupCustomerByPhone,
    'get_vehicle_history': getVehicleHistory,
    'get_available_slots': getAvailableSlots,
    'create_booking': createBooking,
    'check_booking_status': checkBookingStatus,
    'escalate_to_human': escalateToHumanHandler,
    'send_sms_confirmation': sendSMSConfirmation
  };

  const handler = functionMap[name];
  if (!handler) {
    throw new Error(`Unknown function: ${name}`);
  }

  return await handler(parameters, context);
}
```

---

## 8. Performance & Latency

### 8.1 Latency Budget Breakdown

| Component | Target | SLA | Optimization |
|-----------|--------|-----|--------------|
| Transcription | <250ms | 300ms | Deepgram Nova-2 streaming |
| LLM Inference | <800ms | 1s | Groq LPU + 150 token limit |
| TTS Synthesis | <500ms | 700ms | ElevenLabs Turbo v2.5 |
| Function Calls | <1s | 1.5s | Cached lookups, connection pooling |
| Total Response | <1.2s | 2s | End-to-end target |
| Fallback Trigger | - | 2.5s | Automatic IVR switch |

### 8.2 Performance Optimization Table

| Layer | Technique | Impact |
|-------|-----------|--------|
| Customer Lookup | 5-minute LRU cache | 90% cache hit rate |
| Slot Query | Pre-computed availability | Sub-100ms response |
| Connection | HTTP keep-alive | Eliminates handshake latency |
| Voice | Streaming TTS | First audio chunk <200ms |
| Function | Parallel execution | Slot + customer fetch simultaneously |

### 8.3 Caching Strategy

```javascript
// Customer cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const customerCache = new Map();

// Cache key: shopId:phoneNumber
const cacheKey = `${shopId}:${phoneNumber}`;

// Negative caching for 404s
if (response.status === 404) {
  customerCache.set(cacheKey, {
    data: { found: false, isNewCustomer: true },
    timestamp: Date.now()
  });
}
```

---

## 9. Operational Runbooks

### 9.1 Deployment

```bash
# 1. Environment setup
cp .env.example .env
# Edit .env with production credentials

# 2. Install dependencies
npm ci --production

# 3. Health check
curl http://localhost:3000/health

# 4. Readiness check
curl http://localhost:3000/ready

# 5. Start server
npm start
```

### 9.2 Monitoring Endpoints

| Endpoint | Purpose |
|----------|---------|
| GET /health | Service health status |
| GET /ready | Readiness (backend, Twilio, Vapi) |
| GET /api/stats/:shopId | Call statistics |

### 9.3 Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Fallback rate | > 5% | > 10% |
| Avg latency | > 1.5s | > 2.5s |
| Error rate | > 1% | > 5% |
| Queue depth | > 10 | > 20 |

### 9.4 Troubleshooting Guide

| Symptom | Likely Cause | Resolution |
|---------|--------------|------------|
| HMAC failures | Clock skew or wrong secret | Verify timestamps, check secret |
| High fallback rate | Groq latency spike | Check Groq status, enable IVR |
| Transfer failures | Staff endpoint down | Verify backend health |
| SMS not sending | Rate limit or auth | Check Twilio console |

---

## Appendix A: Configuration Reference

### Environment Variables

```bash
# Required
VAPI_WEBHOOK_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_SMS_NUMBER=
BACKEND_API_URL=
BACKEND_API_TOKEN=
FALLBACK_SHOP_NUMBER=
WEBHOOK_BASE_URL=

# Optional
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
MAX_RESPONSE_TIME_MS=2500
CACHE_TTL_MINUTES=5
```

### API Endpoints

| Endpoint | Method | Auth | Rate Limit |
|----------|--------|------|------------|
| /webhooks/vapi/call-event | POST | HMAC | 100/min |
| /webhooks/vapi/transfer | POST | HMAC | 100/min |
| /twilio/sms-incoming | POST | Twilio | 100/min |
| /health | GET | None | - |
| /ready | GET | None | - |

---

## Appendix B: Data Flow Diagrams

### Complete Booking Flow

```
Customer: "Vorrei prenotare una revisione per la mia Astra"
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. INTENT DETECTION                                              │
│    Pattern: /revisione/i                                         │
│    Confidence: 0.95                                              │
│    Type: new_booking                                             │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. CUSTOMER LOOKUP                                               │
│    Function: lookup_customer_by_phone                            │
│    Input: +393331234567                                          │
│    Cache: MISS                                                   │
│    Backend: GET /customers/lookup?phone=...                      │
│    Response: { found: true, customer: {...}, vehicles: [...] }   │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. VEHICLE SELECTION                                             │
│    Vehicles found: 1 (Opel Astra)                                │
│    Auto-selected: vehicle_id=veh_xxx                             │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. SERVICE TYPE DETECTION                                        │
│    Pattern: /revisione/i                                         │
│    Type: revisione                                               │
│    Duration: 60 minutes                                          │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. URGENCY ASSESSMENT                                            │
│    Keywords: none                                                │
│    Default: medium                                               │
│    Days to search: 14                                            │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. SLOT QUERY                                                    │
│    Function: get_available_slots                                 │
│    Input: { shop_id, service_type: "revisione", urgency: "medium"}│
│    Backend: GET /shops/{id}/slots/available?...                  │
│    Response: { found: true, slots: [...] }                       │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. SLOT PRESENTATION                                             │
│    AI: "Ho questi slot disponibili per revisione:                │
│         Lunedì 14/3 alle 14:00,                                   │
│         Martedì 15/3 alle 10:30,                                  │
│         Mercoledì 16/3 alle 16:00"                                │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
Customer: "Perfetto, prendo lunedì alle 14"
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. BOOKING CREATION                                              │
│    Function: create_booking                                      │
│    Input: { customer_id, vehicle_id, scheduled_at: "...", ... }  │
│    Backend: POST /bookings                                       │
│    Response: { success: true, booking: { id, confirmationCode } }│
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. SMS CONFIRMATION                                              │
│    Async: sendSMS()                                              │
│    Message: "Conferma prenotazione A7B9K2: revisione             │
│             il 14/3 alle 14:00..."                               │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. COMPLETION                                                   │
│     AI: "Perfetto, prenotazione confermata con codice A7B9K2.    │
│          Ti invio un SMS di conferma. A presto!"                 │
└─────────────────────────────────────────────────────────────────┘
```

---

**Document Owner:** MechMind OS Engineering Team  
**Review Cycle:** Quarterly  
**Distribution:** Internal Engineering
