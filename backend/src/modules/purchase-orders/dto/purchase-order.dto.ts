import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { POStatus } from '../entities/purchase-order.entity';

export class CreatePOLineDto {
  @Matches(/^[1-9]\d*$/)
  itemId: string;

  @Type(() => Number)
  @IsInt({ message: 'Quantity ordered must be a whole positive integer' })
  @Min(1, { message: 'Quantity ordered must be at least 1' })
  quantityOrdered: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01, { message: 'Unit price must be greater than 0' })
  unitPrice: number;

  @IsOptional()
  @IsString()
  hsnSacCode?: string;

  @IsOptional()
  @IsString()
  uom?: string;

  @IsOptional()
  @IsString()
  itemDescription?: string;
}

export class CreatePODto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplierId: number;

  @IsOptional()
  @IsDateString()
  poDate?: string;

  @IsString()
  @Matches(/^[A-Z]{3,10}$/)
  currency: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePOLineDto)
  lines: CreatePOLineDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  requisitionId?: string;

  @IsOptional()
  @IsString()
  incoterms?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  countryOfOrigin?: string;

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
  @IsString()
  packingRequirements?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  deliveryLeadTimeDays?: number;

  @IsOptional()
  @IsString()
  leadTimeTrigger?: string;

  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @IsOptional()
  @IsString()
  proformaInvoiceNo?: string;

  @IsOptional()
  @IsDateString()
  proformaInvoiceDate?: string;

  @IsOptional()
  @IsString()
  contractReference?: string;

  @IsOptional()
  @IsString()
  inspectionRequirements?: string;

  @IsOptional()
  @IsString()
  warrantyTerms?: string;

  @IsOptional()
  @IsString()
  commercialRemarks?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bankAccountId?: number;

  @IsOptional()
  @IsString()
  amountInWords?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;
}

export class UpdatePODto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplierId?: number;

  @IsOptional()
  @IsDateString()
  poDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3,10}$/)
  currency?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePOLineDto)
  lines?: CreatePOLineDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  requisitionId?: string;

  @IsOptional()
  @IsString()
  incoterms?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  countryOfOrigin?: string;

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
  @IsString()
  packingRequirements?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  deliveryLeadTimeDays?: number;

  @IsOptional()
  @IsString()
  leadTimeTrigger?: string;

  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @IsOptional()
  @IsString()
  proformaInvoiceNo?: string;

  @IsOptional()
  @IsDateString()
  proformaInvoiceDate?: string;

  @IsOptional()
  @IsString()
  contractReference?: string;

  @IsOptional()
  @IsString()
  inspectionRequirements?: string;

  @IsOptional()
  @IsString()
  warrantyTerms?: string;

  @IsOptional()
  @IsString()
  commercialRemarks?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bankAccountId?: number;

  @IsOptional()
  @IsString()
  amountInWords?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;
}

export class UpdatePOStatusDto {
  @IsEnum(POStatus)
  status: POStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;
}

// Compliance Record DTO
export class CreateComplianceRecordDto {
  @Matches(/^[1-9]\d*$/)
  poId: string;

  @IsOptional()
  @Matches(/^[1-9]\d*$/)
  shipmentId?: string;

  @IsString()
  requirementType: string;

  @IsString()
  issuingAuthority: string;

  @IsOptional()
  @IsString()
  applicationReference?: string;

  @IsOptional()
  @IsString()
  documentReference?: string;

  @IsOptional()
  @IsDateString()
  applicationDate?: string;

  @IsOptional()
  @IsDateString()
  submissionDate?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;
}

// Payment Schedule DTO
export class CreatePaymentScheduleDto {
  @Matches(/^[1-9]\d*$/)
  poId: string;

  @IsString()
  milestoneName: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amountDue: number;

  @IsString()
  @Matches(/^[A-Z]{3,10}$/)
  currency: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;
}

// Payment Transaction DTO
export class RecordPaymentTransactionDto {
  @Matches(/^[1-9]\d*$/)
  paymentScheduleId: string;

  @IsString()
  paymentReference: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amountPaid: number;

  @IsString()
  @Matches(/^[A-Z]{3,10}$/)
  currency: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;
}

// Letter of Credit DTO
export class CreateLetterOfCreditDto {
  @Matches(/^[1-9]\d*$/)
  poId: string;

  @IsString()
  lcNumber: string;

  @IsString()
  issuingBank: string;

  @IsOptional()
  @IsString()
  advisingBank?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsString()
  @Matches(/^[A-Z]{3,10}$/)
  currency: string;

  @IsDateString()
  issueDate: string;

  @IsDateString()
  expiryDate: string;

  @IsOptional()
  @IsDateString()
  latestShipmentDate?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  documentaryRequirements?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;
}
