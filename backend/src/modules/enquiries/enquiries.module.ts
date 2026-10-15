import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesEnquiry } from './entities/sales-enquiry.entity';
import { ProductItem } from '../products/entities/product-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { PreAdvanceSlip } from './entities/pre-advance-slip.entity';
import { EnquiriesService } from './enquiries.service';
import { EnquiriesController } from './enquiries.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SalesEnquiry, PreAdvanceSlip, ProductItem, Customer])],
  controllers: [EnquiriesController],
  providers: [EnquiriesService],
  exports: [EnquiriesService, TypeOrmModule],
})
export class EnquiriesModule {}
