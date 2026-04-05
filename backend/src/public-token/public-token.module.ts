import { Module } from '@nestjs/common';
import { CommonModule } from '@common/common.module';
import { PublicTokenService } from './public-token.service';
import { PublicTokenController } from './public-token.controller';

@Module({
  imports: [CommonModule],
  controllers: [PublicTokenController],
  providers: [PublicTokenService],
  exports: [PublicTokenService],
})
export class PublicTokenModule {}
