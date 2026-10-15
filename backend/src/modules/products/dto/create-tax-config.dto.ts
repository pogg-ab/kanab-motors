import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min, IsOptional } from 'class-validator';

export class CreateTaxConfigDto {
  @ApiProperty({
    example: 'Zero VAT',
    description: 'Name of the tax tier/configuration',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 15,
    description: 'Tax rate percentage (e.g. 0 for Zero VAT, 15 for Standard VAT)',
  })
  @IsNumber()
  @Min(0)
  ratePct: number;

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

  @ApiPropertyOptional({ example: '15% Standard VAT applicable to all sales' })
  @IsString()
  @IsOptional()
  description?: string;
}
