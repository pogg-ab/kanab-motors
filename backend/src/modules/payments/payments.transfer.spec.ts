import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { CustomerPaymentTransfer } from './entities/customer-payment-transfer.entity';

describe('PaymentsService cross-customer excess transfer', () => {
  const source: any = { bookingId: '1', bookingNumber: 'B-1', customerId: '10', grossTotal: 100, totalAmountDeposited: 150, outstandingBalance: 0, bookingStatus: BookingStatus.SETTLED };
  const destination: any = { bookingId: '2', bookingNumber: 'B-2', customerId: '20', grossTotal: 200, totalAmountDeposited: 20, outstandingBalance: 180, requiredAdvanceAmount: 50, bookingStatus: BookingStatus.APPROVED };

  const makeService = () => {
    const locked = [{ ...source }, { ...destination }];
    const bookingManagerRepo: any = {
      createQueryBuilder: jest.fn().mockReturnValue({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(locked),
      }),
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    };
    const transferManagerRepo: any = {
      findOne: jest.fn().mockResolvedValue({ transferId: '99', ...dto, transferredBy: 6, status: 'PENDING_APPROVAL' }),
      create: jest.fn().mockImplementation((value) => ({ transferId: '99', ...value })),
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    };
    const transferRepo: any = {
      create: jest.fn().mockImplementation((value) => ({ transferId: '99', ...value })),
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
      findOne: jest.fn().mockImplementation(() => Promise.resolve({ transferId: '99', ...dto, status: 'PENDING_APPROVAL' })),
    };
    const manager: any = {
      getRepository: jest.fn((entity) => entity === Booking ? bookingManagerRepo : entity === CustomerPaymentTransfer ? transferManagerRepo : undefined),
    };
    const dataSource: any = { transaction: jest.fn((callback) => callback(manager)) };
    const bookingRepo: any = {
      findOne: jest.fn().mockImplementation(({ where }: any) => Promise.resolve(locked.find((b) => b.bookingId === where.bookingId))),
      findOneByOrFail: jest.fn(),
    };
    const ledgerService: any = { postTransaction: jest.fn().mockResolvedValue({}) };
    const auditService: any = { log: jest.fn().mockResolvedValue({}) };
    const service = new PaymentsService({} as any, bookingRepo, transferRepo, {} as any, ledgerService, auditService, dataSource);
    return { service, bookingManagerRepo, transferManagerRepo, ledgerService };
  };

  const dto: any = {
    sourceBookingId: '1', destinationBookingId: '2', destinationCustomerId: '20',
    transferAmount: 40, transferReason: 'Written customer request', authorizationReference: 'AUTH-001',
    autoApprove: true,
  };

  it('rejects an amount greater than the true excess', async () => {
    const { service, bookingManagerRepo } = makeService();
    await expect(service.transferExcessPayment({ ...dto, transferAmount: 51 })).rejects.toBeInstanceOf(BadRequestException);
    expect(bookingManagerRepo.save).not.toHaveBeenCalled();
  });

  it('updates both bookings and posts both ledgers in one database transaction', async () => {
    const { service, bookingManagerRepo, ledgerService } = makeService();
    await service.approveTransfer('99', 7);
    expect(bookingManagerRepo.save).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ bookingId: '1', totalAmountDeposited: 110 }),
      expect.objectContaining({ bookingId: '2', totalAmountDeposited: 60 }),
    ]));
    expect(ledgerService.postTransaction).toHaveBeenCalledTimes(2);
    expect(ledgerService.postTransaction.mock.calls[0][1]).toBeDefined();
  });
  it('never moves money when requesting a transfer, even with the legacy autoApprove flag', async () => {
    const { service, bookingManagerRepo, ledgerService } = makeService();
    await service.transferExcessPayment(dto, 7);
    expect(bookingManagerRepo.save).not.toHaveBeenCalled();
    expect(ledgerService.postTransaction).not.toHaveBeenCalled();
  });
  it('rejects stale approval after locking an already executed transfer', async () => {
    const { service, transferManagerRepo, ledgerService } = makeService();
    transferManagerRepo.findOne.mockResolvedValue({ ...dto, status: 'APPROVED' });
    await expect(service.approveTransfer('99', 7)).rejects.toBeInstanceOf(BadRequestException);
    expect(ledgerService.postTransaction).not.toHaveBeenCalled();
  });
  it('requires an independent approver', async () => {
    const { service, ledgerService } = makeService();
    await expect(service.approveTransfer('99', 6)).rejects.toBeInstanceOf(BadRequestException);
    expect(ledgerService.postTransaction).not.toHaveBeenCalled();
  });
});
