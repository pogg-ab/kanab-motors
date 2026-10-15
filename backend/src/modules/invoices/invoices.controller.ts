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
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { RecordWhtSettlementDto, UpdateWhtCertificateDto } from './dto/record-wht-settlement.dto';
import { InvoiceStatus } from './entities/sales-invoice.entity';
import { PositiveBigIntIdPipe } from '../../common/pipes/positive-bigint-id.pipe';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Sales Invoice & Settlement Management (KMSICAMS-6)')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @RequirePermissions('PAYMENTS_RECORD')
  @Post()
  @ApiOperation({ summary: 'Create Sales Invoice with automated VAT & deposit settlement (Stories IV1, IV2, IV4, IV5, IV6)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreateInvoiceDto, @Query('userId') userId?: string) {
    return this.invoicesService.create(dto, Number(userId) || 1);
  }

  @RequirePermissions('PAYMENTS_VIEW')
  @Get('preview-tax-calculation')
  @ApiOperation({ summary: 'Story IV2: Live rule evaluation and calculation engine preview for VAT, WHT, and Excise Duty' })
  previewTaxCalculation(
    @Query('subtotal') subtotal: string,
    @Query('vehicleType') vehicleType?: string,
    @Query('isWhtCustomer') isWhtCustomer?: string,
    @Query('vatRateOverride') vatRateOverride?: string,
    @Query('exciseRateOverride') exciseRateOverride?: string,
    @Query('whtRateOverride') whtRateOverride?: string,
    @Query('isVatExempt') isVatExempt?: string,
    @Query('isExciseExempt') isExciseExempt?: string,
    @Query('isWhtExempt') isWhtExempt?: string,
    @Query('calculationBase') calculationBase?: string,
    @Query('transactionDate') transactionDate?: string,
  ) {
    return this.invoicesService.evaluateTaxes({
      subtotal: Number(subtotal) || 0,
      vehicleType,
      isWhtCustomer: isWhtCustomer === 'true',
      vatRateOverride: vatRateOverride !== undefined ? Number(vatRateOverride) : undefined,
      exciseRateOverride: exciseRateOverride !== undefined ? Number(exciseRateOverride) : undefined,
      whtRateOverride: whtRateOverride !== undefined ? Number(whtRateOverride) : undefined,
      isVatExempt: isVatExempt === 'true',
      isExciseExempt: isExciseExempt === 'true',
      isWhtExempt: isWhtExempt === 'true',
      calculationBase,
      transactionDate,
    });
  }

  @RequirePermissions('PAYMENTS_VIEW')
  @Get('customer/:customerId/available-deposits')
  @ApiOperation({ summary: 'Story IV3: Retrieve eligible customer deposits and available credits from booking & customer ledger' })
  getCustomerAvailableDeposits(
    @Param('customerId', PositiveBigIntIdPipe) customerId: string,
    @Query('bookingId') bookingId?: string,
  ) {
    return this.invoicesService.getCustomerAvailableDeposits(customerId, bookingId);
  }

  @RequirePermissions('PAYMENTS_VIEW')
  @Get('wht/certificates')
  @ApiOperation({ summary: 'Story IV14: Track customer withholding tax certificates & missing list for finance' })
  getWhtCertificates() {
    return this.invoicesService.getWhtCertificates();
  }

  @RequirePermissions('PAYMENTS_VIEW')
  @Get()
  @ApiOperation({ summary: 'List all sales invoices with balances, VAT & status' })
  findAll(
    @Query('status') status?: InvoiceStatus,
    @Query('customerId') customerId?: string,
  ) {
    return this.invoicesService.findAll({ status, customerId });
  }

  @RequirePermissions('PAYMENTS_VIEW')
  @Get(':id')
  @ApiOperation({ summary: 'Get sales invoice details with line calculations' })
  findOne(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.invoicesService.findOne(id);
  }

  @RequirePermissions('PAYMENTS_RECORD')
  @Post(':id/wht-settlement')
  @ApiOperation({ summary: 'Story IV14: Record non-cash WHT settlement and atomic ledger posting' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  recordWhtSettlement(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: RecordWhtSettlementDto,
    @Query('userId') userId?: string,
  ) {
    return this.invoicesService.recordWhtSettlement(id, dto, Number(userId) || 1);
  }

  @RequirePermissions('PAYMENTS_CONFIRM')
  @Patch(':id/wht-certificate')
  @ApiOperation({ summary: 'Story IV14: Update WHT certificate number or mark as claimed' })
  updateWhtCertificate(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: UpdateWhtCertificateDto,
  ) {
    return this.invoicesService.updateWhtCertificate(id, dto);
  }

  @RequirePermissions('PAYMENTS_CONFIRM')
  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve invoice, settle booking & transition vehicle to SOLD (Stories IV7, IV8, IV9, IV10)' })
  approve(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body('comments') comments?: string,
    @Query('userId') userId?: string,
  ) {
    return this.invoicesService.approve(id, Number(userId) || 1, comments);
  }

  @RequirePermissions('PAYMENTS_REJECT')
  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject sales invoice' })
  reject(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body('comments') comments?: string,
    @Query('userId') userId?: string,
  ) {
    return this.invoicesService.reject(id, Number(userId) || 1, comments);
  }
}
