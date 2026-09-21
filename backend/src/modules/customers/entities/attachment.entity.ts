import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AppUser } from '../../auth/entities/app-user.entity';

@Entity('attachment')
@Index('idx_attachment_entity', ['entityType', 'entityId'])
export class Attachment {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'attachment_id' })
  attachmentId: string;

  @Column({ name: 'entity_type', length: 50 })
  entityType: string; // 'customer', 'vehicle_unit'

  @Column({ name: 'entity_id', type: 'bigint' })
  entityId: string;

  @Column({ name: 'document_type', length: 50, nullable: true })
  documentType?: string;

  @Column({ name: 'file_name', length: 255 })
  fileName: string;

  @Column({ name: 'file_path', type: 'text' })
  filePath: string;

  @Column({ name: 'content_type', length: 100, nullable: true })
  contentType: string;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes: string;

  @Column({ name: 'uploaded_by', type: 'int', nullable: true })
  uploadedBy: number;

  @ManyToOne(() => AppUser)
  @JoinColumn({ name: 'uploaded_by' })
  user: AppUser;

  @CreateDateColumn({ name: 'uploaded_at', type: 'timestamptz' })
  uploadedAt: Date;
}
