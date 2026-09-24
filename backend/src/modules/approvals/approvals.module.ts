import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowType } from './entities/workflow-type.entity';
import { ApprovalPolicy } from './entities/approval-policy.entity';
import { ApprovalRequest } from './entities/approval-request.entity';
import { ApprovalAction } from './entities/approval-action.entity';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController } from './approvals.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowType,
      ApprovalPolicy,
      ApprovalRequest,
      ApprovalAction,
    ]),
  ],
  providers: [ApprovalsService],
  controllers: [ApprovalsController],
  exports: [ApprovalsService, TypeOrmModule],
})
export class ApprovalsModule {}
