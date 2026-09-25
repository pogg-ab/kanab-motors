import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { AppUser } from './app-user.entity';

@Entity('role')
export class Role {
  @PrimaryGeneratedColumn('increment', { type: 'smallint', name: 'role_id' })
  roleId: number;

  @Column({ name: 'role_name', length: 50, unique: true })
  roleName: string;

  @Column({ name: 'display_name', length: 100, nullable: true })
  displayName?: string;

  @Column({ length: 255, nullable: true })
  description?: string;

  @Column({ type: 'text', array: true, default: '{}' })
  permissions: string[];

  @Column({ name: 'is_system_role', type: 'boolean', default: false })
  isSystemRole: boolean;

  @OneToMany(() => AppUser, (user) => user.role)
  users: AppUser[];
}
