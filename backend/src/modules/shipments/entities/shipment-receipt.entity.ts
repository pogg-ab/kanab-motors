import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ShipmentLine } from './shipment-line.entity';
import { Warehouse } from '../../lookups/entities/warehouse.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

@Entity('shipment_receipt')
@Index('idx_shipment_receipt_line', ['shipmentLineId'])
export class ShipmentReceipt {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'receipt_id' })
  receiptId: string;

  @Column({ name: 'shipment_line_id', type: 'bigint' })
  shipmentLineId: string;

  @ManyToOne(() => ShipmentLine, (line) => line.receipts)
  @JoinColumn({ name: 'shipment_line_id' })
  shipmentLine: ShipmentLine;

  @Column({ name: 'quantity_received', type: 'numeric', precision: 12, scale: 2 })
  quantityReceived: number;

  @CreateDateColumn({ name: 'received_at', type: 'timestamptz' })
  receivedAt: Date;

  @Column({ name: 'received_by', type: 'int', nullable: true })
  receivedBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'received_by' })
  receiver?: AppUser;

  @Column({ name: 'warehouse_id', type: 'int', nullable: true })
  warehouseId?: number;

  @ManyToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse?: Warehouse;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
