import { IsOptional, IsString, IsNumber, IsPositive } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmPayoutDto {
  @ApiPropertyOptional({ example: 'CBE-TRX-9821849' })
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiPropertyOptional({ example: 'Confirmed wire transfer receipt to customer bank account' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 30000.0 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  actualAmountPaid?: number;

  @ApiPropertyOptional({ example: 'BANK_TRANSFER' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
