import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerPayment, PaymentStatus } from './entities/customer-payment.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { LedgerService } from '../ledger/ledger.service';
import { LedgerTransactionType } from '../ledger/entities/customer-ledger-transaction.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(CustomerPayment)
    private readonly paymentRepo: Repository<CustomerPayment>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly ledgerService: LedgerService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreatePaymentDto, userId: number = 1): Promise<CustomerPayment> {
    const booking = await this.bookingRepo.findOne({
      where: { bookingId: dto.bookingId },
      relations: ['customer'],
    });
    if (!booking) throw new NotFoundException(`Booking ${dto.bookingId} not found`);

    if (booking.bookingStatus === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot accept payments for a cancelled booking');
    }

    const payment = this.paymentRepo.create({
      bookingId: dto.bookingId,
      customerId: booking.customerId,
      instrumentType: dto.instrumentType,
      bankName: dto.bankName.trim(),
      amount: dto.amount,
      referenceNumber: dto.referenceNumber.trim(),
      referenceDate: dto.referenceDate,
      status: PaymentStatus.SUBMITTED,
      createdBy: userId,
    });

    const saved = await this.paymentRepo.save(payment);

    await this.auditService.log({
      entityType: 'customer_payment',
      entityId: saved.paymentId,
      action: 'INSERT',
      changedBy: userId,
      newValue: {
        receiptNumber: saved.receiptNumber,
        bookingId: saved.bookingId,
        amount: saved.amount,
        bankName: saved.bankName,
      },
    });

    return this.findOne(saved.paymentId);
  }

  /**
   * Confirm Bank Receipt Voucher (Story P4, P6, P7, P8)
   * Posts either ADVANCE_DEPOSIT or ADDITIONAL_PAYMENT to the Customer Ledger,
   * updates booking deposited and outstanding balance, and updates account summary atomically.
   */
  async confirmPayment(id: string, userId: number = 1): Promise<CustomerPayment> {
    const payment = await this.findOne(id);
    if (payment.status === PaymentStatus.CONFIRMED) {
      throw new BadRequestException('Payment is already confirmed');
    }

    const booking = await this.bookingRepo.findOne({
      where: { bookingId: payment.bookingId },
      relations: ['payments'],
    });
    if (!booking) throw new NotFoundException(`Booking ${payment.bookingId} not found`);

    // Determine whether this is the 1st deposit or an additional deposit (Story P6)
    const priorConfirmed = booking.payments?.filter(
      (p) => p.status === PaymentStatus.CONFIRMED && p.paymentId !== id,
    );
    const txType =
      !priorConfirmed || priorConfirmed.length === 0
        ? LedgerTransactionType.ADVANCE_DEPOSIT
        : LedgerTransactionType.ADDITIONAL_PAYMENT;

    payment.status = PaymentStatus.CONFIRMED;
    payment.confirmedBy = userId;
    payment.confirmedAt = new Date();
    const savedPayment = await this.paymentRepo.save(payment);

    // Calculate booking totals update (Story P7)
    const prevDeposited = Number(booking.totalAmountDeposited || 0);
    const newDeposited = prevDeposited + Number(payment.amount);
    const grossTotal = Number(booking.grossTotal);
    const newOutstanding = Math.max(0, grossTotal - newDeposited);

    booking.totalAmountDeposited = newDeposited;
    booking.outstandingBalance = newOutstanding;
    if (newDeposited >= Number(booking.requiredAdvanceAmount) && booking.bookingStatus === BookingStatus.APPROVED) {
      booking.bookingStatus = BookingStatus.CONFIRMED;
    }
    await this.bookingRepo.save(booking);

    // Check for excess payment (Story X1)
    const isExcess = newDeposited > grossTotal;
    const excessPortion = isExcess ? newDeposited - Math.max(prevDeposited, grossTotal) : 0;
    const bookingAllocatedPortion = Number(payment.amount) - excessPortion;

    // Post to Customer Ledger (Story P6 & L4)
    await this.ledgerService.postTransaction({
      customerId: payment.customerId,
      transactionType: txType,
      referenceNumber: payment.receiptNumber,
      description: `${txType.replace(/_/g, ' ')} via ${payment.instrumentType} (${payment.bankName} Ref: ${payment.referenceNumber}) for Booking ${booking.bookingNumber}`,
      creditAmount: Number(payment.amount),
      debitAmount: 0,
      relatedBookingId: booking.bookingId,
      relatedReceiptId: payment.paymentId,
      processedBy: userId,
      summaryDelta: {
        totalDeposits: Number(payment.amount),
        allocatedToBookings: bookingAllocatedPortion,
        outstandingBalance: -bookingAllocatedPortion,
        excessPayments: excessPortion > 0 ? excessPortion : 0,
      },
    });

    await this.auditService.log({
      entityType: 'customer_payment',
      entityId: id,
      action: 'UPDATE',
      changedBy: userId,
      newValue: {
        action: 'PAYMENT_CONFIRMED',
        receiptNumber: payment.receiptNumber,
        amount: payment.amount,
        txType,
        newBookingDeposited: newDeposited,
      },
    });

    return this.findOne(id);
  }

  async rejectPayment(id: string, reason: string, userId: number = 1): Promise<CustomerPayment> {
    const payment = await this.findOne(id);
    if (payment.status === PaymentStatus.CONFIRMED) {
      throw new BadRequestException('Cannot reject an already confirmed payment');
    }

    payment.status = PaymentStatus.REJECTED;
    payment.rejectionReason = reason;
    return this.paymentRepo.save(payment);
  }

  async findAll(query: PaymentQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const qb = this.paymentRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.customer', 'customer')
      .leftJoinAndSelect('p.booking', 'booking')
      .leftJoinAndSelect('booking.item', 'item')
      .leftJoinAndSelect('p.confirmer', 'confirmer');

    if (query.status) {
      qb.andWhere('p.status = :status', { status: query.status });
    }
    if (query.customerId) {
      qb.andWhere('p.customerId = :cid', { cid: query.customerId });
    }
    if (query.bookingId) {
      qb.andWhere('p.bookingId = :bid', { bid: query.bookingId });
    }
    if (query.search && query.search.trim() !== '') {
      const s = `%${query.search.trim()}%`;
      qb.andWhere(
        '(p.receiptNumber ILIKE :s OR p.referenceNumber ILIKE :s OR customer.fullName ILIKE :s OR booking.bookingNumber ILIKE :s)',
        { s },
      );
    }

    qb.orderBy('p.createdAt', 'DESC');
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

  async findOne(id: string): Promise<CustomerPayment> {
    const payment = await this.paymentRepo.findOne({
      where: { paymentId: id },
      relations: ['customer', 'booking', 'booking.item', 'booking.item.brand', 'confirmer', 'creator'],
    });
    if (!payment) throw new NotFoundException(`Payment receipt ${id} not found`);
    return payment;
  }
}
