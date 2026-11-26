import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CkdSkdController } from './ckd-skd.controller';
import { CkdSkdService } from './ckd-skd.service';
import { CkdSkdBatch } from './entities/ckd-skd-batch.entity';
import { CkdSkdBatchReceipt } from './entities/ckd-skd-batch-receipt.entity';
import { CustomsClearance } from './entities/customs-clearance.entity';
import { CustomsClearanceLine } from './entities/customs-clearance-line.entity';
import { CkdSkdSerial } from './entities/ckd-skd-serial.entity';
import { Bom } from './entities/bom.entity';
import { BomLine } from './entities/bom-line.entity';
import { IntegrationEvent } from './entities/integration-event.entity';
import { Shipment } from '../shipments/entities/shipment.entity';
import { ShipmentLine } from '../shipments/entities/shipment-line.entity';
import { ShipmentReceipt } from '../shipments/entities/shipment-receipt.entity';
import { ProductItem } from '../products/entities/product-item.entity';
import { Warehouse } from '../lookups/entities/warehouse.entity';
import { StockBalance } from '../inventory/entities/stock-balance.entity';
import { StockTransfer } from '../inventory/entities/stock-transfer.entity';
import { StockTransferLine } from '../inventory/entities/stock-transfer-line.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CkdSkdBatch,
      CkdSkdBatchReceipt,
      CustomsClearance,
      CustomsClearanceLine,
      CkdSkdSerial,
      Bom,
      BomLine,
      IntegrationEvent,
      Shipment,
      ShipmentLine,
      ShipmentReceipt,
      ProductItem,
      Warehouse,
      StockBalance,
      StockTransfer,
      StockTransferLine,
    ]),
    AuditModule,
  ],
  controllers: [CkdSkdController],
  providers: [CkdSkdService],
  exports: [CkdSkdService],
})
export class CkdSkdModule {}
