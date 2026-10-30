import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ImportRequisitionsService } from './import-requisitions.service';
import {
  CreateImportRequisitionDto,
  UpdateImportRequisitionDto,
  ConvertRequisitionToPODto,
} from './dto/create-import-requisition.dto';
import { ImportRequisitionStatus } from './entities/import-requisition.entity';
import { PositiveBigIntIdPipe } from '../../common/pipes/positive-bigint-id.pipe';

@ApiTags('Import Requisition Management (KMSICAMS-12 Phase 1)')
@Controller('import-requisitions')
export class ImportRequisitionsController {
  constructor(private readonly reqService: ImportRequisitionsService) {}

  @Get()
  @ApiOperation({ summary: 'List and filter import requisitions' })
  findAll(
    @Query('search') search?: string,
    @Query('status') status?: ImportRequisitionStatus,
    @Query('businessUnitId') businessUnitId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reqService.findAll({
      search,
      status,
      businessUnitId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('stock-review/:itemId')
  @ApiOperation({ summary: 'Story IMP-04: Review available stock, open POs, and open requisitions for product' })
  getStockReview(@Param('itemId', PositiveBigIntIdPipe) itemId: string) {
    return this.reqService.getStockAndOrderReview(itemId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single requisition details with line items' })
  findOne(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.reqService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new import requisition (Story IMP-01, IMP-02)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreateImportRequisitionDto) {
    return this.reqService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update existing requisition in DRAFT or REJECTED status' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(@Param('id', PositiveBigIntIdPipe) id: string, @Body() dto: UpdateImportRequisitionDto) {
    return this.reqService.update(id, dto);
  }

  @Patch(':id/submit')
  @ApiOperation({ summary: 'Submit draft requisition for management approval (Story IMP-03)' })
  submit(@Param('id', PositiveBigIntIdPipe) id: string, @Body('userId') userId?: number) {
    return this.reqService.submit(id, userId);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve submitted requisition (Story IMP-03)' })
  approve(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body('approvalNotes') approvalNotes?: string,
    @Body('userId') userId?: number,
  ) {
    return this.reqService.approve(id, approvalNotes, userId);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject submitted requisition with mandatory reason' })
  reject(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body('reason') reason: string,
    @Body('userId') userId?: number,
  ) {
    return this.reqService.reject(id, reason, userId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel requisition' })
  cancel(@Param('id', PositiveBigIntIdPipe) id: string, @Body('userId') userId?: number) {
    return this.reqService.cancel(id, userId);
  }

  @Post(':id/convert-to-po')
  @ApiOperation({ summary: 'Story IMP-06: Convert approved requisition into a Purchase Order' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  convertToPO(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: ConvertRequisitionToPODto,
    @Body('userId') userId?: number,
  ) {
    return this.reqService.convertToPO(id, dto, userId);
  }
}

