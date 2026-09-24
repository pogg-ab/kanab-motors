import { Entity, PrimaryColumn } from 'typeorm';
import { VehicleStatus } from '../../vehicles/entities/vehicle-unit.entity';

@Entity('vehicle_status_transition_rule')
export class VehicleStatusTransitionRule {
  @PrimaryColumn({
    name: 'from_status',
    type: 'enum',
    enum: VehicleStatus,
  })
  fromStatus: VehicleStatus;

  @PrimaryColumn({
    name: 'to_status',
    type: 'enum',
    enum: VehicleStatus,
  })
  toStatus: VehicleStatus;
}
