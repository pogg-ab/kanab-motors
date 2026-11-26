import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum IntegrationEventStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  RETRY = 'RETRY',
}

@Entity('integration_event')
@Index('idx_integration_event_status', ['processingStatus', 'createdAt'])
export class IntegrationEvent {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'event_id' })
  eventId: string;

  @Column({ name: 'event_type', length: 80 })
  eventType: string;

  @Column({ name: 'source_module', length: 50 })
  sourceModule: string;

  @Column({ name: 'source_record_id', type: 'bigint' })
  sourceRecordId: string;

  @Column({ name: 'target_module', length: 50 })
  targetModule: string;

  @Column({ name: 'idempotency_key', length: 150, unique: true })
  idempotencyKey: string;

  @Column({ type: 'jsonb', nullable: true })
  payload?: Record<string, any>;

  @Column({ name: 'processing_status', length: 20, default: IntegrationEventStatus.PENDING })
  processingStatus: IntegrationEventStatus;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt?: Date;
}
