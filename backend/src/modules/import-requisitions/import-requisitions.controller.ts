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
  UseGuards,
  ValidationPipe,
  Req,
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
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';

@ApiTags('Import Requisition Management (KMSICAMS-12 Phase 1)')
@Controller('import-requisitions')
@UseGuards(PermissionGuard)
export class ImportRequisitionsController {
  constructor(private readonly reqService: ImportRequisitionsService) {}

  private getEffectiveUserId(req: any, fallbackId?: number): number {
    return req?.user?.userId || fallbackId || 1;
  }

  @Get()
  @RequirePermissions('PURCHASE_ORDERS_VIEW', 'IMPORT_REQUISITIONS_VIEW')
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
  @RequirePermissions('PURCHASE_ORDERS_VIEW', 'IMPORT_REQUISITIONS_VIEW')
  @ApiOperation({ summary: 'Story IMP-04: Review available stock, open POs, and open requisitions for product' })
  getStockReview(@Param('itemId', PositiveBigIntIdPipe) itemId: string, @Query() planning: any) {
    return this.reqService.getStockAndOrderReview(itemId,planning);
  }

  @Get(':id')
  @RequirePermissions('PURCHASE_ORDERS_VIEW', 'IMPORT_REQUISITIONS_VIEW')
  @ApiOperation({ summary: 'Get single requisition details with line items' })
  findOne(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.reqService.findOne(id);
  }

  @Post()
  @RequirePermissions('PURCHASE_ORDERS_CREATE', 'IMPORT_REQUISITIONS_CREATE')
  @ApiOperation({ summary: 'Create new import requisition (Story IMP-01, IMP-02)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreateImportRequisitionDto, @Req() req: any) {
    const userId = this.getEffectiveUserId(req, dto.userId);
    return this.reqService.create(dto, userId);
  }

  @Put(':id')
  @RequirePermissions('PURCHASE_ORDERS_EDIT', 'IMPORT_REQUISITIONS_EDIT')
  @ApiOperation({ summary: 'Update existing requisition in DRAFT or REJECTED status' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(@Param('id', PositiveBigIntIdPipe) id: string, @Body() dto: UpdateImportRequisitionDto, @Req() req: any) {
    const userId = this.getEffectiveUserId(req, dto.userId);
    return this.reqService.update(id, dto, userId);
  }

  @Patch(':id/submit')
  @RequirePermissions('PURCHASE_ORDERS_EDIT', 'IMPORT_REQUISITIONS_EDIT')
  @ApiOperation({ summary: 'Submit draft requisition for management approval (Story IMP-03)' })
  submit(@Param('id', PositiveBigIntIdPipe) id: string, @Body('userId') userId: number | undefined, @Req() req: any) {
    const effectiveUserId = this.getEffectiveUserId(req, userId);
    return this.reqService.submit(id, effectiveUserId);
  }

  @Patch(':id/approve')
  @RequirePermissions('PURCHASE_ORDERS_CONFIRM', 'IMPORT_REQUISITIONS_APPROVE')
  @ApiOperation({ summary: 'Approve submitted requisition (Story IMP-03)' })
  approve(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body('approvalNotes') approvalNotes: string | undefined,
    @Body('userId') userId: number | undefined,
    @Req() req: any,
  ) {
    const effectiveUserId = this.getEffectiveUserId(req, userId);
    return this.reqService.approve(id, approvalNotes, effectiveUserId);
  }

  @Patch(':id/reject')
  @RequirePermissions('PURCHASE_ORDERS_CONFIRM', 'IMPORT_REQUISITIONS_APPROVE')
  @ApiOperation({ summary: 'Reject submitted requisition with mandatory reason' })
  reject(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body('reason') reason: string,
    @Body('userId') userId: number | undefined,
    @Req() req: any,
  ) {
    const effectiveUserId = this.getEffectiveUserId(req, userId);
    return this.reqService.reject(id, reason, effectiveUserId);
  }

  @Patch(':id/cancel')
  @RequirePermissions('PURCHASE_ORDERS_EDIT', 'IMPORT_REQUISITIONS_EDIT')
  @ApiOperation({ summary: 'Cancel requisition' })
  cancel(@Param('id', PositiveBigIntIdPipe) id: string, @Body('userId') userId: number | undefined, @Req() req: any) {
    const effectiveUserId = this.getEffectiveUserId(req, userId);
    return this.reqService.cancel(id, effectiveUserId);
  }

  @Post(':id/convert-to-po')
  @RequirePermissions('PURCHASE_ORDERS_CREATE', 'PURCHASE_ORDERS_CONFIRM', 'IMPORT_REQUISITIONS_APPROVE')
  @ApiOperation({ summary: 'Story IMP-06: Convert approved requisition into a Purchase Order' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  convertToPO(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: ConvertRequisitionToPODto,
    @Body('userId') userId: number | undefined,
    @Req() req: any,
  ) {
    const effectiveUserId = this.getEffectiveUserId(req, userId || dto.userId);
    return this.reqService.convertToPO(id, dto, effectiveUserId);
  }
}
