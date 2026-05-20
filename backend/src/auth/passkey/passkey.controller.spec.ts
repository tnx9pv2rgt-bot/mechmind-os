import { Test, TestingModule } from '@nestjs/testing';
import { PasskeyController } from './passkey.controller';
import { PasskeyService } from './passkey.service';

describe('PasskeyController', () => {
  let controller: PasskeyController;
  let service: jest.Mocked<PasskeyService>;

  const USER_ID = 'user-001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PasskeyController],
      providers: [
        {
          provide: PasskeyService,
          useValue: {
            generateRegistrationOptions: jest.fn(),
            verifyRegistration: jest.fn(),
            generateAuthenticationOptions: jest.fn(),
            verifyAuthentication: jest.fn(),
            listPasskeys: jest.fn(),
            deletePasskey: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PasskeyController>(PasskeyController);
    service = module.get(PasskeyService) as jest.Mocked<PasskeyService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('registerOptions', () => {
    it('should delegate to service.generateRegistrationOptions with userId', async () => {
      const expected = { options: { challenge: 'abc' }, sessionId: 'session-001' };
      service.generateRegistrationOptions.mockResolvedValue(expected as never);

      const result = await controller.registerOptions(USER_ID);

      expect(service.generateRegistrationOptions).toHaveBeenCalledWith(USER_ID);
      expect(result).toEqual(expected);
    });
  });

  describe('registerVerify', () => {
    it('should delegate to service.verifyRegistration with all args', async () => {
      const dto = {
        attestation: { id: 'cred-001', response: {} },
        sessionId: 'session-001',
        deviceName: 'MacBook Pro',
      } as never;
      const expected = { id: 'passkey-001' };
      service.verifyRegistration.mockResolvedValue(expected as never);

      const result = await controller.registerVerify(USER_ID, dto, 'Mozilla/5.0');

      expect(service.verifyRegistration).toHaveBeenCalledWith(
        USER_ID,
        { id: 'cred-001', response: {} },
        'session-001',
        'MacBook Pro',
        'Mozilla/5.0',
      );
      expect(result).toEqual(expected);
    });
  });

  describe('authenticateOptions', () => {
    it('should delegate to service.generateAuthenticationOptions', async () => {
      const expected = { options: { challenge: 'xyz' }, sessionId: 'session-002' };
      service.generateAuthenticationOptions.mockResolvedValue(expected as never);

      const result = await controller.authenticateOptions();

      expect(service.generateAuthenticationOptions).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });
  });

  describe('authenticateVerify', () => {
    it('should delegate to service.verifyAuthentication with assertion, sessionId, and ip', async () => {
      const dto = {
        assertion: { id: 'cred-001', response: {} },
        sessionId: 'session-002',
      } as never;
      const expected = { accessToken: 'jwt-token', refreshToken: 'refresh-token', expiresIn: 3600 };
      service.verifyAuthentication.mockResolvedValue(expected as never);

      const result = await controller.authenticateVerify(dto, '127.0.0.1');

      expect(service.verifyAuthentication).toHaveBeenCalledWith(
        { id: 'cred-001', response: {} },
        'session-002',
        '127.0.0.1',
      );
      expect(result).toEqual(expected);
    });
  });

  describe('list', () => {
    it('should delegate to service.listPasskeys with userId', async () => {
      const passkeys = [
        {
          id: 'passkey-001',
          deviceName: 'MacBook Pro',
          deviceType: 'platform',
          lastUsedAt: new Date(),
          registeredAt: new Date(),
        },
      ];
      service.listPasskeys.mockResolvedValue(passkeys as never);

      const result = await controller.list(USER_ID);

      expect(service.listPasskeys).toHaveBeenCalledWith(USER_ID);
      expect(result).toEqual(passkeys);
    });
  });

  describe('remove', () => {
    it('should delegate to service.deletePasskey with userId and passkeyId', async () => {
      service.deletePasskey.mockResolvedValue(undefined);

      const result = await controller.remove(USER_ID, 'passkey-001');

      expect(service.deletePasskey).toHaveBeenCalledWith(USER_ID, 'passkey-001');
      expect(result).toBeUndefined();
    });
  });
});
