import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportRequisitionsService } from './import-requisitions.service';
import { ImportRequisitionsController } from './import-requisitions.controller';
import { ImportRequisition } from './entities/import-requisition.entity';
import { ImportRequisitionLine } from './entities/import-requisition-line.entity';
import { ProductItem } from '../products/entities/product-item.entity';
import { PurchaseOrder } from '../purchase-orders/entities/purchase-order.entity';
import { PurchaseOrderLine } from '../purchase-orders/entities/purchase-order-line.entity';
import { ExchangeRateDefault } from '../shipments/entities/exchange-rate-default.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ImportRequisition,
      ImportRequisitionLine,
      ProductItem,
      PurchaseOrder,
      PurchaseOrderLine,
      ExchangeRateDefault,
    ]),
    AuditModule,
  ],
  controllers: [ImportRequisitionsController],
  providers: [ImportRequisitionsService],
  exports: [ImportRequisitionsService],
})
export class ImportRequisitionsModule {}

