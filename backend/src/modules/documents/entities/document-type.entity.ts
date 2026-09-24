import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('document_type')
export class DocumentType {
  @PrimaryColumn({ name: 'document_type_code', length: 50 })
  documentTypeCode: string;

  @Column({ name: 'document_type_name', length: 150 })
  documentTypeName: string;

  @Column({ name: 'restricted_to_entity_type', length: 50, nullable: true })
  restrictedToEntityType?: string;
}
