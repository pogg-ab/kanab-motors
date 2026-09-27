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
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import { POStatus } from './entities/purchase-order.entity';
import { PositiveBigIntIdPipe } from '../../common/pipes/positive-bigint-id.pipe';
import { CreatePODto, UpdatePODto, UpdatePOStatusDto } from './dto/purchase-order.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';

@ApiTags('Purchase Orders')
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermissions('PURCHASE_ORDERS_CREATE')
  @ApiOperation({ summary: 'Create a new Purchase Order with line items (Story PO3)' })
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

  @Get(':id')
  @ApiOperation({ summary: 'Get Purchase Order details and lines by ID' })
  findOne(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.poService.findOne(id);
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @RequirePermissions('PURCHASE_ORDERS_EDIT')
  @ApiOperation({ summary: 'Update Purchase Order (Draft status only)' })
  update(@Param('id', PositiveBigIntIdPipe) id: string, @Body() dto: UpdatePODto) {
    return this.poService.update(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(PermissionGuard)
  @RequirePermissions('PURCHASE_ORDERS_CONFIRM', 'PURCHASE_ORDERS_CANCEL')
  @ApiOperation({ summary: 'Update Purchase Order approval status (Story PO4/PO5)' })
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
}
