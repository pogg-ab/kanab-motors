import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CompanyBankAccount } from './company-bank-account.entity';

@Entity('company_profile')
export class CompanyProfile {
  @PrimaryGeneratedColumn('increment', { name: 'profile_id' })
  profileId: number;

  @Column({ name: 'company_name', length: 200 })
  companyName: string;

  @Column({ name: 'trade_name', length: 255, nullable: true })
  tradeName?: string;

  @Column({ type: 'text', nullable: true })
  logo?: string;

  @Column({ name: 'registration_no', length: 100, nullable: true })
  registrationNo?: string;

  @Column({ name: 'tin', length: 100, nullable: true })
  tin?: string;

  // Backwards-compatible alias for existing queries
  @Column({ name: 'tax_id', length: 50, nullable: true })
  taxId?: string;

  @Column({ name: 'vat_registration_no', length: 100, nullable: true })
  vatRegistrationNo?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ length: 100, nullable: true })
  city?: string;

  @Column({ length: 100, default: 'Ethiopia' })
  country: string;

  @Column({ length: 50, nullable: true })
  phone?: string;

  @Column({ length: 150, nullable: true })
  email?: string;

  @Column({ length: 255, nullable: true })
  website?: string;

  @Column({ name: 'importer_iec_no', length: 100, nullable: true })
  importerIecNo?: string;

  // Backwards-compatible alias for existing queries
  @Column({ name: 'iec_no', length: 50, nullable: true })
  iecNo?: string;

  @Column({ name: 'importer_ad_code', length: 100, nullable: true })
  importerAdCode?: string;

  // Backwards-compatible alias for existing queries
  @Column({ name: 'ad_code', length: 50, nullable: true })
  adCode?: string;

  @Column({ name: 'is_default', type: 'boolean', default: true })
  isDefault: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy?: number;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy?: number;

  @OneToMany(() => CompanyBankAccount, (bank) => bank.companyProfile)
  bankAccounts?: CompanyBankAccount[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
