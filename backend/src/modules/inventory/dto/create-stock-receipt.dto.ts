import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum StockReceiptSourceType {
  OPENING_BALANCE = 'OPENING_BALANCE',
  LOCAL_PURCHASE = 'LOCAL_PURCHASE',
  MANUAL_RECEIPT = 'MANUAL_RECEIPT',
  CORRECTION = 'CORRECTION',
}

export class CreateStockReceiptDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @IsNumber()
  warehouseId: number;

  @ApiProperty({ example: '4' })
  @IsNotEmpty()
  @IsString()
  itemId: string;

  @ApiProperty({ example: 20 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ enum: StockReceiptSourceType, example: StockReceiptSourceType.OPENING_BALANCE })
  @IsNotEmpty()
  @IsEnum(StockReceiptSourceType)
  sourceType: StockReceiptSourceType;

  @ApiPropertyOptional({ example: 'Opening stock count before Module 4 testing' })
  @IsOptional()
  @IsString()
  notes?: string;
}
