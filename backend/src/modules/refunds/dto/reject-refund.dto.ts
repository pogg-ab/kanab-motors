import { IsString, MinLength } from 'class-validator';

export class RejectRefundDto {
  @IsString()
  @MinLength(2)
  reason: string;
}
