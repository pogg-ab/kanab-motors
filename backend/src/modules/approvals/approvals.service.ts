import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ApprovalRequest, ApprovalStatus } from './entities/approval-request.entity';
import { ApprovalAction } from './entities/approval-action.entity';
import { ApprovalPolicy } from './entities/approval-policy.entity';
import { WorkflowType } from './entities/workflow-type.entity';
import { SubmitApprovalDto } from './dto/submit-approval.dto';
import { ApprovalDecisionDto } from './dto/approval-decision.dto';

@Injectable()
export class ApprovalsService {
  constructor(
    @InjectRepository(ApprovalRequest)
    private approvalRequestRepo: Repository<ApprovalRequest>,
    @InjectRepository(ApprovalAction)
    private approvalActionRepo: Repository<ApprovalAction>,
    @InjectRepository(ApprovalPolicy)
    private approvalPolicyRepo: Repository<ApprovalPolicy>,
    @InjectRepository(WorkflowType)
    private workflowTypeRepo: Repository<WorkflowType>,
    private dataSource: DataSource,
  ) {}

  async getPendingApprovals(): Promise<any[]> {
    return this.approvalRequestRepo
      .createQueryBuilder('ar')
      .leftJoinAndSelect('ar.workflowType', 'wt')
      .leftJoinAndSelect('ar.requester', 'req')
      .where('ar.status = :status', { status: ApprovalStatus.PENDING })
      .orderBy('ar.requestedAt', 'DESC')
      .getMany();
  }

  async getAllRequests(filters?: {
    workflowTypeCode?: string;
    entityType?: string;
    status?: ApprovalStatus;
  }): Promise<ApprovalRequest[]> {
    const qb = this.approvalRequestRepo
      .createQueryBuilder('ar')
      .leftJoinAndSelect('ar.workflowType', 'wt')
      .leftJoinAndSelect('ar.requester', 'req')
      .leftJoinAndSelect('ar.actions', 'act')
      .leftJoinAndSelect('act.decider', 'dec')
      .orderBy('ar.requestedAt', 'DESC');

    if (filters?.workflowTypeCode) {
      qb.andWhere('ar.workflowTypeCode = :code', { code: filters.workflowTypeCode });
    }
    if (filters?.entityType) {
      qb.andWhere('ar.entityType = :etype', { etype: filters.entityType });
    }
    if (filters?.status) {
      qb.andWhere('ar.status = :status', { status: filters.status });
    }

    return qb.getMany();
  }

  async getRequestById(id: string): Promise<ApprovalRequest> {
    const req = await this.approvalRequestRepo.findOne({
      where: { approvalRequestId: id },
      relations: ['workflowType', 'requester', 'actions', 'actions.decider'],
      order: { actions: { decidedAt: 'ASC' } },
    });
    if (!req) {
      throw new NotFoundException(`Approval request #${id} not found`);
    }
    return req;
  }

  async submitForApproval(dto: SubmitApprovalDto, userId: number): Promise<{ approvalRequestId: string }> {
    const res = await this.dataSource.query(
      `SELECT fn_submit_for_approval($1, $2, $3, $4) as "approvalRequestId"`,
      [dto.workflowTypeCode, dto.entityType, dto.entityId, userId],
    );
    return { approvalRequestId: String(res[0].approvalRequestId) };
  }

  async recordDecision(
    id: string,
    dto: ApprovalDecisionDto,
    userId: number,
  ): Promise<{ success: boolean; message: string; request: ApprovalRequest }> {
    try {
      await this.dataSource.query(
        `SELECT fn_record_approval_decision($1, $2, $3, $4)`,
        [id, dto.decision, userId, dto.comments || null],
      );
    } catch (err: any) {
      throw new BadRequestException(err.message || 'Failed to record approval decision');
    }

    const updated = await this.getRequestById(id);
    return {
      success: true,
      message: `Approval request #${updated.requestNumber} successfully marked as ${dto.decision}`,
      request: updated,
    };
  }

  async getPolicies(): Promise<ApprovalPolicy[]> {
    return this.approvalPolicyRepo.find({
      relations: ['workflowType', 'requiredRole'],
      order: { workflowTypeCode: 'ASC', approvalLevel: 'ASC' },
    });
  }

  async getWorkflowTypes(): Promise<WorkflowType[]> {
    return this.workflowTypeRepo.find({
      order: { workflowTypeCode: 'ASC' },
    });
  }
}
