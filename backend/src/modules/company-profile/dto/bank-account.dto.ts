import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

const hasNonEmptyString = (_: unknown, value: unknown) =>
  value !== undefined && value !== null && String(value).trim() !== '';

export class CreateBankAccountDto {
  @IsString() @IsNotEmpty() @MaxLength(150)
  accountName: string;
  @IsString() @IsNotEmpty() @MaxLength(150)
  bankName: string;
  @IsString() @IsNotEmpty() @Matches(/^[A-Za-z0-9 -]{4,60}$/)
  accountNumber: string;
  @IsOptional() @IsString() @MaxLength(100)
  bankBranch?: string;
  @ValidateIf(hasNonEmptyString) @IsString() @Matches(/^[A-Za-z0-9-]{4,50}$/)
  ifscCode?: string;
  @ValidateIf(hasNonEmptyString) @IsString() @Matches(/^[A-Za-z0-9]{8}([A-Za-z0-9]{3})?$/)
  swiftCode?: string;
  @ValidateIf(hasNonEmptyString) @IsString() @Matches(/^[A-Z]{3}$/)
  currency?: string;
  @IsOptional() @IsBoolean()
  isDefault?: boolean;
  @IsOptional() @IsBoolean()
  isActive?: boolean;
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;
}

export class UpdateBankAccountDto extends PartialType(CreateBankAccountDto) {}

