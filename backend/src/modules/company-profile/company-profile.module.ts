import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyProfile } from '../purchase-orders/entities/company-profile.entity';
import { CompanyBankAccount } from '../purchase-orders/entities/company-bank-account.entity';
import { PurchaseOrder } from '../purchase-orders/entities/purchase-order.entity';
import { CompanyImporter } from './entities/company-importer.entity';
import { CompanyProfileService } from './company-profile.service';
import { CompanyProfileController } from './company-profile.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompanyProfile, CompanyBankAccount, PurchaseOrder, CompanyImporter]),
  ],
  controllers: [CompanyProfileController],
  providers: [CompanyProfileService],
  exports: [CompanyProfileService],
})
export class CompanyProfileModule {}

