import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerPayment } from './entities/customer-payment.entity';
import { CustomerPaymentTransfer } from './entities/customer-payment-transfer.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Customer } from '../customers/entities/customer.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerPayment, CustomerPaymentTransfer, Booking, Customer])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
