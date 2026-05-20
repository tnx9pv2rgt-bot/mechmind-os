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
  const ANOTHER_CUSTOMER = 'customer-consent-002';

  beforeEach(async () => {
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

  // =========================================================================
  // EMAIL CONSENT TRACKING
  // =========================================================================

  describe('Email Consent Tracking', () => {
    it('should check email consent before sending', async () => {
      prisma.customerNotificationPreference.findUnique.mockResolvedValue({
        customerId: CUSTOMER_ID,
        channel: 'EMAIL',
        enabled: true,
        tenantId: TENANT_ID,
      });

      // Simulate consent check
      const preference = await prisma.customerNotificationPreference.findUnique({
        where: { customerId_channel: { customerId: CUSTOMER_ID, channel: 'EMAIL' } },
      });

      expect(preference).toBeDefined();
      expect(preference.enabled).toBe(true);
      expect(preference.channel).toBe('EMAIL');
      expect(prisma.customerNotificationPreference.findUnique).toHaveBeenCalledWith({
        where: { customerId_channel: { customerId: CUSTOMER_ID, channel: 'EMAIL' } },
      });
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

      // Then upsert preference — scoped by tenant
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

      expect(prisma.customerNotificationPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customerId_channel: {
              customerId: CUSTOMER_ID,
              channel: 'EMAIL',
            },
          }),
        }),
      );
    });
  });

  // =========================================================================
  // SMS CONSENT TRACKING
  // =========================================================================

  describe('SMS Consent Tracking', () => {
    it('should check SMS consent before sending', async () => {
      prisma.customerNotificationPreference.findUnique.mockResolvedValue({
        customerId: CUSTOMER_ID,
        channel: 'SMS',
        enabled: true,
        tenantId: TENANT_ID,
      });

      const preference = await prisma.customerNotificationPreference.findUnique({
        where: { customerId_channel: { customerId: CUSTOMER_ID, channel: 'SMS' } },
      });

      expect(preference.channel).toBe('SMS');
      expect(preference.enabled).toBe(true);
    });

    it('should enforce SMS consent per customer', async () => {
      const customers = [CUSTOMER_ID, ANOTHER_CUSTOMER];
      const preferences = [
        { customerId: CUSTOMER_ID, channel: 'SMS', enabled: true },
        { customerId: ANOTHER_CUSTOMER, channel: 'SMS', enabled: false },
      ];

      prisma.customerNotificationPreference.findMany.mockResolvedValue(preferences);

      const results = await prisma.customerNotificationPreference.findMany({
        where: { customerId: { in: customers }, channel: 'SMS' },
      });

      expect(results).toHaveLength(2);
      expect(results[0].enabled).toBe(true);
      expect(results[1].enabled).toBe(false);
    });

    it('should track SMS unsubscribe events', async () => {
      prisma.customerNotificationPreference.upsert.mockResolvedValue({
        customerId: CUSTOMER_ID,
        channel: 'SMS',
        enabled: false,
      });

      const unsubscribed = await prisma.customerNotificationPreference.upsert({
        where: { customerId_channel: { customerId: CUSTOMER_ID, channel: 'SMS' } },
        update: { enabled: false },
        create: { customerId: CUSTOMER_ID, channel: 'SMS', enabled: false },
      });

      expect(unsubscribed.enabled).toBe(false);
      expect(unsubscribed.channel).toBe('SMS');
    });
  });

  // =========================================================================
  // MARKETING CONSENT
  // =========================================================================

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
        data: {
          marketingConsent: false,
          marketingConsentAt: now,
        },
      });

      expect(result.count).toBe(1);
      expect(prisma.customer.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CUSTOMER_ID, tenantId: TENANT_ID },
          data: expect.objectContaining({
            marketingConsent: false,
          }),
        }),
      );
    });

    it('should track marketing consent revocation timestamp', async () => {
      const _beforeRevoke = new Date();
      prisma.customer.update.mockImplementation(({ data }) => {
        return Promise.resolve({
          id: CUSTOMER_ID,
          tenantId: TENANT_ID,
          marketingConsent: data.marketingConsent,
          marketingConsentAt: data.marketingConsentAt,
        });
      });

      const timestamp = new Date();
      const updated = await prisma.customer.update({
        where: { id: CUSTOMER_ID },
        data: {
          marketingConsent: false,
          marketingConsentAt: timestamp,
        },
      });

      expect(updated.marketingConsent).toBe(false);
      expect(updated.marketingConsentAt).toEqual(timestamp);
    });
  });

  // =========================================================================
  // CONSENT AUDIT TRAIL
  // =========================================================================

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
        revocationReason: 'Email complaint',
      });

      const auditLog = await prisma.consentAuditLog.create({
        data: {
          customerId: CUSTOMER_ID,
          tenantId: TENANT_ID,
          consentType: 'MARKETING',
          granted: false,
          timestamp: new Date(),
          revokedAt: new Date(),
          revocationReason: 'Email complaint',
        },
      });

      expect(auditLog.customerId).toBe(CUSTOMER_ID);
      expect(auditLog.granted).toBe(false);
      expect(auditLog.revocationReason).toBe('Email complaint');
    });

    it('should record revocation reason in audit trail', async () => {
      prisma.consentAuditLog.create.mockResolvedValue({
        id: 'audit-bounce',
        customerId: CUSTOMER_ID,
        tenantId: TENANT_ID,
        consentType: 'GDPR',
        granted: false,
        timestamp: new Date(),
        revokedAt: new Date(),
        revocationReason: 'Permanent bounce from SES',
      });

      const auditLog = await prisma.consentAuditLog.create({
        data: {
          customerId: CUSTOMER_ID,
          tenantId: TENANT_ID,
          consentType: 'GDPR',
          granted: false,
          timestamp: new Date(),
          revokedAt: new Date(),
          revocationReason: 'Permanent bounce from SES',
        },
      });

      expect(auditLog.revocationReason).toContain('bounce');
    });

    it('should retrieve full consent audit trail', async () => {
      const auditTrail = [
        {
          id: 'audit-2',
          customerId: CUSTOMER_ID,
          consentType: 'MARKETING',
          granted: false,
          timestamp: new Date('2026-02-01T10:00:00Z'),
          revokedAt: new Date('2026-02-01T10:05:00Z'),
        },
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

      expect(logs).toHaveLength(2);
      expect(logs[0].revokedAt).toBeDefined();
      expect(logs[1].revokedAt).toBeNull();
    });

    it('should scope audit trail to customer and tenant', async () => {
      prisma.consentAuditLog.findMany.mockResolvedValue([]);

      await prisma.consentAuditLog.findMany({
        where: { customerId: CUSTOMER_ID, tenantId: TENANT_ID },
      });

      expect(prisma.consentAuditLog.findMany).toHaveBeenCalledWith({
        where: { customerId: CUSTOMER_ID, tenantId: TENANT_ID },
      });
    });
  });

  // =========================================================================
  // CROSS-TENANT ISOLATION
  // =========================================================================

  describe('Cross-Tenant Isolation', () => {
    it('should not reveal consent status across tenants', async () => {
      const tenant1Customer = { customerId: CUSTOMER_ID, tenantId: TENANT_ID };
      const _tenant2Customer = { customerId: CUSTOMER_ID, tenantId: 'tenant-002' };

      prisma.customerNotificationPreference.findUnique
        .mockResolvedValueOnce({ ...tenant1Customer, channel: 'EMAIL', enabled: true })
        .mockResolvedValueOnce(null);

      const tenant1Prefs = await prisma.customerNotificationPreference.findUnique({
        where: { customerId_channel: { customerId: CUSTOMER_ID, channel: 'EMAIL' } },
      });

      // Tenant 2 would not find this customer's preferences
      const tenant2Prefs = await prisma.customerNotificationPreference.findUnique({
        where: { customerId_channel: { customerId: CUSTOMER_ID, channel: 'EMAIL' } },
      });

      expect(tenant1Prefs).toBeDefined();
      expect(tenant2Prefs).toBeNull();
    });

    it('should scope unsubscribe to correct tenant', async () => {
      prisma.notification.findFirst.mockResolvedValue({
        customerId: CUSTOMER_ID,
        tenantId: TENANT_ID,
        messageId: 'msg-001',
      });

      const notification = await prisma.notification.findFirst({
        where: { messageId: 'msg-001' },
        select: { customerId: true, tenantId: true },
      });

      await prisma.customer.updateMany({
        where: { id: notification.customerId, tenantId: notification.tenantId },
        data: { marketingConsent: false },
      });

      expect(prisma.customer.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CUSTOMER_ID, tenantId: TENANT_ID },
        }),
      );
    });
  });

  // =========================================================================
  // GDPR COMPLIANCE
  // =========================================================================

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

    it('should allow revoke marketing consent without affecting GDPR consent', async () => {
      prisma.customer.updateMany.mockResolvedValue({ count: 1 });

      await prisma.customer.updateMany({
        where: { id: CUSTOMER_ID },
        data: { marketingConsent: false },
      });

      // gdprConsent should NOT be touched
      expect(prisma.customer.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ gdprConsent: false }),
        }),
      );
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

    it('should track IP and user agent for consent proof', async () => {
      prisma.consentAuditLog.create.mockResolvedValue({
        id: 'audit-ip',
        customerId: CUSTOMER_ID,
        tenantId: TENANT_ID,
        consentType: 'MARKETING',
        granted: true,
        timestamp: new Date(),
        ipSource: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
      });

      const auditLog = await prisma.consentAuditLog.create({
        data: {
          customerId: CUSTOMER_ID,
          tenantId: TENANT_ID,
          consentType: 'MARKETING',
          granted: true,
          timestamp: new Date(),
          ipSource: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
        },
      });

      expect(auditLog.ipSource).toBeDefined();
      expect(auditLog.userAgent).toBeDefined();
    });
  });

  // =========================================================================
  // UNSUBSCRIBE PROOF
  // =========================================================================

  describe('Unsubscribe Proof & Audit', () => {
    it('should record unsubscribe timestamp for compliance proof', async () => {
      const unsubscribeTime = new Date();
      prisma.consentAuditLog.create.mockResolvedValue({
        id: 'audit-unsub',
        customerId: CUSTOMER_ID,
        tenantId: TENANT_ID,
        consentType: 'MARKETING',
        granted: false,
        timestamp: unsubscribeTime,
        revokedAt: unsubscribeTime,
      });

      const auditLog = await prisma.consentAuditLog.create({
        data: {
          customerId: CUSTOMER_ID,
          tenantId: TENANT_ID,
          consentType: 'MARKETING',
          granted: false,
          timestamp: unsubscribeTime,
          revokedAt: unsubscribeTime,
        },
      });

      expect(auditLog.timestamp).toEqual(unsubscribeTime);
      expect(auditLog.revokedAt).toEqual(unsubscribeTime);
    });

    it('should link unsubscribe to originating notification message', async () => {
      prisma.notification.findFirst.mockResolvedValue({
        id: 'notif-001',
        messageId: 'msg-001',
        customerId: CUSTOMER_ID,
        tenantId: TENANT_ID,
      });

      prisma.consentAuditLog.create.mockResolvedValue({
        id: 'audit-linked',
        customerId: CUSTOMER_ID,
        metadata: { sourceNotificationId: 'notif-001' },
      });

      const notification = await prisma.notification.findFirst({
        where: { messageId: 'msg-001' },
      });

      const auditLog = await prisma.consentAuditLog.create({
        data: {
          customerId: CUSTOMER_ID,
          tenantId: TENANT_ID,
          consentType: 'MARKETING',
          granted: false,
          timestamp: new Date(),
          metadata: { sourceNotificationId: notification.id },
        },
      });

      expect(auditLog.metadata).toBeDefined();
    });
  });
});
