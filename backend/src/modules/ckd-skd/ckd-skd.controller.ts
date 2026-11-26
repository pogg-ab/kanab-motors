import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CkdSkdService } from './ckd-skd.service';
import { KitType } from './entities/ckd-skd-batch.entity';
import { CustomsClearanceStatus } from './entities/customs-clearance.entity';
import { SerialType, SerialStatus, SerialSourceType } from './entities/ckd-skd-serial.entity';
import { WarehouseClassification } from '../lookups/entities/warehouse.entity';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('CKD/SKD Import & Inventory Integration (KMSICAMS-19)')
@Controller('ckd-skd')
export class CkdSkdController {
  constructor(private readonly ckdSkdService: CkdSkdService) {}

  // Story 1: Gap Assessment & Source-of-Truth Mapping
  @RequirePermissions('INVENTORY_VIEW')
  @Get('mapping-summary')
  @ApiOperation({ summary: 'Get technical module mapping & integration summary' })
  getModuleMappingSummary() {
    return this.ckdSkdService.getModuleMappingSummary();
  }

  // Story 2 & 3: Batches & Receipts
  @RequirePermissions('INVENTORY_VIEW')
  @Get('batches')
  @ApiOperation({ summary: 'Get CKD/SKD batches with receipt & clearance summary' })
  getBatches(@Query('shipmentId') shipmentId?: string) {
    return this.ckdSkdService.getBatches(shipmentId);
  }

  @RequirePermissions('INVENTORY_VIEW')
  @Get('batches/:id')
  @ApiOperation({ summary: 'Get CKD/SKD batch details by ID' })
  getBatchById(@Param('id') id: string) {
    return this.ckdSkdService.getBatchById(id);
  }

  @RequirePermissions('SHIPMENT_MANAGE')
  @Post('batches')
  @ApiOperation({ summary: 'Create a new CKD/SKD batch linked to an import shipment' })
  createBatch(
    @Body()
    body: {
      batchCode?: string;
      shipmentId: string;
      shipmentLineId?: string;
      kitType: KitType;
      itemId: string;
      plannedQuantity: number;
      uomId?: number;
      batchDate?: string;
      remarks?: string;
    },
    @Req() req: any,
  ) {
    return this.ckdSkdService.createBatch(body, req?.user?.userId || 1);
  }

  @RequirePermissions('INVENTORY_VIEW')
  @Get('available-receipts')
  @ApiOperation({ summary: 'Get goods receipts available for CKD/SKD batch linking' })
  getAvailableReceipts() {
    return this.ckdSkdService.getAvailableReceipts();
  }

  @RequirePermissions('SHIPMENT_MANAGE')
  @Post('batch-receipts')
  @ApiOperation({ summary: 'Link a CKD/SKD batch to a goods receipt (partial/multiple supported)' })
  linkBatchReceipt(
    @Body()
    body: {
      batchId: string;
      receiptId: string;
      receivedQuantity: number;
      idempotencyKey?: string;
    },
    @Req() req: any,
  ) {
    return this.ckdSkdService.linkBatchReceipt(body, req?.user?.userId || 1);
  }

  // Story 4: Warehouse Classifications (Bonded vs Production)
  @RequirePermissions('WAREHOUSES_MANAGE')
  @Get('warehouses')
  @ApiOperation({ summary: 'List warehouses with bonded/production classifications' })
  getWarehousesWithClassification() {
    return this.ckdSkdService.getWarehousesWithClassification();
  }

  @RequirePermissions('WAREHOUSES_MANAGE')
  @Patch('warehouses/:id/classification')
  @ApiOperation({ summary: 'Set warehouse classification (BONDED, PRODUCTION, etc.)' })
  updateWarehouseClassification(
    @Param('id', ParseIntPipe) id: number,
    @Body('classification') classification: WarehouseClassification,
    @Req() req: any,
  ) {
    return this.ckdSkdService.updateWarehouseClassification(id, classification, req?.user?.userId || 1);
  }

  // Story 5: Customs Clearance
  @RequirePermissions('INVENTORY_VIEW')
  @Get('clearances')
  @ApiOperation({ summary: 'List all customs clearances' })
  getClearances() {
    return this.ckdSkdService.getClearances();
  }

  @RequirePermissions('INVENTORY_VIEW')
  @Get('clearances/outstanding')
  @ApiOperation({ summary: 'Get batch receipts with cleared vs outstanding clearance quantities' })
  getOutstandingClearances() {
    return this.ckdSkdService.getOutstandingClearances();
  }

  @RequirePermissions('SHIPMENT_MANAGE')
  @Post('clearances')
  @ApiOperation({ summary: 'Create a customs clearance (full or partial)' })
  createCustomsClearance(
    @Body()
    body: {
      declarationNumber: string;
      clearanceDate?: string;
      documentReference?: string;
      remarks?: string;
      autoSubmit?: boolean;
      lines: Array<{ batchId: string; batchReceiptId: string; clearedQuantity: number }>;
    },
    @Req() req: any,
  ) {
    return this.ckdSkdService.createCustomsClearance(body, req?.user?.userId || 1);
  }

  @RequirePermissions('SHIPMENT_MANAGE')
  @Post('clearances/:id/approve')
  @ApiOperation({ summary: 'Approve customs clearance and release quantities for production transfer' })
  approveCustomsClearance(@Param('id') id: string, @Req() req: any) {
    return this.ckdSkdService.approveCustomsClearance(id, req?.user?.userId || 1);
  }

  @RequirePermissions('SHIPMENT_MANAGE')
  @Patch('clearances/:id/status')
  @ApiOperation({ summary: 'Update clearance status (SUBMITTED, ON_HOLD, REJECTED, CANCELLED)' })
  updateClearanceStatus(
    @Param('id') id: string,
    @Body()
    body: {
      status:
        | CustomsClearanceStatus.SUBMITTED
        | CustomsClearanceStatus.ON_HOLD
        | CustomsClearanceStatus.REJECTED
        | CustomsClearanceStatus.CANCELLED;
      remarks?: string;
    },
    @Req() req: any,
  ) {
    return this.ckdSkdService.updateClearanceStatus(id, body.status, body.remarks || '', req?.user?.userId || 1);
  }

  @RequirePermissions('SHIPMENT_MANAGE')
  @Post('clearance-lines/:lineId/reverse')
  @ApiOperation({ summary: 'Reverse an approved customs clearance line with mandatory reason' })
  reverseClearanceLine(
    @Param('lineId') lineId: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    return this.ckdSkdService.reverseClearanceLine(lineId, reason, req?.user?.userId || 1);
  }

  // Story 6: Transfer Customs-Released Stock to Production Warehouse
  @RequirePermissions('INVENTORY_TRANSFER')
  @Post('transfer-to-production')
  @ApiOperation({ summary: 'Transfer customs-released CKD/SKD stock into Production Warehouse' })
  transferClearedToProduction(
    @Body()
    body: {
      batchReceiptId: string;
      toWarehouseId: number;
      quantity: number;
      idempotencyKey?: string;
    },
    @Req() req: any,
  ) {
    return this.ckdSkdService.transferClearedToProduction(body, req?.user?.userId || 1);
  }

  // Story 7: VIN & Component Serials
  @RequirePermissions('INVENTORY_VIEW')
  @Get('serials')
  @ApiOperation({ summary: 'Get component serial numbers (VIN, MOTOR, ENGINE, BATTERY, CONTROLLER)' })
  getSerials(
    @Query('batchId') batchId?: string,
    @Query('serialType') serialType?: SerialType,
    @Query('status') status?: SerialStatus,
  ) {
    return this.ckdSkdService.getSerials({ batchId, serialType, status });
  }

  @RequirePermissions('SHIPMENT_MANAGE')
  @Post('serials')
  @ApiOperation({ summary: 'Register one or multiple VIN/component serial numbers for a CKD/SKD batch' })
  registerSerials(
    @Body()
    body: {
      batchId: string;
      batchReceiptId?: string;
      itemId?: string;
      warehouseId?: number;
      sourceType?: SerialSourceType;
      sourceReference?: string;
      serials: Array<{ serialType: SerialType; serialNumber: string }>;
    },
    @Req() req: any,
  ) {
    return this.ckdSkdService.registerSerials(body, req?.user?.userId || 1);
  }

  @RequirePermissions('INVENTORY_MANAGE')
  @Patch('serials/:id/status')
  @ApiOperation({ summary: 'Update component serial lifecycle status' })
  updateSerialStatus(
    @Param('id') id: string,
    @Body('status') status: SerialStatus,
    @Req() req: any,
  ) {
    return this.ckdSkdService.updateSerialStatus(id, status, req?.user?.userId || 1);
  }

  // Story 8: BOM & Component Master Integration
  @RequirePermissions('INVENTORY_VIEW')
  @Get('boms')
  @ApiOperation({ summary: 'List all vehicle BOM definitions' })
  getBoms() {
    return this.ckdSkdService.getBoms();
  }

  @RequirePermissions('INVENTORY_VIEW')
  @Get('boms/product/:itemId')
  @ApiOperation({ summary: 'Get active BOM for a vehicle product' })
  getBomByProduct(@Param('itemId') itemId: string) {
    return this.ckdSkdService.getBomByProduct(itemId);
  }

  @RequirePermissions('INVENTORY_MANAGE')
  @Post('boms')
  @ApiOperation({ summary: 'Create a vehicle BOM definition' })
  createBom(
    @Body()
    body: {
      bomCode?: string;
      itemId: string;
      version?: string;
      notes?: string;
      lines: Array<{
        componentItemId: string;
        requiredQuantity: number;
        uomId?: number;
        isSerialized?: boolean;
        serialType?: string;
      }>;
    },
    @Req() req: any,
  ) {
    return this.ckdSkdService.createBom(body, req?.user?.userId || 1);
  }

  // Story 9: Production Material Eligibility Validation
  @RequirePermissions('INVENTORY_VIEW')
  @Get('eligibility')
  @ApiOperation({ summary: 'Validate production material eligibility (excludes bonded/uncleared stock)' })
  validateProductionEligibility(
    @Query('itemId') itemId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('requestedQuantity') requestedQuantity?: string,
  ) {
    return this.ckdSkdService.validateProductionEligibility({
      itemId,
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
      requestedQuantity: requestedQuantity ? Number(requestedQuantity) : undefined,
    });
  }

  // Story 10: Integration Event Outbox
  @RequirePermissions('INVENTORY_VIEW')
  @Get('events')
  @ApiOperation({ summary: 'List import-to-production integration events' })
  getIntegrationEvents() {
    return this.ckdSkdService.getIntegrationEvents();
  }
}
