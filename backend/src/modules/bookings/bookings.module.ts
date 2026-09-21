import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { SalesEnquiry } from '../enquiries/entities/sales-enquiry.entity';
import { ProductItem } from '../products/entities/product-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, SalesEnquiry, ProductItem, Customer])],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
