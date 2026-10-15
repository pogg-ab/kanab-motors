import { IsNotEmpty, IsOptional, IsNumber, Min, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordWhtSettlementDto {
  @ApiProperty({ description: 'Tax withheld at source amount (ETB)', example: 4000.00 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  whtAmount: number;

  @ApiPropertyOptional({ description: 'Customer Withholding Tax Certificate Number', example: '01243' })
  @IsOptional()
  @IsString()
  certificateNumber?: string;

  @ApiPropertyOptional({ description: 'Withholding Certificate Date', example: '2026-10-15' })
  @IsOptional()
  @IsString()
  certificateDate?: string;

  @ApiPropertyOptional({ description: 'Finance / Audit Notes', example: 'Tax withheld at source by withholding agent customer' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateWhtCertificateDto {
  @ApiPropertyOptional({ description: 'Customer Withholding Tax Certificate Number', example: '01243' })
  @IsOptional()
  @IsString()
  certificateNumber?: string;

  @ApiPropertyOptional({ description: 'Withholding Certificate Date', example: '2026-10-15' })
  @IsOptional()
  @IsString()
  certificateDate?: string;

  @ApiPropertyOptional({ description: 'Certificate status: PENDING_CERTIFICATE | CERTIFICATE_RECEIVED | CLAIMED', example: 'CERTIFICATE_RECEIVED' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Notes', example: 'Certificate verified and claimed against corporate tax' })
  @IsOptional()
  @IsString()
  notes?: string;
}
