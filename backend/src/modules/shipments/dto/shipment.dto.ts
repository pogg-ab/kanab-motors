import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AllocationMethod, ShipmentStage } from '../entities/shipment.entity';

export const ALLOCATION_METHODS = ['BY_VALUE', 'BY_QUANTITY', 'BY_WEIGHT'] as const;

export class CreateShipmentLineDto {
  @Matches(/^[1-9]\d*$/)
  poLineId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  quantityShipped: number;
}

export class CreateShipmentDto {
  @IsOptional()
  @IsDateString()
  expectedArrivalDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  billOfLadingNumber?: string;

  @IsOptional()
  @IsIn(ALLOCATION_METHODS)
  allocationMethod?: AllocationMethod;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateShipmentLineDto)
  lines: CreateShipmentLineDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;
}

export class UpdateShipmentStageDto {
  @IsEnum(ShipmentStage)
  stage: ShipmentStage;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;
}

export class AddCostComponentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  costComponentTypeId: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsIn(['ETB', 'USD', 'EUR'])
  currency: 'ETB' | 'USD' | 'EUR';

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @IsPositive()
  exchangeRateToEtb?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;
}

export class AllocateLandedCostDto {
  @IsOptional()
  @IsIn(ALLOCATION_METHODS)
  allocationMethod?: AllocationMethod;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;
}

export class ReceiptVehicleDto {
  @IsString()
  @MaxLength(50)
  chassisNumber: string;

  @IsString()
  @MaxLength(50)
  engineNumber: string;
}

export class ReceiveShipmentLineDto {
  @Matches(/^[1-9]\d*$/)
  shipmentLineId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  quantityReceived: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  warehouseId?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiptVehicleDto)
  vehicles?: ReceiptVehicleDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiptVehicleDto)
  vehicleUnits?: ReceiptVehicleDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;
}

export class UpdateExchangeRateDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @IsPositive()
  rateToEtb: number;
}

export class UploadShipmentDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  documentType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;
}
