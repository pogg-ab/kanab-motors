import { IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Target Booking ID for invoicing', example: 1 })
  @IsNotEmpty()
  bookingId: string | number;

  @ApiPropertyOptional({ description: 'Specific vehicle unit ID (optional, defaults to allotted vehicle for booking)' })
  @IsOptional()
  vehicleUnitId?: string | number;

  @ApiPropertyOptional({ description: 'Override quantity (defaults to booking quantity)', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Override unit price (defaults to booking unit price)', example: 2500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ description: 'VAT rate (defaults to 0.15 for 15% Ethiopian VAT)', example: 0.15 })
  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @ApiPropertyOptional({ description: 'Automatically apply booking deposits to invoice balance', example: true, default: true })
  @IsOptional()
  @IsBoolean()
  applyDeposits?: boolean;

  @ApiPropertyOptional({ description: 'Flag whether withholding tax (2%) applies to this invoice', example: true })
  @IsOptional()
  @IsBoolean()
  whtApplicable?: boolean;

  @ApiPropertyOptional({ description: 'Withholding tax rate (defaults to 0.02 for 2%)', example: 0.02 })
  @IsOptional()
  @IsNumber()
  whtRate?: number;
}
