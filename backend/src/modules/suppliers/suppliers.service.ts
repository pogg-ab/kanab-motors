import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { AuditService } from '../audit/audit.service';

export interface CreateSupplierDto {
  supplierName: string;
  country?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  exporterIecNo?: string;
  exporterAdCode?: string;
  isActive?: boolean;
}

export interface UpdateSupplierDto {
  supplierName?: string;
  country?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  exporterIecNo?: string;
  exporterAdCode?: string;
  isActive?: boolean;
}

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  async create(dto: CreateSupplierDto, userId = 1): Promise<Supplier> {
    await this.ensureSupplierNameIsUnique(dto.supplierName);
    const supplier = this.supplierRepo.create({
      supplierName: dto.supplierName.trim(),
      country: dto.country,
      contactPerson: dto.contactPerson,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
      exporterIecNo: dto.exporterIecNo,
      exporterAdCode: dto.exporterAdCode,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });
    const saved = await this.supplierRepo.save(supplier);
    await this.auditService?.log({ entityType: 'supplier', entityId: String(saved.supplierId), action: 'INSERT', changedBy: userId, newValue: { ...saved } });
    return saved;
  }

  async findAll(search?: string, isActive?: boolean): Promise<Supplier[]> {
    const query = this.supplierRepo.createQueryBuilder('s');

    if (search) {
      query.andWhere(
        '(s.supplierName ILIKE :search OR s.country ILIKE :search OR s.contactPerson ILIKE :search OR s.email ILIKE :search OR s.exporterIecNo ILIKE :search OR s.exporterAdCode ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (isActive !== undefined) {
      query.andWhere('s.isActive = :isActive', { isActive });
    }

    query.orderBy('s.supplierName', 'ASC');
    return query.getMany();
  }

  async findOne(id: number): Promise<Supplier> {
    const supplier = await this.supplierRepo.findOne({ where: { supplierId: id } });
    if (!supplier) {
      throw new NotFoundException(`Supplier #${id} not found`);
    }
    return supplier;
  }

  async update(id: number, dto: UpdateSupplierDto, userId = 1): Promise<Supplier> {
    const supplier = await this.findOne(id);
    const oldValue = { ...supplier };
    if (dto.supplierName && dto.supplierName.trim().toLowerCase() !== supplier.supplierName.toLowerCase()) {
      await this.ensureSupplierNameIsUnique(dto.supplierName, id);
      dto.supplierName = dto.supplierName.trim();
    }
    Object.assign(supplier, dto);
    const saved = await this.supplierRepo.save(supplier);
    await this.auditService?.log({ entityType: 'supplier', entityId: String(id), action: 'UPDATE', changedBy: userId, oldValue, newValue: { ...saved } });
    return saved;
  }

  async remove(id: number): Promise<void> {
    const supplier = await this.findOne(id);
    supplier.isActive = false;
    await this.supplierRepo.save(supplier);
  }

  private async ensureSupplierNameIsUnique(supplierName: string, excludeSupplierId?: number): Promise<void> {
    const normalizedName = supplierName?.trim();
    if (!normalizedName) {
      throw new BadRequestException('Supplier name is required');
    }

    const existing = await this.supplierRepo
      .createQueryBuilder('s')
      .where('LOWER(s.supplierName) = LOWER(:supplierName)', { supplierName: normalizedName })
      .getOne();

    if (existing && existing.supplierId !== excludeSupplierId) {
      throw new BadRequestException(`Supplier '${normalizedName}' already exists`);
    }
  }
}
