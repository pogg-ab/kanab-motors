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
  ForbiddenException,
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

  private assertImportAccess(req:any, entityType:string, write=false) {
    const permissions=new Set<string>(req.user?.permissions||[]);
    if(req.user?.roleName==='ADMIN'||permissions.has('ALL_PERMISSIONS')) return;
    const importPermission=['shipment_freight_quotation','shipment_insurance','shipment_container','shipment_cargo_tracking'].includes(entityType)?'SHIPMENTS_DOCS_UPLOAD':entityType==='po_payment_transaction'?(write?'PAYMENTS_RECORD':'PAYMENTS_VIEW'):['purchase_order','import_compliance'].includes(entityType)?(write?'PURCHASE_ORDERS_EDIT':'PURCHASE_ORDERS_VIEW'):null;
    if(importPermission && !permissions.has(importPermission)) throw new ForbiddenException(`Missing required permission: ${importPermission}`);
    if(!importPermission && !['CUSTOMERS_DOCS_UPLOAD','SHIPMENTS_DOCS_UPLOAD','PAYMENTS_RECORD','REFUNDS_CREATE','REFUNDS_REVIEW','SPARE_PARTS_SALES_RECORD'].some(p=>permissions.has(p))) throw new ForbiddenException('Document permission required for this entity');
  }

  @RequirePermissions('PURCHASE_ORDERS_EDIT', 'PAYMENTS_RECORD', 'CUSTOMERS_DOCS_UPLOAD', 'SHIPMENTS_DOCS_UPLOAD')
  @Get('types')
  @ApiOperation({ summary: 'Get formalized document type reference data (Story DA1)' })
  getDocumentTypes(@Query('entityType') entityType?: string) {
    return this.documentsService.getDocumentTypes(entityType);
  }

  @RequirePermissions('PURCHASE_ORDERS_EDIT', 'PAYMENTS_RECORD', 'CUSTOMERS_DOCS_UPLOAD', 'SHIPMENTS_DOCS_UPLOAD', 'REFUNDS_CREATE', 'REFUNDS_REVIEW', 'SPARE_PARTS_SALES_RECORD')
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
  @RequirePermissions('PURCHASE_ORDERS_VIEW', 'PAYMENTS_VIEW', 'PURCHASE_ORDERS_EDIT', 'PAYMENTS_RECORD', 'CUSTOMERS_DOCS_UPLOAD', 'SHIPMENTS_DOCS_UPLOAD', 'REFUNDS_CREATE', 'REFUNDS_REVIEW', 'SPARE_PARTS_SALES_RECORD')
  @ApiOperation({ summary: 'Get attachments for specific entity (Booking, Payment/BRV, Refund, Spare Parts POS)' })
  getDocumentsForEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Req() req:any,
  ) {
    this.assertImportAccess(req,entityType);
    return this.documentsService.getAttachmentsForEntity(entityType, entityId);
  }

  @Get('entity/:entityType/:entityId')
  @RequirePermissions('PURCHASE_ORDERS_VIEW', 'PAYMENTS_VIEW', 'PURCHASE_ORDERS_EDIT', 'PAYMENTS_RECORD', 'CUSTOMERS_DOCS_UPLOAD', 'SHIPMENTS_DOCS_UPLOAD', 'REFUNDS_CREATE', 'REFUNDS_REVIEW', 'SPARE_PARTS_SALES_RECORD')
  @ApiOperation({ summary: 'Get attachments for specific entity (alias)' })
  getDocumentsForEntityAlias(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Req() req:any,
  ) {
    this.assertImportAccess(req,entityType);
    return this.documentsService.getAttachmentsForEntity(entityType, entityId);
  }

  @Post(':entityType/:entityId/upload')
  @RequirePermissions('PURCHASE_ORDERS_EDIT', 'PAYMENTS_RECORD', 'CUSTOMERS_DOCS_UPLOAD', 'SHIPMENTS_DOCS_UPLOAD', 'REFUNDS_CREATE', 'REFUNDS_REVIEW', 'SPARE_PARTS_SALES_RECORD')
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
    this.assertImportAccess(req,entityType,true);
    if (!file) {
      throw new BadRequestException('A document file is required');
    }
    const userId = req?.user?.userId ? Number(req.user.userId) : 1;
    return this.documentsService.createAttachment(entityType, entityId, file, docType, userId);
  }

  @Post('entity/:entityType/:entityId')
  @RequirePermissions('PURCHASE_ORDERS_EDIT', 'PAYMENTS_RECORD', 'CUSTOMERS_DOCS_UPLOAD', 'SHIPMENTS_DOCS_UPLOAD', 'REFUNDS_CREATE', 'REFUNDS_REVIEW', 'SPARE_PARTS_SALES_RECORD')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload optional attachment alias' })
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
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  uploadDocumentAlias(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('documentType') docType?: string,
    @Req() req?: any,
  ) {
    this.assertImportAccess(req,entityType,true);
    if (!file) {
      throw new BadRequestException('A document file is required');
    }
    const userId = req?.user?.userId ? Number(req.user.userId) : 1;
    return this.documentsService.createAttachment(entityType, entityId, file, docType, userId);
  }

  @Delete(':attachmentId')
  @RequirePermissions('PURCHASE_ORDERS_EDIT', 'PAYMENTS_RECORD', 'CUSTOMERS_DOCS_UPLOAD', 'SHIPMENTS_DOCS_UPLOAD', 'REFUNDS_CREATE', 'REFUNDS_REVIEW', 'SPARE_PARTS_SALES_RECORD')
  @ApiOperation({ summary: 'Delete attachment' })
  async deleteDocument(@Param('attachmentId') attachmentId: string, @Req() req:any) {
    const attachment=await this.documentsService.getAttachment(attachmentId);
    this.assertImportAccess(req,attachment.entityType,true);
    return this.documentsService.deleteAttachment(attachmentId);
  }

  @Post('draft/:draftId/claim/:entityType/:entityId')
  @RequirePermissions('PURCHASE_ORDERS_EDIT', 'PAYMENTS_RECORD', 'CUSTOMERS_DOCS_UPLOAD', 'SHIPMENTS_DOCS_UPLOAD')
  @ApiOperation({ summary: 'Attach pre-submission draft files to the newly created record' })
  claimDraft(
    @Param('draftId') draftId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Req() req:any,
  ) {
    this.assertImportAccess(req,entityType,true);
    return this.documentsService.claimDraftAttachments(draftId, entityType, entityId);
  }
}
