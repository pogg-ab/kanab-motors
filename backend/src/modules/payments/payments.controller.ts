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
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Customer Deposit & Payment (Bank Receipt Voucher - BRV)')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @RequirePermissions('PAYMENTS_RECORD')
  @Post()
  @ApiOperation({ summary: 'Submit new Payment (Bank Receipt Voucher intake)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @RequirePermissions('PAYMENTS_VIEW')
  @Get()
  @ApiOperation({ summary: 'List and search BRV payment records' })
  findAll(@Query() query: PaymentQueryDto) {
    return this.paymentsService.findAll(query);
  }

  @RequirePermissions('PAYMENTS_VIEW')
  @Get(':id')
  @ApiOperation({ summary: 'Get payment receipt details' })
  findOne(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.paymentsService.findOne(id);
  }

  @RequirePermissions('PAYMENTS_CONFIRM')
  @Patch(':id/confirm')
  @ApiOperation({ summary: 'Confirm BRV Payment (Posts to Ledger & Updates Booking Totals)' })
  confirmPayment(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.paymentsService.confirmPayment(id);
  }

  @RequirePermissions('PAYMENTS_REJECT')
  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject BRV Payment' })
  rejectPayment(@Param('id', PositiveBigIntIdPipe) id: string, @Body() dto: RejectPaymentDto) {
    return this.paymentsService.rejectPayment(id, dto.reason);
  }
}
