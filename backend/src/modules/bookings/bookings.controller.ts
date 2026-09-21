import {
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
  convertFromEnquiry(@Param('enquiryId') enquiryId: string) {
    return this.bookingsService.convertFromEnquiry(enquiryId);
  }

  @Get()
  @ApiOperation({ summary: 'List and filter bookings' })
  findAll(@Query() query: BookingQueryDto) {
    return this.bookingsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking detail' })
  findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel booking with deposit reversal (Story B8)' })
  cancelBooking(
    @Param('id') id: string,
    @Body()
    body: {
      reason: string;
      routeTo?: 'CUSTOMER_CREDIT' | 'REFUNDABLE';
    },
  ) {
    return this.bookingsService.cancelBooking(id, body.reason, body.routeTo);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer deposited funds between bookings of same customer (Story B9)' })
  transferFunds(
    @Body()
    body: {
      sourceBookingId: string;
      targetBookingId: string;
      amount: number;
    },
  ) {
    return this.bookingsService.transferBetweenBookings(
      body.sourceBookingId,
      body.targetBookingId,
      body.amount,
    );
  }
}
