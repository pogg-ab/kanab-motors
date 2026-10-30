import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AppUser } from '../../auth/entities/app-user.entity';

@Entity('import_notification')
export class ImportNotification {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'notification_id' })
  notificationId: string;

  @Column({ name: 'event_type', length: 60 })
  eventType: string;

  @Column({ name: 'recipient_role', length: 60, nullable: true })
  recipientRole?: string;

  @Column({ name: 'recipient_user_id', type: 'int', nullable: true })
  recipientUserId?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'recipient_user_id' })
  recipient?: AppUser;

  @Column({ name: 'entity_type', length: 50 })
  entityType: string;

  @Column({ name: 'entity_id', length: 50 })
  entityId: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ length: 20, default: 'INFO' })
  severity: 'INFO' | 'WARNING' | 'CRITICAL';

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
