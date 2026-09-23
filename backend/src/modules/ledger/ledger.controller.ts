import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LedgerService } from './ledger.service';
import { LedgerTransactionType } from './entities/customer-ledger-transaction.entity';

@ApiTags('Customer Ledger & Statement of Account (KMSICAMS-2)')
@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('customers/:customerId/statement')
  @ApiOperation({ summary: 'Get Customer Statement of Account (SRS §8.7 table format)' })
  getStatement(
    @Param('customerId') customerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('transactionType') transactionType?: LedgerTransactionType,
    @Query('bookingId') bookingId?: string,
    @Query('bookingNumber') bookingNumber?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ledgerService.getStatementOfAccount({
      customerId,
      startDate,
      endDate,
      transactionType,
      bookingId,
      bookingNumber,
      page,
      limit,
    });
  }

  @Post('customers/:customerId/adjustment')
  @ApiOperation({ summary: 'Post manual ledger adjustment (restricted with mandatory reason)' })
  manualAdjustment(
    @Param('customerId') customerId: string,
    @Body()
    body: {
      type: 'CREDIT' | 'DEBIT';
      amount: number;
      reason: string;
      referenceNumber: string;
    },
  ) {
    return this.ledgerService.manualAdjustment(customerId, body);
  }
}
