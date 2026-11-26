import { IsNotEmpty, IsString, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExtendInspectionDto {
  @ApiPropertyOptional({ example: 60, description: 'Additional minutes granted for inspection' })
  @IsNumber()
  @Min(15)
  @IsOptional()
  extensionMinutes?: number;

  @ApiPropertyOptional({ example: 60, description: 'Additional minutes alias' })
  @IsNumber()
  @Min(15)
  @IsOptional()
  additionalMinutes?: number;

  @ApiPropertyOptional({ example: 'Customer was delayed in traffic coming to the showroom; requested 1 extra hour' })
  @IsString()
  @IsOptional()
  extensionReason?: string;

  @ApiPropertyOptional({ example: 'Customer was delayed in traffic' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class CancelInspectionDto {
  @ApiProperty({ example: 'Customer cancelled appointment due to unforeseen schedule conflict' })
  @IsString()
  @IsNotEmpty({ message: 'Cancellation reason is mandatory' })
  cancellationReason: string;
}

