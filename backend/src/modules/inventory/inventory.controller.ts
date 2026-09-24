import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { CreateProductionReceiptDto } from './dto/create-production-receipt.dto';
import { VehicleStatus } from '../vehicles/entities/vehicle-unit.entity';

@ApiTags('Inventory and Warehouse Management (KMSICAMS-4)')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // =========================================================================
  // 1. WAREHOUSES & SCOPED ACCESS (W1 - W3)
  // =========================================================================
  @Get('warehouses')
  @ApiOperation({ summary: 'List warehouses with capacity & manager info' })
  getWarehouses() {
    return this.inventoryService.getWarehouses();
  }

  @Patch('warehouses/:id')
  @ApiOperation({ summary: 'Update warehouse details' })
  updateWarehouse(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.inventoryService.updateWarehouse(id, body);
  }

  @Get('warehouses/user-access/:userId')
  @ApiOperation({ summary: 'Get warehouse IDs accessible by a user' })
  getUserWarehouseAccess(@Param('userId', ParseIntPipe) userId: number) {
    return this.inventoryService.getUserWarehouseAccess(userId);
  }

  @Post('warehouses/user-access/:userId')
  @ApiOperation({ summary: 'Configure warehouse IDs accessible by a user' })
  setUserWarehouseAccess(
    @Param('userId', ParseIntPipe) userId: number,
    @Body('warehouseIds') warehouseIds: number[],
  ) {
    return this.inventoryService.setUserWarehouseAccess(userId, warehouseIds || []);
  }

  // =========================================================================
  // 2. VEHICLE STATUS STATE MACHINE (V1 - V4)
  // =========================================================================
  @Get('transitions/rules')
  @ApiOperation({ summary: 'List valid vehicle status transition rules' })
  getTransitionRules() {
    return this.inventoryService.getTransitionRules();
  }

  @Post('vehicles/:id/transition')
  @ApiOperation({ summary: 'Execute an atomic vehicle status transition' })
  transitionVehicleStatus(
    @Param('id') vehicleUnitId: string,
    @Body('toStatus') toStatus: VehicleStatus,
    @Body('notes') notes?: string,
    @Body('module') module?: string,
  ) {
    return this.inventoryService.transitionVehicleStatus(
      vehicleUnitId,
      toStatus,
      1, // default system/test user
      module || 'MANUAL',
      notes,
    );
  }

  @Get('vehicles/:id/history')
  @ApiOperation({ summary: 'Get vehicle status transition audit history' })
  getVehicleStatusHistory(@Param('id') vehicleUnitId: string) {
    return this.inventoryService.getVehicleStatusHistory(vehicleUnitId);
  }

  // =========================================================================
  // 3. STOCK BALANCES & LOW STOCK ALERTS (G1 - G3)
  // =========================================================================
  @Get('balances')
  @ApiOperation({ summary: 'Get stock balances with optional warehouse or item filters' })
  getStockBalances(
    @Query('warehouseId') warehouseId?: string,
    @Query('itemId') itemId?: string,
  ) {
    return this.inventoryService.getStockBalances(
      warehouseId ? parseInt(warehouseId, 10) : undefined,
      itemId,
    );
  }

  @Get('balances/low-stock-alerts')
  @ApiOperation({ summary: 'List products at or below their reorder level' })
  getLowStockAlerts() {
    return this.inventoryService.getLowStockAlerts();
  }

  // =========================================================================
  // 4. STOCK TRANSFERS (T1 - T5)
  // =========================================================================
  @Post('transfers')
  @ApiOperation({ summary: 'Create inter-warehouse stock transfer request' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createStockTransfer(@Body() dto: CreateStockTransferDto) {
    return this.inventoryService.createStockTransfer(dto);
  }

  @Get('transfers')
  @ApiOperation({ summary: 'List all stock transfer requests' })
  getStockTransfers() {
    return this.inventoryService.getStockTransfers();
  }

  @Get('transfers/:id')
  @ApiOperation({ summary: 'Get transfer request details with lines' })
  getStockTransferById(@Param('id') id: string) {
    return this.inventoryService.getStockTransferById(id);
  }

  @Patch('transfers/:id/approve')
  @ApiOperation({ summary: 'Approve inter-warehouse transfer request' })
  approveStockTransfer(@Param('id') id: string) {
    return this.inventoryService.approveStockTransfer(id);
  }

  @Patch('transfers/:id/complete')
  @ApiOperation({ summary: 'Complete inter-warehouse transfer and execute inventory adjustments' })
  completeStockTransfer(@Param('id') id: string) {
    return this.inventoryService.completeStockTransfer(id);
  }

  // =========================================================================
  // 5. STOCK ADJUSTMENTS (J1 - J5)
  // =========================================================================
  @Post('adjustments')
  @ApiOperation({ summary: 'Create a stock adjustment request with mandatory reason' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createStockAdjustment(@Body() dto: CreateStockAdjustmentDto) {
    return this.inventoryService.createStockAdjustment(dto);
  }

  @Get('adjustments')
  @ApiOperation({ summary: 'List all stock adjustments' })
  getStockAdjustments() {
    return this.inventoryService.getStockAdjustments();
  }

  @Get('adjustments/:id')
  @ApiOperation({ summary: 'Get single stock adjustment details' })
  getStockAdjustmentById(@Param('id') id: string) {
    return this.inventoryService.getStockAdjustmentById(id);
  }

  @Patch('adjustments/:id/approve')
  @ApiOperation({ summary: 'Approve stock adjustment and update balances' })
  approveStockAdjustment(@Param('id') id: string) {
    return this.inventoryService.approveStockAdjustment(id);
  }

  // =========================================================================
  // 6. PRODUCTION VEHICLE INTAKE (P1 - P3)
  // =========================================================================
  @Post('production-receipts')
  @ApiOperation({ summary: 'Record local vehicle assembly intake into inventory' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createProductionReceipt(@Body() dto: CreateProductionReceiptDto) {
    return this.inventoryService.createProductionReceipt(dto);
  }

  @Get('production-receipts')
  @ApiOperation({ summary: 'List local production receipts' })
  getProductionReceipts() {
    return this.inventoryService.getProductionReceipts();
  }

  // =========================================================================
  // 7. STOCK MOVEMENT HISTORY & REPORTS (H1, RP1 - RP3)
  // =========================================================================
  @Get('movements')
  @ApiOperation({ summary: 'Unified double-entry stock movement history' })
  getMovementHistory(
    @Query('warehouseId') warehouseId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getMovementHistory({
      warehouseId: warehouseId ? parseInt(warehouseId, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : 100,
    });
  }

  @Get('reports/stock')
  @ApiOperation({ summary: 'Current stock balance aggregate report' })
  getCurrentStockReport() {
    return this.inventoryService.getCurrentStockReport();
  }

  @Get('reports/vehicles-by-status')
  @ApiOperation({ summary: 'Vehicle inventory breakdown by status' })
  getVehicleInventoryByStatusReport() {
    return this.inventoryService.getVehicleInventoryByStatusReport();
  }
}
