import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '@common/services/prisma.service';
import { UserRole } from '@prisma/client';

interface AuthRequest {
  user: { userId: string; tenantId: string; email: string; role: string };
}

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Lista utenti del tenant' })
  @ApiResponse({ status: 200, description: 'Lista paginata utenti' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  async findAll(
    @Req() req: AuthRequest,
    @Query('role') role?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ success: boolean; data: unknown[]; total: number }> {
    const tenantId = req.user.tenantId;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (role && Object.values(UserRole).includes(role as UserRole)) {
      where.role = role;
    }

    const take = Math.min(parseInt(limit || '50', 10), 100);
    const skip = (Math.max(parseInt(page || '1', 10), 1) - 1) * take;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          avatar: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { success: true, data: users, total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Dettaglio utente per ID' })
  @ApiResponse({ status: 200, description: 'Dati utente' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  @ApiResponse({ status: 404, description: 'Utente non trovato' })
  async findOne(
    @Req() req: AuthRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: unknown }> {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId: req.user.tenantId, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        avatar: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return { success: true, data: user };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Aggiorna utente (nome, ruolo, stato)' })
  @ApiResponse({ status: 200, description: 'Utente aggiornato' })
  @ApiResponse({ status: 400, description: 'Ruolo non valido' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  @ApiResponse({ status: 404, description: 'Utente non trovato' })
  async update(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: { name?: string; role?: UserRole; isActive?: boolean },
  ): Promise<{ success: boolean; data: unknown }> {
    const existing = await this.prisma.user.findFirst({
      where: { id, tenantId: req.user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('User not found');

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.role !== undefined) {
      if (!Object.values(UserRole).includes(body.role)) {
        throw new BadRequestException('Invalid role');
      }
      data.role = body.role;
    }
    if (body.isActive !== undefined) data.isActive = body.isActive;

    await this.prisma.user.updateMany({
      where: { id, tenantId: req.user.tenantId },
      data,
    });

    const updated = await this.prisma.user.findFirst({
      where: { id, tenantId: req.user.tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    return { success: true, data: updated };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Elimina utente (soft delete)' })
  @ApiResponse({ status: 200, description: 'Utente eliminato' })
  @ApiResponse({ status: 400, description: 'Non puoi eliminare te stesso' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  @ApiResponse({ status: 404, description: 'Utente non trovato' })
  async remove(@Req() req: AuthRequest, @Param('id') id: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.user.findFirst({
      where: { id, tenantId: req.user.tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('User not found');
    if (existing.id === req.user.userId) {
      throw new BadRequestException('Cannot delete yourself');
    }

    await this.prisma.user.updateMany({
      where: { id, tenantId: req.user.tenantId },
      data: { deletedAt: new Date(), isActive: false },
    });

    return { success: true };
  }
}
