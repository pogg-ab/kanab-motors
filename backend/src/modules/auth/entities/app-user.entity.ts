import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Role } from './role.entity';

@Entity('app_user')
export class AppUser {
  @PrimaryGeneratedColumn('increment', { type: 'int', name: 'user_id' })
  userId: number;

  @Column({ length: 100, unique: true })
  username: string;

  @Column({ length: 150, unique: true, nullable: true })
  email: string;

  @Column({ name: 'full_name', length: 200 })
  fullName: string;

  @Column({ name: 'password_hash', length: 255, nullable: true, select: false })
  passwordHash?: string;

  @Column({ name: 'role_id', type: 'smallint' })
  roleId: number;

  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ type: 'text', array: true, default: '{}' })
  permissions: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'must_change_password', type: 'boolean', default: false })
  mustChangePassword: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
