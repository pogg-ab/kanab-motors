import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalesEnquiry, EnquiryStatus } from './entities/sales-enquiry.entity';
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

    enquiry.status = status;
    if (rejectionReason) enquiry.rejectionReason = rejectionReason;

    const saved = await this.enquiryRepo.save(enquiry);

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
}
