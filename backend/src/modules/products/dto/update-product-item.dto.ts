import {
  IsOptional,
  IsString,
  IsNumber,
  IsPositive,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductItemDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  itemCode?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  itemName?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  categoryId?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  brandId?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  uomId?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsPositive()
  @IsOptional()
  sellingPrice?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  taxConfigId?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  reorderLevel?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsPositive()
  @IsOptional()
  weightKg?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  colour?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  engineCapacityCc?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsPositive()
  @IsOptional()
  batteryPowerKwh?: number;

  @ApiPropertyOptional({ example: 2025 })
  @IsNumber()
  @IsOptional()
  modelYear?: number;

  @ApiPropertyOptional({ example: 'BEV' })
  @IsString()
  @IsOptional()
  powertrain?: string;

  @ApiPropertyOptional({ example: 'NEW', default: 'NEW' })
  @IsString()
  @IsOptional()
  newOrUsed?: string;

  @ApiPropertyOptional({ example: 'ELECTRIC' })
  @IsString()
  @IsOptional()
  fuelEnergyType?: string;

  @ApiPropertyOptional({ example: 450 })
  @IsNumber()
  @IsOptional()
  drivingRangeKm?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
