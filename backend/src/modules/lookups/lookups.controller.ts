import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LookupsService } from './lookups.service';

@ApiTags('Lookups')
@Controller('lookups')
export class LookupsController {
  constructor(private readonly lookupsService: LookupsService) {}

  @Get('regions')
  @ApiOperation({ summary: 'Get list of Ethiopian regions' })
  getRegions() {
    return this.lookupsService.getRegions();
  }

  @Get('warehouses')
  @ApiOperation({ summary: 'Get list of active warehouses' })
  getWarehouses() {
    return this.lookupsService.getWarehouses();
  }

  @Post('warehouses')
  @ApiOperation({ summary: 'Add a new warehouse' })
  createWarehouse(@Body() body: { name: string; location?: string }) {
    return this.lookupsService.createWarehouse(body.name, body.location);
  }
}
