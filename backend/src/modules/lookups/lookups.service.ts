import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Region } from './entities/region.entity';
import { Warehouse } from './entities/warehouse.entity';

@Injectable()
export class LookupsService {
  constructor(
    @InjectRepository(Region)
    private readonly regionRepo: Repository<Region>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
  ) {}

  async getRegions(): Promise<Region[]> {
    return this.regionRepo.find({ order: { regionName: 'ASC' } });
  }

  async getWarehouses(): Promise<Warehouse[]> {
    return this.warehouseRepo.find({ where: { isActive: true }, order: { warehouseName: 'ASC' } });
  }

  async createWarehouse(name: string, location?: string): Promise<Warehouse> {
    const warehouse = this.warehouseRepo.create({ warehouseName: name, location, isActive: true });
    return this.warehouseRepo.save(warehouse);
  }
}
