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
  UsePipes,
  ValidationPipe,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SparePartsService } from './spare-parts.service';
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { UpdateSparePartDto } from './dto/update-spare-part.dto';
import { CreateSparePartsSaleDto } from './dto/create-spare-parts-sale.dto';
import { SparePartsQueryDto } from './dto/spare-parts-query.dto';
import { PositiveBigIntIdPipe } from '../../common/pipes/positive-bigint-id.pipe';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Spare Parts Sales & Inventory (KMSICAMS-10)')
@Controller('spare-parts')
export class SparePartsController {
  constructor(private readonly sparePartsService: SparePartsService) {}

  @RequirePermissions('PRODUCTS_CREATE')
  @Post()
  @ApiOperation({ summary: 'Register a new Spare Part' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreateSparePartDto, @Request() req: any) {
    const userId = req.user?.userId || 1;
    return this.sparePartsService.createSparePart(dto, userId);
  }

  @RequirePermissions('PRODUCTS_VIEW')
  @Get()
  @ApiOperation({ summary: 'List and filter spare parts catalog' })
  @UsePipes(new ValidationPipe({ transform: true }))
  findAll(@Query() query: SparePartsQueryDto) {
    return this.sparePartsService.getSpareParts(query);
  }

  @RequirePermissions('WAREHOUSES_MANAGE', 'PRODUCTS_VIEW')
  @Get('stock')
  @ApiOperation({ summary: 'Get spare parts stock balances by warehouse with low-stock alerts' })
  getStock(
    @Query('warehouseId') warehouseId?: number,
    @Query('lowStockOnly') lowStockOnly?: boolean,
  ) {
    return this.sparePartsService.getSparePartsStock(
      warehouseId ? Number(warehouseId) : undefined,
      lowStockOnly ? String(lowStockOnly) === 'true' : false,
    );
  }

  @RequirePermissions('SPARE_PARTS_VIEW', 'REPORTS_VIEW')
  @Get('reports/summary')
  @ApiOperation({ summary: 'Get executive spare parts sales and stock metrics' })
  getReportsSummary() {
    return this.sparePartsService.getReportsSummary();
  }

  @RequirePermissions('STOCK_RECEIPTS_CREATE', 'WAREHOUSES_MANAGE', 'SPARE_PARTS_VIEW')
  @Post('stock/receive')
  @ApiOperation({ summary: 'Receive stock intake or opening balance for a spare part' })
  receiveStock(
    @Body() body: {
      warehouseId: number;
      itemId: string;
      quantity: number;
      sourceType?: string;
      notes?: string;
    },
    @Request() req: any,
  ) {
    const userId = req.user?.userId || 1;
    return this.sparePartsService.receiveStock(body, userId);
  }

  @RequirePermissions('STOCK_TRANSFERS_CREATE', 'WAREHOUSES_MANAGE', 'SPARE_PARTS_VIEW')
  @Post('stock/transfer')
  @ApiOperation({ summary: 'Transfer spare part stock between warehouses' })
  transferStock(
    @Body() body: {
      fromWarehouseId: number;
      toWarehouseId: number;
      itemId: string;
      quantity: number;
      notes?: string;
    },
    @Request() req: any,
  ) {
    const userId = req.user?.userId || 1;
    return this.sparePartsService.transferStock(body, userId);
  }

  @RequirePermissions('SPARE_PARTS_VIEW', 'SPARE_PARTS_SALES_RECORD', 'PAYMENTS_VIEW', 'ENQUIRIES_VIEW')
  @Get('sales')
  @ApiOperation({ summary: 'List spare parts sales history and invoices' })
  getSales(
    @Query('warehouseId') warehouseId?: number,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.sparePartsService.getSparePartsSales({
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
      customerId,
      status,
      search,
      startDate,
      endDate,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @RequirePermissions('SPARE_PARTS_VIEW', 'SPARE_PARTS_SALES_RECORD', 'PAYMENTS_VIEW', 'ENQUIRIES_VIEW')
  @Get('sales/:id')
  @ApiOperation({ summary: 'Get single spare parts sale details with line items' })
  getSaleById(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.sparePartsService.getSparePartsSaleById(id);
  }

  @RequirePermissions('SPARE_PARTS_SALES_RECORD', 'PAYMENTS_RECORD', 'ENQUIRIES_CREATE')
  @Post('sales')
  @ApiOperation({ summary: 'Create and post a spare parts POS / Sales transaction' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createSale(@Body() dto: CreateSparePartsSaleDto, @Request() req: any) {
    const userId = req.user?.userId || 1;
    return this.sparePartsService.createSparePartsSale(dto, userId);
  }

  @RequirePermissions('SPARE_PARTS_SALES_CANCEL', 'PAYMENTS_REJECT', 'BOOKINGS_CANCEL')
  @Post('sales/:id/cancel')
  @ApiOperation({ summary: 'Cancel a spare parts sale and reverse warehouse stock' })
  cancelSale(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    const userId = req.user?.userId || 1;
    return this.sparePartsService.cancelSparePartsSale(id, reason || 'User cancelled', userId);
  }

  @RequirePermissions('PRODUCTS_VIEW')
  @Get(':id')
  @ApiOperation({ summary: 'Get spare part detail with model compatibility and warehouse balances' })
  findOne(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.sparePartsService.getSparePartById(id);
  }

  @RequirePermissions('PRODUCTS_EDIT')
  @Put(':id')
  @ApiOperation({ summary: 'Update spare part record' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: UpdateSparePartDto,
    @Request() req: any,
  ) {
    const userId = req.user?.userId || 1;
    return this.sparePartsService.updateSparePart(id, dto, userId);
  }

  @RequirePermissions('PRODUCTS_EDIT')
  @Patch(':id/status')
  @ApiOperation({ summary: 'Toggle spare part active/inactive status' })
  toggleStatus(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body('isActive') isActive: boolean,
    @Request() req: any,
  ) {
    const userId = req.user?.userId || 1;
    return this.sparePartsService.toggleStatus(id, isActive, userId);
  }

  @RequirePermissions('PRODUCTS_EDIT')
  @Post(':id/compatibility')
  @ApiOperation({ summary: 'Add a compatible vehicle model for a spare part' })
  addCompatibility(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    const userId = req.user?.userId || 1;
    return this.sparePartsService.addCompatibility(id, dto, userId);
  }

  @RequirePermissions('PRODUCTS_EDIT')
  @Delete('compatibility/:compatibilityId')
  @ApiOperation({ summary: 'Remove a vehicle model compatibility entry' })
  removeCompatibility(@Param('compatibilityId') compatibilityId: string) {
    return this.sparePartsService.removeCompatibility(compatibilityId);
  }
}
