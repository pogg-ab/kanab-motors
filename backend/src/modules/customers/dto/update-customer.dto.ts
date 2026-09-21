import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerType } from '../entities/customer.entity';

export class UpdateCustomerDto {
  @ApiPropertyOptional({ enum: CustomerType })
  @IsEnum(CustomerType)
  @IsOptional()
  customerType?: CustomerType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  regionId?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  addressTown?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  mobileNumber?: string;

  @ApiPropertyOptional()
  @ValidateIf((o: UpdateCustomerDto) => o.customerType === CustomerType.DEALER || o.customerType === CustomerType.GOVERNMENT)
  @IsOptional()
  @IsString()
  tinNumber?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
