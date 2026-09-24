import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { WorkflowType } from './workflow-type.entity';
import { Role } from '../../auth/entities/role.entity';

@Entity('approval_policy')
export class ApprovalPolicy {
  @PrimaryColumn({ name: 'workflow_type_code', length: 50 })
  workflowTypeCode: string;

  @PrimaryColumn({ name: 'approval_level', type: 'smallint' })
  approvalLevel: number;

  @Column({ name: 'required_role_id', type: 'smallint' })
  requiredRoleId: number;

  @ManyToOne(() => WorkflowType)
  @JoinColumn({ name: 'workflow_type_code' })
  workflowType: WorkflowType;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'required_role_id' })
  requiredRole: Role;
}
