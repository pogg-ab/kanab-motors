import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { EnquiryStatus } from '../entities/sales-enquiry.entity';

export class UpdateEnquiryStatusDto {
  @IsEnum(EnquiryStatus)
  status: EnquiryStatus;

  @IsOptional()
  @IsString()
  @MinLength(2)
  rejectionReason?: string;
}
