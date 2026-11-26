import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, EntityManager } from 'typeorm';
import { PurchaseOrder, POStatus } from './entities/purchase-order.entity';
import { PurchaseOrderLine } from './entities/purchase-order-line.entity';
import { CompanyProfile } from './entities/company-profile.entity';
import { CompanyBankAccount } from './entities/company-bank-account.entity';
import { CompanyImporter } from '../company-profile/entities/company-importer.entity';
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
  UpdateComplianceRecordDto,
  CreatePaymentScheduleDto,
  RecordPaymentTransactionDto,
  CreateLetterOfCreditDto,
} from './dto/purchase-order.dto';
import { AuditService } from '../audit/audit.service';
import { businessDate, deliveryDate, milestoneAmount, loadImportPolicy, complianceChecklist, assertCompliance, DEFAULT_IMPORT_POLICY } from './utils/import-rules';
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

  private async lineDefaults(lines: {itemId:string;uom?:string}[]) {
    const items=await this.productRepo.find({where:{itemId:In(lines.map(l=>l.itemId))},relations:['uom']});
    const map=new Map(items.map(i=>[i.itemId,{description:i.itemName,uom:i.uom?.uomName}]));
    if (lines.some(l=>!map.has(l.itemId))) throw new BadRequestException('One or more products do not exist');
    const units=await this.dataSource.query('SELECT uom_name FROM unit_of_measure');
    const valid=new Set(units.map((u: any)=>u.uom_name.toUpperCase()));
    ['PCS', 'PIECE', 'UNIT', 'SET', 'BOX', 'KG', 'MTR', 'LTR', 'PKT', 'BAG'].forEach(u => valid.add(u));
    for (const l of lines) if (l.uom && !valid.has(l.uom.toUpperCase())) throw new BadRequestException(`Unknown unit of measure: ${l.uom}`);
    return map;
  }

  async getImportPolicy() { return loadImportPolicy(this.dataSource); }

  async saveImportPolicy(value: any, userId: number) {
    if (!value || typeof value!=='object') throw new BadRequestException('Policy is required');
    try { businessDate(new Date(),value.timezone); } catch { throw new BadRequestException('Valid system timezone required'); }
    if (!Array.isArray(value.standardTerms) || value.standardTerms.some(t=>typeof t!=='string') || !Array.isArray(value.holidays) || value.holidays.some(d=>!/^\d{4}-\d{2}-\d{2}$/.test(d))) throw new BadRequestException('Invalid terms or holiday dates');
    if (!Array.isArray(value.requirements) || value.requirements.some(r=>!r.type || !r.authority || !['PO_CONFIRMATION','PAYMENT','SHIPMENT','CUSTOMS'].includes(r.checkpoint) || typeof r.destination!=='string' || typeof r.mode!=='string' || typeof r.evidenceRequired!=='boolean')) throw new BadRequestException('Invalid destination requirement');
    const allowedFields=['importerIecNo','importerAdCode','exporterIecNo','exporterAdCode','ifscCode','swiftCode','incotermsNamedPlace','countryOfOrigin','portOfLoading','portOfDischarge','contractReference','proformaInvoiceNo','hsnSacCode'];
    if (!Array.isArray(value.commercialRequirements) || value.commercialRequirements.some(r=>typeof r.destination!=='string' || typeof r.paymentMethod!=='string' || !Array.isArray(r.fields) || r.fields.some(f=>!allowedFields.includes(f)))) throw new BadRequestException('Invalid commercial validation rule');
    if (!Number.isInteger(value.escalationDays) || value.escalationDays<1 || value.escalationDays>365) throw new BadRequestException('Escalation delay must be 1 to 365 days');
    const roles=await this.dataSource.query('SELECT role_name FROM role');
    const known=new Set(roles.map(r=>r.role_name));
    if (![value.recipients?.payment,value.recipients?.lcExpiry,value.recipients?.lcShipment,value.escalationRole].every(r=>known.has(r))) throw new BadRequestException('Select valid responsible roles');
    const policy={timezone:value.timezone,standardTerms:value.standardTerms,holidays:value.holidays,requirements:value.requirements,commercialRequirements:value.commercialRequirements,recipients:value.recipients,escalationDays:value.escalationDays,escalationRole:value.escalationRole};
    await this.dataSource.transaction(async manager=>{
      const old=await loadImportPolicy(manager);
      await manager.query('UPDATE import_process_policy SET settings=$1 WHERE policy_id=1',[JSON.stringify(policy)]);
      await manager.query(`INSERT INTO audit_log(entity_type,entity_id,action,changed_by,old_value,new_value) VALUES ('import_process_policy',1,'UPDATE',$1,$2,$3)`,[userId,JSON.stringify(old),JSON.stringify(policy)]);
    });
    return policy;
  }

  async getChecklist(poId: string) { return complianceChecklist(this.dataSource,await this.findOne(poId)); }

  async amendment(poId: string, reason: string, userId: number) {
    if (!reason?.trim()) throw new BadRequestException('Amendment reason is required');
    return this.dataSource.transaction(async manager=>{
      const po=await manager.findOne(PurchaseOrder,{where:{poId},lock:{mode:'pessimistic_write'}});
      if (!po || po.status!==POStatus.CONFIRMED) throw new BadRequestException('Only confirmed, unreceived POs can be reopened for amendment');
      const shipped=await manager.query('SELECT 1 FROM shipment_line sl JOIN purchase_order_line pol ON pol.po_line_id=sl.po_line_id WHERE pol.po_id=$1 LIMIT 1',[poId]);
      if(shipped.length) throw new BadRequestException('POs already allocated to shipments cannot be reopened; preserve their approved contract');
      const document=po.issuedDocument || await this.getPOPrintData(poId);
      await manager.query('INSERT INTO po_contract_revision(po_id,reason,document,changed_by) VALUES($1,$2,$3,$4)',[poId,reason,JSON.stringify(document),userId]);
      await manager.update(PurchaseOrder,{poId},{status:POStatus.DRAFT,issuedDocument:null,bankSnapshot:null,standardTermsSnapshot:null,issuedDate:null,expectedDeliveryDate:null,updatedBy:userId});
      return {status:'DRAFT',message:'Previous issued document preserved. Amend, submit and obtain approval again.'};
    });
  }

  async revisions(poId: string) {
    return this.dataSource.query('SELECT revision_id,reason,document,changed_by,created_at FROM po_contract_revision WHERE po_id=$1 ORDER BY revision_id DESC',[poId]);
  }

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
    return this.bankAccountRepo.find({
      where: { isActive: true },
      order: { isDefault: 'DESC', bankAccountId: 'ASC' },
    });
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
      grandTotal += Math.round(qty * price * 100) / 100;
    }
    const configuredCurrency = await this.assertConfiguredCurrency(dto.currency);

    // Calculate Amount in Words (POX-06)
    const amountInWords = formatAmountInWords(grandTotal, configuredCurrency);

    const leadTimeDays = dto.deliveryLeadTimeDays ?? 30;
    const expectedDeliveryDate = undefined; // Derived only after the agreed triggering events.

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const poNumber = await this.generatePONumber(queryRunner.manager);
      const supplier = await queryRunner.manager.findOneBy(Supplier, { supplierId: dto.supplierId });
      if (!supplier) throw new BadRequestException(`Supplier #${dto.supplierId} not found`);
      const companyProfile = await queryRunner.manager.findOne(CompanyProfile, { where: { isDefault: true, isActive: true } });
      let importer: CompanyImporter | null = null;
      if (dto.importerId) {
        importer = await queryRunner.manager.findOne(CompanyImporter, { where: { importerId: dto.importerId, isActive: true } });
        if (!importer) throw new BadRequestException(`Active Importer #${dto.importerId} not found`);
      } else {
        importer = await queryRunner.manager.findOne(CompanyImporter, { where: { isDefault: true, isActive: true } });
      }
      const selectedBank = dto.bankAccountId
        ? await queryRunner.manager.findOneBy(CompanyBankAccount, { bankAccountId: dto.bankAccountId })
        : await queryRunner.manager.findOne(CompanyBankAccount, { where: { isDefault: true, isActive: true } });
      if (!selectedBank?.isActive) throw new BadRequestException('An active importer bank account is required');
      if(selectedBank.companyProfileId && companyProfile?.profileId && selectedBank.companyProfileId!==companyProfile.profileId) throw new BadRequestException('Bank account must belong to the importing company');
      const po = queryRunner.manager.create(PurchaseOrder, {
        poNumber,
        supplierId: dto.supplierId,
        poDate: dto.poDate || new Date().toISOString().split('T')[0],
        currency: configuredCurrency,
        status: POStatus.DRAFT,
        notes: dto.notes,
        requisitionId: dto.requisitionId,
        incoterms: dto.incoterms || 'FOB',
        incotermsNamedPlace: dto.incotermsNamedPlace,
        leadTimeDayType: dto.leadTimeDayType || 'CALENDAR',
        destinationCountry: dto.destinationCountry || companyProfile?.country,
        paymentMethod: dto.paymentMethod || 'TELEGRAPHIC_TRANSFER',
        inspectionRequired: dto.inspectionRequired ?? false,
        paymentTerms: dto.paymentTerms || '30% Advance T/T, 70% against Bill of Lading',
        countryOfOrigin: dto.countryOfOrigin || 'India',
        portOfLoading: dto.portOfLoading || 'Nhava Sheva (JNPT), Mumbai, India',
        portOfDischarge: dto.portOfDischarge || 'Djibouti Free Port / Mojo Dry Port',
        modeOfShipment: dto.modeOfShipment || 'SEA',
        packingRequirements: dto.packingRequirements || 'Standard export seaworthy packing in heavy-duty 40ft High Cube containers',
        deliveryLeadTimeDays: leadTimeDays,
        leadTimeTrigger: dto.leadTimeTrigger || 'ISSUANCE_AND_ADVANCE',
        expectedDeliveryDate,
        proformaInvoiceNo: dto.proformaInvoiceNo,
        proformaInvoiceDate: dto.proformaInvoiceDate,
        contractReference: dto.contractReference,
        inspectionRequirements: dto.inspectionRequirements || 'Pre-shipment inspection (PSI) by approved international surveyor (SGS/Bureau Veritas)',
        warrantyTerms: dto.warrantyTerms || '12 months or 20,000 km manufacturer warranty from date of handover',
        commercialRemarks: dto.commercialRemarks,
        companyProfileId: companyProfile?.profileId,
        importerId: importer?.importerId,
        bankAccountId: selectedBank.bankAccountId,
        supplierSnapshot: {
          supplierName: supplier.supplierName,
          country: supplier.country,
          exporterIecNo: supplier.exporterIecNo,
          exporterAdCode: supplier.exporterAdCode,
        },
        companySnapshot: companyProfile ? {
          companyName: companyProfile.companyName,
          tradeName: companyProfile.tradeName,
          logo: companyProfile.logo,
          importerName: importer?.importerName,
          importerIecNo: importer?.iecNo || companyProfile.importerIecNo,
          importerAdCode: importer?.adCode || companyProfile.importerAdCode,
          registrationNo: companyProfile.registrationNo,
          tin: companyProfile.tin,
          vatRegistrationNo: companyProfile.vatRegistrationNo,
          address: companyProfile.address,
          phone: companyProfile.phone,
          email: companyProfile.email,
        } : undefined,
        amountInWords,
        createdBy: dto.userId,
        updatedBy: dto.userId,
      });

      const savedPo = await queryRunner.manager.save(PurchaseOrder, po);

      // Create lines with HSN/SAC, UOM, and Description snapshots (POX-04)
      const productDefaults = await this.lineDefaults(dto.lines);
      const lines = dto.lines.map((l) =>
        queryRunner.manager.create(PurchaseOrderLine, {
          poId: savedPo.poId,
          itemId: l.itemId,
          quantityOrdered: l.quantityOrdered,
          unitPrice: l.unitPrice,
          currency: configuredCurrency,
          hsnSacCode: l.hsnSacCode || '',
          uom: l.uom || productDefaults.get(l.itemId)?.uom || '',
          itemDescription: l.itemDescription || productDefaults.get(l.itemId)?.description,
        }),
      );

      await queryRunner.manager.save(PurchaseOrderLine, lines);

      // Auto-populate standard Payment Schedule milestones (IMP-16, IMP-17)
      const advanceDue = Math.round(grandTotal * 0.3 * 100) / 100;
      const balanceDue = Math.round((grandTotal - advanceDue) * 100) / 100;
      const initialSchedules = [
        queryRunner.manager.create(PoPaymentSchedule, {
          poId: savedPo.poId,
          milestoneName: '30% Mandatory Advance Payment',
          paymentMethod: 'TELEGRAPHIC_TRANSFER',
          isAdvance: true,
          paymentPercentage: 30,
          poAmountBase: grandTotal,
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
          paymentPercentage: 70,
          poAmountBase: grandTotal,
          amountDue: balanceDue,
          currency: configuredCurrency,
          status: 'PLANNED',
          notes: 'Payable upon presentation of original Bill of Lading and commercial documents',
          createdBy: dto.userId,
        }),
      ];
      await queryRunner.manager.save(PoPaymentSchedule, initialSchedules);

      // Applicable requirements are derived from the destination/mode policy checklist.
      // Permit records are registered explicitly when an application is started.

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
        'lines.item.uom',
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
    const today=businessDate(new Date(),(await this.getImportPolicy()).timezone);
    po.complianceRecords=(po.complianceRecords||[]).map(r=>r.expiryDate && r.expiryDate<today?Object.assign(r,{status:'EXPIRED'}):r);
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
      const locked = await queryRunner.manager.findOne(PurchaseOrder,{where:{poId:id},lock:{mode:'pessimistic_write'}});
      if (!locked || locked.status !== POStatus.DRAFT || locked.updatedAt.getTime() !== po.updatedAt.getTime()) throw new ConflictException('PO changed; reload before editing');
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
          grandTotal += Math.round(qty * price * 100) / 100;
        }
      } else {
        grandTotal = po.lines.reduce((sum, l) => sum + Math.round(Number(l.quantityOrdered) * Number(l.unitPrice) * 100) / 100, 0);
      }

      const paidHistory = await queryRunner.manager.count(PoPaymentTransaction, { where: { paymentSchedule: { poId: id }, status: In(['INITIATED','CONFIRMED']) } });
      const oldTotal = po.lines.reduce((sum,l) => sum + Math.round(Number(l.quantityOrdered)*Number(l.unitPrice)*100)/100,0);
      if (paidHistory && (grandTotal !== oldTotal || nextCurrency !== po.currency)) throw new BadRequestException('Reverse/adjust confirmed payments through the approved payment workflow before changing contractual amount or currency');
      const amountInWords = formatAmountInWords(grandTotal, nextCurrency);

      if (dto.bankAccountId !== undefined && dto.bankAccountId !== po.bankAccountId) {
        const selectedBank = await queryRunner.manager.findOneBy(CompanyBankAccount, {
          bankAccountId: dto.bankAccountId,
        });
        if (!selectedBank?.isActive) {
          throw new BadRequestException('An active importer bank account is required');
        }
      }

      let updatedCompanySnapshot = po.companySnapshot;
      if (dto.importerId !== undefined && dto.importerId !== po.importerId) {
        const companyProfile = await this.getCompanyProfile();
        const importer = dto.importerId
          ? await queryRunner.manager.findOne(CompanyImporter, { where: { importerId: dto.importerId, isActive: true } })
          : await queryRunner.manager.findOne(CompanyImporter, { where: { isDefault: true, isActive: true } });
        if (companyProfile) {
          updatedCompanySnapshot = {
            companyName: companyProfile.companyName,
            tradeName: companyProfile.tradeName,
            logo: companyProfile.logo,
            importerName: importer?.importerName,
            importerIecNo: importer?.iecNo || companyProfile.importerIecNo,
            importerAdCode: importer?.adCode || companyProfile.importerAdCode,
            registrationNo: companyProfile.registrationNo,
            tin: companyProfile.tin,
            vatRegistrationNo: companyProfile.vatRegistrationNo,
            address: companyProfile.address,
            phone: companyProfile.phone,
            email: companyProfile.email,
          };
        }
      }

      Object.assign(po, {
        supplierId: dto.supplierId ?? po.supplierId,
        poDate: dto.poDate ?? po.poDate,
        currency: nextCurrency,
        notes: dto.notes ?? po.notes,
        incoterms: dto.incoterms ?? po.incoterms,
        incotermsNamedPlace: dto.incotermsNamedPlace ?? po.incotermsNamedPlace,
        leadTimeDayType: dto.leadTimeDayType ?? po.leadTimeDayType,
        destinationCountry: dto.destinationCountry ?? po.destinationCountry,
        paymentMethod: dto.paymentMethod ?? po.paymentMethod,
        inspectionRequired: dto.inspectionRequired ?? po.inspectionRequired,
        bankSnapshot: null,
        paymentTerms: dto.paymentTerms ?? po.paymentTerms,
        countryOfOrigin: dto.countryOfOrigin ?? po.countryOfOrigin,
        portOfLoading: dto.portOfLoading ?? po.portOfLoading,
        portOfDischarge: dto.portOfDischarge ?? po.portOfDischarge,
        modeOfShipment: dto.modeOfShipment ?? po.modeOfShipment,
        packingRequirements: dto.packingRequirements ?? po.packingRequirements,
        deliveryLeadTimeDays: dto.deliveryLeadTimeDays ?? po.deliveryLeadTimeDays,
        leadTimeTrigger: dto.leadTimeTrigger ?? po.leadTimeTrigger,
        expectedDeliveryDate: null,
        proformaInvoiceNo: dto.proformaInvoiceNo ?? po.proformaInvoiceNo,
        proformaInvoiceDate: dto.proformaInvoiceDate ?? po.proformaInvoiceDate,
        contractReference: dto.contractReference ?? po.contractReference,
        inspectionRequirements: dto.inspectionRequirements ?? po.inspectionRequirements,
        warrantyTerms: dto.warrantyTerms ?? po.warrantyTerms,
        commercialRemarks: dto.commercialRemarks ?? po.commercialRemarks,
        bankAccountId: dto.bankAccountId ?? po.bankAccountId,
        importerId: dto.importerId ?? po.importerId,
        companySnapshot: updatedCompanySnapshot,
        amountInWords,
        updatedBy: dto.userId,
      });

      await queryRunner.manager.save(PurchaseOrder, po);

      if (dto.lines && dto.lines.length > 0) {
        await queryRunner.manager.delete(PurchaseOrderLine, { poId: id });
        const productDefaults = await this.lineDefaults(dto.lines);
        const updatedLines = dto.lines.map((line) =>
          queryRunner.manager.create(PurchaseOrderLine, {
            poId: id,
            itemId: line.itemId,
            quantityOrdered: line.quantityOrdered,
            unitPrice: line.unitPrice,
            currency: nextCurrency,
            hsnSacCode: line.hsnSacCode || '',
            uom: line.uom || productDefaults.get(line.itemId)?.uom || '',
            itemDescription: line.itemDescription || productDefaults.get(line.itemId)?.description,
          }),
        );
        await queryRunner.manager.save(PurchaseOrderLine, updatedLines);

      }
      if (nextCurrency !== po.lines?.[0]?.currency) await queryRunner.manager.update(PurchaseOrderLine,{poId:id},{currency:nextCurrency});
        // Recalculate unpaid milestone amounts if grandTotal changed and percentages are set (IMP-17)
        const existingSchedules = await queryRunner.manager.find(PoPaymentSchedule, {
          where: { poId: id },
          relations: ['transactions'],
          order: { paymentScheduleId: 'ASC' },
        });
        const activeSchedules = existingSchedules.filter(s => s.status !== 'CANCELLED');
        const recalculated = [];
        for (const s of activeSchedules) {
          const hasConfirmedTxns = (s.transactions || []).some((t) => ['INITIATED','CONFIRMED'].includes(t.status));
          if (!hasConfirmedTxns && s.paymentPercentage && Number(s.paymentPercentage) > 0) {
            s.currency = nextCurrency;
            s.poAmountBase = grandTotal;
            s.amountDue = Math.round((grandTotal * Number(s.paymentPercentage)) / 100 * 100) / 100;
            recalculated.push(s);
          }
        }
        const percentageTotal = activeSchedules.reduce((sum, s) => sum + Number(s.paymentPercentage || 0), 0);
        if (recalculated.length && Math.abs(percentageTotal - 100) < 0.001) {
          const remainder = Math.round(grandTotal * 100) - activeSchedules.reduce((sum, s) => sum + Math.round(Number(s.amountDue) * 100), 0);
          // Adjust only an unpaid milestone, never a historical payment or cancelled obligation.
          const target = [...recalculated].reverse().find(s => Math.round(Number(s.amountDue) * 100) + remainder > 0);
          if (!target) throw new BadRequestException('Milestone rounding would create a non-positive payment');
          target.amountDue = (Math.round(Number(target.amountDue) * 100) + remainder) / 100;
        }
        if (recalculated.some(s => Number(s.amountDue) <= 0)) throw new BadRequestException('Each milestone must be at least one currency cent');
        for (const s of recalculated) await queryRunner.manager.save(PoPaymentSchedule, s);
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
    return this.dataSource.transaction(async manager => {
    const locked=await manager.findOne(PurchaseOrder,{where:{poId:id},lock:{mode:'pessimistic_write'}});
    if (!locked) throw new NotFoundException('PO not found');
    const po = await this.findOne(id);
    po.status=locked.status;

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

      const bank = await this.bankAccountRepo.findOne({ where: { bankAccountId: po.bankAccountId, isActive: true } });
      if (!bank) throw new BadRequestException('Selected bank is no longer active');
      if(bank.companyProfileId && po.companyProfileId && bank.companyProfileId!==po.companyProfileId) throw new BadRequestException('Bank account must belong to the importing company');
      po.bankSnapshot = { ...bank };
      const company = await this.getCompanyProfile();
      const supplier = await this.supplierRepo.findOne({ where: { supplierId: po.supplierId } });
      po.companySnapshot = { ...company, bankAccounts: undefined };
      po.supplierSnapshot = { ...supplier };
      const policy = await this.getImportPolicy();
      po.issuedDate = businessDate(new Date(), policy.timezone);
      po.standardTermsSnapshot = policy.standardTerms.map(t => t.replace('{days}', String(po.deliveryLeadTimeDays)).replace('{dayType}', po.leadTimeDayType.toLowerCase()).replace('{trigger}', po.leadTimeTrigger === 'ISSUANCE' ? 'PO issuance' : 'PO issuance and completion of the advance payment'));
      po.issuedDocument = null;
      await manager.save(PurchaseOrder,po);
      po.issuedDocument = await this.getPOPrintData(id,po);
      po.issuedDocument.status = status;
      po.issuedDocument.approvedBy = userId;
      await this.recalculateDelivery(manager, po);

    }

    po.status = status;
    po.updatedBy = userId;
    const saved = await manager.save(PurchaseOrder,po);
    await this.auditService.log({entityType:'purchase_order', entityId:id, action:'UPDATE', changedBy:userId, newValue:{status}});
    return saved;
    });
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

    const lines = await query.getMany();
    if (lines.length === 0) return [];

    try {
      const shippedTotals: { po_line_id: string; total_shipped: string }[] = await this.dataSource.query(`
        SELECT po_line_id, COALESCE(SUM(quantity_shipped), 0) AS total_shipped
        FROM shipment_line
        WHERE po_line_id IN (${lines.map((_, i) => `$${i + 1}`).join(', ')})
        GROUP BY po_line_id
      `, lines.map((l) => l.poLineId));

      const shippedMap = new Map<string, number>();
      shippedTotals.forEach((row) => shippedMap.set(String(row.po_line_id), Number(row.total_shipped || 0)));

      return lines
        .map((line) => {
          const shippedQty = shippedMap.get(String(line.poLineId)) || 0;
          const remainingQuantity = Math.max(0, Number(line.quantityOrdered) - shippedQty);
          (line as any).remainingQuantity = remainingQuantity;
          return line;
        })
        .filter((line) => (line as any).remainingQuantity > 0);
    } catch {
      return lines;
    }
  }

  // -------------------------------------------------------------
  // Story POX-05: Generate Client-Format PO Document Payload
  // -------------------------------------------------------------
  async getPOPrintData(id: string, source?: PurchaseOrder) {
    const po = source || await this.findOne(id);
    if (po.issuedDocument) return po.issuedDocument;
    const company = po.companySnapshot || await this.getCompanyProfile();
    // Prefer immutable snapshot from confirmed/issued PO, fallback to live relation (POX-03)
    const bank = po.bankSnapshot || po.bankAccount || (await this.bankAccountRepo.findOne({ where: { isActive: true } }));

    const lineItems = po.lines.map((l, index) => {
      const quantity = Number(l.quantityOrdered);
      const unitRate = Number(l.unitPrice);
      const amount = Math.round(quantity * unitRate * 100) / 100;
      return {
        slNo: index + 1,
        itemCode: l.item?.itemCode || `ITEM-${l.itemId}`,
        description: l.itemDescription || l.item?.itemName || 'Industrial Vehicle / Spare Part Unit',
        hsnSacCode: l.hsnSacCode || '',
        quantity,
        uom: l.uom || '',
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
      issuedDate: po.issuedDate,
      approvedBy: po.updater?.fullName || po.updatedBy,
      status: po.status,
      proformaInvoiceNo: po.proformaInvoiceNo || 'N/A',
      proformaInvoiceDate: po.proformaInvoiceDate || 'N/A',
      contractReference: po.contractReference || 'N/A',
      importer: {
        companyName: po.companySnapshot?.companyName || company?.companyName || 'KANAB Motors PLC',
        tradeName: po.companySnapshot?.tradeName || company?.tradeName,
        importerName: po.companySnapshot?.importerName,
        logo: (po.companySnapshot as any)?.logo || company?.logo || null,
        iecNo: po.companySnapshot?.importerIecNo || company?.importerIecNo || company?.iecNo || 'N/A',
        adCode: po.companySnapshot?.importerAdCode || company?.importerAdCode || company?.adCode || 'N/A',
        taxId: po.companySnapshot?.tin || company?.tin || company?.taxId || 'N/A',
        address: company?.address || 'Bole Sub-City, Kebele 03, House No. 492, Addis Ababa, Ethiopia',
        city: company?.city || 'Addis Ababa',
        country: company?.country || 'Ethiopia',
        phone: company?.phone || '+251 11 662 4890',
        email: company?.email || 'import@kanabmotors.com',
      },
      supplier: {
        supplierId: po.supplier?.supplierId,
        supplierName: po.supplierSnapshot?.supplierName || po.supplier?.supplierName,
        exporterIecNo: po.supplierSnapshot?.exporterIecNo || po.supplier?.exporterIecNo || 'N/A',
        exporterAdCode: po.supplierSnapshot?.exporterAdCode || po.supplier?.exporterAdCode || 'N/A',
        country: po.supplierSnapshot?.country || po.supplier?.country || po.countryOfOrigin || 'India',
        address: po.supplierSnapshot?.address || po.supplier?.address || 'N/A',
        contactPerson: po.supplierSnapshot?.contactPerson || po.supplier?.contactPerson || 'N/A',
        phone: po.supplierSnapshot?.phone || po.supplier?.phone || 'N/A',
        email: po.supplierSnapshot?.email || po.supplier?.email || 'N/A',
      },
      commercialTerms: {
        incoterms: po.incotermsNamedPlace ? `${po.incoterms || 'FOB'} (${po.incotermsNamedPlace})` : (po.incoterms || 'FOB'),
        incotermsNamedPlace: po.incotermsNamedPlace,
        leadTimeDayType: po.leadTimeDayType || 'CALENDAR',
        paymentTerms: po.paymentTerms || '30% Advance T/T, 70% against Bill of Lading',
        countryOfOrigin: po.countryOfOrigin || 'India',
        portOfLoading: po.portOfLoading || 'Nhava Sheva (JNPT), Mumbai, India',
        portOfDischarge: po.portOfDischarge || 'Djibouti Free Port / Mojo Dry Port',
        modeOfShipment: po.modeOfShipment || 'SEA',
        packing: po.packingRequirements || 'Standard export seaworthy packing',
        deliveryLeadTimeDays: po.deliveryLeadTimeDays || 30,
        leadTimeTrigger: po.leadTimeTrigger || 'PO issuance and confirmed advance payment',
        expectedDeliveryDate: po.expectedDeliveryDate || 'Pending agreed delivery trigger',
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
      amountInWords: formatAmountInWords(subtotal, po.currency),
      standardRemarks: [...(po.standardTermsSnapshot || (await this.getImportPolicy()).standardTerms.map(t => t.replace('{days}', String(po.deliveryLeadTimeDays)).replace('{dayType}', po.leadTimeDayType.toLowerCase()).replace('{trigger}', po.leadTimeTrigger === 'ISSUANCE' ? 'PO issuance' : 'PO issuance and completion of the advance payment'))), po.commercialRemarks].filter(Boolean),
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
    if (['SEA','AIR'].includes(po.modeOfShipment) && !po.portOfLoading) messages.push('Port of Loading must be specified.');
    if (['SEA','AIR'].includes(po.modeOfShipment) && !po.portOfDischarge) messages.push('Port of Discharge must be specified.');
    if (!po.bankAccountId) messages.push('Importer Bank Account must be designated for payment transactions.');

    if (!['EXW','FCA','CPT','CIP','DAP','DPU','DDP','FAS','FOB','CFR','CIF'].includes(po.incoterms)) messages.push('Select a valid Incoterm');
    if (!['SEA','AIR','ROAD','RAIL'].includes(po.modeOfShipment)) messages.push('Select a valid shipment mode');
    if (!po.destinationCountry) messages.push('Destination country is required');
    if (!po.paymentTerms) messages.push('Payment terms are required');
    if (po.inspectionRequired && !po.inspectionRequirements) messages.push('Inspection requirements are required');
    const policy = await this.getImportPolicy();
    const supplier = po.supplier || await this.supplierRepo.findOne({where:{supplierId:po.supplierId}});
    const company = await this.getCompanyProfile();
    const bank = po.bankAccount || await this.bankAccountRepo.findOne({where:{bankAccountId:po.bankAccountId}});
    const fields = { ...po, hsnSacCode: (po.lines||[]).length>0 && po.lines.every(l=>!!l.hsnSacCode?.trim()), importerIecNo:company?.importerIecNo, importerAdCode:company?.importerAdCode, exporterIecNo:supplier?.exporterIecNo, exporterAdCode:supplier?.exporterAdCode, ifscCode:bank?.ifscCode, swiftCode:bank?.swiftCode };
    for (const rule of policy.commercialRequirements) {
      if ((!rule.destination || rule.destination.toLowerCase() === po.destinationCountry?.toLowerCase()) && (!rule.paymentMethod || rule.paymentMethod === po.paymentMethod)) {
        for (const field of rule.fields) if (!fields[field]) messages.push(`${field} is required for this transaction`);
      }
    }
    for (const line of po.lines || []) if (!line.uom || !line.itemDescription) messages.push('Each line requires a UOM and description');
    if (po.paymentMethod === 'LETTER_OF_CREDIT') {
      const lcs = await this.lcRepo.find({ where: { poId } });
      if (!lcs.some(lc => lc.status === 'ISSUED' && lc.latestShipmentDate && lc.expiryDate >= businessDate(new Date(),policy.timezone))) messages.push('A valid issued Letter of Credit is required');
    }
    const schedules = (await this.paymentScheduleRepo.find({where:{poId}})).filter(s=>s.status !== 'CANCELLED');
    if (po.paymentMethod === 'TELEGRAPHIC_TRANSFER') {
      const total = schedules.reduce((sum,s)=>sum+Number(s.paymentPercentage||0),0);
      if (Math.abs(total-100) > 0.001) messages.push('Complete payment schedule must equal 100%');
      if (schedules.some(s=>!s.dueDate)) messages.push('Every T/T milestone requires a due date');
      if (po.leadTimeTrigger !== 'ISSUANCE' && !schedules.some(s=>s.isAdvance)) messages.push('Mark the advance milestone used to calculate delivery');
    }
    await assertCompliance(this.dataSource, po, 'PO_CONFIRMATION');

    if (messages.length > 0) {
      throw new BadRequestException(`Commercial & Compliance Validation Failed: ${messages.join(' ')}`);
    }

    return { isReady: true, messages: ['PO is commercially validated and compliant for issuance.'] };
  }

  // -------------------------------------------------------------
  // Phase 3: Regulatory Compliance Records (IMP-12 to IMP-15)
  // -------------------------------------------------------------
  async getComplianceRecords(poId: string): Promise<ImportComplianceRecord[]> {
    const records = await this.complianceRepo.find({
      where: { poId },
      relations: ['shipment', 'creator'],
      order: { createdAt: 'DESC' },
    });
    const today = businessDate(new Date(), (await this.getImportPolicy()).timezone);
    return records.map(r => ({...r, status: r.expiryDate && r.expiryDate < today ? 'EXPIRED' : r.status}));
  }

  async createComplianceRecord(dto: CreateComplianceRecordDto): Promise<ImportComplianceRecord> {
    await this.findOne(dto.poId!);
    if (dto.renewalOfId) {
      const original = await this.complianceRepo.findOne({where:{complianceRecordId:dto.renewalOfId,poId:dto.poId}});
      if (!original || original.requirementType !== dto.requirementType) throw new BadRequestException('Renewal must reference the same PO and requirement');
    }
    if (dto.status && !['PENDING','APPLIED','SUBMITTED'].includes(dto.status)) throw new BadRequestException('New permits must enter the approval workflow');
    if (dto.shipmentId) {
      const linked=await this.dataSource.query('SELECT 1 FROM shipment_line sl JOIN purchase_order_line pol ON pol.po_line_id=sl.po_line_id WHERE sl.shipment_id=$1 AND pol.po_id=$2 LIMIT 1',[dto.shipmentId,dto.poId]);
      if (!linked.length) throw new BadRequestException('Shipment must contain a line from this PO');
    }
    if (dto.issueDate && dto.expiryDate && dto.expiryDate < dto.issueDate) throw new BadRequestException('Expiry precedes issue date');
    const record = this.complianceRepo.create({
      renewalOfId: dto.renewalOfId,
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

  async updateComplianceRecord(id: string, dto: UpdateComplianceRecordDto, userId: number): Promise<ImportComplianceRecord> {
    return this.dataSource.transaction(async manager => {
      const record = await manager.findOne(ImportComplianceRecord, {
        where: { complianceRecordId: id }, lock: { mode: 'pessimistic_write' },
      });
      if (!record) throw new NotFoundException(`Compliance record #${id} not found`);
      if (!['PENDING', 'APPLIED', 'SUBMITTED'].includes(record.status)) {
        throw new BadRequestException('Only pending, applied or submitted permits can be edited; renew finalized permits');
      }
      const fields = ['applicationReference', 'documentReference', 'applicationDate', 'submissionDate', 'issueDate', 'expiryDate', 'notes'] as const;
      const oldValue = {};
      const newValue = {};
      for (const field of fields) {
        if (dto[field] !== undefined) {
          oldValue[field] = record[field];
          record[field] = dto[field];
          newValue[field] = dto[field];
        }
      }
      if (record.issueDate && record.expiryDate && record.expiryDate < record.issueDate) throw new BadRequestException('Expiry precedes issue date');
      if (record.applicationDate && record.submissionDate && record.submissionDate < record.applicationDate) throw new BadRequestException('Submission precedes application date');
      const saved = await manager.save(ImportComplianceRecord, record);
      await manager.query(`INSERT INTO audit_log(entity_type,entity_id,action,changed_by,old_value,new_value) VALUES ('import_compliance_record',$1,'UPDATE',$2,$3,$4)`, [id, userId, JSON.stringify(oldValue), JSON.stringify(newValue)]);
      return saved;
    });
  }

  async updateComplianceStatus(id: string, status: string, notes?: string, userId?: number): Promise<ImportComplianceRecord> {
    const record = await this.complianceRepo.findOne({ where: { complianceRecordId: id } });
    if (!record) {
      throw new NotFoundException(`Compliance record #${id} not found`);
    }

    if (!['PENDING','APPLIED','SUBMITTED','APPROVED','REJECTED','EXPIRED','CANCELLED'].includes(status)) throw new BadRequestException('Invalid compliance status');
    const oldStatus=record.status;
    record.status = status;
    await this.auditService.log({entityType:'import_compliance_record',entityId:id,action:'UPDATE',changedBy:userId,newValue:{status,notes},oldValue:{status:oldStatus}});
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

  private scheduleValues(dto: CreatePaymentScheduleDto, po: PurchaseOrder) {
    const base = po.lines.reduce((sum,l) => sum + Math.round(Number(l.quantityOrdered)*Number(l.unitPrice)*100)/100,0);
    if (!dto.paymentPercentage) throw new BadRequestException('Payment percentage is required');
    const amount = milestoneAmount(base, Number(dto.paymentPercentage));
    if (amount<=0) throw new BadRequestException('Each milestone must be at least one currency cent');
    if (dto.amountDue !== undefined && Math.abs(Number(dto.amountDue)-amount)>0.005) throw new BadRequestException('Amount must equal the PO total multiplied by milestone percentage');
    if (dto.poAmountBase !== undefined && Number(dto.poAmountBase)!==base) throw new BadRequestException('Calculation base must be the contractual PO total');
    if (dto.currency && dto.currency!==po.currency) throw new BadRequestException('Milestone currency must match PO currency');
    const method = dto.paymentMethod || po.paymentMethod || 'TELEGRAPHIC_TRANSFER';
    if (!['TELEGRAPHIC_TRANSFER','LETTER_OF_CREDIT','CASH_AGAINST_DOCUMENTS'].includes(method)) throw new BadRequestException('Invalid payment method');
    if (method==='TELEGRAPHIC_TRANSFER' && !dto.dueDate) throw new BadRequestException('T/T milestones require a due date');
    if (!dto.milestoneName?.trim()) throw new BadRequestException('Milestone name required');
    return {milestoneName:dto.milestoneName, paymentMethod:method, paymentPercentage:Number(dto.paymentPercentage), poAmountBase:base, amountDue:amount, currency:po.currency, dueDate:dto.dueDate, isAdvance:dto.isAdvance===true, notes:dto.notes};
  }

  async createPaymentSchedule(dto: CreatePaymentScheduleDto): Promise<PoPaymentSchedule> {
    return this.dataSource.transaction(async manager => {
      const po = await manager.findOne(PurchaseOrder,{where:{poId:dto.poId},lock:{mode:'pessimistic_write'}});
      if (!po || po.status!==POStatus.DRAFT) throw new BadRequestException('Edit milestones on a draft PO; request an amendment for issued POs');
      po.lines = await manager.find(PurchaseOrderLine,{where:{poId:po.poId}});
      const values = this.scheduleValues(dto,po);
      const existing = await manager.find(PoPaymentSchedule,{where:{poId:po.poId}});
      const total = existing.filter(x=>x.status!=='CANCELLED').reduce((sum,x)=>sum+Number(x.paymentPercentage||0),0)+values.paymentPercentage;
      if (total>100.001) throw new BadRequestException('Milestone percentages cannot exceed 100%; edit the existing schedule');
      return manager.save(PoPaymentSchedule,manager.create(PoPaymentSchedule,{...values,poId:po.poId,status:'PLANNED',createdBy:dto.userId}));
    });
  }

  async replacePaymentSchedules(poId: string, milestones: CreatePaymentScheduleDto[], userId: number) {
    if (!Array.isArray(milestones) || !milestones.length) throw new BadRequestException('At least one milestone required');
    return this.dataSource.transaction(async manager => {
      const po = await manager.findOne(PurchaseOrder,{where:{poId},lock:{mode:'pessimistic_write'}});
      if (!po || po.status!==POStatus.DRAFT) throw new BadRequestException('Schedules can only be replaced on draft POs');
      po.lines = await manager.find(PurchaseOrderLine,{where:{poId}});
      const existing = await manager.find(PoPaymentSchedule,{where:{poId},relations:['transactions']});
      if (existing.some(x=>x.transactions.length)) throw new BadRequestException('Schedules with payment history cannot be replaced');
      const values = milestones.map(dto=>this.scheduleValues(dto,po));
      if (Math.abs(values.reduce((sum,x)=>sum+x.paymentPercentage,0)-100)>0.001) throw new BadRequestException('Final schedule must equal 100%');
      // Allocate currency-rounding residue to the last milestone so the totals reconcile exactly.
      const base=values[0].poAmountBase;
      values[values.length-1].amountDue = Math.round((base-values.slice(0,-1).reduce((sum,x)=>sum+x.amountDue,0))*100)/100;
      if(values.some(v=>v.amountDue<=0)) throw new BadRequestException('Milestone rounding would create a non-positive payment');
      await manager.delete(PoPaymentSchedule,{poId});
      return manager.save(PoPaymentSchedule,values.map(v=>manager.create(PoPaymentSchedule,{...v,poId,status:'PLANNED',createdBy:userId})));
    });
  }

  async recordPaymentTransaction(dto: RecordPaymentTransactionDto): Promise<PoPaymentTransaction> {
    return this.dataSource.transaction(async manager => {
      const hint=await manager.findOne(PoPaymentSchedule,{where:{paymentScheduleId:dto.paymentScheduleId}});
      if (!hint) throw new NotFoundException('Payment milestone not found');
      const po = await manager.findOne(PurchaseOrder,{where:{poId:hint.poId},lock:{mode:'pessimistic_write'}});
      const schedule = await manager.findOne(PoPaymentSchedule,{where:{paymentScheduleId:dto.paymentScheduleId},lock:{mode:'pessimistic_write'}});
      if (!schedule || schedule.status==='CANCELLED') throw new BadRequestException('Active milestone required');
      if (!po || ![POStatus.CONFIRMED,POStatus.PARTIALLY_RECEIVED,POStatus.RECEIVED].includes(po.status)) throw new BadRequestException('Payments require a confirmed PO');
      await assertCompliance(manager,po,'PAYMENT');
      if (dto.currency && dto.currency.toUpperCase()!==schedule.currency) throw new BadRequestException('Payment currency must match milestone currency');
      if (!Number.isFinite(Number(dto.amountPaid)) || Number(dto.amountPaid)<=0 || !dto.paymentReference?.trim() || !dto.bankName?.trim()) throw new BadRequestException('Positive amount, bank and transaction reference required');
      const transactions = await manager.find(PoPaymentTransaction,{where:{paymentScheduleId:schedule.paymentScheduleId}});
      if (transactions.some(t=>t.paymentReference===dto.paymentReference)) throw new ConflictException('Payment reference already recorded for this milestone');
      const paid = transactions.filter(t=>t.status==='CONFIRMED').reduce((sum,t)=>sum+Number(t.amountPaid),0);
      if (Math.round((paid+Number(dto.amountPaid))*100)>Math.round(Number(schedule.amountDue)*100)) throw new BadRequestException('Payment exceeds milestone balance');
      return manager.save(PoPaymentTransaction,manager.create(PoPaymentTransaction,{...dto,currency:schedule.currency,paymentDate:dto.paymentDate||businessDate(),status:'INITIATED'}));
    });
  }

  async decidePayment(transactionId: string, status: string, reason: string, userId: number) {
    if (!['CONFIRMED','REJECTED','REVERSED'].includes(status) || !reason?.trim()) throw new BadRequestException('Valid decision and reason required');
    return this.dataSource.transaction(async manager => {
      const original = await manager.findOne(PoPaymentTransaction,{where:{paymentTransactionId:transactionId}});
      if (!original) throw new NotFoundException('Payment not found');
      const hint=await manager.findOne(PoPaymentSchedule,{where:{paymentScheduleId:original.paymentScheduleId}});
      if (!hint) throw new NotFoundException('Milestone not found');
      const po=await manager.findOne(PurchaseOrder,{where:{poId:hint.poId},lock:{mode:'pessimistic_write'}});
      const schedule = await manager.findOne(PoPaymentSchedule,{where:{paymentScheduleId:original.paymentScheduleId},lock:{mode:'pessimistic_write'}});
      const txn = await manager.findOne(PoPaymentTransaction,{where:{paymentTransactionId:transactionId},lock:{mode:'pessimistic_write'}});
      if (!txn || !schedule || (status==='REVERSED' ? txn.status!=='CONFIRMED' : txn.status!=='INITIATED')) throw new BadRequestException('Invalid payment decision transition');
      if (status==='CONFIRMED') {
        if(txn.currency!==schedule.currency) throw new BadRequestException('Payment currency no longer matches the milestone');
        if (!po || ![POStatus.CONFIRMED,POStatus.PARTIALLY_RECEIVED,POStatus.RECEIVED].includes(po.status) || schedule.status==='CANCELLED') throw new BadRequestException('Active confirmed PO and milestone required');
        await assertCompliance(manager,po,'PAYMENT');
        if(schedule.paymentMethod==='LETTER_OF_CREDIT') {
          const credits=await manager.find(PoLetterOfCredit,{where:{poId:po.poId,status:'ISSUED'}});
          const today=businessDate(new Date(),(await loadImportPolicy(manager)).timezone);
          if(!credits.some(lc=>lc.currency===schedule.currency && lc.expiryDate>=today && !!lc.latestShipmentDate)) throw new BadRequestException('L/C payment requires a valid issued Letter of Credit in the milestone currency');
        }
        if(schedule.paymentMethod==='CASH_AGAINST_DOCUMENTS') {
          const documents=await manager.query("SELECT 1 FROM attachment WHERE entity_type='po_payment_transaction' AND entity_id=$1 LIMIT 1",[transactionId]);
          if(!documents.length) throw new BadRequestException('Cash-against-documents payment requires supporting banking documents before confirmation');
        }
        const txns=await manager.find(PoPaymentTransaction,{where:{paymentScheduleId:schedule.paymentScheduleId,status:'CONFIRMED'}});
        if (Math.round((txns.reduce((sum,t)=>sum+Number(t.amountPaid),0)+Number(txn.amountPaid))*100)>Math.round(Number(schedule.amountDue)*100)) throw new BadRequestException('Confirmed payments would exceed the milestone');
      }
      const oldStatus=txn.status;
      txn.status=status;
      await manager.save(PoPaymentTransaction,txn);
      const txns=await manager.find(PoPaymentTransaction,{where:{paymentScheduleId:schedule.paymentScheduleId,status:'CONFIRMED'}});
      const paid=txns.reduce((sum,t)=>sum+Number(t.amountPaid),0);
      schedule.status=paid>=Number(schedule.amountDue)?'PAID':paid>0?'PARTIALLY_PAID':'PLANNED';
      await manager.save(PoPaymentSchedule,schedule);
      if (po) await this.recalculateDelivery(manager,po);
      await manager.query(`INSERT INTO audit_log(entity_type,entity_id,action,changed_by,old_value,new_value) VALUES ('po_payment_transaction',$1,'UPDATE',$2,$3,$4)`,[transactionId,userId,JSON.stringify({status:oldStatus}),JSON.stringify({status,reason})]);
      return txn;
    });
  }

  private async recalculateDelivery(manager: EntityManager, po: PurchaseOrder) {
    const schedules=await manager.find(PoPaymentSchedule,{where:{poId:po.poId},relations:['transactions']});
    const advances=schedules.filter(s=>s.isAdvance && s.status!=='CANCELLED');
    let advanceDate: string | undefined;
    if (advances.length && advances.every(s=>s.transactions.filter(t=>t.status==='CONFIRMED').reduce((sum,t)=>sum+Number(t.amountPaid),0)>=Number(s.amountDue))) {
      advanceDate=advances.flatMap(s=>s.transactions.filter(t=>t.status==='CONFIRMED').map(t=>t.paymentDate)).sort().pop();
    }
    const policy=await loadImportPolicy(manager);
    const date=deliveryDate(po.issuedDate,advanceDate,po.deliveryLeadTimeDays??30,po.leadTimeTrigger,po.leadTimeDayType,policy.holidays);
    await manager.update(PurchaseOrder,{poId:po.poId},{expectedDeliveryDate:date});
    po.expectedDeliveryDate=date;
  }

  async getLettersOfCredit(poId: string): Promise<PoLetterOfCredit[]> {
    return this.lcRepo.find({
      where: { poId },
      relations: ['creator'],
      order: { lcId: 'DESC' },
    });
  }

  async createLetterOfCredit(dto: CreateLetterOfCreditDto): Promise<PoLetterOfCredit> {
    const po = await this.findOne(dto.poId!);
    if(!dto.lcNumber?.trim() || !dto.issuingBank?.trim()) throw new BadRequestException('L/C reference and issuing bank are required');
    if (dto.currency && dto.currency!==po.currency) throw new BadRequestException('L/C currency must match PO');
    const existing = await this.lcRepo.findOne({ where: { lcNumber: dto.lcNumber } });
    if (existing) {
      throw new ConflictException(`L/C with reference number ${dto.lcNumber} already exists`);
    }

    const status = dto.status || 'ISSUED';
    if (!['DRAFT','APPLIED','ISSUED'].includes(status)) throw new BadRequestException('Invalid initial L/C status');
    if (status === 'ISSUED' && !dto.latestShipmentDate) {
      throw new BadRequestException('Latest shipment date is required when creating an issued Letter of Credit');
    }

    const issueDate = new Date(dto.issueDate);
    const expiryDate = new Date(dto.expiryDate);
    if (Number.isNaN(issueDate.getTime()) || Number.isNaN(expiryDate.getTime())) {
      throw new BadRequestException('L/C issue date and expiry date must be valid dates');
    }
    if (expiryDate < issueDate) {
      throw new BadRequestException('L/C expiry date must be on or after the issue date');
    }
    if (dto.latestShipmentDate) {
      const latestShipmentDate = new Date(dto.latestShipmentDate);
      if (Number.isNaN(latestShipmentDate.getTime())) {
        throw new BadRequestException('Latest shipment date must be a valid date');
      }
      if (latestShipmentDate < issueDate) {
        throw new BadRequestException('Latest shipment date cannot be earlier than the L/C issue date');
      }
      if (latestShipmentDate > expiryDate) {
        throw new BadRequestException('Latest shipment date cannot be after the L/C expiry date');
      }
    }

    const lc = this.lcRepo.create({
      poId: dto.poId,
      lcNumber: dto.lcNumber,
      issuingBank: dto.issuingBank,
      advisingBank: dto.advisingBank,
      amount: dto.amount,
      currency: dto.currency || po.currency,
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

  async updateLetterOfCreditStatus(lcId: string, status: string, notes?: string, userId?: number): Promise<PoLetterOfCredit> {
    const lc = await this.lcRepo.findOne({ where: { lcId } });
    if (!lc) {
      throw new NotFoundException(`Letter of Credit #${lcId} not found`);
    }
    const transitions: Record<string,string[]> = {DRAFT:['APPLIED','ISSUED','CANCELLED'],APPLIED:['ISSUED','CANCELLED'],ISSUED:['UTILIZED','AMENDED','EXPIRED','CANCELLED'],AMENDED:['ISSUED','UTILIZED','EXPIRED','CANCELLED'],UTILIZED:['CLOSED'],EXPIRED:['CLOSED'],CANCELLED:[],CLOSED:[]};
    if (!transitions[lc.status]?.includes(status)) throw new BadRequestException('Invalid L/C status transition');
    if (status==='ISSUED' && (!lc.latestShipmentDate || !lc.expiryDate || lc.latestShipmentDate>lc.expiryDate || lc.latestShipmentDate<lc.issueDate)) throw new BadRequestException('Issued L/C requires valid independent shipment and expiry dates');
    await this.auditService.log({entityType:'po_letter_of_credit',entityId:lcId,action:'UPDATE',changedBy:userId,oldValue:{status:lc.status},newValue:{status,notes}});
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

    const now = new Date();
    const todayStr = businessDate(now,(await this.getImportPolicy()).timezone);

    let totalCommitted = 0;
    let totalPaid = 0;
    const byCurrency: Record<string, { totalCommitted: number; totalPaid: number; outstandingBalance: number; overdueAmount:number }> = {};
    const upcomingMilestones: any[] = [];
    const overdueMilestones: any[] = [];
    const allMilestones: any[] = [];

    for (const s of schedules) {
      if (s.status==='CANCELLED' || s.purchaseOrder?.status===POStatus.CANCELLED) continue;
      const due = Number(s.amountDue);
      const paid = (s.transactions || [])
        .filter((t) => t.status === 'CONFIRMED')
        .reduce((sum, t) => sum + Number(t.amountPaid), 0);
      const remaining = Math.max(0, due - paid);

      const curr = s.currency || 'USD';
      if (!byCurrency[curr]) {
        byCurrency[curr] = { totalCommitted: 0, totalPaid: 0, outstandingBalance: 0, overdueAmount:0 };
      }
      byCurrency[curr].totalCommitted += due;
      byCurrency[curr].totalPaid += paid;
      byCurrency[curr].outstandingBalance += remaining;

      const overdue=Boolean(s.dueDate && s.dueDate<todayStr && remaining>0);
      if(overdue) byCurrency[curr].overdueAmount+=remaining;
      allMilestones.push({poNumber:s.purchaseOrder?.poNumber,supplierName:s.purchaseOrder?.supplier?.supplierName,milestoneName:s.milestoneName,paymentPercentage:s.paymentPercentage,amountDue:due,amountPaid:paid,remaining,dueDate:s.dueDate,currency:curr,status:overdue?'OVERDUE':s.status});
      totalCommitted += due;
      totalPaid += paid;

      if (s.status !== 'PAID' && remaining > 0) {
        const isOverdue = Boolean(s.dueDate && s.dueDate < todayStr);
        const item = {
          paymentScheduleId: s.paymentScheduleId,
          poNumber: s.purchaseOrder?.poNumber,
          supplierName: s.purchaseOrder?.supplier?.supplierName,
          milestoneName: s.milestoneName,
          paymentPercentage: s.paymentPercentage,
          amountDue: due,
          amountPaid: paid,
          remaining,
          dueDate: s.dueDate,
          currency: s.currency,
          status: isOverdue ? 'OVERDUE' : s.status,
        };

        if (isOverdue) {
          overdueMilestones.push(item);
        } else {
          upcomingMilestones.push(item);
        }
      }
    }

    const activeLCs = await this.lcRepo.find({
      relations: ['purchaseOrder', 'purchaseOrder.supplier'],
      where: { status: In(['APPLIED', 'ISSUED', 'AMENDED', 'EXPIRED']) },
    });

    return {
      totalCommitted: Object.keys(byCurrency).length===1 ? totalCommitted : null,
      totalPaid: Object.keys(byCurrency).length===1 ? totalPaid : null,
      outstandingBalance: Object.keys(byCurrency).length===1 ? Math.max(0,totalCommitted-totalPaid) : null,
      byCurrency,
      allMilestones,
      upcomingMilestonesCount: upcomingMilestones.length,
      upcomingMilestones,
      overdueMilestonesCount: overdueMilestones.length,
      overdueMilestones,
      activeLettersOfCreditCount: activeLCs.length,
      activeLettersOfCredit: activeLCs.filter(lc=>lc.purchaseOrder?.status!==POStatus.CANCELLED).map(lc=>({...lc,expiryStatus:lc.expiryDate<todayStr?'EXPIRED':'ACTIVE',shipmentDeadlineStatus:lc.latestShipmentDate && lc.latestShipmentDate<todayStr?'MISSED':'UPCOMING'})),
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
