import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { CustomerBankAccount } from './entities/customer-bank-account.entity';
import { CustomerAccountSummary } from './entities/customer-account-summary.entity';
import { Attachment } from './entities/attachment.entity';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, CustomerBankAccount, CustomerAccountSummary, Attachment]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
