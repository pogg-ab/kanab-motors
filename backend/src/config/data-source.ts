import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'kanab_motors',
  synchronize: false, // Keep false to prevent PostgreSQL enum dependency collisions
  migrationsRun: true, // Automatically executes all pending migrations on npm run start:dev (no manual npm run migration needed)
  logging: process.env.NODE_ENV === 'development',
  entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '../database/migrations/*{.ts,.js}')],
  subscribers: [path.join(__dirname, '../**/*.subscriber{.ts,.js}')],
});

