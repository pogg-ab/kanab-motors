import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import { seedDatabase } from './database/seed';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function ensureSequences() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'kanab_motors',
  });

  try {
    await client.connect();
    const sequences = [
      'customer_code_seq',
      'enquiry_number_seq',
      'booking_number_seq',
      'receipt_number_seq',
      'refund_number_seq',
      'po_number_seq',
      'shipment_number_seq',
    ];
    for (const seq of sequences) {
      await client.query(`CREATE SEQUENCE IF NOT EXISTS ${seq} START 1;`);
    }
  } catch (err) {
    console.warn('⚠️ Sequence initialization note:', (err as any)?.message || err);
  } finally {
    await client.end().catch(() => {});
  }
}

async function bootstrap() {
  await ensureSequences();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Auto-seed reference and initial master data on startup
  try {
    const dataSource = app.get(DataSource);
    console.log('🌱 Checking and applying seed data...');
    await seedDatabase(dataSource);
  } catch (error) {
    console.error('⚠️ Seeding warning:', error);
  }

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Serve uploaded files statically
  const uploadsPath = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
  });
  app.useStaticAssets(uploadsPath, {
    prefix: '/api/uploads/',
  });

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('KANAB Motors - Sales, Inventory & Customer Management API')
    .setDescription(
      'REST APIs for KMSICAMS-1: Module 1 (Customer & Dealer Management) and Module 2 (Product & Vehicle Master Data)',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 KANAB Motors Backend running on: http://localhost:${port}/api`);
  console.log(`📚 Swagger API Documentation available at: http://localhost:${port}/api/docs`);
}
bootstrap();
