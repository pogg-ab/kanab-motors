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
  @Type(() => String)
  @Matches(/^[1-9]\d*$/)
  sourceBookingId: string;

  @IsOptional()
  @Type(() => String)
  @Matches(/^[1-9]\d*$/)
  targetBookingId?: string;

  @IsOptional()
  @Type(() => String)
  @Matches(/^[1-9]\d*$/)
  destinationBookingId?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  justification?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
