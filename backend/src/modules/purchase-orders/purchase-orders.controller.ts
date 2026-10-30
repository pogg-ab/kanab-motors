import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import { POStatus } from './entities/purchase-order.entity';
import { PositiveBigIntIdPipe } from '../../common/pipes/positive-bigint-id.pipe';
import {
  CreatePODto,
  UpdatePODto,
  UpdatePOStatusDto,
  CreateComplianceRecordDto,
  CreatePaymentScheduleDto,
  RecordPaymentTransactionDto,
  CreateLetterOfCreditDto,
} from './dto/purchase-order.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';

@ApiTags('Purchase Orders & Import Processes (KMSICAMS-12)')
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  // -------------------------------------------------------------
  // Importer Profile & Bank Accounts (POX-01, POX-03)
  // -------------------------------------------------------------
  @Get('company-profile')
  @ApiOperation({ summary: 'Get Importer Company Profile (POX-01)' })
  getCompanyProfile() {
    return this.poService.getCompanyProfile();
  }

  @Get('bank-accounts')
  @ApiOperation({ summary: 'Get active Importer Bank Accounts (POX-03)' })
  getBankAccounts() {
    return this.poService.getBankAccounts();
  }

  @Get('financial-commitments')
  @ApiOperation({ summary: 'Get cross-PO financial commitments and L/C summary (Story IMP-22)' })
  getFinancialCommitments() {
    return this.poService.getFinancialObligationsSummary();
  }

  @Get('open-lines')
  @ApiOperation({ summary: 'Get open confirmed PO lines available for shipment assignment' })
  getOpenLines(@Query('supplierId') supplierId?: number) {
    return this.poService.getOpenPOLines(supplierId);
  }

  @Get('reports/status')
  @ApiOperation({ summary: 'Purchase Order Status and Summary Report (Story RP2)' })
  getPOStatusReport() {
    return this.poService.getPOStatusReport();
  }

  // -------------------------------------------------------------
  // Standard PO CRUD
  // -------------------------------------------------------------
  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermissions('PURCHASE_ORDERS_CREATE')
  @ApiOperation({ summary: 'Create a new Purchase Order with commercial terms (Story PO3 & Phase 2)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreatePODto) {
    return this.poService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List and search purchase orders (Story PO6)' })
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: POStatus,
    @Query('supplierId') supplierId?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.poService.findAll({ search, status, supplierId, page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Purchase Order details, lines, compliance records, and payment schedules' })
  findOne(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.poService.findOne(id);
  }

  @Get(':id/print')
  @ApiOperation({ summary: 'Story POX-05: Get Client-Format PO print document payload with Amount in Words' })
  getPrintData(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.poService.getPOPrintData(id);
  }

  @Get(':id/validate-readiness')
  @ApiOperation({ summary: 'Story IMP-11: Validate PO commercial & regulatory readiness' })
  validateReadiness(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.poService.validateCommercialReadiness(id);
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @RequirePermissions('PURCHASE_ORDERS_EDIT')
  @ApiOperation({ summary: 'Update Purchase Order (Draft status only)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(@Param('id', PositiveBigIntIdPipe) id: string, @Body() dto: UpdatePODto) {
    return this.poService.update(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(PermissionGuard)
  @RequirePermissions('PURCHASE_ORDERS_CONFIRM', 'PURCHASE_ORDERS_CANCEL')
  @ApiOperation({ summary: 'Update Purchase Order approval status with commercial checkpoint validation' })
  updateStatus(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: UpdatePOStatusDto,
    @Req() req: any,
  ) {
    const permissions = new Set<string>(req.user?.permissions || []);
    const isAdmin = req.user?.roleName === 'ADMIN' || permissions.has('ALL_PERMISSIONS');
    const requiredPermission = dto.status === POStatus.CANCELLED
      ? 'PURCHASE_ORDERS_CANCEL'
      : 'PURCHASE_ORDERS_CONFIRM';
    if (!isAdmin && !permissions.has(requiredPermission)) {
      throw new ForbiddenException(`Missing required permission: ${requiredPermission}`);
    }
    return this.poService.updateStatus(id, dto.status, dto.userId);
  }

  // -------------------------------------------------------------
  // Phase 3: Regulatory Compliance (IMP-12 to IMP-15)
  // -------------------------------------------------------------
  @Get(':id/compliance')
  @ApiOperation({ summary: 'List regulatory compliance records for PO' })
  getComplianceRecords(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.poService.getComplianceRecords(id);
  }

  @Post(':id/compliance')
  @ApiOperation({ summary: 'Create a compliance record for PO' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createComplianceRecord(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: CreateComplianceRecordDto,
  ) {
    dto.poId = id;
    return this.poService.createComplianceRecord(dto);
  }

  @Patch('compliance/:recordId/status')
  @ApiOperation({ summary: 'Update compliance clearance status (PENDING, APPROVED, REJECTED, etc.)' })
  updateComplianceStatus(
    @Param('recordId', PositiveBigIntIdPipe) recordId: string,
    @Body('status') status: string,
    @Body('notes') notes?: string,
  ) {
    return this.poService.updateComplianceStatus(recordId, status, notes);
  }

  // -------------------------------------------------------------
  // Phase 4: Payment Schedule & L/C (IMP-16 to IMP-22)
  // -------------------------------------------------------------
  @Get(':id/payment-schedules')
  @ApiOperation({ summary: 'Get payment milestones and transaction tracking for PO' })
  getPaymentSchedules(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.poService.getPaymentSchedules(id);
  }

  @Post(':id/payment-schedules')
  @ApiOperation({ summary: 'Add a payment schedule milestone to PO' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createPaymentSchedule(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: CreatePaymentScheduleDto,
  ) {
    dto.poId = id;
    return this.poService.createPaymentSchedule(dto);
  }

  @Post('payments/transactions')
  @ApiOperation({ summary: 'Record payment transaction against a milestone (Story IMP-18)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  recordPaymentTransaction(@Body() dto: RecordPaymentTransactionDto) {
    return this.poService.recordPaymentTransaction(dto);
  }

  @Get(':id/letters-of-credit')
  @ApiOperation({ summary: 'Get Letters of Credit for PO (Story IMP-20)' })
  getLettersOfCredit(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.poService.getLettersOfCredit(id);
  }

  @Post(':id/letters-of-credit')
  @ApiOperation({ summary: 'Record/Issue Letter of Credit for PO (Story IMP-20)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createLetterOfCredit(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: CreateLetterOfCreditDto,
  ) {
    dto.poId = id;
    return this.poService.createLetterOfCredit(dto);
  }

  @Patch('letters-of-credit/:lcId/status')
  @ApiOperation({ summary: 'Update Letter of Credit status (UTILIZED, EXPIRED, CLOSED, etc.)' })
  updateLetterOfCreditStatus(
    @Param('lcId', PositiveBigIntIdPipe) lcId: string,
    @Body('status') status: string,
    @Body('notes') notes?: string,
  ) {
    return this.poService.updateLetterOfCreditStatus(lcId, status, notes);
  }
}
