import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '@common/services/prisma.service';
import { LoggerService } from '@common/services/logger.service';

export interface RequestWithTenant extends Request {
  tenantId?: string;
  userId?: string;
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async use(req: RequestWithTenant, res: Response, next: NextFunction) {
    const tenantId = req.tenantId;

    if (tenantId) {
      try {
        // Set tenant context for RLS
        await this.prisma.setTenantContext(tenantId);
        
        this.logger.debug(`Tenant context set: ${tenantId}`, 'TenantContextMiddleware');
        
        // Add response listener to clear context after request
        res.on('finish', async () => {
          try {
            await this.prisma.clearTenantContext();
            this.logger.debug(`Tenant context cleared: ${tenantId}`, 'TenantContextMiddleware');
          } catch (error) {
            this.logger.error('Failed to clear tenant context', error.stack);
          }
        });
      } catch (error) {
        this.logger.error(`Failed to set tenant context: ${error.message}`);
        // Continue without RLS - will fail at query level if tenant required
      }
    } else {
      this.logger.debug('No tenant ID in request - RLS not applied');
    }

    next();
  }
}
