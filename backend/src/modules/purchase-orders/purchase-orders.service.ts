import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { PurchaseOrder, POStatus } from './entities/purchase-order.entity';
import { PurchaseOrderLine } from './entities/purchase-order-line.entity';
import { CompanyProfile } from './entities/company-profile.entity';
import { CompanyBankAccount } from './entities/company-bank-account.entity';
import { ImportComplianceRecord } from './entities/import-compliance-record.entity';
import { PoPaymentSchedule } from './entities/po-payment-schedule.entity';
import { PoPaymentTransaction } from './entities/po-payment-transaction.entity';
import { PoLetterOfCredit } from './entities/po-letter-of-credit.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { ProductItem } from '../products/entities/product-item.entity';
import { ExchangeRateDefault } from '../shipments/entities/exchange-rate-default.entity';
import {
  CreatePODto,
  UpdatePODto,
  CreateComplianceRecordDto,
  CreatePaymentScheduleDto,
  RecordPaymentTransactionDto,
  CreateLetterOfCreditDto,
} from './dto/purchase-order.dto';
import { AuditService } from '../audit/audit.service';
import { formatAmountInWords } from './utils/amount-in-words';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderLine)
    private readonly poLineRepo: Repository<PurchaseOrderLine>,
    @InjectRepository(CompanyProfile)
    private readonly companyProfileRepo: Repository<CompanyProfile>,
    @InjectRepository(CompanyBankAccount)
    private readonly bankAccountRepo: Repository<CompanyBankAccount>,
    @InjectRepository(ImportComplianceRecord)
    private readonly complianceRepo: Repository<ImportComplianceRecord>,
    @InjectRepository(PoPaymentSchedule)
    private readonly paymentScheduleRepo: Repository<PoPaymentSchedule>,
    @InjectRepository(PoPaymentTransaction)
    private readonly paymentTxnRepo: Repository<PoPaymentTransaction>,
    @InjectRepository(PoLetterOfCredit)
    private readonly lcRepo: Repository<PoLetterOfCredit>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(ProductItem)
    private readonly productRepo: Repository<ProductItem>,
    @InjectRepository(ExchangeRateDefault)
    private readonly exchangeRateRepo: Repository<ExchangeRateDefault>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  private normalizeCurrency(currency: string): string {
    return currency.trim().toUpperCase();
  }

  private async assertConfiguredCurrency(currency: string): Promise<string> {
    const normalizedCurrency = this.normalizeCurrency(currency);
    if (!/^[A-Z]{3,10}$/.test(normalizedCurrency)) {
      throw new BadRequestException('Currency code must be 3 to 10 uppercase letters');
    }
    const configured = await this.exchangeRateRepo.findOne({ where: { currency: normalizedCurrency } });
    if (!configured) {
      throw new BadRequestException(`No default exchange rate is configured for ${normalizedCurrency}`);
    }
    return normalizedCurrency;
  }

  // -------------------------------------------------------------
  // Company Profile & Importer Bank Accounts (POX-01, POX-03)
  // -------------------------------------------------------------
  async getCompanyProfile(): Promise<CompanyProfile> {
    const profile = await this.companyProfileRepo.findOne({ where: { isDefault: true } });
    if (profile) return profile;
    return this.companyProfileRepo.findOne({ order: { profileId: 'ASC' } }) as Promise<CompanyProfile>;
  }

  async getBankAccounts(): Promise<CompanyBankAccount[]> {
    return this.bankAccountRepo.find({ where: { isActive: true }, order: { bankAccountId: 'ASC' } });
  }

  // -------------------------------------------------------------
  // PO Management & Commercial Terms (Phase 2)
  // -------------------------------------------------------------
  async create(dto: CreatePODto): Promise<PurchaseOrder> {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Purchase Order must have at least one line item');
    }

    let grandTotal = 0;
    for (const l of dto.lines) {
      const qty = Number(l.quantityOrdered);
      const price = Number(l.unitPrice);
      if (!Number.isInteger(qty) || qty < 1) {
        throw new BadRequestException(
          `Line item quantity must be a whole positive integer (minimum 1). Fractional quantities like ${l.quantityOrdered} are not permitted.`,
        );
      }
      if (isNaN(price) || price <= 0) {
        throw new BadRequestException(`Line item unit price must be greater than 0.`);
      }
      grandTotal += qty * price;
    }
    const configuredCurrency = await this.assertConfiguredCurrency(dto.currency);

    // Calculate Amount in Words (POX-06)
    const amountInWords = formatAmountInWords(grandTotal, configuredCurrency);

    // Calculate Expected Delivery Date (POX-08)
    const leadTimeDays = dto.deliveryLeadTimeDays || 30;
    let expectedDeliveryDate = dto.expectedDeliveryDate;
    if (!expectedDeliveryDate) {
      const baseDate = dto.poDate ? new Date(dto.poDate) : new Date();
      baseDate.setDate(baseDate.getDate() + leadTimeDays);
      expectedDeliveryDate = baseDate.toISOString().split('T')[0];
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const poNumber = await this.generatePONumber(queryRunner.manager);
      const po = queryRunner.manager.create(PurchaseOrder, {
        poNumber,
        supplierId: dto.supplierId,
        poDate: dto.poDate || new Date().toISOString().split('T')[0],
        currency: configuredCurrency,
        status: POStatus.DRAFT,
        notes: dto.notes,
        requisitionId: dto.requisitionId,
        incoterms: dto.incoterms || 'FOB',
        paymentTerms: dto.paymentTerms || '30% Advance T/T, 70% against Bill of Lading',
        countryOfOrigin: dto.countryOfOrigin || 'India',
        portOfLoading: dto.portOfLoading || 'Nhava Sheva (JNPT), Mumbai, India',
        portOfDischarge: dto.portOfDischarge || 'Djibouti Free Port / Mojo Dry Port',
        modeOfShipment: dto.modeOfShipment || 'SEA',
        packingRequirements: dto.packingRequirements || 'Standard export seaworthy packing in heavy-duty 40ft High Cube containers',
        deliveryLeadTimeDays: leadTimeDays,
        leadTimeTrigger: dto.leadTimeTrigger || 'PO issuance and confirmed advance payment',
        expectedDeliveryDate,
        proformaInvoiceNo: dto.proformaInvoiceNo,
        proformaInvoiceDate: dto.proformaInvoiceDate,
        contractReference: dto.contractReference,
        inspectionRequirements: dto.inspectionRequirements || 'Pre-shipment inspection (PSI) by approved international surveyor (SGS/Bureau Veritas)',
        warrantyTerms: dto.warrantyTerms || '12 months or 20,000 km manufacturer warranty from date of handover',
        commercialRemarks: dto.commercialRemarks,
        bankAccountId: dto.bankAccountId || 1,
        amountInWords,
        createdBy: dto.userId,
        updatedBy: dto.userId,
      });

      const savedPo = await queryRunner.manager.save(PurchaseOrder, po);

      // Create lines with HSN/SAC, UOM, and Description snapshots (POX-04)
      const lines = dto.lines.map((l) =>
        queryRunner.manager.create(PurchaseOrderLine, {
          poId: savedPo.poId,
          itemId: l.itemId,
          quantityOrdered: l.quantityOrdered,
          unitPrice: l.unitPrice,
          currency: configuredCurrency,
          hsnSacCode: l.hsnSacCode || '8711.20',
          uom: l.uom || 'PCS',
          itemDescription: l.itemDescription,
        }),
      );

      await queryRunner.manager.save(PurchaseOrderLine, lines);

      // Auto-populate standard Payment Schedule milestones (IMP-16)
      const advanceDue = Math.round(grandTotal * 0.3 * 100) / 100;
      const balanceDue = Math.round((grandTotal - advanceDue) * 100) / 100;
      const initialSchedules = [
        queryRunner.manager.create(PoPaymentSchedule, {
          poId: savedPo.poId,
          milestoneName: '30% Mandatory Advance Payment',
          paymentMethod: 'TELEGRAPHIC_TRANSFER',
          amountDue: advanceDue,
          currency: configuredCurrency,
          status: 'PLANNED',
          notes: 'Contractual advance required prior to manufacturing/dispatch',
          createdBy: dto.userId,
        }),
        queryRunner.manager.create(PoPaymentSchedule, {
          poId: savedPo.poId,
          milestoneName: '70% Balance against Shipping Documents (B/L)',
          paymentMethod: 'TELEGRAPHIC_TRANSFER',
          amountDue: balanceDue,
          currency: configuredCurrency,
          status: 'PLANNED',
          notes: 'Payable upon presentation of original Bill of Lading and commercial documents',
          createdBy: dto.userId,
        }),
      ];
      await queryRunner.manager.save(PoPaymentSchedule, initialSchedules);

      // Auto-populate default Regulatory Compliance Checklist (IMP-13)
      const defaultChecklists = [
        queryRunner.manager.create(ImportComplianceRecord, {
          poId: savedPo.poId,
          requirementType: 'IMPORT_PERMIT',
          issuingAuthority: 'Ministry of Trade and Regional Integration (MOTRI)',
          status: 'PENDING',
          notes: 'Standard import authorization permit',
          createdBy: dto.userId,
        }),
        queryRunner.manager.create(ImportComplianceRecord, {
          poId: savedPo.poId,
          requirementType: 'CENTRAL_BANK_APPROVAL',
          issuingAuthority: 'National Bank of Ethiopia (NBE)',
          status: 'PENDING',
          notes: 'Foreign exchange allocation & approval',
          createdBy: dto.userId,
        }),
        queryRunner.manager.create(ImportComplianceRecord, {
          poId: savedPo.poId,
          requirementType: 'PRE_SHIPMENT_INSPECTION_CERT',
          issuingAuthority: 'Ethiopian Conformity Assessment Enterprise (ECAE) / SGS',
          status: 'PENDING',
          notes: 'Standards and technical compliance inspection certificate',
          createdBy: dto.userId,
        }),
      ];
      await queryRunner.manager.save(ImportComplianceRecord, defaultChecklists);

      await queryRunner.commitTransaction();

      await this.auditService.log({
        entityType: 'purchase_order',
        entityId: savedPo.poId,
        action: 'INSERT',
        changedBy: dto.userId,
        newValue: { poNumber: savedPo.poNumber, total: grandTotal, currency: configuredCurrency },
      });

      return this.findOne(savedPo.poId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async generatePONumber(manager: DataSource['manager']): Promise<string> {
    await manager.query(`CREATE SEQUENCE IF NOT EXISTS po_number_seq START 1;`);
    const result = await manager.query(`SELECT nextval('po_number_seq') AS value`);
    const value = Number(result?.[0]?.value || 0);
    if (!value) {
      throw new BadRequestException('Unable to generate purchase order number');
    }
    return `PO-${String(value).padStart(6, '0')}`;
  }

  async findAll(params?: {
    search?: string;
    status?: POStatus;
    supplierId?: number;
    page?: number;
    limit?: number;
  }): Promise<{ items: PurchaseOrder[]; total: number; page: number; limit: number }> {
    const page = Number(params?.page) || 1;
    const limit = Number(params?.limit) || 20;
    const skip = (page - 1) * limit;

    const query = this.poRepo
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .leftJoinAndSelect('po.lines', 'lines')
      .leftJoinAndSelect('lines.item', 'item')
      .leftJoinAndSelect('po.bankAccount', 'bankAccount')
      .leftJoinAndSelect('po.requisition', 'requisition');

    if (params?.search) {
      query.andWhere(
        '(po.poNumber ILIKE :search OR supplier.supplierName ILIKE :search OR po.notes ILIKE :search OR po.proformaInvoiceNo ILIKE :search)',
        { search: `%${params.search}%` },
      );
    }

    if (params?.status) {
      query.andWhere('po.status = :status', { status: params.status });
    }

    if (params?.supplierId) {
      query.andWhere('po.supplierId = :supplierId', { supplierId: params.supplierId });
    }

    query.orderBy('po.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await query.getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<PurchaseOrder> {
    const po = await this.poRepo.findOne({
      where: { poId: id },
      relations: [
        'supplier',
        'lines',
        'lines.item',
        'lines.item.category',
        'lines.item.brand',
        'creator',
        'updater',
        'requisition',
        'bankAccount',
        'complianceRecords',
        'paymentSchedules',
        'paymentSchedules.transactions',
        'lettersOfCredit',
      ],
    });
    if (!po) {
      throw new NotFoundException(`Purchase Order #${id} not found`);
    }
    return po;
  }

  async update(id: string, dto: UpdatePODto): Promise<PurchaseOrder> {
    const po = await this.findOne(id);
    if (po.status !== POStatus.DRAFT) {
      throw new BadRequestException(`Cannot edit PO in ${po.status} status`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const nextCurrency = dto.currency ? await this.assertConfiguredCurrency(dto.currency) : po.currency;
      
      let grandTotal = 0;
      if (dto.lines && dto.lines.length > 0) {
        for (const l of dto.lines) {
          const qty = Number(l.quantityOrdered);
          const price = Number(l.unitPrice);
          if (!Number.isInteger(qty) || qty < 1) {
            throw new BadRequestException(
              `Line item quantity must be a whole positive integer (minimum 1). Fractional quantities like ${l.quantityOrdered} are not permitted.`,
            );
          }
          if (isNaN(price) || price <= 0) {
            throw new BadRequestException(`Line item unit price must be greater than 0.`);
          }
          grandTotal += qty * price;
        }
      } else {
        grandTotal = po.lines.reduce((sum, l) => sum + Number(l.quantityOrdered) * Number(l.unitPrice), 0);
      }

      const amountInWords = formatAmountInWords(grandTotal, nextCurrency);

      Object.assign(po, {
        supplierId: dto.supplierId ?? po.supplierId,
        poDate: dto.poDate ?? po.poDate,
        currency: nextCurrency,
        notes: dto.notes ?? po.notes,
        incoterms: dto.incoterms ?? po.incoterms,
        paymentTerms: dto.paymentTerms ?? po.paymentTerms,
        countryOfOrigin: dto.countryOfOrigin ?? po.countryOfOrigin,
        portOfLoading: dto.portOfLoading ?? po.portOfLoading,
        portOfDischarge: dto.portOfDischarge ?? po.portOfDischarge,
        modeOfShipment: dto.modeOfShipment ?? po.modeOfShipment,
        packingRequirements: dto.packingRequirements ?? po.packingRequirements,
        deliveryLeadTimeDays: dto.deliveryLeadTimeDays ?? po.deliveryLeadTimeDays,
        leadTimeTrigger: dto.leadTimeTrigger ?? po.leadTimeTrigger,
        expectedDeliveryDate: dto.expectedDeliveryDate ?? po.expectedDeliveryDate,
        proformaInvoiceNo: dto.proformaInvoiceNo ?? po.proformaInvoiceNo,
        proformaInvoiceDate: dto.proformaInvoiceDate ?? po.proformaInvoiceDate,
        contractReference: dto.contractReference ?? po.contractReference,
        inspectionRequirements: dto.inspectionRequirements ?? po.inspectionRequirements,
        warrantyTerms: dto.warrantyTerms ?? po.warrantyTerms,
        commercialRemarks: dto.commercialRemarks ?? po.commercialRemarks,
        bankAccountId: dto.bankAccountId ?? po.bankAccountId,
        amountInWords,
        updatedBy: dto.userId,
      });

      await queryRunner.manager.save(PurchaseOrder, po);

      if (dto.lines && dto.lines.length > 0) {
        await queryRunner.manager.delete(PurchaseOrderLine, { poId: id });
        const updatedLines = dto.lines.map((line) =>
          queryRunner.manager.create(PurchaseOrderLine, {
            poId: id,
            itemId: line.itemId,
            quantityOrdered: line.quantityOrdered,
            unitPrice: line.unitPrice,
            currency: nextCurrency,
            hsnSacCode: line.hsnSacCode || '8711.20',
            uom: line.uom || 'PCS',
            itemDescription: line.itemDescription,
          }),
        );
        await queryRunner.manager.save(PurchaseOrderLine, updatedLines);
      }

      await queryRunner.commitTransaction();
      return this.findOne(id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateStatus(id: string, status: POStatus, userId?: number): Promise<PurchaseOrder> {
    const po = await this.findOne(id);

    // Validate valid state transitions
    const validTransitions: Record<POStatus, POStatus[]> = {
      [POStatus.DRAFT]: [POStatus.SUBMITTED, POStatus.CANCELLED],
      [POStatus.SUBMITTED]: [POStatus.CONFIRMED, POStatus.DRAFT, POStatus.CANCELLED],
      [POStatus.CONFIRMED]: [POStatus.PARTIALLY_RECEIVED, POStatus.RECEIVED, POStatus.CANCELLED],
      [POStatus.PARTIALLY_RECEIVED]: [POStatus.RECEIVED],
      [POStatus.RECEIVED]: [],
      [POStatus.CANCELLED]: [],
    };

    if (!validTransitions[po.status].includes(status)) {
      throw new BadRequestException(
        `Invalid status transition from ${po.status} to ${status}`,
      );
    }

    // Story IMP-11 & IMP-15: Commercial and Compliance Validation before CONFIRMED
    if (status === POStatus.CONFIRMED) {
      await this.validateCommercialReadiness(id);
    }

    po.status = status;
    po.updatedBy = userId;
    return this.poRepo.save(po);
  }

  async getOpenPOLines(supplierId?: number): Promise<PurchaseOrderLine[]> {
    const query = this.poLineRepo
      .createQueryBuilder('pol')
      .leftJoinAndSelect('pol.purchaseOrder', 'po')
      .leftJoinAndSelect('pol.item', 'item')
      .where('po.status IN (:...statuses)', {
        statuses: [POStatus.CONFIRMED, POStatus.PARTIALLY_RECEIVED],
      });

    if (supplierId) {
      query.andWhere('po.supplierId = :supplierId', { supplierId });
    }

    return query.getMany();
  }

  // -------------------------------------------------------------
  // Story POX-05: Generate Client-Format PO Document Payload
  // -------------------------------------------------------------
  async getPOPrintData(id: string) {
    const po = await this.findOne(id);
    const company = await this.getCompanyProfile();
    const bank = po.bankAccount || (await this.bankAccountRepo.findOne({ where: { isActive: true } }));

    const lineItems = po.lines.map((l, index) => {
      const quantity = Number(l.quantityOrdered);
      const unitRate = Number(l.unitPrice);
      const amount = Math.round(quantity * unitRate * 100) / 100;
      return {
        slNo: index + 1,
        itemCode: l.item?.itemCode || `ITEM-${l.itemId}`,
        description: l.itemDescription || l.item?.itemName || 'Industrial Vehicle / Spare Part Unit',
        hsnSacCode: l.hsnSacCode || '8711.20',
        quantity,
        uom: l.uom || 'PCS',
        unitRate,
        currency: l.currency || po.currency,
        amount,
      };
    });

    const subtotal = lineItems.reduce((acc, item) => acc + item.amount, 0);

    return {
      documentTitle: 'PURCHASE ORDER',
      poNumber: po.poNumber,
      poDate: po.poDate,
      status: po.status,
      proformaInvoiceNo: po.proformaInvoiceNo || 'N/A',
      proformaInvoiceDate: po.proformaInvoiceDate || 'N/A',
      contractReference: po.contractReference || 'N/A',
      importer: {
        companyName: company?.companyName || 'KANAB Motors PLC',
        iecNo: company?.iecNo || 'ETH-IEC-994821',
        adCode: company?.adCode || 'AD-CBE-0019284',
        taxId: company?.taxId || 'TIN-0092837461',
        address: company?.address || 'Bole Sub-City, Kebele 03, House No. 492, Addis Ababa, Ethiopia',
        city: company?.city || 'Addis Ababa',
        country: company?.country || 'Ethiopia',
        phone: company?.phone || '+251 11 662 4890',
        email: company?.email || 'import@kanabmotors.com',
      },
      supplier: {
        supplierId: po.supplier?.supplierId,
        supplierName: po.supplier?.supplierName,
        exporterIecNo: po.supplier?.exporterIecNo || 'N/A',
        exporterAdCode: po.supplier?.exporterAdCode || 'N/A',
        country: po.supplier?.country || po.countryOfOrigin || 'India',
        address: po.supplier?.address || 'N/A',
        contactPerson: po.supplier?.contactPerson || 'Export Sales Director',
        phone: po.supplier?.phone || 'N/A',
        email: po.supplier?.email || 'N/A',
      },
      commercialTerms: {
        incoterms: po.incoterms || 'FOB',
        paymentTerms: po.paymentTerms || '30% Advance T/T, 70% against Bill of Lading',
        countryOfOrigin: po.countryOfOrigin || 'India',
        portOfLoading: po.portOfLoading || 'Nhava Sheva (JNPT), Mumbai, India',
        portOfDischarge: po.portOfDischarge || 'Djibouti Free Port / Mojo Dry Port',
        modeOfShipment: po.modeOfShipment || 'SEA',
        packing: po.packingRequirements || 'Standard export seaworthy packing',
        deliveryLeadTimeDays: po.deliveryLeadTimeDays || 30,
        leadTimeTrigger: po.leadTimeTrigger || 'PO issuance and confirmed advance payment',
        expectedDeliveryDate: po.expectedDeliveryDate || '30 days post-issuance',
      },
      bankDetails: bank
        ? {
            accountName: bank.accountName,
            bankName: bank.bankName,
            accountNumber: bank.accountNumber,
            bankBranch: bank.bankBranch,
            ifscCode: bank.ifscCode,
            swiftCode: bank.swiftCode,
            currency: bank.currency,
          }
        : null,
      lineItems,
      grandTotal: subtotal,
      currency: po.currency,
      amountInWords: po.amountInWords || formatAmountInWords(subtotal, po.currency),
      standardRemarks: [
        '1. Import duties and local taxes, where applicable on arrival, are borne by the importing company.',
        "2. Bank charges and other expenses incurred in the supplier's country are borne by the supplier.",
        '3. Delivery lead time is 30 days after PO issuance and advance payment, subject to confirmed commercial agreement.',
        po.commercialRemarks,
      ].filter(Boolean),
      inspectionRequirements: po.inspectionRequirements,
      warrantyTerms: po.warrantyTerms,
    };
  }

  // -------------------------------------------------------------
  // Story IMP-11 & IMP-15: Commercial & Compliance Validation Gate
  // -------------------------------------------------------------
  async validateCommercialReadiness(poId: string): Promise<{ isReady: boolean; messages: string[] }> {
    const po = await this.findOne(poId);
    const messages: string[] = [];

    if (!po.incoterms) messages.push('Incoterms (e.g. FOB, CIF) must be specified.');
    if (!po.portOfLoading) messages.push('Port of Loading must be specified.');
    if (!po.portOfDischarge) messages.push('Port of Discharge must be specified.');
    if (!po.bankAccountId) messages.push('Importer Bank Account must be designated for payment transactions.');

    // Check compliance records (IMP-15)
    const records = await this.complianceRepo.find({ where: { poId } });
    const pendingPermits = records.filter((r) => r.status === 'REJECTED' || r.status === 'EXPIRED');
    if (pendingPermits.length > 0) {
      messages.push(`Regulatory compliance alert: ${pendingPermits.length} required compliance document(s) are rejected or expired.`);
    }

    if (messages.length > 0) {
      throw new BadRequestException(`Commercial & Compliance Validation Failed: ${messages.join(' ')}`);
    }

    return { isReady: true, messages: ['PO is commercially validated and compliant for issuance.'] };
  }

  // -------------------------------------------------------------
  // Phase 3: Regulatory Compliance Records (IMP-12 to IMP-15)
  // -------------------------------------------------------------
  async getComplianceRecords(poId: string): Promise<ImportComplianceRecord[]> {
    return this.complianceRepo.find({
      where: { poId },
      relations: ['shipment', 'creator'],
      order: { createdAt: 'DESC' },
    });
  }

  async createComplianceRecord(dto: CreateComplianceRecordDto): Promise<ImportComplianceRecord> {
    const record = this.complianceRepo.create({
      poId: dto.poId,
      shipmentId: dto.shipmentId,
      requirementType: dto.requirementType,
      issuingAuthority: dto.issuingAuthority,
      applicationReference: dto.applicationReference,
      documentReference: dto.documentReference,
      applicationDate: dto.applicationDate,
      submissionDate: dto.submissionDate,
      issueDate: dto.issueDate,
      expiryDate: dto.expiryDate,
      status: dto.status || 'PENDING',
      notes: dto.notes,
      createdBy: dto.userId || 1,
    });

    return this.complianceRepo.save(record);
  }

  async updateComplianceStatus(id: string, status: string, notes?: string): Promise<ImportComplianceRecord> {
    const record = await this.complianceRepo.findOne({ where: { complianceRecordId: id } });
    if (!record) {
      throw new NotFoundException(`Compliance record #${id} not found`);
    }

    record.status = status;
    if (notes) record.notes = notes;
    return this.complianceRepo.save(record);
  }

  // -------------------------------------------------------------
  // Phase 4: Payment Schedules & L/C Management (IMP-16 to IMP-22)
  // -------------------------------------------------------------
  async getPaymentSchedules(poId: string) {
    const schedules = await this.paymentScheduleRepo.find({
      where: { poId },
      relations: ['transactions', 'creator'],
      order: { paymentScheduleId: 'ASC' },
    });

    return schedules.map((s) => {
      const totalPaid = (s.transactions || [])
        .filter((t) => t.status === 'CONFIRMED')
        .reduce((sum, t) => sum + Number(t.amountPaid), 0);
      const remainingBalance = Math.max(0, Number(s.amountDue) - totalPaid);
      return {
        ...s,
        totalPaid,
        remainingBalance,
        isFullyPaid: remainingBalance <= 0,
      };
    });
  }

  async createPaymentSchedule(dto: CreatePaymentScheduleDto): Promise<PoPaymentSchedule> {
    const po = await this.findOne(dto.poId);
    const schedule = this.paymentScheduleRepo.create({
      poId: dto.poId,
      milestoneName: dto.milestoneName,
      paymentMethod: dto.paymentMethod || 'TELEGRAPHIC_TRANSFER',
      dueDate: dto.dueDate,
      amountDue: dto.amountDue,
      currency: dto.currency || po.currency,
      status: dto.status || 'PLANNED',
      notes: dto.notes,
      createdBy: dto.userId || 1,
    });

    return this.paymentScheduleRepo.save(schedule);
  }

  async recordPaymentTransaction(dto: RecordPaymentTransactionDto): Promise<PoPaymentTransaction> {
    const schedule = await this.paymentScheduleRepo.findOne({
      where: { paymentScheduleId: dto.paymentScheduleId },
      relations: ['transactions', 'purchaseOrder'],
    });

    if (!schedule) {
      throw new NotFoundException(`Payment milestone #${dto.paymentScheduleId} not found`);
    }

    const currentPaid = (schedule.transactions || [])
      .filter((t) => t.status === 'CONFIRMED')
      .reduce((sum, t) => sum + Number(t.amountPaid), 0);

    const amountPaid = Number(dto.amountPaid);
    if (currentPaid + amountPaid > Number(schedule.amountDue) * 1.05) {
      throw new BadRequestException(
        `Payment amount of ${amountPaid} exceeds milestone balance (${Number(schedule.amountDue) - currentPaid}). Overpayments exceed allowable threshold.`,
      );
    }

    const txn = this.paymentTxnRepo.create({
      paymentScheduleId: dto.paymentScheduleId,
      paymentReference: dto.paymentReference,
      paymentDate: dto.paymentDate || new Date().toISOString().split('T')[0],
      amountPaid: dto.amountPaid,
      currency: dto.currency || schedule.currency,
      bankName: dto.bankName,
      status: 'CONFIRMED',
      notes: dto.notes,
      createdBy: dto.userId || 1,
    });

    const savedTxn = await this.paymentTxnRepo.save(txn);

    // Update Schedule status
    const newTotalPaid = currentPaid + amountPaid;
    if (newTotalPaid >= Number(schedule.amountDue)) {
      schedule.status = 'PAID';
    } else {
      schedule.status = 'PARTIALLY_PAID';
    }
    await this.paymentScheduleRepo.save(schedule);

    return savedTxn;
  }

  async getLettersOfCredit(poId: string): Promise<PoLetterOfCredit[]> {
    return this.lcRepo.find({
      where: { poId },
      relations: ['creator'],
      order: { lcId: 'DESC' },
    });
  }

  async createLetterOfCredit(dto: CreateLetterOfCreditDto): Promise<PoLetterOfCredit> {
    const existing = await this.lcRepo.findOne({ where: { lcNumber: dto.lcNumber } });
    if (existing) {
      throw new ConflictException(`L/C with reference number ${dto.lcNumber} already exists`);
    }

    const lc = this.lcRepo.create({
      poId: dto.poId,
      lcNumber: dto.lcNumber,
      issuingBank: dto.issuingBank,
      advisingBank: dto.advisingBank,
      amount: dto.amount,
      currency: dto.currency,
      issueDate: dto.issueDate,
      expiryDate: dto.expiryDate,
      latestShipmentDate: dto.latestShipmentDate,
      status: dto.status || 'ISSUED',
      documentaryRequirements: dto.documentaryRequirements,
      notes: dto.notes,
      createdBy: dto.userId || 1,
    });

    return this.lcRepo.save(lc);
  }

  async updateLetterOfCreditStatus(lcId: string, status: string, notes?: string): Promise<PoLetterOfCredit> {
    const lc = await this.lcRepo.findOne({ where: { lcId } });
    if (!lc) {
      throw new NotFoundException(`Letter of Credit #${lcId} not found`);
    }
    lc.status = status;
    if (notes) lc.notes = notes;
    return this.lcRepo.save(lc);
  }

  // -------------------------------------------------------------
  // Story IMP-22: Financial Commitments & Outstanding Balance Overview
  // -------------------------------------------------------------
  async getFinancialObligationsSummary() {
    const schedules = await this.paymentScheduleRepo.find({
      relations: ['purchaseOrder', 'purchaseOrder.supplier', 'transactions'],
    });

    let totalCommitted = 0;
    let totalPaid = 0;
    const upcomingMilestones: any[] = [];

    for (const s of schedules) {
      const due = Number(s.amountDue);
      const paid = (s.transactions || [])
        .filter((t) => t.status === 'CONFIRMED')
        .reduce((sum, t) => sum + Number(t.amountPaid), 0);
      
      totalCommitted += due;
      totalPaid += paid;

      if (s.status !== 'PAID') {
        upcomingMilestones.push({
          paymentScheduleId: s.paymentScheduleId,
          poNumber: s.purchaseOrder?.poNumber,
          supplierName: s.purchaseOrder?.supplier?.supplierName,
          milestoneName: s.milestoneName,
          amountDue: due,
          amountPaid: paid,
          remaining: due - paid,
          dueDate: s.dueDate,
          currency: s.currency,
          status: s.status,
        });
      }
    }

    const activeLCs = await this.lcRepo.find({
      relations: ['purchaseOrder', 'purchaseOrder.supplier'],
      where: { status: In(['APPLIED', 'ISSUED', 'AMENDED']) },
    });

    return {
      totalCommitted,
      totalPaid,
      outstandingBalance: Math.max(0, totalCommitted - totalPaid),
      upcomingMilestonesCount: upcomingMilestones.length,
      upcomingMilestones,
      activeLettersOfCreditCount: activeLCs.length,
      activeLettersOfCredit: activeLCs,
    };
  }

  async getPOStatusReport() {
    const pos = await this.poRepo.find({
      relations: ['supplier', 'lines'],
      order: { createdAt: 'DESC' },
    });

    const statusCounts: Record<string, number> = {};
    const currencyTotals: Record<string, number> = {};
    let totalOrderedUnits = 0;

    for (const p of pos) {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      const curr = p.currency || 'USD';
      let poTotal = 0;
      if (p.lines) {
        for (const l of p.lines) {
          const qty = Number(l.quantityOrdered || 0);
          poTotal += qty * Number(l.unitPrice || 0);
          totalOrderedUnits += qty;
        }
      }
      currencyTotals[curr] = (currencyTotals[curr] || 0) + poTotal;
    }

    return {
      totalPOs: pos.length,
      statusCounts,
      currencyTotals,
      totalOrderedUnits,
      recentPOs: pos.slice(0, 10).map((p) => {
        let total = 0;
        if (p.lines) {
          for (const l of p.lines) {
            total += Number(l.quantityOrdered || 0) * Number(l.unitPrice || 0);
          }
        }
        return {
          poId: p.poId,
          poNumber: p.poNumber,
          supplierName: p.supplier?.supplierName || 'Unknown',
          currency: p.currency,
          totalAmount: total,
          status: p.status,
          poDate: p.poDate,
          linesCount: p.lines?.length || 0,
        };
      }),
    };
  }
}
