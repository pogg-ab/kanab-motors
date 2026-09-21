import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AppUser } from '../../auth/entities/app-user.entity';

@Entity('audit_log')
@Index('idx_audit_log_entity', ['entityType', 'entityId'])
export class AuditLog {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'audit_id' })
  auditId: string;

  @Column({ name: 'entity_type', length: 50 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'bigint' })
  entityId: string;

  @Column({ length: 20 })
  action: string; // INSERT, UPDATE, DELETE

  @Column({ name: 'changed_by', type: 'int', nullable: true })
  changedBy: number;

  @ManyToOne(() => AppUser)
  @JoinColumn({ name: 'changed_by' })
  user: AppUser;

  @CreateDateColumn({ name: 'changed_at', type: 'timestamptz' })
  changedAt: Date;

  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue: Record<string, any>;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue: Record<string, any>;
}
