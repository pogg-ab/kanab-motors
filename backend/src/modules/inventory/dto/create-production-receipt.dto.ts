import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductionReceiptDto {
  @ApiProperty({ example: 1, description: 'Product Item ID of the assembled vehicle' })
  @IsNotEmpty()
  itemId: string | number;

  @ApiProperty({ example: 'CHS-ET-LOCAL-001', description: 'Unique chassis/VIN number' })
  @IsNotEmpty()
  @IsString()
  chassisNumber: string;

  @ApiProperty({ example: 'ENG-ET-LOCAL-001', description: 'Unique engine number' })
  @IsNotEmpty()
  @IsString()
  engineNumber: string;

  @ApiProperty({ example: 1, description: 'Destination warehouse for intake' })
  @IsNotEmpty()
  @IsNumber()
  warehouseId: number;

  @ApiPropertyOptional({ example: '2026-09-24', description: 'Assembly completion date' })
  @IsOptional()
  @IsString()
  assembledAt?: string;
}
