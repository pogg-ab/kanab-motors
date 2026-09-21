import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Region } from './entities/region.entity';
import { Warehouse } from './entities/warehouse.entity';
import { LookupsService } from './lookups.service';
import { LookupsController } from './lookups.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Region, Warehouse])],
  controllers: [LookupsController],
  providers: [LookupsService],
  exports: [LookupsService],
})
export class LookupsModule {}
