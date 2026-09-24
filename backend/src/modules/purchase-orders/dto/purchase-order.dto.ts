import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { POStatus } from '../entities/purchase-order.entity';

export class CreatePOLineDto {
  @Matches(/^[1-9]\d*$/)
  itemId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  quantityOrdered: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  unitPrice: number;
}

export class CreatePODto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplierId: number;

  @IsOptional()
  @IsDateString()
  poDate?: string;

  @IsEnum(['ETB', 'USD', 'EUR'])
  currency: 'ETB' | 'USD' | 'EUR';

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePOLineDto)
  lines: CreatePOLineDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;
}

export class UpdatePODto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplierId?: number;

  @IsOptional()
  @IsDateString()
  poDate?: string;

  @IsOptional()
  @IsEnum(['ETB', 'USD', 'EUR'])
  currency?: 'ETB' | 'USD' | 'EUR';

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePOLineDto)
  lines?: CreatePOLineDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;
}

export class UpdatePOStatusDto {
  @IsEnum(POStatus)
  status: POStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;
}
