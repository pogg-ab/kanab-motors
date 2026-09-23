import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import { POStatus } from './entities/purchase-order.entity';
import { PositiveBigIntIdPipe } from '../../common/pipes/positive-bigint-id.pipe';
import { CreatePODto, UpdatePODto, UpdatePOStatusDto } from './dto/purchase-order.dto';

@ApiTags('Purchase Orders')
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  @Post()
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
  @ApiOperation({ summary: 'Update Purchase Order (Draft status only)' })
  update(@Param('id', PositiveBigIntIdPipe) id: string, @Body() dto: UpdatePODto) {
    return this.poService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update Purchase Order approval status (Story PO4/PO5)' })
  updateStatus(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: UpdatePOStatusDto,
  ) {
    return this.poService.updateStatus(id, dto.status, dto.userId);
  }
}
