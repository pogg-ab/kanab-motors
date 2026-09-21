import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductItem } from './entities/product-item.entity';
import { ProductCategory } from './entities/product-category.entity';
import { Brand } from './entities/brand.entity';
import { UnitOfMeasure } from './entities/unit-of-measure.entity';
import { TaxConfiguration } from './entities/tax-configuration.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductItem,
      ProductCategory,
      Brand,
      UnitOfMeasure,
      TaxConfiguration,
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
