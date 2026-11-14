import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CustomerPayment, PaymentStatus } from './entities/customer-payment.entity';
import { CustomerPaymentTransfer } from './entities/customer-payment-transfer.entity';
import { Customer } from '../customers/entities/customer.entity';
import { TransferExcessPaymentDto } from './dto/transfer-excess-payment.dto';
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
    @InjectRepository(CustomerPaymentTransfer)
    private readonly transferRepo: Repository<CustomerPaymentTransfer>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly ledgerService: LedgerService,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreatePaymentDto, userId: number = 1): Promise<CustomerPayment> {
    let customerId = dto.customerId;
    let bookingId: string | undefined = undefined;

    if (dto.bookingId) {
      const booking = await this.bookingRepo.findOne({
        where: { bookingId: dto.bookingId },
        relations: ['customer'],
      });
      if (!booking) throw new NotFoundException(`Booking ${dto.bookingId} not found`);

      if (booking.bookingStatus === BookingStatus.CANCELLED) {
        throw new BadRequestException('Cannot accept payments for a cancelled booking');
      }
      bookingId = booking.bookingId;
      customerId = booking.customerId;
    }

    if (!customerId) {
      throw new BadRequestException('Customer ID is required for general account deposits');
    }

    const isInstallment = Boolean(dto.isInstallment);
    const installmentStatus = isInstallment ? 'PENDING_CEO' : 'NONE';

    const payment = this.paymentRepo.create({
      bookingId: bookingId || undefined,
      customerId,
      instrumentType: dto.instrumentType,
      bankName: dto.bankName.trim(),
      amount: dto.amount,
      referenceNumber: dto.referenceNumber.trim(),
      referenceDate: dto.referenceDate,
      isInstallment,
      installmentApprovalStatus: installmentStatus,
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
        isInstallment,
        installmentApprovalStatus: installmentStatus,
      },
    });

    return this.findOne(saved.paymentId);
  }

  /**
   * Confirm Bank Receipt Voucher (Story P4, P6, P7, P8, P14)
   * Posts either ADVANCE_DEPOSIT or ADDITIONAL_PAYMENT to the Customer Ledger,
   * updates booking deposited and outstanding balance, and updates account summary atomically.
   */
  async confirmPayment(id: string, userId: number = 1): Promise<CustomerPayment> {
    const payment = await this.findOne(id);
    if (payment.status === PaymentStatus.CONFIRMED) {
      throw new BadRequestException('Payment is already confirmed');
    }

    // Story P14: Instalment Approval gate (CEO)
    if (payment.isInstallment && payment.installmentApprovalStatus !== 'APPROVED') {
      throw new BadRequestException('This installment payment requires CEO approval before confirmation');
    }

    payment.status = PaymentStatus.CONFIRMED;
    payment.confirmedBy = userId;
    payment.confirmedAt = new Date();
    const savedPayment = await this.paymentRepo.save(payment);

    let txType: LedgerTransactionType = LedgerTransactionType.CUSTOMER_CREDIT;
    let newDeposited: number = 0;

    if (payment.bookingId) {
      const booking = await this.bookingRepo.findOne({
        where: { bookingId: payment.bookingId },
        relations: ['payments'],
      });
      if (!booking) throw new NotFoundException(`Booking ${payment.bookingId} not found`);

      // Determine whether this is the 1st deposit or an additional deposit (Story P6)
      const priorConfirmed = booking.payments?.filter(
        (p) => p.status === PaymentStatus.CONFIRMED && p.paymentId !== id,
      );
      txType =
        !priorConfirmed || priorConfirmed.length === 0
          ? LedgerTransactionType.ADVANCE_DEPOSIT
          : LedgerTransactionType.ADDITIONAL_PAYMENT;

      // Calculate booking totals update (Story P7)
      const prevDeposited = Number(booking.totalAmountDeposited || 0);
      newDeposited = prevDeposited + Number(payment.amount);
      const grossTotal = Number(booking.grossTotal);
      const newOutstanding = Math.max(0, grossTotal - newDeposited);

      booking.totalAmountDeposited = newDeposited;
      booking.outstandingBalance = newOutstanding;
      if (newOutstanding === 0) {
        booking.bookingStatus = BookingStatus.SETTLED;
      } else if (newDeposited >= Number(booking.requiredAdvanceAmount) && booking.bookingStatus === BookingStatus.APPROVED) {
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
          availableCredit: excessPortion > 0 ? excessPortion : 0,
        },
      });
    } else {
      // General deposit not tied to a booking (Story P4)
      await this.ledgerService.postTransaction({
        customerId: payment.customerId,
        transactionType: LedgerTransactionType.CUSTOMER_CREDIT,
        referenceNumber: payment.receiptNumber,
        description: `General Account Deposit via ${payment.instrumentType} (${payment.bankName} Ref: ${payment.referenceNumber})`,
        creditAmount: Number(payment.amount),
        debitAmount: 0,
        relatedReceiptId: payment.paymentId,
        processedBy: userId,
        summaryDelta: {
          totalDeposits: Number(payment.amount),
          availableCredit: Number(payment.amount),
        },
      });
    }

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

  /**
   * Decide CEO Installment Approval (Story P14: Instalment Approval gate - CEO)
   */
  async decideCeoInstallmentApproval(
    paymentId: string,
    approved: boolean,
    reason?: string,
    userId: number = 1,
  ): Promise<CustomerPayment> {
    const payment = await this.findOne(paymentId);
    if (!payment.isInstallment) {
      throw new BadRequestException('Payment is not flagged as an installment');
    }

    if (approved) {
      payment.installmentApprovalStatus = 'APPROVED';
      payment.ceoApprovedBy = userId;
      payment.ceoApprovedAt = new Date();
    } else {
      payment.installmentApprovalStatus = 'REJECTED';
      payment.status = PaymentStatus.REJECTED;
      payment.ceoRejectionReason = reason || 'Rejected by CEO';
      payment.rejectionReason = payment.ceoRejectionReason;
    }

    const saved = await this.paymentRepo.save(payment);

    await this.auditService.log({
      entityType: 'customer_payment',
      entityId: paymentId,
      action: 'UPDATE',
      changedBy: userId,
      newValue: {
        action: approved ? 'CEO_APPROVED_INSTALLMENT' : 'CEO_REJECTED_INSTALLMENT',
        installmentApprovalStatus: saved.installmentApprovalStatus,
        reason,
      },
    });

    return saved;
  }

  /**
   * KMSI-14-05: Transfer Excess Customer Payments Across Customer Bookings
   */
  async transferExcessPayment(dto: TransferExcessPaymentDto, userId: number = 1): Promise<CustomerPaymentTransfer> {
    if (dto.sourceBookingId === dto.destinationBookingId) {
      throw new BadRequestException('Source and destination bookings must be different');
    }
    if (!dto.authorizationReference?.trim()) {
      throw new BadRequestException('Customer authorization reference is required for a cross-customer transfer');
    }

    const transferAmount = Number(dto.transferAmount);
    if (transferAmount <= 0) throw new BadRequestException('Transfer amount must be greater than zero');

    const sourceBooking = await this.bookingRepo.findOne({ where: { bookingId: dto.sourceBookingId } });
    if (!sourceBooking) throw new NotFoundException(`Source Booking ${dto.sourceBookingId} not found`);
    const destBooking = await this.bookingRepo.findOne({ where: { bookingId: dto.destinationBookingId } });
    if (!destBooking) throw new NotFoundException(`Destination Booking ${dto.destinationBookingId} not found`);
    if (String(destBooking.customerId) !== String(dto.destinationCustomerId)) {
      throw new BadRequestException(`Destination booking ${dto.destinationBookingId} does not belong to destination customer ${dto.destinationCustomerId}`);
    }

    const sourceDeposited = Number(sourceBooking.totalAmountDeposited || 0);
    const sourceGross = Number(sourceBooking.grossTotal || 0);
    const transferableExcess = Math.max(0, sourceDeposited - sourceGross);
    if (transferAmount > transferableExcess) {
      throw new BadRequestException(
        `Only excess funds may be transferred. Available excess is ${transferableExcess.toFixed(2)}, requested ${transferAmount.toFixed(2)}.`,
      );
    }

    const transfer = this.transferRepo.create({
      sourceBookingId: dto.sourceBookingId,
      sourceCustomerId: sourceBooking.customerId,
      destinationBookingId: dto.destinationBookingId,
      destinationCustomerId: destBooking.customerId,
      transferAmount,
      transferReason: dto.transferReason.trim(),
      authorizationReference: dto.authorizationReference.trim(),
      transferredBy: userId,
      status: 'PENDING_APPROVAL',
    });

    const saved = await this.transferRepo.save(transfer);

    await this.auditService.log({
      entityType: 'customer_payment_transfer',
      entityId: saved.transferId,
      action: 'INSERT',
      changedBy: userId,
      newValue: {
        sourceBookingId: saved.sourceBookingId,
        destinationBookingId: saved.destinationBookingId,
        transferAmount: saved.transferAmount,
        status: saved.status,
      },
    });

    return saved;
  }

  /**
   * KMS-FB-05: Approve & Execute Cross-Customer Excess Transfer
   */
  async approveTransfer(transferId: string, userId: number = 1, userRole?: string): Promise<CustomerPaymentTransfer> {
    const transfer = await this.transferRepo.findOne({
      where: { transferId },
      relations: ['sourceBooking', 'destinationBooking'],
    });
    if (!transfer) throw new NotFoundException(`Payment transfer #${transferId} not found`);
    if (transfer.status === 'APPROVED') {
      throw new BadRequestException(`Transfer #${transferId} has already been approved and executed`);
    }
    if (transfer.status === 'REJECTED') {
      throw new BadRequestException(`Cannot approve rejected transfer #${transferId}`);
    }

    const transferAmount = Number(transfer.transferAmount);

    await this.dataSource.transaction(async (manager) => {
      const bookingRepo = manager.getRepository(Booking);
      const transferRepo = manager.getRepository(CustomerPaymentTransfer);
      const current = await transferRepo.findOne({ where: { transferId }, lock: { mode: 'pessimistic_write' } });
      if (!current || current.status !== 'PENDING_APPROVAL') {
        throw new BadRequestException('Only a pending transfer can be approved');
      }
      const isAdmin = userRole === 'ADMIN' || userRole === 'SYSTEM_ADMIN' || Number(userId) === 1;
      if (Number(current.transferredBy) === Number(userId) && !isAdmin) {
        throw new BadRequestException('A different authorized user must approve this transfer');
      }
      Object.assign(transfer, current);
      const ids = [transfer.sourceBookingId, transfer.destinationBookingId].sort();
      const locked = await bookingRepo
        .createQueryBuilder('booking')
        .setLock('pessimistic_write')
        .where('booking.bookingId IN (:...ids)', { ids })
        .getMany();
      const sourceBooking = locked.find((b) => String(b.bookingId) === String(transfer.sourceBookingId));
      const destBooking = locked.find((b) => String(b.bookingId) === String(transfer.destinationBookingId));
      if (!sourceBooking) throw new NotFoundException(`Source Booking ${transfer.sourceBookingId} not found`);
      if (!destBooking) throw new NotFoundException(`Destination Booking ${transfer.destinationBookingId} not found`);

      const sourceDeposited = Number(sourceBooking.totalAmountDeposited || 0);
      const sourceGross = Number(sourceBooking.grossTotal || 0);
      const transferableExcess = Math.max(0, sourceDeposited - sourceGross);
      if (transferAmount > transferableExcess) {
        throw new BadRequestException(
          `Cannot execute transfer: available excess has changed and is now ${transferableExcess.toFixed(2)}, requested ${transferAmount.toFixed(2)}.`,
        );
      }

      sourceBooking.totalAmountDeposited = Number((sourceDeposited - transferAmount).toFixed(2));
      sourceBooking.outstandingBalance = Number(Math.max(0, sourceGross - sourceBooking.totalAmountDeposited).toFixed(2));

      const destDeposited = Number(destBooking.totalAmountDeposited || 0);
      const destGross = Number(destBooking.grossTotal || 0);
      destBooking.totalAmountDeposited = Number((destDeposited + transferAmount).toFixed(2));
      destBooking.outstandingBalance = Number(Math.max(0, destGross - destBooking.totalAmountDeposited).toFixed(2));
      if (destBooking.bookingStatus === BookingStatus.APPROVED && destBooking.totalAmountDeposited >= Number(destBooking.requiredAdvanceAmount || 0)) {
        destBooking.bookingStatus = BookingStatus.CONFIRMED;
      }
      await bookingRepo.save([sourceBooking, destBooking]);

      transfer.status = 'APPROVED';
      transfer.approvedBy = userId;
      transfer.approvedAt = new Date();
      await transferRepo.save(transfer);

      await this.ledgerService.postTransaction({
        customerId: sourceBooking.customerId,
        transactionType: LedgerTransactionType.ADJUSTMENT,
        debitAmount: transferAmount,
        creditAmount: 0,
        referenceNumber: `TR-OUT-${transfer.transferId}`,
        description: `Excess payment transferred to booking #${destBooking.bookingNumber} (${transfer.transferReason})`,
        summaryDelta: {
          totalDeposits: -transferAmount,
          excessPayments: -transferAmount,
          outstandingBalance: transferAmount,
        },
      }, manager);

      await this.ledgerService.postTransaction({
        customerId: destBooking.customerId,
        transactionType: LedgerTransactionType.ADJUSTMENT,
        debitAmount: 0,
        creditAmount: transferAmount,
        referenceNumber: `TR-IN-${transfer.transferId}`,
        description: `Excess payment transferred from booking #${sourceBooking.bookingNumber} (${transfer.transferReason})`,
        summaryDelta: {
          totalDeposits: transferAmount,
          outstandingBalance: -transferAmount,
        },
      }, manager);
    });

    await this.auditService.log({
      entityType: 'customer_payment_transfer',
      entityId: transfer.transferId,
      action: 'UPDATE',
      changedBy: userId,
      newValue: {
        status: 'APPROVED',
        approvedBy: userId,
        transferAmount,
      },
    });

    return this.transferRepo.findOne({
      where: { transferId },
      relations: ['sourceCustomer', 'destinationCustomer', 'sourceBooking', 'destinationBooking'],
    }) as any;
  }

  /**
   * KMS-FB-05: Reject Cross-Customer Excess Transfer
   */
  async rejectTransfer(transferId: string, rejectionReason: string, userId: number = 1, userRole?: string): Promise<CustomerPaymentTransfer> {
    return this.dataSource.transaction(async manager => {
    const repository = manager.getRepository(CustomerPaymentTransfer);
    const transfer = await repository.findOne({ where: { transferId }, lock: { mode: 'pessimistic_write' } });
    if (!transfer) throw new NotFoundException(`Payment transfer #${transferId} not found`);
    if (transfer.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only a pending transfer can be rejected');
    }
    if (!rejectionReason?.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }
    const isAdmin = userRole === 'ADMIN' || userRole === 'SYSTEM_ADMIN' || Number(userId) === 1;
    if (Number(transfer.transferredBy) === Number(userId) && !isAdmin) {
      throw new BadRequestException('A different authorized user must reject this transfer');
    }

    transfer.status = 'REJECTED';
    transfer.rejectionReason = rejectionReason.trim();
    transfer.approvedBy = userId;
    transfer.approvedAt = new Date();
    const saved = await repository.save(transfer);

    await this.auditService.log({
      entityType: 'customer_payment_transfer',
      entityId: saved.transferId,
      action: 'UPDATE',
      changedBy: userId,
      newValue: {
        status: 'REJECTED',
        rejectionReason: saved.rejectionReason,
      },
    });

    return saved;
    });
  }

  async getAllTransfers(status?: string): Promise<CustomerPaymentTransfer[]> {
    const where: any = {};
    if (status) where.status = status;
    return this.transferRepo.find({
      where,
      relations: ['sourceCustomer', 'destinationCustomer', 'sourceBooking', 'destinationBooking'],
      order: { transferredAt: 'DESC' },
    });
  }

  async getTransfersForBooking(bookingId: string): Promise<CustomerPaymentTransfer[]> {
    return this.transferRepo.find({
      where: [
        { sourceBookingId: bookingId },
        { destinationBookingId: bookingId },
      ],
      relations: ['sourceCustomer', 'destinationCustomer', 'sourceBooking', 'destinationBooking'],
      order: { transferredAt: 'DESC' },
    });
  }
}
