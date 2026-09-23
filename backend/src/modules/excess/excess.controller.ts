import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ExcessService } from './excess.service';
import { PositiveBigIntIdPipe } from '../../common/pipes/positive-bigint-id.pipe';
import { RouteExcessDto } from './dto/route-excess.dto';

@ApiTags('Excess Payment & Customer Credit Management (KMSICAMS-2)')
@Controller('excess')
export class ExcessController {
  constructor(private readonly excessService: ExcessService) {}

  @Post('customers/:customerId/route')
  @ApiOperation({ summary: 'Route excess payment to Customer Credit or Refundable Balance (Story X3)' })
  routeExcess(
    @Param('customerId', PositiveBigIntIdPipe) customerId: string,
    @Body() body: RouteExcessDto,
  ) {
    return this.excessService.routeExcessFunds(customerId, body);
  }

  @Get('reports/excess-payments')
  @ApiOperation({ summary: 'Excess Payment Report (Story X4)' })
  getExcessReport() {
    return this.excessService.getExcessPaymentReport();
  }

  @Get('reports/credit-balances')
  @ApiOperation({ summary: 'Customer Credit Balance Report (Story X5)' })
  getCreditReport() {
    return this.excessService.getCreditBalanceReport();
  }
}
