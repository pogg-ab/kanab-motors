import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductItem } from '../products/entities/product-item.entity';
import { ProductCategory } from '../products/entities/product-category.entity';
import { Brand } from '../products/entities/brand.entity';
import { UnitOfMeasure } from '../products/entities/unit-of-measure.entity';
import { TaxConfiguration } from '../products/entities/tax-configuration.entity';
import { SparePartVehicleCompatibility } from '../products/entities/spare-part-vehicle-compatibility.entity';
import { SparePartsSale } from '../products/entities/spare-parts-sale.entity';
import { SparePartsSaleItem } from '../products/entities/spare-parts-sale-item.entity';
import { StockBalance } from '../inventory/entities/stock-balance.entity';
import { Warehouse } from '../lookups/entities/warehouse.entity';
import { Customer } from '../customers/entities/customer.entity';
import { AuditModule } from '../audit/audit.module';
import { SparePartsService } from './spare-parts.service';
import { SparePartsController } from './spare-parts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductItem,
      ProductCategory,
      Brand,
      UnitOfMeasure,
      TaxConfiguration,
      SparePartVehicleCompatibility,
      SparePartsSale,
      SparePartsSaleItem,
      StockBalance,
      Warehouse,
      Customer,
    ]),
    AuditModule,
  ],
  controllers: [SparePartsController],
  providers: [SparePartsService],
  exports: [SparePartsService],
})
export class SparePartsModule {}
