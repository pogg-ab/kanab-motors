import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerLedgerTransaction } from './entities/customer-ledger-transaction.entity';
import { CustomerAccountSummary } from '../customers/entities/customer-account-summary.entity';
import { Customer } from '../customers/entities/customer.entity';
import { LedgerService } from './ledger.service';
import { LedgerController } from './ledger.controller';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerLedgerTransaction, CustomerAccountSummary, Customer]),
  ],
  controllers: [LedgerController],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
