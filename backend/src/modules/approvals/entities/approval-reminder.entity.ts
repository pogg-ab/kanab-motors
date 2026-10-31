import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('approval_reminder_config')
export class ApprovalReminderConfig {
  @PrimaryGeneratedColumn('increment', { name: 'config_id' })
  configId: number;

  @Column({ name: 'workflow_type_code', length: 50, unique: true })
  workflowTypeCode: string;

  @Column({ name: 'reminder_interval_hours', type: 'int', default: 4 })
  reminderIntervalHours: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

@Entity('approval_reminder_log')
@Index('idx_arl_entity', ['entityType', 'entityId'])
@Index('idx_arl_sent_at', ['notificationSentAt'])
export class ApprovalReminderLog {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'reminder_log_id' })
  reminderLogId: string;

  @Column({ name: 'approval_request_id', type: 'bigint', nullable: true })
  approvalRequestId?: string;

  @Column({ name: 'workflow_type_code', length: 50 })
  workflowTypeCode: string;

  @Column({ name: 'entity_type', length: 50 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'bigint' })
  entityId: string;

  @Column({ name: 'reminder_interval_hours', type: 'int' })
  reminderIntervalHours: number;

  @CreateDateColumn({ name: 'notification_sent_at', type: 'timestamptz' })
  notificationSentAt: Date;

  @Column({ name: 'notification_details', type: 'jsonb', nullable: true })
  notificationDetails?: Record<string, any>;
}

