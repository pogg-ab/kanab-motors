import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExtendInspectionDto {
  @ApiProperty({ example: 60, description: 'Additional minutes granted for inspection' })
  @IsNumber()
  @Min(15)
  @IsNotEmpty()
  extensionMinutes: number;

  @ApiProperty({ example: 'Customer was delayed in traffic coming to the showroom; requested 1 extra hour' })
  @IsString()
  @IsNotEmpty({ message: 'Extension reason is mandatory' })
  extensionReason: string;
}

export class CancelInspectionDto {
  @ApiProperty({ example: 'Customer cancelled appointment due to unforeseen schedule conflict' })
  @IsString()
  @IsNotEmpty({ message: 'Cancellation reason is mandatory' })
  cancellationReason: string;
}

