import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { WorkflowType } from './workflow-type.entity';
import { ApprovalAction } from './approval-action.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('approval_request')
@Index('idx_approval_request_entity', ['entityType', 'entityId'])
@Index('idx_approval_request_status', ['status'])
export class ApprovalRequest {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'approval_request_id' })
  approvalRequestId: string;

  @Column({
    name: 'request_number',
    length: 20,
    unique: true,
    default: () => "('APR-' || lpad(nextval('approval_request_number_seq')::text, 6, '0'))",
  })
  requestNumber: string;

  @Column({ name: 'workflow_type_code', length: 50 })
  workflowTypeCode: string;

  @ManyToOne(() => WorkflowType)
  @JoinColumn({ name: 'workflow_type_code' })
  workflowType: WorkflowType;

  @Column({ name: 'entity_type', length: 50 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'bigint' })
  entityId: string;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  status: ApprovalStatus;

  @Column({ name: 'current_level', type: 'smallint', default: 1 })
  currentLevel: number;

  @Column({ name: 'requested_by', type: 'int', nullable: true })
  requestedBy: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'requested_by' })
  requester: AppUser;

  @CreateDateColumn({ name: 'requested_at', type: 'timestamptz' })
  requestedAt: Date;

  @Column({ name: 'finalized_at', type: 'timestamptz', nullable: true })
  finalizedAt?: Date;

  @OneToMany(() => ApprovalAction, (action) => action.approvalRequest)
  actions: ApprovalAction[];
}
