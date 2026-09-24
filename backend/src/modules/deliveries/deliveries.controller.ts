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
import { DeliveriesService } from './deliveries.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { CreatePdiInspectionDto } from './dto/create-pdi-inspection.dto';
import { PositiveBigIntIdPipe } from '../../common/pipes/positive-bigint-id.pipe';

@ApiTags('Delivery & Handover Management (KMSICAMS-6)')
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get('pdi/checklist')
  @ApiOperation({ summary: 'Get standard pre-delivery inspection (PDI) checklist items (Story DL4)' })
  getPdiChecklist() {
    return this.deliveriesService.getPdiChecklist();
  }

  @Post('pdi/inspection')
  @ApiOperation({ summary: 'Record PDI inspection results and advance vehicle to READY_FOR_DELIVERY (Story DL4)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  recordPdiInspection(@Body() dto: CreatePdiInspectionDto, @Query('userId') userId?: string) {
    return this.deliveriesService.recordPdiInspection(dto, Number(userId) || 1);
  }

  @Get('pdi/vehicle/:vehicleUnitId')
  @ApiOperation({ summary: 'Get PDI inspection history and results for a specific vehicle unit' })
  getVehiclePdi(@Param('vehicleUnitId', PositiveBigIntIdPipe) vehicleUnitId: string) {
    return this.deliveriesService.getVehiclePdi(vehicleUnitId);
  }

  @Post()
  @ApiOperation({ summary: 'Create delivery handover order with PDI & settlement validation (Stories DL1, DL3)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createDelivery(@Body() dto: CreateDeliveryDto, @Query('userId') userId?: string) {
    return this.deliveriesService.createDelivery(dto, Number(userId) || 1);
  }

  @Get()
  @ApiOperation({ summary: 'List all deliveries with status, vehicle, and booking' })
  findAll() {
    return this.deliveriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single delivery details' })
  findOne(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.deliveriesService.findOne(id);
  }

  @Patch(':id/authorize')
  @ApiOperation({ summary: 'Authorize delivery handover and transition vehicle to DELIVERED (Stories DL2, DL7)' })
  authorize(
    @Param('id', PositiveBigIntIdPipe) id: string,
    @Body('comments') comments?: string,
    @Query('userId') userId?: string,
  ) {
    return this.deliveriesService.authorize(id, Number(userId) || 1, comments);
  }

  @Get(':id/gate-pass')
  @ApiOperation({ summary: 'Generate structured gate pass / delivery note for exit and handover (Story DL5)' })
  generateGatePass(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.deliveriesService.generateGatePass(id);
  }
}
