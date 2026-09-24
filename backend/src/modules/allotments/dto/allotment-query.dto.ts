import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AllotmentStatus } from '../entities/allotment.entity';

export class AllotmentQueryDto {
  @ApiPropertyOptional({ enum: AllotmentStatus })
  @IsOptional()
  @IsEnum(AllotmentStatus)
  status?: AllotmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  limit?: number;
}
