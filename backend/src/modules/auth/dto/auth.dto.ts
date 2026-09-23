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
} from 'class-validator';
import { Type } from 'class-transformer';

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
  username: string;

  @IsString()
  @MinLength(2)
  fullName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
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
  @MinLength(6)
  password?: string;
}
