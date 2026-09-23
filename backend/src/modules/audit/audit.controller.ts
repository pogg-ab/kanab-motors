import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';

@ApiTags('Audit Logs')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List recent immutable system audit trail logs' })
  @ApiQuery({ name: 'entityType', required: false, description: 'Filter by entity type (e.g. vehicle_unit, product_item, customer)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of records to return' })
  findAll(
    @Query('entityType') entityType?: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.findAll({ entityType, limit: limit ? Number(limit) : 100 });
  }
}
