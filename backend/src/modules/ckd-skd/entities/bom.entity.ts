import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ProductItem } from '../../products/entities/product-item.entity';
import { AppUser } from '../../auth/entities/app-user.entity';
import { BomLine } from './bom-line.entity';

@Entity('bom')
export class Bom {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'bom_id' })
  bomId: string;

  @Column({ name: 'bom_code', length: 60, unique: true })
  bomCode: string;

  @Column({ name: 'item_id', type: 'bigint' })
  itemId: string;

  @ManyToOne(() => ProductItem)
  @JoinColumn({ name: 'item_id' })
  item: ProductItem;

  @Column({ length: 20, default: '1.0' })
  version: string;

  @Column({ length: 20, default: 'ACTIVE' })
  status: string; // DRAFT, ACTIVE, ARCHIVED

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'created_by', type: 'int' })
  createdBy: number;

  @ManyToOne(() => AppUser)
  @JoinColumn({ name: 'created_by' })
  creator: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt?: Date;

  @OneToMany(() => BomLine, (line) => line.bom, { cascade: true })
  lines: BomLine[];
}
