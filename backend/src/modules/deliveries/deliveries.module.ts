import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Delivery } from './entities/delivery.entity';
import { PdiChecklistItem } from './entities/pdi-checklist-item.entity';
import { PdiInspection } from './entities/pdi-inspection.entity';
import { PdiInspectionResult } from './entities/pdi-inspection-result.entity';
import { VehicleUnit } from '../vehicles/entities/vehicle-unit.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { DeliveriesService } from './deliveries.service';
import { DeliveriesController } from './deliveries.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Delivery,
      PdiChecklistItem,
      PdiInspection,
      PdiInspectionResult,
      VehicleUnit,
      Booking,
    ]),
  ],
  providers: [DeliveriesService],
  controllers: [DeliveriesController],
  exports: [DeliveriesService, TypeOrmModule],
})
export class DeliveriesModule {}
