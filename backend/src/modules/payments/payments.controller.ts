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
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { PositiveBigIntIdPipe } from '../../common/pipes/positive-bigint-id.pipe';
import { RejectPaymentDto } from './dto/reject-payment.dto';

@ApiTags('Customer Deposit & Payment (Bank Receipt Voucher - BRV)')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit new Payment (Bank Receipt Voucher intake)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List and search BRV payment records' })
  findAll(@Query() query: PaymentQueryDto) {
    return this.paymentsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment receipt details' })
  findOne(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.paymentsService.findOne(id);
  }

  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm BRV Payment (Posts to Ledger & Updates Booking Totals)' })
  confirmPayment(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.paymentsService.confirmPayment(id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject BRV Payment' })
  rejectPayment(@Param('id', PositiveBigIntIdPipe) id: string, @Body() dto: RejectPaymentDto) {
    return this.paymentsService.rejectPayment(id, dto.reason);
  }
}
