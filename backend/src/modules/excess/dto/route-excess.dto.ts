import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class RouteExcessDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsIn(['CUSTOMER_CREDIT', 'REFUNDABLE'])
  routeTo: 'CUSTOMER_CREDIT' | 'REFUNDABLE';

  @IsOptional()
  @IsString()
  @MinLength(2)
  notes?: string;
}
