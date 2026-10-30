import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  IsIn,
} from 'class-validator';

// -------------------------------------------------------------
// IMP-23: Freight Forwarder DTOs
// -------------------------------------------------------------
export class CreateFreightForwarderDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsString()
  @MaxLength(100)
  country: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactPerson?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFreightForwarderDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactPerson?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// -------------------------------------------------------------
// IMP-24 & IMP-25: Freight Quotation DTOs
// -------------------------------------------------------------
export class CreateFreightQuotationDto {
  @IsString()
  freightForwarderId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  quotationReference?: string;

  @IsOptional()
  @IsDateString()
  quotationDate?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  freightAmount: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  estimatedTransitDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  destinationCharges?: number;

  @IsOptional()
  @IsString()
  additionalTerms?: string;

  @IsOptional()
  @IsString()
  attachmentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;
}

export class SelectFreightQuotationDto {
  @IsString()
  selectionReason: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;
}

// -------------------------------------------------------------
// IMP-26: Shipment Booking & Vessel Details
// -------------------------------------------------------------
export class CreateShipmentBookingDto {
  @IsOptional()
  @IsString()
  freightForwarderId?: string;

  @IsString()
  @MaxLength(100)
  bookingReference: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  carrierName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  vesselName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  voyageNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  originPort?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  destinationPort?: string;

  @IsOptional()
  @IsDateString()
  estimatedDepartureDate?: string;

  @IsOptional()
  @IsDateString()
  actualDepartureDate?: string;

  @IsOptional()
  @IsDateString()
  estimatedArrivalDate?: string;

  @IsOptional()
  @IsDateString()
  actualArrivalDate?: string;

  @IsOptional()
  @IsIn(['REQUESTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'])
  bookingStatus?: 'REQUESTED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;
}

// -------------------------------------------------------------
// IMP-27: Shipment Container DTOs
// -------------------------------------------------------------
export class CreateShipmentContainerDto {
  @IsString()
  @MaxLength(50)
  containerNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  containerType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  payloadCapacityKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  grossWeightKg?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sealNumber?: string;

  @IsOptional()
  @IsDateString()
  loadingDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  freeTimeDays?: number;

  @IsOptional()
  @IsDateString()
  freeTimeEndDate?: string;

  @IsOptional()
  @IsDateString()
  emptyReturnDueDate?: string;

  @IsOptional()
  @IsIn(['LOADED', 'IN_TRANSIT', 'DISCHARGED', 'AT_PORT', 'DELIVERED', 'RETURNED'])
  containerStatus?: 'LOADED' | 'IN_TRANSIT' | 'DISCHARGED' | 'AT_PORT' | 'DELIVERED' | 'RETURNED';

  @IsOptional()
  @IsString()
  notes?: string;
}

// -------------------------------------------------------------
// IMP-28: Shipping Milestones DTOs
// -------------------------------------------------------------
export class CreateShipmentMilestoneDto {
  @IsString()
  @MaxLength(100)
  milestoneName: string;

  @IsOptional()
  @IsDateString()
  plannedDate?: string;

  @IsOptional()
  @IsDateString()
  milestoneDate?: string;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;
}

// -------------------------------------------------------------
// IMP-29: Shipment Insurance DTOs
// -------------------------------------------------------------
export class CreateShipmentInsuranceDto {
  @IsString()
  @MaxLength(100)
  policyNumber: string;

  @IsString()
  @MaxLength(150)
  insurerName: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  insuredValue: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  premiumAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  coverageType?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// -------------------------------------------------------------
// IMP-30: Cargo Tracking & ECTN DTOs
// -------------------------------------------------------------
export class CreateCargoTrackingDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @IsOptional()
  @IsIn(['PENDING', 'SUBMITTED', 'APPROVED', 'EXPIRED'])
  status?: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'EXPIRED';

  @IsOptional()
  @IsDateString()
  submissionDate?: string;

  @IsOptional()
  @IsDateString()
  deadlineDate?: string;

  @IsOptional()
  @IsDateString()
  shippingCutOffDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// -------------------------------------------------------------
// IMP-32 through IMP-37: Shipping Document DTOs
// -------------------------------------------------------------
export class CreateShipmentDocumentDto {
  @IsOptional()
  @IsString()
  poId?: string;

  @IsOptional()
  @IsString()
  attachmentId?: string;

  @IsString()
  @MaxLength(60)
  documentType: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentReference?: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsDateString()
  receivedDate?: string;

  @IsOptional()
  @IsIn(['PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED'])
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

  @IsOptional()
  @IsIn(['NOT_RECEIVED', 'RECEIVED', 'ENDORSED_TO_BANK', 'RELEASED_TO_AGENT', 'SURRENDERED'])
  originalDocumentStatus?: 'NOT_RECEIVED' | 'RECEIVED' | 'ENDORSED_TO_BANK' | 'RELEASED_TO_AGENT' | 'SURRENDERED';

  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @IsOptional()
  @IsString()
  verificationNotes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;
}

export class VerifyShipmentDocumentDto {
  @IsIn(['VERIFIED', 'REJECTED'])
  status: 'VERIFIED' | 'REJECTED';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;
}

export class UpdateOriginalDocumentStatusDto {
  @IsIn(['NOT_RECEIVED', 'RECEIVED', 'ENDORSED_TO_BANK', 'RELEASED_TO_AGENT', 'SURRENDERED'])
  status: 'NOT_RECEIVED' | 'RECEIVED' | 'ENDORSED_TO_BANK' | 'RELEASED_TO_AGENT' | 'SURRENDERED';

  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;
}

