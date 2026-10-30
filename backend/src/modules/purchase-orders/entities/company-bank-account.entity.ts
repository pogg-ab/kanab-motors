import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('company_bank_account')
export class CompanyBankAccount {
  @PrimaryGeneratedColumn('increment', { name: 'bank_account_id' })
  bankAccountId: number;

  @Column({ name: 'account_name', length: 150 })
  accountName: string;

  @Column({ name: 'bank_name', length: 150 })
  bankName: string;

  @Column({ name: 'account_number', length: 60 })
  accountNumber: string;

  @Column({ name: 'bank_branch', length: 100, nullable: true })
  bankBranch?: string;

  @Column({ name: 'ifsc_code', length: 50, nullable: true })
  ifscCode?: string;

  @Column({ name: 'swift_code', length: 50, nullable: true })
  swiftCode?: string;

  @Column({ length: 10, default: 'USD' })
  currency: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

