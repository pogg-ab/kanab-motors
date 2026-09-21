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
import { EnquiryStatus } from './entities/sales-enquiry.entity';

@ApiTags('Sales Enquiry Management (KMSICAMS-2)')
@Controller('enquiries')
export class EnquiriesController {
  constructor(private readonly enquiriesService: EnquiriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create new Sales Enquiry (auto VAT calculation)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreateEnquiryDto) {
    return this.enquiriesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List and filter sales enquiries' })
  findAll(@Query() query: EnquiryQueryDto) {
    return this.enquiriesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sales enquiry details' })
  findOne(@Param('id') id: string) {
    return this.enquiriesService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Approve or Reject Sales Enquiry (Story E9)' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: EnquiryStatus; rejectionReason?: string },
  ) {
    return this.enquiriesService.updateStatus(id, body.status, body.rejectionReason);
  }
}
