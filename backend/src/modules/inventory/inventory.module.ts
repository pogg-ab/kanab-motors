import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { Warehouse } from '../lookups/entities/warehouse.entity';
import { UserWarehouseAccess } from './entities/user-warehouse-access.entity';
import { VehicleStatusTransitionRule } from './entities/vehicle-status-transition-rule.entity';
import { VehicleStatusHistory } from './entities/vehicle-status-history.entity';
import { StockBalance } from './entities/stock-balance.entity';
import { StockTransfer } from './entities/stock-transfer.entity';
import { StockTransferLine } from './entities/stock-transfer-line.entity';
import { StockAdjustment } from './entities/stock-adjustment.entity';
import { ProductionReceipt } from './entities/production-receipt.entity';
import { VehicleUnit } from '../vehicles/entities/vehicle-unit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Warehouse,
      UserWarehouseAccess,
      VehicleStatusTransitionRule,
      VehicleStatusHistory,
      StockBalance,
      StockTransfer,
      StockTransferLine,
      StockAdjustment,
      ProductionReceipt,
      VehicleUnit,
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
