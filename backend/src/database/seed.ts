import { DataSource } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { Role } from '../modules/auth/entities/role.entity';
import { AppUser } from '../modules/auth/entities/app-user.entity';
import { Region } from '../modules/lookups/entities/region.entity';
import { Warehouse } from '../modules/lookups/entities/warehouse.entity';
import { ProductCategory } from '../modules/products/entities/product-category.entity';
import { Brand } from '../modules/products/entities/brand.entity';
import { UnitOfMeasure } from '../modules/products/entities/unit-of-measure.entity';
import { TaxConfiguration } from '../modules/products/entities/tax-configuration.entity';
import { ProductItem } from '../modules/products/entities/product-item.entity';
import { Customer, CustomerType } from '../modules/customers/entities/customer.entity';
import { VehicleUnit, VehicleStatus } from '../modules/vehicles/entities/vehicle-unit.entity';

import * as bcrypt from 'bcrypt';

export async function seedDatabase(dataSource?: DataSource) {
  const ds = dataSource || AppDataSource;
  if (!ds.isInitialized) {
    await ds.initialize();
  }

  console.log('Seeding reference and master data...');

  // 1. Roles and Default Permissions
  const roleRepo = ds.getRepository(Role);
  const roleDefinitions = [
    {
      name: 'ADMIN',
      description: 'Super Administrator with full master access',
      permissions: ['ALL_PERMISSIONS'],
    },
    {
      name: 'SALES_MANAGER',
      description: 'Sales Director & Lead: quotations, bookings & allocations',
      permissions: [
        'CUSTOMERS_VIEW', 'CUSTOMERS_CREATE', 'CUSTOMERS_EDIT',
        'PRODUCTS_VIEW', 'VEHICLES_VIEW',
        'ENQUIRIES_VIEW', 'ENQUIRIES_CREATE', 'ENQUIRIES_APPROVE', 'ENQUIRIES_REJECT',
        'BOOKINGS_VIEW', 'BOOKINGS_CREATE', 'BOOKINGS_ALLOCATE', 'BOOKINGS_CANCEL', 'BOOKINGS_TRANSFER_FUNDS',
        'PAYMENTS_VIEW', 'PAYMENTS_RECORD', 'LEDGER_VIEW', 'REPORTS_VIEW',
      ],
    },
    {
      name: 'SALESPERSON',
      description: 'Sales Representative: customer registrations, quotes & booking submissions',
      permissions: [
        'CUSTOMERS_VIEW', 'CUSTOMERS_CREATE', 'CUSTOMERS_EDIT', 'CUSTOMERS_DOCS_UPLOAD',
        'PRODUCTS_VIEW', 'VEHICLES_VIEW',
        'ENQUIRIES_VIEW', 'ENQUIRIES_CREATE',
        'BOOKINGS_VIEW', 'BOOKINGS_CREATE',
        'PAYMENTS_VIEW', 'PAYMENTS_RECORD', 'LEDGER_VIEW',
      ],
    },
    {
      name: 'FINANCE_MANAGER',
      description: 'Finance Director: SOA, approvals, ledger adjustments & refunds',
      permissions: [
        'CUSTOMERS_VIEW', 'CUSTOMERS_BANK_MANAGE',
        'PAYMENTS_VIEW', 'PAYMENTS_RECORD', 'PAYMENTS_CONFIRM', 'PAYMENTS_REJECT',
        'LEDGER_VIEW', 'LEDGER_ADJUST', 'LEDGER_EXPORT',
        'EXCESS_VIEW', 'EXCESS_ROUTE',
        'REFUNDS_VIEW', 'REFUNDS_CREATE', 'REFUNDS_REVIEW', 'REFUNDS_APPROVE', 'REFUNDS_PROCESS', 'REFUNDS_REJECT',
        'REPORTS_VIEW', 'REPORTS_EXPORT',
      ],
    },
    {
      name: 'FINANCE_OFFICER',
      description: 'Finance Officer: deposit slip verification & ledger inspections',
      permissions: [
        'CUSTOMERS_VIEW', 'PAYMENTS_VIEW', 'PAYMENTS_RECORD', 'PAYMENTS_CONFIRM',
        'LEDGER_VIEW', 'EXCESS_VIEW', 'REFUNDS_VIEW', 'REFUNDS_CREATE', 'REFUNDS_REVIEW',
      ],
    },
    {
      name: 'PROCUREMENT',
      description: 'Import & Supply Chain: POs, international shipments & landed costs',
      permissions: [
        'SUPPLIERS_VIEW', 'SUPPLIERS_CREATE', 'SUPPLIERS_EDIT',
        'PURCHASE_ORDERS_VIEW', 'PURCHASE_ORDERS_CREATE', 'PURCHASE_ORDERS_EDIT', 'PURCHASE_ORDERS_CONFIRM', 'PURCHASE_ORDERS_CANCEL',
        'SHIPMENTS_VIEW', 'SHIPMENTS_CREATE', 'SHIPMENTS_UPDATE_STAGE', 'SHIPMENTS_DOCS_UPLOAD',
        'LANDED_COST_VIEW', 'LANDED_COST_ADD_EXPENSE', 'LANDED_COST_ALLOCATE',
        'EXCHANGE_RATES_MANAGE', 'REPORTS_VIEW', 'REPORTS_EXPORT',
      ],
    },
    {
      name: 'INVENTORY',
      description: 'Inventory Lead: physical vehicle intake, chassis & VIN management',
      permissions: [
        'PRODUCTS_VIEW', 'PRODUCTS_CREATE', 'PRODUCTS_EDIT', 'PRODUCTS_CATEGORIES_MANAGE',
        'VEHICLES_VIEW', 'VEHICLES_CREATE', 'VEHICLES_BULK_IMPORT', 'VEHICLES_STATUS_UPDATE',
        'WAREHOUSES_MANAGE', 'SHIPMENTS_VIEW', 'SHIPMENTS_RECEIVE_STOCK',
      ],
    },
    {
      name: 'WAREHOUSE_MANAGER',
      description: 'Yard & Warehouse Manager: stock intake & vehicle storage tracking',
      permissions: [
        'PRODUCTS_VIEW', 'VEHICLES_VIEW', 'VEHICLES_CREATE', 'VEHICLES_STATUS_UPDATE',
        'WAREHOUSES_MANAGE', 'SHIPMENTS_VIEW', 'SHIPMENTS_RECEIVE_STOCK',
      ],
    },
    {
      name: 'APPROVER',
      description: 'Executive Approver: quotes, orders & refund disbursements',
      permissions: [
        'ENQUIRIES_VIEW', 'ENQUIRIES_APPROVE', 'BOOKINGS_VIEW',
        'REFUNDS_VIEW', 'REFUNDS_APPROVE', 'PURCHASE_ORDERS_VIEW', 'PURCHASE_ORDERS_CONFIRM',
      ],
    },
    {
      name: 'MANAGEMENT_USER',
      description: 'Executive / Auditor: read-only access to all dashboards and reports',
      permissions: [
        'REPORTS_VIEW', 'REPORTS_EXPORT', 'AUDIT_VIEW',
        'CUSTOMERS_VIEW', 'PRODUCTS_VIEW', 'VEHICLES_VIEW',
        'ENQUIRIES_VIEW', 'BOOKINGS_VIEW', 'PAYMENTS_VIEW', 'LEDGER_VIEW',
        'EXCESS_VIEW', 'REFUNDS_VIEW', 'SUPPLIERS_VIEW', 'PURCHASE_ORDERS_VIEW',
        'SHIPMENTS_VIEW', 'LANDED_COST_VIEW',
      ],
    },
  ];

  for (const r of roleDefinitions) {
    let role = await roleRepo.findOne({ where: { roleName: r.name } });
    if (!role) {
      role = roleRepo.create({
        roleName: r.name,
        description: r.description,
        permissions: r.permissions,
      });
    } else {
      role.description = r.description;
      role.permissions = r.permissions;
    }
    await roleRepo.save(role);
  }

  // 2. Demo Users
  const userRepo = ds.getRepository(AppUser);
  const demoUsers = [
    {
      username: 'admin',
      email: 'admin@kanabmotors.com',
      fullName: 'System Administrator',
      roleName: 'ADMIN',
      password: 'Admin@123',
    },
    {
      username: 'finance',
      email: 'finance@kanabmotors.com',
      fullName: 'Dawit Finance Director',
      roleName: 'FINANCE_MANAGER',
      password: 'Finance@123',
    },
    {
      username: 'procurement',
      email: 'procurement@kanabmotors.com',
      fullName: 'Tewodros Import Logistics',
      roleName: 'PROCUREMENT',
      password: 'Procure@123',
    },
    {
      username: 'inventory',
      email: 'inventory@kanabmotors.com',
      fullName: 'Kassahun Inventory Lead',
      roleName: 'INVENTORY',
      password: 'Inventory@123',
    },
    {
      username: 'sales',
      email: 'sales@kanabmotors.com',
      fullName: 'Selamawit Sales Director',
      roleName: 'SALES_MANAGER',
      password: 'Sales@123',
    },
  ];

  for (const u of demoUsers) {
    const targetRole = await roleRepo.findOne({ where: { roleName: u.roleName } });
    if (targetRole) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      const existing = await userRepo.findOne({
        where: [{ email: u.email }, { username: u.username }],
      });

      if (!existing) {
        await userRepo.save(
          userRepo.create({
            username: u.username,
            email: u.email,
            fullName: u.fullName,
            roleId: targetRole.roleId,
            passwordHash,
            isActive: true,
          }),
        );
      } else {
        existing.email = u.email;
        existing.fullName = u.fullName;
        existing.roleId = targetRole.roleId;
        existing.passwordHash = passwordHash;
        existing.isActive = true;
        await userRepo.save(existing);
      }
    }
  }

  // 3. Regions
  const regionRepo = ds.getRepository(Region);
  const regions = [
    'Addis Ababa',
    'Oromia',
    'Amhara',
    'Sidama',
    'Tigray',
    'Dire Dawa',
    'Somali',
    'South Ethiopia',
    'Central Ethiopia',
    'Afar',
  ];
  for (const reg of regions) {
    const existing = await regionRepo.findOne({ where: { regionName: reg } });
    if (!existing) {
      await regionRepo.save(regionRepo.create({ regionName: reg }));
    }
  }

  // 4. Warehouses
  const warehouseRepo = ds.getRepository(Warehouse);
  const warehouses = [
    { name: 'Kality Assembly Plant Warehouse', location: 'Kality Industrial Zone, Addis Ababa' },
    { name: 'Gotera Distribution Center', location: 'Gotera, Addis Ababa' },
    { name: 'Dire Dawa Branch Warehouse', location: 'Dire Dawa City' },
  ];
  for (const w of warehouses) {
    const existing = await warehouseRepo.findOne({ where: { warehouseName: w.name } });
    if (!existing) {
      await warehouseRepo.save(
        warehouseRepo.create({
          warehouseName: w.name,
          location: w.location,
          isActive: true,
        }),
      );
    }
  }

  // 5. Product Categories
  const categoryRepo = ds.getRepository(ProductCategory);
  const categories = ['MOTORCYCLE', 'THREE_WHEELER', 'IMPORTED_VEHICLE'];
  for (const c of categories) {
    const existing = await categoryRepo.findOne({ where: { categoryName: c } });
    if (!existing) {
      await categoryRepo.save(categoryRepo.create({ categoryName: c }));
    }
  }

  // 6. Brands
  const brandRepo = ds.getRepository(Brand);
  const brands = ['Bajaj', 'TVS', 'Lifan', 'Yamaha', 'Haojue'];
  for (const b of brands) {
    const existing = await brandRepo.findOne({ where: { brandName: b } });
    if (!existing) {
      await brandRepo.save(brandRepo.create({ brandName: b }));
    }
  }

  // 7. Unit of Measure
  const uomRepo = ds.getRepository(UnitOfMeasure);
  const uoms = ['UNIT', 'SET', 'PIECE'];
  for (const u of uoms) {
    const existing = await uomRepo.findOne({ where: { uomName: u } });
    if (!existing) {
      await uomRepo.save(uomRepo.create({ uomName: u }));
    }
  }

  // 8. Tax Configuration
  const taxRepo = ds.getRepository(TaxConfiguration);
  const defaultTax = await taxRepo.findOne({ where: { taxName: 'Standard VAT 15%' } });
  let vat15 = defaultTax;
  if (!defaultTax) {
    vat15 = await taxRepo.save(
      taxRepo.create({
        taxName: 'Standard VAT 15%',
        taxRatePct: 15.0,
        isActive: true,
      }),
    );
  }

  // 9. Initial Sample Items
  const itemRepo = ds.getRepository(ProductItem);
  const catMotorcycle = await categoryRepo.findOne({ where: { categoryName: 'MOTORCYCLE' } });
  const catThreeWheeler = await categoryRepo.findOne({ where: { categoryName: 'THREE_WHEELER' } });
  const brandBajaj = await brandRepo.findOne({ where: { brandName: 'Bajaj' } });
  const brandTvs = await brandRepo.findOne({ where: { brandName: 'TVS' } });
  const unitUom = await uomRepo.findOne({ where: { uomName: 'UNIT' } });

  const sampleItems = [
    {
      itemCode: 'KB-MC-BOXER150',
      itemName: 'Bajaj Boxer BM 150 Motorcycle',
      categoryId: catMotorcycle?.categoryId,
      brandId: brandBajaj?.brandId,
      model: 'Boxer BM 150',
      uomId: unitUom?.uomId,
      sellingPrice: 185000.0,
      taxConfigId: vat15?.taxConfigId,
      reorderLevel: 10,
    },
    {
      itemCode: 'KB-3W-MAXIMA-Z',
      itemName: 'Bajaj Maxima Z Three-Wheeler',
      categoryId: catThreeWheeler?.categoryId,
      brandId: brandBajaj?.brandId,
      model: 'Maxima Z Cargo/Pax',
      uomId: unitUom?.uomId,
      sellingPrice: 320000.0,
      taxConfigId: vat15?.taxConfigId,
      reorderLevel: 5,
    },
    {
      itemCode: 'KB-3W-TVS-KING',
      itemName: 'TVS King Deluxe Three-Wheeler',
      categoryId: catThreeWheeler?.categoryId,
      brandId: brandTvs?.brandId,
      model: 'King Deluxe 200cc',
      uomId: unitUom?.uomId,
      sellingPrice: 310000.0,
      taxConfigId: vat15?.taxConfigId,
      reorderLevel: 5,
    },
  ];

  for (const item of sampleItems) {
    if (item.categoryId && item.uomId) {
      const existing = await itemRepo.findOne({ where: { itemCode: item.itemCode } });
      if (!existing) {
        await itemRepo.save(itemRepo.create(item as any));
      }
    }
  }

  // 10. Sample Customer
  const customerRepo = ds.getRepository(Customer);
  const addisRegion = await regionRepo.findOne({ where: { regionName: 'Addis Ababa' } });
  const sampleCustMobile = '+251911223344';
  const existingCust = await customerRepo.findOne({ where: { mobileNumber: sampleCustMobile } });
  if (!existingCust) {
    const cust = customerRepo.create({
      customerType: CustomerType.DIRECT_POS,
      fullName: 'Abebe Bikila Transport & Logistics',
      regionId: addisRegion?.regionId,
      addressTown: 'Bole Subcity, Woreda 03',
      mobileNumber: sampleCustMobile,
      tinNumber: '0012345678',
      isActive: true,
    });
    await customerRepo.save(cust);
  }

  console.log('Master data seeded successfully!');
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}
