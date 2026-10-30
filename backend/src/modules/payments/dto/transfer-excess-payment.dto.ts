import { IsNotEmpty, IsNumber, IsPositive, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferExcessPaymentDto {
  @ApiProperty({ example: '1', description: 'Source booking ID that holds excess payments' })
  @IsNotEmpty({ message: 'Source booking ID is required' })
  sourceBookingId: string;

  @ApiProperty({ example: '2', description: 'Destination booking ID to receive the funds' })
  @IsNotEmpty({ message: 'Destination booking ID is required' })
  destinationBookingId: string;

  @ApiProperty({ example: '2', description: 'Destination customer ID owning destination booking' })
  @IsNotEmpty({ message: 'Destination customer ID is required' })
  destinationCustomerId: string;

  @ApiProperty({ example: 50000.0, description: 'Amount to transfer' })
  @IsNumber()
  @IsPositive({ message: 'Transfer amount must be greater than zero' })
  transferAmount: number;

  @ApiProperty({ example: 'Customer authorization letter received transferring funds to sister company booking.' })
  @IsString()
  @IsNotEmpty({ message: 'Transfer reason is required' })
  @MinLength(5, { message: 'Transfer reason must be at least 5 characters' })
  transferReason: string;

  @ApiProperty({ example: 'AUTH-2026-TR-001', required: false })
  @IsString()
  authorizationReference?: string;
}
