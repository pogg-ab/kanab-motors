import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, EntityManager } from 'typeorm';
import { CkdSkdBatch, KitType } from './entities/ckd-skd-batch.entity';
import { CkdSkdBatchReceipt } from './entities/ckd-skd-batch-receipt.entity';
import { CustomsClearance, CustomsClearanceStatus } from './entities/customs-clearance.entity';
import { CustomsClearanceLine } from './entities/customs-clearance-line.entity';
import {
  CkdSkdSerial,
  SerialType,
  SerialStatus,
  SerialSourceType,
} from './entities/ckd-skd-serial.entity';
import { Bom } from './entities/bom.entity';
import { BomLine } from './entities/bom-line.entity';
import { IntegrationEvent, IntegrationEventStatus } from './entities/integration-event.entity';
import { Shipment } from '../shipments/entities/shipment.entity';
import { ShipmentLine } from '../shipments/entities/shipment-line.entity';
import { ShipmentReceipt } from '../shipments/entities/shipment-receipt.entity';
import { ProductItem } from '../products/entities/product-item.entity';
import { Warehouse, WarehouseClassification } from '../lookups/entities/warehouse.entity';
import { StockBalance } from '../inventory/entities/stock-balance.entity';
import { StockTransfer, TransferStatus } from '../inventory/entities/stock-transfer.entity';
import { StockTransferLine } from '../inventory/entities/stock-transfer-line.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CkdSkdService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    @InjectRepository(CkdSkdBatch)
    private readonly batchRepo: Repository<CkdSkdBatch>,
    @InjectRepository(CkdSkdBatchReceipt)
    private readonly batchReceiptRepo: Repository<CkdSkdBatchReceipt>,
    @InjectRepository(CustomsClearance)
    private readonly clearanceRepo: Repository<CustomsClearance>,
    @InjectRepository(CustomsClearanceLine)
    private readonly clearanceLineRepo: Repository<CustomsClearanceLine>,
    @InjectRepository(CkdSkdSerial)
    private readonly serialRepo: Repository<CkdSkdSerial>,
    @InjectRepository(Bom)
    private readonly bomRepo: Repository<Bom>,
    @InjectRepository(BomLine)
    private readonly bomLineRepo: Repository<BomLine>,
    @InjectRepository(IntegrationEvent)
    private readonly eventRepo: Repository<IntegrationEvent>,
    @InjectRepository(Shipment)
    private readonly shipmentRepo: Repository<Shipment>,
    @InjectRepository(ShipmentLine)
    private readonly shipmentLineRepo: Repository<ShipmentLine>,
    @InjectRepository(ShipmentReceipt)
    private readonly receiptRepo: Repository<ShipmentReceipt>,
    @InjectRepository(ProductItem)
    private readonly productRepo: Repository<ProductItem>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    @InjectRepository(StockBalance)
    private readonly stockBalanceRepo: Repository<StockBalance>,
  ) {}

  private async emitIntegrationEvent(
    manager: EntityManager,
    params: {
      eventType: string;
      sourceModule: string;
      sourceRecordId: string;
      targetModule: string;
      idempotencyKey: string;
      payload: Record<string, any>;
    },
  ): Promise<IntegrationEvent> {
    const existing = await manager.findOne(IntegrationEvent, {
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing) return existing;

    const evt = manager.create(IntegrationEvent, {
      eventType: params.eventType,
      sourceModule: params.sourceModule,
      sourceRecordId: params.sourceRecordId,
      targetModule: params.targetModule,
      idempotencyKey: params.idempotencyKey,
      payload: params.payload,
      processingStatus: IntegrationEventStatus.PROCESSED,
      processedAt: new Date(),
    });
    return manager.save(IntegrationEvent, evt);
  }

  // =========================================================================
  // STORY 1: Technical Gap Assessment & Source-of-Truth Module Mapping
  // =========================================================================
  async getModuleMappingSummary() {
    const [
      shipmentCount,
      receiptCount,
      warehouseCount,
      batchCount,
      clearanceCount,
      serialCount,
      bomCount,
      eventCount,
    ] = await Promise.all([
      this.shipmentRepo.count(),
      this.receiptRepo.count(),
      this.warehouseRepo.count(),
      this.batchRepo.count(),
      this.clearanceRepo.count(),
      this.serialRepo.count(),
      this.bomRepo.count(),
      this.eventRepo.count(),
    ]);

    return {
      counts: {
        shipments: shipmentCount,
        receipts: receiptCount,
        warehouses: warehouseCount,
        batches: batchCount,
        clearances: clearanceCount,
        serials: serialCount,
        boms: bomCount,
        events: eventCount,
      },
      sourceOfTruthMapping: [
        { logicalEntity: 'Purchase Order', existingTable: 'purchase_order (po_id)', owner: 'Purchase Orders Module', integrationRole: 'Reference PO' },
        { logicalEntity: 'Import Shipment', existingTable: 'shipment (shipment_id)', owner: 'Shipments Module', integrationRole: 'Reference Shipment & Classification (CBU/CKD/SKD)' },
        { logicalEntity: 'Goods Receipt', existingTable: 'shipment_receipt (receipt_id)', owner: 'Shipments / Inventory', integrationRole: 'Linked via ckd_skd_batch_receipt' },
        { logicalEntity: 'CKD/SKD Batch', existingTable: 'ckd_skd_batch (batch_id)', owner: 'CKD/SKD Integration', integrationRole: 'New batch traceability entity' },
        { logicalEntity: 'Customs Clearance', existingTable: 'customs_clearance & customs_clearance_line', owner: 'CKD/SKD Integration', integrationRole: 'New partial/full clearance & release control' },
        { logicalEntity: 'Warehouse & Location', existingTable: 'warehouse (warehouse_id)', owner: 'Lookups / Inventory', integrationRole: 'Extended with warehouse_classification (BONDED/PRODUCTION/etc.)' },
        { logicalEntity: 'Stock Balance & Transfer', existingTable: 'stock_balance & stock_transfer', owner: 'Inventory Module', integrationRole: 'Single authoritative stock quantity & movement engine' },
        { logicalEntity: 'Component Serials', existingTable: 'ckd_skd_serial + vehicle_unit', owner: 'CKD/SKD + Vehicles', integrationRole: 'VIN, Motor, Engine, Battery, Controller uniqueness & traceability' },
        { logicalEntity: 'BOM & Components', existingTable: 'bom & bom_line', owner: 'CKD/SKD / Production', integrationRole: 'New vehicle Bill of Materials' },
      ],
    };
  }

  // =========================================================================
  // STORY 2 & 3: CKD/SKD Batches & Goods Receipt Integration
  // =========================================================================
  async getBatches(shipmentId?: string) {
    const qb = this.batchRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.shipment', 'shipment')
      .leftJoinAndSelect('b.item', 'item')
      .leftJoinAndSelect('b.uom', 'uom')
      .leftJoinAndSelect('b.batchReceipts', 'br')
      .leftJoinAndSelect('br.receipt', 'receipt')
      .leftJoinAndSelect('receipt.warehouse', 'warehouse')
      .leftJoinAndSelect('br.clearanceLines', 'cl')
      .leftJoinAndSelect('cl.clearance', 'clearance')
      .where('b.isActive = true')
      .orderBy('b.createdAt', 'DESC');

    if (shipmentId) {
      qb.andWhere('b.shipmentId = :shipmentId', { shipmentId });
    }

    const batches = await qb.getMany();
    return batches.map((b) => {
      let totalReceived = 0;
      let totalCleared = 0;
      let totalTransferredToProd = 0;

      for (const br of b.batchReceipts || []) {
        totalReceived += Number(br.receivedQuantity || 0);
        totalTransferredToProd += Number(br.transferredToProductionQty || 0);
        for (const cl of br.clearanceLines || []) {
          if (
            !cl.isReversed &&
            cl.clearance &&
            (cl.clearance.status === CustomsClearanceStatus.CLEARED ||
              cl.clearance.status === CustomsClearanceStatus.PARTIALLY_CLEARED)
          ) {
            totalCleared += Number(cl.clearedQuantity || 0);
          }
        }
      }

      return {
        ...b,
        summary: {
          plannedQuantity: Number(b.plannedQuantity),
          totalReceived,
          totalCleared,
          outstandingClearance: Math.max(0, totalReceived - totalCleared),
          totalTransferredToProduction: totalTransferredToProd,
          readyToTransferToProduction: Math.max(0, totalCleared - totalTransferredToProd),
        },
      };
    });
  }

  async getBatchById(batchId: string) {
    const all = await this.getBatches();
    const found = all.find((b) => String(b.batchId) === String(batchId));
    if (!found) throw new NotFoundException(`CKD/SKD batch #${batchId} not found`);
    return found;
  }

  async createBatch(
    dto: {
      batchCode?: string;
      shipmentId: string;
      shipmentLineId?: string;
      kitType: KitType;
      itemId: string;
      plannedQuantity: number;
      uomId?: number;
      batchDate?: string;
      remarks?: string;
    },
    userId = 1,
  ) {
    const shipment = await this.shipmentRepo.findOne({ where: { shipmentId: dto.shipmentId } });
    if (!shipment) throw new NotFoundException(`Shipment #${dto.shipmentId} not found`);

    const item = await this.productRepo.findOne({ where: { itemId: dto.itemId } });
    if (!item) throw new NotFoundException(`Product item #${dto.itemId} not found`);

    if (!dto.plannedQuantity || Number(dto.plannedQuantity) <= 0) {
      throw new BadRequestException('Planned quantity must be greater than zero');
    }

    const batchCode =
      dto.batchCode?.trim() ||
      `${dto.kitType}-BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const dup = await this.batchRepo.findOne({ where: { batchCode } });
    if (dup) throw new ConflictException(`Batch code ${batchCode} already exists`);

    const batch = this.batchRepo.create({
      batchCode,
      shipmentId: dto.shipmentId,
      shipmentLineId: dto.shipmentLineId || undefined,
      kitType: dto.kitType,
      itemId: dto.itemId,
      plannedQuantity: Number(dto.plannedQuantity),
      uomId: dto.uomId || item.uomId,
      batchDate: dto.batchDate || new Date().toISOString().slice(0, 10),
      remarks: dto.remarks,
      createdBy: userId,
    });

    const saved = await this.batchRepo.save(batch);

    // Update shipment classification if it was CBU
    if (shipment.ckdSkdClassification === 'CBU') {
      shipment.ckdSkdClassification = dto.kitType;
      await this.shipmentRepo.save(shipment);
    }

    await this.auditService.log({
      entityType: 'CKD_SKD_BATCH',
      entityId: String(saved.batchId),
      action: 'INSERT',
      changedBy: userId,
      newValue: saved as any,
    });

    return this.getBatchById(saved.batchId);
  }

  async linkBatchReceipt(
    dto: {
      batchId: string;
      receiptId: string;
      receivedQuantity: number;
      idempotencyKey?: string;
    },
    userId = 1,
  ) {
    if (!dto.receivedQuantity || Number(dto.receivedQuantity) <= 0) {
      throw new BadRequestException('Received quantity must be greater than zero');
    }

    return this.dataSource.transaction(async (manager) => {
      const batch = await manager.findOne(CkdSkdBatch, { where: { batchId: dto.batchId } });
      if (!batch) throw new NotFoundException(`Batch #${dto.batchId} not found`);

      const receipt = await manager.findOne(ShipmentReceipt, {
        where: { receiptId: dto.receiptId },
        relations: ['shipmentLine', 'warehouse'],
      });
      if (!receipt) throw new NotFoundException(`Goods receipt #${dto.receiptId} not found`);

      // Lock existing batch-receipt links for this receipt to enforce DB-04 atomically
      const existingLinks = await manager
        .createQueryBuilder(CkdSkdBatchReceipt, 'br')
        .setLock('pessimistic_write')
        .where('br.receiptId = :receiptId', { receiptId: dto.receiptId })
        .getMany();

      const duplicate = existingLinks.find((l) => String(l.batchId) === String(dto.batchId));
      if (duplicate) {
        throw new ConflictException(`Batch #${dto.batchId} is already linked to receipt #${dto.receiptId}`);
      }

      const alreadyAllocated = existingLinks.reduce((sum, l) => sum + Number(l.receivedQuantity), 0);
      const maxReceiptQty = Number(receipt.quantityReceived);
      if (alreadyAllocated + Number(dto.receivedQuantity) > maxReceiptQty + 0.0001) {
        throw new BadRequestException(
          `Cannot link ${dto.receivedQuantity} units: only ${Math.max(0, maxReceiptQty - alreadyAllocated)} remaining unallocated on receipt #${dto.receiptId} (total receipt qty: ${maxReceiptQty})`,
        );
      }

      const link = manager.create(CkdSkdBatchReceipt, {
        batchId: dto.batchId,
        receiptId: dto.receiptId,
        receivedQuantity: Number(dto.receivedQuantity),
        createdBy: userId,
      });
      const savedLink = await manager.save(CkdSkdBatchReceipt, link);

      await this.emitIntegrationEvent(manager, {
        eventType: 'CKD_SKD_RECEIPT_CONFIRMED',
        sourceModule: 'SHIPMENTS',
        sourceRecordId: String(savedLink.batchReceiptId),
        targetModule: 'ASSEMBLY_MANAGEMENT',
        idempotencyKey: dto.idempotencyKey || `CKD_RECEIPT_${dto.batchId}_${dto.receiptId}`,
        payload: {
          batchId: dto.batchId,
          batchCode: batch.batchCode,
          receiptId: dto.receiptId,
          receivedQuantity: Number(dto.receivedQuantity),
          warehouseId: receipt.warehouseId,
          warehouseClassification: receipt.warehouse?.warehouseClassification,
        },
      });

      await this.auditService.log({
        entityType: 'CKD_SKD_BATCH_RECEIPT',
        entityId: String(savedLink.batchReceiptId),
        action: 'INSERT',
        changedBy: userId,
        newValue: savedLink as any,
      });

      return savedLink;
    });
  }

  async getAvailableReceipts() {
    const receipts = await this.receiptRepo.find({
      relations: ['shipmentLine', 'shipmentLine.shipment', 'shipmentLine.poLine', 'shipmentLine.poLine.item', 'warehouse'],
      order: { receivedAt: 'DESC' },
      take: 100,
    });
    const links = await this.batchReceiptRepo.find();
    const linkedByReceipt = new Map<string, number>();
    for (const l of links) {
      linkedByReceipt.set(
        String(l.receiptId),
        (linkedByReceipt.get(String(l.receiptId)) || 0) + Number(l.receivedQuantity),
      );
    }
    return receipts.map((r) => ({
      ...r,
      linkedQuantity: linkedByReceipt.get(String(r.receiptId)) || 0,
      unlinkedQuantity: Math.max(0, Number(r.quantityReceived) - (linkedByReceipt.get(String(r.receiptId)) || 0)),
    }));
  }

  // =========================================================================
  // STORY 4: Bonded Warehouse Classification Control
  // =========================================================================
  async getWarehousesWithClassification() {
    return this.warehouseRepo.find({ order: { warehouseId: 'ASC' } });
  }

  async updateWarehouseClassification(
    warehouseId: number,
    classification: WarehouseClassification,
    userId = 1,
  ) {
    const wh = await this.warehouseRepo.findOne({ where: { warehouseId } });
    if (!wh) throw new NotFoundException(`Warehouse #${warehouseId} not found`);
    const oldVal = wh.warehouseClassification;
    wh.warehouseClassification = classification;
    const saved = await this.warehouseRepo.save(wh);

    await this.auditService.log({
      entityType: 'WAREHOUSE_CLASSIFICATION',
      entityId: String(warehouseId),
      action: 'UPDATE',
      changedBy: userId,
      oldValue: { warehouseClassification: oldVal },
      newValue: { warehouseClassification: classification },
    });
    return saved;
  }

  // =========================================================================
  // STORY 5: Customs Clearance & Production Release Management
  // =========================================================================
  async getClearances() {
    return this.clearanceRepo.find({
      relations: [
        'lines',
        'lines.batch',
        'lines.batch.item',
        'lines.batchReceipt',
        'lines.batchReceipt.receipt',
        'lines.batchReceipt.receipt.warehouse',
        'creator',
        'approver',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async getOutstandingClearances() {
    const batchReceipts = await this.batchReceiptRepo.find({
      relations: ['batch', 'batch.item', 'batch.shipment', 'receipt', 'receipt.warehouse', 'clearanceLines', 'clearanceLines.clearance'],
      order: { createdAt: 'DESC' },
    });

    return batchReceipts.map((br) => {
      const approvedCleared = (br.clearanceLines || [])
        .filter(
          (cl) =>
            !cl.isReversed &&
            cl.clearance &&
            (cl.clearance.status === CustomsClearanceStatus.CLEARED ||
              cl.clearance.status === CustomsClearanceStatus.PARTIALLY_CLEARED),
        )
        .reduce((s, cl) => s + Number(cl.clearedQuantity), 0);

      const pendingDraftOrSubmitted = (br.clearanceLines || [])
        .filter(
          (cl) =>
            !cl.isReversed &&
            cl.clearance &&
            (cl.clearance.status === CustomsClearanceStatus.DRAFT ||
              cl.clearance.status === CustomsClearanceStatus.SUBMITTED ||
              cl.clearance.status === CustomsClearanceStatus.ON_HOLD),
        )
        .reduce((s, cl) => s + Number(cl.clearedQuantity), 0);

      const receivedQty = Number(br.receivedQuantity);
      const transferredQty = Number(br.transferredToProductionQty || 0);

      return {
        batchReceiptId: br.batchReceiptId,
        batchId: br.batchId,
        batchCode: br.batch?.batchCode,
        kitType: br.batch?.kitType,
        itemId: br.batch?.itemId,
        itemName: br.batch?.item?.itemName,
        itemCode: br.batch?.item?.itemCode,
        shipmentNumber: br.batch?.shipment?.shipmentNumber,
        receiptId: br.receiptId,
        warehouseId: br.receipt?.warehouseId,
        warehouseName: br.receipt?.warehouse?.warehouseName,
        warehouseClassification: br.receipt?.warehouse?.warehouseClassification,
        receivedQuantity: receivedQty,
        approvedClearedQuantity: approvedCleared,
        pendingClearanceQuantity: pendingDraftOrSubmitted,
        outstandingClearanceQuantity: Math.max(0, receivedQty - approvedCleared),
        transferredToProductionQty: transferredQty,
        eligibleToTransferToProduction: Math.max(0, approvedCleared - transferredQty),
      };
    });
  }

  async createCustomsClearance(
    dto: {
      declarationNumber: string;
      clearanceDate?: string;
      documentReference?: string;
      remarks?: string;
      autoSubmit?: boolean;
      lines: Array<{ batchId: string; batchReceiptId: string; clearedQuantity: number }>;
    },
    userId = 1,
  ) {
    if (!dto.declarationNumber?.trim()) {
      throw new BadRequestException('Customs declaration number is required');
    }
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('At least one clearance line is required');
    }

    return this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOne(CustomsClearance, {
        where: { declarationNumber: dto.declarationNumber.trim() },
      });
      if (existing) {
        throw new ConflictException(`Declaration number ${dto.declarationNumber} already exists`);
      }

      for (const line of dto.lines) {
        if (!line.clearedQuantity || Number(line.clearedQuantity) <= 0) {
          throw new BadRequestException('Cleared quantity must be greater than zero');
        }
        // Row-level lock on batch_receipt (DB-05)
        const br = await manager
          .createQueryBuilder(CkdSkdBatchReceipt, 'br')
          .setLock('pessimistic_write')
          .where('br.batchReceiptId = :id AND br.batchId = :batchId', {
            id: line.batchReceiptId,
            batchId: line.batchId,
          })
          .getOne();

        if (!br) {
          throw new NotFoundException(
            `Batch receipt #${line.batchReceiptId} for batch #${line.batchId} not found`,
          );
        }

        const existingLines = await manager
          .createQueryBuilder(CustomsClearanceLine, 'cl')
          .innerJoinAndSelect('cl.clearance', 'c')
          .where('cl.batchReceiptId = :brId AND cl.isReversed = false', { brId: br.batchReceiptId })
          .andWhere('c.status NOT IN (:...excluded)', {
            excluded: [CustomsClearanceStatus.REJECTED, CustomsClearanceStatus.CANCELLED],
          })
          .getMany();

        const alreadyClearedOrPending = existingLines.reduce(
          (sum, cl) => sum + Number(cl.clearedQuantity),
          0,
        );
        const maxQty = Number(br.receivedQuantity);

        if (alreadyClearedOrPending + Number(line.clearedQuantity) > maxQty + 0.0001) {
          throw new BadRequestException(
            `Cleared quantity (${line.clearedQuantity}) exceeds outstanding received quantity (${Math.max(0, maxQty - alreadyClearedOrPending)} available out of ${maxQty}) for batch receipt #${br.batchReceiptId}`,
          );
        }
      }

      const clearance = manager.create(CustomsClearance, {
        declarationNumber: dto.declarationNumber.trim(),
        clearanceDate: dto.clearanceDate || new Date().toISOString().slice(0, 10),
        status: dto.autoSubmit ? CustomsClearanceStatus.SUBMITTED : CustomsClearanceStatus.DRAFT,
        submittedAt: dto.autoSubmit ? new Date() : undefined,
        documentReference: dto.documentReference,
        remarks: dto.remarks,
        createdBy: userId,
      });
      const savedClearance = await manager.save(CustomsClearance, clearance);

      for (const line of dto.lines) {
        const cl = manager.create(CustomsClearanceLine, {
          clearanceId: savedClearance.clearanceId,
          batchId: line.batchId,
          batchReceiptId: line.batchReceiptId,
          clearedQuantity: Number(line.clearedQuantity),
          createdBy: userId,
        });
        await manager.save(CustomsClearanceLine, cl);
      }

      await this.auditService.log({
        entityType: 'CUSTOMS_CLEARANCE',
        entityId: String(savedClearance.clearanceId),
        action: 'INSERT',
        changedBy: userId,
        newValue: dto as any,
      });

      return manager.findOne(CustomsClearance, {
        where: { clearanceId: savedClearance.clearanceId },
        relations: ['lines', 'lines.batch', 'lines.batchReceipt'],
      });
    });
  }

  async approveCustomsClearance(clearanceId: string, userId = 1) {
    return this.dataSource.transaction(async (manager) => {
      const clearance = await manager.findOne(CustomsClearance, {
        where: { clearanceId },
        relations: ['lines', 'lines.batchReceipt'],
      });
      if (!clearance) throw new NotFoundException(`Clearance #${clearanceId} not found`);

      if (
        clearance.status !== CustomsClearanceStatus.DRAFT &&
        clearance.status !== CustomsClearanceStatus.SUBMITTED &&
        clearance.status !== CustomsClearanceStatus.ON_HOLD
      ) {
        throw new BadRequestException(`Cannot approve clearance in status ${clearance.status}`);
      }

      // Check if all lines together represent full or partial clearance of the referenced batch receipts
      let isFull = true;
      for (const line of clearance.lines) {
        const br = await manager
          .createQueryBuilder(CkdSkdBatchReceipt, 'br')
          .setLock('pessimistic_write')
          .where('br.batchReceiptId = :id', { id: line.batchReceiptId })
          .getOne();
        if (!br) continue;

        const approvedSumRes = await manager
          .createQueryBuilder(CustomsClearanceLine, 'cl')
          .innerJoin('cl.clearance', 'c')
          .select('COALESCE(SUM(cl.clearedQuantity), 0)', 'total')
          .where('cl.batchReceiptId = :brId AND cl.isReversed = false', { brId: br.batchReceiptId })
          .andWhere('(c.status IN (:...approved) OR c.clearanceId = :cid)', {
            approved: [CustomsClearanceStatus.CLEARED, CustomsClearanceStatus.PARTIALLY_CLEARED],
            cid: clearanceId,
          })
          .getRawOne();

        const totalCleared = Number(approvedSumRes?.total || 0);
        if (totalCleared > Number(br.receivedQuantity) + 0.0001) {
          throw new BadRequestException(
            `Approval blocked: total cleared quantity (${totalCleared}) exceeds received quantity (${br.receivedQuantity})`,
          );
        }
        if (totalCleared < Number(br.receivedQuantity) - 0.0001) {
          isFull = false;
        }
      }

      const oldStatus = clearance.status;
      clearance.status = isFull ? CustomsClearanceStatus.CLEARED : CustomsClearanceStatus.PARTIALLY_CLEARED;
      clearance.approvedAt = new Date();
      clearance.approvedBy = userId;
      const saved = await manager.save(CustomsClearance, clearance);

      await this.emitIntegrationEvent(manager, {
        eventType: 'CUSTOMS_CLEARANCE_APPROVED',
        sourceModule: 'CUSTOMS_CLEARANCE',
        sourceRecordId: String(saved.clearanceId),
        targetModule: 'INVENTORY',
        idempotencyKey: `CUSTOMS_APPROVED_${saved.clearanceId}`,
        payload: {
          clearanceId: saved.clearanceId,
          declarationNumber: saved.declarationNumber,
          status: saved.status,
          lines: clearance.lines.map((l) => ({
            batchId: l.batchId,
            batchReceiptId: l.batchReceiptId,
            clearedQuantity: Number(l.clearedQuantity),
          })),
        },
      });

      await this.auditService.log({
        entityType: 'CUSTOMS_CLEARANCE',
        entityId: String(saved.clearanceId),
        action: 'UPDATE',
        changedBy: userId,
        oldValue: { status: oldStatus },
        newValue: { status: saved.status, approvedBy: userId },
      });

      return saved;
    });
  }

  async updateClearanceStatus(
    clearanceId: string,
    status: CustomsClearanceStatus.ON_HOLD | CustomsClearanceStatus.REJECTED | CustomsClearanceStatus.CANCELLED | CustomsClearanceStatus.SUBMITTED,
    remarks: string,
    userId = 1,
  ) {
    const clearance = await this.clearanceRepo.findOne({ where: { clearanceId } });
    if (!clearance) throw new NotFoundException(`Clearance #${clearanceId} not found`);

    if (
      clearance.status === CustomsClearanceStatus.CLEARED ||
      clearance.status === CustomsClearanceStatus.PARTIALLY_CLEARED
    ) {
      throw new BadRequestException('Approved clearances cannot be directly rejected/cancelled; use reversal instead');
    }

    const oldStatus = clearance.status;
    clearance.status = status;
    if (status === CustomsClearanceStatus.SUBMITTED) {
      clearance.submittedAt = new Date();
    }
    if (remarks) {
      clearance.remarks = clearance.remarks ? `${clearance.remarks}\n[${status}]: ${remarks}` : `[${status}]: ${remarks}`;
    }
    const saved = await this.clearanceRepo.save(clearance);

    await this.auditService.log({
      entityType: 'CUSTOMS_CLEARANCE',
      entityId: String(saved.clearanceId),
      action: 'UPDATE',
      changedBy: userId,
      oldValue: { status: oldStatus },
      newValue: { status, remarks },
    });
    return saved;
  }

  async reverseClearanceLine(clearanceLineId: string, reason: string, userId = 1) {
    if (!reason?.trim()) {
      throw new BadRequestException('Reversal reason is mandatory for audit compliance');
    }
    const line = await this.clearanceLineRepo.findOne({
      where: { clearanceLineId },
      relations: ['batchReceipt'],
    });
    if (!line) throw new NotFoundException(`Clearance line #${clearanceLineId} not found`);
    if (line.isReversed) throw new BadRequestException('Clearance line is already reversed');

    // Ensure reversing does not drop cleared qty below already transferred to production qty
    const approvedOtherRes = await this.clearanceLineRepo
      .createQueryBuilder('cl')
      .innerJoin('cl.clearance', 'c')
      .select('COALESCE(SUM(cl.clearedQuantity), 0)', 'total')
      .where('cl.batchReceiptId = :brId AND cl.isReversed = false AND cl.clearanceLineId != :lineId', {
        brId: line.batchReceiptId,
        lineId: clearanceLineId,
      })
      .andWhere('c.status IN (:...approved)', {
        approved: [CustomsClearanceStatus.CLEARED, CustomsClearanceStatus.PARTIALLY_CLEARED],
      })
      .getRawOne();

    const remainingCleared = Number(approvedOtherRes?.total || 0);
    const alreadyTransferred = Number(line.batchReceipt?.transferredToProductionQty || 0);
    if (remainingCleared < alreadyTransferred) {
      throw new BadRequestException(
        `Cannot reverse: ${alreadyTransferred} units from this batch receipt have already been transferred to Production Warehouse.`,
      );
    }

    line.isReversed = true;
    line.reversalReason = reason.trim();
    const saved = await this.clearanceLineRepo.save(line);

    await this.auditService.log({
      entityType: 'CUSTOMS_CLEARANCE_LINE',
      entityId: String(clearanceLineId),
      action: 'UPDATE',
      changedBy: userId,
      oldValue: { isReversed: false },
      newValue: { isReversed: true, reversalReason: reason.trim() },
    });

    return saved;
  }

  // =========================================================================
  // STORY 6: Transfer Customs-Released Materials to Production Warehouse
  // =========================================================================
  async transferClearedToProduction(
    dto: {
      batchReceiptId: string;
      toWarehouseId: number;
      quantity: number;
      idempotencyKey?: string;
    },
    userId = 1,
  ) {
    if (!dto.quantity || Number(dto.quantity) <= 0) {
      throw new BadRequestException('Transfer quantity must be greater than zero');
    }

    return this.dataSource.transaction(async (manager) => {
      const br = await manager
        .createQueryBuilder(CkdSkdBatchReceipt, 'br')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('br.batch', 'batch')
        .leftJoinAndSelect('br.receipt', 'receipt')
        .where('br.batchReceiptId = :id', { id: dto.batchReceiptId })
        .getOne();

      if (!br) throw new NotFoundException(`Batch receipt #${dto.batchReceiptId} not found`);

      const fromWarehouseId = br.receipt?.warehouseId;
      if (!fromWarehouseId) {
        throw new BadRequestException('Source goods receipt does not have a warehouse assigned');
      }
      if (fromWarehouseId === Number(dto.toWarehouseId)) {
        throw new BadRequestException('Source and destination warehouse cannot be identical');
      }

      const toWarehouse = await manager.findOne(Warehouse, {
        where: { warehouseId: Number(dto.toWarehouseId) },
      });
      if (!toWarehouse) throw new NotFoundException(`Destination warehouse #${dto.toWarehouseId} not found`);

      if (
        toWarehouse.warehouseClassification !== WarehouseClassification.PRODUCTION &&
        toWarehouse.warehouseClassification !== WarehouseClassification.SATELLITE_STORE
      ) {
        throw new BadRequestException(
          `Destination warehouse "${toWarehouse.warehouseName}" has classification ${toWarehouse.warehouseClassification}. Only PRODUCTION or SATELLITE_STORE warehouses are eligible for production release transfers.`,
        );
      }

      // Sum approved cleared quantities for this batchReceipt
      const clearedRes = await manager
        .createQueryBuilder(CustomsClearanceLine, 'cl')
        .innerJoin('cl.clearance', 'c')
        .select('COALESCE(SUM(cl.clearedQuantity), 0)', 'total')
        .where('cl.batchReceiptId = :brId AND cl.isReversed = false', { brId: br.batchReceiptId })
        .andWhere('c.status IN (:...approved)', {
          approved: [CustomsClearanceStatus.CLEARED, CustomsClearanceStatus.PARTIALLY_CLEARED],
        })
        .getRawOne();

      const approvedClearedQty = Number(clearedRes?.total || 0);
      const alreadyTransferred = Number(br.transferredToProductionQty || 0);
      const eligibleToTransfer = Math.max(0, approvedClearedQty - alreadyTransferred);

      if (Number(dto.quantity) > eligibleToTransfer + 0.0001) {
        throw new BadRequestException(
          `Transfer blocked (IMP-06): Requested ${dto.quantity} units, but only ${eligibleToTransfer} customs-cleared units remain available for transfer (Approved Cleared: ${approvedClearedQty}, Already Transferred: ${alreadyTransferred}).`,
        );
      }

      const itemId = br.batch.itemId;

      // Lock source stock balance
      let srcBalance = await manager
        .createQueryBuilder(StockBalance, 'sb')
        .setLock('pessimistic_write')
        .where('sb.warehouseId = :whId AND sb.itemId = :itemId', { whId: fromWarehouseId, itemId })
        .getOne();

      if (!srcBalance || Number(srcBalance.quantityAvailable) < Number(dto.quantity)) {
        throw new BadRequestException(
          `Insufficient available stock in source warehouse #${fromWarehouseId} (available: ${srcBalance?.quantityAvailable ?? 0}, requested: ${dto.quantity})`,
        );
      }

      srcBalance.quantityOnHand = Number(srcBalance.quantityOnHand) - Number(dto.quantity);
      await manager.save(StockBalance, srcBalance);

      // Lock or create destination stock balance
      let dstBalance = await manager
        .createQueryBuilder(StockBalance, 'sb')
        .setLock('pessimistic_write')
        .where('sb.warehouseId = :whId AND sb.itemId = :itemId', {
          whId: Number(dto.toWarehouseId),
          itemId,
        })
        .getOne();

      if (!dstBalance) {
        dstBalance = manager.create(StockBalance, {
          warehouseId: Number(dto.toWarehouseId),
          itemId,
          quantityOnHand: Number(dto.quantity),
          quantityReserved: 0,
        });
      } else {
        dstBalance.quantityOnHand = Number(dstBalance.quantityOnHand) + Number(dto.quantity);
      }
      await manager.save(StockBalance, dstBalance);

      // Record official StockTransfer in existing Inventory module
      const trf = manager.create(StockTransfer, {
        fromWarehouseId,
        toWarehouseId: Number(dto.toWarehouseId),
        status: TransferStatus.COMPLETED,
        requestedBy: userId,
        approvedBy: userId,
        approvedAt: new Date(),
        completedAt: new Date(),
      });
      const savedTrf = await manager.save(StockTransfer, trf);

      const trfLine = manager.create(StockTransferLine, {
        transferId: savedTrf.transferId,
        itemId,
        quantity: Number(dto.quantity),
      });
      await manager.save(StockTransferLine, trfLine);

      // Update batch receipt transferred qty
      br.transferredToProductionQty = alreadyTransferred + Number(dto.quantity);
      await manager.save(CkdSkdBatchReceipt, br);

      const idemp =
        dto.idempotencyKey || `PROD_TRF_${br.batchReceiptId}_${savedTrf.transferId}`;

      await this.emitIntegrationEvent(manager, {
        eventType: 'PRODUCTION_STOCK_TRANSFERRED',
        sourceModule: 'INVENTORY',
        sourceRecordId: String(savedTrf.transferId),
        targetModule: 'ASSEMBLY_MANAGEMENT',
        idempotencyKey: idemp,
        payload: {
          transferId: savedTrf.transferId,
          transferNumber: savedTrf.transferNumber,
          batchId: br.batchId,
          batchReceiptId: br.batchReceiptId,
          itemId,
          fromWarehouseId,
          toWarehouseId: Number(dto.toWarehouseId),
          quantity: Number(dto.quantity),
        },
      });

      await this.auditService.log({
        entityType: 'PRODUCTION_STOCK_TRANSFER',
        entityId: String(savedTrf.transferId),
        action: 'INSERT',
        changedBy: userId,
        newValue: {
          batchReceiptId: br.batchReceiptId,
          fromWarehouseId,
          toWarehouseId: Number(dto.toWarehouseId),
          quantity: Number(dto.quantity),
        },
      });

      return {
        transfer: savedTrf,
        batchReceiptId: br.batchReceiptId,
        transferredQuantity: Number(dto.quantity),
        totalTransferredToProduction: br.transferredToProductionQty,
      };
    });
  }

  // =========================================================================
  // STORY 7: Capture & Integrate VIN/Chassis and Component Serial Numbers
  // =========================================================================
  async getSerials(filters?: { batchId?: string; serialType?: SerialType; status?: SerialStatus }) {
    const qb = this.serialRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.batch', 'batch')
      .leftJoinAndSelect('s.item', 'item')
      .leftJoinAndSelect('s.warehouse', 'warehouse')
      .leftJoinAndSelect('s.vehicleUnit', 'vehicleUnit')
      .orderBy('s.createdAt', 'DESC');

    if (filters?.batchId) qb.andWhere('s.batchId = :batchId', { batchId: filters.batchId });
    if (filters?.serialType) qb.andWhere('s.serialType = :serialType', { serialType: filters.serialType });
    if (filters?.status) qb.andWhere('s.serialStatus = :status', { status: filters.status });

    return qb.getMany();
  }

  async registerSerials(
    dto: {
      batchId: string;
      batchReceiptId?: string;
      itemId?: string;
      warehouseId?: number;
      sourceType?: SerialSourceType;
      sourceReference?: string;
      serials: Array<{ serialType: SerialType; serialNumber: string }>;
    },
    userId = 1,
  ) {
    if (!dto.serials || dto.serials.length === 0) {
      throw new BadRequestException('At least one serial number entry is required');
    }

    return this.dataSource.transaction(async (manager) => {
      const batch = await manager.findOne(CkdSkdBatch, { where: { batchId: dto.batchId } });
      if (!batch) throw new NotFoundException(`Batch #${dto.batchId} not found`);

      const itemId = dto.itemId || batch.itemId;
      const savedSerials: CkdSkdSerial[] = [];

      for (const entry of dto.serials) {
        const normalized = entry.serialNumber?.trim();
        if (!normalized) {
          throw new BadRequestException(`Empty serial number found for type ${entry.serialType}`);
        }

        // Check duplicate in ckd_skd_serial (DB-06)
        const existing = await manager
          .createQueryBuilder(CkdSkdSerial, 's')
          .where('s.serialType = :type AND LOWER(BTRIM(s.serialNumber)) = LOWER(:num)', {
            type: entry.serialType,
            num: normalized,
          })
          .getOne();

        if (existing) {
          throw new ConflictException(
            `Duplicate ${entry.serialType} serial number "${normalized}" already registered (Serial ID #${existing.serialId})`,
          );
        }

        const record = manager.create(CkdSkdSerial, {
          batchId: dto.batchId,
          batchReceiptId: dto.batchReceiptId || undefined,
          itemId,
          warehouseId: dto.warehouseId || undefined,
          serialType: entry.serialType,
          serialNumber: normalized,
          serialStatus: SerialStatus.RECEIVED,
          sourceType: dto.sourceType || SerialSourceType.IMPORT,
          sourceReference: dto.sourceReference || batch.batchCode,
          receivedAt: new Date(),
          createdBy: userId,
        });

        const saved = await manager.save(CkdSkdSerial, record);
        savedSerials.push(saved);

        await this.emitIntegrationEvent(manager, {
          eventType: 'COMPONENT_SERIAL_REGISTERED',
          sourceModule: 'CKD_SKD',
          sourceRecordId: String(saved.serialId),
          targetModule: 'ASSEMBLY_MANAGEMENT',
          idempotencyKey: `SERIAL_REG_${saved.serialId}`,
          payload: {
            serialId: saved.serialId,
            batchId: dto.batchId,
            serialType: saved.serialType,
            serialNumber: saved.serialNumber,
            itemId,
          },
        });
      }

      await this.auditService.log({
        entityType: 'CKD_SKD_SERIAL_BATCH',
        entityId: String(dto.batchId),
        action: 'INSERT',
        changedBy: userId,
        newValue: { count: savedSerials.length, serials: dto.serials },
      });

      return savedSerials;
    });
  }

  async updateSerialStatus(serialId: string, status: SerialStatus, userId = 1) {
    const serial = await this.serialRepo.findOne({ where: { serialId } });
    if (!serial) throw new NotFoundException(`Serial #${serialId} not found`);
    const oldStatus = serial.serialStatus;
    serial.serialStatus = status;
    serial.updatedBy = userId;
    const saved = await this.serialRepo.save(serial);

    await this.auditService.log({
      entityType: 'CKD_SKD_SERIAL',
      entityId: String(serialId),
      action: 'UPDATE',
      changedBy: userId,
      oldValue: { serialStatus: oldStatus },
      newValue: { serialStatus: status },
    });
    return saved;
  }

  // =========================================================================
  // STORY 8: BOM & Component Master Integration
  // =========================================================================
  async getBoms() {
    return this.bomRepo.find({
      relations: ['item', 'lines', 'lines.componentItem', 'lines.uom'],
      order: { createdAt: 'DESC' },
    });
  }

  async getBomByProduct(itemId: string) {
    return this.bomRepo.find({
      where: { itemId, status: 'ACTIVE' },
      relations: ['item', 'lines', 'lines.componentItem', 'lines.uom'],
    });
  }

  async createBom(
    dto: {
      bomCode?: string;
      itemId: string;
      version?: string;
      notes?: string;
      lines: Array<{
        componentItemId: string;
        requiredQuantity: number;
        uomId?: number;
        isSerialized?: boolean;
        serialType?: string;
      }>;
    },
    userId = 1,
  ) {
    const item = await this.productRepo.findOne({ where: { itemId: dto.itemId } });
    if (!item) throw new NotFoundException(`Vehicle product #${dto.itemId} not found`);
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('BOM must contain at least one component line');
    }

    const bomCode =
      dto.bomCode?.trim() || `BOM-${item.itemCode}-${dto.version || '1.0'}-${Date.now().toString().slice(-4)}`;

    const bom = this.bomRepo.create({
      bomCode,
      itemId: dto.itemId,
      version: dto.version || '1.0',
      status: 'ACTIVE',
      notes: dto.notes,
      createdBy: userId,
    });
    const savedBom = await this.bomRepo.save(bom);

    for (const l of dto.lines) {
      const comp = await this.productRepo.findOne({ where: { itemId: l.componentItemId } });
      if (!comp) throw new NotFoundException(`Component item #${l.componentItemId} not found`);
      const line = this.bomLineRepo.create({
        bomId: savedBom.bomId,
        componentItemId: l.componentItemId,
        requiredQuantity: Number(l.requiredQuantity),
        uomId: l.uomId || comp.uomId,
        isSerialized: Boolean(l.isSerialized),
        serialType: l.serialType || undefined,
      });
      await this.bomLineRepo.save(line);
    }

    return this.bomRepo.findOne({
      where: { bomId: savedBom.bomId },
      relations: ['item', 'lines', 'lines.componentItem', 'lines.uom'],
    });
  }

  // =========================================================================
  // STORY 9: Production Material Eligibility & Reservation Validation
  // =========================================================================
  async validateProductionEligibility(params: {
    itemId: string;
    warehouseId?: number;
    requestedQuantity?: number;
  }) {
    const balances = await this.stockBalanceRepo.find({
      where: {
        itemId: params.itemId,
        ...(params.warehouseId ? { warehouseId: Number(params.warehouseId) } : {}),
      },
      relations: ['warehouse', 'item'],
    });

    const outstandingClearances = await this.getOutstandingClearances();
    const itemClearances = outstandingClearances.filter((c) => String(c.itemId) === String(params.itemId));

    const totalApprovedCleared = itemClearances.reduce((s, c) => s + c.approvedClearedQuantity, 0);
    const totalTransferredToProd = itemClearances.reduce((s, c) => s + c.transferredToProductionQty, 0);

    const warehouseBreakdown = balances.map((sb) => {
      const cls = sb.warehouse?.warehouseClassification || WarehouseClassification.STANDARD;
      const isProductionLocation =
        cls === WarehouseClassification.PRODUCTION || cls === WarehouseClassification.SATELLITE_STORE;
      const available = Number(sb.quantityAvailable || 0);

      // Bonded stock is NEVER eligible (DB-09 / IMP-04)
      const eligibleQty = isProductionLocation ? available : 0;

      return {
        warehouseId: sb.warehouseId,
        warehouseName: sb.warehouse?.warehouseName,
        warehouseClassification: cls,
        isProductionEligibleLocation: isProductionLocation,
        quantityOnHand: Number(sb.quantityOnHand),
        quantityReserved: Number(sb.quantityReserved),
        quantityAvailable: available,
        eligibleForProductionQty: eligibleQty,
        exclusionReason: isProductionLocation
          ? null
          : `Warehouse classification is ${cls} (must be PRODUCTION or SATELLITE_STORE after customs release)`,
      };
    });

    const totalProductionEligibleQty = warehouseBreakdown.reduce(
      (s, w) => s + w.eligibleForProductionQty,
      0,
    );

    const requested = Number(params.requestedQuantity || 0);
    const canReserve = requested > 0 ? totalProductionEligibleQty >= requested : totalProductionEligibleQty > 0;

    return {
      itemId: params.itemId,
      requestedQuantity: requested,
      totalProductionEligibleQty,
      canReserve,
      customsSummary: {
        totalApprovedCleared,
        totalTransferredToProduction: totalTransferredToProd,
      },
      warehouseBreakdown,
    };
  }

  // =========================================================================
  // STORY 10: Integration Events Outbox
  // =========================================================================
  async getIntegrationEvents() {
    return this.eventRepo.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
}
