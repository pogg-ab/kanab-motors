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
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Advance Order & Booking Management (KMSICAMS-2)')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @RequirePermissions('BOOKINGS_CREATE')
  @Post()
  @ApiOperation({ summary: 'Create new Booking directly' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreateBookingDto) {
    return this.bookingsService.create(dto);
  }

  @RequirePermissions('BOOKINGS_CREATE')
  @Post('convert-enquiry/:enquiryId')
  @ApiOperation({ summary: 'Convert approved Sales Enquiry into Booking (Story B2)' })
  convertFromEnquiry(@Param('enquiryId', PositiveBigIntIdPipe) enquiryId: string) {
    return this.bookingsService.convertFromEnquiry(enquiryId);
  }

  @RequirePermissions('BOOKINGS_VIEW')
  @Get()
  @ApiOperation({ summary: 'List and filter bookings' })
  findAll(@Query() query: BookingQueryDto) {
    return this.bookingsService.findAll(query);
  }

  @RequirePermissions('BOOKINGS_VIEW')
  @Get(':id')
  @ApiOperation({ summary: 'Get booking detail' })
  findOne(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.bookingsService.findOne(id);
  }

  @RequirePermissions('BOOKINGS_CANCEL')
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel booking with deposit reversal (Story B8)' })
  cancelBooking(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body() body: CancelBookingDto,
  ) {
    return this.bookingsService.cancelBooking(id, body.reason, body.routeTo);
  }

  @RequirePermissions('BOOKINGS_TRANSFER_FUNDS')
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
