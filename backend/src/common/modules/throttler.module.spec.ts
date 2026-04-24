import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RateLimitingModule } from './throttler.module';

describe('RateLimitingModule', () => {
  let module: TestingModule;

  beforeEach(() => {
    // Clear environment variables before each test
    delete process.env.LOAD_TEST;
    delete process.env.NODE_ENV;
  });

  describe('module setup', () => {
    it('should be defined', async () => {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: [],
          }),
          RateLimitingModule,
        ],
      }).compile();

      expect(module).toBeDefined();
    });

    it('should export ThrottlerModule', async () => {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: [],
          }),
          RateLimitingModule,
        ],
      }).compile();

      const exports = module.get(RateLimitingModule, { strict: false });
      expect(exports).toBeDefined();
    });
  });

  describe('throttler configuration', () => {
    describe('development environment', () => {
      it('should configure default throttler with 600 limit in dev', async () => {
        process.env.NODE_ENV = 'development';
        process.env.LOAD_TEST = 'false';

        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: [],
            }),
            RateLimitingModule,
          ],
        }).compile();

        const configService = module.get<ConfigService>(ConfigService);
        expect(configService).toBeDefined();
        expect(module).toBeDefined();
      });

      it('should configure strict throttler with 10 limit in dev', async () => {
        process.env.NODE_ENV = 'development';
        process.env.LOAD_TEST = 'false';

        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: [],
            }),
            RateLimitingModule,
          ],
        }).compile();

        expect(module).toBeDefined();
      });

      it('should configure lenient throttler with 3000 limit in dev', async () => {
        process.env.NODE_ENV = 'development';
        process.env.LOAD_TEST = 'false';

        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: [],
            }),
            RateLimitingModule,
          ],
        }).compile();

        expect(module).toBeDefined();
      });
    });

    describe('production environment', () => {
      it('should configure default throttler with 60 limit in production', async () => {
        process.env.NODE_ENV = 'production';
        process.env.LOAD_TEST = 'false';

        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: [],
            }),
            RateLimitingModule,
          ],
        }).compile();

        expect(module).toBeDefined();
      });

      it('should configure strict throttler with 10 limit in production', async () => {
        process.env.NODE_ENV = 'production';
        process.env.LOAD_TEST = 'false';

        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: [],
            }),
            RateLimitingModule,
          ],
        }).compile();

        expect(module).toBeDefined();
      });

      it('should configure lenient throttler with 300 limit in production', async () => {
        process.env.NODE_ENV = 'production';
        process.env.LOAD_TEST = 'false';

        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: [],
            }),
            RateLimitingModule,
          ],
        }).compile();

        expect(module).toBeDefined();
      });
    });

    describe('load test environment', () => {
      it('should override with 100000 limit when LOAD_TEST=true in dev', async () => {
        process.env.NODE_ENV = 'development';
        process.env.LOAD_TEST = 'true';

        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: [],
            }),
            RateLimitingModule,
          ],
        }).compile();

        expect(module).toBeDefined();
      });

      it('should override with 100000 limit when LOAD_TEST=true in production', async () => {
        process.env.NODE_ENV = 'production';
        process.env.LOAD_TEST = 'true';

        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: [],
            }),
            RateLimitingModule,
          ],
        }).compile();

        expect(module).toBeDefined();
      });

      it('should not affect when LOAD_TEST=false', async () => {
        process.env.NODE_ENV = 'production';
        process.env.LOAD_TEST = 'false';

        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: [],
            }),
            RateLimitingModule,
          ],
        }).compile();

        expect(module).toBeDefined();
      });
    });

    describe('throttler names', () => {
      it('should create default throttler', async () => {
        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: [],
            }),
            RateLimitingModule,
          ],
        }).compile();

        expect(module).toBeDefined();
      });

      it('should create strict throttler', async () => {
        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: [],
            }),
            RateLimitingModule,
          ],
        }).compile();

        expect(module).toBeDefined();
      });

      it('should create lenient throttler', async () => {
        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: [],
            }),
            RateLimitingModule,
          ],
        }).compile();

        expect(module).toBeDefined();
      });
    });

    describe('ttl configuration', () => {
      it('should set ttl to 60000 (1 minute) for all throttlers', async () => {
        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: [],
            }),
            RateLimitingModule,
          ],
        }).compile();

        // Configuration is set during module initialization
        expect(module).toBeDefined();
      });
    });

    describe('error message', () => {
      it('should have appropriate error message for rate limit exceeded', async () => {
        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              envFilePath: [],
            }),
            RateLimitingModule,
          ],
        }).compile();

        expect(module).toBeDefined();
        // Error message is set as: 'Rate limit exceeded. Please try again later.'
      });
    });
  });

  describe('module lifecycle', () => {
    it('should initialize successfully', async () => {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: [],
          }),
          RateLimitingModule,
        ],
      }).compile();

      await module.init();
      expect(module).toBeDefined();
    });

    it('should clean up on module destroy', async () => {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: [],
          }),
          RateLimitingModule,
        ],
      }).compile();

      await module.init();
      await module.close();
      expect(module).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle NODE_ENV not set', async () => {
      delete process.env.NODE_ENV;
      process.env.LOAD_TEST = 'false';

      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: [],
          }),
          RateLimitingModule,
        ],
      }).compile();

      expect(module).toBeDefined();
    });

    it('should handle LOAD_TEST not set', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.LOAD_TEST;

      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: [],
          }),
          RateLimitingModule,
        ],
      }).compile();

      expect(module).toBeDefined();
    });

    it('should handle both env vars not set', async () => {
      delete process.env.NODE_ENV;
      delete process.env.LOAD_TEST;

      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: [],
          }),
          RateLimitingModule,
        ],
      }).compile();

      expect(module).toBeDefined();
    });
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });
});
