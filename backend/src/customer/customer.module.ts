import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CustomerController } from './controllers/customer.controller';
import { VehicleController } from './controllers/vehicle.controller';
import { CustomerService } from './services/customer.service';
import { VehicleService } from './services/vehicle.service';
import { VinDecoderService } from './services/vin-decoder.service';
import { CsvImportExportService } from './services/csv-import-export.service';
import { CommonModule } from '@common/common.module';

@Module({
  imports: [ConfigModule, CommonModule],
  controllers: [CustomerController, VehicleController],
  providers: [CustomerService, VehicleService, VinDecoderService, CsvImportExportService],
  exports: [CustomerService, VehicleService, VinDecoderService, CsvImportExportService],
})
export class CustomerModule {}
