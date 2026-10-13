import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  Min,
  IsArray,
} from 'class-validator';

export class CompatibilityEntryDto {
  @IsNotEmpty()
  @IsString()
  vehicleModel: string;

  @IsOptional()
  @IsString()
  vehicleMake?: string;

  @IsOptional()
  @IsNumber()
  yearFrom?: number;

  @IsOptional()
  @IsNumber()
  yearTo?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateSparePartDto {
  @IsNotEmpty()
  @IsString()
  itemCode: string;

  @IsNotEmpty()
  @IsString()
  itemName: string;

  @IsNotEmpty()
  @IsNumber()
  categoryId: number;

  @IsOptional()
  @IsNumber()
  brandId?: number;

  @IsOptional()
  @IsString()
  partNumber?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  compatibleMake?: string;

  @IsOptional()
  @IsString()
  compatibleModel?: string;

  @IsNotEmpty()
  @IsNumber()
  uomId: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @IsOptional()
  @IsNumber()
  taxConfigId?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderLevel?: number;

  @IsOptional()
  @IsNumber()
  preferredSupplierId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  compatibilities?: CompatibilityEntryDto[];
}
