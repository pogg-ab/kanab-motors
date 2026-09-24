import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectAllotmentDto {
  @ApiProperty({ description: 'Mandatory reason for rejecting the allotment request', example: 'Vehicle model specification mismatch with booking' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3, { message: 'Rejection reason must be at least 3 characters long' })
  reason: string;
}
