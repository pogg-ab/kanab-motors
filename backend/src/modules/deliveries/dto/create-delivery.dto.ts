import { IsNotEmpty, IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDeliveryDto {
  @ApiProperty({ description: 'Booking ID for the handover', example: 1 })
  @IsNotEmpty()
  bookingId: string | number;

  @ApiProperty({ description: 'Vehicle Unit ID to be delivered', example: 1 })
  @IsNotEmpty()
  vehicleUnitId: string | number;

  @ApiPropertyOptional({ description: 'Handover date (YYYY-MM-DD)', example: '2026-09-24' })
  @IsOptional()
  @IsString()
  deliveryDate?: string;

  @ApiPropertyOptional({ description: 'Responsible employee user ID', example: 1 })
  @IsOptional()
  @IsNumber()
  responsibleEmployee?: number;

  @ApiPropertyOptional({ description: 'Customer acknowledgment received', default: false })
  @IsOptional()
  @IsBoolean()
  customerAcknowledged?: boolean;

  @ApiPropertyOptional({ description: 'Financial settlement manual validation flag', default: false })
  @IsOptional()
  @IsBoolean()
  financialSettlementValidated?: boolean;
}
