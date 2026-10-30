import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsPositive,
  IsOptional,
  Min,
  MinLength,
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

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  slipId?: string;

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

  @ApiProperty({ example: 'Yared Tadesse' })
  @IsString()
  @IsNotEmpty({ message: 'Salesperson full name is mandatory' })
  @MinLength(2, { message: 'Salesperson full name must be at least 2 characters' })
  salespersonName: string;

  @ApiPropertyOptional({ example: '2026-10-23T00:00:00Z' })
  @IsString()
  @IsOptional()
  targetDeliveryDate?: string;

  @ApiPropertyOptional({ example: 'BANK_DEPOSIT', default: 'BANK_DEPOSIT' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;
}
