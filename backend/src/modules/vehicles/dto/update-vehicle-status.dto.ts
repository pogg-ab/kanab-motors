import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { VehicleStatus } from '../entities/vehicle-unit.entity';

export class UpdateVehicleStatusDto {
  @IsEnum(VehicleStatus)
  status: VehicleStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  warehouseId?: number;
}
