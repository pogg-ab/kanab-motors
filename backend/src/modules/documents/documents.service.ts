import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DocumentType } from './entities/document-type.entity';
import { Attachment } from '../customers/entities/attachment.entity';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentType)
    private docTypeRepo: Repository<DocumentType>,
    @InjectRepository(Attachment)
    private attachmentRepo: Repository<Attachment>,
    private dataSource: DataSource,
  ) {}

  async getDocumentTypes(entityType?: string): Promise<DocumentType[]> {
    const qb = this.docTypeRepo.createQueryBuilder('dt');
    if (entityType) {
      qb.where('dt.restrictedToEntityType IS NULL OR dt.restrictedToEntityType = :et', { et: entityType });
    }
    return qb.orderBy('dt.documentTypeName', 'ASC').getMany();
  }

  async getAllDocuments(filters?: { entityType?: string; documentTypeCode?: string; search?: string }): Promise<any[]> {
    const qb = this.dataSource
      .createQueryBuilder()
      .select([
        'a.attachment_id as "attachmentId"',
        'a.entity_type as "entityType"',
        'a.entity_id as "entityId"',
        'a.file_name as "fileName"',
        'a.file_path as "filePath"',
        'a.content_type as "contentType"',
        'a.file_size_bytes as "fileSizeBytes"',
        'a.uploaded_at as "uploadedAt"',
        'a.document_type_code as "documentTypeCode"',
        'dt.document_type_name as "documentTypeName"',
        'u.full_name as "uploadedByName"',
      ])
      .from('attachment', 'a')
      .leftJoin('document_type', 'dt', 'dt.document_type_code = a.document_type_code')
      .leftJoin('app_user', 'u', 'u.user_id = a.uploaded_by')
      .orderBy('a.uploaded_at', 'DESC');

    if (filters?.entityType) {
      qb.andWhere('a.entity_type = :entityType', { entityType: filters.entityType });
    }
    if (filters?.documentTypeCode) {
      qb.andWhere('a.document_type_code = :docCode', { docCode: filters.documentTypeCode });
    }
    if (filters?.search) {
      qb.andWhere('(a.file_name ILIKE :search OR dt.document_type_name ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    return qb.getRawMany();
  }

  async validateDocumentType(documentTypeCode: string, entityType: string): Promise<boolean> {
    const docType = await this.docTypeRepo.findOne({ where: { documentTypeCode } });
    if (!docType) {
      throw new BadRequestException(`Document type '${documentTypeCode}' is invalid`);
    }
    if (docType.restrictedToEntityType && docType.restrictedToEntityType !== entityType) {
      throw new BadRequestException(
        `Document type '${documentTypeCode}' is only valid for entity type '${docType.restrictedToEntityType}', not '${entityType}'`,
      );
    }
    return true;
  }

  async getAttachmentsForEntity(entityType: string, entityId: string): Promise<Attachment[]> {
    // KMS-FB-04: Attachments uploaded to a POS sale or associated invoice are mutually accessible
    if (entityType === 'invoice' || entityType === 'pos_sale' || entityType === 'spare_parts_sale') {
      const qb = this.attachmentRepo.createQueryBuilder('a');
      qb.where('a.entityId = :entityId', { entityId });
      qb.andWhere('a.entityType IN (:...types)', { types: ['invoice', 'pos_sale', 'spare_parts_sale'] });
      qb.orderBy('a.uploadedAt', 'DESC');
      const list = await qb.getMany();
      return list.map((a) => {
        try {
          const decoded = Buffer.from(a.fileName, 'latin1').toString('utf8');
          if (decoded && !decoded.includes('\ufffd')) a.fileName = decoded;
        } catch {}
        return a;
      });
    }
    const list = await this.attachmentRepo.find({
      where: { entityType, entityId },
      order: { uploadedAt: 'DESC' },
    });
    return list.map((a) => {
      try {
        const decoded = Buffer.from(a.fileName, 'latin1').toString('utf8');
        if (decoded && !decoded.includes('\ufffd')) a.fileName = decoded;
      } catch {}
      return a;
    });
  }

  async createAttachment(
    entityType: string,
    entityId: string,
    file: { originalname: string; filename: string; mimetype?: string; size?: number },
    documentType?: string,
    userId: number = 1,
  ): Promise<Attachment> {
    let cleanFileName = file.originalname;
    try {
      const decoded = Buffer.from(file.originalname, 'latin1').toString('utf8');
      if (decoded && !decoded.includes('\ufffd')) cleanFileName = decoded;
    } catch {
      cleanFileName = file.originalname;
    }

    const attachment = this.attachmentRepo.create({
      entityType,
      entityId,
      documentType: documentType || 'SUPPORTING_DOC',
      fileName: cleanFileName,
      filePath: `/uploads/documents/${file.filename}`,
      contentType: file.mimetype || 'application/octet-stream',
      fileSizeBytes: String(file.size || 0),
      uploadedBy: userId,
    });
    return this.attachmentRepo.save(attachment);
  }

  async deleteAttachment(attachmentId: string): Promise<{ success: boolean }> {
    const att = await this.attachmentRepo.findOne({ where: { attachmentId } });
    if (!att) {
      throw new BadRequestException(`Attachment with ID ${attachmentId} not found`);
    }
    await this.attachmentRepo.remove(att);
    return { success: true };
  }

  async claimDraftAttachments(draftId: string, entityType: string, entityId: string): Promise<{ claimed: number }> {
    if (!draftId || !/^\d+$/.test(String(draftId).trim())) {
      return { claimed: 0 };
    }
    try {
      const cleanDraftId = String(draftId).trim();
      const cleanEntityId = String(entityId).trim();
      const result = await this.attachmentRepo.update(
        { entityType: `${entityType}_draft`, entityId: cleanDraftId },
        { entityType, entityId: cleanEntityId },
      );
      return { claimed: result.affected || 0 };
    } catch {
      return { claimed: 0 };
    }
  }
}
