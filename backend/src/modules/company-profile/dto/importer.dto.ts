import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateCompanyImporterDto {
  @ApiProperty({ description: 'Importer division or license name', example: 'KANAB Motors PLC (Commercial Division)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  importerName: string;

  @ApiProperty({ description: 'Importer Exporter Code (IEC Number)', example: 'ETH-IEC-882103' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  iecNo: string;

  @ApiProperty({ description: 'Authorized Dealer Code (AD Code)', example: 'AD-BOA-0045192' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  adCode: string;

  @ApiPropertyOptional({ description: 'Operational notes / import license scope' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether this importer is the corporate default', default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Active status', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateCompanyImporterDto extends PartialType(CreateCompanyImporterDto) {}
