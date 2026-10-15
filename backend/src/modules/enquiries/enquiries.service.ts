import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalesEnquiry, EnquiryStatus } from './entities/sales-enquiry.entity';
import { PreAdvanceSlip, PreAdvanceSlipStatus } from './entities/pre-advance-slip.entity';
import { ProductItem } from '../products/entities/product-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { EnquiryQueryDto } from './dto/enquiry-query.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class EnquiriesService {
  constructor(
    @InjectRepository(SalesEnquiry)
    private readonly enquiryRepo: Repository<SalesEnquiry>,
    @InjectRepository(PreAdvanceSlip)
    private readonly slipRepo: Repository<PreAdvanceSlip>,
    @InjectRepository(ProductItem)
    private readonly itemRepo: Repository<ProductItem>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateEnquiryDto, userId: number = 1): Promise<SalesEnquiry> {
    const customer = await this.customerRepo.findOne({ where: { customerId: dto.customerId } });
    if (!customer) throw new NotFoundException(`Customer ${dto.customerId} not found`);

    const item = await this.itemRepo.findOne({
      where: { itemId: dto.itemId },
      relations: ['taxConfig'],
    });
    if (!item) throw new NotFoundException(`Product model ${dto.itemId} not found`);

    const unitPrice = Number(dto.unitPrice || item.sellingPrice);
    const qty = Number(dto.quantity || 1);
    const subtotal = unitPrice * qty;

    // Calculate VAT using configured tax rate (default 15%)
    const taxRatePct = item.taxConfig ? Number(item.taxConfig.taxRatePct) : 15.0;
    const vatAmount = Number(((subtotal * taxRatePct) / 100).toFixed(2));
    const estimatedValue = Number((subtotal + vatAmount).toFixed(2));

    const enquiry = this.enquiryRepo.create({
      customerId: dto.customerId,
      itemId: dto.itemId,
      quantity: qty,
      unitPrice,
      vatAmount,
      estimatedSalesValue: estimatedValue,
      salespersonName: dto.salespersonName,
      paymentMode: dto.paymentMode || 'BANK_DEPOSIT',
      status: EnquiryStatus.SUBMITTED,
      createdBy: userId,
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
      .leftJoinAndSelect('item.brand', 'brand');

    if (query.status) {
      qb.andWhere('e.status = :status', { status: query.status });
    }
    if (query.customerId) {
      qb.andWhere('e.customerId = :cid', { cid: query.customerId });
    }
    if (query.search && query.search.trim() !== '') {
      const s = `%${query.search.trim()}%`;
      qb.andWhere('(e.enquiryNumber ILIKE :s OR customer.fullName ILIKE :s OR item.itemName ILIKE :s)', { s });
    }

    qb.orderBy('e.createdAt', 'DESC');
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

  async findOne(id: string): Promise<SalesEnquiry> {
    const enquiry = await this.enquiryRepo.findOne({
      where: { enquiryId: id },
      relations: ['customer', 'item', 'item.brand', 'item.category', 'creator'],
    });
    if (!enquiry) throw new NotFoundException(`Sales Enquiry with ID ${id} not found`);
    return enquiry;
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

    // Story E16, E17, E18: Once approved, automatically generate pre-advance slip with 3-day expiry
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
          requiredAdvanceAmount: enquiry.estimatedSalesValue, // Story B4: advance is the full current price
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
}
