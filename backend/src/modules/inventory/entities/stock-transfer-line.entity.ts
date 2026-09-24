import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { StockTransfer } from './stock-transfer.entity';
import { ProductItem } from '../../products/entities/product-item.entity';
import { VehicleUnit } from '../../vehicles/entities/vehicle-unit.entity';

@Entity('stock_transfer_line')
@Index('idx_transfer_line_transfer', ['transferId'])
export class StockTransferLine {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'transfer_line_id' })
  transferLineId: string;

  @Column({ name: 'transfer_id', type: 'bigint' })
  transferId: string;

  @ManyToOne(() => StockTransfer, (trf) => trf.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transfer_id' })
  transfer: StockTransfer;

  @Column({ name: 'item_id', type: 'bigint', nullable: true })
  itemId?: string;

  @ManyToOne(() => ProductItem, { nullable: true })
  @JoinColumn({ name: 'item_id' })
  item?: ProductItem;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  quantity?: number;

  @Column({ name: 'vehicle_unit_id', type: 'bigint', nullable: true })
  vehicleUnitId?: string;

  @ManyToOne(() => VehicleUnit, { nullable: true })
  @JoinColumn({ name: 'vehicle_unit_id' })
  vehicleUnit?: VehicleUnit;
}
