import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  ValidateIf,
  Matches,
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
  @Matches(/^(\+251[79]\d{8}|0[79]\d{8}|\+[1-9]\d{6,14})$/, {
    message: 'Invalid mobile number format. Please enter a valid mobile number with country code (e.g. +251911223344, +12025550199, or local 09XXXXXXXX).',
  })
  mobileNumber?: string;

  @ApiPropertyOptional()
  @ValidateIf((o: UpdateCustomerDto) => o.customerType === CustomerType.DEALER || o.customerType === CustomerType.GOVERNMENT || (!!o.tinNumber && o.tinNumber.trim() !== ''))
  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, {
    message: 'Invalid TIN number format. TIN must be exactly 10 numeric digits (e.g. 0012345678).',
  })
  tinNumber?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  withholdingTaxFlag?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
