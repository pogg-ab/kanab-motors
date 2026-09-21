import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { Customer, CustomerType } from './entities/customer.entity';
import { CustomerBankAccount } from './entities/customer-bank-account.entity';
import { CustomerAccountSummary } from './entities/customer-account-summary.entity';
import { Attachment } from './entities/attachment.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(CustomerBankAccount)
    private readonly bankAccountRepo: Repository<CustomerBankAccount>,
    @InjectRepository(CustomerAccountSummary)
    private readonly summaryRepo: Repository<CustomerAccountSummary>,
    @InjectRepository(Attachment)
    private readonly attachmentRepo: Repository<Attachment>,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateCustomerDto, userId: number = 1): Promise<Customer> {
    // 1. Conditional validation: TIN mandatory for DEALER and GOVERNMENT
    if (
      (dto.customerType === CustomerType.DEALER ||
        dto.customerType === CustomerType.GOVERNMENT) &&
      (!dto.tinNumber || dto.tinNumber.trim() === '')
    ) {
      throw new BadRequestException(
        'TIN Number is mandatory for Dealer and Government customers',
      );
    }

    // 2. Duplicate detection on Mobile Number
    const existingMobile = await this.customerRepo.findOne({
      where: { mobileNumber: dto.mobileNumber.trim() },
    });
    if (existingMobile) {
      throw new ConflictException(
        `A customer with mobile number ${dto.mobileNumber} already exists (${existingMobile.customerCode})`,
      );
    }

    // 3. Duplicate detection on TIN Number (if provided)
    if (dto.tinNumber && dto.tinNumber.trim() !== '') {
      const existingTin = await this.customerRepo.findOne({
        where: { tinNumber: dto.tinNumber.trim() },
      });
      if (existingTin) {
        throw new ConflictException(
          `A customer with TIN number ${dto.tinNumber} already exists (${existingTin.customerCode})`,
        );
      }
    }

    // 4. Create customer entity
    const customer = this.customerRepo.create({
      customerType: dto.customerType,
      fullName: dto.fullName.trim(),
      regionId: dto.regionId,
      addressTown: dto.addressTown,
      mobileNumber: dto.mobileNumber.trim(),
      tinNumber: dto.tinNumber?.trim() || null,
      createdBy: userId,
    });

    const savedCustomer = await this.customerRepo.save(customer);

    // 5. Ensure account summary zero-state exists
    const existingSummary = await this.summaryRepo.findOne({
      where: { customerId: savedCustomer.customerId },
    });
    if (!existingSummary) {
      await this.summaryRepo.save(
        this.summaryRepo.create({
          customerId: savedCustomer.customerId,
          totalDeposits: 0,
          allocatedToBookings: 0,
          outstandingBalance: 0,
          availableCredit: 0,
          excessPayments: 0,
          refundableBalance: 0,
        }),
      );
    }

    // 6. Save Bank Accounts if provided
    if (dto.bankAccounts && dto.bankAccounts.length > 0) {
      const accounts = dto.bankAccounts.map((ba, idx) =>
        this.bankAccountRepo.create({
          customerId: savedCustomer.customerId,
          bankName: ba.bankName,
          accountNumber: ba.accountNumber,
          accountHolderName: ba.accountHolderName,
          branch: ba.branch,
          isPrimary: ba.isPrimary !== undefined ? ba.isPrimary : idx === 0,
        }),
      );
      await this.bankAccountRepo.save(accounts);
    }

    // 7. Audit log
    await this.auditService.log({
      entityType: 'customer',
      entityId: savedCustomer.customerId,
      action: 'INSERT',
      changedBy: userId,
      newValue: {
        customerCode: savedCustomer.customerCode,
        fullName: savedCustomer.fullName,
        customerType: savedCustomer.customerType,
        mobileNumber: savedCustomer.mobileNumber,
        tinNumber: savedCustomer.tinNumber,
      },
    });

    return this.findOne(savedCustomer.customerId);
  }

  async findAll(query: CustomerQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const qb = this.customerRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.region', 'region')
      .leftJoinAndSelect('c.accountSummary', 'summary');

    if (query.customerType) {
      qb.andWhere('c.customerType = :customerType', { customerType: query.customerType });
    }

    if (query.regionId) {
      qb.andWhere('c.regionId = :regionId', { regionId: query.regionId });
    }

    if (query.search && query.search.trim() !== '') {
      const s = `%${query.search.trim()}%`;
      qb.andWhere(
        '(c.fullName ILIKE :s OR c.customerCode ILIKE :s OR c.mobileNumber ILIKE :s OR c.tinNumber ILIKE :s)',
        { s },
      );
    }

    const sortField = ['createdAt', 'fullName', 'customerCode'].includes(query.sortBy)
      ? `c.${query.sortBy}`
      : 'c.createdAt';
    const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    qb.orderBy(sortField, sortOrder);
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

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customerRepo.findOne({
      where: { customerId: id },
      relations: ['region', 'bankAccounts', 'accountSummary', 'creator', 'updater'],
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    // Attach documents
    const documents = await this.attachmentRepo.find({
      where: { entityType: 'customer', entityId: id },
      order: { uploadedAt: 'DESC' },
    });
    (customer as any).documents = documents;

    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto, userId: number = 1): Promise<Customer> {
    const customer = await this.findOne(id);
    const oldValue = { ...customer };

    // Check duplicate mobile if changing
    if (dto.mobileNumber && dto.mobileNumber.trim() !== customer.mobileNumber) {
      const existingMobile = await this.customerRepo.findOne({
        where: { mobileNumber: dto.mobileNumber.trim() },
      });
      if (existingMobile && existingMobile.customerId !== id) {
        throw new ConflictException(
          `Another customer with mobile number ${dto.mobileNumber} already exists`,
        );
      }
    }

    // Check duplicate TIN if changing
    if (dto.tinNumber && dto.tinNumber.trim() !== customer.tinNumber) {
      const existingTin = await this.customerRepo.findOne({
        where: { tinNumber: dto.tinNumber.trim() },
      });
      if (existingTin && existingTin.customerId !== id) {
        throw new ConflictException(
          `Another customer with TIN number ${dto.tinNumber} already exists`,
        );
      }
    }

    const newType = dto.customerType || customer.customerType;
    const finalTin = dto.tinNumber !== undefined ? dto.tinNumber : customer.tinNumber;

    if (
      (newType === CustomerType.DEALER || newType === CustomerType.GOVERNMENT) &&
      (!finalTin || finalTin.trim() === '')
    ) {
      throw new BadRequestException(
        'TIN Number is mandatory for Dealer and Government customers',
      );
    }

    // customerId and customerCode are immutable
    Object.assign(customer, {
      ...dto,
      tinNumber: finalTin?.trim() || null,
      updatedBy: userId,
    });

    const updated = await this.customerRepo.save(customer);

    // Audit trail
    await this.auditService.log({
      entityType: 'customer',
      entityId: id,
      action: 'UPDATE',
      changedBy: userId,
      oldValue: {
        customerType: oldValue.customerType,
        fullName: oldValue.fullName,
        mobileNumber: oldValue.mobileNumber,
        tinNumber: oldValue.tinNumber,
        addressTown: oldValue.addressTown,
      },
      newValue: {
        customerType: updated.customerType,
        fullName: updated.fullName,
        mobileNumber: updated.mobileNumber,
        tinNumber: updated.tinNumber,
        addressTown: updated.addressTown,
      },
    });

    return this.findOne(id);
  }

  async addBankAccount(customerId: string, dto: any): Promise<CustomerBankAccount> {
    await this.findOne(customerId);
    const account = this.bankAccountRepo.create({
      customerId,
      bankName: dto.bankName,
      accountNumber: dto.accountNumber,
      accountHolderName: dto.accountHolderName,
      branch: dto.branch,
      isPrimary: dto.isPrimary ?? false,
    });
    return this.bankAccountRepo.save(account);
  }

  async deleteBankAccount(customerId: string, accountId: string): Promise<void> {
    const account = await this.bankAccountRepo.findOne({
      where: { bankAccountId: accountId, customerId },
    });
    if (!account) {
      throw new NotFoundException('Bank account not found');
    }
    await this.bankAccountRepo.remove(account);
  }

  async addDocument(
    customerId: string,
    file: { fileName: string; filePath: string; contentType?: string; sizeBytes?: number },
    userId: number = 1,
  ): Promise<Attachment> {
    await this.findOne(customerId);
    const attachment = this.attachmentRepo.create({
      entityType: 'customer',
      entityId: customerId,
      fileName: file.fileName,
      filePath: file.filePath,
      contentType: file.contentType,
      fileSizeBytes: file.sizeBytes ? file.sizeBytes.toString() : '0',
      uploadedBy: userId,
    });
    return this.attachmentRepo.save(attachment);
  }

  async deleteDocument(customerId: string, attachmentId: string): Promise<void> {
    const doc = await this.attachmentRepo.findOne({
      where: { attachmentId, entityType: 'customer', entityId: customerId },
    });
    if (!doc) {
      throw new NotFoundException('Document attachment not found');
    }
    await this.attachmentRepo.remove(doc);
  }

  async getAccountSummary(customerId: string): Promise<CustomerAccountSummary> {
    await this.findOne(customerId);
    let summary = await this.summaryRepo.findOne({ where: { customerId } });
    if (!summary) {
      summary = await this.summaryRepo.save(
        this.summaryRepo.create({
          customerId,
          totalDeposits: 0,
          allocatedToBookings: 0,
          outstandingBalance: 0,
          availableCredit: 0,
          excessPayments: 0,
          refundableBalance: 0,
        }),
      );
    }
    return summary;
  }
}
