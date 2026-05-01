import { Test, TestingModule } from '@nestjs/testing';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';

describe('PortalController', () => {
  let controller: PortalController;
  let service: jest.Mocked<PortalService>;

  const mockReq = { user: { userId: 'cust-001', tenantId: 'tenant-001' } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortalController],
      providers: [
        {
          provide: PortalService,
          useValue: {
            getDashboard: jest.fn(),
            getProfile: jest.fn(),
            updateProfile: jest.fn(),
            getVehicles: jest.fn(),
            getBookings: jest.fn(),
            getAvailableSlots: jest.fn(),
            createBooking: jest.fn(),
            getInspections: jest.fn(),
            getMaintenanceSchedule: jest.fn(),
            getInvoice: jest.fn(),
            getInvoices: jest.fn(),
            getInvoicePdf: jest.fn(),
            getNotifications: jest.fn(),
            markNotificationsRead: jest.fn(),
            getDocuments: jest.fn(),
            getWarranties: jest.fn(),
            getPayments: jest.fn(),
            getPayment: jest.fn(),
            getAccount: jest.fn(),
            updateAccount: jest.fn(),
            getEstimates: jest.fn(),
            getEstimate: jest.fn(),
            acceptEstimate: jest.fn(),
            rejectEstimate: jest.fn(),
            getTracking: jest.fn(),
            getNotificationPreferences: jest.fn(),
            updateNotificationPreferences: jest.fn(),
            getMessages: jest.fn(),
            sendMessage: jest.fn(),
            changePassword: jest.fn(),
            getVehicleHistory: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PortalController>(PortalController);
    service = module.get(PortalService) as jest.Mocked<PortalService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDashboard', () => {
    it('should delegate to service with customerId and tenantId', async () => {
      const dashboard = { data: { stats: {} } };
      service.getDashboard.mockResolvedValue(dashboard as never);

      const result = await controller.getDashboard(mockReq);

      expect(service.getDashboard).toHaveBeenCalledWith('cust-001', 'tenant-001');
      expect(result).toEqual(dashboard);
    });
  });

  describe('getProfile', () => {
    it('should delegate to service', async () => {
      const profile = { data: { firstName: 'Mario' } };
      service.getProfile.mockResolvedValue(profile as never);

      const result = await controller.getProfile(mockReq);

      expect(service.getProfile).toHaveBeenCalledWith('cust-001', 'tenant-001');
      expect(result).toEqual(profile);
    });
  });

  describe('updateProfile', () => {
    it('should delegate to service with body', async () => {
      const updated = { data: { firstName: 'Luigi' } };
      service.updateProfile.mockResolvedValue(updated as never);
      const body = { firstName: 'Luigi' };

      const result = await controller.updateProfile(mockReq, body);

      expect(service.updateProfile).toHaveBeenCalledWith('cust-001', 'tenant-001', body);
      expect(result).toEqual(updated);
    });
  });

  describe('getVehicles', () => {
    it('should delegate to service', async () => {
      const vehicles = { data: [{ id: 'veh-001' }] };
      service.getVehicles.mockResolvedValue(vehicles as never);

      const result = await controller.getVehicles(mockReq);

      expect(service.getVehicles).toHaveBeenCalledWith('cust-001', 'tenant-001');
      expect(result).toEqual(vehicles);
    });
  });

  describe('getBookings', () => {
    it('should delegate to service', async () => {
      const bookings = { data: [] };
      service.getBookings.mockResolvedValue(bookings as never);

      const result = await controller.getBookings(mockReq);

      expect(service.getBookings).toHaveBeenCalledWith('cust-001', 'tenant-001');
      expect(result).toEqual(bookings);
    });
  });

  describe('getAvailableSlots', () => {
    it('should delegate to service with date and serviceType', async () => {
      const slots = { data: [{ time: '09:00' }] };
      service.getAvailableSlots.mockResolvedValue(slots as never);

      const result = await controller.getAvailableSlots(mockReq, '2026-04-01', 'OIL_CHANGE');

      expect(service.getAvailableSlots).toHaveBeenCalledWith(
        'tenant-001',
        '2026-04-01',
        'OIL_CHANGE',
      );
      expect(result).toEqual(slots);
    });
  });

  describe('createBooking', () => {
    it('should delegate to service with booking data', async () => {
      const booking = { data: { id: 'book-001' } };
      service.createBooking.mockResolvedValue(booking as never);
      const body = { vehicleId: 'veh-001', slotId: 'slot-001', notes: 'Test' };

      const result = await controller.createBooking(mockReq, body);

      expect(service.createBooking).toHaveBeenCalledWith('cust-001', 'tenant-001', body);
      expect(result).toEqual(booking);
    });
  });

  describe('getInspections', () => {
    it('should delegate to service', async () => {
      const inspections = { data: [] };
      service.getInspections.mockResolvedValue(inspections as never);

      const _result = await controller.getInspections(mockReq);

      expect(service.getInspections).toHaveBeenCalledWith('cust-001', 'tenant-001');
    });
  });

  describe('getMaintenanceSchedule', () => {
    it('should delegate to service', async () => {
      service.getMaintenanceSchedule.mockResolvedValue({ data: [] } as never);

      await controller.getMaintenanceSchedule(mockReq);

      expect(service.getMaintenanceSchedule).toHaveBeenCalledWith('cust-001', 'tenant-001');
    });
  });

  describe('getInvoice', () => {
    it('should delegate to service with invoiceId', async () => {
      service.getInvoice.mockResolvedValue({ data: { id: 'inv-001' } } as never);

      await controller.getInvoice(mockReq, 'inv-001');

      expect(service.getInvoice).toHaveBeenCalledWith('inv-001', 'cust-001', 'tenant-001');
    });
  });

  describe('getNotifications', () => {
    it('should delegate to service', async () => {
      service.getNotifications.mockResolvedValue({ data: [] } as never);

      await controller.getNotifications(mockReq);

      expect(service.getNotifications).toHaveBeenCalledWith('cust-001', 'tenant-001');
    });
  });

  describe('markNotificationsRead', () => {
    it('should delegate to service with notification IDs', async () => {
      service.markNotificationsRead.mockResolvedValue({ data: { updated: 2 } } as never);

      await controller.markNotificationsRead(mockReq, { ids: ['n1', 'n2'] });

      expect(service.markNotificationsRead).toHaveBeenCalledWith('cust-001', 'tenant-001', [
        'n1',
        'n2',
      ]);
    });
  });

  describe('getDocuments', () => {
    it('should delegate to service with optional type', async () => {
      service.getDocuments.mockResolvedValue({ data: [] } as never);

      await controller.getDocuments(mockReq, 'invoice');

      expect(service.getDocuments).toHaveBeenCalledWith('cust-001', 'tenant-001', 'invoice');
    });
  });

  describe('getWarranties', () => {
    it('should delegate to service', async () => {
      service.getWarranties.mockResolvedValue({ data: [] } as never);

      await controller.getWarranties(mockReq);

      expect(service.getWarranties).toHaveBeenCalledWith('cust-001', 'tenant-001');
    });
  });

  describe('getPayments', () => {
    it('should delegate to service', async () => {
      service.getPayments.mockResolvedValue({ data: [] } as never);

      await controller.getPayments(mockReq);

      expect(service.getPayments).toHaveBeenCalledWith('cust-001', 'tenant-001');
    });
  });

  describe('getPayment', () => {
    it('should delegate to service with paymentId', async () => {
      service.getPayment.mockResolvedValue({ data: { id: 'pay-001' } } as never);

      await controller.getPayment(mockReq, 'pay-001');

      expect(service.getPayment).toHaveBeenCalledWith('pay-001', 'cust-001', 'tenant-001');
    });
  });

  describe('getAccount', () => {
    it('should delegate to service', async () => {
      service.getAccount.mockResolvedValue({ data: {} } as never);

      await controller.getAccount(mockReq);

      expect(service.getAccount).toHaveBeenCalledWith('cust-001', 'tenant-001');
    });
  });

  describe('updateAccount', () => {
    it('should delegate to service with body', async () => {
      service.updateAccount.mockResolvedValue({ data: {} } as never);

      await controller.updateAccount(mockReq, { firstName: 'Mario' });

      expect(service.updateAccount).toHaveBeenCalledWith('cust-001', 'tenant-001', {
        firstName: 'Mario',
      });
    });
  });

  describe('getEstimates', () => {
    it('should delegate to service', async () => {
      service.getEstimates.mockResolvedValue({ data: [] } as never);

      await controller.getEstimates(mockReq);

      expect(service.getEstimates).toHaveBeenCalledWith('cust-001', 'tenant-001');
    });
  });

  describe('getEstimate', () => {
    it('should delegate to service with estimateId', async () => {
      service.getEstimate.mockResolvedValue({ data: {} } as never);

      await controller.getEstimate(mockReq, 'est-001');

      expect(service.getEstimate).toHaveBeenCalledWith('est-001', 'cust-001', 'tenant-001');
    });
  });

  describe('acceptEstimate', () => {
    it('should delegate to service', async () => {
      service.acceptEstimate.mockResolvedValue({ data: {} } as never);

      await controller.acceptEstimate(mockReq, 'est-001');

      expect(service.acceptEstimate).toHaveBeenCalledWith('est-001', 'cust-001', 'tenant-001');
    });
  });

  describe('rejectEstimate', () => {
    it('should delegate to service with reason', async () => {
      service.rejectEstimate.mockResolvedValue({ data: {} } as never);

      await controller.rejectEstimate(mockReq, 'est-001', { reason: 'Too expensive' });

      expect(service.rejectEstimate).toHaveBeenCalledWith(
        'est-001',
        'cust-001',
        'tenant-001',
        'Too expensive',
      );
    });
  });

  describe('getTracking', () => {
    it('should delegate to service', async () => {
      service.getTracking.mockResolvedValue({ data: [] } as never);

      await controller.getTracking(mockReq);

      expect(service.getTracking).toHaveBeenCalledWith('cust-001', 'tenant-001');
    });
  });

  describe('getNotificationPreferences', () => {
    it('should delegate to service', async () => {
      service.getNotificationPreferences.mockResolvedValue({ data: [] } as never);

      await controller.getNotificationPreferences(mockReq);

      expect(service.getNotificationPreferences).toHaveBeenCalledWith('cust-001', 'tenant-001');
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should delegate to service with preferences', async () => {
      service.updateNotificationPreferences.mockResolvedValue({ data: [] } as never);
      const prefs = { email: true, sms: false };

      await controller.updateNotificationPreferences(mockReq, prefs);

      expect(service.updateNotificationPreferences).toHaveBeenCalledWith(
        'cust-001',
        'tenant-001',
        prefs,
      );
    });
  });

  describe('getMessages', () => {
    it('should delegate to service', async () => {
      service.getMessages.mockResolvedValue({ data: [] } as never);

      await controller.getMessages(mockReq);

      expect(service.getMessages).toHaveBeenCalledWith('cust-001', 'tenant-001');
    });
  });

  describe('sendMessage', () => {
    it('should delegate to service with message body', async () => {
      service.sendMessage.mockResolvedValue({ data: { id: 'msg-001' } } as never);

      await controller.sendMessage(mockReq, { body: 'Hello' });

      expect(service.sendMessage).toHaveBeenCalledWith('cust-001', 'tenant-001', 'Hello');
    });
  });

  describe('getInvoices', () => {
    it('should delegate to service with parsed pagination params', async () => {
      const response = { data: [], meta: { total: 5, page: 1, limit: 20 } };
      service.getInvoices.mockResolvedValueOnce(response as never);

      const result = await controller.getInvoices(
        mockReq,
        '2',
        '10',
        '2026',
        '2026-01-01',
        '2026-12-31',
        'PAID',
      );

      expect(service.getInvoices).toHaveBeenCalledWith('cust-001', 'tenant-001', {
        page: 2,
        limit: 10,
        year: 2026,
        from: '2026-01-01',
        to: '2026-12-31',
        status: 'PAID',
      });
      expect(result.meta.page).toBe(1);
    });

    it('should use default values when pagination params missing', async () => {
      const response = { data: [], meta: { total: 0, page: 1, limit: 20 } };
      service.getInvoices.mockResolvedValueOnce(response as never);

      await controller.getInvoices(mockReq);

      expect(service.getInvoices).toHaveBeenCalledWith('cust-001', 'tenant-001', {
        page: 1,
        limit: 20,
        year: undefined,
        from: undefined,
        to: undefined,
        status: undefined,
      });
    });
  });

  describe('getInvoicePdf', () => {
    it('should set PDF response headers and send buffer', async () => {
      const mockRes = {
        set: jest.fn().mockReturnThis(),
        end: jest.fn(),
      };
      const pdfBuffer = Buffer.from('PDF content');
      service.getInvoicePdf.mockResolvedValueOnce({
        buffer: pdfBuffer,
        filename: 'invoice-001.pdf',
      } as never);

      await controller.getInvoicePdf(mockReq, 'inv-001', mockRes as any);

      expect(service.getInvoicePdf).toHaveBeenCalledWith('inv-001', 'cust-001', 'tenant-001');
      expect(mockRes.set).toHaveBeenCalledWith({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="invoice-001.pdf"',
        'Content-Length': pdfBuffer.length,
      });
      expect(mockRes.end).toHaveBeenCalledWith(pdfBuffer);
    });
  });

  describe('changePassword', () => {
    it('should validate password length and throw if too short', async () => {
      const body = { currentPassword: 'oldpass', newPassword: 'short' };

      await expect(controller.changePassword(mockReq, body)).rejects.toThrow(
        'La nuova password deve avere almeno 8 caratteri',
      );
      expect(service.changePassword).not.toHaveBeenCalled();
    });

    it('should validate password complexity and throw if missing requirements', async () => {
      const body = { currentPassword: 'oldpass', newPassword: 'onlysmallletters' };

      await expect(controller.changePassword(mockReq, body)).rejects.toThrow(
        'La password deve contenere almeno una maiuscola, una minuscola e un numero',
      );
      expect(service.changePassword).not.toHaveBeenCalled();
    });

    it('should delegate to service with valid password', async () => {
      const body = {
        currentPassword: 'OldPass123',
        newPassword: 'NewPass123',
      };
      service.changePassword.mockResolvedValueOnce({
        success: true,
        message: 'Password updated',
      } as never);

      const result = await controller.changePassword(mockReq, body);

      expect(service.changePassword).toHaveBeenCalledWith(
        'cust-001',
        'tenant-001',
        'OldPass123',
        'NewPass123',
      );
      expect(result.success).toBe(true);
    });
  });

  describe('getVehicleHistory', () => {
    it('should delegate to service with vehicleId', async () => {
      const response = {
        data: { vehicle: { id: 'veh-001' }, timeline: [] },
      };
      service.getVehicleHistory.mockResolvedValueOnce(response as never);

      const result = await controller.getVehicleHistory(mockReq, 'veh-001');

      expect(service.getVehicleHistory).toHaveBeenCalledWith('veh-001', 'cust-001', 'tenant-001');
      expect(result.data.vehicle.id).toBe('veh-001');
    });
  });
});
