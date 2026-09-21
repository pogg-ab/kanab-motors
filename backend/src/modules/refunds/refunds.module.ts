import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerRefund } from './entities/customer-refund.entity';
import { CustomerAccountSummary } from '../customers/entities/customer-account-summary.entity';
import { Customer } from '../customers/entities/customer.entity';
import { RefundsService } from './refunds.service';
import { RefundsController } from './refunds.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerRefund, CustomerAccountSummary, Customer])],
  controllers: [RefundsController],
  providers: [RefundsService],
  exports: [RefundsService],
})
export class RefundsModule {}
