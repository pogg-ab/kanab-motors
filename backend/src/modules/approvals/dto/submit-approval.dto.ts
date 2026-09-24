import { IsNotEmpty, IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitApprovalDto {
  @ApiProperty({ example: 'SALES_INVOICE' })
  @IsString()
  @IsNotEmpty()
  workflowTypeCode: string;

  @ApiProperty({ example: 'SALES_INVOICE' })
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  entityId: string | number;
}
