import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalesEnquiry, EnquiryStatus } from './entities/sales-enquiry.entity';
import { PreAdvanceSlip, PreAdvanceSlipStatus } from './entities/pre-advance-slip.entity';
import { CustomerVehicleInspection, InspectionStatus, InspectionOutcome } from './entities/customer-vehicle-inspection.entity';
import { ProductItem } from '../products/entities/product-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { VehicleUnit } from '../vehicles/entities/vehicle-unit.entity';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { EnquiryQueryDto } from './dto/enquiry-query.dto';
import { EnquiryApprovalDto } from './dto/enquiry-approval.dto';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { CompleteInspectionDto } from './dto/complete-inspection.dto';
import { ExtendInspectionDto, CancelInspectionDto } from './dto/extend-inspection.dto';
import { UpdateFinancingStatusDto } from './dto/update-financing-status.dto';
import { AuditService } from '../audit/audit.service';

const mapInspectionResponse = (insp: any) => {
  if (!insp) return null;
  return {
    ...insp,
    scheduledAt: insp.inspectionStartTime || insp.createdAt,
    startedAt: insp.inspectionStartTime,
    durationMinutes: insp.allowedDurationMinutes,
    deadlineAt: insp.inspectionDeadline,
    completedAt: insp.inspectionCompletedAt,
    inspectionStatus: insp.status,
    inspectionOutcome: insp.outcome,
    extendedMinutes: insp.extensionMinutes,
    outcomeReason: insp.remarks,
  };
};

@Injectable()
export class EnquiriesService {
  constructor(
    @InjectRepository(SalesEnquiry)
    private readonly enquiryRepo: Repository<SalesEnquiry>,
    @InjectRepository(PreAdvanceSlip)
    private readonly slipRepo: Repository<PreAdvanceSlip>,
    @InjectRepository(CustomerVehicleInspection)
    private readonly inspectionRepo: Repository<CustomerVehicleInspection>,
    @InjectRepository(ProductItem)
    private readonly itemRepo: Repository<ProductItem>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(VehicleUnit)
    private readonly vehicleUnitRepo: Repository<VehicleUnit>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateEnquiryDto, userId: number = 1): Promise<SalesEnquiry> {
    const customer = await this.customerRepo.findOne({ where: { customerId: dto.customerId } });
    if (!customer) throw new NotFoundException(`Customer ${dto.customerId} not found`);

    const item = await this.itemRepo.findOne({
      where: { itemId: dto.itemId },
      relations: ['taxConfig'],
    });
    if (!item) throw new NotFoundException(`Item ${dto.itemId} not found`);

    const spName = (dto.salespersonName || '').trim();
    const genericPlaceholders = [
      'sales person',
      'salesperson',
      'sales',
      'sales specialist',
      'rep',
      'representative',
      'demo salesperson',
      'sales rep',
      'n/a',
      'na',
      'none',
      'test',
      'unknown',
      'admin',
      'user',
    ];
    if (!spName || spName.length < 2 || genericPlaceholders.includes(spName.toLowerCase())) {
      throw new BadRequestException(
        'Salesperson name is mandatory. Please provide an actual salesperson full name (generic terms like "Sales Person" or "Salesperson" are not permitted).',
      );
    }

    const unitPrice = Number(dto.unitPrice || item.sellingPrice);
    const qty = Number(dto.quantity || 1);
    const subtotal = unitPrice * qty;

    // Calculate VAT using configured tax rate (default 15%)
    const taxRatePct = item.taxConfig ? Number(item.taxConfig.taxRatePct) : 15.0;
    const vatAmount = Number(((subtotal * taxRatePct) / 100).toFixed(2));
    const estimatedValue = Number((subtotal + vatAmount).toFixed(2));

    // --- Commission Agent Calculation (Client Demo Feedback New Story 1) ---
    let commName: string | undefined = undefined;
    let commPhone: string | undefined = undefined;
    let commPct: number | undefined = undefined;
    let commAmt: number = 0;
    if (dto.leadSource === 'COMMISSION_AGENT') {
      commName = (dto.commissionAgentName || '').trim();
      commPhone = (dto.commissionAgentPhone || '').trim();
      commPct = dto.commissionPercentage !== undefined ? Number(dto.commissionPercentage) : 0;
      if (!commName) throw new BadRequestException('Agent Name is mandatory when Commission Agent is selected as lead source');
      if (!commPhone) throw new BadRequestException('Agent Phone Number is mandatory when Commission Agent is selected as lead source');
      if (commPct <= 0 || commPct > 100) throw new BadRequestException('Commission percentage must be greater than 0% and not exceed 100%');
      commAmt = Number(((estimatedValue * commPct) / 100).toFixed(2));
    }

    // --- Financing Calculation (Client Demo Feedback New Story 3) ---
    let finOption = dto.financingOption || (dto.financingRequired ? 'BANK_FINANCING' : 'CASH');
    let finType = dto.financingType || (finOption === 'MICROFINANCE_FINANCING' ? 'MICROFINANCE' : 'BANK');
    let finInst = dto.financingInstitutionName || dto.financeProvider || undefined;
    let finContactPerson = dto.financingContactPerson || undefined;
    let finContactPhone = dto.financingContactPhone || undefined;
    let finPct = dto.financingPercentage !== undefined ? Number(dto.financingPercentage) : undefined;
    let finAmt = 0;
    let custContribPct = 100;
    let custContribAmt = estimatedValue;

    if (finOption === 'BANK_FINANCING' || finOption === 'MICROFINANCE_FINANCING') {
      if (!finInst) {
        throw new BadRequestException('Financing Institution Name is mandatory when Bank or Microfinance financing is selected');
      }
      if (finPct !== undefined && (finPct <= 0 || finPct > 100)) {
        throw new BadRequestException('Financing percentage must be greater than 0% and not exceed 100%');
      }
      const effPct = finPct !== undefined ? finPct : 70.0;
      finPct = effPct;
      finAmt = Number(((estimatedValue * effPct) / 100).toFixed(2));
      custContribPct = Number((100 - effPct).toFixed(2));
      custContribAmt = Number((estimatedValue - finAmt).toFixed(2));
    } else {
      finOption = 'CASH';
      finType = undefined;
      finInst = undefined;
      finPct = undefined;
      finAmt = 0;
      custContribPct = 100;
      custContribAmt = estimatedValue;
    }

    const initialStatus = dto.isDraft ? EnquiryStatus.DRAFT : EnquiryStatus.SUBMITTED;

    const enquiry = this.enquiryRepo.create({
      customerId: dto.customerId,
      itemId: dto.itemId,
      quantity: qty,
      unitPrice,
      vatAmount,
      estimatedSalesValue: estimatedValue,
      salespersonName: spName,
      paymentMode: dto.paymentMode || 'BANK_DEPOSIT',
      status: initialStatus,
      createdBy: userId,
      // KMSI-14-11: Enquiry Details
      leadSource: dto.leadSource || 'WALK_IN',
      branchShowroom: dto.branchShowroom,
      // KMSI-14-12: Vehicle Requirements
      vehicleCategoryId: dto.vehicleCategoryId,
      preferredColor: dto.preferredColor,
      requiredDeliveryDate: dto.requiredDeliveryDate,
      registrationHomologationNeeded: Boolean(dto.registrationHomologationNeeded),
      chargerTypeIncluded: Boolean(dto.chargerTypeIncluded),
      // KMSI-14-13: Budget & Preferences
      targetBudget: dto.targetBudget,
      currency: dto.currency || 'ETB',
      financingRequired: finOption !== 'CASH',
      expectedDeposit: dto.expectedDeposit,
      expectedPaymentTimeline: dto.expectedPaymentTimeline,
      financeProvider: finInst,
      tradeInVehicle: Boolean(dto.tradeInVehicle),
      // KMSI-14-14: Customer Requirements Notes
      customerRequirementsNotes: dto.customerRequirementsNotes,
      // New Story 1: Commission Agent Tracking
      commissionAgentName: commName,
      commissionAgentPhone: commPhone,
      commissionPercentage: commPct,
      commissionAmount: commAmt,
      commissionNotes: dto.commissionNotes,
      // New Story 3: Financing Tracking
      financingOption: finOption,
      financingType: finType,
      financingInstitutionName: finInst,
      financingContactPerson: finContactPerson,
      financingContactPhone: finContactPhone,
      financingPercentage: finPct,
      financingAmount: finAmt,
      customerContributionPercentage: custContribPct,
      customerContributionAmount: custContribAmt,
      financingStatus: dto.financingStatus || 'NOT_SUBMITTED',
      financingApplicationNumber: dto.financingApplicationNumber,
      financingSubmissionDate: dto.financingSubmissionDate,
      financingApprovalDate: dto.financingApprovalDate,
      financingApprovedAmount: dto.financingApprovedAmount,
      financingDisbursedAmount: dto.financingDisbursedAmount,
      financingDisbursementDate: dto.financingDisbursementDate,
      financingNotes: dto.financingNotes,
    });

    const saved = await this.enquiryRepo.save(enquiry);

    await this.auditService.log({
      entityType: 'sales_enquiry',
      entityId: saved.enquiryId,
      action: 'INSERT',
      changedBy: userId,
      newValue: {
        enquiryNumber: saved.enquiryNumber,
        customerId: saved.customerId,
        estimatedSalesValue: saved.estimatedSalesValue,
        status: saved.status,
      },
    });

    return this.findOne(saved.enquiryId);
  }

  async findAll(query: EnquiryQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const qb = this.enquiryRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.customer', 'customer')
      .leftJoinAndSelect('e.item', 'item')
      .leftJoinAndSelect('item.brand', 'brand')
      .leftJoinAndSelect('e.salesRepApprover', 'salesRepApprover')
      .leftJoinAndSelect('e.salesManagerApprover', 'salesManagerApprover');

    if (query.status) {
      qb.andWhere('e.status = :status', { status: query.status });
    }
    if (query.customerId) {
      qb.andWhere('e.customerId = :cid', { cid: query.customerId });
    }
    if (query.search && query.search.trim() !== '') {
      const s = `%${query.search.trim()}%`;
      qb.andWhere('(e.enquiryNumber ILIKE :s OR customer.fullName ILIKE :s OR item.itemName ILIKE :s OR e.salespersonName ILIKE :s OR e.leadSource ILIKE :s OR e.branchShowroom ILIKE :s)', { s });
    }

    qb.orderBy('e.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    if (items.length > 0) {
      const enquiryIds = items.map((i) => i.enquiryId);
      const inspections = await this.inspectionRepo
        .createQueryBuilder('insp')
        .where('insp.enquiryId IN (:...enquiryIds)', { enquiryIds })
        .orderBy('insp.createdAt', 'DESC')
        .getMany();

      for (const item of items) {
        (item as any).inspections = inspections
          .filter((insp) => String(insp.enquiryId) === String(item.enquiryId))
          .map(mapInspectionResponse);
      }
    }

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<SalesEnquiry> {
    const enquiry = await this.enquiryRepo.findOne({
      where: { enquiryId: id },
      relations: [
        'customer',
        'item',
        'item.brand',
        'item.category',
        'creator',
        'salesRepApprover',
        'salesManagerApprover',
      ],
    });
    if (!enquiry) throw new NotFoundException(`Sales Enquiry with ID ${id} not found`);

    const insps = await this.inspectionRepo.find({
      where: { enquiryId: id },
      order: { createdAt: 'DESC' },
    });
    (enquiry as any).inspections = insps.map(mapInspectionResponse);

    return enquiry;
  }

  // KMSI-14-15: Submit Draft Enquiry
  async submitEnquiry(id: string, userId: number = 1): Promise<SalesEnquiry> {
    const enquiry = await this.findOne(id);
    if (enquiry.status !== EnquiryStatus.DRAFT && enquiry.status !== EnquiryStatus.REJECTED) {
      throw new BadRequestException(`Cannot submit enquiry currently in ${enquiry.status} state. Only DRAFT or REJECTED enquiries can be submitted.`);
    }
    enquiry.status = EnquiryStatus.SUBMITTED;
    const saved = await this.enquiryRepo.save(enquiry);
    await this.auditService.log({
      entityType: 'sales_enquiry',
      entityId: id,
      action: 'UPDATE',
      changedBy: userId,
      oldValue: { status: enquiry.status },
      newValue: { status: saved.status },
    });
    return saved;
  }

  // KMSI-14-15: Correct & Resubmit / Update Enquiry
  async updateEnquiry(
    id: string,
    dto: Partial<CreateEnquiryDto>,
    userId: number = 1,
  ): Promise<SalesEnquiry> {
    const enquiry = await this.findOne(id);
    if (enquiry.status !== EnquiryStatus.DRAFT && enquiry.status !== EnquiryStatus.REJECTED) {
      throw new BadRequestException(`Cannot edit enquiry in ${enquiry.status} state. Only DRAFT or REJECTED enquiries can be modified.`);
    }

    if (dto.customerId) enquiry.customerId = dto.customerId;
    if (dto.itemId) {
      enquiry.itemId = dto.itemId;
      const product = await this.itemRepo.findOne({ where: { itemId: dto.itemId } });
      if (product) {
        enquiry.unitPrice = dto.unitPrice !== undefined ? dto.unitPrice : Number(product.sellingPrice);
      }
    } else if (dto.unitPrice !== undefined) {
      enquiry.unitPrice = dto.unitPrice;
    }
    if (dto.quantity !== undefined) enquiry.quantity = dto.quantity;
    if (dto.salespersonName) enquiry.salespersonName = dto.salespersonName;
    if (dto.paymentMode) enquiry.paymentMode = dto.paymentMode;
    if (dto.leadSource !== undefined) enquiry.leadSource = dto.leadSource;
    if (dto.branchShowroom !== undefined) enquiry.branchShowroom = dto.branchShowroom;
    if (dto.vehicleCategoryId !== undefined) enquiry.vehicleCategoryId = dto.vehicleCategoryId;
    if (dto.preferredColor !== undefined) enquiry.preferredColor = dto.preferredColor;
    if (dto.requiredDeliveryDate !== undefined) enquiry.requiredDeliveryDate = dto.requiredDeliveryDate;
    if (dto.registrationHomologationNeeded !== undefined) enquiry.registrationHomologationNeeded = dto.registrationHomologationNeeded;
    if (dto.chargerTypeIncluded !== undefined) enquiry.chargerTypeIncluded = dto.chargerTypeIncluded;
    if (dto.targetBudget !== undefined) enquiry.targetBudget = dto.targetBudget;
    if (dto.currency !== undefined) enquiry.currency = dto.currency;
    if (dto.financingRequired !== undefined) enquiry.financingRequired = dto.financingRequired;
    if (dto.expectedDeposit !== undefined) enquiry.expectedDeposit = dto.expectedDeposit;
    if (dto.expectedPaymentTimeline !== undefined) enquiry.expectedPaymentTimeline = dto.expectedPaymentTimeline;
    if (dto.financeProvider !== undefined) enquiry.financeProvider = dto.financeProvider;
    if (dto.tradeInVehicle !== undefined) enquiry.tradeInVehicle = dto.tradeInVehicle;
    if (dto.customerRequirementsNotes !== undefined) enquiry.customerRequirementsNotes = dto.customerRequirementsNotes;

    // Recalculate totals
    const subtotal = Number(enquiry.unitPrice) * enquiry.quantity;
    const vat = subtotal * 0.15;
    enquiry.estimatedSalesValue = subtotal + vat;
    enquiry.vatAmount = vat;

    // Commission Agent updates & recalculation
    if (dto.commissionAgentName !== undefined) enquiry.commissionAgentName = dto.commissionAgentName;
    if (dto.commissionAgentPhone !== undefined) enquiry.commissionAgentPhone = dto.commissionAgentPhone;
    if (dto.commissionPercentage !== undefined) enquiry.commissionPercentage = dto.commissionPercentage;
    if (dto.commissionNotes !== undefined) enquiry.commissionNotes = dto.commissionNotes;
    if (enquiry.leadSource === 'COMMISSION_AGENT' && enquiry.commissionPercentage) {
      enquiry.commissionAmount = Number(((enquiry.estimatedSalesValue * Number(enquiry.commissionPercentage)) / 100).toFixed(2));
    } else if (enquiry.leadSource !== 'COMMISSION_AGENT') {
      enquiry.commissionAmount = 0;
    }

    // Financing updates & recalculation
    if (dto.financingOption !== undefined) enquiry.financingOption = dto.financingOption;
    if (dto.financingType !== undefined) enquiry.financingType = dto.financingType;
    if (dto.financingInstitutionName !== undefined) enquiry.financingInstitutionName = dto.financingInstitutionName;
    if (dto.financingContactPerson !== undefined) enquiry.financingContactPerson = dto.financingContactPerson;
    if (dto.financingContactPhone !== undefined) enquiry.financingContactPhone = dto.financingContactPhone;
    if (dto.financingPercentage !== undefined) enquiry.financingPercentage = dto.financingPercentage;
    if (dto.financingStatus !== undefined) enquiry.financingStatus = dto.financingStatus;
    if (dto.financingApplicationNumber !== undefined) enquiry.financingApplicationNumber = dto.financingApplicationNumber;
    if (dto.financingSubmissionDate !== undefined) enquiry.financingSubmissionDate = dto.financingSubmissionDate;
    if (dto.financingApprovalDate !== undefined) enquiry.financingApprovalDate = dto.financingApprovalDate;
    if (dto.financingApprovedAmount !== undefined) enquiry.financingApprovedAmount = dto.financingApprovedAmount;
    if (dto.financingDisbursedAmount !== undefined) enquiry.financingDisbursedAmount = dto.financingDisbursedAmount;
    if (dto.financingDisbursementDate !== undefined) enquiry.financingDisbursementDate = dto.financingDisbursementDate;
    if (dto.financingNotes !== undefined) enquiry.financingNotes = dto.financingNotes;

    if (enquiry.financingOption === 'BANK_FINANCING' || enquiry.financingOption === 'MICROFINANCE_FINANCING') {
      const pct = enquiry.financingPercentage !== undefined ? Number(enquiry.financingPercentage) : 70.0;
      enquiry.financingPercentage = pct;
      enquiry.financingAmount = Number(((enquiry.estimatedSalesValue * pct) / 100).toFixed(2));
      enquiry.customerContributionPercentage = Number((100 - pct).toFixed(2));
      enquiry.customerContributionAmount = Number((enquiry.estimatedSalesValue - enquiry.financingAmount).toFixed(2));
    } else {
      enquiry.financingOption = 'CASH';
      enquiry.financingAmount = 0;
      enquiry.customerContributionPercentage = 100;
      enquiry.customerContributionAmount = enquiry.estimatedSalesValue;
    }

    // If it was rejected and user is resubmitting (or not draft)
    if (!dto.isDraft) {
      enquiry.status = EnquiryStatus.SUBMITTED;
      enquiry.rejectionReason = null as any;
      enquiry.salesRepApprovedAt = null as any;
      enquiry.salesRepApprovedBy = null as any;
      enquiry.salesRepNotes = null as any;
      enquiry.salesManagerApprovedAt = null as any;
      enquiry.salesManagerApprovedBy = null as any;
      enquiry.salesManagerNotes = null as any;
    }

    const saved = await this.enquiryRepo.save(enquiry);
    await this.auditService.log({
      entityType: 'sales_enquiry',
      entityId: id,
      action: 'UPDATE',
      changedBy: userId,
      newValue: {
        status: saved.status,
        enquiryNumber: saved.enquiryNumber,
      },
    });
    return saved;
  }

  // KMSI-14-15: Step 1: Sales Representative Approval
  async salesRepApproval(id: string, dto: EnquiryApprovalDto, userId: number = 1): Promise<SalesEnquiry> {
    const enquiry = await this.findOne(id);
    if (enquiry.status !== EnquiryStatus.SUBMITTED) {
      throw new BadRequestException(`Enquiry must be in SUBMITTED status for Sales Rep review. Current status: ${enquiry.status}`);
    }

    if (dto.approved === false) {
      enquiry.status = EnquiryStatus.REJECTED;
      enquiry.rejectionReason = dto.rejectionReason || 'Rejected by Sales Representative';
    } else {
      enquiry.status = EnquiryStatus.SALES_REP_APPROVED;
      enquiry.salesRepApprovedBy = userId;
      enquiry.salesRepApprovedAt = new Date();
      enquiry.salesRepNotes = dto.notes;
    }

    const saved = await this.enquiryRepo.save(enquiry);
    await this.auditService.log({
      entityType: 'sales_enquiry',
      entityId: id,
      action: 'UPDATE',
      changedBy: userId,
      newValue: {
        status: saved.status,
        salesRepNotes: saved.salesRepNotes,
        rejectionReason: saved.rejectionReason,
      },
    });
    return saved;
  }

  // KMSI-14-15: Step 2: Sales Manager Approval
  async salesManagerApproval(id: string, dto: EnquiryApprovalDto, userId: number = 1): Promise<SalesEnquiry> {
    const enquiry = await this.findOne(id);
    if (enquiry.status !== EnquiryStatus.SALES_REP_APPROVED) {
      throw new BadRequestException(`Enquiry must be approved by Sales Representative before Sales Manager can approve. Current status: ${enquiry.status}`);
    }

    if (dto.approved === false) {
      enquiry.status = EnquiryStatus.REJECTED;
      enquiry.rejectionReason = dto.rejectionReason || 'Rejected by Sales Manager';
    } else {
      enquiry.status = EnquiryStatus.APPROVED;
      enquiry.salesManagerApprovedBy = userId;
      enquiry.salesManagerApprovedAt = new Date();
      enquiry.salesManagerNotes = dto.notes;

      // Automatically generate Pre-Advance Slip with 3-day validity window
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3);

      let slip = await this.slipRepo.findOne({ where: { enquiryId: id } });
      if (!slip) {
        slip = this.slipRepo.create({
          enquiryId: id,
          customerId: enquiry.customerId,
          itemId: enquiry.itemId,
          quantity: enquiry.quantity,
          unitPrice: enquiry.unitPrice,
          vatAmount: enquiry.vatAmount,
          totalAmount: enquiry.estimatedSalesValue,
          requiredAdvanceAmount: enquiry.estimatedSalesValue,
          status: PreAdvanceSlipStatus.ACTIVE,
          issuedAt: new Date(),
          expiresAt,
          createdBy: userId,
        });
      } else {
        slip.status = PreAdvanceSlipStatus.ACTIVE;
        slip.expiresAt = expiresAt;
      }
      await this.slipRepo.save(slip);
    }

    const saved = await this.enquiryRepo.save(enquiry);
    await this.auditService.log({
      entityType: 'sales_enquiry',
      entityId: id,
      action: 'UPDATE',
      changedBy: userId,
      newValue: {
        status: saved.status,
        salesManagerNotes: saved.salesManagerNotes,
        rejectionReason: saved.rejectionReason,
      },
    });
    return saved;
  }

  async updateStatus(
    id: string,
    status: EnquiryStatus,
    rejectionReason?: string,
    userId: number = 1,
  ): Promise<SalesEnquiry> {
    const enquiry = await this.findOne(id);
    const oldStatus = enquiry.status;

    if (status === EnquiryStatus.REJECTED && (!rejectionReason || rejectionReason.trim().length === 0)) {
      throw new BadRequestException('Mandatory rejection reason is required when rejecting a sales enquiry');
    }

    enquiry.status = status;
    if (rejectionReason) enquiry.rejectionReason = rejectionReason.trim();

    const saved = await this.enquiryRepo.save(enquiry);

    // Once approved, automatically generate pre-advance slip with 3-day expiry
    if (status === EnquiryStatus.APPROVED) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3);

      let slip = await this.slipRepo.findOne({ where: { enquiryId: id } });
      if (!slip) {
        slip = this.slipRepo.create({
          enquiryId: id,
          customerId: enquiry.customerId,
          itemId: enquiry.itemId,
          quantity: enquiry.quantity,
          unitPrice: enquiry.unitPrice,
          vatAmount: enquiry.vatAmount,
          totalAmount: enquiry.estimatedSalesValue,
          requiredAdvanceAmount: enquiry.estimatedSalesValue,
          status: PreAdvanceSlipStatus.ACTIVE,
          issuedAt: new Date(),
          expiresAt,
          createdBy: userId,
        });
      } else {
        slip.status = PreAdvanceSlipStatus.ACTIVE;
        slip.expiresAt = expiresAt;
      }
      await this.slipRepo.save(slip);
    }

    await this.auditService.log({
      entityType: 'sales_enquiry',
      entityId: id,
      action: 'UPDATE',
      changedBy: userId,
      oldValue: { status: oldStatus },
      newValue: { status: saved.status, rejectionReason: saved.rejectionReason },
    });

    return saved;
  }

  async getSlipByEnquiryId(enquiryId: string): Promise<PreAdvanceSlip | null> {
    const slip = await this.slipRepo.findOne({
      where: { enquiryId },
      relations: ['enquiry', 'customer', 'item', 'item.brand', 'creator'],
    });

    if (slip && slip.status === PreAdvanceSlipStatus.ACTIVE && new Date() > new Date(slip.expiresAt)) {
      slip.status = PreAdvanceSlipStatus.EXPIRED;
      await this.slipRepo.save(slip);
    }

    return slip;
  }

  async getSlipById(slipId: string): Promise<PreAdvanceSlip> {
    const slip = await this.slipRepo.findOne({
      where: { slipId },
      relations: ['enquiry', 'customer', 'item', 'item.brand', 'creator'],
    });
    if (!slip) throw new NotFoundException(`Pre-advance slip #${slipId} not found`);

    if (slip.status === PreAdvanceSlipStatus.ACTIVE && new Date() > new Date(slip.expiresAt)) {
      slip.status = PreAdvanceSlipStatus.EXPIRED;
      await this.slipRepo.save(slip);
    }

    return slip;
  }

  async getAllSlips(query?: { status?: string; search?: string }): Promise<PreAdvanceSlip[]> {
    const qb = this.slipRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.enquiry', 'enquiry')
      .leftJoinAndSelect('s.customer', 'customer')
      .leftJoinAndSelect('s.item', 'item')
      .leftJoinAndSelect('item.brand', 'brand')
      .orderBy('s.issuedAt', 'DESC');

    if (query?.status) {
      qb.andWhere('s.status = :st', { st: query.status });
    }
    if (query?.search && query.search.trim()) {
      const s = `%${query.search.trim()}%`;
      qb.andWhere('(s.slipNumber ILIKE :s OR customer.fullName ILIKE :s OR item.itemName ILIKE :s)', { s });
    }

    const slips = await qb.getMany();
    const now = new Date();
    for (const slip of slips) {
      if (slip.status === PreAdvanceSlipStatus.ACTIVE && now > new Date(slip.expiresAt)) {
        slip.status = PreAdvanceSlipStatus.EXPIRED;
        await this.slipRepo.save(slip);
      }
    }
    return slips;
  }

  // =========================================================================
  // --- Customer Vehicle Inspection Management (Client Demo Feedback New Story 2) ---
  // =========================================================================

  async initiateInspection(
    enquiryId: string,
    dto: CreateInspectionDto,
    userId: number = 1,
  ): Promise<CustomerVehicleInspection> {
    const enquiry = await this.findOne(enquiryId);
    if (!enquiry) {
      throw new NotFoundException(`Sales Enquiry #${enquiryId} not found`);
    }

    // Check if there is already an active inspection
    const active = await this.inspectionRepo.findOne({
      where: [
        { enquiryId, status: InspectionStatus.IN_PROGRESS },
        { enquiryId, status: InspectionStatus.PENDING },
      ],
    });
    if (active) {
      throw new BadRequestException(
        `An active inspection (${active.inspectionNumber}) is already in progress for Enquiry #${enquiry.enquiryNumber}.`,
      );
    }

    const duration =
      (dto.durationMinutes || dto.allowedDurationMinutes) &&
      (dto.durationMinutes || dto.allowedDurationMinutes) >= 15
        ? (dto.durationMinutes || dto.allowedDurationMinutes)
        : 120;
    const startTime = new Date();
    const deadline = new Date(startTime.getTime() + duration * 60 * 1000);

    const vehicleModel = dto.vehicleModel || (enquiry.item ? enquiry.item.itemName : 'Motorcycle / Three-Wheeler');
    const remarks = [dto.remarks, dto.notes, dto.inspectorName ? `Inspector: ${dto.inspectorName}` : null]
      .filter(Boolean)
      .join(' | ');

    const inspection = this.inspectionRepo.create({
      enquiryId,
      customerId: enquiry.customerId,
      itemId: enquiry.itemId,
      vehicleModel,
      engineNumber: dto.engineNumber,
      vinChassisNumber: dto.vinChassisNumber,
      vehicleUnitId: dto.vehicleUnitId,
      inspectionStartTime: startTime,
      allowedDurationMinutes: duration,
      inspectionDeadline: deadline,
      status: InspectionStatus.IN_PROGRESS,
      remarks: remarks || undefined,
      createdBy: userId,
    });

    const saved = await this.inspectionRepo.save(inspection);

    await this.auditService.log({
      entityType: 'customer_vehicle_inspection',
      entityId: saved.inspectionId,
      action: 'INSERT',
      changedBy: userId,
      newValue: {
        inspectionNumber: saved.inspectionNumber,
        enquiryId,
        deadline,
        status: saved.status,
      },
    });

    return mapInspectionResponse(saved) as any;
  }

  async completeInspection(
    inspectionId: string,
    dto: CompleteInspectionDto,
    userId: number = 1,
  ): Promise<CustomerVehicleInspection> {
    const inspection = await this.inspectionRepo.findOne({
      where: { inspectionId },
      relations: ['enquiry', 'customer', 'item'],
    });
    if (!inspection) {
      throw new NotFoundException(`Inspection #${inspectionId} not found`);
    }

    if (inspection.status === InspectionStatus.COMPLETED) {
      throw new BadRequestException('This inspection has already been completed.');
    }
    if (inspection.status === InspectionStatus.CANCELLED) {
      throw new BadRequestException('Cannot complete a cancelled inspection.');
    }
    if (inspection.status === InspectionStatus.EXPIRED) {
      throw new BadRequestException('Cannot complete an expired inspection. Please initiate a new inspection.');
    }

    inspection.status = InspectionStatus.COMPLETED;
    inspection.outcome = dto.outcome;
    inspection.inspectionCompletedAt = new Date();
    const outcomeRemarks = [
      dto.remarks,
      dto.notes,
      dto.outcomeReason,
      dto.customerSignatureAck ? 'Customer Signed Ack Slip' : null,
    ]
      .filter(Boolean)
      .join(' | ');

    if (outcomeRemarks) {
      inspection.remarks = inspection.remarks
        ? `${inspection.remarks} | Outcome: ${outcomeRemarks}`
        : outcomeRemarks;
    }

    const saved = await this.inspectionRepo.save(inspection);

    // If customer accepted, note it in enquiry notes
    if (dto.outcome === InspectionOutcome.ACCEPTED && inspection.enquiryId) {
      const enq = await this.enquiryRepo.findOne({ where: { enquiryId: inspection.enquiryId } });
      if (enq) {
        enq.customerRequirementsNotes = enq.customerRequirementsNotes
          ? `${enq.customerRequirementsNotes} [Inspection ${saved.inspectionNumber}: ACCEPTED]`
          : `[Inspection ${saved.inspectionNumber}: ACCEPTED]`;
        await this.enquiryRepo.save(enq);
      }
    }

    await this.auditService.log({
      entityType: 'customer_vehicle_inspection',
      entityId: saved.inspectionId,
      action: 'UPDATE',
      changedBy: userId,
      newValue: {
        status: saved.status,
        outcome: saved.outcome,
        completedAt: saved.inspectionCompletedAt,
      },
    });

    return mapInspectionResponse(saved) as any;
  }

  async extendInspection(
    inspectionId: string,
    dto: ExtendInspectionDto,
    userId: number = 1,
  ): Promise<CustomerVehicleInspection> {
    const inspection = await this.inspectionRepo.findOne({ where: { inspectionId } });
    if (!inspection) {
      throw new NotFoundException(`Inspection #${inspectionId} not found`);
    }

    if (inspection.status !== InspectionStatus.IN_PROGRESS && inspection.status !== InspectionStatus.PENDING) {
      throw new BadRequestException(`Cannot extend inspection in status ${inspection.status}. Only active inspections can be extended.`);
    }

    const extMins = dto.extensionMinutes || dto.additionalMinutes || 30;
    const extReason = (dto.extensionReason || dto.reason || '').trim();
    if (!extReason) {
      throw new BadRequestException('Extension reason is mandatory');
    }

    const currentDeadline = new Date(inspection.inspectionDeadline).getTime();
    const newDeadline = new Date(currentDeadline + extMins * 60 * 1000);

    inspection.inspectionDeadline = newDeadline;
    inspection.extensionMinutes = (inspection.extensionMinutes || 0) + extMins;
    inspection.extensionReason = extReason;
    inspection.extendedBy = userId;

    const saved = await this.inspectionRepo.save(inspection);

    await this.auditService.log({
      entityType: 'customer_vehicle_inspection',
      entityId: saved.inspectionId,
      action: 'UPDATE',
      changedBy: userId,
      newValue: {
        newDeadline,
        extensionMinutes: dto.extensionMinutes,
        extensionReason: dto.extensionReason,
      },
    });

    return mapInspectionResponse(saved) as any;
  }

  async cancelInspection(
    inspectionId: string,
    dto: CancelInspectionDto,
    userId: number = 1,
  ): Promise<CustomerVehicleInspection> {
    const inspection = await this.inspectionRepo.findOne({ where: { inspectionId } });
    if (!inspection) {
      throw new NotFoundException(`Inspection #${inspectionId} not found`);
    }

    if (inspection.status === InspectionStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel an already completed inspection.');
    }

    inspection.status = InspectionStatus.CANCELLED;
    inspection.cancellationReason = dto.cancellationReason;
    inspection.cancelledBy = userId;

    const saved = await this.inspectionRepo.save(inspection);

    await this.auditService.log({
      entityType: 'customer_vehicle_inspection',
      entityId: saved.inspectionId,
      action: 'UPDATE',
      changedBy: userId,
      newValue: {
        status: saved.status,
        cancellationReason: dto.cancellationReason,
      },
    });

    return mapInspectionResponse(saved) as any;
  }

  async getInspectionByEnquiryId(enquiryId: string): Promise<CustomerVehicleInspection | null> {
    const inspection = await this.inspectionRepo.findOne({
      where: { enquiryId },
      relations: ['enquiry', 'customer', 'item', 'creator', 'vehicleUnit'],
      order: { createdAt: 'DESC' },
    });

    if (
      inspection &&
      (inspection.status === InspectionStatus.IN_PROGRESS || inspection.status === InspectionStatus.PENDING) &&
      new Date() > new Date(inspection.inspectionDeadline)
    ) {
      inspection.status = InspectionStatus.EXPIRED;
      await this.inspectionRepo.save(inspection);

      // Auto-cancel enquiry if still awaiting purchase
      const enquiry = await this.enquiryRepo.findOne({ where: { enquiryId } });
      if (
        enquiry &&
        enquiry.status !== EnquiryStatus.APPROVED &&
        enquiry.status !== EnquiryStatus.CONVERTED &&
        enquiry.status !== EnquiryStatus.CANCELLED
      ) {
        enquiry.status = EnquiryStatus.CANCELLED;
        enquiry.rejectionReason = 'Customer failed to complete vehicle inspection within the allowed period';
        await this.enquiryRepo.save(enquiry);
      }
    }

    return mapInspectionResponse(inspection) as any;
  }

  async getInspections(query?: { status?: string; search?: string }): Promise<CustomerVehicleInspection[]> {
    const qb = this.inspectionRepo
      .createQueryBuilder('insp')
      .leftJoinAndSelect('insp.enquiry', 'enquiry')
      .leftJoinAndSelect('insp.customer', 'customer')
      .leftJoinAndSelect('insp.item', 'item')
      .leftJoinAndSelect('insp.vehicleUnit', 'vehicleUnit')
      .orderBy('insp.createdAt', 'DESC');

    if (query?.status) {
      qb.andWhere('insp.status = :st', { st: query.status });
    }
    if (query?.search && query.search.trim()) {
      const s = `%${query.search.trim()}%`;
      qb.andWhere(
        '(insp.inspectionNumber ILIKE :s OR customer.fullName ILIKE :s OR insp.vehicleModel ILIKE :s OR enquiry.enquiryNumber ILIKE :s)',
        { s },
      );
    }

    const list = await qb.getMany();
    const now = new Date();
    for (const item of list) {
      if (
        (item.status === InspectionStatus.IN_PROGRESS || item.status === InspectionStatus.PENDING) &&
        now > new Date(item.inspectionDeadline)
      ) {
        item.status = InspectionStatus.EXPIRED;
        await this.inspectionRepo.save(item);
      }
    }
    return list.map(mapInspectionResponse) as any;
  }

  async scanExpiredInspections(): Promise<number> {
    const now = new Date();
    const activeInspections = await this.inspectionRepo
      .createQueryBuilder('i')
      .where('i.status IN (:...statuses)', { statuses: [InspectionStatus.IN_PROGRESS, InspectionStatus.PENDING] })
      .andWhere('i.inspectionDeadline < :now', { now })
      .getMany();

    let expiredCount = 0;
    for (const insp of activeInspections) {
      insp.status = InspectionStatus.EXPIRED;
      await this.inspectionRepo.save(insp);
      expiredCount++;

      // Auto cancel unapproved enquiry
      const enq = await this.enquiryRepo.findOne({ where: { enquiryId: insp.enquiryId } });
      if (
        enq &&
        enq.status !== EnquiryStatus.APPROVED &&
        enq.status !== EnquiryStatus.CONVERTED &&
        enq.status !== EnquiryStatus.CANCELLED
      ) {
        enq.status = EnquiryStatus.CANCELLED;
        enq.rejectionReason = 'Customer failed to complete vehicle inspection within the allowed period';
        await this.enquiryRepo.save(enq);
      }
    }
    return expiredCount;
  }

  // =========================================================================
  // --- Financing Status Management (Client Demo Feedback New Story 3) ---
  // =========================================================================

  async updateFinancingStatus(
    enquiryId: string,
    dto: UpdateFinancingStatusDto,
    userId: number = 1,
  ): Promise<SalesEnquiry> {
    const enquiry = await this.findOne(enquiryId);
    if (!enquiry) {
      throw new NotFoundException(`Sales Enquiry #${enquiryId} not found`);
    }

    enquiry.financingStatus = dto.financingStatus;
    if (dto.financingApplicationNumber !== undefined) enquiry.financingApplicationNumber = dto.financingApplicationNumber;
    if (dto.financingSubmissionDate !== undefined) enquiry.financingSubmissionDate = dto.financingSubmissionDate;
    if (dto.financingApprovalDate !== undefined) enquiry.financingApprovalDate = dto.financingApprovalDate;
    const approvedAmt = dto.financingApprovedAmount !== undefined ? dto.financingApprovedAmount : dto.approvedAmount;
    if (approvedAmt !== undefined) enquiry.financingApprovedAmount = approvedAmt;
    const disbursedAmt = dto.financingDisbursedAmount !== undefined ? dto.financingDisbursedAmount : dto.disbursedAmount;
    if (disbursedAmt !== undefined) enquiry.financingDisbursedAmount = disbursedAmt;
    if (dto.financingDisbursementDate !== undefined) enquiry.financingDisbursementDate = dto.financingDisbursementDate;
    const notes = dto.financingNotes !== undefined ? dto.financingNotes : dto.notes;
    if (notes !== undefined) enquiry.financingNotes = notes;

    const saved = await this.enquiryRepo.save(enquiry);

    await this.auditService.log({
      entityType: 'sales_enquiry',
      entityId: enquiryId,
      action: 'UPDATE',
      changedBy: userId,
      newValue: {
        financingStatus: saved.financingStatus,
        financingApprovedAmount: saved.financingApprovedAmount,
        financingDisbursedAmount: saved.financingDisbursedAmount,
      },
    });

    return saved;
  }

  // =========================================================================
  // --- Commission & Financing Intelligence Reports ---
  // =========================================================================

  async getCommissionReport() {
    const enquiries = await this.enquiryRepo.find({
      where: { leadSource: 'COMMISSION_AGENT' },
      relations: ['customer', 'item'],
      order: { createdAt: 'DESC' },
    });

    const totalEnquiries = enquiries.length;
    const totalSalesAmount = enquiries.reduce((sum, e) => sum + Number(e.estimatedSalesValue || 0), 0);
    const totalCommissionAmount = enquiries.reduce((sum, e) => sum + Number(e.commissionAmount || 0), 0);

    // Group by agent
    const agentMap: Record<string, any> = {};
    for (const e of enquiries) {
      const key = `${e.commissionAgentName || 'Unknown'}-${e.commissionAgentPhone || ''}`;
      if (!agentMap[key]) {
        agentMap[key] = {
          agentName: e.commissionAgentName || 'Unknown Agent',
          agentPhone: e.commissionAgentPhone || 'N/A',
          enquiryCount: 0,
          totalSalesAmount: 0,
          totalCommissionAmount: 0,
          enquiries: [],
        };
      }
      agentMap[key].enquiryCount += 1;
      agentMap[key].totalSalesAmount += Number(e.estimatedSalesValue || 0);
      agentMap[key].totalCommissionAmount += Number(e.commissionAmount || 0);
      agentMap[key].enquiries.push({
        enquiryId: e.enquiryId,
        enquiryNumber: e.enquiryNumber,
        customerName: e.customer?.fullName,
        vehicleModel: e.item?.itemName,
        salesAmount: Number(e.estimatedSalesValue),
        commissionPercentage: Number(e.commissionPercentage),
        commissionAmount: Number(e.commissionAmount),
        status: e.status,
        date: e.createdAt,
      });
    }

    return {
      totalEnquiries,
      totalSalesAmount,
      totalCommissionAmount,
      agentBreakdown: Object.values(agentMap),
      records: enquiries.map((e) => ({
        enquiryId: e.enquiryId,
        enquiryNumber: e.enquiryNumber,
        agentName: e.commissionAgentName,
        agentPhone: e.commissionAgentPhone,
        customerName: e.customer?.fullName,
        vehicleModel: e.item?.itemName,
        salesAmount: Number(e.estimatedSalesValue),
        commissionPercentage: Number(e.commissionPercentage),
        commissionAmount: Number(e.commissionAmount),
        status: e.status,
        createdAt: e.createdAt,
      })),
    };
  }

  async getFinancingReport() {
    const enquiries = await this.enquiryRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.customer', 'customer')
      .leftJoinAndSelect('e.item', 'item')
      .where("e.financingOption IN ('BANK_FINANCING', 'MICROFINANCE_FINANCING') OR e.financingRequired = true")
      .orderBy('e.createdAt', 'DESC')
      .getMany();

    const totalFinancedEnquiries = enquiries.length;
    const totalSalesAmount = enquiries.reduce((sum, e) => sum + Number(e.estimatedSalesValue || 0), 0);
    const totalRequestedFinancing = enquiries.reduce((sum, e) => sum + Number(e.financingAmount || 0), 0);
    const totalApprovedFinancing = enquiries.reduce((sum, e) => sum + Number(e.financingApprovedAmount || 0), 0);
    const totalDisbursedFinancing = enquiries.reduce((sum, e) => sum + Number(e.financingDisbursedAmount || 0), 0);
    const totalCustomerContribution = enquiries.reduce((sum, e) => sum + Number(e.customerContributionAmount || 0), 0);

    // Group by institution
    const instMap: Record<string, any> = {};
    for (const e of enquiries) {
      const inst = e.financingInstitutionName || e.financeProvider || 'Unassigned Institution';
      if (!instMap[inst]) {
        instMap[inst] = {
          institutionName: inst,
          financingType: e.financingType || (e.financingOption === 'MICROFINANCE_FINANCING' ? 'MICROFINANCE' : 'BANK'),
          enquiryCount: 0,
          totalSalesAmount: 0,
          totalRequestedFinancing: 0,
          totalApprovedFinancing: 0,
          totalDisbursedFinancing: 0,
          totalCustomerContribution: 0,
        };
      }
      instMap[inst].enquiryCount += 1;
      instMap[inst].totalSalesAmount += Number(e.estimatedSalesValue || 0);
      instMap[inst].totalRequestedFinancing += Number(e.financingAmount || 0);
      instMap[inst].totalApprovedFinancing += Number(e.financingApprovedAmount || 0);
      instMap[inst].totalDisbursedFinancing += Number(e.financingDisbursedAmount || 0);
      instMap[inst].totalCustomerContribution += Number(e.customerContributionAmount || 0);
    }

    return {
      summary: {
        totalFinancedEnquiries,
        totalSalesAmount,
        totalRequestedFinancing,
        totalApprovedFinancing,
        totalDisbursedFinancing,
        outstandingFinancingBalance: totalApprovedFinancing - totalDisbursedFinancing,
        totalCustomerContribution,
      },
      institutionBreakdown: Object.values(instMap),
      records: enquiries.map((e) => ({
        enquiryId: e.enquiryId,
        enquiryNumber: e.enquiryNumber,
        customerName: e.customer?.fullName,
        vehicleModel: e.item?.itemName,
        financingOption: e.financingOption,
        financingType: e.financingType,
        institutionName: e.financingInstitutionName || e.financeProvider,
        salesAmount: Number(e.estimatedSalesValue),
        financingPercentage: Number(e.financingPercentage),
        financingAmount: Number(e.financingAmount),
        customerContributionAmount: Number(e.customerContributionAmount),
        financingStatus: e.financingStatus || 'NOT_SUBMITTED',
        applicationNumber: e.financingApplicationNumber,
        approvedAmount: Number(e.financingApprovedAmount || 0),
        disbursedAmount: Number(e.financingDisbursedAmount || 0),
        createdAt: e.createdAt,
      })),
    };
  }
}
