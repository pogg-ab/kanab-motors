import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateCategoryDto {
  @ApiProperty({
    example: 'ELECTRIC_VEHICLE',
    description: 'Vehicle category name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
