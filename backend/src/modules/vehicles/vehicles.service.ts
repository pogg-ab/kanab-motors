import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { VehicleUnit, VehicleStatus } from './entities/vehicle-unit.entity';
import { ProductItem } from '../products/entities/product-item.entity';
import { CreateVehicleUnitDto } from './dto/create-vehicle-unit.dto';
import { UpdateVehicleUnitDto } from './dto/update-vehicle-unit.dto';
import { BulkImportVehicleDto } from './dto/bulk-import-vehicle.dto';
import { VehicleQueryDto } from './dto/vehicle-query.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(VehicleUnit)
    private readonly unitRepo: Repository<VehicleUnit>,
    @InjectRepository(ProductItem)
    private readonly itemRepo: Repository<ProductItem>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateVehicleUnitDto, userId: number = 1): Promise<VehicleUnit> {
    // 1. Verify item exists
    const item = await this.itemRepo.findOne({ where: { itemId: dto.itemId } });
    if (!item) {
      throw new NotFoundException(`Product model (item) with ID ${dto.itemId} not found`);
    }

    // 2. Validate chassis number uniqueness
    const chassis = dto.chassisNumber.trim().toUpperCase();
    const existingChassis = await this.unitRepo.findOne({
      where: { chassisNumber: chassis },
    });
    if (existingChassis) {
      throw new ConflictException(
        `A vehicle with chassis number '${chassis}' already exists (ID: ${existingChassis.vehicleUnitId})`,
      );
    }

    // 3. Validate engine number uniqueness
    const engine = dto.engineNumber.trim().toUpperCase();
    const existingEngine = await this.unitRepo.findOne({
      where: { engineNumber: engine },
    });
    if (existingEngine) {
      throw new ConflictException(
        `A vehicle with engine number '${engine}' already exists (ID: ${existingEngine.vehicleUnitId})`,
      );
    }

    const unit = this.unitRepo.create({
      itemId: dto.itemId,
      chassisNumber: chassis,
      engineNumber: engine,
      productionImportInfo: dto.productionImportInfo,
      currentWarehouseId: dto.currentWarehouseId,
      currentStatus: dto.currentStatus || VehicleStatus.RECEIVED,
      createdBy: userId,
    });

    const saved = await this.unitRepo.save(unit);

    await this.auditService.log({
      entityType: 'vehicle_unit',
      entityId: saved.vehicleUnitId,
      action: 'INSERT',
      changedBy: userId,
      newValue: {
        chassisNumber: saved.chassisNumber,
        engineNumber: saved.engineNumber,
        status: saved.currentStatus,
        itemId: saved.itemId,
      },
    });

    return this.findOne(saved.vehicleUnitId);
  }

  async findAll(query: VehicleQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const qb = this.unitRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.item', 'item')
      .leftJoinAndSelect('item.category', 'category')
      .leftJoinAndSelect('item.brand', 'brand')
      .leftJoinAndSelect('u.currentWarehouse', 'warehouse');

    if (query.status) {
      qb.andWhere('u.currentStatus = :status', { status: query.status });
    }

    if (query.itemId) {
      qb.andWhere('u.itemId = :itemId', { itemId: query.itemId });
    }

    if (query.warehouseId) {
      qb.andWhere('u.currentWarehouseId = :warehouseId', { warehouseId: query.warehouseId });
    }

    if (query.search && query.search.trim() !== '') {
      const s = `%${query.search.trim().toUpperCase()}%`;
      qb.andWhere('(u.chassisNumber ILIKE :s OR u.engineNumber ILIKE :s)', { s });
    }

    qb.orderBy('u.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<VehicleUnit> {
    const unit = await this.unitRepo.findOne({
      where: { vehicleUnitId: id },
      relations: ['item', 'item.category', 'item.brand', 'currentWarehouse', 'creator', 'updater'],
    });
    if (!unit) {
      throw new NotFoundException(`Vehicle unit with ID ${id} not found`);
    }
    return unit;
  }

  async updateStatus(
    id: string,
    status: VehicleStatus,
    warehouseId?: number,
    userId: number = 1,
  ): Promise<VehicleUnit> {
    const unit = await this.findOne(id);
    const oldStatus = unit.currentStatus;
    const oldWarehouseId = unit.currentWarehouseId;

    if (status !== oldStatus) {
      try {
        await this.dataSource.query(
          `SELECT fn_transition_vehicle_status($1, $2, $3, $4, $5)`,
          [id, status, userId, 'VEHICLE_REGISTRY', null],
        );
      } catch (err: any) {
        throw new BadRequestException(err.message || 'Invalid vehicle status transition');
      }
    }

    if (warehouseId && warehouseId !== oldWarehouseId) {
      await this.unitRepo.update(id, {
        currentWarehouseId: warehouseId,
        updatedBy: userId,
      });
    }

    const updated = await this.findOne(id);

    await this.auditService.log({
      entityType: 'vehicle_unit',
      entityId: id,
      action: 'UPDATE',
      changedBy: userId,
      oldValue: { status: oldStatus, warehouseId: oldWarehouseId },
      newValue: { status: updated.currentStatus, warehouseId: updated.currentWarehouseId },
    });

    return updated;
  }

  async bulkImport(dto: BulkImportVehicleDto, userId: number = 1) {
    const item = await this.itemRepo.findOne({ where: { itemId: dto.itemId } });
    if (!item) {
      throw new NotFoundException(`Product model (item) with ID ${dto.itemId} not found`);
    }

    if (!dto.units || dto.units.length === 0) {
      throw new BadRequestException('No vehicle units provided in import list');
    }

    const errors: string[] = [];
    const validUnitsToCreate: Partial<VehicleUnit>[] = [];
    const seenChassisInBatch = new Set<string>();
    const seenEngineInBatch = new Set<string>();

    for (let i = 0; i < dto.units.length; i++) {
      const u = dto.units[i];
      const rowNum = i + 1;
      const chassis = (u.chassisNumber || '').trim().toUpperCase();
      const engine = (u.engineNumber || '').trim().toUpperCase();

      if (!chassis || !engine) {
        errors.push(`Row ${rowNum}: Both Chassis and Engine numbers are required`);
        continue;
      }

      if (seenChassisInBatch.has(chassis)) {
        errors.push(`Row ${rowNum}: Duplicate Chassis number '${chassis}' in this batch`);
        continue;
      }
      if (seenEngineInBatch.has(engine)) {
        errors.push(`Row ${rowNum}: Duplicate Engine number '${engine}' in this batch`);
        continue;
      }

      // Check DB uniqueness
      const dbChassis = await this.unitRepo.findOne({ where: { chassisNumber: chassis } });
      if (dbChassis) {
        errors.push(`Row ${rowNum}: Chassis number '${chassis}' already exists in database`);
        continue;
      }

      const dbEngine = await this.unitRepo.findOne({ where: { engineNumber: engine } });
      if (dbEngine) {
        errors.push(`Row ${rowNum}: Engine number '${engine}' already exists in database`);
        continue;
      }

      seenChassisInBatch.add(chassis);
      seenEngineInBatch.add(engine);

      validUnitsToCreate.push({
        itemId: dto.itemId,
        chassisNumber: chassis,
        engineNumber: engine,
        productionImportInfo: u.productionImportInfo || dto.productionImportInfo,
        currentWarehouseId: dto.currentWarehouseId,
        currentStatus: VehicleStatus.RECEIVED,
        createdBy: userId,
      });
    }

    let savedUnits: VehicleUnit[] = [];
    if (validUnitsToCreate.length > 0) {
      savedUnits = await this.unitRepo.save(validUnitsToCreate as any);

      await this.auditService.log({
        entityType: 'vehicle_unit',
        entityId: savedUnits[0].vehicleUnitId,
        action: 'INSERT',
        changedBy: userId,
        newValue: {
          action: 'BULK_IMPORT',
          totalImported: savedUnits.length,
          itemId: dto.itemId,
        },
      });
    }

    return {
      success: errors.length === 0,
      totalReceived: dto.units.length,
      importedCount: savedUnits.length,
      failedCount: errors.length,
      errors,
      importedUnits: savedUnits,
    };
  }

  async update(id: string, dto: UpdateVehicleUnitDto, userId: number = 1): Promise<VehicleUnit> {
    const unit = await this.findOne(id);
    const oldValues = {
      chassisNumber: unit.chassisNumber,
      engineNumber: unit.engineNumber,
      currentStatus: unit.currentStatus,
      itemId: unit.itemId,
      currentWarehouseId: unit.currentWarehouseId,
    };

    if (dto.itemId && dto.itemId !== unit.itemId) {
      const item = await this.itemRepo.findOne({ where: { itemId: dto.itemId } });
      if (!item) throw new NotFoundException(`Product model with ID ${dto.itemId} not found`);
      unit.itemId = dto.itemId;
    }

    if (dto.chassisNumber && dto.chassisNumber.trim().toUpperCase() !== unit.chassisNumber) {
      const chassis = dto.chassisNumber.trim().toUpperCase();
      const existingChassis = await this.unitRepo.findOne({ where: { chassisNumber: chassis } });
      if (existingChassis && existingChassis.vehicleUnitId !== id) {
        throw new ConflictException(`Vehicle with chassis number '${chassis}' already exists`);
      }
      unit.chassisNumber = chassis;
    }

    if (dto.engineNumber && dto.engineNumber.trim().toUpperCase() !== unit.engineNumber) {
      const engine = dto.engineNumber.trim().toUpperCase();
      const existingEngine = await this.unitRepo.findOne({ where: { engineNumber: engine } });
      if (existingEngine && existingEngine.vehicleUnitId !== id) {
        throw new ConflictException(`Vehicle with engine number '${engine}' already exists`);
      }
      unit.engineNumber = engine;
    }

    if (dto.productionImportInfo !== undefined) {
      unit.productionImportInfo = dto.productionImportInfo?.trim() || null as any;
    }

    if (dto.currentWarehouseId !== undefined) {
      unit.currentWarehouseId = dto.currentWarehouseId;
    }

    if (dto.currentStatus !== undefined) {
      unit.currentStatus = dto.currentStatus;
    }

    unit.updatedBy = userId;
    const saved = await this.unitRepo.save(unit);

    await this.auditService.log({
      entityType: 'vehicle_unit',
      entityId: id,
      action: 'UPDATE',
      changedBy: userId,
      oldValue: oldValues,
      newValue: {
        chassisNumber: saved.chassisNumber,
        engineNumber: saved.engineNumber,
        status: saved.currentStatus,
        itemId: saved.itemId,
        currentWarehouseId: saved.currentWarehouseId,
      },
    });

    return this.findOne(id);
  }
}
