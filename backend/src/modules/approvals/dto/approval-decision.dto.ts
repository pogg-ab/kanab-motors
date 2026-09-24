import { IsNotEmpty, IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApprovalDecisionDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED'], example: 'APPROVED' })
  @IsIn(['APPROVED', 'REJECTED'])
  @IsNotEmpty()
  decision: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ example: 'Verified financial settlement and compliance. Approved.' })
  @IsOptional()
  @IsString()
  comments?: string;
}
