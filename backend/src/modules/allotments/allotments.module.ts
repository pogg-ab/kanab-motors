import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllotmentsController } from './allotments.controller';
import { AllotmentsService } from './allotments.service';
import { Allotment } from './entities/allotment.entity';
import { AllotmentLine } from './entities/allotment-line.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { VehicleUnit } from '../vehicles/entities/vehicle-unit.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Allotment, AllotmentLine, Booking, VehicleUnit]),
    AuditModule,
  ],
  controllers: [AllotmentsController],
  providers: [AllotmentsService],
  exports: [AllotmentsService],
})
export class AllotmentsModule {}
