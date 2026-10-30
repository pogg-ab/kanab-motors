import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProductItem } from '../../products/entities/product-item.entity';
import { ImportRequisition } from './import-requisition.entity';

@Entity('import_requisition_line')
@Index('idx_imp_req_line_req', ['requisitionId'])
@Index('idx_imp_req_line_item', ['itemId'])
export class ImportRequisitionLine {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'requisition_line_id' })
  requisitionLineId: string;

  @Column({ name: 'requisition_id', type: 'bigint' })
  requisitionId: string;

  @ManyToOne(() => ImportRequisition, (req) => req.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requisition_id' })
  requisition: ImportRequisition;

  @Column({ name: 'item_id', type: 'bigint' })
  itemId: string;

  @ManyToOne(() => ProductItem)
  @JoinColumn({ name: 'item_id' })
  item: ProductItem;

  @Column({ name: 'quantity_requested', type: 'numeric', precision: 12, scale: 2 })
  quantityRequested: number;

  @Column({ name: 'estimated_unit_price', type: 'numeric', precision: 18, scale: 4, default: 0 })
  estimatedUnitPrice: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({
    name: 'line_total',
    type: 'numeric',
    precision: 18,
    scale: 2,
    insert: false,
    update: false,
    asExpression: 'quantity_requested * estimated_unit_price',
    generatedType: 'STORED',
  })
  lineTotal: number;

  @Column({ name: 'technical_specification', type: 'text', nullable: true })
  technicalSpecification?: string;

  @Column({ name: 'quality_requirements', type: 'text', nullable: true })
  qualityRequirements?: string;

  @Column({ name: 'intended_application', type: 'text', nullable: true })
  intendedApplication?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

