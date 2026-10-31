import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordCustomerCustodyDto {
  @ApiProperty({ example: '1', description: 'Customer ID who legally owns the vehicle' })
  @IsNotEmpty({ message: 'Customer ID is required' })
  customerId: string;

  @ApiProperty({ example: 'Customer requested delayed handover pending garage construction' })
  @IsNotEmpty({ message: 'Custody reason is required' })
  @IsString()
  custodyReason: string;

  @ApiPropertyOptional({ example: '2026-11-01' })
  @IsOptional()
  @IsString()
  custodyStartDate?: string;

  @ApiPropertyOptional({ example: '2026-12-01' })
  @IsOptional()
  @IsString()
  expectedHandoverDate?: string;
}

