import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';

export interface CreateSupplierDto {
  supplierName: string;
  country?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
}

export interface UpdateSupplierDto {
  supplierName?: string;
  country?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
}

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
  ) {}

  async create(dto: CreateSupplierDto): Promise<Supplier> {
    await this.ensureSupplierNameIsUnique(dto.supplierName);
    const supplier = this.supplierRepo.create({
      supplierName: dto.supplierName.trim(),
      country: dto.country,
      contactPerson: dto.contactPerson,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });
    return this.supplierRepo.save(supplier);
  }

  async findAll(search?: string, isActive?: boolean): Promise<Supplier[]> {
    const query = this.supplierRepo.createQueryBuilder('s');

    if (search) {
      query.andWhere(
        '(s.supplierName ILIKE :search OR s.country ILIKE :search OR s.contactPerson ILIKE :search OR s.email ILIKE :search)',
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

  async update(id: number, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOne(id);
    if (dto.supplierName && dto.supplierName.trim().toLowerCase() !== supplier.supplierName.toLowerCase()) {
      await this.ensureSupplierNameIsUnique(dto.supplierName, id);
      dto.supplierName = dto.supplierName.trim();
    }
    Object.assign(supplier, dto);
    return this.supplierRepo.save(supplier);
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
