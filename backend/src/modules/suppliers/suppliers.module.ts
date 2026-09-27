import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from './entities/supplier.entity';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { PermissionGuard } from '../../common/guards/permission.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Supplier])],
  providers: [SuppliersService, PermissionGuard],
  controllers: [SuppliersController],
  exports: [SuppliersService],
})
export class SuppliersModule {}
