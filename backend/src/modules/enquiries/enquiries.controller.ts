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
}
