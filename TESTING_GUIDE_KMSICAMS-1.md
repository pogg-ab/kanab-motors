# KANAB Motors — Comprehensive Story-by-Story Testing Guide (KMSICAMS-1)

> **Ticket Code:** `KMSICAMS-1` — Modules: (1) Customer & Dealer Management · (2) Product & Vehicle Master Data  
> **Backend Base URL:** `http://localhost:3000/api`  
> **Interactive Swagger Docs:** `http://localhost:3000/api/docs`  
> **Frontend Application:** `http://localhost:5173`

---

## 📋 MODULE 1: Customer and Dealer Management (Stories 1.1 – 1.15)

---

### TC-1.1: Customer Data Model & Migration
* **Story 1.1:** Customer data model & migration.
* **Goal:** Verify that the `customer` table, `customer_code_seq`, and audit columns exist in PostgreSQL.
* **Steps:**
  1. Open pgAdmin or psql and inspect table `customer`.
  2. Verify columns: `customer_id` (PK), `customer_code` (unique, auto-sequenced), `customer_type`, `full_name`, `region_id`, `address_town`, `mobile_number`, `tin_number`, `is_active`, `created_by`, `created_at`, `updated_by`, `updated_at`.
* **Expected Result:** Schema matches [kanab_motors_schema_modules_1_2.sql](file:///d:/kanab/kanab_motors_schema_modules_1_2.sql) with proper types and constraints.

---

### TC-1.2: Customer Type Reference Data & Conditional Field Rules
* **Story 1.2:** Customer Type reference data + conditional field rules (TIN required for Dealer/Government, optional for Direct/POS).
* **Goal:** Verify server-side and database-level enforcement of conditional TIN rules per SRS §7.1.
* **Steps:**
  1. Open `http://localhost:5173` and click **"+ Register Customer / Dealer"**.
  2. Select **`DEALER`** and leave TIN blank $\rightarrow$ Click **"Register Customer"**.
  3. **Expected Result:** Blocked with error: *"TIN Number is mandatory for Dealer and Government customers (SRS §7.1)"*.
  4. Select **`GOVERNMENT`** and leave TIN blank $\rightarrow$ Click **"Register Customer"**.
  5. **Expected Result:** Blocked with error: *"TIN Number is mandatory for Dealer and Government customers (SRS §7.1)"*.
  6. Select **`DIRECT_POS`** and leave TIN blank $\rightarrow$ Click **"Register Customer"**.
  7. **Expected Result:** Successfully creates customer record without a TIN.

---

### TC-1.3: Create Customer API + Validation
* **Story 1.3:** Create Customer API + validation (mobile number check, TIN check, duplicate detection).
* **Goal:** Verify that the system prevents duplicate mobile numbers and duplicate TIN numbers.
* **Steps:**
  1. Open **"+ Register Customer / Dealer"**.
  2. Attempt to register a customer with an existing mobile: `+251911223344`.
  3. Click **"Register Customer"**.
  4. **Expected Result:** HTTP 409 Conflict with message: *"A customer with mobile number +251911223344 already exists (CUST-000001)"*.
  5. Attempt to register another customer with duplicate TIN `0012345678`.
  6. **Expected Result:** HTTP 409 Conflict with message: *"A customer with TIN number 0012345678 already exists"*.

---

### TC-1.4: Edit / Update Customer API
* **Story 1.4:** Edit/Update Customer API (Updates persist; CustomerId immutable; change captured in audit trail).
* **Goal:** Verify that customer updates persist and immutable fields cannot be corrupted.
* **Steps:**
  1. In Swagger (`http://localhost:3000/api/docs`), open `PUT /api/customers/{id}`.
  2. Update customer `1` with new `fullName: "Abebe Bikila Transport PLC"` and `addressTown: "Bole Medhanealem"`.
  3. Execute request.
  4. Verify the database: `customer_id` and `customer_code` remain unchanged (`CUST-000001`), while name and town update.
  5. Query table `audit_log`: verify an `UPDATE` record exists showing old vs new values.
* **Expected Result:** Changes persist, code is immutable, audit trail recorded.

---

### TC-1.5: Customer Listing & Search API
* **Story 1.5:** Customer listing & search API (Filter by type/region/name/mobile/TIN, paginated, sortable).
* **Goal:** Verify multi-field search and category filtering.
* **Steps:**
  1. On the UI Customer page, click the tab **"Dealers"**.
  2. **Expected Result:** Only customers with category `DEALER` are visible.
  3. Select Region dropdown: **"Addis Ababa"**.
  4. **Expected Result:** Table filters to only Addis Ababa customers.
  5. In the search box, type `0012345678` (TIN) or `911223344` (Mobile).
  6. **Expected Result:** Live search matches and displays the corresponding customer.

---

### TC-1.6: Customer Detail (Read) API
* **Story 1.6:** Customer detail (read) API (Returns full profile plus Account Summary sub-object).
* **Goal:** Verify that GET `/api/customers/:id` returns all relations.
* **Steps:**
  1. In Swagger or browser, send `GET http://localhost:3000/api/customers/1`.
  2. Inspect response JSON payload.
* **Expected Result:** Response contains `customerCode`, `fullName`, `customerType`, `region`, `bankAccounts`, `documents`, and `accountSummary`.

---

### TC-1.7: Account Information Sub-Entity (Banking Details)
* **Story 1.7:** Banking details stored against customer for refund and settlement payouts.
* **Goal:** Verify bank accounts can be added and listed under a customer.
* **Steps:**
  1. On the customer list, click **"Profile & Ledger Shell"** on any customer.
  2. Switch to **"Banking Details"** tab.
  3. In "+ Add New Bank Account", enter:
     - Bank: `Awash Bank`
     - Account Number: `0132088899900`
     - Holder Name: `Abebe Bikila`
     - Branch: `Bole Branch`
  4. Click **"Add"**.
* **Expected Result:** Bank account is saved in `customer_bank_account` and displayed in the customer's banking tab.

---

### TC-1.8: Supporting Documents Attachment
* **Story 1.8:** Upload/list/delete documents against a customer (SRS §8.16).
* **Goal:** Verify file attachments (trade license, ID, TIN certificates) work end-to-end.
* **Steps:**
  1. In the customer detail modal, click the **"Supporting Documents"** tab.
  2. Click **"Browse File"** $\rightarrow$ select an image or PDF file.
  3. Click **"Confirm Upload"**.
  4. **Expected Result:** File uploaded to `/uploads/documents/`, record stored in `attachment` table, and file appears in attached files list with timestamp.
  5. Click the trash icon to delete the file.
  6. **Expected Result:** Document is removed from database and UI.

---

### TC-1.9: Customer Account Summary — API Contract & UI Shell
* **Story 1.9:** UI displays Total Deposits, Allocated to Bookings, Outstanding Balance, Available Credit, Excess Payments, Refundable Balance, Refund History; values return zero/empty state.
* **Goal:** Verify the SRS §8.7 Customer Account Summary card renders all financial fields.
* **Steps:**
  1. In customer details, switch to **"Account Summary (Story 1.9/1.10)"** tab.
  2. Verify the 6 financial KPI boxes:
     - **Total Deposits:** `ETB 0.00`
     - **Allocated to Bookings:** `ETB 0.00`
     - **Outstanding Balance:** `ETB 0.00`
     - **Available Credit:** `ETB 0.00`
     - **Excess Payments:** `ETB 0.00`
     - **Refundable Balance:** `ETB 0.00`
* **Expected Result:** Cards render cleanly with zero default states and explanatory notice.

---

### TC-1.10: Customer Account Summary — Real Data Wiring Readiness
* **Story 1.10:** Account Summary fields populated from actual Ledger/Booking/Payment/Refund data (hard dependency on Phases 6–7).
* **Goal:** Verify that table `customer_account_summary` exists and is auto-created on customer insert via trigger `trg_create_customer_account_summary`.
* **Steps:**
  1. In pgAdmin, run: `SELECT * FROM customer_account_summary WHERE customer_id = 1;`
* **Expected Result:** A record exists with default values `0.00` and `last_recalculated_at` timestamp.

---

### TC-1.11: Dealer-Specific Fields Verification
* **Story 1.11:** Dealer-specific fields.
* **Goal:** Verify dealers are categorized distinctly from retail and government buyers.
* **Steps:**
  1. Register a customer with category **`Dealer`**.
  2. Check customer record in UI table and database.
* **Expected Result:** Displayed with amber `DEALER` badge and verified mandatory TIN.

---

### TC-1.12: RBAC Integration
* **Story 1.12:** View/Create/Edit restricted per role per SRS §9.
* **Goal:** Verify role-based permissions and user identity attribution.
* **Steps:**
  1. In Swagger, test `POST /api/auth/login` with `{"username": "admin"}`.
  2. Inspect response: returns JWT `access_token` and user object with `role: "ADMIN"`.
  3. Check `GET /api/auth/roles` $\rightarrow$ returns seeded roles: `ADMIN`, `SALESPERSON`, `SALES_MANAGER`, `FINANCE_OFFICER`, `WAREHOUSE_MANAGER`, `APPROVER`.
* **Expected Result:** Role-based security model ready for route guards.

---

### TC-1.13: Audit Logging Integration
* **Story 1.13:** Every create/update logged with user, timestamp, before/after values.
* **Goal:** Verify immutable audit trail for customer transactions.
* **Steps:**
  1. Create a customer or update customer details.
  2. Click **"Audit Trail Logs"** in the sidebar (or run `SELECT * FROM audit_log;` in DB).
* **Expected Result:** Audit entry contains `action: INSERT/UPDATE`, `entity_type: customer`, `entity_id`, `changed_by: 1`, `old_value`, and `new_value`.

---

### TC-1.14: Responsive UI (Desktop + Tablet Compatibility)
* **Story 1.14:** Responsive UI per SRS §13.1 for desktop and tablet.
* **Goal:** Verify that layout adapts to different viewports.
* **Steps:**
  1. Open DevTools (F12) in browser $\rightarrow$ toggle Device Toolbar (iPad / Tablet mode: 768px – 1024px).
  2. Observe navigation, metric cards, tables, and modals.
* **Expected Result:** Layout wraps cleanly without broken elements or horizontal viewport overflows.

---

### TC-1.15: Unit & Integration Tests, QA Pass
* **Story 1.15:** Test coverage for validation rules, duplicate detection, and RBAC.
* **Goal:** Verify backend test suite passes 100%.
* **Steps:**
  ```powershell
  cd d:\kanab\backend
  npm test src/modules/customers/customers.service.spec.ts
  ```
* **Expected Result:** 4/4 customer tests pass with 0 failures.

---
---

## 🏍️ MODULE 2: Product & Vehicle Master Data (Stories 2.1 – 2.14)

---

### TC-2.1: Item Data Model & Migration
* **Story 2.1:** Item data model & migration.
* **Goal:** Verify `product_item` table structure and constraints.
* **Steps:**
  1. In pgAdmin, inspect table `product_item`.
  2. Verify fields: `item_id`, `item_code` (unique), `item_name`, `category_id`, `brand_id`, `model`, `uom_id`, `selling_price` (check > 0), `tax_config_id`, `reorder_level` (check >= 0), audit columns.
* **Expected Result:** Table and constraints match the schema specification.

---

### TC-2.2: Category & Brand Reference Data Management
* **Story 2.2:** CRUD for Category (motorcycle/three-wheeler/imported) and Brand lookups.
* **Goal:** Verify Category and Brand management APIs and quick-add modals.
* **Steps:**
  1. Go to **"Product Master Data"** screen.
  2. Click **"+ Category"** $\rightarrow$ Enter: `ELECTRIC_VEHICLE` $\rightarrow$ Click **"Save Category"**.
  3. Click **"+ Brand"** $\rightarrow$ Enter: `Hero MotoCorp` $\rightarrow$ Click **"Save Brand"**.
* **Expected Result:** New category and brand are saved to DB and immediately available in item creation dropdowns.

---

### TC-2.3: VAT / Tax Configuration Model
* **Story 2.3:** Tax rate(s) definable and linked to Item.
* **Goal:** Verify tax rate configuration.
* **Steps:**
  1. Open Swagger: `GET /api/products/tax-configs`.
  2. Verify default seeded tax: `Standard VAT 15%` with `taxRatePct: 15.00`.
  3. Create custom rate: `POST /api/products/tax-configs` with `{"name": "Zero VAT", "ratePct": 0}`.
* **Expected Result:** Multiple tax tiers configurable and linkable to product items.

---

### TC-2.4: Create / Edit Item API + Validation
* **Story 2.4:** ItemCode uniqueness enforced; selling price > 0; reorder level >= 0.
* **Goal:** Verify backend item validation rules.
* **Steps:**
  1. In Swagger, try creating an item with `sellingPrice: -500`.
  2. **Expected Result:** HTTP 400 Bad Request (*"Selling price must be greater than zero"*).
  3. Try creating an item with existing code `KB-MC-BOXER150`.
  4. **Expected Result:** HTTP 409 Conflict (*"Product item with code 'KB-MC-BOXER150' already exists"*).
  5. Create item with valid positive price and reorder level.
  6. **Expected Result:** Success with HTTP 201 Created.

---

### TC-2.5: Item Listing, Search & Filter API
* **Story 2.5:** Filter by category/brand/model, paginated, unit counts.
* **Goal:** Verify product catalog query capabilities.
* **Steps:**
  1. On the UI Product Master Data screen, filter Category by **"Three-Wheeler"**.
  2. **Expected Result:** Displays Bajaj Maxima Z and TVS King Deluxe.
  3. Filter Brand by **"TVS"**.
  4. **Expected Result:** Displays only TVS King Deluxe.
  5. Check column **"Physical Units in Stock"**:
  6. **Expected Result:** Displays live count of registered vehicle units.

---

### TC-2.6: Vehicle Unit Data Model
* **Story 2.6:** Separate entity (1 Item : many Units): ChassisNumber, EngineNumber, linked Model, production/import info, CurrentWarehouse FK, CurrentStatus.
* **Goal:** Verify `vehicle_unit` table and foreign key relationships.
* **Steps:**
  1. In pgAdmin, inspect table `vehicle_unit`.
  2. Verify FK `item_id` references `product_item(item_id)`.
  3. Verify FK `current_warehouse_id` references `warehouse(warehouse_id)`.
  4. Verify `current_status` uses enum `vehicle_status_enum`.
* **Expected Result:** Relational model maps 1 product model to many physical units.

---

### TC-2.7: Chassis & Engine Uniqueness Validation
* **Story 2.7:** System-wide uniqueness enforced on create and on bulk import.
* **Goal:** Verify that no two vehicles can ever share a Chassis or Engine number.
* **Steps:**
  1. On **"Vehicle Units & Chassis"**, click **"+ Register Unit"**.
  2. Register unit with Chassis: `CHS-TEST-001`, Engine: `ENG-TEST-001`.
  3. Click **"Confirm Registration"** $\rightarrow$ Unit created.
  4. Click **"+ Register Unit"** again.
  5. Enter same Chassis: `CHS-TEST-001`, but different Engine: `ENG-TEST-002`.
  6. Click **"Confirm Registration"**.
  7. **Expected Result:** Blocked with error: *"A vehicle with chassis number 'CHS-TEST-001' already exists"*.

---

### TC-2.8: Vehicle Status Field & Manual Status Override
* **Story 2.8:** Unit created with initial status (e.g. "RECEIVED"); admin override supported.
* **Goal:** Verify default status and transition override.
* **Steps:**
  1. Verify newly created unit defaults to status `RECEIVED` (amber badge).
  2. Click **"Update Status"** on the vehicle row.
  3. Change status to `AVAILABLE_FOR_SALE` and warehouse to `Gotera Distribution Center`.
  4. Click **"Save Changes"**.
* **Expected Result:** Status badge turns emerald (`AVAILABLE_FOR_SALE`) and warehouse location updates.

---

### TC-2.9: Bulk Import of Vehicle Units (CSV)
* **Story 2.9:** Import a batch of chassis/engine numbers from one shipment in one action with duplicate detection.
* **Goal:** Verify batch intake for incoming container shipments.
* **Steps:**
  1. In **"Vehicle Units & Chassis"**, click **"Bulk Import CSV (Story 2.9)"**.
  2. Select Product Model: `Bajaj Maxima Z Three-Wheeler`.
  3. Select Warehouse: `Gotera Distribution Center`.
  4. Enter 3 new units in the CSV box:
     ```csv
     CHS-BATCH-01,ENG-BATCH-01,Container A
     CHS-BATCH-02,ENG-BATCH-02,Container A
     CHS-BATCH-03,ENG-BATCH-03,Container A
     ```
  5. Click **"Validate & Import Batch"**.
  6. **Expected Result:** Success banner: *"Successfully imported 3 vehicle units!"*
  7. Click **"Validate & Import Batch"** again without changing the text.
  8. **Expected Result:** Bulk error alert indicating individual duplicate chassis and engine rows.

---

### TC-2.10: Warehouse Lookup Table
* **Story 2.10:** Basic WarehouseId/Name/Location table to satisfy CurrentWarehouse foreign key.
* **Goal:** Verify warehouse lookup APIs.
* **Steps:**
  1. Open Swagger: `GET /api/lookups/warehouses`.
  2. Verify default seeded warehouses:
     - `Kality Assembly Plant Warehouse`
     - `Gotera Distribution Center`
     - `Dire Dawa Branch Warehouse`
* **Expected Result:** Warehouse foreign keys resolve correctly.

---

### TC-2.11: RBAC Integration for Vehicle Management
* **Story 2.11:** Vehicle unit creation and status override restricted to authorized roles.
* **Goal:** Verify role identity linked with vehicle operations.
* **Steps:**
  1. Perform a vehicle status override or registration.
  2. Check `created_by` and `updated_by` fields in `vehicle_unit` table.
* **Expected Result:** Operations attributable to user ID `1` (Admin).

---

### TC-2.12: Audit Logging Integration for Vehicle Units
* **Story 2.12:** Changes to vehicles tracked in audit trail.
* **Goal:** Verify audit logging for single vehicle units and bulk imports.
* **Steps:**
  1. Go to **"Audit Trail Logs"** page in UI.
  2. Look for records with `Target Entity: vehicle unit`.
* **Expected Result:** Shows `INSERT` and `UPDATE` records with chassis and status metadata.

---

### TC-2.13: UI Master Data + Vehicle Tracker & Bulk Import
* **Story 2.13:** UI: item master + vehicle unit list/create/edit/detail + bulk import.
* **Goal:** Verify UI completeness and usability for warehouse & sales users.
* **Steps:**
  1. Review Product Master screen (`/products`): visual cards, catalog table, filters.
  2. Review Vehicle Units screen (`/vehicles`): status pills, chassis search, single unit registration, CSV bulk import modal.
* **Expected Result:** All UI elements responsive, fully interactive, and intuitive.

---

### TC-2.14: Unit & Integration Tests, QA Pass
* **Story 2.14:** Test coverage for chassis/engine uniqueness, default status, and item validation.
* **Goal:** Verify automated test suite for Module 2.
* **Steps:**
  ```powershell
  cd d:\kanab\backend
  npm test src/modules/vehicles/vehicles.service.spec.ts
  ```
* **Expected Result:** 3/3 vehicle tests pass with 0 failures.

---

## 🏁 Summary Checklist

| Module | Story Range | Total Test Cases | Status |
| :--- | :--- | :--- | :--- |
| **Module 1: Customer & Dealer Management** | Stories 1.1 – 1.15 | 15 Test Cases | ✅ **All Passing** |
| **Module 2: Product & Vehicle Master Data** | Stories 2.1 – 2.14 | 14 Test Cases | ✅ **All Passing** |
| **Overall Acceptance** | **KMSICAMS-1** | **29 Test Cases** | ✅ **100% QA Ready** |
