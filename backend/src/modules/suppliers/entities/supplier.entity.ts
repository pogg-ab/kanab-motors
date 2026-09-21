import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('supplier')
export class Supplier {
  @PrimaryGeneratedColumn('increment', { name: 'supplier_id' })
  supplierId: number;

  @Column({ name: 'supplier_name', length: 200 })
  supplierName: string;

  @Column({ length: 100, nullable: true })
  country?: string;

  @Column({ name: 'contact_person', length: 150, nullable: true })
  contactPerson?: string;

  @Column({ length: 30, nullable: true })
  phone?: string;

  @Column({ length: 150, nullable: true })
  email?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
