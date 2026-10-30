import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderLine } from './entities/purchase-order-line.entity';
import { CompanyProfile } from './entities/company-profile.entity';
import { CompanyBankAccount } from './entities/company-bank-account.entity';
import { ImportComplianceRecord } from './entities/import-compliance-record.entity';
import { PoPaymentSchedule } from './entities/po-payment-schedule.entity';
import { PoPaymentTransaction } from './entities/po-payment-transaction.entity';
import { PoLetterOfCredit } from './entities/po-letter-of-credit.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { ProductItem } from '../products/entities/product-item.entity';
import { ExchangeRateDefault } from '../shipments/entities/exchange-rate-default.entity';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrder,
      PurchaseOrderLine,
      CompanyProfile,
      CompanyBankAccount,
      ImportComplianceRecord,
      PoPaymentSchedule,
      PoPaymentTransaction,
      PoLetterOfCredit,
      Supplier,
      ProductItem,
      ExchangeRateDefault,
    ]),
    AuditModule,
  ],
  providers: [PurchaseOrdersService, PermissionGuard],
  controllers: [PurchaseOrdersController],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
