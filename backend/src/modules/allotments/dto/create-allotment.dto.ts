import { IsArray, IsNotEmpty, IsOptional, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAllotmentDto {
  @ApiProperty({ description: 'ID of the confirmed booking requiring vehicle allotment', example: '1' })
  @IsNotEmpty()
  @IsString()
  bookingId: string;

  @ApiProperty({
    description: 'Array of vehicle_unit_id strings to allot to this booking',
    example: ['1', '2'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one vehicle unit must be selected for allotment' })
  @IsString({ each: true })
  vehicleUnitIds: string[];

  @ApiProperty({ description: 'Optional operational notes for the allotment request', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
