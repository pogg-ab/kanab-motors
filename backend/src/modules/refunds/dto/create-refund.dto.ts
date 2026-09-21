import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsPositive,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRefundDto {
  @ApiProperty({ example: '1' })
  @IsNotEmpty({ message: 'Customer ID is required' })
  customerId: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  bookingId?: string;

  @ApiPropertyOptional({ example: 'BRV-00001' })
  @IsOptional()
  originalPaymentReference?: string;

  @ApiProperty({ example: 'Overpayment refund requested by customer after booking adjustment' })
  @IsString()
  @IsNotEmpty({ message: 'Refund reason is required' })
  refundReason: string;

  @ApiProperty({ example: 30000.0 })
  @IsNumber()
  @IsPositive({ message: 'Refund amount must be greater than zero' })
  refundAmount: number;

  @ApiPropertyOptional({ example: 'BANK_TRANSFER', default: 'BANK_TRANSFER' })
  @IsString()
  @IsOptional()
  refundMethod?: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  bankAccountId?: string;
}
