import { IsOptional, IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInspectionDto {
  @ApiPropertyOptional({ example: '120', default: 120, description: 'Inspection allowed duration in minutes (e.g. 60, 120, 180, 240)' })
  @IsNumber()
  @Min(15)
  @IsOptional()
  allowedDurationMinutes?: number = 120;

  @ApiPropertyOptional({ example: 120, description: 'Inspection duration in minutes alias' })
  @IsNumber()
  @Min(15)
  @IsOptional()
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 'Senior Technical Inspector', description: 'Assigned inspector name' })
  @IsString()
  @IsOptional()
  inspectorName?: string;

  @ApiPropertyOptional({ example: '1', description: 'Specific vehicle unit ID if reserved/held for inspection' })
  @IsString()
  @IsOptional()
  vehicleUnitId?: string;

  @ApiPropertyOptional({ example: 'Bajaj RE 4S Auto Rickshaw Petrol' })
  @IsString()
  @IsOptional()
  vehicleModel?: string;

  @ApiPropertyOptional({ example: 'ENG-2026-88741' })
  @IsString()
  @IsOptional()
  engineNumber?: string;

  @ApiPropertyOptional({ example: 'MD2A12AY6PW109823' })
  @IsString()
  @IsOptional()
  vinChassisNumber?: string;

  @ApiPropertyOptional({ example: 'Customer requested physical pre-purchase inspection with mechanic' })
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiPropertyOptional({ example: 'Pre-check inspection notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

