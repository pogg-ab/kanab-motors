# KANAB Motors — Integrated Sales, Inventory and Customer Account Management System (KMSICAMS)

> **Jira Ticket KMSICAMS-1:** Modules (1) Customer & Dealer Management · (2) Product & Vehicle Master Data  
> **Tech Stack:** NestJS + TypeScript, PostgreSQL, TypeORM Migrations, React + TypeScript (Vite).

---

## 🏗️ Architecture & Modules Overview

### Module 1: Customer and Dealer Management (SRS §8.2)
- **Customer Profiles:** Tracks `customer_code` (auto-sequenced `CUST-000001`), `fullName`, `customerType` (`DIRECT_POS`, `DEALER`, `GOVERNMENT`), `mobileNumber`, `tinNumber`, `regionId`, `addressTown`, and audit timestamps.
- **Conditional TIN Validation (SRS §7.1 & Story 1.2):**
  - Mandatory for `DEALER` and `GOVERNMENT` accounts.
  - Optional for `DIRECT_POS`.
  - Enforced on both backend (PostgreSQL CHECK constraint + NestJS validation) and interactive frontend.
- **Duplicate Detection (Story 1.3):** System-wide uniqueness checks on Mobile Number and TIN.
- **Banking Information (Story 1.7):** Sub-entity for bank account details (bank name, account number, holder name, branch) used for future settlement and refund payouts.
- **Supporting Documents (Story 1.8):** File upload dropzone for IDs, trade licenses, and TIN certificates.
- **Zero-State Customer Account Summary (Stories 1.9 & 1.10):** Initialized with zero balances (`total_deposits`, `allocated_to_bookings`, `outstanding_balance`, `available_credit`, `excess_payments`, `refundable_balance`), ready for live aggregation in SRS Phases 6–7.

### Module 2: Product & Vehicle Master Data (SRS §8.3 & §8.11)
- **Product Items Catalog:** Model-level master items (`itemCode`, `itemName`, `categoryId`, `brandId`, `model`, `sellingPrice` > 0, `uomId`, `taxConfigId`, `reorderLevel`).
- **Reference Lookups:** CRUD for Categories (`MOTORCYCLE`, `THREE_WHEELER`, `IMPORTED_VEHICLE`), Brands, UoMs, and Tax configurations (15% VAT).
- **Physical Vehicle Units Tracking:** Tracks individual physical vehicles with strict system-wide unique `chassisNumber` (VIN) and `engineNumber`.
- **Bulk CSV Import (Story 2.9):** Rapid intake for shipment batches with preview and duplicate detection reporting.
- **Lifecycle Statuses (Story 2.8):** `RECEIVED`, `AVAILABLE_FOR_SALE`, `RESERVED`, `ALLOTTED`, `READY_FOR_DELIVERY`, `SOLD`, `DELIVERED`.
- **Audit Logging:** Logs changes into the shared `audit_log` table with before/after state diffs.

---

## 🚀 Quick Start Guide

### 1. Database Setup
Ensure PostgreSQL is running. You can use your local PostgreSQL server on port `5432` (configured in `backend/.env`) or start the Docker container:
```bash
docker-compose up -d
```

### 2. TypeORM Migrations
To execute the database migration matching `kanab_motors_schema_modules_1_2.sql`:
```bash
cd backend
npm run migration:run
```

To seed initial reference data (Ethiopian regions, warehouses, categories, brands, default items):
```bash
npm run seed
```

### 3. Running Backend (NestJS)
```bash
cd backend
npm run start:dev
```
- API Base URL: `http://localhost:3000/api`
- Swagger Documentation: `http://localhost:3000/api/docs`

### 4. Running Frontend (React + Vite)
```bash
cd frontend
npm run dev
```
- Web Application: `http://localhost:5173`

---

## 🧪 Automated Testing
Backend unit tests covering conditional TIN rules, duplicate checks, and chassis/engine uniqueness:
```bash
cd backend
npm test
```
All 7 unit tests pass with 100% success rate.
