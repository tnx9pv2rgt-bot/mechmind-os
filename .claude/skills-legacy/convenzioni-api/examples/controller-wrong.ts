// ❌ Controller SBAGLIATO — Tutte le violazioni comuni

import { Controller, Get, Post, Body, Param } from '@nestjs/common';
// ❌ Manca @ApiTags
// ❌ Manca @ApiBearerAuth
// ❌ Manca @UseGuards(JwtAuthGuard)
import { CustomerService } from '../services/customer.service';

@Controller('customers') // ❌ Manca prefisso v1/
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  // ❌ Manca @ApiOperation
  // ❌ Manca @TenantId() — data leak!
  async findAll() {
    return this.customerService.findAll(); // ❌ Nessun tenantId passato
  }

  @Get(':id')
  async findOne(@Param('id') id: string) { // ❌ Manca ParseUUIDPipe
    // ❌ Manca @TenantId()
    return this.customerService.findOne(id);
  }

  @Post()
  // ❌ Manca @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: any) { // ❌ Tipo `any` invece di DTO
    return this.customerService.create(dto);
  }

  // ❌ Manca PATCH per update
  // ❌ Manca DELETE per remove
}
