import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { ImportRequisition, ImportRequisitionStatus } from './entities/import-requisition.entity';
import { ImportRequisitionLine } from './entities/import-requisition-line.entity';
import { ProductItem } from '../products/entities/product-item.entity';
import { PurchaseOrder, POStatus } from '../purchase-orders/entities/purchase-order.entity';
import { PurchaseOrderLine } from '../purchase-orders/entities/purchase-order-line.entity';
import { ExchangeRateDefault } from '../shipments/entities/exchange-rate-default.entity';
import {
  CreateImportRequisitionDto,
  UpdateImportRequisitionDto,
  ConvertRequisitionToPODto,
} from './dto/create-import-requisition.dto';
import { AuditService } from '../audit/audit.service';
import { formatAmountInWords } from '../purchase-orders/utils/amount-in-words';

@Injectable()
export class ImportRequisitionsService {
  constructor(
    @InjectRepository(ImportRequisition)
    private readonly reqRepo: Repository<ImportRequisition>,
    @InjectRepository(ImportRequisitionLine)
    private readonly lineRepo: Repository<ImportRequisitionLine>,
    @InjectRepository(ProductItem)
    private readonly productRepo: Repository<ProductItem>,
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderLine)
    private readonly poLineRepo: Repository<PurchaseOrderLine>,
    @InjectRepository(ExchangeRateDefault)
    private readonly exchangeRateRepo: Repository<ExchangeRateDefault>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  private normalizeCurrency(currency: string): string {
    return (currency || 'USD').trim().toUpperCase();
  }

  private async assertConfiguredCurrency(currency: string): Promise<string> {
    const norm = this.normalizeCurrency(currency);
    const configured = await this.exchangeRateRepo.findOne({ where: { currency: norm } });
    if (!configured) {
      throw new BadRequestException(`No default exchange rate is configured for currency ${norm}`);
    }
    return norm;
  }

  async findAll(params?: {
    search?: string;
    status?: ImportRequisitionStatus;
    businessUnitId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params?.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.reqRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.requester', 'req')
      .leftJoinAndSelect('r.approver', 'app')
      .leftJoinAndSelect('r.lines', 'lines')
      .leftJoinAndSelect('lines.item', 'item');

    if (params?.search) {
      qb.andWhere(
        '(r.requisitionNumber ILIKE :s OR r.justification ILIKE :s OR r.businessUnitId ILIKE :s OR item.itemName ILIKE :s OR item.itemCode ILIKE :s)',
        { s: `%${params.search}%` },
      );
    }

    if (params?.status) {
      qb.andWhere('r.status = :st', { st: params.status });
    }

    if (params?.businessUnitId) {
      qb.andWhere('r.businessUnitId ILIKE :bu', { bu: `%${params.businessUnitId}%` });
    }

    qb.orderBy('r.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<ImportRequisition> {
    const req = await this.reqRepo.findOne({
      where: { requisitionId: id },
      relations: ['requester', 'approver', 'lines', 'lines.item', 'lines.item.category', 'lines.item.brand'],
    });

    if (!req) {
      throw new NotFoundException(`Import Requisition #${id} not found`);
    }

    return req;
  }

  async create(dto: CreateImportRequisitionDto, userId: number = 1): Promise<ImportRequisition> {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Import Requisition must contain at least one line item');
    }

    const currency = await this.assertConfiguredCurrency(dto.currency);

    // Verify all item IDs
    const itemIds = dto.lines.map((l) => l.itemId);
    const items = await this.productRepo.find({ where: { itemId: In(itemIds) } });
    if (items.length !== itemIds.length) {
      throw new BadRequestException('One or more selected products do not exist');
    }

    // Validate quantities and prices
    let calculatedBudget = 0;
    for (const line of dto.lines) {
      const qty = Number(line.quantityRequested);
      const price = Number(line.estimatedUnitPrice || 0);
      if (isNaN(qty) || qty < 1) {
        throw new BadRequestException('Line quantity requested must be at least 1');
      }
      if (price < 0) {
        throw new BadRequestException('Line estimated unit price cannot be negative');
      }
      calculatedBudget += qty * price;
    }

    const savedReqId = await this.dataSource.transaction(async (manager) => {
      const req = manager.create(ImportRequisition, {
        businessUnitId: dto.businessUnitId || 'Fleet & Commercial Vehicle Assembly',
        requestedBy: dto.userId || userId,
        requestDate: dto.requestDate || new Date().toISOString().split('T')[0],
        requiredDeliveryDate: dto.requiredDeliveryDate,
        justification: dto.justification,
        estimatedBudget: dto.estimatedBudget || calculatedBudget,
        currency,
        status: ImportRequisitionStatus.DRAFT,
      });

      const savedReq = await manager.save(ImportRequisition, req);

      const lines = dto.lines.map((l) =>
        manager.create(ImportRequisitionLine, {
          requisitionId: savedReq.requisitionId,
          itemId: l.itemId,
          quantityRequested: l.quantityRequested,
          estimatedUnitPrice: l.estimatedUnitPrice || 0,
          currency,
          technicalSpecification: l.technicalSpecification,
          qualityRequirements: l.qualityRequirements,
          intendedApplication: l.intendedApplication,
          notes: l.notes,
        }),
      );

      await manager.save(ImportRequisitionLine, lines);

      await this.auditService.log({
        entityType: 'import_requisition',
        entityId: savedReq.requisitionId,
        action: 'INSERT',
        changedBy: dto.userId || userId,
        newValue: {
          requisitionNumber: savedReq.requisitionNumber,
          businessUnitId: savedReq.businessUnitId,
          linesCount: lines.length,
          estimatedBudget: savedReq.estimatedBudget,
        },
      });

      return savedReq.requisitionId;
    });

    return this.findOne(savedReqId);
  }

  async update(id: string, dto: UpdateImportRequisitionDto, userId: number = 1): Promise<ImportRequisition> {
    const req = await this.findOne(id);
    if (req.status !== ImportRequisitionStatus.DRAFT && req.status !== ImportRequisitionStatus.REJECTED) {
      throw new BadRequestException(`Cannot edit requisition in ${req.status} status. Only DRAFT or REJECTED can be edited.`);
    }

    const currency = dto.currency ? await this.assertConfiguredCurrency(dto.currency) : req.currency;

    await this.dataSource.transaction(async (manager) => {
      req.businessUnitId = dto.businessUnitId ?? req.businessUnitId;
      req.requestDate = dto.requestDate ?? req.requestDate;
      req.requiredDeliveryDate = dto.requiredDeliveryDate ?? req.requiredDeliveryDate;
      req.justification = dto.justification ?? req.justification;
      req.currency = currency;
      if (req.status === ImportRequisitionStatus.REJECTED) {
        req.status = ImportRequisitionStatus.DRAFT; // Reset to DRAFT upon editing after rejection
      }

      if (dto.lines && dto.lines.length > 0) {
        let calculatedBudget = 0;
        for (const line of dto.lines) {
          const qty = Number(line.quantityRequested);
          const price = Number(line.estimatedUnitPrice || 0);
          if (isNaN(qty) || qty < 1) {
            throw new BadRequestException('Line quantity requested must be at least 1');
          }
          calculatedBudget += qty * price;
        }
        req.estimatedBudget = dto.estimatedBudget || calculatedBudget;

        await manager.delete(ImportRequisitionLine, { requisitionId: id });
        const updatedLines = dto.lines.map((l) =>
          manager.create(ImportRequisitionLine, {
            requisitionId: id,
            itemId: l.itemId,
            quantityRequested: l.quantityRequested,
            estimatedUnitPrice: l.estimatedUnitPrice || 0,
            currency,
            technicalSpecification: l.technicalSpecification,
            qualityRequirements: l.qualityRequirements,
            intendedApplication: l.intendedApplication,
            notes: l.notes,
          }),
        );
        await manager.save(ImportRequisitionLine, updatedLines);
        delete (req as any).lines;
      }

      await manager.save(ImportRequisition, req);

      await this.auditService.log({
        entityType: 'import_requisition',
        entityId: id,
        action: 'UPDATE',
        changedBy: userId,
        newValue: { status: req.status, estimatedBudget: req.estimatedBudget },
      });
    });

    return this.findOne(id);
  }

  async submit(id: string, userId: number = 1): Promise<ImportRequisition> {
    const req = await this.findOne(id);
    if (req.status !== ImportRequisitionStatus.DRAFT && req.status !== ImportRequisitionStatus.REJECTED) {
      throw new BadRequestException(`Cannot submit requisition in ${req.status} status`);
    }

    req.status = ImportRequisitionStatus.SUBMITTED;
    await this.reqRepo.save(req);

    await this.auditService.log({
      entityType: 'import_requisition',
      entityId: id,
      action: 'UPDATE',
      changedBy: userId,
      newValue: { status: ImportRequisitionStatus.SUBMITTED },
    });

    return this.findOne(id);
  }

  async approve(id: string, approvalNotes?: string, userId: number = 1): Promise<ImportRequisition> {
    const req = await this.findOne(id);
    if (req.status !== ImportRequisitionStatus.SUBMITTED) {
      throw new BadRequestException(`Cannot approve requisition in ${req.status} status. It must be SUBMITTED first.`);
    }

    req.status = ImportRequisitionStatus.APPROVED;
    req.approvedBy = userId;
    req.approvedAt = new Date();
    req.approvalNotes = approvalNotes;
    await this.reqRepo.save(req);

    await this.auditService.log({
      entityType: 'import_requisition',
      entityId: id,
      action: 'UPDATE',
      changedBy: userId,
      newValue: { status: ImportRequisitionStatus.APPROVED, approvedAt: req.approvedAt, approvalNotes },
    });

    return this.findOne(id);
  }

  async reject(id: string, reason: string, userId: number = 1): Promise<ImportRequisition> {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('A reason must be provided to reject a requisition');
    }
    const req = await this.findOne(id);
    if (req.status !== ImportRequisitionStatus.SUBMITTED) {
      throw new BadRequestException(`Cannot reject requisition in ${req.status} status`);
    }

    req.status = ImportRequisitionStatus.REJECTED;
    req.rejectionReason = reason.trim();
    await this.reqRepo.save(req);

    await this.auditService.log({
      entityType: 'import_requisition',
      entityId: id,
      action: 'UPDATE',
      changedBy: userId,
      newValue: { status: ImportRequisitionStatus.REJECTED, rejectionReason: reason },
    });

    return this.findOne(id);
  }

  async cancel(id: string, userId: number = 1): Promise<ImportRequisition> {
    const req = await this.findOne(id);
    if (req.status === ImportRequisitionStatus.CONVERTED_TO_PO) {
      throw new BadRequestException('Cannot cancel requisition that has already been converted to a Purchase Order');
    }

    req.status = ImportRequisitionStatus.CANCELLED;
    await this.reqRepo.save(req);

    await this.auditService.log({
      entityType: 'import_requisition',
      entityId: id,
      action: 'UPDATE',
      changedBy: userId,
      newValue: { status: ImportRequisitionStatus.CANCELLED },
    });

    return this.findOne(id);
  }

  /**
   * Story IMP-04 & IMP-05: Stock, Outstanding Order, and Requisition Review
   * Provides planning intelligence comparing current stock, open POs, and open requisitions.
   */
  async getStockAndOrderReview(itemId: string) {
    const item = await this.productRepo.findOne({
      where: { itemId },
      relations: ['category', 'brand'],
    });

    if (!item) {
      throw new NotFoundException(`Product #${itemId} not found`);
    }

    // 1. Current physical stock from stock_balance or vehicle units
    const stockQuery = await this.dataSource.query(
      `SELECT 
        COALESCE(SUM(quantity_on_hand), 0) AS on_hand,
        COALESCE(SUM(quantity_reserved), 0) AS reserved
       FROM stock_balance 
       WHERE item_id = $1`,
      [itemId],
    );
    const stockOnHand = Number(stockQuery?.[0]?.on_hand || 0);
    const stockReserved = Number(stockQuery?.[0]?.reserved || 0);
    const stockAvailable = Math.max(0, stockOnHand - stockReserved);

    // 2. Outstanding PO quantities currently in CONFIRMED or PARTIALLY_RECEIVED status
    const poQuery = await this.dataSource.query(
      `SELECT COALESCE(SUM(pol.quantity_ordered), 0) AS open_po_qty
       FROM purchase_order_line pol
       JOIN purchase_order po ON po.po_id = pol.po_id
       WHERE pol.item_id = $1 AND po.status IN ('CONFIRMED', 'PARTIALLY_RECEIVED')`,
      [itemId],
    );
    const openPOQuantity = Number(poQuery?.[0]?.open_po_qty || 0);

    // 3. Pending/approved requisitions not yet converted to PO
    const reqQuery = await this.dataSource.query(
      `SELECT COALESCE(SUM(rl.quantity_requested), 0) AS open_req_qty
       FROM import_requisition_line rl
       JOIN import_requisition r ON r.requisition_id = rl.requisition_id
       WHERE rl.item_id = $1 AND r.status IN ('SUBMITTED', 'APPROVED')`,
      [itemId],
    );
    const pendingRequisitionQuantity = Number(reqQuery?.[0]?.open_req_qty || 0);

    // 4. Recommendation heuristic: Min stock safety buffer
    const minimumOrderQuantity = 10;
    const safetyStockThreshold = 15;
    const totalPipeline = stockAvailable + openPOQuantity + pendingRequisitionQuantity;
    const suggestedOrderQuantity = totalPipeline < safetyStockThreshold ? Math.max(minimumOrderQuantity, safetyStockThreshold - totalPipeline) : 0;

    return {
      itemId: item.itemId,
      itemCode: item.itemCode,
      itemName: item.itemName,
      category: item.category?.categoryName,
      brand: item.brand?.brandName,
      stockOnHand,
      stockReserved,
      stockAvailable,
      openPOQuantity,
      pendingRequisitionQuantity,
      totalPipeline,
      minimumOrderQuantity,
      safetyStockThreshold,
      suggestedOrderQuantity,
    };
  }

  /**
   * Story IMP-06: Convert Approved Requisition to Purchase Order
   * Links generated PO to originating requisition and prevents duplicate conversion.
   */
  async convertToPO(requisitionId: string, dto: ConvertRequisitionToPODto, userId: number = 1): Promise<PurchaseOrder> {
    const requisition = await this.findOne(requisitionId);

    if (requisition.status === ImportRequisitionStatus.CONVERTED_TO_PO) {
      throw new ConflictException(`Requisition ${requisition.requisitionNumber} has already been converted to a Purchase Order`);
    }

    if (requisition.status !== ImportRequisitionStatus.APPROVED) {
      throw new BadRequestException(`Only APPROVED requisitions can be converted to Purchase Orders. (Current status: ${requisition.status})`);
    }

    if (!requisition.lines || requisition.lines.length === 0) {
      throw new BadRequestException('Requisition has no line items to convert');
    }

    // Generate PO in a transaction
    const poId = await this.dataSource.transaction(async (manager) => {
      // 1. Generate PO number
      await manager.query(`CREATE SEQUENCE IF NOT EXISTS po_number_seq START 1;`);
      const seqRes = await manager.query(`SELECT nextval('po_number_seq') AS value`);
      const poNumber = `PO-${String(seqRes[0].value).padStart(6, '0')}`;

      // 2. Calculate grand total for amount in words
      let totalAmount = 0;
      for (const rl of requisition.lines) {
        totalAmount += Number(rl.quantityRequested) * Number(rl.estimatedUnitPrice || 0);
      }
      const amountInWords = formatAmountInWords(totalAmount, requisition.currency);

      // 3. Create PO header
      const po = manager.create(PurchaseOrder, {
        poNumber,
        supplierId: dto.supplierId,
        poDate: dto.poDate || new Date().toISOString().split('T')[0],
        currency: requisition.currency,
        status: POStatus.DRAFT,
        requisitionId: requisition.requisitionId,
        incoterms: dto.incoterms || 'FOB',
        paymentTerms: dto.paymentTerms || '30% Advance T/T, 70% against Bill of Lading',
        portOfLoading: dto.portOfLoading || 'Nhava Sheva (JNPT), Mumbai, India',
        portOfDischarge: dto.portOfDischarge || 'Djibouti Free Port / Mojo Dry Port',
        modeOfShipment: dto.modeOfShipment || 'SEA',
        bankAccountId: dto.bankAccountId || 1,
        amountInWords,
        notes: dto.notes || `Generated from Requisition ${requisition.requisitionNumber}. ${requisition.justification || ''}`,
        createdBy: userId,
        updatedBy: userId,
      });

      const savedPo = await manager.save(PurchaseOrder, po);

      // 4. Create PO lines
      const poLines = requisition.lines.map((rl) =>
        manager.create(PurchaseOrderLine, {
          poId: savedPo.poId,
          itemId: rl.itemId,
          quantityOrdered: rl.quantityRequested,
          unitPrice: rl.estimatedUnitPrice > 0 ? rl.estimatedUnitPrice : 1000,
          currency: requisition.currency,
          hsnSacCode: '8711.20',
          uom: 'PCS',
          itemDescription: rl.technicalSpecification || rl.intendedApplication || undefined,
        }),
      );

      await manager.save(PurchaseOrderLine, poLines);

      // 5. Update Requisition status to CONVERTED_TO_PO
      requisition.status = ImportRequisitionStatus.CONVERTED_TO_PO;
      await manager.save(ImportRequisition, requisition);

      await this.auditService.log({
        entityType: 'import_requisition',
        entityId: requisition.requisitionId,
        action: 'UPDATE',
        changedBy: userId,
        newValue: {
          status: ImportRequisitionStatus.CONVERTED_TO_PO,
          generatedPoNumber: savedPo.poNumber,
          generatedPoId: savedPo.poId,
        },
      });

      return savedPo.poId;
    });

    const fullPO = await this.poRepo.findOne({
      where: { poId },
      relations: ['supplier', 'lines', 'lines.item', 'requisition', 'bankAccount'],
    });

    return fullPO!;
  }
}

