import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Warehouse } from '../lookups/entities/warehouse.entity';
import { UserWarehouseAccess } from './entities/user-warehouse-access.entity';
import { VehicleStatusTransitionRule } from './entities/vehicle-status-transition-rule.entity';
import { VehicleStatusHistory } from './entities/vehicle-status-history.entity';
import { StockBalance } from './entities/stock-balance.entity';
import { StockTransfer, TransferStatus } from './entities/stock-transfer.entity';
import { StockTransferLine } from './entities/stock-transfer-line.entity';
import { StockAdjustment, AdjustmentStatus } from './entities/stock-adjustment.entity';
import { ProductionReceipt } from './entities/production-receipt.entity';
import { VehicleUnit, VehicleStatus } from '../vehicles/entities/vehicle-unit.entity';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { CreateStockAdjustmentDto } from './dto/create-stock-adjustment.dto';
import { CreateProductionReceiptDto } from './dto/create-production-receipt.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Warehouse)
    private warehouseRepo: Repository<Warehouse>,
    @InjectRepository(UserWarehouseAccess)
    private userWarehouseAccessRepo: Repository<UserWarehouseAccess>,
    @InjectRepository(VehicleStatusTransitionRule)
    private transitionRuleRepo: Repository<VehicleStatusTransitionRule>,
    @InjectRepository(VehicleStatusHistory)
    private statusHistoryRepo: Repository<VehicleStatusHistory>,
    @InjectRepository(StockBalance)
    private stockBalanceRepo: Repository<StockBalance>,
    @InjectRepository(StockTransfer)
    private transferRepo: Repository<StockTransfer>,
    @InjectRepository(StockTransferLine)
    private transferLineRepo: Repository<StockTransferLine>,
    @InjectRepository(StockAdjustment)
    private adjustmentRepo: Repository<StockAdjustment>,
    @InjectRepository(ProductionReceipt)
    private productionReceiptRepo: Repository<ProductionReceipt>,
    @InjectRepository(VehicleUnit)
    private vehicleUnitRepo: Repository<VehicleUnit>,
    private dataSource: DataSource,
  ) {}

  // =====================================================================
  // 1. WAREHOUSES & SCOPED ACCESS (Stories W1, W2, W3)
  // =====================================================================
  async getWarehouses(): Promise<Warehouse[]> {
    return this.warehouseRepo.find({
      relations: ['manager'],
      order: { warehouseId: 'ASC' },
    });
  }

  async updateWarehouse(
    id: number,
    data: Partial<Warehouse>,
  ): Promise<Warehouse> {
    const wh = await this.warehouseRepo.findOne({ where: { warehouseId: id } });
    if (!wh) {
      throw new NotFoundException(`Warehouse #${id} not found`);
    }
    Object.assign(wh, data);
    return this.warehouseRepo.save(wh);
  }

  async getUserWarehouseAccess(userId: number): Promise<number[]> {
    const mappings = await this.userWarehouseAccessRepo.find({ where: { userId } });
    return mappings.map((m) => m.warehouseId);
  }

  async setUserWarehouseAccess(userId: number, warehouseIds: number[]): Promise<void> {
    await this.userWarehouseAccessRepo.delete({ userId });
    if (warehouseIds.length > 0) {
      const records = warehouseIds.map((wid) =>
        this.userWarehouseAccessRepo.create({ userId, warehouseId: wid }),
      );
      await this.userWarehouseAccessRepo.save(records);
    }
  }

  // =====================================================================
  // 2. VEHICLE STATUS STATE MACHINE (Stories V1, V2, V3, V4)
  // =====================================================================
  async getTransitionRules(): Promise<VehicleStatusTransitionRule[]> {
    return this.transitionRuleRepo.find({
      order: { fromStatus: 'ASC', toStatus: 'ASC' },
    });
  }

  async transitionVehicleStatus(
    vehicleUnitId: string,
    toStatus: VehicleStatus,
    userId = 1,
    module = 'MANUAL',
    notes?: string,
  ): Promise<VehicleUnit> {
    try {
      await this.dataSource.query(
        `SELECT fn_transition_vehicle_status($1, $2, $3, $4, $5)`,
        [vehicleUnitId, toStatus, userId, module, notes || null],
      );
    } catch (err: any) {
      throw new BadRequestException(err.message || 'Invalid vehicle status transition');
    }

    const updated = await this.vehicleUnitRepo.findOne({
      where: { vehicleUnitId },
      relations: ['item', 'currentWarehouse'],
    });
    if (!updated) {
      throw new NotFoundException(`Vehicle unit #${vehicleUnitId} not found`);
    }
    return updated;
  }

  async getVehicleStatusHistory(vehicleUnitId: string): Promise<VehicleStatusHistory[]> {
    return this.statusHistoryRepo.find({
      where: { vehicleUnitId },
      relations: ['triggerUser'],
      order: { changedAt: 'DESC' },
    });
  }

  // =====================================================================
  // 3. STOCK BALANCES & LOW STOCK ALERTS (Stories G1, G3)
  // =====================================================================
  async getStockBalances(warehouseId?: number, itemId?: string): Promise<StockBalance[]> {
    const qb = this.stockBalanceRepo
      .createQueryBuilder('sb')
      .leftJoinAndSelect('sb.warehouse', 'w')
      .leftJoinAndSelect('sb.item', 'item')
      .orderBy('sb.warehouseId', 'ASC');

    if (warehouseId) {
      qb.andWhere('sb.warehouseId = :wid', { wid: warehouseId });
    }
    if (itemId) {
      qb.andWhere('sb.itemId = :iid', { iid: itemId });
    }

    return qb.getMany();
  }

  async getLowStockAlerts(): Promise<any[]> {
    return this.dataSource.query(`SELECT * FROM vw_low_stock_alert`);
  }

  // =====================================================================
  // 4. STOCK TRANSFERS (Stories T1, T2, T3)
  // =====================================================================
  async createStockTransfer(dto: CreateStockTransferDto, userId = 1): Promise<StockTransfer> {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException('Source and destination warehouse cannot be identical');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const trfInsert = await queryRunner.query(`
        INSERT INTO stock_transfer (from_warehouse_id, to_warehouse_id, requested_by)
        VALUES ($1, $2, $3)
        RETURNING transfer_id
      `, [dto.fromWarehouseId, dto.toWarehouseId, userId]);

      const transferId = trfInsert[0].transfer_id;

      for (const line of dto.lines) {
        if (line.vehicleUnitId) {
          // Serialized unit line
          await queryRunner.query(`
            INSERT INTO stock_transfer_line (transfer_id, vehicle_unit_id)
            VALUES ($1, $2)
          `, [transferId, line.vehicleUnitId]);
        } else if (line.itemId && line.quantity) {
          // Non-serialized item line
          await queryRunner.query(`
            INSERT INTO stock_transfer_line (transfer_id, item_id, quantity)
            VALUES ($1, $2, $3)
          `, [transferId, line.itemId, line.quantity]);
        } else {
          throw new BadRequestException('Transfer line must specify either a vehicleUnitId or (itemId + quantity)');
        }
      }

      await queryRunner.commitTransaction();

      return this.getStockTransferById(String(transferId));
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(err.message || 'Failed to create stock transfer');
    } finally {
      await queryRunner.release();
    }
  }

  async getStockTransfers(): Promise<StockTransfer[]> {
    return this.transferRepo.find({
      relations: [
        'fromWarehouse',
        'toWarehouse',
        'requester',
        'approver',
        'lines',
        'lines.item',
        'lines.vehicleUnit',
      ],
      order: { requestedAt: 'DESC' },
    });
  }

  async getStockTransferById(id: string): Promise<StockTransfer> {
    const trf = await this.transferRepo.findOne({
      where: { transferId: id },
      relations: [
        'fromWarehouse',
        'toWarehouse',
        'requester',
        'approver',
        'lines',
        'lines.item',
        'lines.vehicleUnit',
      ],
    });
    if (!trf) {
      throw new NotFoundException(`Stock transfer #${id} not found`);
    }
    return trf;
  }

  async approveStockTransfer(id: string, userId = 1): Promise<StockTransfer> {
    const trf = await this.getStockTransferById(id);
    if (trf.status !== TransferStatus.REQUESTED) {
      throw new BadRequestException(`Cannot approve transfer in status ${trf.status}`);
    }

    trf.status = TransferStatus.APPROVED;
    trf.approvedBy = userId;
    trf.approvedAt = new Date();
    await this.transferRepo.save(trf);
    return this.getStockTransferById(id);
  }

  async completeStockTransfer(id: string): Promise<StockTransfer> {
    const trf = await this.getStockTransferById(id);
    if (trf.status !== TransferStatus.APPROVED && trf.status !== TransferStatus.REQUESTED) {
      throw new BadRequestException(`Cannot complete transfer in status ${trf.status}`);
    }

    try {
      // Updating to COMPLETED triggers trg_execute_stock_transfer
      await this.dataSource.query(`
        UPDATE stock_transfer
        SET status = 'COMPLETED', completed_at = now()
        WHERE transfer_id = $1
      `, [id]);
    } catch (err: any) {
      throw new BadRequestException(err.message || 'Transfer execution failed');
    }

    return this.getStockTransferById(id);
  }

  // =====================================================================
  // 5. STOCK ADJUSTMENTS (Stories J1, J2, J3, J4)
  // =====================================================================
  async createStockAdjustment(dto: CreateStockAdjustmentDto, userId = 1): Promise<StockAdjustment> {
    if (!dto.reasonNotes) {
      throw new BadRequestException('A reason explanation is mandatory for stock adjustments');
    }

    const insertResult = await this.dataSource.query(`
      INSERT INTO stock_adjustment (
        warehouse_id, item_id, quantity_delta, vehicle_unit_id,
        reason, reason_notes, status, requested_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'REQUESTED', $7)
      RETURNING adjustment_id
    `, [
      dto.warehouseId,
      dto.itemId || null,
      dto.quantityDelta || null,
      dto.vehicleUnitId || null,
      dto.reason,
      dto.reasonNotes,
      userId,
    ]);

    const adjustmentId = insertResult[0].adjustment_id;

    // Auto-submit to central approval workflow if available
    try {
      await this.dataSource.query(`
        SELECT fn_submit_for_approval('STOCK_ADJUSTMENT', 'STOCK_ADJUSTMENT', $1, $2)
      `, [adjustmentId, userId]);
    } catch {
      // Silent pass if approval engine isn't wired for this entity
    }

    return this.getStockAdjustmentById(String(adjustmentId));
  }

  async getStockAdjustments(): Promise<StockAdjustment[]> {
    return this.adjustmentRepo.find({
      relations: ['warehouse', 'item', 'vehicleUnit', 'requester', 'approver'],
      order: { requestedAt: 'DESC' },
    });
  }

  async getStockAdjustmentById(id: string): Promise<StockAdjustment> {
    const adj = await this.adjustmentRepo.findOne({
      where: { adjustmentId: id },
      relations: ['warehouse', 'item', 'vehicleUnit', 'requester', 'approver'],
    });
    if (!adj) {
      throw new NotFoundException(`Stock adjustment #${id} not found`);
    }
    return adj;
  }

  async approveStockAdjustment(id: string, userId = 1): Promise<StockAdjustment> {
    try {
      // Updating to APPROVED triggers trg_execute_stock_adjustment
      await this.dataSource.query(`
        UPDATE stock_adjustment
        SET status = 'APPROVED', approved_by = $1, approved_at = now()
        WHERE adjustment_id = $2
      `, [userId, id]);
    } catch (err: any) {
      throw new BadRequestException(err.message || 'Stock adjustment approval failed');
    }

    return this.getStockAdjustmentById(id);
  }

  // =====================================================================
  // 6. PRODUCTION VEHICLE INTAKE (Stories P1, P2)
  // =====================================================================
  async createProductionReceipt(dto: CreateProductionReceiptDto, userId = 1): Promise<ProductionReceipt> {
    try {
      // Triggers trg_create_vehicle_unit_from_production, which auto-activates to AVAILABLE_FOR_SALE
      const insert = await this.dataSource.query(`
        INSERT INTO production_receipt (
          item_id, chassis_number, engine_number, warehouse_id, assembled_at, received_by
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING production_receipt_id
      `, [
        dto.itemId,
        dto.chassisNumber,
        dto.engineNumber,
        dto.warehouseId,
        dto.assembledAt || new Date().toISOString().split('T')[0],
        userId,
      ]);

      const receiptId = insert[0].production_receipt_id;
      return this.productionReceiptRepo.findOne({
        where: { productionReceiptId: String(receiptId) },
        relations: ['item', 'warehouse', 'receiver'],
      }) as Promise<ProductionReceipt>;
    } catch (err: any) {
      throw new BadRequestException(err.message || 'Failed to record local production receipt');
    }
  }

  async getProductionReceipts(): Promise<ProductionReceipt[]> {
    return this.productionReceiptRepo.find({
      relations: ['item', 'warehouse', 'receiver'],
      order: { createdAt: 'DESC' },
    });
  }

  // =====================================================================
  // 7. STOCK MOVEMENT HISTORY & REPORTS (Stories H1, RP1, RP2)
  // =====================================================================
  async getMovementHistory(params?: { warehouseId?: number; limit?: number }): Promise<any[]> {
    const limit = params?.limit || 100;
    if (params?.warehouseId) {
      return this.dataSource.query(
        `SELECT * FROM vw_stock_movement_history WHERE warehouse_id = $1 ORDER BY movement_at DESC LIMIT $2`,
        [params.warehouseId, limit],
      );
    }
    return this.dataSource.query(
      `SELECT * FROM vw_stock_movement_history ORDER BY movement_at DESC LIMIT $1`,
      [limit],
    );
  }

  async getCurrentStockReport(): Promise<any[]> {
    return this.dataSource.query(`SELECT * FROM vw_current_stock_balance`);
  }

  async getVehicleInventoryByStatusReport(): Promise<any[]> {
    return this.dataSource.query(`SELECT * FROM vw_vehicle_inventory_by_status`);
  }
}
