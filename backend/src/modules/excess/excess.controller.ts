import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ExcessService } from './excess.service';
import { PositiveBigIntIdPipe } from '../../common/pipes/positive-bigint-id.pipe';
import { RouteExcessDto } from './dto/route-excess.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Excess Payment & Customer Credit Management (KMSICAMS-2)')
@Controller('excess')
export class ExcessController {
  constructor(private readonly excessService: ExcessService) {}

  @RequirePermissions('EXCESS_ROUTE')
  @Post('customers/:customerId/route')
  @ApiOperation({ summary: 'Route excess payment to Customer Credit or Refundable Balance (Story X3)' })
  routeExcess(
    @Param('customerId', PositiveBigIntIdPipe) customerId: string,
    @Body() body: RouteExcessDto,
  ) {
    return this.excessService.routeExcessFunds(customerId, body);
  }

  @RequirePermissions('EXCESS_VIEW')
  @Get('reports/excess-payments')
  @ApiOperation({ summary: 'Excess Payment Report (Story X4)' })
  getExcessReport() {
    return this.excessService.getExcessPaymentReport();
  }

  @RequirePermissions('EXCESS_ROUTE')
  @Post('customers/:customerId/transfer-credit')
  @ApiOperation({ summary: 'Credit transfer between customers with two-sided atomic ledger posting (Story X9)' })
  transferCredit(
    @Param('customerId', PositiveBigIntIdPipe) customerId: string,
    @Body()
    body: {
      targetCustomerId: string;
      amount: number;
      reason?: string;
      targetBookingId?: string;
    },
  ) {
    return this.excessService.transferCreditBetweenCustomers(customerId, body);
  }

  @RequirePermissions('EXCESS_VIEW')
  @Get('reports/credit-balances')
  @ApiOperation({ summary: 'Customer Credit Balance Report (Story X5)' })
  getCreditReport() {
    return this.excessService.getCreditBalanceReport();
  }
}
