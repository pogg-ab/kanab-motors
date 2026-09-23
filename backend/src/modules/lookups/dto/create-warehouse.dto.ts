import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWarehouseDto {
  @ApiProperty({
    example: 'Hawassa Distribution Hub',
    description: 'Name of the warehouse or assembly plant',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'Hawassa Industrial Park, Sidama',
    description: 'Physical location address or yard description',
  })
  @IsString()
  @IsOptional()
  location?: string;
}
