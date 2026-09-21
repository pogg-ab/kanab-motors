import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from './config/data-source';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { LookupsModule } from './modules/lookups/lookups.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ProductsModule } from './modules/products/products.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { EnquiriesModule } from './modules/enquiries/enquiries.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ExcessModule } from './modules/excess/excess.module';
import { RefundsModule } from './modules/refunds/refunds.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { ShipmentsModule } from './modules/shipments/shipments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      ...AppDataSource.options,
      autoLoadEntities: true,
    }),
    AuditModule,
    AuthModule,
    LookupsModule,
    CustomersModule,
    ProductsModule,
    VehiclesModule,
    LedgerModule,
    EnquiriesModule,
    BookingsModule,
    PaymentsModule,
    ExcessModule,
    RefundsModule,
    SuppliersModule,
    PurchaseOrdersModule,
    ShipmentsModule,
  ],
})
export class AppModule {}
