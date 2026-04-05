import { Module } from '@nestjs/common';
import { CommonModule } from '@common/common.module';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';

@Module({
  imports: [CommonModule],
  controllers: [MembershipController],
  providers: [MembershipService],
  exports: [MembershipService],
})
export class MembershipModule {}
