/**
 * Prisma Mock Utility for Unit Tests
 *
 * Creates a deeply mocked PrismaService with all model methods
 * returning jest.fn() stubs that can be customized per test.
 */
// @ts-nocheck

type MockModel = {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  createMany: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
  upsert: jest.Mock;
  delete: jest.Mock;
  deleteMany: jest.Mock;
  count: jest.Mock;
  aggregate: jest.Mock;
};

function createMockModel(): MockModel {
  return {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  };
}

export interface MockPrismaService {
  user: MockModel;
  tenant: MockModel;
  customer: MockModel;
  vehicle: MockModel;
  booking: MockModel;
  bookingSlot: MockModel;
  service: MockModel;
  backupCode: MockModel;
  authAuditLog: MockModel;
  part: MockModel;
  workOrder: MockModel;
  obdDevice: MockModel;
  obdReading: MockModel;
  inspection: MockModel;
  notification: MockModel;
  gdprRequest: MockModel;
  consent: MockModel;
  session: MockModel;
  $transaction: jest.Mock;
  $executeRaw: jest.Mock;
  $executeRawUnsafe: jest.Mock;
  $queryRaw: jest.Mock;
  $connect: jest.Mock;
  $disconnect: jest.Mock;
  setTenantContext: jest.Mock;
  clearTenantContext: jest.Mock;
  getCurrentTenantContext: jest.Mock;
  withTenant: jest.Mock;
  withSerializableTransaction: jest.Mock;
  acquireAdvisoryLock: jest.Mock;
  releaseAdvisoryLock: jest.Mock;
}

export function createMockPrismaService(): MockPrismaService {
  return {
    user: createMockModel(),
    tenant: createMockModel(),
    customer: createMockModel(),
    vehicle: createMockModel(),
    booking: createMockModel(),
    bookingSlot: createMockModel(),
    service: createMockModel(),
    backupCode: createMockModel(),
    authAuditLog: createMockModel(),
    part: createMockModel(),
    workOrder: createMockModel(),
    obdDevice: createMockModel(),
    obdReading: createMockModel(),
    inspection: createMockModel(),
    notification: createMockModel(),
    gdprRequest: createMockModel(),
    consent: createMockModel(),
    session: createMockModel(),
    $transaction: jest.fn(cb => {
      if (typeof cb === 'function') return cb(createMockPrismaService());
      return Promise.resolve(cb);
    }),
    $executeRaw: jest.fn().mockResolvedValue(0),
    $executeRawUnsafe: jest.fn().mockResolvedValue(0),
    $queryRaw: jest.fn().mockResolvedValue([]),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    setTenantContext: jest.fn(),
    clearTenantContext: jest.fn(),
    getCurrentTenantContext: jest.fn().mockReturnValue(null),
    withTenant: jest.fn((_, cb) => cb(createMockPrismaService())),
    withSerializableTransaction: jest.fn(cb => cb(createMockPrismaService())),
    acquireAdvisoryLock: jest.fn().mockResolvedValue(true),
    releaseAdvisoryLock: jest.fn().mockResolvedValue(undefined),
  };
}
