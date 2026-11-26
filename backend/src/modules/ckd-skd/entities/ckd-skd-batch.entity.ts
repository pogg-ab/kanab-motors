import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Shipment } from '../../shipments/entities/shipment.entity';
import { ShipmentLine } from '../../shipments/entities/shipment-line.entity';
import { ProductItem } from '../../products/entities/product-item.entity';
import { UnitOfMeasure } from '../../products/entities/unit-of-measure.entity';
import { AppUser } from '../../auth/entities/app-user.entity';
import { CkdSkdBatchReceipt } from './ckd-skd-batch-receipt.entity';
import { CkdSkdSerial } from './ckd-skd-serial.entity';

export enum KitType {
  CKD = 'CKD',
  SKD = 'SKD',
}

@Entity('ckd_skd_batch')
@Index('idx_ckd_batch_shipment', ['shipmentId'])
@Index('idx_ckd_batch_product', ['itemId'])
export class CkdSkdBatch {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'batch_id' })
  batchId: string;

  @Column({ name: 'batch_code', length: 100, unique: true })
  batchCode: string;

  @Column({ name: 'shipment_id', type: 'bigint' })
  shipmentId: string;

  @ManyToOne(() => Shipment)
  @JoinColumn({ name: 'shipment_id' })
  shipment: Shipment;

  @Column({ name: 'shipment_line_id', type: 'bigint', nullable: true })
  shipmentLineId?: string;

  @ManyToOne(() => ShipmentLine, { nullable: true })
  @JoinColumn({ name: 'shipment_line_id' })
  shipmentLine?: ShipmentLine;

  @Column({ name: 'kit_type', length: 10 })
  kitType: KitType;

  @Column({ name: 'item_id', type: 'bigint' })
  itemId: string;

  @ManyToOne(() => ProductItem)
  @JoinColumn({ name: 'item_id' })
  item: ProductItem;

  @Column({ name: 'planned_quantity', type: 'numeric', precision: 18, scale: 3 })
  plannedQuantity: number;

  @Column({ name: 'uom_id', type: 'smallint' })
  uomId: number;

  @ManyToOne(() => UnitOfMeasure)
  @JoinColumn({ name: 'uom_id' })
  uom: UnitOfMeasure;

  @Column({ name: 'batch_date', type: 'date', nullable: true })
  batchDate?: string;

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'int' })
  createdBy: number;

  @ManyToOne(() => AppUser)
  @JoinColumn({ name: 'created_by' })
  creator: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater?: AppUser;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt?: Date;

  @OneToMany(() => CkdSkdBatchReceipt, (br) => br.batch)
  batchReceipts: CkdSkdBatchReceipt[];

  @OneToMany(() => CkdSkdSerial, (s) => s.batch)
  serials: CkdSkdSerial[];
}
