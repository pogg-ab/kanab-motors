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
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleUnitDto } from './dto/create-vehicle-unit.dto';
import { UpdateVehicleUnitDto } from './dto/update-vehicle-unit.dto';
import { BulkImportVehicleDto } from './dto/bulk-import-vehicle.dto';
import { VehicleQueryDto } from './dto/vehicle-query.dto';
import { PositiveBigIntIdPipe } from '../../common/pipes/positive-bigint-id.pipe';
import { UpdateVehicleStatusDto } from './dto/update-vehicle-status.dto';
import { RecordCustomerCustodyDto } from './dto/record-customer-custody.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Vehicle Units & Chassis Tracking (Module 2 & KMSICAMS-14)')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @RequirePermissions('VEHICLES_CREATE')
  @Post()
  @ApiOperation({ summary: 'Register a single Vehicle Unit (Chassis & Engine)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreateVehicleUnitDto) {
    return this.vehiclesService.create(dto);
  }

  @RequirePermissions('VEHICLES_VIEW')
  @Get()
  @ApiOperation({ summary: 'List and filter vehicle units by chassis, status, warehouse, custody' })
  findAll(@Query() query: VehicleQueryDto & { ownershipStatus?: string }) {
    return this.vehiclesService.findAll(query as any);
  }

  @RequirePermissions('VEHICLES_VIEW')
  @Get(':id')
  @ApiOperation({ summary: 'Get single vehicle unit details' })
  findOne(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.vehiclesService.findOne(id);
  }

  @RequirePermissions('VEHICLES_CREATE', 'VEHICLES_STATUS_UPDATE')
  @Put(':id')
  @ApiOperation({ summary: 'Update vehicle unit details (chassis, engine, warehouse, info)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: UpdateVehicleUnitDto,
  ) {
    return this.vehiclesService.update(id, dto);
  }

  @RequirePermissions('VEHICLES_STATUS_UPDATE')
  @Patch(':id/status')
  @ApiOperation({ summary: 'Admin manual status override or warehouse move' })
  updateStatus(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() body: UpdateVehicleStatusDto,
  ) {
    return this.vehiclesService.updateStatus(id, body.status, body.warehouseId);
  }

  @RequirePermissions('VEHICLES_STATUS_UPDATE')
  @Post(':id/custody')
  @ApiOperation({ summary: 'Record customer-owned vehicle retained in company stock (KMSI-14-06)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  recordCustody(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() dto: RecordCustomerCustodyDto,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId ? Number(req.user.userId) : 1;
    return this.vehiclesService.recordCustomerCustody(id, dto, userId);
  }

  @RequirePermissions('VEHICLES_STATUS_UPDATE')
  @Post(':id/release-custody')
  @ApiOperation({ summary: 'Complete physical handover of customer-retained vehicle (KMSI-14-06)' })
  releaseCustody(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId ? Number(req.user.userId) : 1;
    return this.vehiclesService.completeCustomerHandover(id, userId);
  }

  @RequirePermissions('VEHICLES_BULK_IMPORT')
  @Post('bulk-import')
  @ApiOperation({ summary: 'Bulk import vehicle units via batch list (CSV payload)' })
  bulkImport(@Body() dto: BulkImportVehicleDto) {
    return this.vehiclesService.bulkImport(dto);
  }
}
