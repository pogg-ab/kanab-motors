import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { SalesEnquiry, EnquiryStatus } from '../enquiries/entities/sales-enquiry.entity';
import { ProductItem } from '../products/entities/product-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingQueryDto } from './dto/booking-query.dto';
import { LedgerService } from '../ledger/ledger.service';
import { LedgerTransactionType } from '../ledger/entities/customer-ledger-transaction.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(SalesEnquiry)
    private readonly enquiryRepo: Repository<SalesEnquiry>,
    @InjectRepository(ProductItem)
    private readonly itemRepo: Repository<ProductItem>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly ledgerService: LedgerService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateBookingDto, userId: number = 1): Promise<Booking> {
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

    const taxRatePct = item.taxConfig ? Number(item.taxConfig.taxRatePct) : 15.0;
    const vatAmount = Number(((subtotal * taxRatePct) / 100).toFixed(2));
    const grossTotal = Number((subtotal + vatAmount).toFixed(2));

    // Default required advance: 25% if not explicitly entered (Story B4)
    const requiredAdvance =
      dto.requiredAdvanceAmount !== undefined
        ? Number(dto.requiredAdvanceAmount)
        : Number((grossTotal * 0.25).toFixed(2));

    let enquiry: SalesEnquiry | null = null;
    if (dto.enquiryId) {
      enquiry = await this.enquiryRepo.findOne({ where: { enquiryId: dto.enquiryId } });
      if (enquiry) {
        enquiry.status = EnquiryStatus.CONVERTED;
        await this.enquiryRepo.save(enquiry);
      }
    }

    const booking = this.bookingRepo.create({
      customerId: dto.customerId,
      enquiryId: dto.enquiryId || null,
      itemId: dto.itemId,
      quantity: qty,
      unitPrice,
      vatAmount,
      grossTotal,
      requiredAdvanceAmount: requiredAdvance,
      totalAmountDeposited: 0,
      outstandingBalance: grossTotal,
      bookingStatus: BookingStatus.APPROVED, // auto-approved on creation
      salespersonName: dto.salespersonName,
      createdBy: userId,
    });

    const saved = await this.bookingRepo.save(booking);

    await this.auditService.log({
      entityType: 'booking',
      entityId: saved.bookingId,
      action: 'INSERT',
      changedBy: userId,
      newValue: {
        bookingNumber: saved.bookingNumber,
        customerId: saved.customerId,
        grossTotal: saved.grossTotal,
        requiredAdvance: saved.requiredAdvanceAmount,
      },
    });

    return this.findOne(saved.bookingId);
  }

  async convertFromEnquiry(enquiryId: string, userId: number = 1): Promise<Booking> {
    const enquiry = await this.enquiryRepo.findOne({
      where: { enquiryId },
      relations: ['customer', 'item'],
    });
    if (!enquiry) throw new NotFoundException(`Enquiry ${enquiryId} not found`);

    return this.create(
      {
        customerId: enquiry.customerId,
        itemId: enquiry.itemId,
        enquiryId: enquiry.enquiryId,
        quantity: enquiry.quantity,
        unitPrice: Number(enquiry.unitPrice),
        salespersonName: enquiry.salespersonName,
      },
      userId,
    );
  }

  async findAll(query: BookingQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.customer', 'customer')
      .leftJoinAndSelect('b.item', 'item')
      .leftJoinAndSelect('item.brand', 'brand')
      .leftJoinAndSelect('b.enquiry', 'enquiry')
      .leftJoinAndSelect('b.payments', 'payments');

    if (query.status) {
      qb.andWhere('b.bookingStatus = :status', { status: query.status });
    }
    if (query.customerId) {
      qb.andWhere('b.customerId = :cid', { cid: query.customerId });
    }
    if (query.search && query.search.trim() !== '') {
      const s = `%${query.search.trim()}%`;
      qb.andWhere('(b.bookingNumber ILIKE :s OR customer.fullName ILIKE :s OR item.itemName ILIKE :s)', { s });
    }

    qb.orderBy('b.createdAt', 'DESC');
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

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({
      where: { bookingId: id },
      relations: ['customer', 'item', 'item.brand', 'item.category', 'enquiry', 'payments'],
    });
    if (!booking) throw new NotFoundException(`Booking with ID ${id} not found`);
    return booking;
  }

  /**
   * Booking Cancellation Workflow (Story B8)
   * Approval-gated; reverses deposits via BOOKING_CANCELLATION ledger entry
   * and routes reversed funds to customer credit or refundable balance.
   */
  async cancelBooking(
    id: string,
    reason: string,
    routeTo: 'CUSTOMER_CREDIT' | 'REFUNDABLE' = 'CUSTOMER_CREDIT',
    userId: number = 1,
  ): Promise<Booking> {
    const booking = await this.findOne(id);
    if (booking.bookingStatus === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    const deposited = Number(booking.totalAmountDeposited || 0);

    booking.bookingStatus = BookingStatus.CANCELLED;
    booking.cancellationReason = reason;
    booking.cancelledAt = new Date();
    const saved = await this.bookingRepo.save(booking);

    // If customer had deposited funds against this booking, record ledger reversal
    if (deposited > 0) {
      await this.ledgerService.postTransaction({
        customerId: booking.customerId,
        transactionType: LedgerTransactionType.BOOKING_CANCELLATION,
        referenceNumber: `CAN-${booking.bookingNumber}`,
        description: `Booking Cancellation Reversal for ${booking.bookingNumber} (${reason}). Funds routed to ${routeTo}.`,
        creditAmount: 0,
        debitAmount: 0,
        relatedBookingId: booking.bookingId,
        processedBy: userId,
        summaryDelta: {
          allocatedToBookings: -deposited,
          availableCredit: routeTo === 'CUSTOMER_CREDIT' ? deposited : 0,
          refundableBalance: routeTo === 'REFUNDABLE' ? deposited : 0,
        },
      });
    }

    await this.auditService.log({
      entityType: 'booking',
      entityId: id,
      action: 'UPDATE',
      changedBy: userId,
      newValue: {
        action: 'BOOKING_CANCELLED',
        bookingNumber: booking.bookingNumber,
        reason,
        refundedDeposits: deposited,
        routeTo,
      },
    });

    return saved;
  }

  /**
   * Transfer deposited funds between eligible bookings (Story B9)
   */
  async transferBetweenBookings(
    sourceBookingId: string,
    targetBookingId: string,
    amount: number,
    userId: number = 1,
  ) {
    const source = await this.findOne(sourceBookingId);
    const target = await this.findOne(targetBookingId);

    if (source.customerId !== target.customerId) {
      throw new BadRequestException('Cannot transfer funds between bookings of different customers');
    }

    const sourceDeposited = Number(source.totalAmountDeposited || 0);
    if (amount <= 0 || amount > sourceDeposited) {
      throw new BadRequestException(
        `Transfer amount must be between 1 and available deposited ETB ${sourceDeposited}`,
      );
    }

    // Update balances
    source.totalAmountDeposited = sourceDeposited - amount;
    source.outstandingBalance = Number(source.grossTotal) - source.totalAmountDeposited;

    target.totalAmountDeposited = Number(target.totalAmountDeposited || 0) + amount;
    target.outstandingBalance = Math.max(0, Number(target.grossTotal) - target.totalAmountDeposited);

    await this.bookingRepo.save([source, target]);

    // Record in ledger
    await this.ledgerService.postTransaction({
      customerId: source.customerId,
      transactionType: LedgerTransactionType.BOOKING_TRANSFER,
      referenceNumber: `TRF-${source.bookingNumber}-${target.bookingNumber}`,
      description: `Transfer of ETB ${amount.toLocaleString()} from Booking ${source.bookingNumber} to ${target.bookingNumber}`,
      creditAmount: 0,
      debitAmount: 0,
      relatedBookingId: target.bookingId,
      processedBy: userId,
    });

    return {
      success: true,
      message: `Transferred ETB ${amount.toLocaleString()} from ${source.bookingNumber} to ${target.bookingNumber}`,
      source,
      target,
    };
  }
}
