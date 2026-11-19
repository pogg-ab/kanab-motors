import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InspectionOutcome } from '../entities/customer-vehicle-inspection.entity';

export class CompleteInspectionDto {
  @ApiProperty({ example: 'ACCEPTED', enum: InspectionOutcome, description: 'Inspection outcome: ACCEPTED (satisfied), REJECTED (not satisfied), PENDING_DECISION' })
  @IsEnum(InspectionOutcome, { message: 'Outcome must be ACCEPTED, REJECTED, or PENDING_DECISION' })
  @IsNotEmpty()
  outcome: InspectionOutcome;

  @ApiPropertyOptional({ example: 'Customer completed test drive and inspected chassis and battery. All checks passed.' })
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiPropertyOptional({ example: 'Vehicle passed all technical inspections' })
  @IsString()
  @IsOptional()
  outcomeReason?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  customerSignatureAck?: boolean;

  @ApiPropertyOptional({ example: 'Additional notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

