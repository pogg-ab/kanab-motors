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
  BadRequestException,
  UseInterceptors,
  UploadedFile,
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

const shipmentUploadsDir = path.resolve(process.cwd(), 'uploads/documents');
if (!fs.existsSync(shipmentUploadsDir)) {
  fs.mkdirSync(shipmentUploadsDir, { recursive: true });
}

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
    @Body() dto: UpdateExchangeRateDto,
  ) {
    if (!['ETB', 'USD', 'EUR'].includes(currency)) {
      throw new BadRequestException('Currency must be ETB, USD, or EUR');
    }
    return this.shipmentsService.updateExchangeRate(currency, dto.rateToEtb);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shipment full details, lines, stages, and costs' })
  findOne(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.shipmentsService.findOne(id);
  }

  @Patch(':id/stage')
  @ApiOperation({
    summary: 'Advance shipment stage with Document Completeness validation (Story S3/D2)',
  })
  updateStage(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: UpdateShipmentStageDto,
  ) {
    return this.shipmentsService.updateStage(id, dto.stage, dto.notes, dto.userId);
  }

  @Post(':id/costs')
  @ApiOperation({ summary: 'Add multi-currency cost component to shipment (Story C1-C3)' })
  addCostComponent(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: AddCostComponentDto,
  ) {
    return this.shipmentsService.addCostComponent(id, dto);
  }

  @Delete(':id/costs/:costId')
  @ApiOperation({ summary: 'Remove cost component from shipment' })
  removeCostComponent(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Param('costId', PositiveBigIntIdPipe) costId: string,
  ) {
    return this.shipmentsService.removeCostComponent(id, costId);
  }

  @Post(':id/allocate-landed-cost')
  @ApiOperation({
    summary: 'Execute Landed Cost Allocation Engine with Zero Rounding Drift (Story A1-A4)',
  })
  allocateLandedCost(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: AllocateLandedCostDto,
  ) {
    return this.landedCostService.calculateAndPersistAllocation(
      id,
      dto.allocationMethod,
      dto.userId,
    );
  }

  @Get(':id/landed-cost-report')
  @ApiOperation({ summary: 'Get Landed Cost Breakdown Report for shipment (Story A5)' })
  getLandedCostReport(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.landedCostService.getLandedCostReport(id);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'List shipment documents' })
  getDocuments(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.shipmentsService.getDocuments(id);
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Upload shipment document' })
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
  @ApiOperation({ summary: 'Delete shipment document' })
  deleteDocument(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Param('docId', PositiveBigIntIdPipe) docId: string,
  ) {
    return this.shipmentsService.deleteDocument(id, docId);
  }

  @Post(':id/receive')
  @ApiOperation({
    summary: 'Receive shipment line into inventory and generate vehicle units (Story R1-R3)',
  })
  receiveLine(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: ReceiveShipmentLineDto,
  ) {
    return this.shipmentsService.receiveLine(id, dto);
  }
}
