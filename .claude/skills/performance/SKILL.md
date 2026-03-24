---
name: performance
description: Ottimizzazione performance backend e frontend. Usa quando chiesto di velocizzare, ottimizzare, o quando endpoint sono lenti.
allowed-tools: [Read, Grep, "Bash(curl *)", "Bash(time *)"]
---

# Performance — Guida Ottimizzazione

## Backend — Query Prisma lente

### Aggiungi indici
```prisma
// Se filtri per campo → aggiungi @@index
@@index([tenantId, status])
@@index([tenantId, createdAt])
```

### Seleziona solo campi necessari
```typescript
// ❌ Carica tutto
this.prisma.customer.findMany({ where: { tenantId } })

// ✅ Seleziona solo ciò che serve
this.prisma.customer.findMany({
  where: { tenantId },
  select: { id: true, name: true, email: true },
})
```

### Paginazione obbligatoria
```typescript
// ❌ Carica tutti i record
this.prisma.customer.findMany({ where: { tenantId } })

// ✅ Pagina sempre
this.prisma.customer.findMany({
  where: { tenantId },
  take: limit,
  skip: (page - 1) * limit,
})
```

### N+1 query
```typescript
// ❌ N+1: 1 query per la lista + N query per le relazioni
const customers = await this.prisma.customer.findMany({ where: { tenantId } });
for (const c of customers) {
  c.vehicles = await this.prisma.vehicle.findMany({ where: { customerId: c.id } });
}

// ✅ Include in una query
const customers = await this.prisma.customer.findMany({
  where: { tenantId },
  include: { vehicles: true },
});
```

## Backend — Endpoint >500ms

### Profila
```bash
time curl -s http://localhost:3000/v1/<endpoint> -H "Authorization: Bearer $TOKEN" > /dev/null
```

### Cache Redis
```typescript
// Per dati che cambiano raramente (settings, catalog)
const cached = await this.redis.get(`tenant:${tenantId}:settings`);
if (cached) return JSON.parse(cached);
const data = await this.prisma.tenantSettings.findFirst({ where: { tenantId } });
await this.redis.set(`tenant:${tenantId}:settings`, JSON.stringify(data), 'EX', 300);
return data;
```

## Frontend — Pagina lenta

### SWR config
```typescript
useSWR(key, fetcher, {
  revalidateOnFocus: false,  // Non ri-fetcha quando torni al tab
  dedupingInterval: 5000,     // Deduplica richieste entro 5s
})
```

### Paginazione server-side
```typescript
// ❌ Carica tutti e filtra client-side
const { data } = useSWR('/api/customers');
const filtered = data?.filter(c => c.status === 'ACTIVE').slice(0, 20);

// ✅ Chiedi al server solo ciò che serve
const { data } = useSWR(`/api/customers?page=${page}&limit=20&status=ACTIVE`);
```

### React.memo per componenti pesanti
```typescript
const HeavyComponent = React.memo(({ data }: Props) => {
  // render costoso
});
```

### next/image per immagini
```typescript
// ❌ <img src={url} />
// ✅ <Image src={url} width={300} height={200} alt="desc" />
```

## Metriche target
- API response time: <200ms (p95)
- Page load: <1.5s (LCP)
- Bundle size: <500KB gzipped
- DB queries per request: <5
