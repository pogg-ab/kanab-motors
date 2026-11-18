import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EnquiriesService } from './enquiries.service';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { EnquiryQueryDto } from './dto/enquiry-query.dto';
import { PositiveBigIntIdPipe } from '../../common/pipes/positive-bigint-id.pipe';
import { UpdateEnquiryStatusDto } from './dto/update-enquiry-status.dto';
import { EnquiryApprovalDto } from './dto/enquiry-approval.dto';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { CompleteInspectionDto } from './dto/complete-inspection.dto';
import { ExtendInspectionDto, CancelInspectionDto } from './dto/extend-inspection.dto';
import { UpdateFinancingStatusDto } from './dto/update-financing-status.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Sales Enquiry Management (KMSICAMS-2 & KMSICAMS-14)')
@Controller('enquiries')
export class EnquiriesController {
  constructor(private readonly enquiriesService: EnquiriesService) {}

  @RequirePermissions('ENQUIRIES_CREATE')
  @Post()
  @ApiOperation({ summary: 'Create new Sales Enquiry (auto VAT calculation & vehicle specs)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreateEnquiryDto, @Req() req?: any) {
    const userId = req?.user?.userId ? Number(req.user.userId) : 1;
    return this.enquiriesService.create(dto, userId);
  }

  @RequirePermissions('ENQUIRIES_VIEW')
  @Get()
  @ApiOperation({ summary: 'List and filter sales enquiries' })
  findAll(@Query() query: EnquiryQueryDto) {
    return this.enquiriesService.findAll(query);
  }

  @RequirePermissions('ENQUIRIES_VIEW')
  @Get('slips')
  @ApiOperation({ summary: 'List all pre-advance slips with 3-day expiry status (Story E16, E18)' })
  getAllSlips(@Query('status') status?: string, @Query('search') search?: string) {
    return this.enquiriesService.getAllSlips({ status, search });
  }

  @RequirePermissions('ENQUIRIES_VIEW')
  @Get('slips/:slipId')
  @ApiOperation({ summary: 'Get pre-advance slip by ID (Story E17)' })
  getSlipById(@Param('slipId', PositiveBigIntIdPipe) slipId: string) {
    return this.enquiriesService.getSlipById(slipId);
  }

  // --- Reports (Commission & Financing) ---
  @RequirePermissions('ENQUIRIES_VIEW')
  @Get('reports/commission')
  @ApiOperation({ summary: 'Commission Agent Sales Tracking & Commission Payable Report (New Story 1)' })
  getCommissionReport() {
    return this.enquiriesService.getCommissionReport();
  }

  @RequirePermissions('ENQUIRIES_VIEW')
  @Get('reports/financing')
  @ApiOperation({ summary: 'Bank & Microfinance Financing Performance Report (New Story 3)' })
  getFinancingReport() {
    return this.enquiriesService.getFinancingReport();
  }

  // --- Inspections List ---
  @RequirePermissions('ENQUIRIES_VIEW')
  @Get('inspections')
  @ApiOperation({ summary: 'List customer vehicle inspections with countdown and status (New Story 2)' })
  getInspections(@Query('status') status?: string, @Query('search') search?: string) {
    return this.enquiriesService.getInspections({ status, search });
  }

  @RequirePermissions('ENQUIRIES_VIEW')
  @Get(':id')
  @ApiOperation({ summary: 'Get sales enquiry details' })
  findOne(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.enquiriesService.findOne(id);
  }

  @RequirePermissions('ENQUIRIES_VIEW')
  @Get(':id/slip')
  @ApiOperation({ summary: 'Get generated pre-advance slip for an approved enquiry (Story E16, E17)' })
  getSlipByEnquiryId(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.enquiriesService.getSlipByEnquiryId(id);
  }

  @RequirePermissions('ENQUIRIES_CREATE')
  @Patch(':id')
  @ApiOperation({ summary: 'Update or Correct & Resubmit Sales Enquiry (KMS-FB-15)' })
  updateEnquiry(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() body: Partial<CreateEnquiryDto>,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId ? Number(req.user.userId) : 1;
    return this.enquiriesService.updateEnquiry(id, body, userId);
  }

  @RequirePermissions('ENQUIRIES_CREATE')
  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit draft enquiry for approval (KMSI-14-15)' })
  submitEnquiry(@Param('id', PositiveBigIntIdPipe) id: string, @Req() req?: any) {
    const userId = req?.user?.userId ? Number(req.user.userId) : 1;
    return this.enquiriesService.submitEnquiry(id, userId);
  }

  @RequirePermissions('ENQUIRIES_APPROVE', 'ENQUIRIES_REJECT')
  @Post(':id/sales-rep-approve')
  @ApiOperation({ summary: 'Step 1: Sales Representative Review & Approval (KMSI-14-15)' })
  salesRepApproval(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() body: EnquiryApprovalDto,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId ? Number(req.user.userId) : 1;
    return this.enquiriesService.salesRepApproval(id, body, userId);
  }

  @RequirePermissions('ENQUIRIES_APPROVE', 'ENQUIRIES_REJECT')
  @Post(':id/sales-manager-approve')
  @ApiOperation({ summary: 'Step 2: Sales Manager Final Approval (KMSI-14-15)' })
  salesManagerApproval(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() body: EnquiryApprovalDto,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId ? Number(req.user.userId) : 1;
    return this.enquiriesService.salesManagerApproval(id, body, userId);
  }

  @RequirePermissions('ENQUIRIES_APPROVE', 'ENQUIRIES_REJECT')
  @Patch(':id/status')
  @ApiOperation({ summary: 'Approve or Reject Sales Enquiry (Story E9, E16)' })
  updateStatus(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() body: UpdateEnquiryStatusDto,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId ? Number(req.user.userId) : 1;
    return this.enquiriesService.updateStatus(id, body.status, body.rejectionReason, userId);
  }

  // --- Customer Vehicle Inspection Endpoints (New Story 2) ---
  @RequirePermissions('ENQUIRIES_CREATE')
  @Post(':id/inspection')
  @ApiOperation({ summary: 'Initiate customer vehicle inspection with countdown timer (New Story 2)' })
  initiateInspection(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: CreateInspectionDto,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId ? Number(req.user.userId) : 1;
    return this.enquiriesService.initiateInspection(id, dto, userId);
  }

  @RequirePermissions('ENQUIRIES_VIEW')
  @Get(':id/inspection')
  @ApiOperation({ summary: 'Get active inspection for enquiry with live countdown (New Story 2)' })
  getInspectionByEnquiryId(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.enquiriesService.getInspectionByEnquiryId(id);
  }

  @RequirePermissions('ENQUIRIES_CREATE')
  @Post('inspections/:inspectionId/complete')
  @ApiOperation({ summary: 'Complete inspection with outcome (Accepted, Rejected, Pending Decision) (New Story 2)' })
  completeInspection(
    @Param('inspectionId', PositiveBigIntIdPipe) inspectionId: string,
    @Body() dto: CompleteInspectionDto,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId ? Number(req.user.userId) : 1;
    return this.enquiriesService.completeInspection(inspectionId, dto, userId);
  }

  @RequirePermissions('ENQUIRIES_CREATE')
  @Post('inspections/:inspectionId/extend')
  @ApiOperation({ summary: 'Extend active inspection deadline with mandatory reason (New Story 2)' })
  extendInspection(
    @Param('inspectionId', PositiveBigIntIdPipe) inspectionId: string,
    @Body() dto: ExtendInspectionDto,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId ? Number(req.user.userId) : 1;
    return this.enquiriesService.extendInspection(inspectionId, dto, userId);
  }

  @RequirePermissions('ENQUIRIES_CREATE')
  @Post('inspections/:inspectionId/cancel')
  @ApiOperation({ summary: 'Cancel active inspection with mandatory reason (New Story 2)' })
  cancelInspection(
    @Param('inspectionId', PositiveBigIntIdPipe) inspectionId: string,
    @Body() dto: CancelInspectionDto,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId ? Number(req.user.userId) : 1;
    return this.enquiriesService.cancelInspection(inspectionId, dto, userId);
  }

  // --- Financing Status Endpoint (New Story 3) ---
  @RequirePermissions('ENQUIRIES_CREATE')
  @Patch(':id/financing')
  @ApiOperation({ summary: 'Update financing application, approval, and disbursement status (New Story 3)' })
  updateFinancingStatus(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: UpdateFinancingStatusDto,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId ? Number(req.user.userId) : 1;
    return this.enquiriesService.updateFinancingStatus(id, dto, userId);
  }
}
