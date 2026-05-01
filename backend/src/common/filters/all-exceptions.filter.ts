import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, Request } from 'express';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/nestjs';
import { LoggerService } from '../services/logger.service';

interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
}

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly isDevelopment: boolean;

  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, error } = this.resolveException(exception);

    // Log the full error internally
    this.logger.error(
      `[${request.method}] ${request.url} → ${status}: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // Report server errors to Sentry
    if (status >= 500) {
      Sentry.captureException(exception);
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message: this.isDevelopment ? message : this.sanitizeMessage(message, status),
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }

  private resolveException(exception: unknown): {
    status: number;
    message: string;
    error: string;
  } {
    // NestJS HTTP exceptions (including ValidationPipe errors)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : ((exceptionResponse as Record<string, unknown>).message?.toString() ??
            exception.message);

      // eslint-disable-next-line security/detect-object-injection
      return { status, message, error: HttpStatus[status] ?? 'Error' };
    }

    // Prisma known errors (constraint violations, not found, etc.)
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception);
    }

    // Prisma validation errors
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid data provided',
        error: 'Bad Request',
      };
    }

    // Generic errors
    if (exception instanceof Error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message,
        // eslint-disable-next-line sonarjs/no-duplicate-string
        error: 'Internal Server Error',
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      error: 'Internal Server Error',
    };
  }

  private handlePrismaError(error: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
    error: string;
  } {
    switch (error.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: 'A record with this data already exists',
          error: 'Conflict',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          error: 'Not Found',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid reference: related record not found',
          error: 'Bad Request',
        };
      case 'P2034':
        return {
          status: HttpStatus.CONFLICT,
          message: 'Operation failed due to a concurrent update. Please retry.',
          error: 'Conflict',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'A database error occurred',
          error: 'Internal Server Error',
        };
    }
  }

  /**
   * In production, sanitize error messages to avoid leaking internals
   * (table names, column names, stack traces, SQL errors)
   */
  private sanitizeMessage(message: string, status: number): string {
    // Keep client error messages as-is (4xx) — they're intentional
    if (status >= 400 && status < 500) {
      return message;
    }

    // For 5xx, return a generic message
    return 'An internal error occurred. Please try again later.';
  }
}
