import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('pdi_checklist_item')
export class PdiChecklistItem {
  @PrimaryGeneratedColumn('increment', { type: 'smallint', name: 'pdi_checklist_item_id' })
  pdiChecklistItemId: number;

  @Column({ name: 'item_description', length: 200 })
  itemDescription: string;
}
