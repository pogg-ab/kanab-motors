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

  @ApiPropertyOptional({ description: 'VAT rate alias (e.g. 0.15)', example: 0.15 })
  @IsOptional()
  @IsNumber()
  vatRate?: number;

  @ApiPropertyOptional({ description: 'Excise tax rate (e.g. 0.05 for 5% Three-Wheeler, 0.10 for 10% Motorcycle)', example: 0.05 })
  @IsOptional()
  @IsNumber()
  exciseRate?: number;

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

  @ApiPropertyOptional({ description: 'Exempt VAT on this invoice', example: false })
  @IsOptional()
  @IsBoolean()
  isVatExempt?: boolean;

  @ApiPropertyOptional({ description: 'Exempt Excise tax on this invoice', example: false })
  @IsOptional()
  @IsBoolean()
  isExciseExempt?: boolean;

  @ApiPropertyOptional({ description: 'Exempt Withholding tax on this invoice', example: false })
  @IsOptional()
  @IsBoolean()
  isWhtExempt?: boolean;

  @ApiPropertyOptional({ description: 'Tax calculation base rule', example: 'VEHICLE_PRICE' })
  @IsOptional()
  calculationBase?: string;

  @ApiPropertyOptional({ description: 'Audit reason for tax override or exemption' })
  @IsOptional()
  taxOverrideReason?: string;
}
