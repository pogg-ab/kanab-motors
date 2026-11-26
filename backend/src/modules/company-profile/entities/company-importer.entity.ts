import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CompanyProfile } from '../../purchase-orders/entities/company-profile.entity';

@Entity('company_importer')
export class CompanyImporter {
  @PrimaryGeneratedColumn('increment', { name: 'importer_id' })
  importerId: number;

  @Column({ name: 'company_profile_id', type: 'int', nullable: true })
  companyProfileId?: number;

  @ManyToOne(() => CompanyProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_profile_id' })
  companyProfile?: CompanyProfile;

  @Column({ name: 'importer_name', length: 200 })
  importerName: string;

  @Column({ name: 'iec_no', length: 100 })
  iecNo: string;

  @Column({ name: 'ad_code', length: 100 })
  adCode: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
