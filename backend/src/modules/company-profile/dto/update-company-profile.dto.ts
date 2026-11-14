import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const hasNonEmptyString = (_: unknown, value: unknown) =>
  value !== undefined && value !== null && String(value).trim() !== '';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateCompanyProfileDto {
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'Registered Company Name is required' })
  @MaxLength(200)
  companyName?: string;

  @IsOptional() @Transform(trimString) @IsString() @MaxLength(255)
  tradeName?: string;

  @IsOptional() @IsString()
  logo?: string;

  @IsOptional() @Transform(trimString) @IsString() @MaxLength(100)
  registrationNo?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'TIN (Tax Identification No.) is required' })
  @MaxLength(100)
  tin?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty({ message: 'TIN (Tax Identification No.) is required' })
  @MaxLength(100)
  taxId?: string;

  @IsOptional() @Transform(trimString) @IsString() @MaxLength(100)
  vatRegistrationNo?: string;

  @IsOptional() @Transform(trimString) @IsString() @MaxLength(1000)
  address?: string;

  @IsOptional() @Transform(trimString) @IsString() @MaxLength(100)
  city?: string;

  @IsOptional() @Transform(trimString) @IsString() @MaxLength(100)
  country?: string;

  @ValidateIf(hasNonEmptyString)
  @Transform(trimString)
  @IsString()
  @Matches(/^\+?[0-9\s\-()]{7,25}$/, {
    message: 'Official Phone must include a country code and valid phone digits (7–15 digits)',
  })
  @MaxLength(50)
  phone?: string;

  @ValidateIf(hasNonEmptyString)
  @Transform(trimString)
  @IsEmail({}, { message: 'Official Email must be a valid email address' })
  email?: string;

  @ValidateIf(hasNonEmptyString)
  @Transform(trimString)
  @IsUrl({ require_protocol: true }, { message: 'Website must be a valid URL starting with http:// or https://' })
  website?: string;

  @ValidateIf(hasNonEmptyString)
  @Transform(trimString)
  @IsString()
  @Matches(/^[A-Za-z0-9\-/]{3,50}$/, {
    message: 'Importer IEC No. must be 3–50 characters (letters, numbers, - or /)',
  })
  @MaxLength(100)
  importerIecNo?: string;

  @ValidateIf(hasNonEmptyString)
  @Transform(trimString)
  @IsString()
  @Matches(/^[A-Za-z0-9\-/]{3,50}$/, {
    message: 'Importer IEC No. must be 3–50 characters (letters, numbers, - or /)',
  })
  @MaxLength(100)
  iecNo?: string;

  @ValidateIf(hasNonEmptyString)
  @Transform(trimString)
  @IsString()
  @Matches(/^[A-Za-z0-9\-/]{3,50}$/, {
    message: 'Importer AD Code must be 3–50 characters (letters, numbers, - or /)',
  })
  @MaxLength(100)
  importerAdCode?: string;

  @ValidateIf(hasNonEmptyString)
  @Transform(trimString)
  @IsString()
  @Matches(/^[A-Za-z0-9\-/]{3,50}$/, {
    message: 'Importer AD Code must be 3–50 characters (letters, numbers, - or /)',
  })
  @MaxLength(100)
  adCode?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

