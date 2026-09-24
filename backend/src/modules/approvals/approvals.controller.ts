import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApprovalsService } from './approvals.service';
import { SubmitApprovalDto } from './dto/submit-approval.dto';
import { ApprovalDecisionDto } from './dto/approval-decision.dto';
import { ApprovalStatus } from './entities/approval-request.entity';
import { PositiveBigIntIdPipe } from '../../common/pipes/positive-bigint-id.pipe';

@ApiTags('Approval Workflow & Internal Controls (KMSICAMS-6)')
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get('pending')
  @ApiOperation({ summary: 'Get unified pending approval queue across all workflow types (Story AW9)' })
  getPendingApprovals() {
    return this.approvalsService.getPendingApprovals();
  }

  @Get('policies')
  @ApiOperation({ summary: 'Get configured approval policies & role hierarchies (Story AW3)' })
  getPolicies() {
    return this.approvalsService.getPolicies();
  }

  @Get('workflow-types')
  @ApiOperation({ summary: 'List all workflow types (Story AW1)' })
  getWorkflowTypes() {
    return this.approvalsService.getWorkflowTypes();
  }

  @Get()
  @ApiOperation({ summary: 'List all approval requests with optional filters' })
  getAllRequests(
    @Query('workflowTypeCode') workflowTypeCode?: string,
    @Query('entityType') entityType?: string,
    @Query('status') status?: ApprovalStatus,
  ) {
    return this.approvalsService.getAllRequests({ workflowTypeCode, entityType, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single approval request details with decision audit chain' })
  getRequestById(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.approvalsService.getRequestById(id);
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit an entity for approval (Story AW5)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  submitForApproval(@Body() dto: SubmitApprovalDto, @Query('userId') userId?: string) {
    return this.approvalsService.submitForApproval(dto, Number(userId) || 1);
  }

  @Post(':id/decision')
  @ApiOperation({ summary: 'Record approval or rejection decision (Stories AW4, AW5, AW8)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  recordDecision(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: ApprovalDecisionDto,
    @Query('userId') userId?: string,
  ) {
    return this.approvalsService.recordDecision(id, dto, Number(userId) || 1);
  }
}
