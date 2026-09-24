import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApprovalRequest } from './approval-request.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

@Entity('approval_action')
@Index('idx_approval_action_request', ['approvalRequestId'])
export class ApprovalAction {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'approval_action_id' })
  approvalActionId: string;

  @Column({ name: 'approval_request_id', type: 'bigint' })
  approvalRequestId: string;

  @ManyToOne(() => ApprovalRequest, (req) => req.actions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'approval_request_id' })
  approvalRequest: ApprovalRequest;

  @Column({ name: 'approval_level', type: 'smallint' })
  approvalLevel: number;

  @Column({ length: 10 })
  decision: 'APPROVED' | 'REJECTED';

  @Column({ name: 'decided_by', type: 'int', nullable: true })
  decidedBy: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'decided_by' })
  decider: AppUser;

  @CreateDateColumn({ name: 'decided_at', type: 'timestamptz' })
  decidedAt: Date;

  @Column({ type: 'text', nullable: true })
  comments?: string;
}
