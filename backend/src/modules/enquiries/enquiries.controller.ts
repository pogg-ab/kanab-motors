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
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EnquiriesService } from './enquiries.service';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { EnquiryQueryDto } from './dto/enquiry-query.dto';
import { PositiveBigIntIdPipe } from '../../common/pipes/positive-bigint-id.pipe';
import { UpdateEnquiryStatusDto } from './dto/update-enquiry-status.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Sales Enquiry Management (KMSICAMS-2)')
@Controller('enquiries')
export class EnquiriesController {
  constructor(private readonly enquiriesService: EnquiriesService) {}

  @RequirePermissions('ENQUIRIES_CREATE')
  @Post()
  @ApiOperation({ summary: 'Create new Sales Enquiry (auto VAT calculation)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreateEnquiryDto) {
    return this.enquiriesService.create(dto);
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

  @RequirePermissions('ENQUIRIES_APPROVE', 'ENQUIRIES_REJECT')
  @Patch(':id/status')
  @ApiOperation({ summary: 'Approve or Reject Sales Enquiry (Story E9, E16)' })
  updateStatus(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() body: UpdateEnquiryStatusDto,
  ) {
    return this.enquiriesService.updateStatus(id, body.status, body.rejectionReason);
  }
}
