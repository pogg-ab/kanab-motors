import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shipment } from './entities/shipment.entity';
import { ShipmentLine } from './entities/shipment-line.entity';
import { ShipmentStageHistory } from './entities/shipment-stage-history.entity';
import { ShipmentCostComponent } from './entities/shipment-cost-component.entity';
import { ShipmentLineLandedCost } from './entities/shipment-line-landed-cost.entity';
import { VehicleUnitLandedCost } from './entities/vehicle-unit-landed-cost.entity';
import { ShipmentReceipt } from './entities/shipment-receipt.entity';
import { CostComponentType } from './entities/cost-component-type.entity';
import { ExchangeRateDefault } from './entities/exchange-rate-default.entity';
import { Attachment } from '../customers/entities/attachment.entity';
import { VehicleUnit } from '../vehicles/entities/vehicle-unit.entity';
import { PurchaseOrder } from '../purchase-orders/entities/purchase-order.entity';
import { PurchaseOrderLine } from '../purchase-orders/entities/purchase-order-line.entity';
import { ShipmentsService } from './services/shipments.service';
import { LandedCostAllocationService } from './services/landed-cost-allocation.service';
import { ShipmentsController } from './shipments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Shipment,
      ShipmentLine,
      ShipmentStageHistory,
      ShipmentCostComponent,
      ShipmentLineLandedCost,
      VehicleUnitLandedCost,
      ShipmentReceipt,
      CostComponentType,
      ExchangeRateDefault,
      Attachment,
      VehicleUnit,
      PurchaseOrder,
      PurchaseOrderLine,
    ]),
  ],
  providers: [ShipmentsService, LandedCostAllocationService],
  controllers: [ShipmentsController],
  exports: [ShipmentsService, LandedCostAllocationService],
})
export class ShipmentsModule {}
