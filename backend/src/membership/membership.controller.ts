import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { MembershipService } from './membership.service';
import { CreateProgramDto, UpdateProgramDto } from './dto/create-program.dto';
import { EnrollCustomerDto } from './dto/enroll-customer.dto';
import { RedeemBenefitDto } from './dto/redeem-benefit.dto';

@ApiTags('Memberships')
@Controller({ path: 'memberships', version: '1' })
@UseGuards(JwtAuthGuard)
export class MembershipController {
  constructor(private readonly service: MembershipService) {}

  // ─── Programs CRUD ───

  @Get('programs')
  @ApiOperation({ summary: 'Lista programmi membership' })
  @ApiResponse({ status: 200, description: 'Lista programmi restituita' })
  async listPrograms(
    @CurrentUser('tenantId') tenantId: string,
  ): Promise<ReturnType<typeof this.service.listPrograms>> {
    return this.service.listPrograms(tenantId);
  }

  @Get('programs/:id')
  @ApiOperation({ summary: 'Dettaglio programma membership' })
  @ApiResponse({ status: 200, description: 'Programma restituito' })
  @ApiResponse({ status: 404, description: 'Programma non trovato' })
  async getProgram(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReturnType<typeof this.service.getProgram>> {
    return this.service.getProgram(tenantId, id);
  }

  @Post('programs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea programma membership' })
  @ApiResponse({ status: 201, description: 'Programma creato' })
  @ApiResponse({ status: 409, description: 'Nome programma duplicato' })
  async createProgram(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateProgramDto,
  ): Promise<ReturnType<typeof this.service.createProgram>> {
    return this.service.createProgram(tenantId, dto);
  }

  @Patch('programs/:id')
  @ApiOperation({ summary: 'Aggiorna programma membership' })
  @ApiResponse({ status: 200, description: 'Programma aggiornato' })
  @ApiResponse({ status: 404, description: 'Programma non trovato' })
  async updateProgram(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProgramDto,
  ): Promise<ReturnType<typeof this.service.updateProgram>> {
    return this.service.updateProgram(tenantId, id, dto);
  }

  @Delete('programs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina programma membership' })
  @ApiResponse({ status: 204, description: 'Programma eliminato' })
  @ApiResponse({ status: 400, description: 'Iscrizioni attive impediscono eliminazione' })
  @ApiResponse({ status: 404, description: 'Programma non trovato' })
  async deleteProgram(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.service.deleteProgram(tenantId, id);
  }

  // ─── Enrollment ───

  @Post('enroll')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Iscrivi cliente a programma membership' })
  @ApiResponse({ status: 201, description: 'Cliente iscritto' })
  @ApiResponse({ status: 404, description: 'Programma non trovato' })
  @ApiResponse({ status: 409, description: 'Cliente già iscritto' })
  async enrollCustomer(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: EnrollCustomerDto,
  ): Promise<ReturnType<typeof this.service.enrollCustomer>> {
    return this.service.enrollCustomer(tenantId, dto.customerId, dto.programId, dto.billingCycle);
  }

  // ─── Customer memberships ───

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Iscrizioni del cliente' })
  @ApiResponse({ status: 200, description: 'Lista iscrizioni restituita' })
  async getCustomerMemberships(
    @CurrentUser('tenantId') tenantId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ): Promise<ReturnType<typeof this.service.getCustomerMemberships>> {
    return this.service.getCustomerMemberships(tenantId, customerId);
  }

  @Get('customer/:customerId/benefits')
  @ApiOperation({ summary: 'Benefit disponibili per il cliente' })
  @ApiResponse({ status: 200, description: 'Benefit restituiti' })
  async checkBenefits(
    @CurrentUser('tenantId') tenantId: string,
    @Param('customerId', ParseUUIDPipe) customerId: string,
  ): Promise<ReturnType<typeof this.service.checkBenefits>> {
    return this.service.checkBenefits(tenantId, customerId);
  }

  // ─── Membership actions ───

  @Post(':id/redeem')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Riscatta benefit membership' })
  @ApiResponse({ status: 201, description: 'Benefit riscattato' })
  @ApiResponse({ status: 400, description: 'Limite mensile raggiunto o benefit non disponibile' })
  @ApiResponse({ status: 404, description: 'Iscrizione non trovata' })
  async redeemBenefit(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RedeemBenefitDto,
  ): Promise<ReturnType<typeof this.service.redeemBenefit>> {
    return this.service.redeemBenefit(
      tenantId,
      id,
      dto.benefitType,
      dto.bookingId,
      dto.workOrderId,
      dto.valueCents,
    );
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancella iscrizione membership' })
  @ApiResponse({ status: 200, description: 'Iscrizione cancellata' })
  @ApiResponse({ status: 400, description: 'Iscrizione già cancellata' })
  @ApiResponse({ status: 404, description: 'Iscrizione non trovata' })
  async cancelMembership(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReturnType<typeof this.service.cancelMembership>> {
    return this.service.cancelMembership(tenantId, id);
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Metti in pausa iscrizione membership' })
  @ApiResponse({ status: 200, description: 'Iscrizione messa in pausa' })
  @ApiResponse({ status: 400, description: 'Solo iscrizioni attive possono essere messe in pausa' })
  @ApiResponse({ status: 404, description: 'Iscrizione non trovata' })
  async pauseMembership(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReturnType<typeof this.service.pauseMembership>> {
    return this.service.pauseMembership(tenantId, id);
  }

  @Get(':id/redemptions')
  @ApiOperation({ summary: 'Storico riscatti membership' })
  @ApiResponse({ status: 200, description: 'Storico riscatti restituito' })
  @ApiResponse({ status: 404, description: 'Iscrizione non trovata' })
  async getRedemptionHistory(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReturnType<typeof this.service.getRedemptionHistory>> {
    return this.service.getRedemptionHistory(tenantId, id);
  }
}
