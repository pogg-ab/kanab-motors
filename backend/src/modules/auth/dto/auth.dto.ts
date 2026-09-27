import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W]).{8,}$/;
export const PASSWORD_MESSAGE =
  'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number or special character.';

export class LoginDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsString()
  @MinLength(1)
  password: string;
}

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'Username can only contain alphanumeric characters, dots, underscores, and hyphens.',
  })
  username: string;

  @IsString()
  @MinLength(2)
  fullName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @Matches(PASSWORD_REGEX, {
    message: PASSWORD_MESSAGE,
  })
  password?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  roleId: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  permissions?: string[];

  @IsOptional()
  @IsBoolean()
  mustChangePassword?: boolean;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roleId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  permissions?: string[];

  @IsOptional()
  @IsString()
  @Matches(PASSWORD_REGEX, {
    message: PASSWORD_MESSAGE,
  })
  password?: string;

  @IsOptional()
  @IsBoolean()
  mustChangePassword?: boolean;
}

export class PermissionToggleDto {
  @IsString()
  moduleCode: string;

  @IsString()
  actionCode: string;

  @IsBoolean()
  granted: boolean;
}

export class UpdateRolePermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionToggleDto)
  permissions: PermissionToggleDto[];
}

export class CheckPermissionDto {
  @Type(() => Number)
  @IsInt()
  userId: number;

  @IsString()
  moduleCode: string;

  @IsString()
  actionCode: string;
}
