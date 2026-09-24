import { IsNotEmpty, IsArray, ValidateNested, IsBoolean, IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PdiItemResultDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  checklistItemId: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  passed: boolean;

  @ApiPropertyOptional({ example: 'Verified and clean' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePdiInspectionDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  vehicleUnitId: string | number;

  @ApiProperty({ type: [PdiItemResultDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PdiItemResultDto)
  results: PdiItemResultDto[];
}
