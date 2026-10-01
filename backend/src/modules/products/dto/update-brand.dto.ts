import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateBrandDto {
  @ApiProperty({
    example: 'Hero MotoCorp',
    description: 'Vehicle brand name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
