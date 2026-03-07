import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CustomerController } from './controllers/customer.controller';
import { CustomerService } from './services/customer.service';
// Legacy GdprService removed - use src/gdpr/ module instead
import { VehicleService } from './services/vehicle.service';
import { CommonModule } from '@common/common.module';

@Module({
  imports: [ConfigModule, CommonModule],
  controllers: [CustomerController],
  providers: [CustomerService, VehicleService],
  exports: [CustomerService, VehicleService],
})
export class CustomerModule {}
