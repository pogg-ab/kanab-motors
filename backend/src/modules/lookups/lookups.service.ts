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

  async getColors(): Promise<any[]> {
    return this.dataSource.query(
      'SELECT color_id AS "colorId", color_name AS "colorName", hex_code AS "hexCode", is_active AS "isActive" FROM vehicle_color WHERE is_active = true ORDER BY color_name ASC',
    );
  }

  async createColor(colorName: string, hexCode?: string): Promise<any> {
    const rows = await this.dataSource.query(
      `INSERT INTO vehicle_color (color_name, hex_code) VALUES ($1, $2) ON CONFLICT (color_name) DO UPDATE SET hex_code = EXCLUDED.hex_code, is_active = true RETURNING color_id AS "colorId", color_name AS "colorName", hex_code AS "hexCode"`,
      [colorName.trim(), hexCode?.trim() || '#000000'],
    );
    return rows[0];
  }

  async updateColor(id: number, colorName: string, hexCode?: string): Promise<any> {
    const rows = await this.dataSource.query(
      `UPDATE vehicle_color SET color_name = $1, hex_code = COALESCE($2, hex_code) WHERE color_id = $3 RETURNING color_id AS "colorId", color_name AS "colorName", hex_code AS "hexCode"`,
      [colorName.trim(), hexCode?.trim() || null, id],
    );
    return rows[0];
  }

  async deleteColor(id: number): Promise<{ success: boolean; message: string }> {
    await this.dataSource.query('DELETE FROM vehicle_color WHERE color_id = $1', [id]);
    return { success: true, message: 'Vehicle color deleted successfully' };
  }

  async getUnits(): Promise<any[]> {
    return this.dataSource.query(
      'SELECT uom_id AS "uomId", uom_name AS "uomName" FROM unit_of_measure ORDER BY uom_name ASC',
    );
  }

  async createUnit(uomName: string): Promise<any> {
    const rows = await this.dataSource.query(
      `INSERT INTO unit_of_measure (uom_name) VALUES ($1) ON CONFLICT (uom_name) DO UPDATE SET uom_name = EXCLUDED.uom_name RETURNING uom_id AS "uomId", uom_name AS "uomName"`,
      [uomName.trim().toUpperCase()],
    );
    return rows[0];
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
