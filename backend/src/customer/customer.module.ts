import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CustomerController } from './controllers/customer.controller';
import { VehicleController } from './controllers/vehicle.controller';
import { VehicleDocumentController } from './controllers/vehicle-document.controller';
import { CustomerService } from './services/customer.service';
import { VehicleService } from './services/vehicle.service';
import { VehicleDocumentService } from './services/vehicle-document.service';
import { VinDecoderService } from './services/vin-decoder.service';
import { CsvImportExportService } from './services/csv-import-export.service';
import { CommonModule } from '@common/common.module';

@Module({
  imports: [ConfigModule, CommonModule],
  controllers: [CustomerController, VehicleController, VehicleDocumentController],
  providers: [
    CustomerService,
    VehicleService,
    VehicleDocumentService,
    VinDecoderService,
    CsvImportExportService,
  ],
  exports: [
    CustomerService,
    VehicleService,
    VehicleDocumentService,
    VinDecoderService,
    CsvImportExportService,
  ],
})
export class CustomerModule {}
