import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SparePartSaleLineItemDto {
  @IsNotEmpty()
  @IsString()
  itemId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercent?: number;

  @IsOptional()
  @IsNumber()
  vatPercent?: number;
}

export class CreateSparePartsSaleDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsNotEmpty()
  @IsString()
  customerName: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerType?: string; // 'DIRECT_POS', 'DEALER', 'GOVERNMENT', 'WALK_IN'

  @IsNotEmpty()
  @IsNumber()
  warehouseId: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string; // 'CASH', 'BANK_TRANSFER', 'CHEQUE', 'CUSTOMER_CREDIT'

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SparePartSaleLineItemDto)
  items: SparePartSaleLineItemDto[];
}
