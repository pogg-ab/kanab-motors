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
