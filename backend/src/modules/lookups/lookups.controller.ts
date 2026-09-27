import { Controller, Get, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LookupsService } from './lookups.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Lookups')
@Controller('lookups')
export class LookupsController {
  constructor(private readonly lookupsService: LookupsService) {}

  @RequirePermissions('CUSTOMERS_VIEW', 'REPORTS_VIEW')
  @Get('regions')
  @ApiOperation({ summary: 'Get list of Ethiopian regions' })
  getRegions() {
    return this.lookupsService.getRegions();
  }

  @RequirePermissions('WAREHOUSES_MANAGE', 'VEHICLES_VIEW')
  @Get('warehouses')
  @ApiOperation({ summary: 'Get list of active warehouses' })
  getWarehouses() {
    return this.lookupsService.getWarehouses();
  }

  @RequirePermissions('WAREHOUSES_MANAGE')
  @Post('warehouses')
  @ApiOperation({ summary: 'Add a new warehouse' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createWarehouse(@Body() dto: CreateWarehouseDto) {
    return this.lookupsService.createWarehouse(dto.name, dto.location);
  }
}

