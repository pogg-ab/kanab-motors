import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsPositive,
  IsOptional,
  IsBoolean,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEnquiryDto {
  @ApiProperty({ example: '1' })
  @IsNotEmpty({ message: 'Customer ID is required' })
  customerId: string;

  @ApiProperty({ example: '1' })
  @IsNotEmpty({ message: 'Item ID (Model) is required' })
  itemId: string;

  @ApiProperty({ example: 1, default: 1 })
  @IsNumber()
  @Min(1)
  quantity: number = 1;

  @ApiPropertyOptional({ example: 185000.0 })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  unitPrice?: number;

  @ApiProperty({ example: 'Yared Tadesse' })
  @IsString()
  @IsNotEmpty({ message: 'Salesperson full name is mandatory' })
  @MinLength(2, { message: 'Salesperson full name must be at least 2 characters' })
  salespersonName: string;

  @ApiPropertyOptional({ example: 'BANK_DEPOSIT', default: 'BANK_DEPOSIT' })
  @IsString()
  @IsOptional()
  paymentMode?: string;

  // KMSI-14-11: Enquiry Details
  @ApiPropertyOptional({ example: 'WALK_IN' })
  @IsString()
  @IsOptional()
  leadSource?: string;

  @ApiPropertyOptional({ example: 'Bole Flagship Showroom' })
  @IsString()
  @IsOptional()
  branchShowroom?: string;

  // KMSI-14-12: Vehicle Requirements
  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  vehicleCategoryId?: number;

  @ApiPropertyOptional({ example: 'Midnight Blue' })
  @IsString()
  @IsOptional()
  preferredColor?: string;

  @ApiPropertyOptional({ example: '2026-12-15' })
  @IsString()
  @IsOptional()
  requiredDeliveryDate?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  registrationHomologationNeeded?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  chargerTypeIncluded?: boolean;

  // KMSI-14-13: Budget and Payment Preferences
  @ApiPropertyOptional({ example: 3500000.0 })
  @IsNumber()
  @IsOptional()
  targetBudget?: number;

  @ApiPropertyOptional({ example: 'ETB', default: 'ETB' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  financingRequired?: boolean;

  @ApiPropertyOptional({ example: 1000000.0 })
  @IsNumber()
  @IsOptional()
  expectedDeposit?: number;

  @ApiPropertyOptional({ example: 'Within 30 days of allocation' })
  @IsString()
  @IsOptional()
  expectedPaymentTimeline?: string;

  @ApiPropertyOptional({ example: 'Commercial Bank of Ethiopia' })
  @IsString()
  @IsOptional()
  financeProvider?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  tradeInVehicle?: boolean;

  // KMSI-14-14: Customer Requirements and Notes
  @ApiPropertyOptional({ example: 'Customer requires fast-charger installation support at residential garage.' })
  @IsString()
  @IsOptional()
  customerRequirementsNotes?: string;

  // KMSI-14-15: Initial Status (DRAFT vs SUBMITTED)
  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isDraft?: boolean;

  // --- Commission Agent Tracking (Client Demo Feedback New Story 1) ---
  @ApiPropertyOptional({ example: 'Alazar Tesfaye' })
  @IsString()
  @IsOptional()
  commissionAgentName?: string;

  @ApiPropertyOptional({ example: '+251-911-234567' })
  @IsString()
  @IsOptional()
  commissionAgentPhone?: string;

  @ApiPropertyOptional({ example: 3.5 })
  @IsNumber()
  @IsOptional()
  commissionPercentage?: number;

  @ApiPropertyOptional({ example: 8750.0 })
  @IsNumber()
  @IsOptional()
  commissionAmount?: number;

  @ApiPropertyOptional({ example: 'Agreed 3% commission on delivery' })
  @IsString()
  @IsOptional()
  commissionNotes?: string;

  // --- Financing Institution Tracking (Client Demo Feedback New Story 3) ---
  @ApiPropertyOptional({ example: 'BANK_FINANCING', default: 'CASH' })
  @IsString()
  @IsOptional()
  financingOption?: string; // 'CASH' | 'BANK_FINANCING' | 'MICROFINANCE_FINANCING'

  @ApiPropertyOptional({ example: 'BANK' })
  @IsString()
  @IsOptional()
  financingType?: string; // 'BANK' | 'MICROFINANCE'

  @ApiPropertyOptional({ example: 'Awash Bank S.C.' })
  @IsString()
  @IsOptional()
  financingInstitutionName?: string;

  @ApiPropertyOptional({ example: 'Tewodros Kassahun' })
  @IsString()
  @IsOptional()
  financingContactPerson?: string;

  @ApiPropertyOptional({ example: '+251-912-345678' })
  @IsString()
  @IsOptional()
  financingContactPhone?: string;

  @ApiPropertyOptional({ example: 70.0 })
  @IsNumber()
  @IsOptional()
  financingPercentage?: number;

  @ApiPropertyOptional({ example: 175000.0 })
  @IsNumber()
  @IsOptional()
  financingAmount?: number;

  @ApiPropertyOptional({ example: 30.0 })
  @IsNumber()
  @IsOptional()
  customerContributionPercentage?: number;

  @ApiPropertyOptional({ example: 75000.0 })
  @IsNumber()
  @IsOptional()
  customerContributionAmount?: number;

  @ApiPropertyOptional({ example: 'NOT_SUBMITTED' })
  @IsString()
  @IsOptional()
  financingStatus?: string;

  @ApiPropertyOptional({ example: 'AWB-2026-0981' })
  @IsString()
  @IsOptional()
  financingApplicationNumber?: string;

  @ApiPropertyOptional({ example: '2026-11-20' })
  @IsString()
  @IsOptional()
  financingSubmissionDate?: string;

  @ApiPropertyOptional({ example: '2026-11-25' })
  @IsString()
  @IsOptional()
  financingApprovalDate?: string;

  @ApiPropertyOptional({ example: 175000.0 })
  @IsNumber()
  @IsOptional()
  financingApprovedAmount?: number;

  @ApiPropertyOptional({ example: 175000.0 })
  @IsNumber()
  @IsOptional()
  financingDisbursedAmount?: number;

  @ApiPropertyOptional({ example: '2026-11-28' })
  @IsString()
  @IsOptional()
  financingDisbursementDate?: string;

  @ApiPropertyOptional({ example: 'Approved under special commercial transport financing package.' })
  @IsString()
  @IsOptional()
  financingNotes?: string;
}
