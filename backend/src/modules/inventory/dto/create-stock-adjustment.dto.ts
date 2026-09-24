import { IsNotEmpty, IsNumber, IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdjustmentReason } from '../entities/stock-adjustment.entity';

export class CreateStockAdjustmentDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @IsNumber()
  warehouseId: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  itemId?: string | number;

  @ApiPropertyOptional({ example: -2, description: 'Positive or negative quantity delta' })
  @IsOptional()
  @IsNumber()
  quantityDelta?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  vehicleUnitId?: string | number;

  @ApiProperty({ enum: AdjustmentReason, example: AdjustmentReason.CYCLE_COUNT_CORRECTION })
  @IsNotEmpty()
  @IsEnum(AdjustmentReason)
  reason: AdjustmentReason;

  @ApiProperty({ example: 'Annual physical count variance verification in Main Warehouse' })
  @IsNotEmpty()
  @IsString()
  reasonNotes: string;
}
