import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(params: {
    entityType: string;
    entityId: string;
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    changedBy?: number;
    oldValue?: Record<string, any>;
    newValue?: Record<string, any>;
  }): Promise<AuditLog> {
    const entry = this.auditRepo.create({
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      changedBy: params.changedBy || 1, // Default to admin if unauthenticated
      oldValue: params.oldValue,
      newValue: params.newValue,
    });
    return this.auditRepo.save(entry);
  }

  async getLogsForEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditRepo.find({
      where: { entityType, entityId },
      order: { changedAt: 'DESC' },
      relations: ['user'],
    });
  }

  async findAll(query?: { entityType?: string; limit?: number }): Promise<AuditLog[]> {
    const qb = this.auditRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.user', 'user')
      .orderBy('a.changedAt', 'DESC')
      .take(query?.limit || 100);

    if (query?.entityType && query.entityType !== 'ALL') {
      qb.where('a.entityType = :entityType', { entityType: query.entityType });
    }

    return qb.getMany();
  }
}

