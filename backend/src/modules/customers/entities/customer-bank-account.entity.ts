import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Customer } from './customer.entity';

@Entity('customer_bank_account')
@Index('idx_customer_bank_account_customer', ['customerId'])
export class CustomerBankAccount {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'bank_account_id' })
  bankAccountId: string;

  @Column({ name: 'customer_id', type: 'bigint' })
  customerId: string;

  @ManyToOne(() => Customer, (customer) => customer.bankAccounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'bank_name', length: 150 })
  bankName: string;

  @Column({ name: 'account_number', length: 50 })
  accountNumber: string;

  @Column({ name: 'account_holder_name', length: 200 })
  accountHolderName: string;

  @Column({ length: 150, nullable: true })
  branch: string;

  @Column({ name: 'is_primary', type: 'boolean', default: true })
  isPrimary: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
