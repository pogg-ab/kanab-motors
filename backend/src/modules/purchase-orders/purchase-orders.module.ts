import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderLine } from './entities/purchase-order-line.entity';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { ExchangeRateDefault } from '../shipments/entities/exchange-rate-default.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseOrder, PurchaseOrderLine, ExchangeRateDefault])],
  providers: [PurchaseOrdersService, PermissionGuard],
  controllers: [PurchaseOrdersController],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
