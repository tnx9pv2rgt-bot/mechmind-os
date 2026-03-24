# Pattern Corretti vs Sbagliati — MechMind OS

## 1. TypeScript: `any` vs tipo corretto

```typescript
// ❌ SBAGLIATO
async findAll(tenantId: string, filters: any): Promise<any> {
  const results: any = await this.prisma.customer.findMany({ where: filters });
  return results;
}

// ✅ CORRETTO
async findAll(tenantId: string, filters: CustomerFilters): Promise<PaginatedResult<Customer>> {
  const results = await this.prisma.customer.findMany({
    where: { tenantId, ...filters },
    take: filters.limit,
    skip: (filters.page - 1) * filters.limit,
  });
  const total = await this.prisma.customer.count({ where: { tenantId, ...filters } });
  return { data: results, meta: { total, page: filters.page, limit: filters.limit } };
}
```

## 2. Query senza tenantId vs con tenantId

```typescript
// ❌ SBAGLIATO — data leak tra tenant!
async findOne(id: string) {
  return this.prisma.booking.findUnique({ where: { id } });
}

// ✅ CORRETTO
async findOne(id: string, tenantId: string): Promise<Booking> {
  const booking = await this.prisma.booking.findFirst({
    where: { id, tenantId },
  });
  if (!booking) throw new NotFoundException('Prenotazione non trovata');
  return booking;
}
```

## 3. Catch-and-swallow vs log+throw

```typescript
// ❌ SBAGLIATO — errore silenzioso
try {
  await this.emailService.send(email);
} catch (e) {
  console.log('email failed');
}

// ✅ CORRETTO
try {
  await this.emailService.send(email);
} catch (error) {
  this.logger.error(`Invio email fallito per ${maskedEmail}`, error.stack);
  throw new InternalServerErrorException('Invio email fallito');
}
```

## 4. Frontend: fetch senza toast vs con toast

```typescript
// ❌ SBAGLIATO
const handleDelete = async () => {
  await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
  router.push('/dashboard/bookings');
};

// ✅ CORRETTO
const handleDelete = async () => {
  try {
    const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Errore eliminazione');
    toast.success('Prenotazione eliminata');
    router.push('/dashboard/bookings');
  } catch {
    toast.error('Errore durante l\'eliminazione');
  }
};
```
