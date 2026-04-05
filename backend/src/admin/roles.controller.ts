import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '@prisma/client';

const ROLE_DESCRIPTIONS: Record<
  string,
  { label: string; description: string; permissions: string[] }
> = {
  ADMIN: {
    label: 'Amministratore',
    description: 'Accesso completo a tutte le funzionalità',
    permissions: ['*'],
  },
  MANAGER: {
    label: 'Manager',
    description: 'Gestione operativa, report, clienti e prenotazioni',
    permissions: [
      'bookings',
      'customers',
      'invoices',
      'estimates',
      'work-orders',
      'analytics',
      'parts',
    ],
  },
  MECHANIC: {
    label: 'Meccanico',
    description: 'Gestione ordini di lavoro e ispezioni',
    permissions: ['work-orders', 'inspections', 'parts:read'],
  },
  RECEPTIONIST: {
    label: 'Receptionist',
    description: 'Gestione prenotazioni e accoglienza clienti',
    permissions: ['bookings', 'customers:read', 'calendar'],
  },
  VIEWER: {
    label: 'Visualizzatore',
    description: 'Solo visualizzazione dei dati',
    permissions: ['read-only'],
  },
};

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('roles')
export class RolesController {
  @Get()
  @ApiOperation({ summary: 'Lista ruoli disponibili con permessi' })
  @ApiResponse({ status: 200, description: 'Ruoli con label, descrizione e permessi' })
  @ApiResponse({ status: 401, description: 'Non autenticato' })
  findAll(): { success: boolean; data: unknown[] } {
    const roles = Object.values(UserRole).map(role => ({
      id: role,
      name: role,
      ...(ROLE_DESCRIPTIONS[role] || { label: role, description: '', permissions: [] }),
    }));
    return { success: true, data: roles };
  }
}
