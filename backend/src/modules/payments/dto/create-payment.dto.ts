import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsPositive,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentInstrument } from '../entities/customer-payment.entity';

export class CreatePaymentDto {
  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ enum: PaymentInstrument, example: PaymentInstrument.BANK_DEPOSIT })
  @IsEnum(PaymentInstrument)
  instrumentType: PaymentInstrument;

  @ApiProperty({ example: 'Commercial Bank of Ethiopia' })
  @IsString()
  @IsNotEmpty({ message: 'Bank name is required' })
  bankName: string;

  @ApiProperty({ example: 100000.0 })
  @IsNumber()
  @IsPositive({ message: 'Payment amount must be greater than zero' })
  amount: number;

  @ApiProperty({ example: 'FT26260199988' })
  @IsString()
  @IsNotEmpty({ message: 'Bank payment reference number is required' })
  referenceNumber: string;

  @ApiPropertyOptional({ example: '2026-09-17' })
  @IsString()
  @IsOptional()
  referenceDate?: string;

  @ApiPropertyOptional({ example: 'Customer advance deposit' })
  @IsString()
  @IsOptional()
  notes?: string;
}
