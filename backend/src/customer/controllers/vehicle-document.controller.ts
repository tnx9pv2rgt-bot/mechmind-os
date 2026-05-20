import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { RolesGuard, UserRole } from '@auth/guards/roles.guard';
import { Roles } from '@auth/decorators/roles.decorator';
import { CurrentTenant } from '@auth/decorators/current-user.decorator';
import { CurrentUser } from '@auth/decorators/current-user.decorator';
import { VehicleDocumentService, VehicleDocType } from '../services/vehicle-document.service';
import 'multer';

const DOC_TYPES: VehicleDocType[] = ['LIBRETTO', 'ASSICURAZIONE', 'REVISIONE', 'BOLLO', 'ALTRO'];

@ApiTags('Vehicle Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vehicles/:vehicleId/documents')
export class VehicleDocumentController {
  constructor(private readonly service: VehicleDocumentService) {}

  @Get()
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List documents for a vehicle' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  async list(@CurrentTenant() tenantId: string, @Param('vehicleId') vehicleId: string) {
    const docs = await this.service.list(tenantId, vehicleId);
    return { success: true, data: docs };
  }

  @Post()
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Upload a document for a vehicle' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'docType', 'name'],
      properties: {
        file: { type: 'string', format: 'binary' },
        docType: { type: 'string', enum: DOC_TYPES },
        name: { type: 'string' },
        expiryDate: { type: 'string', format: 'date' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async upload(
    @CurrentTenant() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Param('vehicleId') vehicleId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('docType') docType: string,
    @Body('name') name: string,
    @Body('expiryDate') expiryDate?: string,
  ) {
    if (!file) throw new BadRequestException('File obbligatorio');
    if (!name?.trim()) throw new BadRequestException('Nome documento obbligatorio');
    if (!DOC_TYPES.includes(docType as VehicleDocType)) {
      throw new BadRequestException(`Tipo non valido. Usa: ${DOC_TYPES.join(', ')}`);
    }

    const doc = await this.service.upload(
      tenantId,
      vehicleId,
      userId,
      file,
      docType as VehicleDocType,
      name,
      expiryDate,
    );
    return { success: true, data: doc };
  }

  @Get(':documentId/download')
  @Roles(UserRole.RECEPTIONIST, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get signed download URL for a document' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  async download(
    @CurrentTenant() tenantId: string,
    @Param('vehicleId') vehicleId: string,
    @Param('documentId') documentId: string,
  ) {
    const result = await this.service.getDownloadUrl(tenantId, vehicleId, documentId);
    return { success: true, data: result };
  }

  @Delete(':documentId')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a vehicle document' })
  @ApiParam({ name: 'vehicleId', description: 'Vehicle ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('vehicleId') vehicleId: string,
    @Param('documentId') documentId: string,
  ) {
    await this.service.remove(tenantId, vehicleId, documentId);
    return { success: true, message: 'Documento eliminato' };
  }
}
