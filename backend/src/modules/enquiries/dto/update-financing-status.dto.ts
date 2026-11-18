import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFinancingStatusDto {
  @ApiProperty({ example: 'APPROVED', description: 'NOT_SUBMITTED | SUBMITTED | UNDER_REVIEW | APPROVED | REJECTED | DISBURSED' })
  @IsString()
  @IsNotEmpty()
  financingStatus: string;

  @ApiPropertyOptional({ example: 'AWB-APP-2026-9901' })
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

  @ApiPropertyOptional({ example: 'Financing officially approved by branch credit committee' })
  @IsString()
  @IsOptional()
  financingNotes?: string;
}

