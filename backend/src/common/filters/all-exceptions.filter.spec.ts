import { AllExceptionsFilter } from './all-exceptions.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/nestjs';
import { LoggerService } from '../services/logger.service';

jest.mock('@sentry/nestjs', () => ({
  captureException: jest.fn(),
}));

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let logger: { error: jest.Mock; log: jest.Mock; warn: jest.Mock; debug: jest.Mock };
  let configService: { get: jest.Mock };
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockRequest: { method: string; url: string };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = { error: jest.fn(), log: jest.fn(), warn: jest.fn(), debug: jest.fn() };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockRequest = { method: 'GET', url: '/test' };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  describe('development mode', () => {
    beforeEach(() => {
      configService = { get: jest.fn().mockReturnValue('development') };
      filter = new AllExceptionsFilter(
        logger as unknown as LoggerService,
        configService as unknown as ConfigService,
      );
    });

    it('should handle HttpException with string response', () => {
      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);
      jest.spyOn(exception, 'getResponse').mockReturnValue('Resource not found');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Resource not found',
          path: '/test',
        }),
      );
    });

    it('should handle HttpException with object response', () => {
      const exception = new HttpException(
        { message: 'Validation failed', statusCode: 400 },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Validation failed',
        }),
      );
    });

    it('should handle HttpException with object response without message', () => {
      const exception = new HttpException({ statusCode: 400 }, HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      // Falls back to exception.message
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
        }),
      );
    });

    it('should handle Prisma P2002 unique constraint error', () => {
      const exception = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'A record with this data already exists',
          error: 'Conflict',
        }),
      );
    });

    it('should handle Prisma P2025 not found error', () => {
      const exception = new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      });

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Record not found',
          error: 'Not Found',
        }),
      );
    });

    it('should handle Prisma P2003 foreign key error', () => {
      const exception = new Prisma.PrismaClientKnownRequestError('Foreign key constraint', {
        code: 'P2003',
        clientVersion: '5.0.0',
      });

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid reference: related record not found',
        }),
      );
    });

    it('should handle Prisma P2034 concurrent update error', () => {
      const exception = new Prisma.PrismaClientKnownRequestError('Transaction conflict', {
        code: 'P2034',
        clientVersion: '5.0.0',
      });

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Operation failed due to a concurrent update. Please retry.',
        }),
      );
    });

    it('should handle unknown Prisma error code as 500', () => {
      const exception = new Prisma.PrismaClientKnownRequestError('Unknown', {
        code: 'P9999',
        clientVersion: '5.0.0',
      });

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'A database error occurred',
        }),
      );
    });

    it('should handle PrismaClientValidationError', () => {
      const exception = new Prisma.PrismaClientValidationError('Invalid data', {
        clientVersion: '5.0.0',
      });

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid data provided',
        }),
      );
    });

    it('should handle generic Error', () => {
      const exception = new Error('Something went wrong');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Something went wrong',
          error: 'Internal Server Error',
        }),
      );
    });

    it('should handle unknown non-Error exception', () => {
      filter.catch('string error', mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'An unexpected error occurred',
        }),
      );
    });

    it('should report 500+ errors to Sentry', () => {
      const exception = new Error('Server error');

      filter.catch(exception, mockHost);

      expect(Sentry.captureException).toHaveBeenCalledWith(exception);
    });

    it('should NOT report 4xx errors to Sentry', () => {
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockHost);

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('should log error with stack trace for Error instances', () => {
      const exception = new Error('Test error');

      filter.catch(exception, mockHost);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('GET'),
        expect.stringContaining('Error'),
      );
    });

    it('should log error without stack for non-Error', () => {
      filter.catch(42, mockHost);

      expect(logger.error).toHaveBeenCalledWith(expect.any(String), undefined);
    });

    it('should expose full message in development', () => {
      const exception = new HttpException(
        'Detailed internal error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      jest.spyOn(exception, 'getResponse').mockReturnValue('Detailed internal error');

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Detailed internal error',
        }),
      );
    });
  });

  describe('production mode', () => {
    beforeEach(() => {
      configService = { get: jest.fn().mockReturnValue('production') };
      filter = new AllExceptionsFilter(
        logger as unknown as LoggerService,
        configService as unknown as ConfigService,
      );
    });

    it('should sanitize 5xx messages in production', () => {
      const exception = new Error('SQL syntax error near...');

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'An internal error occurred. Please try again later.',
        }),
      );
    });

    it('should keep 4xx messages in production', () => {
      const exception = new HttpException('Email already exists', HttpStatus.CONFLICT);
      jest.spyOn(exception, 'getResponse').mockReturnValue('Email already exists');

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Email already exists',
        }),
      );
    });
  });
});
