import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('workflow_type')
export class WorkflowType {
  @PrimaryColumn({ name: 'workflow_type_code', length: 50 })
  workflowTypeCode: string;

  @Column({ name: 'workflow_type_name', length: 150 })
  workflowTypeName: string;
}
