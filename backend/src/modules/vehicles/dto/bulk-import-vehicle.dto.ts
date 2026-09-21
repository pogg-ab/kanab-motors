import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkImportRowDto {
  chassisNumber: string;
  engineNumber: string;
  itemCode?: string; // or itemId
  warehouseName?: string;
  productionImportInfo?: string;
}

export class BulkImportVehicleDto {
  @ApiProperty({ example: '1' })
  @IsNotEmpty()
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
    type: 'array',
    example: [
      { chassisNumber: 'CHS-1001', engineNumber: 'ENG-1001' },
      { chassisNumber: 'CHS-1002', engineNumber: 'ENG-1002' },
    ],
  })
  units: {
    chassisNumber: string;
    engineNumber: string;
    productionImportInfo?: string;
  }[];
}
