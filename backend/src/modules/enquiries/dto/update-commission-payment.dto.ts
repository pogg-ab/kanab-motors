import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCommissionPaymentDto {
  @ApiProperty({ example: 'PAID', description: 'PAID | UNPAID' })
  @IsString()
  @IsNotEmpty()
  status: string; // 'PAID' | 'UNPAID'

  @ApiPropertyOptional({ example: 'CBE-CHQ-99120' })
  @IsString()
  @IsOptional()
  paymentReference?: string;

  @ApiPropertyOptional({ example: 'Commission paid via bank cheque' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 'Dawit Kebede' })
  @IsString()
  @IsOptional()
  agentName?: string;

  @ApiPropertyOptional({ example: '+251 911 334455' })
  @IsString()
  @IsOptional()
  agentPhone?: string;
}
