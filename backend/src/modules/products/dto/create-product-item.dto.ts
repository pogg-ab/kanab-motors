import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsPositive,
  Min,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductItemDto {
  @ApiProperty({ example: 'KB-MC-BOXER150' })
  @IsString()
  @IsNotEmpty({ message: 'Item code is required' })
  itemCode: string;

  @ApiProperty({ example: 'Bajaj Boxer BM 150 Motorcycle' })
  @IsString()
  @IsNotEmpty({ message: 'Item name is required' })
  itemName: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty({ message: 'Category is required' })
  categoryId: number;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  brandId?: number;

  @ApiPropertyOptional({ example: 'Boxer BM 150' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty({ message: 'Unit of Measure is required' })
  uomId: number;

  @ApiProperty({ example: 185000.0 })
  @IsNumber()
  @IsPositive({ message: 'Selling price must be greater than 0' })
  sellingPrice: number;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  taxConfigId?: number;

  @ApiPropertyOptional({ example: 5, default: 0 })
  @IsNumber()
  @Min(0, { message: 'Reorder level must be 0 or greater' })
  @IsOptional()
  reorderLevel?: number;

  @ApiPropertyOptional({ example: 145.5 })
  @IsNumber()
  @IsPositive({ message: 'Weight must be greater than 0' })
  @IsOptional()
  weightKg?: number;

  @ApiPropertyOptional({ example: 'Crimson Red' })
  @IsString()
  @IsOptional()
  colour?: string;

  @ApiPropertyOptional({ example: '150cc' })
  @IsString()
  @IsOptional()
  engineCapacityCc?: string;

  @ApiPropertyOptional({ example: 7.2 })
  @IsNumber()
  @IsPositive({ message: 'Battery power must be greater than 0' })
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

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
