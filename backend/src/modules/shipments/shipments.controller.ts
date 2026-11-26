import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { ShipmentsService } from './services/shipments.service';
import { LandedCostAllocationService } from './services/landed-cost-allocation.service';
import { ShipmentStage } from './entities/shipment.entity';
import { PositiveBigIntIdPipe } from '../../common/pipes/positive-bigint-id.pipe';
import {
  AddCostComponentDto,
  AllocateLandedCostDto,
  CreateShipmentDto,
  ReceiveShipmentLineDto,
  UpdateExchangeRateDto,
  UpdateShipmentStageDto,
  UploadShipmentDocumentDto,
} from './dto/shipment.dto';
import {
  CreateFreightForwarderDto,
  UpdateFreightForwarderDto,
  CreateFreightQuotationDto,
  SelectFreightQuotationDto,
  ApproveFreightQuotationDto,
  RejectFreightQuotationDto,
  CreateShipmentBookingDto,
  CreateShipmentContainerDto,
  CreateShipmentMilestoneDto,
  CreateShipmentInsuranceDto,
  CreateCargoTrackingDto,
  CreateShipmentDocumentDto,
  VerifyShipmentDocumentDto,
  UpdateOriginalDocumentStatusDto,
} from './dto/logistics.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';

const shipmentUploadsDir = path.resolve(process.cwd(), 'uploads/documents');
if (!fs.existsSync(shipmentUploadsDir)) {
  fs.mkdirSync(shipmentUploadsDir, { recursive: true });
}

@ApiTags('Shipments & Import Logistics (KMSICAMS-12 Part II)')
@Controller('shipments')
export class ShipmentsController {
  constructor(
    private readonly shipmentsService: ShipmentsService,
    private readonly landedCostService: LandedCostAllocationService,
  ) {}

  @Get('logistics-policy/config')
  @RequirePermissions('SHIPMENTS_VIEW','SHIPMENTS_CREATE')
  getLogisticsPolicy() { return this.shipmentsService.getLogisticsConfiguration(); }

  @Put('logistics-policy/config')
  @RequirePermissions('COMPANY_PROFILE_EDIT')
  saveLogisticsPolicy(@Body() body:any,@Req() req:any) { return this.shipmentsService.saveLogisticsPolicy(body,req.user.userId); }

  @Post(':id/logistics-records/:kind')
  @RequirePermissions('SHIPMENTS_CREATE')
  saveLogisticsRecord(@Param('id',PositiveBigIntIdPipe) id:string,@Param('kind') kind:string,@Body() body:any,@Req() req:any) {
    return this.shipmentsService.saveLogisticsRecord(kind,id,undefined,body,req.user.userId);
  }
  @Put(':id/logistics-records/:kind/:recordId')
  @RequirePermissions('SHIPMENTS_CREATE')
  updateLogisticsRecord(@Param('id',PositiveBigIntIdPipe) id:string,@Param('kind') kind:string,@Param('recordId',PositiveBigIntIdPipe) recordId:string,@Body() body:any,@Req() req:any) {
    return this.shipmentsService.saveLogisticsRecord(kind,id,recordId,body,req.user.userId);
  }
  @Put(':id/insurance-requirement')
  @RequirePermissions('SHIPMENTS_CREATE')
  insuranceRequirement(@Param('id',PositiveBigIntIdPipe) id:string,@Body() body:any,@Req() req:any) {
    return this.shipmentsService.setInsuranceRequirement(id,body.required,body.reason,req.user.userId);
  }

  // -------------------------------------------------------------
  // Freight Forwarders (IMP-23)
  // -------------------------------------------------------------
  @Get('freight-forwarders')
  @ApiOperation({ summary: 'Get freight forwarders master list (Story IMP-23)' })
  getFreightForwarders(@Query('activeOnly') activeOnly?: string) {
    return this.shipmentsService.getFreightForwarders(activeOnly !== 'false');
  }

  @Post('freight-forwarders')
  @UseGuards(PermissionGuard)
  @RequirePermissions('SHIPMENTS_CREATE')
  @ApiOperation({ summary: 'Create new freight forwarder (Story IMP-23)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createFreightForwarder(@Body() dto: CreateFreightForwarderDto, @Req() req:any) {
    return this.shipmentsService.createFreightForwarder(dto,req.user.userId);
  }

  @Put('freight-forwarders/:id')
  @UseGuards(PermissionGuard)
  @RequirePermissions('SHIPMENTS_CREATE')
  @ApiOperation({ summary: 'Update freight forwarder (Story IMP-23)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateFreightForwarder(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: UpdateFreightForwarderDto,
    @Req() req:any,
  ) {
    return this.shipmentsService.updateFreightForwarder(id, dto,req.user.userId);
  }

  // -------------------------------------------------------------
  // Phase 8: Import Reports & Reconciliation (IMP-43 - IMP-48)
  // -------------------------------------------------------------
  @Get('reports/pipeline')
  @UseGuards(PermissionGuard)
  @RequirePermissions('REPORTS_VIEW', 'SHIPMENTS_VIEW', 'PURCHASE_ORDERS_VIEW')
  @ApiOperation({ summary: 'Shipment Status & Pipeline Report (Story IMP-43 / RP1)' })
  getPipelineReport(
    @Query('businessUnit') businessUnit?: string,
    @Query('supplier') supplier?: string,
    @Query('destination') destination?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    return this.shipmentsService.getPipelineReport({
      businessUnit,
      supplier,
      destination,
      status,
      startDate,
      endDate,
      search,
    });
  }

  @Get('reports/pipeline/export')
  @UseGuards(PermissionGuard)
  @RequirePermissions('REPORTS_EXPORT', 'SHIPMENTS_VIEW', 'PURCHASE_ORDERS_VIEW')
  @ApiOperation({ summary: 'Export Shipment Pipeline Report as CSV (Story IMP-43)' })
  async exportPipelineReport(
    @Res() res: any,
    @Query('businessUnit') businessUnit?: string,
    @Query('supplier') supplier?: string,
    @Query('destination') destination?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    const { filename, csv } = await this.shipmentsService.exportPipelineReportCsv({
      businessUnit,
      supplier,
      destination,
      status,
      startDate,
      endDate,
      search,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  }

  @Get('reports/logistics')
  @UseGuards(PermissionGuard)
  @RequirePermissions('REPORTS_VIEW', 'SHIPMENTS_VIEW', 'PURCHASE_ORDERS_VIEW')
  @ApiOperation({ summary: 'Shipment and Logistics Tracking Report (Story IMP-45)' })
  getShipmentLogisticsReport() {
    return this.shipmentsService.getShipmentLogisticsReport();
  }

  @Get('reports/logistics/export')
  @UseGuards(PermissionGuard)
  @RequirePermissions('REPORTS_EXPORT', 'SHIPMENTS_VIEW', 'PURCHASE_ORDERS_VIEW')
  @ApiOperation({ summary: 'Export Shipment Logistics Report as CSV (Story IMP-45)' })
  async exportShipmentLogisticsReport(@Res() res: any) {
    const { filename, csv } = await this.shipmentsService.exportShipmentLogisticsCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  }

  @Get('reports/document-completeness')
  @UseGuards(PermissionGuard)
  @RequirePermissions('REPORTS_VIEW', 'SHIPMENTS_VIEW', 'PURCHASE_ORDERS_VIEW')
  @ApiOperation({ summary: 'Document Completeness and Verification Report (Story IMP-46)' })
  getDocumentCompletenessReport(
    @Query('shipmentId') shipmentId?: string,
    @Query('status') status?: string,
    @Query('documentType') documentType?: string,
    @Query('search') search?: string,
  ) {
    return this.shipmentsService.getDocumentCompletenessReport({
      shipmentId,
      status,
      documentType,
      search,
    });
  }

  @Get('reports/document-completeness/export')
  @UseGuards(PermissionGuard)
  @RequirePermissions('REPORTS_EXPORT', 'SHIPMENTS_VIEW', 'PURCHASE_ORDERS_VIEW')
  @ApiOperation({ summary: 'Export Document Completeness Report as CSV (Story IMP-46)' })
  async exportDocumentCompletenessReport(
    @Res() res: any,
    @Query('shipmentId') shipmentId?: string,
    @Query('status') status?: string,
    @Query('documentType') documentType?: string,
    @Query('search') search?: string,
  ) {
    const { filename, csv } = await this.shipmentsService.exportDocumentCompletenessCsv({
      shipmentId,
      status,
      documentType,
      search,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  }

  @Get('reports/reconciliation')
  @UseGuards(PermissionGuard)
  @RequirePermissions('REPORTS_VIEW', 'SHIPMENTS_VIEW', 'PURCHASE_ORDERS_VIEW')
  @ApiOperation({ summary: 'Import Reconciliation Report (Ordered vs Shipped vs Received) (Story IMP-47)' })
  getImportReconciliationReport() {
    return this.shipmentsService.getImportReconciliationReport();
  }

  @Get('reports/reconciliation/export')
  @UseGuards(PermissionGuard)
  @RequirePermissions('REPORTS_EXPORT', 'SHIPMENTS_VIEW', 'PURCHASE_ORDERS_VIEW')
  @ApiOperation({ summary: 'Export Import Reconciliation Report as CSV (Story IMP-47)' })
  async exportImportReconciliationReport(@Res() res: any) {
    const { filename, csv } = await this.shipmentsService.exportImportReconciliationCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  }

  @Get('reports/monitoring-dashboard')
  @UseGuards(PermissionGuard)
  @RequirePermissions('REPORTS_VIEW', 'SHIPMENTS_VIEW', 'PURCHASE_ORDERS_VIEW')
  @ApiOperation({ summary: 'Import Monitoring Dashboard Executive Overview (Story IMP-48)' })
  getImportMonitoringDashboard() {
    return this.shipmentsService.getImportMonitoringDashboard();
  }

  // -------------------------------------------------------------
  // Phase 7: Notifications & Alerts (IMP-40, IMP-41)
  // -------------------------------------------------------------
  @Get('notifications/alerts')
  @RequirePermissions('SHIPMENTS_UPDATE_STAGE')
  @ApiOperation({ summary: 'Get automated import alerts and notifications (Story IMP-40/41)' })
  getNotifications(
    @Query('unreadOnly') unreadOnly?: string,
    @Req() req?: any,
  ) {
    return this.shipmentsService.getImportNotifications({
      unreadOnly: unreadOnly === 'true',
      userId: req?.user?.userId,
    });
  }

  @Patch('notifications/:id/read')
  @RequirePermissions('SHIPMENTS_UPDATE_STAGE')
  @ApiOperation({ summary: 'Mark import notification as read' })
  markNotificationRead(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.shipmentsService.markNotificationRead(id);
  }

  @Post('notifications/:id/escalate')
  @RequirePermissions('SHIPMENTS_UPDATE_STAGE')
  @ApiOperation({ summary: 'Escalate an import notification and preserve escalation history' })
  escalateNotification(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body('recipientRole') recipientRole: string,
    @Req() req?: any,
  ) {
    return this.shipmentsService.escalateNotification(id, recipientRole, req?.user?.userId);
  }

  @Post('notifications/scan-alerts')
  @RequirePermissions('SHIPMENTS_UPDATE_STAGE')
  @ApiOperation({ summary: 'Trigger automated background scan for approaching deadlines' })
  scanAlerts() {
    return this.shipmentsService.generateAutomatedImportAlerts();
  }

  @Get('document-requirements/config')
  @RequirePermissions('SHIPMENTS_DOCS_UPLOAD')
  @ApiOperation({ summary: 'List configurable document requirements by destination, shipment type and stage' })
  getDocumentRequirements() {
    return this.shipmentsService.getDocumentRequirements();
  }

  @Get('workflow/config')
  @RequirePermissions('SHIPMENTS_UPDATE_STAGE')
  @ApiOperation({ summary: 'List configured import workflow transitions and responsible roles' })
  getWorkflowConfiguration() {
    return this.shipmentsService.getImportWorkflowConfiguration();
  }

  @Post('document-requirements/config')
  @RequirePermissions('SHIPMENTS_UPDATE_STAGE')
  @ApiOperation({ summary: 'Create or update a document requirement rule' })
  saveDocumentRequirement(@Body() body: any) {
    return this.shipmentsService.saveDocumentRequirement(body);
  }

  // -------------------------------------------------------------
  // Lookups: Cost Component Types & Exchange Rates
  // -------------------------------------------------------------
  @Get('lookups/cost-component-types')
  @ApiOperation({ summary: 'Get cost component types reference data (Story F2)' })
  getCostTypes() {
    return this.shipmentsService.getCostComponentTypes();
  }

  @Post('lookups/cost-component-types')
  @UseGuards(PermissionGuard)
  @RequirePermissions('LANDED_COST_ADD_EXPENSE')
  @ApiOperation({ summary: 'Create new cost component type dynamically' })
  createCostType(@Body() dto: { typeName: string }) {
    return this.shipmentsService.createCostComponentType(dto?.typeName);
  }

  @Get('lookups/exchange-rates')
  @ApiOperation({ summary: 'Get default currency exchange rates (Story F3)' })
  getExchangeRates() {
    return this.shipmentsService.getExchangeRates();
  }

  @Put('lookups/exchange-rates/:currency')
  @UseGuards(PermissionGuard)
  @RequirePermissions('EXCHANGE_RATES_MANAGE')
  @ApiOperation({ summary: 'Update default exchange rate to ETB' })
  updateExchangeRate(
    @Param('currency') currency: string,
    @Body() dto: UpdateExchangeRateDto,
  ) {
    const normalizedCurrency = currency.trim().toUpperCase();
    if (!/^[A-Z]{3,10}$/.test(normalizedCurrency)) {
      throw new BadRequestException('Currency code must be 3 to 10 uppercase letters');
    }
    return this.shipmentsService.updateExchangeRate(normalizedCurrency, dto.rateToEtb);
  }

  // -------------------------------------------------------------
  // Standard Shipment CRUD
  // -------------------------------------------------------------
  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermissions('SHIPMENTS_CREATE')
  @ApiOperation({ summary: 'Create new import shipment consolidating PO lines (Story S1/S2)' })
  create(@Body() dto: CreateShipmentDto, @Req() req: any) {
    if (!dto.userId && req.user?.userId) {
      dto.userId = req.user.userId;
    }
    return this.shipmentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List and filter shipments (Story S4)' })
  findAll(
    @Query('search') search?: string,
    @Query('stage') stage?: ShipmentStage,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.shipmentsService.findAll({ search, stage, page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shipment full details, lines, stages, logistics, and costs' })
  findOne(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.shipmentsService.findOne(id);
  }

  @Get(':id/logistics-overview')
  @RequirePermissions('SHIPMENTS_VIEW','SHIPMENTS_CREATE')
  @ApiOperation({ summary: 'Story IMP-32: Get comprehensive shipment logistics cockpit overview' })
  getLogisticsOverview(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.shipmentsService.getShipmentLogisticsOverview(id);
  }

  @Patch(':id/stage')
  @UseGuards(PermissionGuard)
  @RequirePermissions('SHIPMENTS_UPDATE_STAGE')
  @ApiOperation({
    summary: 'Advance shipment stage with Document Completeness validation (Story S3/D2/IMP-37)',
  })
  updateStage(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: UpdateShipmentStageDto,
    @Req() req: any,
  ) {
    const userId = dto.userId || req.user?.userId;
    return this.shipmentsService.updateStage(id, dto.stage, dto.notes, userId);
  }

  @Patch(':id/forwarder/:forwarderId')
  @UseGuards(PermissionGuard)
  @RequirePermissions('SHIPMENTS_CREATE')
  @ApiOperation({ summary: 'Assign freight forwarder to shipment' })
  setForwarder(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Param('forwarderId', PositiveBigIntIdPipe) forwarderId: string,
  ) {
    return this.shipmentsService.setShipmentSelectedForwarder(id, forwarderId);
  }

  // -------------------------------------------------------------
  // Phase 5: Freight Quotations (IMP-24, IMP-25)
  // -------------------------------------------------------------
  @Get(':id/quotations')
  @ApiOperation({ summary: 'Get freight quotations for shipment (Story IMP-24)' })
  getQuotations(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.shipmentsService.getShipmentQuotations(id);
  }

  @Post(':id/quotations')
  @UseGuards(PermissionGuard)
  @RequirePermissions('SHIPMENTS_CREATE')
  @ApiOperation({ summary: 'Add freight quotation to shipment (Story IMP-24)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  addQuotation(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: CreateFreightQuotationDto,
    @Req() req: any,
  ) {
    dto.userId = req.user.userId;
    return this.shipmentsService.addShipmentQuotation(id, dto);
  }

  @Post(':id/quotations/:quotationId/select')
  @UseGuards(PermissionGuard)
  @RequirePermissions('SHIPMENTS_CREATE')
  @ApiOperation({ summary: 'Select freight quotation for approval (Story IMP-25)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  selectQuotation(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Param('quotationId', PositiveBigIntIdPipe) quotationId: string,
    @Body() dto: SelectFreightQuotationDto,
    @Req() req: any,
  ) {
    dto.userId = req.user.userId;
    return this.shipmentsService.selectShipmentQuotation(id, quotationId, dto);
  }

  @Post(':id/quotations/:quotationId/approve')
  @UseGuards(PermissionGuard)
  @RequirePermissions('SHIPMENTS_QUOTATION_APPROVE')
  @ApiOperation({ summary: 'Approve selected freight quotation (Story IMP-25)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  approveQuotation(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Param('quotationId', PositiveBigIntIdPipe) quotationId: string,
    @Body() dto: ApproveFreightQuotationDto,
    @Req() req: any,
  ) {
    dto.userId = req.user.userId;
    return this.shipmentsService.approveShipmentQuotation(id, quotationId, dto);
  }

  @Post(':id/quotations/:quotationId/reject')
  @UseGuards(PermissionGuard)
  @RequirePermissions('SHIPMENTS_QUOTATION_APPROVE')
  @ApiOperation({ summary: 'Reject freight quotation (Story IMP-25)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  rejectQuotation(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Param('quotationId', PositiveBigIntIdPipe) quotationId: string,
    @Body() dto: RejectFreightQuotationDto,
    @Req() req: any,
  ) {
    dto.userId = req.user.userId;
    return this.shipmentsService.rejectShipmentQuotation(id, quotationId, dto);
  }

  // -------------------------------------------------------------
  // Phase 5: Shipment Bookings & Vessel Tracking (IMP-26)
  // -------------------------------------------------------------
  @Get(':id/bookings')
  @ApiOperation({ summary: 'Get booking and vessel schedule details (Story IMP-26)' })
  getBookings(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.shipmentsService.getShipmentBookings(id);
  }

  @Post(':id/bookings')
  @UseGuards(PermissionGuard)
  @RequirePermissions('SHIPMENTS_CREATE')
  @ApiOperation({ summary: 'Create shipment vessel/air booking (Story IMP-26)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createBooking(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: CreateShipmentBookingDto,
    @Req() req: any,
  ) {
    dto.userId = req.user.userId;
    return this.shipmentsService.createShipmentBooking(id, dto);
  }

  @Put('bookings/:bookingId')
  @UseGuards(PermissionGuard)
  @RequirePermissions('SHIPMENTS_CREATE')
  @ApiOperation({ summary: 'Update shipment vessel booking details' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateBooking(
    @Param('bookingId', PositiveBigIntIdPipe) bookingId: string,
    @Body() dto: CreateShipmentBookingDto,
    @Req() req:any,
  ) {
    dto.userId=req.user.userId;
    return this.shipmentsService.updateShipmentBooking(bookingId, dto);
  }

  // -------------------------------------------------------------
  // Phase 5: Container Management (IMP-27)
  // -------------------------------------------------------------
  @Get(':id/containers')
  @ApiOperation({ summary: 'Get containers allocated to shipment (Story IMP-27)' })
  getContainers(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.shipmentsService.getShipmentContainers(id);
  }

  @Post(':id/containers')
  @UseGuards(PermissionGuard)
  @RequirePermissions('SHIPMENTS_CREATE')
  @ApiOperation({ summary: 'Allocate container to shipment (Story IMP-27)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  addContainer(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: CreateShipmentContainerDto,
    @Req() req:any,
  ) {
    return this.shipmentsService.saveLogisticsRecord('containers',id,undefined,dto,req.user.userId);
  }

  @Put('containers/:containerId')
  @UseGuards(PermissionGuard)
  @RequirePermissions('SHIPMENTS_CREATE')
  @ApiOperation({ summary: 'Update container details (free time, seal, status)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateContainer(
    @Param('containerId', PositiveBigIntIdPipe) containerId: string,
    @Body() dto: CreateShipmentContainerDto,
    @Req() req:any,
  ) {
    return this.shipmentsService.saveLogisticsRecord('containers',undefined,containerId,dto,req.user.userId);
  }

  // -------------------------------------------------------------
  // Phase 5: Cargo Milestones (IMP-28)
  // -------------------------------------------------------------
  @Get(':id/milestones')
  @ApiOperation({ summary: 'Get logistics shipping milestones (Story IMP-28)' })
  getMilestones(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.shipmentsService.getShipmentMilestones(id);
  }

  @Post(':id/milestones')
  @UseGuards(PermissionGuard)
  @RequirePermissions('SHIPMENTS_CREATE')
  @ApiOperation({ summary: 'Add custom shipping milestone' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  addMilestone(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: CreateShipmentMilestoneDto,
    @Req() req: any,
  ) {
    dto.userId = req.user.userId;
    return this.shipmentsService.addShipmentMilestone(id, dto);
  }

  @Patch('milestones/:milestoneId')
  @UseGuards(PermissionGuard)
  @RequirePermissions('SHIPMENTS_UPDATE_STAGE')
  @ApiOperation({ summary: 'Update milestone completion status' })
  updateMilestone(
    @Param('milestoneId', PositiveBigIntIdPipe) milestoneId: string,
    @Body('isCompleted') isCompleted: boolean,
    @Body('notes') notes?: string,
    @Req() req?: any,
  ) {
    return this.shipmentsService.saveLogisticsRecord('milestones',undefined,milestoneId,{isCompleted,notes,revisionReason:notes||'Update milestone completion'},req.user.userId);
  }

  // -------------------------------------------------------------
  // Phase 5: Shipment Insurance (IMP-29)
  // -------------------------------------------------------------
  @Get(':id/insurance')
  @ApiOperation({ summary: 'Get shipment marine cargo insurance (Story IMP-29)' })
  getInsurance(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.shipmentsService.getShipmentInsurances(id);
  }

  @Post(':id/insurance')
  @UseGuards(PermissionGuard)
  @RequirePermissions('SHIPMENTS_CREATE')
  @ApiOperation({ summary: 'Record marine cargo insurance policy (Story IMP-29)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  addInsurance(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: CreateShipmentInsuranceDto,
    @Req() req:any,
  ) {
    return this.shipmentsService.saveLogisticsRecord('insurance',id,undefined,dto,req.user.userId);
  }

  // -------------------------------------------------------------
  // Phase 5: Cargo Tracking & ECTN (IMP-30)
  // -------------------------------------------------------------
  @Get(':id/cargo-tracking')
  @ApiOperation({ summary: 'Get ECTN and cargo tracking deadlines (Story IMP-30)' })
  getCargoTracking(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.shipmentsService.getShipmentCargoTracking(id);
  }

  @Post(':id/cargo-tracking')
  @UseGuards(PermissionGuard)
  @RequirePermissions('SHIPMENTS_CREATE')
  @ApiOperation({ summary: 'Record ECTN certificate / cargo tracking (Story IMP-30)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  addCargoTracking(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: CreateCargoTrackingDto,
    @Req() req:any,
  ) {
    return this.shipmentsService.saveLogisticsRecord('tracking',id,undefined,dto,req.user.userId);
  }

  @Put('cargo-tracking/:trackingId')
  @UseGuards(PermissionGuard)
  @RequirePermissions('SHIPMENTS_CREATE')
  @ApiOperation({ summary: 'Update ECTN / cargo tracking status' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateCargoTracking(
    @Param('trackingId', PositiveBigIntIdPipe) trackingId: string,
    @Body() dto: CreateCargoTrackingDto,
    @Req() req:any,
  ) {
    return this.shipmentsService.saveLogisticsRecord('tracking',undefined,trackingId,dto,req.user.userId);
  }

  // -------------------------------------------------------------
  // Phase 6: Document Control & Verification (IMP-32 - IMP-37)
  // -------------------------------------------------------------
  @Get(':id/documents-control')
  @ApiOperation({ summary: 'Get shipping document verification records (Story IMP-32/33)' })
  getDocumentsControl(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.shipmentsService.getShipmentDocumentsList(id);
  }

  @Post(':id/documents-control')
  @UseGuards(PermissionGuard)
  @RequirePermissions('SHIPMENTS_DOCS_UPLOAD')
  @ApiOperation({ summary: 'Add shipping document metadata record (Story IMP-32)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  addDocumentControl(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: CreateShipmentDocumentDto,
    @Req() req: any,
  ) {
    dto.userId = req.user.userId;
    return this.shipmentsService.addShipmentDocument(id, dto);
  }

  @Patch('documents-control/:docId/verify')
  @UseGuards(PermissionGuard)
  @RequirePermissions('SHIPMENTS_UPDATE_STAGE')
  @ApiOperation({ summary: 'Verify or reject shipping document (Story IMP-34)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  verifyDocument(
    @Param('docId', PositiveBigIntIdPipe) docId: string,
    @Body() dto: VerifyShipmentDocumentDto,
    @Req() req: any,
  ) {
    dto.userId = req.user.userId;
    return this.shipmentsService.verifyShipmentDocument(docId, dto);
  }

  @Patch('documents-control/:docId/original-status')
  @UseGuards(PermissionGuard)
  @RequirePermissions('SHIPMENTS_DOCS_UPLOAD')
  @ApiOperation({ summary: 'Update physical original document status (Story IMP-36)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateOriginalStatus(
    @Param('docId', PositiveBigIntIdPipe) docId: string,
    @Body() dto: UpdateOriginalDocumentStatusDto,
    @Req() req: any,
  ) {
    dto.userId = req.user.userId;
    return this.shipmentsService.updateOriginalDocumentStatus(docId, dto);
  }

  // -------------------------------------------------------------
  // Cost Components & Landed Cost Allocation
  // -------------------------------------------------------------
  @Post(':id/costs')
  @UseGuards(PermissionGuard)
  @RequirePermissions('LANDED_COST_ADD_EXPENSE')
  @ApiOperation({ summary: 'Add multi-currency cost component to shipment (Story C1-C3)' })
  addCostComponent(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: AddCostComponentDto,
    @Req() req: any,
  ) {
    if (!dto.userId && req.user?.userId) {
      dto.userId = req.user.userId;
    }
    return this.shipmentsService.addCostComponent(id, dto);
  }

  @Delete(':id/costs/:costId')
  @UseGuards(PermissionGuard)
  @RequirePermissions('LANDED_COST_ADD_EXPENSE')
  @ApiOperation({ summary: 'Remove cost component from shipment' })
  removeCostComponent(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Param('costId', PositiveBigIntIdPipe) costId: string,
  ) {
    return this.shipmentsService.removeCostComponent(id, costId);
  }

  @Post(':id/allocate-landed-cost')
  @UseGuards(PermissionGuard)
  @RequirePermissions('LANDED_COST_ALLOCATE')
  @ApiOperation({
    summary: 'Execute Landed Cost Allocation Engine with Zero Rounding Drift (Story A1-A4)',
  })
  allocateLandedCost(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: AllocateLandedCostDto,
    @Req() req: any,
  ) {
    const userId = dto.userId || req.user?.userId;
    return this.landedCostService.calculateAndPersistAllocation(
      id,
      dto.allocationMethod,
      userId,
    );
  }

  @Get(':id/landed-cost-report')
  @ApiOperation({ summary: 'Get Landed Cost Breakdown Report for shipment (Story A5)' })
  getLandedCostReport(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.landedCostService.getLandedCostReport(id);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'List shipment uploaded file documents' })
  getDocuments(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.shipmentsService.getDocuments(id);
  }

  @Post(':id/documents')
  @UseGuards(PermissionGuard)
  @RequirePermissions('SHIPMENTS_DOCS_UPLOAD')
  @ApiOperation({ summary: 'Upload shipment document attachment' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: shipmentUploadsDir,
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const allowedExts = ['.pdf', '.jpeg', '.jpg', '.png', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (!allowedMimes.includes(file.mimetype) || !allowedExts.includes(ext)) {
          return cb(
            new BadRequestException(
              'Unsupported file format. Only PDF documents and standard images (JPEG, PNG, WEBP) are accepted.',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  uploadDocument(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadShipmentDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('A document file is required');
    }

    return this.shipmentsService.addDocument(id, {
      fileName: file.originalname,
      filePath: `/uploads/documents/${file.filename}`,
      contentType: file.mimetype,
      sizeBytes: file.size,
      documentType: dto.documentType,
      userId: dto.userId,
    });
  }

  @Delete(':id/documents/:docId')
  @UseGuards(PermissionGuard)
  @RequirePermissions('SHIPMENTS_DOCS_UPLOAD')
  @ApiOperation({ summary: 'Delete shipment document attachment' })
  deleteDocument(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Param('docId', PositiveBigIntIdPipe) docId: string,
  ) {
    return this.shipmentsService.deleteDocument(id, docId);
  }

  @Post(':id/receive')
  @UseGuards(PermissionGuard)
  @RequirePermissions('SHIPMENTS_RECEIVE_STOCK')
  @ApiOperation({
    summary: 'Receive shipment line into inventory and generate vehicle units (Story R1-R3)',
  })
  receiveLine(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: ReceiveShipmentLineDto,
    @Req() req: any,
  ) {
    if (!dto.userId && req.user?.userId) {
      dto.userId = req.user.userId;
    }
    return this.shipmentsService.receiveLine(id, dto);
  }
}
