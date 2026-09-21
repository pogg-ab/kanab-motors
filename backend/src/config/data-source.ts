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
  synchronize: true, // Auto-sync entities with database schema
  logging: process.env.NODE_ENV === 'development',
  entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [],
  subscribers: [path.join(__dirname, '../**/*.subscriber{.ts,.js}')],
});
