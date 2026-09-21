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
import { RefundsService } from './refunds.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { RefundQueryDto } from './dto/refund-query.dto';

@ApiTags('Customer Refund Management (KMSICAMS-2)')
@Controller('refunds')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit Customer Refund Request (Validates against available balance per SRS §7.4)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreateRefundDto) {
    return this.refundsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List and filter refund requests' })
  findAll(@Query() query: RefundQueryDto) {
    return this.refundsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get refund request details' })
  findOne(@Param('id') id: string) {
    return this.refundsService.findOne(id);
  }

  @Patch(':id/review')
  @ApiOperation({ summary: 'Review refund request (Step 1)' })
  review(@Param('id') id: string) {
    return this.refundsService.review(id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve refund request (Step 2 - Approver Role)' })
  approve(@Param('id') id: string) {
    return this.refundsService.approve(id);
  }

  @Patch(':id/process')
  @ApiOperation({ summary: 'Process refund in finance (Step 3 - Finance Role)' })
  process(@Param('id') id: string) {
    return this.refundsService.financeProcess(id);
  }

  @Patch(':id/confirm-payout')
  @ApiOperation({ summary: 'Confirm refund payment & post to ledger (Step 4)' })
  confirmPayout(@Param('id') id: string) {
    return this.refundsService.confirmPayout(id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject refund request' })
  reject(@Param('id') id: string, @Body('reason') reason: string) {
    return this.refundsService.reject(id, reason);
  }
}
