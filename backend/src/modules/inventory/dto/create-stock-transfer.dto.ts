import { IsNotEmpty, IsNumber, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StockTransferLineDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  itemId?: string | number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  vehicleUnitId?: string | number;
}

export class CreateStockTransferDto {
  @ApiProperty({ example: 1, description: 'Source warehouse ID' })
  @IsNotEmpty()
  @IsNumber()
  fromWarehouseId: number;

  @ApiProperty({ example: 2, description: 'Destination warehouse ID' })
  @IsNotEmpty()
  @IsNumber()
  toWarehouseId: number;

  @ApiProperty({ type: [StockTransferLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockTransferLineDto)
  lines: StockTransferLineDto[];
}
