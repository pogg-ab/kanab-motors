import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Region } from './entities/region.entity';
import { Warehouse } from './entities/warehouse.entity';

@Injectable()
export class LookupsService {
  constructor(
    @InjectRepository(Region)
    private readonly regionRepo: Repository<Region>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    private readonly dataSource: DataSource,
  ) {}

  async getRegions(): Promise<Region[]> {
    return this.regionRepo.find({ order: { regionName: 'ASC' } });
  }

  async getWarehouses(): Promise<Warehouse[]> {
    return this.warehouseRepo.find({ where: { isActive: true }, order: { warehouseName: 'ASC' } });
  }

  async createWarehouse(name: string, location?: string): Promise<Warehouse> {
    const warehouse = this.warehouseRepo.create({ warehouseName: name.trim(), location: location?.trim() || null, isActive: true });
    return this.warehouseRepo.save(warehouse);
  }

  async updateWarehouse(id: number, name?: string, location?: string): Promise<Warehouse> {
    const wh = await this.warehouseRepo.findOne({ where: { warehouseId: id } });
    if (!wh) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }
    if (name !== undefined) wh.warehouseName = name.trim();
    if (location !== undefined) wh.location = location.trim() || null;
    return this.warehouseRepo.save(wh);
  }

  async deleteWarehouse(id: number): Promise<{ success: boolean; message: string }> {
    const wh = await this.warehouseRepo.findOne({ where: { warehouseId: id } });
    if (!wh) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    // Check if vehicles are assigned
    const vehicleCount = await this.dataSource.query(
      'SELECT COUNT(*)::int AS count FROM vehicle_unit WHERE current_warehouse_id = $1',
      [id],
    );
    const count = vehicleCount[0]?.count || 0;
    if (count > 0) {
      throw new BadRequestException(
        `Cannot delete warehouse "${wh.warehouseName}": it currently contains ${count} vehicle unit(s). Move or reassign those units first.`,
      );
    }

    // Check if active stock balances exist
    const stockBalance = await this.dataSource.query(
      'SELECT COUNT(*)::int AS count FROM stock_balance WHERE warehouse_id = $1 AND on_hand_qty > 0',
      [id],
    ).catch(() => [{ count: 0 }]);
    const stockCount = stockBalance[0]?.count || 0;
    if (stockCount > 0) {
      throw new BadRequestException(
        `Cannot delete warehouse "${wh.warehouseName}": it has active stock balances. Transfer all stock first.`,
      );
    }

    wh.isActive = false;
    await this.warehouseRepo.save(wh);
    return { success: true, message: `Warehouse "${wh.warehouseName}" removed successfully` };
  }
}
