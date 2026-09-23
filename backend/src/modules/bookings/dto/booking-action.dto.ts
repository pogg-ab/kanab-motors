import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';

export class CancelBookingDto {
  @IsString()
  @MinLength(2)
  reason: string;

  @IsOptional()
  @IsIn(['CUSTOMER_CREDIT', 'REFUNDABLE'])
  routeTo?: 'CUSTOMER_CREDIT' | 'REFUNDABLE';
}

export class TransferBookingFundsDto {
  @Matches(/^[1-9]\d*$/)
  sourceBookingId: string;

  @Matches(/^[1-9]\d*$/)
  targetBookingId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;
}
