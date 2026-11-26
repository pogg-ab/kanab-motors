import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { ImportRequisition, ImportRequisitionStatus } from './entities/import-requisition.entity';
import { ImportRequisitionLine } from './entities/import-requisition-line.entity';
import { ProductItem } from '../products/entities/product-item.entity';
import { PurchaseOrder, POStatus } from '../purchase-orders/entities/purchase-order.entity';
import { PurchaseOrderLine } from '../purchase-orders/entities/purchase-order-line.entity';
import { PoPaymentSchedule } from '../purchase-orders/entities/po-payment-schedule.entity';
import { CompanyProfile } from '../purchase-orders/entities/company-profile.entity';
import { CompanyBankAccount } from '../purchase-orders/entities/company-bank-account.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
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
        requestedBy: userId,
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
          supplierMoq: l.supplierMoq,
          planningLeadTimeDays: l.planningLeadTimeDays,
          demandRationale: l.demandRationale,
          notes: l.notes,
        }),
      );

      await manager.save(ImportRequisitionLine, lines);

      await this.auditService.log({
        entityType: 'import_requisition',
        entityId: savedReq.requisitionId,
        action: 'INSERT',
        changedBy: userId,
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
      const locked=await manager.findOne(ImportRequisition,{where:{requisitionId:id},lock:{mode:'pessimistic_write'}});
      if(!locked || ![ImportRequisitionStatus.DRAFT,ImportRequisitionStatus.REJECTED].includes(locked.status)) throw new ConflictException('Requisition is no longer editable');
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
            supplierMoq: l.supplierMoq,
            planningLeadTimeDays: l.planningLeadTimeDays,
            demandRationale: l.demandRationale,
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
    const previousStatus=req.status;
    if (req.status !== ImportRequisitionStatus.DRAFT && req.status !== ImportRequisitionStatus.REJECTED) {
      throw new BadRequestException(`Cannot submit requisition in ${req.status} status`);
    }

    req.status = ImportRequisitionStatus.SUBMITTED;
    const changed=await this.reqRepo.update({requisitionId:id,status:previousStatus},{status:req.status,approvedBy:req.approvedBy,approvedAt:req.approvedAt,approvalNotes:req.approvalNotes,rejectionReason:req.rejectionReason});
    if(!changed.affected) throw new ConflictException('Requisition changed; reload and retry');

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
    const previousStatus=req.status;
    if (req.status !== ImportRequisitionStatus.SUBMITTED) {
      throw new BadRequestException(`Cannot approve requisition in ${req.status} status. It must be SUBMITTED first.`);
    }

    req.status = ImportRequisitionStatus.APPROVED;
    req.approvedBy = userId;
    req.approvedAt = new Date();
    req.approvalNotes = approvalNotes;
    const changed=await this.reqRepo.update({requisitionId:id,status:previousStatus},{status:req.status,approvedBy:req.approvedBy,approvedAt:req.approvedAt,approvalNotes:req.approvalNotes,rejectionReason:req.rejectionReason});
    if(!changed.affected) throw new ConflictException('Requisition changed; reload and retry');

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
    const previousStatus=req.status;
    if (req.status !== ImportRequisitionStatus.SUBMITTED) {
      throw new BadRequestException(`Cannot reject requisition in ${req.status} status`);
    }

    req.status = ImportRequisitionStatus.REJECTED;
    req.rejectionReason = reason.trim();
    const changed=await this.reqRepo.update({requisitionId:id,status:previousStatus},{status:req.status,approvedBy:req.approvedBy,approvedAt:req.approvedAt,approvalNotes:req.approvalNotes,rejectionReason:req.rejectionReason});
    if(!changed.affected) throw new ConflictException('Requisition changed; reload and retry');

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
    const previousStatus=req.status;
    if (req.status === ImportRequisitionStatus.CONVERTED_TO_PO) {
      throw new BadRequestException('Cannot cancel requisition that has already been converted to a Purchase Order');
    }

    req.status = ImportRequisitionStatus.CANCELLED;
    const changed=await this.reqRepo.update({requisitionId:id,status:previousStatus},{status:req.status,approvedBy:req.approvedBy,approvedAt:req.approvedAt,approvalNotes:req.approvalNotes,rejectionReason:req.rejectionReason});
    if(!changed.affected) throw new ConflictException('Requisition changed; reload and retry');

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
  async getStockAndOrderReview(itemId: string, planning: { supplierMoq?: number; demandQuantity?: number; planningLeadTimeDays?: number } = {}) {
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

    // 2. Outstanding PO quantities currently in CONFIRMED or PARTIALLY_RECEIVED status (deducting received goods)
    const poQuery = await this.dataSource.query(
      `SELECT COALESCE(SUM(GREATEST(0, pol.quantity_ordered - COALESCE(rcv.received_qty, 0))), 0) AS open_po_qty
       FROM purchase_order_line pol
       JOIN purchase_order po ON po.po_id = pol.po_id
       LEFT JOIN (
         SELECT po_line_id, COALESCE(SUM(quantity_received), 0) AS received_qty
         FROM shipment_line
         GROUP BY po_line_id
       ) rcv ON rcv.po_line_id = pol.po_line_id
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

    // 4. Recommendation heuristic: Min stock safety buffer using item's reorderLevel if set (IMP-05)
    for(const value of [planning.supplierMoq,planning.demandQuantity,planning.planningLeadTimeDays]) if(value!==undefined && (!Number.isFinite(Number(value))||Number(value)<0)) throw new BadRequestException('Planning inputs must be non-negative numbers');
    const minimumOrderQuantity = Math.max(1, Number(planning.supplierMoq)||1);
    const safetyStockThreshold = item.reorderLevel && Number(item.reorderLevel) > 0 ? Number(item.reorderLevel) : 0;
    const totalPipeline = stockAvailable + openPOQuantity + pendingRequisitionQuantity;
    const target = Math.max(safetyStockThreshold, Number(planning.demandQuantity)||0);
    const suggestedOrderQuantity = totalPipeline < target ? Math.max(minimumOrderQuantity, target - totalPipeline) : 0;

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
    const poId = await this.dataSource.transaction(async (manager) => {
      // 0. Pessimistic lock on requisition to prevent concurrent duplicate conversion
      const locked = await manager.findOne(ImportRequisition, {
        where: { requisitionId }, lock: { mode: 'pessimistic_write' },
      });
      const requisition = locked ? await manager.findOne(ImportRequisition, {
        where: { requisitionId }, relations: ['lines', 'lines.item', 'lines.item.uom'],
      }) : null;
      if (!requisition) {
        throw new NotFoundException(`Import Requisition #${requisitionId} not found`);
      }

      if (requisition.status === ImportRequisitionStatus.CONVERTED_TO_PO) {
        throw new ConflictException(`Requisition ${requisition.requisitionNumber} has already been converted to a Purchase Order`);
      }

      if (requisition.status !== ImportRequisitionStatus.APPROVED) {
        throw new BadRequestException(`Only APPROVED requisitions can be converted to Purchase Orders. (Current status: ${requisition.status})`);
      }

      if (!requisition.lines || requisition.lines.length === 0) {
        throw new BadRequestException('Requisition has no line items to convert');
      }

      // 1. Verify positive prices for all lines (do NOT silently replace with 1000)
      for (const rl of requisition.lines) {
        const unitPrice = Number(rl.estimatedUnitPrice);
        if (isNaN(unitPrice) || unitPrice <= 0) {
          throw new BadRequestException(
            `Line item #${rl.itemId} has an invalid or zero estimated price. Requisition lines must have a valid estimated price before conversion.`,
          );
        }
      }

      // 2. Generate PO number
      await manager.query(`CREATE SEQUENCE IF NOT EXISTS po_number_seq START 1;`);
      const seqRes = await manager.query(`SELECT nextval('po_number_seq') AS value`);
      const poNumber = `PO-${String(seqRes[0].value).padStart(6, '0')}`;

      // 3. Calculate grand total for amount in words
      let totalAmount = 0;
      for (const rl of requisition.lines) {
        totalAmount += Math.round(Number(rl.quantityRequested) * Number(rl.estimatedUnitPrice || 0) * 100) / 100;
      }
      const amountInWords = formatAmountInWords(totalAmount, requisition.currency);

      // Snapshots for supplier, company, and bank (POX-01, POX-02, POX-03)
      const supplier = await manager.findOne(Supplier, { where: { supplierId: dto.supplierId } });
      const company = await manager.findOne(CompanyProfile, { where: { isDefault: true, isActive: true } });
      const bank = dto.bankAccountId
        ? await manager.findOne(CompanyBankAccount, { where: { bankAccountId: Number(dto.bankAccountId) } })
        : await manager.findOne(CompanyBankAccount, { where: { isActive: true, isDefault: true } });

      if (!supplier || !bank?.isActive) throw new BadRequestException('Valid supplier and active bank account required');
      const supplierSnapshot = supplier
        ? {
            supplierId: supplier.supplierId,
            supplierName: supplier.supplierName,
            exporterIecNo: supplier.exporterIecNo || 'N/A',
            exporterAdCode: supplier.exporterAdCode || 'N/A',
            country: supplier.country || 'India',
          }
        : undefined;

      const companySnapshot = company
        ? {
            companyName: company.companyName,
            tradeName: company.tradeName,
            logo: company.logo,
            importerIecNo: company.importerIecNo || (company as any).iecNo || 'N/A',
            importerAdCode: company.importerAdCode || (company as any).adCode || 'N/A',
            tin: company.tin || company.taxId || 'N/A',
          }
        : undefined;

      const bankSnapshot = bank
        ? {
            bankAccountId: bank.bankAccountId,
            accountName: bank.accountName,
            bankName: bank.bankName,
            accountNumber: bank.accountNumber,
            bankBranch: bank.bankBranch,
            ifscCode: bank.ifscCode,
            swiftCode: bank.swiftCode,
            currency: bank.currency,
          }
        : undefined;

      // 4. Create PO header
      const po = manager.create(PurchaseOrder, {
        poNumber,
        supplierId: dto.supplierId,
        poDate: dto.poDate || new Date().toISOString().split('T')[0],
        currency: requisition.currency,
        status: POStatus.DRAFT,
        requisitionId: requisition.requisitionId,
        incoterms: dto.incoterms || 'FOB',
        incotermsNamedPlace: dto.incotermsNamedPlace,
        leadTimeDayType: dto.leadTimeDayType || 'CALENDAR',
        destinationCountry: company?.country,
        companyProfileId: company?.profileId,
        paymentTerms: dto.paymentTerms || '30% Advance T/T, 70% against Bill of Lading',
        portOfLoading: dto.portOfLoading || 'Nhava Sheva (JNPT), Mumbai, India',
        portOfDischarge: dto.portOfDischarge || 'Djibouti Free Port / Mojo Dry Port',
        modeOfShipment: dto.modeOfShipment || 'SEA',
        bankAccountId: bank?.bankAccountId,
        amountInWords,
        supplierSnapshot,
        companySnapshot,
        bankSnapshot: undefined,
        notes: dto.notes || `Generated from Requisition ${requisition.requisitionNumber}. ${requisition.justification || ''}`,
        createdBy: userId,
        updatedBy: userId,
      });

      const savedPo = await manager.save(PurchaseOrder, po);

      // 5. Create PO lines
      const poLines = requisition.lines.map((rl) =>
        manager.create(PurchaseOrderLine, {
          poId: savedPo.poId,
          itemId: rl.itemId,
          quantityOrdered: rl.quantityRequested,
          unitPrice: rl.estimatedUnitPrice,
          currency: requisition.currency,
          hsnSacCode: '',
          uom: rl.item?.uom?.uomName || '',
          itemDescription: rl.technicalSpecification || rl.intendedApplication || rl.item?.itemName || undefined,
        }),
      );

      await manager.save(PurchaseOrderLine, poLines);

      // 6. Initialize standard percentage-based payment milestones (IMP-16, IMP-17)
      const advanceDue = Math.round(totalAmount * 0.3 * 100) / 100;
      const balanceDue = Math.round((totalAmount - advanceDue) * 100) / 100;
      const defaultSchedules = [
        manager.create(PoPaymentSchedule, {
          poId: savedPo.poId,
          milestoneName: '30% Mandatory Advance Payment',
          paymentMethod: 'TELEGRAPHIC_TRANSFER',
          isAdvance: true,
          paymentPercentage: 30,
          poAmountBase: totalAmount,
          amountDue: advanceDue,
          currency: requisition.currency,
          status: 'PLANNED',
          notes: 'Contractual advance required prior to manufacturing/dispatch',
          createdBy: userId,
        }),
        manager.create(PoPaymentSchedule, {
          poId: savedPo.poId,
          milestoneName: '70% Balance against Shipping Documents (B/L)',
          paymentMethod: 'TELEGRAPHIC_TRANSFER',
          paymentPercentage: 70,
          poAmountBase: totalAmount,
          amountDue: balanceDue,
          currency: requisition.currency,
          status: 'PLANNED',
          notes: 'Payable upon presentation of original Bill of Lading and commercial documents',
          createdBy: userId,
        }),
      ];
      await manager.save(PoPaymentSchedule, defaultSchedules);

      // Applicable requirements are derived from the destination/mode policy checklist.
      // Permit records are registered explicitly when an application is started.

      // 8. Update Requisition status to CONVERTED_TO_PO
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

