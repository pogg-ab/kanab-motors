import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('company_profile')
export class CompanyProfile {
  @PrimaryGeneratedColumn('increment', { name: 'profile_id' })
  profileId: number;

  @Column({ name: 'company_name', length: 200 })
  companyName: string;

  @Column({ name: 'iec_no', length: 50, nullable: true })
  iecNo?: string;

  @Column({ name: 'ad_code', length: 50, nullable: true })
  adCode?: string;

  @Column({ name: 'tax_id', length: 50, nullable: true })
  taxId?: string;

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

  @Column({ name: 'is_default', type: 'boolean', default: true })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

