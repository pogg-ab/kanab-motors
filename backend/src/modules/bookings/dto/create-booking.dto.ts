import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsPositive,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: '1' })
  @IsNotEmpty({ message: 'Customer ID is required' })
  customerId: string;

  @ApiProperty({ example: '1' })
  @IsNotEmpty({ message: 'Item ID (Model) is required' })
  itemId: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  enquiryId?: string;

  @ApiProperty({ example: 1, default: 1 })
  @IsNumber()
  @Min(1)
  quantity: number = 1;

  @ApiPropertyOptional({ example: 185000.0 })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  unitPrice?: number;

  @ApiPropertyOptional({ example: 50000.0 })
  @IsNumber()
  @IsOptional()
  requiredAdvanceAmount?: number;

  @ApiProperty({ example: 'Abel Legesse' })
  @IsString()
  @IsNotEmpty({ message: 'Salesperson name is required' })
  salespersonName: string;

  @ApiPropertyOptional({ example: '2026-10-23T00:00:00Z' })
  @IsString()
  @IsOptional()
  targetDeliveryDate?: string;
}
