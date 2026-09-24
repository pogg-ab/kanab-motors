import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PdiInspection } from './pdi-inspection.entity';
import { PdiChecklistItem } from './pdi-checklist-item.entity';

@Entity('pdi_inspection_result')
@Index('idx_pdi_result_inspection', ['pdiInspectionId'])
export class PdiInspectionResult {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'pdi_inspection_result_id' })
  pdiInspectionResultId: string;

  @Column({ name: 'pdi_inspection_id', type: 'bigint' })
  pdiInspectionId: string;

  @ManyToOne(() => PdiInspection, (insp) => insp.results, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pdi_inspection_id' })
  inspection: PdiInspection;

  @Column({ name: 'pdi_checklist_item_id', type: 'smallint' })
  pdiChecklistItemId: number;

  @ManyToOne(() => PdiChecklistItem)
  @JoinColumn({ name: 'pdi_checklist_item_id' })
  checklistItem: PdiChecklistItem;

  @Column({ type: 'boolean' })
  passed: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
