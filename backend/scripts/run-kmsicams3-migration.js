const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'A_b0941291766',
    database: 'kanab_motors',
  });

  await client.connect();
  console.log('Connected to PostgreSQL kanab_motors.');

  const sqlPath = path.resolve(__dirname, '../../kanab_motors_schema_import_landed_cost.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Executing kanab_motors_schema_import_landed_cost.sql...');
  await client.query(sql);
  console.log('SQL schema applied successfully!');

  // Also record in TypeORM migrations table
  const migrationName = 'KMSICAMS3ImportLandedCost1710200000000';
  const timestamp = 1710200000000;
  
  await client.query(
    `INSERT INTO migrations (timestamp, name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [timestamp, migrationName]
  );
  console.log(`Recorded ${migrationName} in migrations table.`);

  await client.end();
}

run().catch((err) => {
  console.error('Error running migration:', err);
  process.exit(1);
});
