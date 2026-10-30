import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { DocumentsService } from './documents.service';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

const uploadsDir = path.resolve(process.cwd(), 'uploads/documents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

@ApiTags('Document & Attachment Management (KMSICAMS-6 & KMSICAMS-14)')
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

  @Get(':entityType/:entityId')
  @ApiOperation({ summary: 'Get attachments for specific entity (Booking, Payment/BRV, Refund, Spare Parts POS)' })
  getDocumentsForEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.documentsService.getAttachmentsForEntity(entityType, entityId);
  }

  @Post(':entityType/:entityId/upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload optional attachment to an entity (KMSI-14-01 to 04)' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadsDir,
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `${req.params.entityType}-${req.params.entityId}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
    }),
  )
  uploadDocument(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('documentType') docType?: string,
    @Req() req?: any,
  ) {
    if (!file) {
      throw new BadRequestException('A document file is required');
    }
    const userId = req?.user?.userId ? Number(req.user.userId) : 1;
    return this.documentsService.createAttachment(entityType, entityId, file, docType, userId);
  }

  @Delete(':attachmentId')
  @ApiOperation({ summary: 'Delete attachment' })
  deleteDocument(@Param('attachmentId') attachmentId: string) {
    return this.documentsService.deleteAttachment(attachmentId);
  }
}
