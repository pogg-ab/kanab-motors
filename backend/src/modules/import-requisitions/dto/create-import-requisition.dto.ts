import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateImportRequisitionLineDto {
  @Matches(/^[1-9]\d*$/)
  itemId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1, { message: 'Quantity requested must be at least 1' })
  quantityRequested: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0, { message: 'Estimated unit price must be 0 or positive' })
  estimatedUnitPrice: number;

  @IsOptional()
  @IsString()
  technicalSpecification?: string;

  @IsOptional()
  @IsString()
  qualityRequirements?: string;

  @IsOptional()
  @IsString()
  intendedApplication?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateImportRequisitionDto {
  @IsOptional()
  @IsString()
  businessUnitId?: string;

  @IsOptional()
  @IsDateString()
  requestDate?: string;

  @IsOptional()
  @IsDateString()
  requiredDeliveryDate?: string;

  @IsOptional()
  @IsString()
  justification?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  estimatedBudget?: number;

  @IsString()
  @Matches(/^[A-Z]{3,10}$/)
  currency: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateImportRequisitionLineDto)
  lines: CreateImportRequisitionLineDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;
}

export class UpdateImportRequisitionDto extends CreateImportRequisitionDto {}

export class ConvertRequisitionToPODto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplierId: number;

  @IsOptional()
  @IsDateString()
  poDate?: string;

  @IsOptional()
  @IsString()
  incoterms?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  portOfLoading?: string;

  @IsOptional()
  @IsString()
  portOfDischarge?: string;

  @IsOptional()
  @IsString()
  modeOfShipment?: string;

  @IsOptional()
  @IsInt()
  bankAccountId?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

