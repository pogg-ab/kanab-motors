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
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  ShipmentsService,
  CreateShipmentDto,
  AddCostComponentDto,
  ReceiveShipmentLineDto,
} from './services/shipments.service';
import { LandedCostAllocationService } from './services/landed-cost-allocation.service';
import { ShipmentStage, AllocationMethod } from './entities/shipment.entity';

@ApiTags('Shipments & Landed Cost')
@Controller('shipments')
export class ShipmentsController {
  constructor(
    private readonly shipmentsService: ShipmentsService,
    private readonly landedCostService: LandedCostAllocationService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create new import shipment consolidating PO lines (Story S1/S2)' })
  create(@Body() dto: CreateShipmentDto) {
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

  @Get('reports/pipeline')
  @ApiOperation({ summary: 'Shipment Status & Pipeline Report (Story RP1)' })
  getPipelineReport() {
    return this.shipmentsService.getPipelineReport();
  }

  @Get('lookups/cost-component-types')
  @ApiOperation({ summary: 'Get cost component types reference data (Story F2)' })
  getCostTypes() {
    return this.shipmentsService.getCostComponentTypes();
  }

  @Get('lookups/exchange-rates')
  @ApiOperation({ summary: 'Get default currency exchange rates (Story F3)' })
  getExchangeRates() {
    return this.shipmentsService.getExchangeRates();
  }

  @Put('lookups/exchange-rates/:currency')
  @ApiOperation({ summary: 'Update default exchange rate to ETB' })
  updateExchangeRate(
    @Param('currency') currency: 'ETB' | 'USD' | 'EUR',
    @Body('rateToEtb') rateToEtb: number,
  ) {
    return this.shipmentsService.updateExchangeRate(currency, rateToEtb);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shipment full details, lines, stages, and costs' })
  findOne(@Param('id') id: string) {
    return this.shipmentsService.findOne(id);
  }

  @Patch(':id/stage')
  @ApiOperation({
    summary: 'Advance shipment stage with Document Completeness validation (Story S3/D2)',
  })
  updateStage(
    @Param('id') id: string,
    @Body('stage') stage: ShipmentStage,
    @Body('notes') notes?: string,
    @Body('userId') userId?: number,
  ) {
    return this.shipmentsService.updateStage(id, stage, notes, userId);
  }

  @Post(':id/costs')
  @ApiOperation({ summary: 'Add multi-currency cost component to shipment (Story C1-C3)' })
  addCostComponent(
    @Param('id') id: string,
    @Body() dto: AddCostComponentDto,
  ) {
    return this.shipmentsService.addCostComponent(id, dto);
  }

  @Delete(':id/costs/:costId')
  @ApiOperation({ summary: 'Remove cost component from shipment' })
  removeCostComponent(@Param('costId') costId: string) {
    return this.shipmentsService.removeCostComponent(costId);
  }

  @Post(':id/allocate-landed-cost')
  @ApiOperation({
    summary: 'Execute Landed Cost Allocation Engine with Zero Rounding Drift (Story A1-A4)',
  })
  allocateLandedCost(
    @Param('id') id: string,
    @Body('allocationMethod') allocationMethod?: AllocationMethod,
    @Body('userId') userId?: number,
  ) {
    return this.landedCostService.calculateAndPersistAllocation(
      id,
      allocationMethod,
      userId,
    );
  }

  @Get(':id/landed-cost-report')
  @ApiOperation({ summary: 'Get Landed Cost Breakdown Report for shipment (Story A5)' })
  getLandedCostReport(@Param('id') id: string) {
    return this.landedCostService.getLandedCostReport(id);
  }

  @Post(':id/receive')
  @ApiOperation({
    summary: 'Receive shipment line into inventory and generate vehicle units (Story R1-R3)',
  })
  receiveLine(
    @Param('id') id: string,
    @Body() dto: ReceiveShipmentLineDto,
  ) {
    return this.shipmentsService.receiveLine(id, dto);
  }
}
