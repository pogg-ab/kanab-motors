const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function run() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'A_b0941291766',
    database: process.env.DB_NAME || 'kanab_motors',
  });

  await client.connect();
  console.log('Connected to PostgreSQL database.');

  // 1. Update SALES_MANAGER: remove REPORTS_VIEW
  const salesManagerPerms = [
    'CUSTOMERS_VIEW', 'CUSTOMERS_CREATE', 'CUSTOMERS_EDIT',
    'PRODUCTS_VIEW', 'VEHICLES_VIEW',
    'SPARE_PARTS_VIEW', 'SPARE_PARTS_SALES_RECORD', 'SPARE_PARTS_SALES_CANCEL',
    'ENQUIRIES_VIEW', 'ENQUIRIES_CREATE', 'ENQUIRIES_APPROVE', 'ENQUIRIES_REJECT',
    'BOOKINGS_VIEW', 'BOOKINGS_CREATE', 'BOOKINGS_ALLOCATE', 'BOOKINGS_CANCEL', 'BOOKINGS_TRANSFER_FUNDS',
    'PAYMENTS_VIEW', 'PAYMENTS_RECORD', 'LEDGER_VIEW', 'EXCESS_VIEW', 'REFUNDS_VIEW', 'REFUNDS_CREATE'
  ];
  await client.query('UPDATE role SET permissions = $1 WHERE role_name = $2', [
    salesManagerPerms,
    'SALES_MANAGER',
  ]);
  console.log('Updated SALES_MANAGER permissions.');

  // 2. Update SALESPERSON: remove PAYMENTS_RECORD
  const salespersonPerms = [
    'CUSTOMERS_VIEW', 'CUSTOMERS_CREATE', 'CUSTOMERS_EDIT', 'CUSTOMERS_DOCS_UPLOAD',
    'PRODUCTS_VIEW', 'VEHICLES_VIEW',
    'SPARE_PARTS_VIEW', 'SPARE_PARTS_SALES_RECORD',
    'ENQUIRIES_VIEW', 'ENQUIRIES_CREATE',
    'BOOKINGS_VIEW', 'BOOKINGS_CREATE',
    'PAYMENTS_VIEW', 'LEDGER_VIEW'
  ];
  await client.query('UPDATE role SET permissions = $1 WHERE role_name = $2', [
    salespersonPerms,
    'SALESPERSON',
  ]);
  console.log('Updated SALESPERSON permissions.');

  // 3. Update PROCUREMENT: remove REPORTS_VIEW & REPORTS_EXPORT
  const procurementPerms = [
    'SUPPLIERS_VIEW', 'SUPPLIERS_CREATE', 'SUPPLIERS_EDIT',
    'PURCHASE_ORDERS_VIEW', 'PURCHASE_ORDERS_CREATE', 'PURCHASE_ORDERS_EDIT', 'PURCHASE_ORDERS_CONFIRM', 'PURCHASE_ORDERS_CANCEL',
    'SHIPMENTS_VIEW', 'SHIPMENTS_CREATE', 'SHIPMENTS_UPDATE_STAGE', 'SHIPMENTS_DOCS_UPLOAD',
    'LANDED_COST_VIEW', 'LANDED_COST_ADD_EXPENSE', 'LANDED_COST_ALLOCATE',
    'EXCHANGE_RATES_MANAGE'
  ];
  await client.query('UPDATE role SET permissions = $1 WHERE role_name = $2', [
    procurementPerms,
    'PROCUREMENT',
  ]);
  console.log('Updated PROCUREMENT permissions.');

  // 4. Update INVENTORY: ensure all stock intake & adjustment & transfer permissions are present
  const inventoryPerms = [
    'PRODUCTS_VIEW', 'PRODUCTS_CREATE', 'PRODUCTS_EDIT', 'PRODUCTS_CATEGORIES_MANAGE',
    'SPARE_PARTS_VIEW', 'SPARE_PARTS_CREATE', 'SPARE_PARTS_EDIT',
    'VEHICLES_VIEW', 'VEHICLES_CREATE', 'VEHICLES_BULK_IMPORT', 'VEHICLES_STATUS_UPDATE',
    'WAREHOUSES_MANAGE', 'SHIPMENTS_VIEW', 'SHIPMENTS_RECEIVE_STOCK',
    'STOCK_TRANSFERS_CREATE', 'STOCK_TRANSFERS_APPROVE', 'STOCK_TRANSFERS_COMPLETE',
    'STOCK_RECEIPTS_CREATE',
    'STOCK_ADJUSTMENTS_CREATE', 'STOCK_ADJUSTMENTS_APPROVE', 'PRODUCTION_RECEIPTS_CREATE'
  ];
  await client.query('UPDATE role SET permissions = $1 WHERE role_name = $2', [
    inventoryPerms,
    'INVENTORY',
  ]);
  console.log('Updated INVENTORY permissions.');

  // 5. Reset app_user.permissions to NULL so all users inherit dynamic role permissions
  const res = await client.query('UPDATE app_user SET permissions = NULL');
  console.log(`Reset permissions on ${res.rowCount} app_user records to NULL.`);

  // Verify
  const userCheck = await client.query('SELECT user_id, username, role_id, permissions FROM app_user');
  console.log('Users in DB:');
  console.table(userCheck.rows);

  await client.end();
  console.log('All migrations and sync operations completed successfully.');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
