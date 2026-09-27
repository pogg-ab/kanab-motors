import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Document & Attachment Management (KMSICAMS-6)')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @RequirePermissions('CUSTOMERS_DOCS_UPLOAD', 'SHIPMENTS_DOCS_UPLOAD')
  @Get('types')
  @ApiOperation({ summary: 'Get formalized document type reference data (Story DA1)' })
  getDocumentTypes(@Query('entityType') entityType?: string) {
    return this.documentsService.getDocumentTypes(entityType);
  }

  @RequirePermissions('CUSTOMERS_DOCS_UPLOAD', 'SHIPMENTS_DOCS_UPLOAD')
  @Get()
  @ApiOperation({ summary: 'Unified Document Center: browse documents across all entity types (Story DA4)' })
  getAllDocuments(
    @Query('entityType') entityType?: string,
    @Query('documentTypeCode') documentTypeCode?: string,
    @Query('search') search?: string,
  ) {
    return this.documentsService.getAllDocuments({ entityType, documentTypeCode, search });
  }
}
