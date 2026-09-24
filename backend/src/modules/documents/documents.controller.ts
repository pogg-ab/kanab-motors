import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';

@ApiTags('Document & Attachment Management (KMSICAMS-6)')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('types')
  @ApiOperation({ summary: 'Get formalized document type reference data (Story DA1)' })
  getDocumentTypes(@Query('entityType') entityType?: string) {
    return this.documentsService.getDocumentTypes(entityType);
  }

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
