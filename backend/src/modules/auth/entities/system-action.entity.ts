import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('system_action')
export class SystemAction {
  @PrimaryColumn({ name: 'action_code', length: 50 })
  actionCode: string;

  @Column({ name: 'action_name', length: 100 })
  actionName: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;
}
