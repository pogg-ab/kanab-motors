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
import { AllotmentsService } from './allotments.service';
import { CreateAllotmentDto } from './dto/create-allotment.dto';
import { AllotmentQueryDto } from './dto/allotment-query.dto';
import { RejectAllotmentDto } from './dto/reject-allotment.dto';
import { PositiveBigIntIdPipe } from '../../common/pipes/positive-bigint-id.pipe';

@ApiTags('Vehicle Allotment Management (KMSICAMS-5)')
@Controller('allotments')
export class AllotmentsController {
  constructor(private readonly allotmentsService: AllotmentsService) {}

  @Get('eligible-bookings')
  @ApiOperation({ summary: 'List approved bookings eligible for vehicle allotment (Stories BK1 & BK2)' })
  findEligibleBookings() {
    return this.allotmentsService.findEligibleBookings();
  }

  @Get('available-vehicles')
  @ApiOperation({ summary: 'List vehicles in AVAILABLE_FOR_SALE or RESERVED status matching item (Stories IN1 & AL4)' })
  findAvailableVehicles(@Query('itemId') itemId?: string) {
    return this.allotmentsService.findAvailableUnits(itemId);
  }

  @Post()
  @ApiOperation({ summary: 'Create Allotment Request (Stories AL1, AL2, AL3, P1, P2)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreateAllotmentDto) {
    return this.allotmentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List and filter allotments' })
  findAll(@Query() query: AllotmentQueryDto) {
    return this.allotmentsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single allotment details with vehicle units & lines' })
  findOne(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.allotmentsService.findOne(id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve allotment & transition vehicle units to ALLOTTED (Stories AP1, IN2, P3)' })
  approve(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.allotmentsService.approve(id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject allotment request (Story AP1)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  reject(@Param('id', PositiveBigIntIdPipe) id: string, @Body() dto: RejectAllotmentDto) {
    return this.allotmentsService.reject(id, dto.reason);
  }

  @Patch(':id/reverse')
  @ApiOperation({ summary: 'Un-allot / Reverse approved allotment back to AVAILABLE_FOR_SALE (Story IN3)' })
  reverse(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.allotmentsService.reverse(id);
  }
}
