import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkImportRowDto {
  @ApiProperty({ example: 'CHS-1001' })
  @IsString()
  @IsNotEmpty({ message: 'Chassis number is required' })
  chassisNumber: string;

  @ApiProperty({ example: 'ENG-1001' })
  @IsString()
  @IsNotEmpty({ message: 'Engine number is required' })
  engineNumber: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  itemCode?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  warehouseName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  productionImportInfo?: string;
}

export class BulkImportVehicleDto {
  @ApiProperty({ example: '1' })
  @IsNotEmpty({ message: 'Item ID is required' })
  itemId: string;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  currentWarehouseId?: number;

  @ApiPropertyOptional({ example: 'Batch import from Container MSKU771234' })
  @IsString()
  @IsOptional()
  productionImportInfo?: string;

  @ApiProperty({
    type: [BulkImportRowDto],
    example: [
      { chassisNumber: 'CHS-1001', engineNumber: 'ENG-1001' },
      { chassisNumber: 'CHS-1002', engineNumber: 'ENG-1002' },
    ],
  })
  @IsArray({ message: 'Units must be an array' })
  @ValidateNested({ each: true })
  @Type(() => BulkImportRowDto)
  units: BulkImportRowDto[];
}

