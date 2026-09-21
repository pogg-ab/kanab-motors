import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Shipment } from './shipment.entity';
import { PurchaseOrderLine } from '../../purchase-orders/entities/purchase-order-line.entity';
import { ShipmentLineLandedCost } from './shipment-line-landed-cost.entity';
import { ShipmentReceipt } from './shipment-receipt.entity';

@Entity('shipment_line')
@Unique(['shipmentId', 'poLineId'])
@Index('idx_shipment_line_shipment', ['shipmentId'])
@Index('idx_shipment_line_po_line', ['poLineId'])
export class ShipmentLine {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'shipment_line_id' })
  shipmentLineId: string;

  @Column({ name: 'shipment_id', type: 'bigint' })
  shipmentId: string;

  @ManyToOne(() => Shipment, (shipment) => shipment.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shipment_id' })
  shipment: Shipment;

  @Column({ name: 'po_line_id', type: 'bigint' })
  poLineId: string;

  @ManyToOne(() => PurchaseOrderLine)
  @JoinColumn({ name: 'po_line_id' })
  poLine: PurchaseOrderLine;

  @Column({ name: 'quantity_shipped', type: 'numeric', precision: 12, scale: 2 })
  quantityShipped: number;

  @Column({ name: 'quantity_received', type: 'numeric', precision: 12, scale: 2, default: 0 })
  quantityReceived: number;

  @OneToMany(() => ShipmentLineLandedCost, (cost) => cost.shipmentLine)
  landedCosts: ShipmentLineLandedCost[];

  @OneToMany(() => ShipmentReceipt, (receipt) => receipt.shipmentLine)
  receipts: ShipmentReceipt[];
}
