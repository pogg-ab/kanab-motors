import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UsePipes,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LookupsService } from './lookups.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
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

  @RequirePermissions('PRODUCTS_VIEW', 'VEHICLES_VIEW')
  @Get('colors')
  @ApiOperation({ summary: 'Get list of vehicle colors' })
  getColors() {
    return this.lookupsService.getColors();
  }

  @RequirePermissions('PRODUCTS_CATEGORIES_MANAGE')
  @Post('colors')
  @ApiOperation({ summary: 'Add a new vehicle color' })
  createColor(@Body() body: { colorName: string; hexCode?: string }) {
    return this.lookupsService.createColor(body.colorName, body.hexCode);
  }

  @RequirePermissions('PRODUCTS_CATEGORIES_MANAGE')
  @Put('colors/:id')
  @ApiOperation({ summary: 'Update a vehicle color' })
  updateColor(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { colorName: string; hexCode?: string },
  ) {
    return this.lookupsService.updateColor(id, body.colorName, body.hexCode);
  }

  @RequirePermissions('PRODUCTS_CATEGORIES_MANAGE')
  @Delete('colors/:id')
  @ApiOperation({ summary: 'Delete a vehicle color' })
  deleteColor(@Param('id', ParseIntPipe) id: number) {
    return this.lookupsService.deleteColor(id);
  }

  @RequirePermissions('PRODUCTS_VIEW', 'VEHICLES_VIEW')
  @Get('uoms')
  @ApiOperation({ summary: 'Get list of units of measure' })
  getUnits() {
    return this.lookupsService.getUnits();
  }

  @RequirePermissions('PRODUCTS_CATEGORIES_MANAGE')
  @Post('uoms')
  @ApiOperation({ summary: 'Add a new unit of measure' })
  createUnit(@Body() body: { uomName: string }) {
    return this.lookupsService.createUnit(body.uomName);
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

  @RequirePermissions('WAREHOUSES_MANAGE')
  @Put('warehouses/:id')
  @ApiOperation({ summary: 'Update warehouse details' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateWarehouse(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWarehouseDto,
  ) {
    return this.lookupsService.updateWarehouse(id, dto.name, dto.location);
  }

  @RequirePermissions('WAREHOUSES_MANAGE')
  @Delete('warehouses/:id')
  @ApiOperation({ summary: 'Delete warehouse' })
  deleteWarehouse(@Param('id', ParseIntPipe) id: number) {
    return this.lookupsService.deleteWarehouse(id);
  }
}

