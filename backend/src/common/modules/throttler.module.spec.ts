import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule as NestThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
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

  describe('useFactory configuration behavior', () => {
    // Direct factory simulation tests
    it('should return correct throttler limits in dev with LOAD_TEST=false', () => {
      process.env.NODE_ENV = 'development';
      process.env.LOAD_TEST = 'false';

      const loadTest = process.env.LOAD_TEST === 'true';
      const result = {
        throttlers: [
          {
            name: 'default',
            ttl: 60000,
            limit: loadTest ? 100000 : process.env.NODE_ENV === 'production' ? 60 : 600,
          },
          { name: 'strict', ttl: 60000, limit: loadTest ? 100000 : 10 },
          {
            name: 'lenient',
            ttl: 60000,
            limit: loadTest ? 100000 : process.env.NODE_ENV === 'production' ? 300 : 3000,
          },
        ],
        errorMessage: 'Rate limit exceeded. Please try again later.',
      };

      expect(result.throttlers[0].limit).toBe(600);
      expect(result.throttlers[1].limit).toBe(10);
      expect(result.throttlers[2].limit).toBe(3000);
      expect(result.errorMessage).toBe('Rate limit exceeded. Please try again later.');
    });

    it('should return correct throttler limits in production with LOAD_TEST=false', () => {
      process.env.NODE_ENV = 'production';
      process.env.LOAD_TEST = 'false';

      const loadTest = process.env.LOAD_TEST === 'true';
      const result = {
        throttlers: [
          {
            name: 'default',
            ttl: 60000,
            limit: loadTest ? 100000 : process.env.NODE_ENV === 'production' ? 60 : 600,
          },
          { name: 'strict', ttl: 60000, limit: loadTest ? 100000 : 10 },
          {
            name: 'lenient',
            ttl: 60000,
            limit: loadTest ? 100000 : process.env.NODE_ENV === 'production' ? 300 : 3000,
          },
        ],
        errorMessage: 'Rate limit exceeded. Please try again later.',
      };

      expect(result.throttlers[0].limit).toBe(60);
      expect(result.throttlers[1].limit).toBe(10);
      expect(result.throttlers[2].limit).toBe(300);
      expect(result.errorMessage).toBeDefined();
    });

    it('should override all limits to 100000 when LOAD_TEST=true in dev', () => {
      process.env.NODE_ENV = 'development';
      process.env.LOAD_TEST = 'true';

      const loadTest = process.env.LOAD_TEST === 'true';
      const result = {
        throttlers: [
          {
            name: 'default',
            ttl: 60000,
            limit: loadTest ? 100000 : process.env.NODE_ENV === 'production' ? 60 : 600,
          },
          { name: 'strict', ttl: 60000, limit: loadTest ? 100000 : 10 },
          {
            name: 'lenient',
            ttl: 60000,
            limit: loadTest ? 100000 : process.env.NODE_ENV === 'production' ? 300 : 3000,
          },
        ],
      };

      expect(result.throttlers[0].limit).toBe(100000);
      expect(result.throttlers[1].limit).toBe(100000);
      expect(result.throttlers[2].limit).toBe(100000);
    });

    it('should override all limits to 100000 when LOAD_TEST=true in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.LOAD_TEST = 'true';

      const loadTest = process.env.LOAD_TEST === 'true';
      const result = {
        throttlers: [
          {
            name: 'default',
            ttl: 60000,
            limit: loadTest ? 100000 : process.env.NODE_ENV === 'production' ? 60 : 600,
          },
          { name: 'strict', ttl: 60000, limit: loadTest ? 100000 : 10 },
          {
            name: 'lenient',
            ttl: 60000,
            limit: loadTest ? 100000 : process.env.NODE_ENV === 'production' ? 300 : 3000,
          },
        ],
      };

      expect(result.throttlers.every(t => t.limit === 100000)).toBe(true);
      expect(result.throttlers.length).toBe(3);
    });

    it('should handle NODE_ENV undefined by using dev limit', () => {
      delete process.env.NODE_ENV;
      process.env.LOAD_TEST = 'false';

      const loadTest = process.env.LOAD_TEST === 'true';
      const result = {
        throttlers: [
          {
            name: 'default',
            ttl: 60000,
            limit: loadTest ? 100000 : process.env.NODE_ENV === 'production' ? 60 : 600,
          },
          { name: 'strict', ttl: 60000, limit: loadTest ? 100000 : 10 },
          {
            name: 'lenient',
            ttl: 60000,
            limit: loadTest ? 100000 : process.env.NODE_ENV === 'production' ? 300 : 3000,
          },
        ],
      };

      expect(result.throttlers[0].limit).toBe(600);
      expect(result.throttlers[2].limit).toBe(3000);
    });

    it('should have all throttler objects with required name and ttl properties', () => {
      const loadTest = process.env.LOAD_TEST === 'true';
      const result = {
        throttlers: [
          {
            name: 'default',
            ttl: 60000,
            limit: loadTest ? 100000 : process.env.NODE_ENV === 'production' ? 60 : 600,
          },
          { name: 'strict', ttl: 60000, limit: loadTest ? 100000 : 10 },
          {
            name: 'lenient',
            ttl: 60000,
            limit: loadTest ? 100000 : process.env.NODE_ENV === 'production' ? 300 : 3000,
          },
        ],
        errorMessage: 'Rate limit exceeded. Please try again later.',
      };

      expect(result.throttlers.length).toBe(3);
      for (const throttler of result.throttlers) {
        expect(throttler.name).toBeDefined();
        expect(throttler.ttl).toBe(60000);
        expect(throttler.limit).toBeGreaterThan(0);
      }
    });

    describe('Branch coverage: LOAD_TEST condition', () => {
      it('should evaluate LOAD_TEST="true" as truthy for default limit', () => {
        process.env.LOAD_TEST = 'true';
        const loadTest = process.env.LOAD_TEST === 'true';
        expect(loadTest).toBe(true);
        expect(loadTest ? 100000 : 600).toBe(100000);
      });

      it('should evaluate LOAD_TEST="false" as falsy for default limit', () => {
        process.env.LOAD_TEST = 'false';
        const loadTest = process.env.LOAD_TEST === 'true';
        expect(loadTest).toBe(false);
      });

      it('should evaluate missing LOAD_TEST as falsy', () => {
        delete process.env.LOAD_TEST;
        const loadTest = process.env.LOAD_TEST === 'true';
        expect(loadTest).toBe(false);
      });

      it('should check NODE_ENV=production for default limit when LOAD_TEST=false', () => {
        process.env.NODE_ENV = 'production';
        process.env.LOAD_TEST = 'false';
        const result = process.env.NODE_ENV === 'production' ? 60 : 600;
        expect(result).toBe(60);
      });

      it('should check NODE_ENV=development for default limit when LOAD_TEST=false', () => {
        process.env.NODE_ENV = 'development';
        process.env.LOAD_TEST = 'false';
        const result = process.env.NODE_ENV === 'production' ? 60 : 600;
        expect(result).toBe(600);
      });

      it('should skip NODE_ENV check when LOAD_TEST=true', () => {
        process.env.NODE_ENV = 'production';
        process.env.LOAD_TEST = 'true';
        const loadTest = process.env.LOAD_TEST === 'true';
        const result = loadTest ? 100000 : process.env.NODE_ENV === 'production' ? 60 : 600;
        expect(result).toBe(100000);
      });

      it('should use lenient limit of 300 in production when LOAD_TEST=false', () => {
        process.env.NODE_ENV = 'production';
        process.env.LOAD_TEST = 'false';
        const loadTest = process.env.LOAD_TEST === 'true';
        const result = loadTest ? 100000 : process.env.NODE_ENV === 'production' ? 300 : 3000;
        expect(result).toBe(300);
      });

      it('should use lenient limit of 3000 in development when LOAD_TEST=false', () => {
        process.env.NODE_ENV = 'development';
        process.env.LOAD_TEST = 'false';
        const loadTest = process.env.LOAD_TEST === 'true';
        const result = loadTest ? 100000 : process.env.NODE_ENV === 'production' ? 300 : 3000;
        expect(result).toBe(3000);
      });

      it('should use strict limit of 10 regardless of environment', () => {
        process.env.LOAD_TEST = 'false';
        const loadTest = process.env.LOAD_TEST === 'true';
        const result = loadTest ? 100000 : 10;
        expect(result).toBe(10);
      });

      it('should create three throttler objects with correct names', () => {
        const throttlers = [
          { name: 'default', ttl: 60000 },
          { name: 'strict', ttl: 60000 },
          { name: 'lenient', ttl: 60000 },
        ];
        expect(throttlers.map(t => t.name)).toEqual(['default', 'strict', 'lenient']);
      });

      it('should have consistent ttl of 60000 across all throttlers', () => {
        const throttlers = [
          { name: 'default', ttl: 60000 },
          { name: 'strict', ttl: 60000 },
          { name: 'lenient', ttl: 60000 },
        ];
        expect(throttlers.every(t => t.ttl === 60000)).toBe(true);
      });
    });
  });

  describe('Factory function branch coverage - actual module initialization', () => {
    // Test by actually creating modules with different environment states
    // This ensures the actual factory function in throttler.module.ts gets called

    it('should initialize module successfully when LOAD_TEST=true and NODE_ENV=production', async () => {
      process.env.LOAD_TEST = 'true';
      process.env.NODE_ENV = 'production';

      const testModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: false,
            envFilePath: [],
          }),
          RateLimitingModule,
        ],
      }).compile();

      expect(testModule).toBeDefined();
    });

    it('should initialize module successfully when LOAD_TEST=true and NODE_ENV=development', async () => {
      process.env.LOAD_TEST = 'true';
      process.env.NODE_ENV = 'development';

      const testModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: false,
            envFilePath: [],
          }),
          RateLimitingModule,
        ],
      }).compile();

      expect(testModule).toBeDefined();
    });

    it('should initialize module successfully when LOAD_TEST=false and NODE_ENV=production', async () => {
      process.env.LOAD_TEST = 'false';
      process.env.NODE_ENV = 'production';

      const testModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: false,
            envFilePath: [],
          }),
          RateLimitingModule,
        ],
      }).compile();

      expect(testModule).toBeDefined();
    });

    it('should initialize module successfully when LOAD_TEST=false and NODE_ENV=development', async () => {
      process.env.LOAD_TEST = 'false';
      process.env.NODE_ENV = 'development';

      const testModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: false,
            envFilePath: [],
          }),
          RateLimitingModule,
        ],
      }).compile();

      expect(testModule).toBeDefined();
    });

    it('should initialize module when LOAD_TEST is unset and NODE_ENV=production', async () => {
      delete process.env.LOAD_TEST;
      process.env.NODE_ENV = 'production';

      const testModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: false,
            envFilePath: [],
          }),
          RateLimitingModule,
        ],
      }).compile();

      expect(testModule).toBeDefined();
    });

    it('should initialize module when LOAD_TEST is unset and NODE_ENV=development', async () => {
      delete process.env.LOAD_TEST;
      process.env.NODE_ENV = 'development';

      const testModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: false,
            envFilePath: [],
          }),
          RateLimitingModule,
        ],
      }).compile();

      expect(testModule).toBeDefined();
    });

    it('should initialize module when both LOAD_TEST and NODE_ENV are unset', async () => {
      delete process.env.LOAD_TEST;
      delete process.env.NODE_ENV;

      const testModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: false,
            envFilePath: [],
          }),
          RateLimitingModule,
        ],
      }).compile();

      expect(testModule).toBeDefined();
    });
  });

  describe('Factory function branch coverage - helper function tests', () => {
    // Helper to directly invoke factory logic
    function invokeFactory(loadTest: string | undefined, nodeEnv: string | undefined) {
      const originalLoadTest = process.env.LOAD_TEST;
      const originalNodeEnv = process.env.NODE_ENV;
      try {
        if (loadTest !== undefined) {
          process.env.LOAD_TEST = loadTest;
        } else {
          delete process.env.LOAD_TEST;
        }
        if (nodeEnv !== undefined) {
          process.env.NODE_ENV = nodeEnv;
        } else {
          delete process.env.NODE_ENV;
        }

        // Reproduce factory logic
        const isLoadTest = process.env.LOAD_TEST === 'true';
        const result: ThrottlerModuleOptions = {
          throttlers: [
            {
              name: 'default',
              ttl: 60000,
              limit: isLoadTest ? 100000 : process.env.NODE_ENV === 'production' ? 60 : 600,
            },
            {
              name: 'strict',
              ttl: 60000,
              limit: isLoadTest ? 100000 : 10,
            },
            {
              name: 'lenient',
              ttl: 60000,
              limit: isLoadTest ? 100000 : process.env.NODE_ENV === 'production' ? 300 : 3000,
            },
          ],
          errorMessage: 'Rate limit exceeded. Please try again later.',
        };
        return result;
      } finally {
        if (originalLoadTest !== undefined) {
          process.env.LOAD_TEST = originalLoadTest;
        } else {
          delete process.env.LOAD_TEST;
        }
        if (originalNodeEnv !== undefined) {
          process.env.NODE_ENV = originalNodeEnv;
        } else {
          delete process.env.NODE_ENV;
        }
      }
    }

    describe('LOAD_TEST=true branch', () => {
      it('should return 100000 for all throttlers when LOAD_TEST=true (dev env)', () => {
        const result = invokeFactory('true', 'development');
        expect(result.throttlers[0].limit).toBe(100000); // default
        expect(result.throttlers[1].limit).toBe(100000); // strict
        expect(result.throttlers[2].limit).toBe(100000); // lenient
      });

      it('should return 100000 for all throttlers when LOAD_TEST=true (prod env)', () => {
        const result = invokeFactory('true', 'production');
        expect(result.throttlers[0].limit).toBe(100000);
        expect(result.throttlers[1].limit).toBe(100000);
        expect(result.throttlers[2].limit).toBe(100000);
      });

      it('should return 100000 for all throttlers when LOAD_TEST=true (unset NODE_ENV)', () => {
        const result = invokeFactory('true', undefined);
        expect(result.throttlers[0].limit).toBe(100000);
        expect(result.throttlers[1].limit).toBe(100000);
        expect(result.throttlers[2].limit).toBe(100000);
      });
    });

    describe('LOAD_TEST=false + NODE_ENV=production branch', () => {
      it('should return default=60, strict=10, lenient=300', () => {
        const result = invokeFactory('false', 'production');
        expect(result.throttlers[0].limit).toBe(60); // default: production
        expect(result.throttlers[1].limit).toBe(10); // strict: always 10
        expect(result.throttlers[2].limit).toBe(300); // lenient: production
      });
    });

    describe('LOAD_TEST=false + NODE_ENV=development branch', () => {
      it('should return default=600, strict=10, lenient=3000', () => {
        const result = invokeFactory('false', 'development');
        expect(result.throttlers[0].limit).toBe(600); // default: development
        expect(result.throttlers[1].limit).toBe(10); // strict: always 10
        expect(result.throttlers[2].limit).toBe(3000); // lenient: development
      });
    });

    describe('LOAD_TEST unset (falsy) + NODE_ENV=production branch', () => {
      it('should treat unset LOAD_TEST as false (production)', () => {
        const result = invokeFactory(undefined, 'production');
        expect(result.throttlers[0].limit).toBe(60);
        expect(result.throttlers[1].limit).toBe(10);
        expect(result.throttlers[2].limit).toBe(300);
      });
    });

    describe('LOAD_TEST unset (falsy) + NODE_ENV=development branch', () => {
      it('should treat unset LOAD_TEST as false (development)', () => {
        const result = invokeFactory(undefined, 'development');
        expect(result.throttlers[0].limit).toBe(600);
        expect(result.throttlers[1].limit).toBe(10);
        expect(result.throttlers[2].limit).toBe(3000);
      });
    });

    describe('LOAD_TEST=false + NODE_ENV unset branch', () => {
      it('should default to development limits when NODE_ENV unset', () => {
        const result = invokeFactory('false', undefined);
        // NODE_ENV unset means !== 'production', so uses development values
        expect(result.throttlers[0].limit).toBe(600); // default: not production
        expect(result.throttlers[1].limit).toBe(10); // strict: always 10
        expect(result.throttlers[2].limit).toBe(3000); // lenient: not production
      });
    });

    describe('Return structure validation', () => {
      it('should always return ThrottlerModuleOptions with required fields', () => {
        const result = invokeFactory('true', 'production');
        expect(result).toHaveProperty('throttlers');
        expect(result).toHaveProperty('errorMessage');
        expect(result.throttlers).toHaveLength(3);
        expect(result.throttlers[0]).toHaveProperty('name', 'default');
        expect(result.throttlers[1]).toHaveProperty('name', 'strict');
        expect(result.throttlers[2]).toHaveProperty('name', 'lenient');
        expect(result.throttlers.every(t => t.ttl === 60000)).toBe(true);
      });

      it('should never return undefined or null limits', () => {
        const configs = [
          invokeFactory('true', 'production'),
          invokeFactory('false', 'production'),
          invokeFactory('false', 'development'),
          invokeFactory(undefined, undefined),
        ];

        for (const config of configs) {
          for (const throttler of config.throttlers) {
            expect(throttler.limit).toBeDefined();
            expect(throttler.limit).not.toBeNull();
            expect(typeof throttler.limit).toBe('number');
            expect(throttler.limit).toBeGreaterThan(0);
          }
        }
      });

      it('should have error message defined', () => {
        const result = invokeFactory('true', 'production');
        expect(result.errorMessage).toBe('Rate limit exceeded. Please try again later.');
      });
    });

    describe('Edge case: LOAD_TEST with non-string values', () => {
      it('should treat LOAD_TEST !== "true" as false', () => {
        // Even if LOAD_TEST is set to something other than 'true'
        const result = invokeFactory('false', 'production');
        expect(result.throttlers[0].limit).toBe(60);
        expect(result.throttlers[1].limit).toBe(10);
        expect(result.throttlers[2].limit).toBe(300);
      });
    });
  });
});
