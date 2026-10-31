import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EnquiryApprovalDto {
  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  approved?: boolean = true;

  @ApiPropertyOptional({ example: 'Vehicle specifications, lead source and budget verified.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'Customer budget insufficient for requested model.' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

