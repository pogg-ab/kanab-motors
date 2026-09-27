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
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Vehicle Allotment Management (KMSICAMS-5)')
@Controller('allotments')
export class AllotmentsController {
  constructor(private readonly allotmentsService: AllotmentsService) {}

  @RequirePermissions('BOOKINGS_ALLOCATE')
  @Get('eligible-bookings')
  @ApiOperation({ summary: 'List approved bookings eligible for vehicle allotment (Stories BK1 & BK2)' })
  findEligibleBookings() {
    return this.allotmentsService.findEligibleBookings();
  }

  @RequirePermissions('BOOKINGS_ALLOCATE')
  @Get('available-vehicles')
  @ApiOperation({ summary: 'List vehicles in AVAILABLE_FOR_SALE or RESERVED status matching item (Stories IN1 & AL4)' })
  findAvailableVehicles(@Query('itemId') itemId?: string) {
    return this.allotmentsService.findAvailableUnits(itemId);
  }

  @RequirePermissions('BOOKINGS_ALLOCATE')
  @Post()
  @ApiOperation({ summary: 'Create Allotment Request (Stories AL1, AL2, AL3, P1, P2)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreateAllotmentDto) {
    return this.allotmentsService.create(dto);
  }

  @RequirePermissions('BOOKINGS_ALLOCATE')
  @Get()
  @ApiOperation({ summary: 'List and filter allotments' })
  findAll(@Query() query: AllotmentQueryDto) {
    return this.allotmentsService.findAll(query);
  }

  @RequirePermissions('BOOKINGS_ALLOCATE')
  @Get(':id')
  @ApiOperation({ summary: 'Get single allotment details with vehicle units & lines' })
  findOne(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.allotmentsService.findOne(id);
  }

  @RequirePermissions('BOOKINGS_ALLOCATE')
  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve allotment & transition vehicle units to ALLOTTED (Stories AP1, IN2, P3)' })
  approve(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.allotmentsService.approve(id);
  }

  @RequirePermissions('BOOKINGS_ALLOCATE')
  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject allotment request (Story AP1)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  reject(@Param('id', PositiveBigIntIdPipe) id: string, @Body() dto: RejectAllotmentDto) {
    return this.allotmentsService.reject(id, dto.reason);
  }

  @RequirePermissions('BOOKINGS_ALLOCATE')
  @Patch(':id/reverse')
  @ApiOperation({ summary: 'Un-allot / Reverse approved allotment back to AVAILABLE_FOR_SALE (Story IN3)' })
  reverse(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.allotmentsService.reverse(id);
  }
}
