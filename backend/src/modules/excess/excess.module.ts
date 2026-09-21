import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerAccountSummary } from '../customers/entities/customer-account-summary.entity';
import { ExcessService } from './excess.service';
import { ExcessController } from './excess.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerAccountSummary])],
  controllers: [ExcessController],
  providers: [ExcessService],
  exports: [ExcessService],
})
export class ExcessModule {}
