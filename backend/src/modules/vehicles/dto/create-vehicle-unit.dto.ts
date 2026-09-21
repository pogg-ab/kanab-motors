import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleStatus } from '../entities/vehicle-unit.entity';

export class CreateVehicleUnitDto {
  @ApiProperty({ example: '1' })
  @IsNotEmpty({ message: 'Item ID (Model) is required' })
  itemId: string;

  @ApiProperty({ example: 'CHS-2026-99881' })
  @IsString()
  @IsNotEmpty({ message: 'Chassis number is required' })
  chassisNumber: string;

  @ApiProperty({ example: 'ENG-2026-55442' })
  @IsString()
  @IsNotEmpty({ message: 'Engine number is required' })
  engineNumber: string;

  @ApiPropertyOptional({ example: 'Shipment SHP-001 from Bajaj Auto India via Djibouti Port' })
  @IsString()
  @IsOptional()
  productionImportInfo?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  currentWarehouseId?: number;

  @ApiPropertyOptional({ enum: VehicleStatus, default: VehicleStatus.RECEIVED })
  @IsEnum(VehicleStatus)
  @IsOptional()
  currentStatus?: VehicleStatus;
}
