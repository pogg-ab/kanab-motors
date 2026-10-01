import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleStatus } from '../entities/vehicle-unit.entity';

export class UpdateVehicleUnitDto {
  @ApiPropertyOptional({ example: '1' })
  @IsString()
  @IsOptional()
  itemId?: string;

  @ApiPropertyOptional({ example: 'CHS-2026-99881' })
  @IsString()
  @IsOptional()
  chassisNumber?: string;

  @ApiPropertyOptional({ example: 'ENG-2026-55442' })
  @IsString()
  @IsOptional()
  engineNumber?: string;

  @ApiPropertyOptional({ example: 'Shipment SHP-001 from Bajaj Auto India' })
  @IsString()
  @IsOptional()
  productionImportInfo?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  currentWarehouseId?: number;

  @ApiPropertyOptional({ enum: VehicleStatus })
  @IsEnum(VehicleStatus)
  @IsOptional()
  currentStatus?: VehicleStatus;
}
