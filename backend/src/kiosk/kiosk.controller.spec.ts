import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { KioskController } from './kiosk.controller';
import { KioskService } from './kiosk.service';

describe('KioskController', () => {
  let controller: KioskController;
  let service: jest.Mocked<KioskService>;

  const KIOSK_KEY = 'kiosk-key-abc';
  const TENANT_ID = 'tenant-001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KioskController],
      providers: [
        {
          provide: KioskService,
          useValue: {
            validateKioskKey: jest.fn(),
            findBookingByPhone: jest.fn(),
            findBookingByPlate: jest.fn(),
            checkIn: jest.fn(),
            getShopStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<KioskController>(KioskController);
    service = module.get(KioskService) as jest.Mocked<KioskService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('lookup', () => {
    it('should throw UnauthorizedException when kiosk key is missing', async () => {
      const dto = { phoneHash: 'hash123' };

      await expect(controller.lookup('', dto as never)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when kiosk key is invalid', async () => {
      service.validateKioskKey.mockResolvedValue(null as never);

      await expect(controller.lookup('bad-key', { phoneHash: 'hash' } as never)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw BadRequestException when neither phoneHash nor licensePlate provided', async () => {
      service.validateKioskKey.mockResolvedValue(TENANT_ID);

      await expect(controller.lookup(KIOSK_KEY, {} as never)).rejects.toThrow(BadRequestException);
    });

    it('should search by phoneHash when provided', async () => {
      service.validateKioskKey.mockResolvedValue(TENANT_ID);
      service.findBookingByPhone.mockResolvedValue([{ id: 'book-001' }] as never);

      const result = await controller.lookup(KIOSK_KEY, { phoneHash: 'hash123' } as never);

      expect(service.findBookingByPhone).toHaveBeenCalledWith(TENANT_ID, 'hash123');
      expect(result).toEqual({ success: true, data: [{ id: 'book-001' }] });
    });

    it('should search by licensePlate when phoneHash not provided', async () => {
      service.validateKioskKey.mockResolvedValue(TENANT_ID);
      service.findBookingByPlate.mockResolvedValue([{ id: 'book-002' }] as never);

      const result = await controller.lookup(KIOSK_KEY, { licensePlate: 'AB123CD' } as never);

      expect(service.findBookingByPlate).toHaveBeenCalledWith(TENANT_ID, 'AB123CD');
      expect(result).toEqual({ success: true, data: [{ id: 'book-002' }] });
    });
  });

  describe('checkIn', () => {
    it('should throw UnauthorizedException when tenant mismatch', async () => {
      service.validateKioskKey.mockResolvedValue(TENANT_ID);

      await expect(
        controller.checkIn(KIOSK_KEY, { bookingId: 'book-001', tenantId: 'other-tenant' } as never),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should check in booking on valid request', async () => {
      service.validateKioskKey.mockResolvedValue(TENANT_ID);
      const booking = { id: 'book-001', status: 'CHECKED_IN' };
      service.checkIn.mockResolvedValue(booking as never);

      const result = await controller.checkIn(KIOSK_KEY, {
        bookingId: 'book-001',
        tenantId: TENANT_ID,
        customerNotes: 'Olio motore',
      } as never);

      expect(service.checkIn).toHaveBeenCalledWith(TENANT_ID, 'book-001', 'Olio motore');
      expect(result).toEqual({ success: true, data: booking });
    });
  });

  describe('getShopStatus', () => {
    it('should throw UnauthorizedException when tenant mismatch', async () => {
      service.validateKioskKey.mockResolvedValue(TENANT_ID);

      await expect(controller.getShopStatus(KIOSK_KEY, 'other-tenant')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return shop status on valid request', async () => {
      service.validateKioskKey.mockResolvedValue(TENANT_ID);
      const status = { queue: 3, avgWait: 25 };
      service.getShopStatus.mockResolvedValue(status as never);

      const result = await controller.getShopStatus(KIOSK_KEY, TENANT_ID);

      expect(service.getShopStatus).toHaveBeenCalledWith(TENANT_ID);
      expect(result).toEqual({ success: true, data: status });
    });
  });
});
