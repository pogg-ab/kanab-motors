import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ApprovalRequest, ApprovalStatus } from './entities/approval-request.entity';
import { ApprovalAction } from './entities/approval-action.entity';
import { ApprovalPolicy } from './entities/approval-policy.entity';
import { WorkflowType } from './entities/workflow-type.entity';
import { ApprovalReminderConfig, ApprovalReminderLog } from './entities/approval-reminder.entity';
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
    @InjectRepository(ApprovalReminderConfig)
    private reminderConfigRepo: Repository<ApprovalReminderConfig>,
    @InjectRepository(ApprovalReminderLog)
    private reminderLogRepo: Repository<ApprovalReminderLog>,
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

  // =========================================================================
  // KMSI-14-09: CONFIGURABLE REMINDERS FOR PENDING APPROVALS
  // =========================================================================
  async getReminderConfigs(): Promise<ApprovalReminderConfig[]> {
    return this.reminderConfigRepo.find({ order: { workflowTypeCode: 'ASC' } });
  }

  async updateReminderConfig(configId: number, intervalHours: number, isActive: boolean): Promise<ApprovalReminderConfig> {
    const cfg = await this.reminderConfigRepo.findOne({ where: { configId } });
    if (!cfg) throw new NotFoundException(`Reminder config #${configId} not found`);
    cfg.reminderIntervalHours = intervalHours;
    cfg.isActive = isActive;
    return this.reminderConfigRepo.save(cfg);
  }

  async getReminderLogs(): Promise<ApprovalReminderLog[]> {
    return this.reminderLogRepo.find({
      order: { notificationSentAt: 'DESC' },
      take: 100,
    });
  }

  async scanPendingApprovals(): Promise<{ notificationsGenerated: number; message: string; logs: any[] }> {
    const configs = await this.reminderConfigRepo.find({ where: { isActive: true } });
    const configMap = new Map<string, number>();
    configs.forEach(c => configMap.set(c.workflowTypeCode, c.reminderIntervalHours));

    const pendingRequests = await this.dataSource.query(`
      SELECT 
        ar.approval_request_id AS id,
        ar.request_number AS reference_number,
        ar.workflow_type_code,
        ar.entity_type,
        ar.entity_id,
        ar.requested_at AS submission_date,
        COALESCE(u.full_name, 'System') AS requesting_user,
        ROUND(EXTRACT(EPOCH FROM (NOW() - ar.requested_at)) / 3600.0, 1) AS hours_elapsed
      FROM approval_request ar
      LEFT JOIN app_user u ON u.user_id = ar.requested_by
      WHERE ar.status = 'PENDING'
      
      UNION ALL
      
      SELECT
        se.enquiry_id::text AS id,
        se.enquiry_number AS reference_number,
        'SALES_ENQUIRY' AS workflow_type_code,
        'sales_enquiry' AS entity_type,
        se.enquiry_id AS entity_id,
        se.created_at AS submission_date,
        COALESCE(u.full_name, se.salesperson_name) AS requesting_user,
        ROUND(EXTRACT(EPOCH FROM (NOW() - se.created_at)) / 3600.0, 1) AS hours_elapsed
      FROM sales_enquiry se
      LEFT JOIN app_user u ON u.user_id = se.created_by
      WHERE se.status IN ('SUBMITTED', 'SALES_REP_APPROVED')
      
      UNION ALL
      
      SELECT
        cr.refund_id::text AS id,
        cr.refund_number AS reference_number,
        'CUSTOMER_REFUND' AS workflow_type_code,
        'customer_refund' AS entity_type,
        cr.refund_id AS entity_id,
        cr.created_at AS submission_date,
        'Customer / Sales' AS requesting_user,
        ROUND(EXTRACT(EPOCH FROM (NOW() - cr.created_at)) / 3600.0, 1) AS hours_elapsed
      FROM customer_refund cr
      WHERE cr.status = 'REQUESTED'
    `);

    let notificationsGenerated = 0;
    const newLogs: any[] = [];

    for (const req of pendingRequests) {
      const intervalHours = configMap.get(req.workflow_type_code) || 4;
      const hours = Number(req.hours_elapsed || 0);

      if (hours >= intervalHours) {
        // Check if reminder was already logged recently
        const recent = await this.reminderLogRepo.createQueryBuilder('rl')
          .where('rl.entityType = :et AND rl.entityId = :eid', { et: req.entity_type, eid: req.entity_id })
          .andWhere('rl.notificationSentAt >= NOW() - INTERVAL \'1 hour\' * :interval', { interval: intervalHours })
          .getOne();

        if (!recent) {
          const log = this.reminderLogRepo.create({
            workflowTypeCode: req.workflow_type_code,
            entityType: req.entity_type,
            entityId: req.entity_id,
            reminderIntervalHours: intervalHours,
            notificationDetails: {
              referenceNumber: req.reference_number,
              requestingUser: req.requesting_user,
              submissionDate: req.submission_date,
              hoursElapsed: hours,
              link: `/${req.entity_type.replace(/_/g, '-')}/${req.entity_id}`,
            },
          });
          await this.reminderLogRepo.save(log);
          notificationsGenerated++;
          newLogs.push(log);
        }
      }
    }

    return {
      notificationsGenerated,
      message: `Approval reminder scan completed. Generated ${notificationsGenerated} notification(s).`,
      logs: newLogs,
    };
  }
}
