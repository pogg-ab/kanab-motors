import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from './role.entity';
import { SystemModule } from './system-module.entity';
import { SystemAction } from './system-action.entity';

@Entity('role_permission')
export class RolePermission {
  @PrimaryColumn({ name: 'role_id', type: 'smallint' })
  roleId: number;

  @PrimaryColumn({ name: 'module_code', length: 50 })
  moduleCode: string;

  @PrimaryColumn({ name: 'action_code', length: 50 })
  actionCode: string;

  @Column({ type: 'boolean', default: true })
  granted: boolean;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy?: number;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role?: Role;

  @ManyToOne(() => SystemModule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_code' })
  module?: SystemModule;

  @ManyToOne(() => SystemAction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'action_code' })
  action?: SystemAction;
}
