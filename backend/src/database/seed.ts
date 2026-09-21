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

export async function seedDatabase() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  console.log('Seeding reference and master data...');

  // 1. Roles
  const roleRepo = AppDataSource.getRepository(Role);
  const roles = [
    'ADMIN',
    'SALESPERSON',
    'SALES_MANAGER',
    'FINANCE_OFFICER',
    'FINANCE_MANAGER',
    'WAREHOUSE_MANAGER',
    'APPROVER',
    'MANAGEMENT_USER',
  ];
  for (const r of roles) {
    const existing = await roleRepo.findOne({ where: { roleName: r } });
    if (!existing) {
      await roleRepo.save(roleRepo.create({ roleName: r }));
    }
  }

  // 2. Users
  const userRepo = AppDataSource.getRepository(AppUser);
  const adminRole = await roleRepo.findOne({ where: { roleName: 'ADMIN' } });
  if (adminRole) {
    const existingAdmin = await userRepo.findOne({ where: { username: 'admin' } });
    if (!existingAdmin) {
      await userRepo.save(
        userRepo.create({
          username: 'admin',
          fullName: 'System Administrator',
          roleId: adminRole.roleId,
          isActive: true,
        }),
      );
    }
  }

  // 3. Regions
  const regionRepo = AppDataSource.getRepository(Region);
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
  const warehouseRepo = AppDataSource.getRepository(Warehouse);
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
  const categoryRepo = AppDataSource.getRepository(ProductCategory);
  const categories = ['MOTORCYCLE', 'THREE_WHEELER', 'IMPORTED_VEHICLE'];
  for (const c of categories) {
    const existing = await categoryRepo.findOne({ where: { categoryName: c } });
    if (!existing) {
      await categoryRepo.save(categoryRepo.create({ categoryName: c }));
    }
  }

  // 6. Brands
  const brandRepo = AppDataSource.getRepository(Brand);
  const brands = ['Bajaj', 'TVS', 'Lifan', 'Yamaha', 'Haojue'];
  for (const b of brands) {
    const existing = await brandRepo.findOne({ where: { brandName: b } });
    if (!existing) {
      await brandRepo.save(brandRepo.create({ brandName: b }));
    }
  }

  // 7. Unit of Measure
  const uomRepo = AppDataSource.getRepository(UnitOfMeasure);
  const uoms = ['UNIT', 'SET', 'PIECE'];
  for (const u of uoms) {
    const existing = await uomRepo.findOne({ where: { uomName: u } });
    if (!existing) {
      await uomRepo.save(uomRepo.create({ uomName: u }));
    }
  }

  // 8. Tax Configuration
  const taxRepo = AppDataSource.getRepository(TaxConfiguration);
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
  const itemRepo = AppDataSource.getRepository(ProductItem);
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
  const customerRepo = AppDataSource.getRepository(Customer);
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
