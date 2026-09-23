import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingQueryDto } from './dto/booking-query.dto';
import { PositiveBigIntIdPipe } from '../../common/pipes/positive-bigint-id.pipe';
import { CancelBookingDto, TransferBookingFundsDto } from './dto/booking-action.dto';

@ApiTags('Advance Order & Booking Management (KMSICAMS-2)')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create new Booking directly' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreateBookingDto) {
    return this.bookingsService.create(dto);
  }

  @Post('convert-enquiry/:enquiryId')
  @ApiOperation({ summary: 'Convert approved Sales Enquiry into Booking (Story B2)' })
  convertFromEnquiry(@Param('enquiryId', PositiveBigIntIdPipe) enquiryId: string) {
    return this.bookingsService.convertFromEnquiry(enquiryId);
  }

  @Get()
  @ApiOperation({ summary: 'List and filter bookings' })
  findAll(@Query() query: BookingQueryDto) {
    return this.bookingsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking detail' })
  findOne(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel booking with deposit reversal (Story B8)' })
  cancelBooking(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() body: CancelBookingDto,
  ) {
    return this.bookingsService.cancelBooking(id, body.reason, body.routeTo);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer deposited funds between bookings of same customer (Story B9)' })
  transferFunds(@Body() body: TransferBookingFundsDto) {
    const targetId = body.targetBookingId || body.destinationBookingId;
    if (!targetId) {
      throw new BadRequestException('targetBookingId or destinationBookingId is required');
    }

    return this.bookingsService.transferBetweenBookings(
      body.sourceBookingId,
      targetId,
      body.amount,
    );
  }
}
