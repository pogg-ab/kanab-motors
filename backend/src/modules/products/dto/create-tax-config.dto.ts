import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateTaxConfigDto {
  @ApiProperty({
    example: 'Zero VAT',
    description: 'Name of the tax tier/configuration',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 0,
    description: 'Tax rate percentage (e.g. 0 for Zero VAT, 15 for Standard VAT)',
  })
  @IsNumber()
  @Min(0)
  ratePct: number;
}
