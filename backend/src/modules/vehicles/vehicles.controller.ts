import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleUnitDto } from './dto/create-vehicle-unit.dto';
import { BulkImportVehicleDto } from './dto/bulk-import-vehicle.dto';
import { VehicleQueryDto } from './dto/vehicle-query.dto';
import { VehicleStatus } from './entities/vehicle-unit.entity';

@ApiTags('Vehicle Units & Chassis Tracking (Module 2)')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @ApiOperation({ summary: 'Register a single Vehicle Unit (Chassis & Engine)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreateVehicleUnitDto) {
    return this.vehiclesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List and filter vehicle units by chassis, status, warehouse' })
  findAll(@Query() query: VehicleQueryDto) {
    return this.vehiclesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single vehicle unit details' })
  findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Admin manual status override or warehouse move' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: VehicleStatus; warehouseId?: number },
  ) {
    return this.vehiclesService.updateStatus(id, body.status, body.warehouseId);
  }

  @Post('bulk-import')
  @ApiOperation({ summary: 'Bulk import vehicle units via batch list (CSV payload)' })
  bulkImport(@Body() dto: BulkImportVehicleDto) {
    return this.vehiclesService.bulkImport(dto);
  }
}
