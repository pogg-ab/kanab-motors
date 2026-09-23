import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class ManualAdjustmentDto {
  @ApiProperty({ enum: ['CREDIT', 'DEBIT'], example: 'CREDIT', description: 'Adjustment direction' })
  @IsEnum(['CREDIT', 'DEBIT'])
  type: 'CREDIT' | 'DEBIT';

  @ApiProperty({ example: 2500, description: 'Adjustment amount in ETB' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    example: 'Reconciliation of CBE bank service charge reversal',
    description: 'Mandatory audit justification reason',
  })
  @IsString()
  @MinLength(5)
  reason: string;

  @ApiPropertyOptional({ example: 'ADJ-2026-003', description: 'Optional custom reference number' })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional({ example: null, description: 'Optional related booking ID' })
  @IsOptional()
  bookingId?: string | null;
}
