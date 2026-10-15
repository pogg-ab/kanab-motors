import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateTaxConfigDto {
  @ApiPropertyOptional({
    example: 'Zero VAT',
    description: 'Name of the tax tier/configuration',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 15,
    description: 'Tax rate percentage',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  ratePct?: number;

  @ApiPropertyOptional({ example: 'VAT', enum: ['VAT', 'EXCISE', 'WHT'] })
  @IsString()
  @IsOptional()
  taxType?: string;

  @ApiPropertyOptional({ example: 'ALL' })
  @IsString()
  @IsOptional()
  applicableCustomerType?: string;

  @ApiPropertyOptional({ example: 'ALL' })
  @IsString()
  @IsOptional()
  applicableVehicleType?: string;

  @ApiPropertyOptional({ example: 'Tax description notes' })
  @IsString()
  @IsOptional()
  description?: string;
}
