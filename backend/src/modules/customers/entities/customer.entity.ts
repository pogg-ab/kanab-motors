import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Region } from '../../lookups/entities/region.entity';
import { AppUser } from '../../auth/entities/app-user.entity';
import { CustomerBankAccount } from './customer-bank-account.entity';
import { CustomerAccountSummary } from './customer-account-summary.entity';

export enum CustomerType {
  DIRECT_POS = 'DIRECT_POS',
  DEALER = 'DEALER',
  GOVERNMENT = 'GOVERNMENT',
}

@Entity('customer')
@Index('idx_customer_type', ['customerType'])
@Index('idx_customer_region', ['regionId'])
export class Customer {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'customer_id' })
  customerId: string;

  @Column({
    name: 'customer_code',
    length: 20,
    unique: true,
    default: () => "('CUST-' || lpad(nextval('customer_code_seq')::text, 6, '0'))",
  })
  customerCode: string;

  @Column({
    name: 'customer_type',
    type: 'enum',
    enum: CustomerType,
  })
  customerType: CustomerType;

  @Column({ name: 'full_name', length: 200 })
  fullName: string;

  @Column({ name: 'region_id', type: 'smallint', nullable: true })
  regionId: number;

  @ManyToOne(() => Region, { nullable: true })
  @JoinColumn({ name: 'region_id' })
  region: Region;

  @Column({ name: 'address_town', length: 250, nullable: true })
  addressTown: string;

  @Column({ name: 'mobile_number', length: 20, unique: true })
  mobileNumber: string;

  @Column({ name: 'tin_number', length: 30, nullable: true })
  tinNumber: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater: AppUser;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => CustomerBankAccount, (ba) => ba.customer, { cascade: true })
  bankAccounts: CustomerBankAccount[];

  @OneToOne(() => CustomerAccountSummary, (summary) => summary.customer)
  accountSummary: CustomerAccountSummary;
}
