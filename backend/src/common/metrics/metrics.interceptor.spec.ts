import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { Request, Response } from 'express';

describe('MetricsInterceptor', () => {
  let interceptor: MetricsInterceptor;
  let metricsService: MetricsService;
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    metricsService = new MetricsService();
    interceptor = new MetricsInterceptor(metricsService);

    mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          url: '/api/bookings',
          route: { path: '/api/bookings' },
        } as unknown as Request),
        getResponse: () => ({
          statusCode: 200,
        } as unknown as Response),
      }),
    } as ExecutionContext;

    mockCallHandler = {
      handle: () => of({}),
    };
  });

  describe('happy path', () => {
    it('should record metrics for successful request', (done) => {
      const incSpy = jest.spyOn(metricsService.httpRequestsTotal, 'inc');
      const observeSpy = jest.spyOn(metricsService.httpRequestDuration, 'observe');

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        expect(incSpy).toHaveBeenCalledWith({
          method: 'GET',
          path: '/api/bookings',
          status_code: '200',
        });
        expect(observeSpy).toHaveBeenCalledWith(
          {
            method: 'GET',
            path: '/api/bookings',
            status_code: '200',
          },
          expect.any(Number),
        );
        done();
      });
    });

    it('should record metrics for POST request', (done) => {
      const postContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            url: '/api/bookings',
            route: { path: '/api/bookings' },
          } as unknown as Request),
          getResponse: () => ({
            statusCode: 201,
          } as unknown as Response),
        }),
      } as ExecutionContext;

      const incSpy = jest.spyOn(metricsService.httpRequestsTotal, 'inc');
      interceptor.intercept(postContext, mockCallHandler).subscribe(() => {
        expect(incSpy).toHaveBeenCalledWith({
          method: 'POST',
          path: '/api/bookings',
          status_code: '201',
        });
        done();
      });
    });

    it('should record metrics for DELETE request', (done) => {
      const deleteContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'DELETE',
            url: '/api/bookings/123',
            route: { path: '/api/bookings/:id' },
          } as unknown as Request),
          getResponse: () => ({
            statusCode: 204,
          } as unknown as Response),
        }),
      } as ExecutionContext;

      const incSpy = jest.spyOn(metricsService.httpRequestsTotal, 'inc');
      interceptor.intercept(deleteContext, mockCallHandler).subscribe(() => {
        expect(incSpy).toHaveBeenCalledWith({
          method: 'DELETE',
          path: '/api/bookings/:id',
          status_code: '204',
        });
        done();
      });
    });
  });

  describe('error handling', () => {
    it('should record metrics when handler throws error', (done) => {
      const errorHandler = {
        handle: () => throwError(() => ({ status: 400 })),
      };

      const incSpy = jest.spyOn(metricsService.httpRequestsTotal, 'inc');

      interceptor.intercept(mockContext, errorHandler).subscribe(
        () => {
          fail('should not succeed');
        },
        () => {
          expect(incSpy).toHaveBeenCalledWith({
            method: 'GET',
            path: '/api/bookings',
            status_code: '400',
          });
          done();
        },
      );
    });

    it('should default to 500 status when error has no status', (done) => {
      const errorHandler = {
        handle: () => throwError(() => new Error('Unknown error')),
      };

      const incSpy = jest.spyOn(metricsService.httpRequestsTotal, 'inc');

      interceptor.intercept(mockContext, errorHandler).subscribe(
        () => {
          fail('should not succeed');
        },
        () => {
          expect(incSpy).toHaveBeenCalledWith({
            method: 'GET',
            path: '/api/bookings',
            status_code: '500',
          });
          done();
        },
      );
    });
  });

  describe('path normalization', () => {
    it('should normalize UUID in path', (done) => {
      const uuidContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'GET',
            url: '/api/bookings/550e8400-e29b-41d4-a716-446655440000',
            route: { path: '/api/bookings/:id' },
          } as unknown as Request),
          getResponse: () => ({
            statusCode: 200,
          } as unknown as Response),
        }),
      } as ExecutionContext;

      const incSpy = jest.spyOn(metricsService.httpRequestsTotal, 'inc');
      interceptor.intercept(uuidContext, mockCallHandler).subscribe(() => {
        expect(incSpy).toHaveBeenCalledWith({
          method: 'GET',
          path: '/api/bookings/:id',
          status_code: '200',
        });
        done();
      });
    });

    it('should normalize numeric ID in path', (done) => {
      const numericContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'GET',
            url: '/api/bookings/12345',
            route: { path: '/api/bookings/:id' },
          } as unknown as Request),
          getResponse: () => ({
            statusCode: 200,
          } as unknown as Response),
        }),
      } as ExecutionContext;

      const incSpy = jest.spyOn(metricsService.httpRequestsTotal, 'inc');
      interceptor.intercept(numericContext, mockCallHandler).subscribe(() => {
        expect(incSpy).toHaveBeenCalledWith({
          method: 'GET',
          path: '/api/bookings/:id',
          status_code: '200',
        });
        done();
      });
    });
  });

  describe('duration tracking', () => {
    it('should calculate duration correctly', (done) => {
      const observeSpy = jest.spyOn(metricsService.httpRequestDuration, 'observe');

      interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
        expect(observeSpy).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Number),
        );
        const duration = observeSpy.mock.calls[0][1];
        expect(duration).toBeGreaterThanOrEqual(0);
        expect(duration).toBeLessThan(1);
        done();
      });
    });
  });

  describe('status code handling', () => {
    it('should record various HTTP status codes', async () => {
      const testCases = [
        { status: 200 },
        { status: 201 },
        { status: 204 },
        { status: 400 },
        { status: 401 },
        { status: 404 },
        { status: 500 },
      ];

      for (const testCase of testCases) {
        const statusContext = {
          switchToHttp: () => ({
            getRequest: () => ({
              method: 'GET',
              url: '/test',
              route: { path: '/test' },
            } as unknown as Request),
            getResponse: () => ({
              statusCode: testCase.status,
            } as unknown as Response),
          }),
        } as ExecutionContext;

        const incSpy = jest.spyOn(metricsService.httpRequestsTotal, 'inc');
        await new Promise((resolve) => {
          interceptor.intercept(statusContext, mockCallHandler).subscribe(() => {
            expect(incSpy).toHaveBeenCalledWith({
              method: 'GET',
              path: '/test',
              status_code: String(testCase.status),
            });
            resolve(null);
          });
        });
      }
    });
  });
});
