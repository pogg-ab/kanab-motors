import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class RouteExcessDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsIn(['CUSTOMER_CREDIT', 'REFUNDABLE', 'TRANSFER_TO_CREDIT', 'TRANSFER_TO_REFUNDABLE'])
  routeTo?: 'CUSTOMER_CREDIT' | 'REFUNDABLE' | 'TRANSFER_TO_CREDIT' | 'TRANSFER_TO_REFUNDABLE';

  @IsOptional()
  @IsIn(['CUSTOMER_CREDIT', 'REFUNDABLE', 'TRANSFER_TO_CREDIT', 'TRANSFER_TO_REFUNDABLE'])
  action?: 'CUSTOMER_CREDIT' | 'REFUNDABLE' | 'TRANSFER_TO_CREDIT' | 'TRANSFER_TO_REFUNDABLE';

  @IsOptional()
  @IsString()
  notes?: string;
}
