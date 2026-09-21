import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsPositive,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEnquiryDto {
  @ApiProperty({ example: '1' })
  @IsNotEmpty({ message: 'Customer ID is required' })
  customerId: string;

  @ApiProperty({ example: '1' })
  @IsNotEmpty({ message: 'Item ID (Model) is required' })
  itemId: string;

  @ApiProperty({ example: 1, default: 1 })
  @IsNumber()
  @Min(1)
  quantity: number = 1;

  @ApiPropertyOptional({ example: 185000.0 })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  unitPrice?: number;

  @ApiProperty({ example: 'Abel Legesse' })
  @IsString()
  @IsNotEmpty({ message: 'Salesperson name is required' })
  salespersonName: string;

  @ApiPropertyOptional({ example: 'BANK_DEPOSIT', default: 'BANK_DEPOSIT' })
  @IsString()
  @IsOptional()
  paymentMode?: string;
}
