import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('system_module')
export class SystemModule {
  @PrimaryColumn({ name: 'module_code', length: 50 })
  moduleCode: string;

  @Column({ name: 'module_name', length: 100 })
  moduleName: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;
}
