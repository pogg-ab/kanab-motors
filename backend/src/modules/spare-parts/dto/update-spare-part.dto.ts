import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  Min,
  IsArray,
} from 'class-validator';
import { CompatibilityEntryDto } from './create-spare-part.dto';

export class UpdateSparePartDto {
  @IsOptional()
  @IsString()
  itemCode?: string;

  @IsOptional()
  @IsString()
  itemName?: string;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

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

  @IsOptional()
  @IsNumber()
  uomId?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

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
  @IsString()
  usageType?: string;

  @IsOptional()
  @IsArray()
  compatibilities?: CompatibilityEntryDto[];
}
