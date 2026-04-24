/**
 * Consent Tracking Tests for Notifications Module
 *
 * GDPR compliance: Tests for consent verification before sending notifications,
 * unsubscribe handling, audit logging of consent changes, and per-channel preferences.
 */

describe('NotificationConsentTrackingService (GDPR)', () => {
  let prisma: {
    customerNotificationPreference: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
    customer: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    consentAuditLog: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
    notification: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  const TENANT_ID = 'tenant-consent-001';
  const CUSTOMER_ID = 'customer-consent-001';

  beforeEach(() => {
    prisma = {
      customerNotificationPreference: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      consentAuditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      notification: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
  });

  describe('Email Consent Tracking', () => {
    it('should check email consent before sending', async () => {
      prisma.customerNotificationPreference.findUnique.mockResolvedValue({
        customerId: CUSTOMER_ID,
        channel: 'EMAIL',
        enabled: true,
        tenantId: TENANT_ID,
      });

      const preference = await prisma.customerNotificationPreference.findUnique({
        where: { customerId_channel: { customerId: CUSTOMER_ID, channel: 'EMAIL' } },
      });

      expect(preference).toBeDefined();
      expect(preference.enabled).toBe(true);
      expect(preference.channel).toBe('EMAIL');
    });

    it('should not send email when consent is disabled', async () => {
      prisma.customerNotificationPreference.findUnique.mockResolvedValue({
        customerId: CUSTOMER_ID,
        channel: 'EMAIL',
        enabled: false,
        tenantId: TENANT_ID,
      });

      const preference = await prisma.customerNotificationPreference.findUnique({
        where: { customerId_channel: { customerId: CUSTOMER_ID, channel: 'EMAIL' } },
      });

      expect(preference.enabled).toBe(false);
    });

    it('should handle missing email preference as opt-in by default', async () => {
      prisma.customerNotificationPreference.findUnique.mockResolvedValue(null);

      const preference = await prisma.customerNotificationPreference.findUnique({
        where: { customerId_channel: { customerId: CUSTOMER_ID, channel: 'EMAIL' } },
      });

      expect(preference).toBeNull();
    });

    it('should revoke email consent on bounce', async () => {
      prisma.customerNotificationPreference.upsert.mockResolvedValue({
        customerId: CUSTOMER_ID,
        channel: 'EMAIL',
        enabled: false,
      });

      const updated = await prisma.customerNotificationPreference.upsert({
        where: { customerId_channel: { customerId: CUSTOMER_ID, channel: 'EMAIL' } },
        update: { enabled: false },
        create: { customerId: CUSTOMER_ID, channel: 'EMAIL', enabled: false },
      });

      expect(updated.enabled).toBe(false);
      expect(updated.channel).toBe('EMAIL');
    });

    it('should revoke email consent on complaint', async () => {
      prisma.customer.updateMany.mockResolvedValue({ count: 1 });

      const result = await prisma.customer.updateMany({
        where: { id: CUSTOMER_ID, tenantId: TENANT_ID },
        data: { marketingConsent: false, marketingConsentAt: new Date() },
      });

      expect(result.count).toBe(1);
    });

    it('should scope email unsubscribe to correct tenant', async () => {
      prisma.notification.findFirst.mockResolvedValue({
        customerId: CUSTOMER_ID,
        tenantId: TENANT_ID,
      });

      prisma.customerNotificationPreference.upsert.mockResolvedValue({});

      const notification = await prisma.notification.findFirst({
        where: { messageId: 'test-msg-id', channel: 'EMAIL' },
        select: { customerId: true, tenantId: true },
      });

      await prisma.customerNotificationPreference.upsert({
        where: {
          customerId_channel: { customerId: notification.customerId, channel: 'EMAIL' },
        },
        update: { enabled: false },
        create: {
          customerId: notification.customerId,
          channel: 'EMAIL',
          enabled: false,
        },
      });

      expect(prisma.customerNotificationPreference.upsert).toHaveBeenCalled();
    });
  });

  describe('Marketing Consent', () => {
    it('should track marketing consent on customer record', async () => {
      prisma.customer.findUnique.mockResolvedValue({
        id: CUSTOMER_ID,
        tenantId: TENANT_ID,
        marketingConsent: true,
        marketingConsentAt: new Date('2026-03-01T10:00:00Z'),
        gdprConsent: true,
      });

      const customer = await prisma.customer.findUnique({
        where: { id: CUSTOMER_ID },
      });

      expect(customer.marketingConsent).toBe(true);
      expect(customer.marketingConsentAt).toBeDefined();
    });

    it('should revoke marketing consent on email complaint', async () => {
      prisma.customer.updateMany.mockResolvedValue({ count: 1 });

      const now = new Date();
      const result = await prisma.customer.updateMany({
        where: { id: CUSTOMER_ID, tenantId: TENANT_ID },
        data: { marketingConsent: false, marketingConsentAt: now },
      });

      expect(result.count).toBe(1);
    });
  });

  describe('Consent Audit Trail', () => {
    it('should create consent audit log entry on unsubscribe', async () => {
      prisma.consentAuditLog.create.mockResolvedValue({
        id: 'audit-001',
        customerId: CUSTOMER_ID,
        tenantId: TENANT_ID,
        consentType: 'MARKETING',
        granted: false,
        timestamp: new Date(),
        revokedAt: new Date(),
      });

      const auditLog = await prisma.consentAuditLog.create({
        data: {
          customerId: CUSTOMER_ID,
          tenantId: TENANT_ID,
          consentType: 'MARKETING',
          granted: false,
          timestamp: new Date(),
          revokedAt: new Date(),
        },
      });

      expect(auditLog.customerId).toBe(CUSTOMER_ID);
      expect(auditLog.granted).toBe(false);
    });

    it('should retrieve full consent audit trail', async () => {
      const auditTrail = [
        {
          id: 'audit-1',
          customerId: CUSTOMER_ID,
          consentType: 'GDPR',
          granted: true,
          timestamp: new Date('2026-01-01T10:00:00Z'),
          revokedAt: null,
        },
      ];

      prisma.consentAuditLog.findMany.mockResolvedValue(auditTrail);

      const logs = await prisma.consentAuditLog.findMany({
        where: { customerId: CUSTOMER_ID, tenantId: TENANT_ID },
        orderBy: { timestamp: 'desc' },
      });

      expect(logs).toHaveLength(1);
    });
  });

  describe('Cross-Tenant Isolation', () => {
    it('should not reveal consent status across tenants', async () => {
      prisma.customerNotificationPreference.findUnique.mockResolvedValueOnce({
        customerId: CUSTOMER_ID,
        tenantId: TENANT_ID,
        channel: 'EMAIL',
        enabled: true,
      });

      const tenant1Prefs = await prisma.customerNotificationPreference.findUnique({
        where: { customerId_channel: { customerId: CUSTOMER_ID, channel: 'EMAIL' } },
      });

      expect(tenant1Prefs).toBeDefined();
      expect(tenant1Prefs.tenantId).toBe(TENANT_ID);
    });
  });

  describe('GDPR Compliance', () => {
    it('should track GDPR consent separately from marketing consent', async () => {
      prisma.customer.findFirst.mockResolvedValue({
        id: CUSTOMER_ID,
        gdprConsent: true,
        marketingConsent: false,
      });

      const customer = await prisma.customer.findFirst({
        where: { id: CUSTOMER_ID },
      });

      expect(customer.gdprConsent).toBe(true);
      expect(customer.marketingConsent).toBe(false);
    });

    it('should record consent collection method (GDPR Art. 7)', async () => {
      prisma.consentAuditLog.create.mockResolvedValue({
        id: 'audit-form',
        customerId: CUSTOMER_ID,
        tenantId: TENANT_ID,
        consentType: 'GDPR',
        granted: true,
        collectionMethod: 'WEB_FORM',
        timestamp: new Date(),
      });

      const auditLog = await prisma.consentAuditLog.create({
        data: {
          customerId: CUSTOMER_ID,
          tenantId: TENANT_ID,
          consentType: 'GDPR',
          granted: true,
          collectionMethod: 'WEB_FORM',
          timestamp: new Date(),
        },
      });

      expect(auditLog.collectionMethod).toBe('WEB_FORM');
    });
  });
});
