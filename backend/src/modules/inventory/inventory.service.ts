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
import { CreateStockReceiptDto } from './dto/create-stock-receipt.dto';

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
  async syncVehicleStockBalances(): Promise<void> {
    try {
      // 1. Sync tracked physical vehicle counts per warehouse into stock_balance
      await this.dataSource.query(`
        INSERT INTO stock_balance (warehouse_id, item_id, quantity_on_hand, quantity_reserved)
        SELECT 
          vu.current_warehouse_id, 
          vu.item_id, 
          COUNT(*) FILTER (WHERE vu.current_status IN ('RECEIVED', 'PDI_PASSED', 'AVAILABLE_FOR_SALE', 'RESERVED', 'ALLOTTED'))::numeric AS on_hand,
          COUNT(*) FILTER (WHERE vu.current_status IN ('RESERVED', 'ALLOTTED'))::numeric AS reserved
        FROM vehicle_unit vu
        JOIN product_item pi ON pi.item_id = vu.item_id
        WHERE vu.current_warehouse_id IS NOT NULL 
          AND vu.item_id IS NOT NULL
          AND pi.is_individually_tracked = true
        GROUP BY vu.current_warehouse_id, vu.item_id
        ON CONFLICT (warehouse_id, item_id)
        DO UPDATE SET 
          quantity_on_hand = EXCLUDED.quantity_on_hand,
          quantity_reserved = EXCLUDED.quantity_reserved,
          updated_at = now();
      `);

      // 2. Zero-out any stock_balance rows for tracked vehicles if all units departed/delivered
      await this.dataSource.query(`
        UPDATE stock_balance sb
        SET quantity_on_hand = 0, quantity_reserved = 0, updated_at = now()
        FROM product_item pi
        WHERE sb.item_id = pi.item_id
          AND pi.is_individually_tracked = true
          AND NOT EXISTS (
            SELECT 1 FROM vehicle_unit vu
            WHERE vu.current_warehouse_id = sb.warehouse_id
              AND vu.item_id = sb.item_id
              AND vu.current_status IN ('RECEIVED', 'PDI_PASSED', 'AVAILABLE_FOR_SALE', 'RESERVED', 'ALLOTTED')
          );
      `);
    } catch (err) {
      // Graceful fallback if query fails
    }
  }

  async getStockBalances(warehouseId?: number, itemId?: string): Promise<StockBalance[]> {
    await this.syncVehicleStockBalances();

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
    await this.syncVehicleStockBalances();
    return this.dataSource.query(`SELECT * FROM vw_low_stock_alert`);
  }

  async createStockReceipt(dto: CreateStockReceiptDto, userId = 1): Promise<any> {
    const itemRows = await this.dataSource.query(
      `
      SELECT item_id, item_code, item_name, is_individually_tracked
      FROM product_item
      WHERE item_id = $1
      LIMIT 1
      `,
      [dto.itemId],
    );
    const item = itemRows[0];
    if (!item) {
      throw new BadRequestException(`Item #${dto.itemId} not found`);
    }
    if (item.is_individually_tracked) {
      throw new BadRequestException(
        'This item is individually tracked as vehicle units. Use shipment receipt, local assembly intake, or vehicle workflows instead of stock receipts.',
      );
    }

    const warehouseRows = await this.dataSource.query(
      `SELECT warehouse_id FROM warehouse WHERE warehouse_id = $1 LIMIT 1`,
      [dto.warehouseId],
    );
    if (!warehouseRows[0]) {
      throw new BadRequestException(`Warehouse #${dto.warehouseId} not found`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const receiptRows = await queryRunner.query(
        `
        INSERT INTO stock_receipt (
          warehouse_id, item_id, quantity, source_type, notes, received_by
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING stock_receipt_id
        `,
        [
          dto.warehouseId,
          dto.itemId,
          dto.quantity,
          dto.sourceType,
          dto.notes || null,
          userId,
        ],
      );

      await queryRunner.query(
        `
        INSERT INTO stock_balance (warehouse_id, item_id, quantity_on_hand, quantity_reserved)
        VALUES ($1, $2, $3, 0)
        ON CONFLICT (warehouse_id, item_id)
        DO UPDATE SET quantity_on_hand = stock_balance.quantity_on_hand + EXCLUDED.quantity_on_hand,
                      updated_at = now()
        `,
        [dto.warehouseId, dto.itemId, dto.quantity],
      );

      await queryRunner.commitTransaction();

      const receiptId = receiptRows[0].stock_receipt_id;
      const receipt = await this.dataSource.query(
        `
        SELECT
          sr.stock_receipt_id,
          sr.warehouse_id,
          w.warehouse_name,
          sr.item_id,
          pi.item_code,
          pi.item_name,
          sr.quantity,
          sr.source_type,
          sr.notes,
          sr.received_by,
          sr.received_at
        FROM stock_receipt sr
        JOIN warehouse w ON w.warehouse_id = sr.warehouse_id
        JOIN product_item pi ON pi.item_id = sr.item_id
        WHERE sr.stock_receipt_id = $1
        `,
        [receiptId],
      );
      return receipt[0];
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(err.message || 'Failed to receive stock');
    } finally {
      await queryRunner.release();
    }
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
          // Serialized unit line. Accept either numeric vehicle_unit_id or a chassis/VIN/engine value from the UI.
          let vehicleUnitId = String(line.vehicleUnitId).trim();
          if (!vehicleUnitId) {
            throw new BadRequestException('Vehicle Unit ID / VIN is required for serialized vehicle transfers');
          }

          if (!/^\d+$/.test(vehicleUnitId)) {
            const vehicleRows = await queryRunner.query(
              `
              SELECT vehicle_unit_id
              FROM vehicle_unit
              WHERE chassis_number = $1 OR engine_number = $1
              LIMIT 1
              `,
              [vehicleUnitId],
            );
            const vehicle = vehicleRows[0];
            if (!vehicle) {
              throw new BadRequestException(`Vehicle unit with VIN/chassis/engine "${vehicleUnitId}" not found`);
            }
            vehicleUnitId = String(vehicle.vehicle_unit_id);
          }

          const sourceRows = await queryRunner.query(
            `
            SELECT current_warehouse_id
            FROM vehicle_unit
            WHERE vehicle_unit_id = $1
            LIMIT 1
            `,
            [vehicleUnitId],
          );
          const sourceVehicle = sourceRows[0];
          if (!sourceVehicle) {
            throw new BadRequestException(`Vehicle unit #${vehicleUnitId} not found`);
          }
          if (Number(sourceVehicle.current_warehouse_id) !== Number(dto.fromWarehouseId)) {
            throw new BadRequestException(
              `Vehicle unit #${vehicleUnitId} is not in source warehouse #${dto.fromWarehouseId}`,
            );
          }

          await queryRunner.query(`
            INSERT INTO stock_transfer_line (transfer_id, vehicle_unit_id)
            VALUES ($1, $2)
          `, [transferId, vehicleUnitId]);
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

    if (dto.itemId && dto.quantityDelta !== undefined && dto.quantityDelta !== null) {
      const itemRows = await this.dataSource.query(
        `
        SELECT is_individually_tracked
        FROM product_item
        WHERE item_id = $1
        LIMIT 1
        `,
        [dto.itemId],
      );
      if (!itemRows[0]) {
        throw new BadRequestException(`Item #${dto.itemId} not found`);
      }
      if (itemRows[0].is_individually_tracked) {
        throw new BadRequestException(
          'This item is individually tracked as vehicle units. Use vehicle status/warehouse workflows instead of quantity stock adjustments.',
        );
      }

      const balanceRows = await this.dataSource.query(
        `
        SELECT quantity_on_hand
        FROM stock_balance
        WHERE warehouse_id = $1 AND item_id = $2
        LIMIT 1
        `,
        [dto.warehouseId, dto.itemId],
      );
      if (!balanceRows[0]) {
        throw new BadRequestException(
          `No existing stock balance for item ${dto.itemId} at warehouse ${dto.warehouseId} -- receive stock before adjusting it`,
        );
      }
      const resultingQuantity = Number(balanceRows[0].quantity_on_hand) + Number(dto.quantityDelta);
      if (resultingQuantity < 0) {
        throw new BadRequestException('Stock adjustment would make quantity on hand negative');
      }
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
  async getMovementHistory(params?: {
    warehouseId?: number;
    itemId?: string;
    movementType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<any[]> {
    const values: any[] = [];
    const where: string[] = [];

    if (params?.warehouseId) {
      values.push(params.warehouseId);
      where.push(`warehouse_id = $${values.length}`);
    }
    if (params?.itemId) {
      values.push(params.itemId);
      where.push(`item_id = $${values.length}`);
    }
    if (params?.movementType) {
      values.push(params.movementType);
      where.push(`movement_type = $${values.length}`);
    }
    if (params?.startDate) {
      values.push(params.startDate);
      where.push(`movement_at >= $${values.length}::date`);
    }
    if (params?.endDate) {
      values.push(params.endDate);
      where.push(`movement_at < ($${values.length}::date + INTERVAL '1 day')`);
    }

    const limit = Math.max(1, Math.min(500, params?.limit || 100));
    values.push(limit);

    return this.dataSource.query(
      `
      SELECT *
      FROM vw_stock_movement_history
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY movement_at DESC
      LIMIT $${values.length}
      `,
      values,
    );
  }

  async getCurrentStockReport(): Promise<any[]> {
    return this.dataSource.query(`SELECT * FROM vw_current_stock_balance`);
  }

  async getVehicleInventoryByStatusReport(): Promise<any[]> {
    return this.dataSource.query(`SELECT * FROM vw_vehicle_inventory_by_status`);
  }
}
