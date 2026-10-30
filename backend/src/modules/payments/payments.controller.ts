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
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { PositiveBigIntIdPipe } from '../../common/pipes/positive-bigint-id.pipe';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { TransferExcessPaymentDto } from './dto/transfer-excess-payment.dto';
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

  @RequirePermissions('PAYMENTS_RECORD')
  @Post('transfer-excess')
  @ApiOperation({ summary: 'Transfer excess customer payment across customer bookings (KMSI-14-05)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  transferExcess(@Body() dto: TransferExcessPaymentDto, @Req() req?: any) {
    const userId = req?.user?.userId ? Number(req.user.userId) : 1;
    return this.paymentsService.transferExcessPayment(dto, userId);
  }

  @RequirePermissions('PAYMENTS_VIEW')
  @Get('transfers/:bookingId')
  @ApiOperation({ summary: 'Get payment transfers for a booking (KMSI-14-05)' })
  getTransfersForBooking(@Param('bookingId', PositiveBigIntIdPipe) bookingId: string) {
    return this.paymentsService.getTransfersForBooking(bookingId);
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

  @RequirePermissions('PAYMENTS_CONFIRM')
  @Patch(':id/ceo-approval')
  @ApiOperation({ summary: 'CEO approval gate for installment payments (Story P14)' })
  decideCeoApproval(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() body: { approved: boolean; reason?: string },
  ) {
    return this.paymentsService.decideCeoInstallmentApproval(id, body.approved, body.reason);
  }
}
