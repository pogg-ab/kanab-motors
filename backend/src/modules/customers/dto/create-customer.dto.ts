import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  ValidateIf,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerType } from '../entities/customer.entity';

export class CreateBankAccountDto {
  @ApiProperty({ example: 'Commercial Bank of Ethiopia' })
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @ApiProperty({ example: '1000123456789' })
  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @ApiProperty({ example: 'Abebe Bikila' })
  @IsString()
  @IsNotEmpty()
  accountHolderName: string;

  @ApiPropertyOptional({ example: 'Bole Medhanealem Branch' })
  @IsString()
  @IsOptional()
  branch?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  isPrimary?: boolean;
}

export class CreateCustomerDto {
  @ApiProperty({ enum: CustomerType, example: CustomerType.DEALER })
  @IsEnum(CustomerType, {
    message: 'customerType must be DIRECT_POS, DEALER, or GOVERNMENT',
  })
  @IsNotEmpty()
  customerType: CustomerType;

  @ApiProperty({ example: 'Abebe Motors Enterprise' })
  @IsString()
  @IsNotEmpty({ message: 'Full name / Organization name is required' })
  fullName: string;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  regionId?: number;

  @ApiPropertyOptional({ example: 'Bole Subcity, Woreda 03' })
  @IsString()
  @IsOptional()
  addressTown?: string;

  @ApiProperty({ example: '+251911223344' })
  @IsString()
  @IsNotEmpty({ message: 'Mobile number is required' })
  mobileNumber: string;

  // Conditional validation rule: TIN is mandatory for DEALER and GOVERNMENT
  @ApiPropertyOptional({ example: '0012345678' })
  @ValidateIf((o: CreateCustomerDto) => o.customerType === CustomerType.DEALER || o.customerType === CustomerType.GOVERNMENT)
  @IsNotEmpty({ message: 'TIN Number is mandatory for Dealer and Government customers' })
  @IsString()
  tinNumber?: string;

  @ApiPropertyOptional({ type: [CreateBankAccountDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateBankAccountDto)
  bankAccounts?: CreateBankAccountDto[];
}
