import { IsString, MinLength } from 'class-validator';

export class RejectPaymentDto {
  @IsString()
  @MinLength(2)
  reason: string;
}
