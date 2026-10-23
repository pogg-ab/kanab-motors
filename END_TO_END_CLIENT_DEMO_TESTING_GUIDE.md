# KANAB MOTORS ENTERPRISE SIMS
## End-to-End Client Demonstration & UAT Testing Guide

**Last updated:** October 17, 2026  
**Aligned with:** `FINAL_CHANGES_KMICAMS.md` (Rounds 1–4 SRS Updates & Jira KMSICAMS-11 Multi-Tax Suite), `WORKFLOW_CHANGES.md`, current backend DTOs, and active UI behavior  
**Target environment:** Local (`http://localhost:5173`) or deployed Kanab UAT environment  
**Purpose:** One comprehensive, client-ready end-to-end testing script detailing exact screens, navigation, test values, validation rules, negative checks, and expected results.

---

## 0. Testing Rules

Use one unique suffix for each full run.

```text
RUN_SUFFIX: 20261017-01
SHORT_SUFFIX: 101701
```

Rules:

- Use unique values for customer names, mobiles, TINs, references, chassis numbers, engine numbers, PO/shipment references, and payment references.
- Do not reuse chassis or engine numbers after a successful receiving test.
- For deployed testing, confirm the latest backend is deployed and restarted, and migrations are applied.
- For every table screen, test search, at least one status/category filter, refresh, and CSV export if available.
- For every upload screen, test upload progress, view attached file, and replace file.
- Verify both **Standard Non-WHT** and **WHT 2% Liable** customer paths to validate withholding tax deduction rules.
- Test print previews on **Pre-Advance Slip**, **Delivery Voucher (Gate Pass)**, and **Handover Form & Declaration** to verify isolated A4 sheets without page elements or double print triggers.

---

## 1. Demo Accounts

| Persona | Username / Email | Password | Main Scope |
|---|---|---|---|
| Admin / CEO | `admin` or `admin@kanabmotors.com` | `Admin@123` | Full access, governance, CEO installment approval gate, reports, policies |
| Finance Manager | `finance` or `finance@kanabmotors.com` | `Finance@123` | Payments, BRV confirmation, multi-tax invoicing, WHT hub, credit transfers, excess & refunds |
| Procurement | `procurement` or `procurement@kanabmotors.com` | `Procure@123` | Suppliers, purchase orders, shipments, landed cost, exchange rates |
| Inventory Lead | `inventory` or `inventory@kanabmotors.com` | `Inventory@123` | Warehouses, stock, vehicle intake, PDI station, gate pass dispatch, reports |
| Sales Manager | `sales` or `sales@kanabmotors.com` | `Sales@123` | Customers, enquiries, pre-advance slips (PAS), 100% advance bookings, allotments, handover |

Expected result: login succeeds, role access is correct, unauthorized modules are hidden or blocked.

---

## 2. Full Workflow Map (Rounds 1–4 Aligned)

1. **Governance & Audit:** Users, roles, permissions, audit logs.
2. **Master Data & Compliance:** 
   - Customers & Dealers with **Withholding Tax (WHT) Liable** toggle and bank accounts.
   - Products & Vehicles with **Color lookups**, **Engine Capacity CC**, **Battery Power kWh**, and **Tax Configuration Hub** (VAT 15%, Excise duty tiers, Commercial WHT 2%).
   - Warehouses, bank accounts, and supplier registries.
3. **Procurement & Import:** Suppliers, dynamic exchange rates, purchase orders.
4. **Shipment & Landed Cost:** Shipment creation, mandatory customs declaration, stages, cost components, zero-drift allocation, receiving with chassis & engine numbers.
5. **Inventory & Local Assembly:** Stock balances, movement history, transfers, adjustments, local motorcycle assembly intake, 11 inventory reports.
6. **Sales Pipeline & Advance Mandate:** 
   - Sales Enquiries & Quotations with automatic **Pre-Advance Slip (`PAS-YYYY-NNNNN`)** generation and 3-day statutory expiry countdown.
   - **100% Full Current Price Advance Payment Mandate** and conversion from Pre-Advance Slip to Advance Booking.
7. **Payments, Installment Controls & Ledger:** 
   - BRV Receipts & Deposits with **Split / Installment Deposit Plan** toggle.
   - **CEO Installment Approval Gate Modal** required before Finance confirmation for split payment plans.
   - Customer Ledger & Statement of Account (SOA).
8. **Vehicle Allotment:** Select live vehicle inventory (`AVAILABLE_FOR_SALE`), post 12-step atomic allotment, print allotment advice slip, reverse if needed.
9. **Jira KMSICAMS-11 Multi-Tax Invoicing & Settlement:**
   - Multi-tax calculation engine: Vehicle Subtotal + Excise Duty (5% Three-Wheeler / 10% Motorcycle) + VAT (15%) = Gross Commercial Total.
   - Commercial Withholding Tax (2%) deduction at source for WHT-liable customers = Net Customer Payable.
   - Automatic customer deposit allocation to invoice settlement.
   - Real-time `⚠️ Excess Deposit Identified` detection with credit reserve.
   - Statutory tax overrides with mandatory audit justification.
   - **Non-Cash Withholding Tax (WHT) Tracking Hub** (`WHT_SETTLEMENT`).
10. **Delivery, Inspection & Dual Documentation:**
    - PDI station inspection (7/7 critical checks verified).
    - Delivery clearance and **Dual-Document Pack Dialog**:
      - **Document 1: Delivery Voucher (Gate Pass)** with dual clearance signatures (*Security Officer* & *Storekeeper*).
      - **Document 2: Handover Form & Declaration** with 6-item Handover Pack checklist, Customer Statutory Handover Declaration, and customer acceptance signature.
11. **Excess Funds, Credit Transfers & Refunds:**
    - **Two-Sided Atomic Customer Credit Transfer** (balancing debit/credit ledger posting with concurrency safety).
    - Excess deposit routing (`CUSTOMER_CREDIT`, `BOOKING_TRANSFER`, `REFUNDABLE`).
    - 4-Tier statutory refund approval ladder and payout confirmation.
12. **Dashboards & Intelligence Reports:** Date filters, search, charts, flip/table views, CSV export.

---

## 3. Reusable Test Data

### Customer 1: WHT-Liable Commercial Client (Abyssinia Logistics PLC)

| Field | Value |
|---|---|
| Customer Type | `DEALER` |
| Full Name / Business Name | `Abyssinia Logistics PLC [TEST-WHT-101701]` |
| Mobile Number | `+251911101701` |
| TIN Number | `TIN101701` or unique 10-digit TIN |
| Region | `Addis Ababa` |
| Address / Town | `Bole Subcity, Addis Ababa` |
| **Withholding Tax (WHT) Liable** | **`Yes` (Toggle ON — displays `WHT 2% Liable` badge)** |
| Bank Name | `Commercial Bank of Ethiopia` |
| Account Number | `100010170101` |
| Account Holder | `Abyssinia Logistics PLC` |
| Branch | `Bole Branch` |
| Primary Account | `Yes` |

### Customer 2: Standard Retail Client (Dawit Haile)

| Field | Value |
|---|---|
| Customer Type | `DIRECT_POS` |
| Full Name | `Dawit Haile [TEST-NOWHT-101701]` |
| Mobile Number | `+251922101701` |
| TIN Number | `TIN101702` or unique 10-digit TIN |
| Region | `Sidama` |
| Address / Town | `Hawassa City` |
| **Withholding Tax (WHT) Liable** | **`No` (Toggle OFF — Standard Non-WHT)** |
| Bank Name | `Awash Bank` |
| Account Number | `200010170102` |
| Account Holder | `Dawit Haile` |
| Branch | `Hawassa Main Branch` |
| Primary Account | `Yes` |

### Product / Vehicle Model (Imported Vehicle)

| Field | Value |
|---|---|
| Item Code | `UAT-HILUX-101701` |
| Item Name | `Toyota Hilux Double Cab 4x4 Fresh UAT` |
| Category | `IMPORTED_VEHICLE` |
| Brand | `Toyota` |
| Model | `Hilux Double Cab 4x4` |
| Unit of Measure | `UNIT` |
| Selling Price | `212,750.00 ETB` |
| **Colour** | `Silver Metallic` (from lookup) |
| **Engine Capacity CC** | `2400cc` |
| **Vehicle Usage Type** | `COMMERCIAL` |
| Reorder Level | `0` |
| Weight Kg | `1850` |
| Individually Tracked | `Yes` |
| Active | `Yes` |

### Product / Vehicle Model (Locally Assembled / Three-Wheeler)

| Field | Value |
|---|---|
| Item Code | `UAT-BAJAJ-101701` |
| Item Name | `Kanab Passenger Three-Wheeler 200cc UAT` |
| Category | `LOCAL_ASSEMBLY` |
| Brand | `Kanab Motors` |
| Model | `KM-TukTuk-200` |
| Unit of Measure | `UNIT` |
| Selling Price | `350,000.00 ETB` |
| **Colour** | `White` (or custom lookup) |
| **Engine Capacity CC** | `200cc` |
| **Vehicle Usage Type** | `PASSENGER` |
| Individually Tracked | `Yes` |
| Active | `Yes` |

### Product / Vehicle Model (Electric Vehicle / EV)

| Field | Value |
|---|---|
| Item Code | `UAT-EV-101701` |
| Item Name | `Kanab Eco-Volt Electric Scooter UAT` |
| Category | `LOCAL_ASSEMBLY` |
| Brand | `Kanab Eco` |
| Model | `Volt-1` |
| Unit of Measure | `UNIT` |
| Selling Price | `180,000.00 ETB` |
| **Colour** | `Matte Black` |
| **Battery Power kWh** | `4.8 kWh` |
| **Vehicle Usage Type** | `COMMERCIAL` |
| Active | `Yes` |

### Tax Rates Configuration Hub

| Tax Name | Tax Type | Rate (%) | Applicable Customer | Applicable Vehicle |
|---|---|---:|---|---|
| Standard Ethiopian VAT | `VAT` | `15.00%` | `ALL` | `ALL` |
| Standard Commercial WHT | `WHT` | `2.00%` | `ALL` (deducted if customer is WHT-liable) | `ALL` |
| Automotive Excise Duty (Three-Wheeler) | `EXCISE` | `5.00%` | `ALL` | `THREE_WHEELER` |
| Automotive Excise Duty (Motorcycle) | `EXCISE` | `10.00%` | `ALL` | `MOTORCYCLE` |
| Zero-Rated Tax Tier | `VAT` | `0.00%` | Special Exemptions | `ALL` |

### Supplier

| Field | Value |
|---|---|
| Supplier Name | `Fresh UAT Toyota Export Supplier 101701` |
| Country / Region | `Japan` |
| Contact Person | `Fresh UAT Import Contact` |
| Phone | `+8190101701` |
| Email | `supplier101701@example.com` |
| Address | `Nagoya Export Hub, Japan` |
| Status | `Active` |

### Exchange Rates

| Currency | Rate to ETB | Expected use |
|---|---:|---|
| `ETB` | `1.0000` | Base currency, locked |
| `USD` | `125.0000` | PO and landed cost test |
| `EUR` | `170.0000` | Dropdown test |
| `GBP` | `158.2500` | Add-currency test |

### PO, Shipment, Cost, Receiving

| Area | Field | Value |
|---|---|---|
| PO | Supplier | `Fresh UAT Toyota Export Supplier 20261009-02` |
| PO | Currency | `USD (125.0000 ETB)` |
| PO | Product | `Toyota Hilux Double Cab 4x4 Fresh UAT` |
| PO | Quantity | `1` |
| PO | Unit Price | `1702` |
| Shipment | Bill of Lading | `BL-E2E-20261009-02` |
| Shipment | Expected Arrival | `2026-10-30` |
| Shipment | Allocation Method | `By Value (FOB CIF Price)` |
| Shipment | Route Notes | `Fresh UAT vessel line; Nagoya JPN to Mojo Dry Port ETH; route 20261009-02` |
| Cost | Component | `Insurance` |
| Cost | Amount / Currency | `500 USD` |
| Cost | Exchange Rate | `125.0000` |
| Receiving | Quantity | `1` |
| Receiving | Warehouse | `Kality Assembly Plant Warehouse - Kality Industrial Zone, Addis Ababa` |
| Receiving | Chassis / VIN | `KANAB-2026-CHAS-E2E-100902` |
| Receiving | Engine Number | `KANAB-2026-ENG-E2E-100902` |
| Receiving | Notes | `Module 3 receiving test 20261009-02` |

Expected landed cost calculation:

```text
PO line base: 1 × USD 1,702 × 125 = ETB 212,750.00
Cost component: USD 500 × 125 = ETB 62,500.00
Expected landed total: ETB 275,250.00
Expected unit stamped landed cost: ETB 275,250.00
```

---
# PHASE 1 — Governance, Users, Permissions, Audit

## Screen 1: Users & Permissions

**Navigation:** `Users & Permissions`

| Field | Required | Test value |
|---|---:|---|
| Username | Yes | `demo_user_100902` |
| Email | Yes | `demo_user_100902@kanabmotors.com` |
| Full Name | Yes | `Demo User 100902` |
| Role | Yes | `PROCUREMENT`, `INVENTORY`, `FINANCE_MANAGER`, or `SALES_MANAGER` |
| Initial Password | Yes | `Demo@1234` |
| Active | Yes | `Active` |
| Permission Overrides | Optional | Use only for granular access testing |

Expected result:

- User saves successfully.
- Permission simulator reflects role/module access.
- Restricted modules remain hidden or blocked.

Negative checks:

- Duplicate username/email is rejected.
- Inactive user cannot log in.

## Screen 2: Audit Trail Logs

**Navigation:** `Audit Trail Logs`

Filters to test:

| Filter | Test value |
|---|---|
| Entity Type | `customer`, `booking`, `payment`, `shipment`, `refund`, `stock_transfer`, `stock_adjustment`, `allotment` |
| Action Type | `INSERT`, `UPDATE`, `DELETE`, if available |
| Date Range | Current test day |
| Search | Customer name, shipment number, or payment reference from this run |

Expected result: logs show timestamp, user, entity, action, before/after values where available, and cannot be edited/deleted.

---

# PHASE 2 — Master Data

## Screen 3: Customers & Dealers

**Navigation:** `Core Masters → Customers & Dealers` (or left menu `Customers`)

| Field | Required | Test value |
|---|---:|---|
| Customer Type | Yes | `DEALER` (for commercial) or `DIRECT_POS` (for retail) |
| Full Name / Organization | Yes | `Abyssinia Logistics PLC [TEST-WHT-101701]` |
| Mobile Number | Yes | `+251911101701` |
| TIN Number | Required for `DEALER` and `GOVERNMENT` | `TIN101701` or accepted unique 10-digit TIN |
| Region | Optional | `Addis Ababa` |
| Address / Town | Optional | `Bole Subcity, Addis Ababa` |
| **Withholding Tax (WHT) Liable** | **Optional (Boolean Toggle)** | **Toggle ON for Commercial / Corporate; OFF for Retail** |
| Bank Name | Optional but needed for refunds | `Commercial Bank of Ethiopia` |
| Account Number | Optional but needed for refunds | `100010170101` |
| Account Holder Name | Optional but needed for refunds | `Abyssinia Logistics PLC` |
| Branch | Optional | `Bole Branch` |
| Primary Account | Optional | `Yes` |

### Specific Test Cases for Screen 3:

1. **Test Case 3.1: Register WHT-Liable Customer (Story 1.1)**
   - Click **+ New Customer**.
   - Fill in `Abyssinia Logistics PLC [TEST-WHT-101701]`, TIN `TIN101701`.
   - Locate the **Withholding Tax (WHT) Liable** toggle card:
     - Subtitle reads: *"Customer holds legal exemption or is designated to deduct/pay Withholding Tax (2% commercial WHT rules)"*.
     - Toggle switch **ON**.
   - Click **Save Customer**.
   - **Expected Result:** Table refreshes displaying `Abyssinia Logistics PLC`. Under the **Tax / Financial Profile** column, verify the distinct badge: **`WHT 2% Liable`**.

2. **Test Case 3.2: Register Standard Non-WHT Customer**
   - Click **+ New Customer**.
   - Fill in `Dawit Haile [TEST-NOWHT-101701]`. Leave the WHT toggle **OFF** (default).
   - Click **Save Customer**.
   - **Expected Result:** Table displays customer with **`Standard (Non-WHT)`** profile badge.

3. **Test Case 3.3: Edit Customer WHT Status & Profile Drawer Verification**
   - Click the **Edit** icon on `Dawit Haile`, toggle WHT **ON**, save, and verify badge updates to **`WHT 2% Liable`**.
   - Click the **View Profile** (eye icon) on `Abyssinia Logistics PLC`:
     - In the slide-over profile drawer, locate **Financial & Tax Compliance**.
     - Verify **Withholding Tax Status** displays **`WHT Liable (Deductible)`**.
     - Financial summary cards start at `0.00 ETB` for Total Deposits, Allocated, Outstanding, Credit, and Refundable.

Negative checks:
- Duplicate mobile number is rejected.
- Duplicate TIN is rejected.
- Dealer/Government without TIN is blocked.

---

## Screen 4: Product Master Data & Tax Configuration Hub

**Navigation:** `Core Masters → Product Master Data` (or left menu `Products & Catalog`)

### Product Item Specifications

| Field | Required | Test value |
|---|---:|---|
| Item Code | Yes | `UAT-HILUX-101701` |
| Item Name | Yes | `Toyota Hilux Double Cab 4x4 Fresh UAT` |
| Category | Yes | `IMPORTED_VEHICLE` (or `LOCAL_ASSEMBLY`) |
| Brand | Optional | `Toyota` (or `Kanab Motors`) |
| Model | Optional | `Hilux Double Cab 4x4` |
| Unit of Measure | Yes | `UNIT` (from lookup `/api/lookups/uoms`) |
| Selling Price | Yes | `212,750.00 ETB` |
| **Colour** | Optional | Select `Silver Metallic` from dropdown (linked to `vehicle_color` lookups or add custom color) |
| **Engine Capacity CC** | Optional | `2400cc` (for fuel vehicles, e.g. `150cc`, `200cc`) |
| **Battery Power kWh** | Optional | `4.8 kWh` (for electric vehicles; leave blank for ICE) |
| **Vehicle Usage Type** | Optional | `COMMERCIAL`, `PASSENGER`, or `CARGO` |
| Reorder Level | Optional | `0` |
| Weight Kg | Optional | `1850` (needed for weight allocation) |
| Individually Tracked | Yes | Checkbox checked (for vehicle VIN tracking) |
| Active | Yes | `Yes` |

Expected result:
- Product appears in product lists, PO item dropdowns, booking dropdowns, and inventory screens.
- Vehicle attributes (`Colour`, `CC`, `kWh`, `Usage`) are displayed in product cards and inventory details.

Negative checks:
- Duplicate item code is rejected.
- Selling price less than or equal to zero is rejected.

---

### Tax Configuration Hub (Story 2.3)

**Navigation:** Top action bar in Products or Invoices: **`Tax Configuration`** (or `Manage Taxes`)

1. **Verify Default Active Tax Rules:**
   - `Standard Ethiopian VAT` → Type: **`VAT`** (15.00%) · Customer: `ALL` · Vehicle: `ALL`
   - `Standard Commercial WHT` → Type: **`WHT`** (2.00%) · Customer: `ALL` · Vehicle: `ALL`
   - `Automotive Excise Duty (Three-Wheeler)` → Type: **`EXCISE`** (5.00%) · Vehicle: `THREE_WHEELER`
   - `Automotive Excise Duty (Motorcycle)` → Type: **`EXCISE`** (10.00%) · Vehicle: `MOTORCYCLE`
   - `Zero-Rated Tax Tier` → Type: **`VAT`** (0.00%)

2. **Test Custom Tax Rule Creation:**
   - In the modal, fill in:
     - Tax Name: `Electric Vehicle Green Incentive VAT`
     - Tax Type: `VAT`
     - Rate (%): `5.00`
     - Applicable Customer: `ALL`
     - Applicable Vehicle: `ELECTRIC_VEHICLE`
     - Description: `Subsidized VAT for green transport initiatives & electric fleet operators`
   - Click **Save Tax Rule**.
   - Verify new tier is saved and active.

---

## Screen 5: Vehicle Units & Chassis

**Navigation:** `Vehicle Fleet & Inventory → Vehicle Units`

Use this screen mostly to verify vehicles created by shipment receiving or local assembly intake.

Manual unit inputs, only if needed:

| Field | Required | Test value |
|---|---:|---|
| Product / Model | Yes | `Toyota Hilux Double Cab 4x4 Fresh UAT` |
| Chassis / VIN | Yes | `KANAB-2026-CHAS-MANUAL-100902` |
| Engine Number | Yes | `KANAB-2026-ENG-MANUAL-100902` |
| Warehouse | Yes | `Kality Assembly Plant Warehouse` |
| Status | Yes | `RECEIVED` or `AVAILABLE_FOR_SALE` according to UI rule |

Expected result:

- Chassis and engine are unique.
- Vehicle lifecycle drawer shows product, warehouse, status, import provenance, and landed cost if stamped.

Negative checks:

- Duplicate chassis is rejected.
- Duplicate engine is rejected.
- Invalid status jump is blocked.

---
# PHASE 3 — Procurement, Currency, Shipment, Landed Cost

## Screen 6: Suppliers Master

**Navigation:** `Logistics & Import → Procurement → Suppliers Master Data`

| Field | Required | Test value |
|---|---:|---|
| Supplier Name | Yes | `Fresh UAT Toyota Export Supplier 20261009-02` |
| Country / Region | Optional | `Japan` |
| Contact Person | Optional | `Fresh UAT Import Contact` |
| Phone | Optional | `+8190100902` |
| Email | Optional | `supplier2026100902@example.com` |
| Address | Optional | `Nagoya Export Hub, Japan` |
| Status | Yes | `Active` |

Expected result:

- Supplier appears in the list.
- `Total Suppliers`, `Active`, `Inactive`, `Primary Origin Hubs`, and `Procurement Readiness` update dynamically from supplier data.
- Active suppliers appear in the PO supplier dropdown.
- Inactive suppliers are excluded from new PO selection.

Negative checks:

- Duplicate supplier name is rejected.
- Inactive supplier cannot be used for new purchase order.

## Screen 7: Procurement Reports — Baseline Exchange Rates

**Navigation:** `Logistics & Import → Procurement → Pipeline Intelligence & Reports → Baseline Exchange Rates (NBE)`

| Action | Field | Test value |
|---|---|---|
| Validate base | ETB | Must stay `1.0000`; edit locked |
| Update USD | Rate | `125.0000` |
| Add/verify EUR | Rate | `170.0000` |
| Add/verify GBP | Code / Rate | `GBP` / `158.2500` |

Expected result:

- Currency cards show currency code, ETB rate, and update date.
- Newly added currency appears in PO currency dropdowns and shipment cost dropdowns after refresh.
- ETB remains locked at 1.0000.

Negative checks:

- Blank currency code is blocked.
- Non-positive exchange rate is blocked.
- ETB cannot be changed away from 1.0000.

## Screen 8: Purchase Order Management

**Navigation:** `Logistics & Import → Procurement → Purchase Order Management`

| Field | Required | Test value |
|---|---:|---|
| Supplier Partner | Yes | `Fresh UAT Toyota Export Supplier 20261009-02` |
| Contract Currency | Yes | `USD (125.0000 ETB)` |
| PO Date | Yes | Current date |
| Product Item | Yes | `Toyota Hilux Double Cab 4x4 Fresh UAT` |
| Quantity | Yes | `1` |
| Unit Price | Yes | `1702` |
| Contract Terms / Logistics Notes | Optional | `Fresh UAT Module 3 PO test 20261009-02` |

Status actions:

1. Create PO.
2. Submit PO if the UI requires submission.
3. Confirm PO.

Expected result:

- PO appears with status `CONFIRMED`.
- PO value displays `USD 1,702.00`.
- Line becomes available for shipment consolidation.
- Currency is saved on PO header and lines.

Negative checks:

- Quantity and unit price must be valid positive numbers.
- PO lines already fully shipped cannot be selected again for another shipment.

## Screen 9: Import Shipment Tracking & Landed Cost Management

**Navigation:** `Logistics & Import → Shipments & Landed Cost`

This validates Section 12:

```text
Supplier → PO → Shipment → B/L & Documents → Djibouti Port → Customs → Inland → Landed Cost → Inventory Receipt
```

### Step 9.1 — Create Import Shipment

Click **Create Import Shipment**.

| Field | Required | Test value |
|---|---:|---|
| Bill of Lading Number | Yes | `BL-E2E-20261009-02` |
| Expected Arrival Date | Optional recommended | `2026-10-30` |
| Landed Cost Apportionment | Yes | `By Value (FOB CIF Price)` |
| Confirmed PO Lines | Yes | Select the confirmed PO line from Screen 8 |
| Shipment Notes / Route Details | Optional | `Fresh UAT vessel line; Nagoya JPN to Mojo Dry Port ETH; route 20261009-02` |

Expected result:

- Shipment is created at stage `ORDERED`.
- Shipment line shows shipped `1`, received `0`, remaining `1`.
- Shipment appears in the table and opens in Control Center.

### Step 9.2 — Upload required documents

Open **Document Centre (Gate)**.

| Document Type | Required for test | Expected state |
|---|---:|---|
| Commercial Invoice | Yes | Uploaded |
| Packing List | Yes | Uploaded |
| Bill of Lading | Yes | Uploaded |
| Customs Declaration | Mandatory before customs/received closure | Uploaded |

Expected result:

- Each card shows uploaded status.
- Upload progress bar appears while uploading.
- View attached file opens the file.
- Replace document works.

Negative check: advancing to customs or received without Customs Declaration is blocked.

### Step 9.3 — Add multi-currency cost component

Open **Multi-Currency Costs** and click **Add Cost Component**.

| Field | Required | Test value |
|---|---:|---|
| Cost Component | Yes | `Insurance` |
| Amount | Yes | `500` |
| Currency | Yes | `USD` |
| Exchange Rate | Yes / auto | `125.0000` |
| Notes | Optional | `Fresh UAT insurance cost component` |

Expected result:

- Cost row appears with `500.00 USD`.
- ETB amount shows `ETB 62,500.00`.
- Cost count increments.

Negative checks:

- Amount `0` or negative is blocked.
- Unknown currency without default exchange rate is blocked.
- After shipment is `RECEIVED`, adding/removing costs is blocked.

### Step 9.4 — Landed cost allocation

Open **Landed Cost Engine**.

Test allocation methods if time allows:

| Method | Purpose | Expected result |
|---|---|---|
| `BY_VALUE` | Allocates by FOB value | Zero-drift allocation |
| `BY_QUANTITY` | Allocates by units | Zero-drift allocation |
| `BY_WEIGHT` | Allocates by product weight | Uses `weightKg`; blocks if weight missing |

Single-line expected values:

```text
Line Base FOB: ETB 212,750.00
Apportioned Expenses: ETB 62,500.00
Total Line Landed: ETB 275,250.00
Discrepancy: ETB 0.00
Unit Stamped Landed Cost: ETB 275,250.00
```

Expected result:

- Allocation status shows reconciled / zero-drift verified.
- Cost sheet/print view opens if available.
- Allocation remains current before receiving.

### Step 9.5 — Advance shipment stages

Stage path:

```text
ORDERED → SHIPPED → AT_DJIBOUTI_PORT → ETHIOPIAN_CUSTOMS_CLEARANCE → IN_TRANSIT_INLAND → RECEIVED
```

Expected result:

- Stage tracker highlights completed stages.
- Stage Tracking & History logs timestamp, from stage, to stage, actor, and notes.
- Invalid jumps are blocked.

### Step 9.6 — Receive physical vehicle unit

Open **Inventory Receiving (VIN Matching)** and click **Receive Batch**.

| Field | Required | Test value |
|---|---:|---|
| Quantity to Receive | Yes | `1` |
| Receiving Warehouse | Yes | `Kality Assembly Plant Warehouse - Kality Industrial Zone, Addis Ababa` |
| Chassis / VIN #1 | Yes | `KANAB-2026-CHAS-E2E-100902` |
| Engine Number #1 | Yes | `KANAB-2026-ENG-E2E-100902` |
| Receipt Notes | Optional | `Module 3 receiving test 20261009-02` |

Expected result:

- Receipt succeeds with no database error.
- Received becomes `1`; remaining becomes `0`.
- Shipment becomes `RECEIVED`.
- Vehicle unit is created with the entered chassis and engine number.
- Unit landed cost is stamped as `ETB 275,250.00`.
- PO status becomes `RECEIVED` if all PO lines are fully received.

Negative checks:

- Duplicate chassis is blocked.
- Duplicate engine is blocked.
- Quantity greater than remaining is blocked.
- Vehicle count must match quantity received.

---
# PHASE 4 — Inventory & Warehouse Management (Module 13)

## Screen 10: Inventory Stock Balances

**Navigation:** `Vehicle Fleet & Inventory → Inventory & Warehouses`

Filters to test:

| Filter | Test value |
|---|---|
| Warehouse | `All`, then `Kality Assembly Plant Warehouse` |
| Search | Product code or product name from this run |
| Stock status | Available / low-stock if present |

Expected result:

- Received shipment vehicle appears in vehicle inventory views.
- For serialized vehicles, unit appears in vehicle list and movement history.
- Stock formula is consistent: `Available = On Hand - Reserved - Allocated`.

## Screen 11: Stock Transfers

**Navigation:** `Inventory & Warehouses → Stock Transfers`

| Field | Required | Test value |
|---|---:|---|
| From Warehouse | Yes | `Kality Assembly Plant Warehouse` |
| To Warehouse | Yes | `Gotera Distribution Center` |
| Vehicle Unit or Item | Yes | Select received vehicle or stock item |
| Quantity | Required for non-serialized item | `1` |
| Notes | Optional | `Fresh UAT transfer test 20261009-02` |

Expected result:

- Transfer request is created.
- Approval/completion updates movement history.
- Source and destination warehouses cannot be the same.
- Negative stock is blocked.

## Screen 12: Stock Adjustments

**Navigation:** `Inventory & Warehouses → Stock Adjustments`

| Field | Required | Test value |
|---|---:|---|
| Warehouse | Yes | `Kality Assembly Plant Warehouse` |
| Item or Vehicle Unit | Yes | Choose stock item or vehicle unit |
| Quantity Delta | Required for non-serialized stock | `-1` or `1` |
| Reason | Yes | `CYCLE_COUNT_CORRECTION`, `DAMAGE`, `LOSS`, `FOUND`, `DATA_CORRECTION`, or `OTHER` depending on UI values |
| Reason Notes | Yes | `Fresh UAT physical count correction test 20261009-02` |

Expected result:

- Adjustment request is created.
- Approval is required before stock changes.
- Approved adjustment appears in movement history.
- Posted adjustment cannot be deleted; corrections require reversal/authorized adjustment.

Negative checks:

- Missing reason notes is blocked.
- Adjustment causing negative stock is blocked.

## Screen 13: Local Assembly Intake

**Navigation:** `Inventory & Warehouses → Production / Local Assembly Receipt`

| Field | Required | Test value |
|---|---:|---|
| Product Item | Yes | Motorcycle or locally assembled product |
| Chassis Number | Yes | `KANAB-2026-CHAS-LOCAL-100902` |
| Engine Number | Yes | `KANAB-2026-ENG-LOCAL-100902` |
| Warehouse | Yes | `Kality Assembly Plant Warehouse` |
| Assembled At | Optional | Current date |

Expected result:

- Vehicle unit is created.
- Vehicle status auto-transitions from `RECEIVED` to `AVAILABLE_FOR_SALE` if no inspection hold applies.
- Movement history records receipt/status change.

## Screen 14: Movement History and 11 Inventory Reports

**Navigation:** `Inventory & Warehouses → Movement History / Reports`

Reports to test:

1. Current Stock Report.
2. Vehicle Inventory Report.
3. Stock Movement Report.
4. Warehouse Valuation Report.
5. Reserved Inventory Report.
6. Allocated Inventory Report.
7. Stock Transfer Report.
8. Stock Adjustment Report.
9. Inventory Aging Report.
10. Vehicle Status Report.
11. Capitalized Landed Cost Inventory Valuation Report.

Expected result:

- Reports load without blank required columns.
- Search/filter works.
- CSV export works.
- Vehicle status distribution shows warehouse, model, status, and unit count.
- Landed cost valuation includes received Module 12 vehicle cost.

---

# PHASE 5 — Sales Pipeline

# PHASE 5 — Sales Pipeline & Advance Mandate

## Screen 15: Sales Enquiries, Quotes & Pre-Advance Slips (Stories E16–E18)

**Navigation:** `Sales Enquiries & Quotes` (or left menu `Sales Pipeline → Enquiries`)

| Field | Required | Test value |
|---|---:|---|
| Customer | Yes | `Abyssinia Logistics PLC [TEST-WHT-101701]` |
| Product / Model | Yes | `Toyota Hilux Double Cab 4x4 Fresh UAT` (or Bajaj Three-Wheeler) |
| Quantity | Yes | `1` |
| Unit Price | Optional | `212,750.00 ETB` |
| Salesperson Name | Yes | `Demo Salesperson` |
| Payment Mode | Optional | `BANK_DEPOSIT` |

### Workflow & Pre-Advance Slip Generation (PAS-YYYY-NNNNN):

1. **Submit & Approve Enquiry:**
   - Create enquiry and click **Approve Enquiry**.
   - Upon approval, the system automatically provisions an official **Pre-Advance Slip** with sequence `PAS-YYYY-NNNNN` (e.g. `PAS-2026-00001`).
2. **Review & Print Pre-Advance Slip:**
   - In the enquiry action column, click the **`Pre-Advance Slip`** button (printer icon).
   - Observe the Pre-Advance Slip modal:
     - **Slip Reference:** Displays sequential number `PAS-YYYY-NNNNN`.
     - **Statutory Expiry Banner:** Displays high-visibility amber/emerald countdown banner:  
       `⏳ Valid for 3 Calendar Days (Expires in 72 Hours: [Date/Time 3 days out])`
     - **100% Full Gross Advance Mandate (Story B4):** Required deposit is calculated as **100% of Current Vehicle Price** (`212,750.00 ETB` + VAT = `244,662.50 ETB`).
     - **Bank Deposit Instructions:** Commercial Bank of Ethiopia (Account: `100010170101`).
   - Click **`Print Pre-Advance Slip`**:
     - Verify print isolation: Only the official A4 slip renders in print preview; web navigation, buttons, and backgrounds are hidden.
     - Verify no unwanted page duplicate or secondary dialog.

Negative checks:
- Quantity less than 1, missing customer, or missing item is blocked.
- Expired Pre-Advance Slip (>72 hours without payment) triggers expiry warning during booking conversion.

---

## Screen 16: Advance Bookings & 100% Advance Mandate (Stories B3 & B4)

**Navigation:** `Sales Pipeline → Advance Bookings`

| Field | Required | Test value |
|---|---:|---|
| Customer | Yes | `Abyssinia Logistics PLC [TEST-WHT-101701]` |
| **Originating Pre-Advance Slip** | **Optional (Recommended)** | **Select `PAS-2026-00001 — Abyssinia Logistics PLC — Hilux 4x4 — 244,662.50 ETB`** |
| Product / Model | Yes | `Toyota Hilux Double Cab 4x4 Fresh UAT` (auto-filled by slip) |
| Quantity | Yes | `1` |
| Unit Price | Yes | `212,750.00 ETB` |
| **Required Advance Amount** | **System Mandated (100%)** | **`244,662.50 ETB` (Enforces 100% Full Current Price Mandate)** |
| Salesperson Name | Yes | `Demo Salesperson` |
| Target Delivery Date | Optional | Future date (e.g. 14 days out) |

### Key Booking Validation Rules:

1. **Pre-Advance Slip Conversion:**
   - Selecting an approved `Originating Pre-Advance Slip` locks in customer and product specifications and auto-sets the required advance amount to 100% of vehicle gross value.
   - Saving booking marks originating slip as `CONVERTED`.
2. **100% Advance Payment Mandate:**
   - The default statutory rule requires 100% full advance payment for booking confirmation.
   - If a user attempts to manually enter a partial advance (e.g. `50,000 ETB`) without selecting an approved installment plan, the system alerts:  
     `⚠️ Advance booking requires 100% of current vehicle gross price unless Split / Installment Deposit Plan is authorized.`

Deposit transfer inputs (Existing Booking to Booking):

| Field | Required | Test value |
|---|---:|---|
| Source Booking | Yes | Booking with excess/available amount |
| Target Booking | Yes | Another active booking |
| Amount | Yes | `10,000.00 ETB` |

Cancel booking inputs:

| Field | Required | Test value |
|---|---:|---|
| Reason | Yes | `Customer requested cancellation during E2E test` |
| Route To | Optional | `CUSTOMER_CREDIT` or `REFUNDABLE` |

Expected result: booking cancels and excess/refundable/customer credit updates according to selected route.

---

# PHASE 6 — Payments, Installment Controls & Ledger

## Screen 17: BRV Receipts, Deposits & CEO Installment Gate (Story P14)

**Navigation:** `Finance & Accounts → BRV Receipts & Deposits` (or left menu `Payments`)

| Field | Required | Test value |
|---|---:|---|
| Customer | Required if not linked to booking | `Abyssinia Logistics PLC [TEST-WHT-101701]` |
| Booking | Recommended | Select active booking from Screen 16 |
| Instrument Type | Yes | `BANK_DEPOSIT` |
| Bank Name | Yes | `Commercial Bank of Ethiopia` |
| Amount | Yes | `244,662.50 ETB` (or split installment amount `120,000.00 ETB`) |
| Reference Number | Yes | `BRV-E2E-101701` |
| Reference Date | Optional | Current date |
| **Split / Installment Deposit Plan** | **Conditional Toggle** | **Toggle ON if customer is paying in partial tranches** |
| Notes | Optional | `Fresh UAT advance deposit payment 101701` |

### CEO Installment Approval Gate Workflow (Story P14):

1. **When Full 100% Payment is Received:**
   - Toggle `Split / Installment Deposit Plan` is **OFF**.
   - Payment status is `PENDING`.
   - Finance Manager clicks **Confirm Payment**.
   - Payment status transitions immediately to `CONFIRMED`.
   - Booking `paid_amount` increments to 100%, unlocking vehicle allotment eligibility.

2. **When Split / Installment Deposit is Selected:**
   - Toggle **`Split / Installment Deposit Plan` ON**.
   - System displays warning banner:  
     `🔒 Split Installment Deposit Plan Detected: CEO Approval Gate required before Finance can confirm payment.`
   - In the payment action column, observe the button: **`Review Installment (CEO Approval Gate)`**.
   - Finance Manager attempts to click **Confirm Payment**:
     - **Negative Check:** Confirmation is blocked with message: *"CEO approval required for installment deposit plan before confirmation."*
   - Log in as **Admin / CEO** (or open gate modal):
     - Click **`Review Installment (CEO Approval Gate)`**.
     - Review Customer Name, Booking ID, Proposed Deposit Amount, and Remaining Balance.
     - Select Decision: **`APPROVE`**.
     - Enter Mandatory Justification: *"Approved by CEO: 50% advance received, balance guaranteed prior to PDI clearance."*
     - Click **Submit CEO Decision**.
   - Now, Finance Manager can click **Confirm Payment**:
     - Payment confirms successfully.
     - Audit log records CEO approval details, timestamp, and approver identity.

---

## Screen 18: Customer Ledger & Statement of Account (SOA)

**Navigation:** `Finance & Accounts → Customer Ledger & SOA`

| Field | Test value |
|---|---|
| Customer | `Abyssinia Logistics PLC [TEST-WHT-101701]` |
| Date Range | Current test month |
| Export | CSV / PDF |

### Verification of Transaction Types:

Verify that the ledger displays chronological entries with proper debit/credit balance tracking:

| Transaction Type | Nature | Description |
|---|---|---|
| `PAYMENT_DEPOSIT` | **Credit** | Bank deposit confirmed from Screen 17 (`BRV-E2E-101701`) |
| `INVOICE_CHARGE` | **Debit** | Generated when Sales Invoice is finalized (Screen 20) |
| `CREDIT_TRANSFER` | **Debit / Credit** | Atomic two-sided transfer between customers (Screen 22) |
| `WHT_SETTLEMENT` | **Credit** | Non-cash settlement credit recorded via WHT Hub (Screen 20) |
| `REFUND_PAYOUT` | **Debit** | Payout of excess funds back to customer bank account (Screen 22) |

Expected result:
- Ledger reflects exact running balance.
- Summary cards (Total Deposits, Total Invoiced, Outstanding, Unallocated Excess, Available Credit) calculate accurately without rounding drift.
- Statement PDF / CSV download contains complete audit trails.

---
# PHASE 7 — Vehicle Allotment, Invoice, Delivery

## Screen 19: Vehicle Allotment Management (Module 14)

**Navigation:** `Vehicle Allotment Management`

Preconditions:

- Booking exists and payment threshold is satisfied.
- At least one vehicle is `AVAILABLE_FOR_SALE` in inventory.
- Vehicle model matches booking model.

Allotment inputs:

| Field | Required | Test value |
|---|---:|---|
| Booking | Yes | Booking from this run |
| Vehicle Unit | Yes | Select from live available inventory table; no free text |
| Notes | Optional | `Fresh UAT allotment test 20261009-02` |

Expected result:

- Eligible booking appears in queue with **Ordered Quantity, Allotted Quantity, and Remaining Needed** clearly displayed.
- Available vehicle table shows chassis, engine, model, warehouse, and status for units in `AVAILABLE_FOR_SALE` only.
- Selection clamping: Maximum selectable units cannot exceed `remainingQuantity` for the selected booking.
- Selected vehicle posts through the 12-step atomic pipeline and is immediately marked `RESERVED` upon creation, then `ALLOTTED` upon approval.
- Multi-booking isolation (FTC-49): Once a vehicle is allotted or reserved for Booking 1, it is immediately removed from available inventory and blocked from being selected or allotted to any other booking.
- Allocation calculations (FTC-53): For a 5-unit booking with 3 units allocated, the queue and booking table show **3 Allocated, 2 Remaining**, preventing over-allocation beyond the requested quantity.
- Inventory balance synchronization (FTC-55): When 3 vehicles from a starting stock of 10 are allotted, `stock_balance` reflects `10 On Hand`, `3 Reserved`, and `7 Available for Sale`, with zero double-counting across warehouse status views.
- Advice slip/printable document includes customer, booking, chassis, engine, warehouse, dispatch info, landed value, and signatures.

Exception checks:

| Scenario | Expected result |
|---|---|
| Insufficient payment | Allotment blocked with threshold message |
| No available vehicle | No vehicle selectable; partial allotment only if units exist |
| Double allocation attempt (FTC-49) | Second attempt blocked with message: *"Vehicle is already allocated or reserved. The system has prevented double allocation."* |
| Over-allocation attempt (FTC-53) | Blocked with message indicating ordered vs remaining quantity |
| Cancelled booking | Allotment blocked or reversal workflow required |

Reversal/un-allotment, if available:

```text
Reason: Customer requested model change during E2E test
```

Expected result: vehicle status returns to `AVAILABLE_FOR_SALE`, stock balance decreases reserved count atomically, audit/movement history records reversal, and posted history is preserved.

## Screen 20: Sales Invoices & Multi-Tax Settlement Suite (Jira KMSICAMS-11)

**Navigation:** `Finance & Accounts → Sales Invoices & VAT` (or left menu `Invoices`)

### Multi-Tax Calculation & Settlement Engine:

1. **Create Invoice for Allotted Vehicle:**
   - Click **+ New Sales Invoice**.
   - Select Customer: `Abyssinia Logistics PLC [TEST-WHT-101701]` (WHT-liable client) or `Dawit Haile [TEST-NOWHT-101701]`.
   - Select Booking / Allotted Vehicle: Choose the allotted vehicle from Screen 19 (`UAT-HILUX-101701` or Bajaj Three-Wheeler).

2. **Live Multi-Tax Formula Breakdown:**
   Observe the automated tax engine calculating in real time:

   | Line Item / Tax Tier | Calculation Rule | Example Hilux (ETB) | Example Three-Wheeler (ETB) |
   |---|---|---:|---:|
   | **Vehicle Subtotal** | Base List Price × Quantity | `212,750.00` | `350,000.00` |
   | **Automotive Excise Duty** | 0% ICE / 5% Three-Wheeler / 10% Motorcycle | `0.00` | `17,500.00` (5%) |
   | **Value Added Tax (VAT)** | 15% on `(Subtotal + Excise)` | `31,912.50` | `55,125.00` (15%) |
   | **Gross Commercial Total** | `Subtotal + Excise + VAT` | **`244,662.50`** | **`422,625.00`** |
   | **Withholding Tax (WHT 2%)** | 2% on Subtotal (if Customer is WHT Liable) | `-4,255.00` | `-7,000.00` |
   | **Net Customer Payable** | **`Gross Commercial Total - Commercial WHT`** | **`240,407.50`** | **`415,625.00`** |

3. **Deposit Settlement & Excess Allocation:**
   - Check the box: **`☑ Automatically allocate available customer deposits to invoice settlement`**.
   - System calculates applied deposit vs Net Customer Payable:
     - If deposit matches or exceeds Net Customer Payable, invoice settlement status displays `PAID / SETTLED`.
     - **Story IV6 Excess Alert:** If deposit > Net Customer Payable, system displays:  
       `⚠️ Excess Deposit Identified: Remaining funds of [ETB Amount] are preserved in customer account and available for credit transfer or refund.`

4. **Tax Overrides & Statutory Audit Justification (Story IV11):**
   - If an exemption applies (e.g. Diplomatic or Government Zero-VAT), user toggles Tax Override.
   - **Validation Rule:** System mandates entering a **Statutory Exemption Reason & Legal Reference Number**. Leaving justification blank blocks invoice creation.

5. **Invoice Finalization & Lifecycle Transitions:**
   - Click **Finalize & Issue Sales Invoice**.
   - **Expected Status Updates:**
     - Invoice status becomes `FINALIZED` / `ISSUED`.
     - Vehicle status transitions to `SOLD`.
     - Booking status transitions to `SETTLED`.
     - Customer ledger posts idempotent `INVOICE_CHARGE` debit.

6. **Withholding Tax (WHT) Tracking Hub (Story IV14):**
   - Click the sub-tab: **Withholding Tax (WHT) Tracking Hub**.
   - Click **Record WHT Certificate**:
     - Select Invoice / Customer: `Abyssinia Logistics PLC`.
     - Withholding Amount: `4,255.00 ETB` (2% Commercial WHT).
     - Enter Certificate Number: `WHT-CERT-2026-101701`.
     - Issue Date: Current date.
     - Tax Authority Office: `ERCA / Ministry of Revenue Large Taxpayers Office`.
     - Upload scanned copy of physical WHT certificate.
   - Click **Submit WHT Settlement**:
     - System posts atomic non-cash `WHT_SETTLEMENT` credit to customer ledger.
     - Status is set to `PENDING_VERIFICATION` until verified by Finance Lead.

---

## Screen 21: PDI, Delivery & Dual Delivery Documents (Story DL5)

**Navigation:** `Vehicle Fleet & Inventory → PDI Station & Gate Pass Dispatch` (or `Deliveries & Handover`)

### 1. Pre-Delivery Inspection (PDI) Station:
- Locate the vehicle unit in PDI Queue.
- Complete the 7-Point PDI Quality Inspection:
  1. Engine oil, coolant & fluid levels checked
  2. Battery voltage & terminal security verified
  3. Brake fluid & braking response tested
  4. Tire pressure & torque on wheel nuts checked
  5. Lights, indicators, horn & electrical accessories functional
  6. Paint finish, bodywork & chassis inspection clear
  7. Road safety test completed
- Mark all items **`Passed`** and click **Submit PDI Inspection**.
- **Expected Result:** Vehicle status advances to `PDI_PASSED` / `READY_FOR_DELIVERY`.

### 2. Delivery Clearance & Dual-Document Pack Dialog:
- Click **Initiate Delivery Handover**.
- Validate Financial Settlement clearance: System confirms full settlement or authorized credit.
- Click **Confirm Delivery & Generate Documents**.
- In the Delivery Actions column, click **`Gate Pass / Release Documents`**.
- The **Dual-Document Pack Dialog** opens with two dedicated document tabs:

#### 📄 Tab 1: Delivery Voucher (Gate Pass)
- **Header:** Kanab Motors Delivery Voucher & Gate Pass Dispatch Authorization.
- **Vehicle & Customer Specifications:**
  - Customer Full Name & Code: `Abyssinia Logistics PLC [TEST-WHT-101701]`
  - Vehicle Model & Color: `Toyota Hilux Double Cab 4x4` / `Silver Metallic`
  - Chassis / VIN Number: `KANAB-2026-CHAS-E2E-101701`
  - Engine Number: `KANAB-2026-ENG-E2E-101701`
  - PDI Quality Inspection: `PASSED (7/7 Checks Verified)`
  - Financial Clearance: `SETTLED & VERIFIED BY FINANCE`
- **Dual Clearance Signatures:**
  - Signature block 1: *Security Officer / Dispatch Gate Guard*
  - Signature block 2: *Storekeeper / Warehouse Lead*
- **Action Button:** Click **`Print Delivery Voucher`**:
  - Verify clean isolated A4 print preview; sidebars, header navigation, and modal backdrops are excluded.

#### 📋 Tab 2: Handover Form & Declaration (Handover Pack)
- **Official 6-Item Handover Pack Checklist:**
  1. ☑ Ignition Key & Spare Key Set
  2. ☑ Manufacturer Owner's Manual & Service Warranty Booklet
  3. ☑ Standard Tool Kit & Jack
  4. ☑ Spare Wheel / Tire
  5. ☑ Customs Clearance / Sales Invoice Copy
  6. ☑ Temporary Plate / Transit Permit
- **Customer Statutory Handover Declaration:**
  - Standard statutory legal text: *"I hereby acknowledge receipt of the vehicle described above in good condition, complete with all accompanying accessories, tools, and statutory documentation."*
- **Acceptance Signatures:**
  - Customer Acceptance Signature block (Customer / Authorized Rep).
  - Kanab Motors Handover Officer Signature block.
- **Action Button:** Click **`Print Handover Form`**:
  - Verify clean isolated A4 print preview with all 6 checklist items and declaration.

Negative checks:
- Delivery handover without completed PDI (7/7 passed) is blocked.
- Delivery dispatch without financial settlement clearance is blocked.

---

# PHASE 8 — Excess Funds, Refunds & Customer Credit Transfer

## Screen 22: Excess Funds, Credit Transfer & Refunds (Stories X9 & X10)

**Navigation:** `Finance & Accounts → Excess & Refund Payouts` (or left menu `Excess & Refunds`)

### 1. Two-Sided Atomic Customer Credit Transfer (Stories X9 & X10):

Test the transfer of available customer credit from one customer to another:

| Field | Required | Test value |
|---|---:|---|
| **Source Customer** | Yes | `Abyssinia Logistics PLC [TEST-WHT-101701]` (has excess/credit balance) |
| **Destination Customer** | Yes | Select `Dawit Haile [TEST-NOWHT-101701]` from dropdown |
| **Transfer Amount** | Yes | `15,000.00 ETB` |
| **Destination Booking ID** | Optional | Select active booking for Dawit Haile |
| **Transfer Reason / Notes** | Yes | `Authorized commercial credit re-allocation test 101701` |

**Execution Steps & Live Atomic Ledger Preview:**
1. In the **Customer Balances Table**, locate `Abyssinia Logistics PLC`.
2. Click the action button: **`Transfer Credit`**.
3. In the transfer modal, select `Dawit Haile` as recipient and enter `15000`.
4. Observe the **Live Two-Sided Atomic Ledger Preview**:
   - Source Customer: `DEBIT 15,000.00 ETB — Credit Transfer Out to Dawit Haile`
   - Destination Customer: `CREDIT 15,000.00 ETB — Credit Transfer In from Abyssinia Logistics PLC`
5. Click **`Confirm & Post Credit Transfer`**:
   - **Expected Result:**
     - Both ledger entries commit inside a single atomic database transaction with pessimistic row-locking (`FOR UPDATE`).
     - Source customer available credit decreases by `15,000.00 ETB`.
     - Destination customer available credit increases by `15,000.00 ETB`.
     - Transaction audit record created under entity `CREDIT_TRANSFER`.

---

### 2. Excess Deposit Routing:

Route remaining unallocated deposit funds:

| Field | Required | Test value |
|---|---:|---|
| Customer | Yes | `Abyssinia Logistics PLC [TEST-WHT-101701]` |
| Excess Source | Yes | Confirmed BRV / Payment reference |
| Route Type | Yes | `CUSTOMER_CREDIT`, `BOOKING_TRANSFER`, or `REFUNDABLE` |
| Amount | Yes | `10,000.00 ETB` |
| Notes | Optional | `E2E excess routing test 101701` |

Expected result: Excess balance decreases and routed account balance increases accurately.

---

### 3. Statutory Refund Request & 4-Tier Approval Ladder:

Refund request inputs:

| Field | Required | Test value |
|---|---:|---|
| Customer | Yes | `Abyssinia Logistics PLC [TEST-WHT-101701]` |
| Booking | Optional | Booking from this run |
| Original Payment Reference | Optional | `BRV-E2E-101701` |
| Refund Reason | Yes | `EXCESS_PAYMENT - Fresh UAT refund test 101701` |
| Refund Amount | Yes | `25,000.00 ETB` (within available refundable balance) |
| Refund Method | Yes | `BANK_TRANSFER` |
| Bank Account | Yes | Primary customer bank account (`100010170101`) |

Expected formula enforced:
```text
Available Refundable Balance = Total Received - Invoiced Amount - Already Refunded - Pending In-Review Refunds
```

Approval ladder & RBAC Permissions (FTC-44 & FTC-47):

| Tier | Amount | Expected Approval | Authorized Roles |
|---|---:|---|---|
| **Tier 1 (FTC-44)** | **≤ 10,000 ETB** | **Finance Officer Approval** | `FINANCE_OFFICER`, `FINANCE_MANAGER`, `ADMIN` |
| **Tier 2** | **10,001–50,000 ETB** | **Finance Manager Approval** | `FINANCE_MANAGER`, `ADMIN` |
| **Tier 3** | **> 50,000 ETB** | **Senior Management Authorization** | `FINANCE_MANAGER`, `ADMIN` |

Role Permission Boundaries (FTC-47):
- **Sales Manager (`sales@kanabmotors.com`):** Can access Customer Ledger (`statement`) AND initiate Customer Refund requests (`REFUNDS_CREATE`, `REFUNDS_VIEW`). Approval and payment payout actions remain strictly restricted to Finance.
- **Finance Officer (`financeofficer@kanabmotors.com`):** Can access Customer Ledger, verify BRV payments, and approve Tier 1 refunds (`≤ 10,000 ETB`).
- **Finance Director / Manager (`finance@kanabmotors.com`):** Unrestricted financial approvals, ledger adjustments, Tier 2/3 refund approvals, and bank payout processing.

Payout confirmation inputs:

| Field | Required | Test value |
|---|---:|---|
| Payment Reference | Optional | `CBE-PAYOUT-101701` |
| Actual Amount Paid | Optional | `25,000.00 ETB` |
| Payment Method | Optional | `BANK_TRANSFER` |
| Notes | Optional | `Wire transfer confirmed during E2E test` |

Expected result:
- Approved refund can be paid out.
- Ledger posts `REFUND_PAYOUT` debit.
- Available refundable balance updates without double-refund.

Negative checks:
- Refund greater than available balance is blocked (e.g. requesting 60,000 when refundable balance is 50,000).
- Any positive amount from 1 ETB up to refundable balance is accepted (including amounts ≤ 10,000 ETB, with or without comma formatting like `10,000`).
- Duplicate pending refund that exceeds available refundable balance is blocked.
- Payout before approval is blocked.


## Screen 23: Approval Queue & Policies

**Navigation:** `Approval Queue & Policies`

| Filter | Test value |
|---|---|
| Module | `Purchase Orders`, `Refunds`, `Allotments`, `Deliveries` |
| Status | `Pending`, `Approved`, `Rejected` |
| Search | customer name, PO number, refund number, allotment number |

Expected result:

- Pending approvals appear.
- Approve/reject actions enforce role permission.
- Rejection requires reason.
- Audit logs record approval decision.

## Screen 24: Unified Document Center

**Navigation:** `Unified Document Center`

| Field | Required | Test value |
|---|---:|---|
| Entity Type | Yes | `customer`, `shipment`, `booking`, or `delivery` as available |
| Entity Reference | Yes | Relevant record from this run |
| Document Type | Yes | `CUSTOMS_DECLARATION`, `COMMERCIAL_INVOICE`, `PDI`, etc. |
| File | Yes | PDF/image test file |
| Notes | Optional | `Fresh UAT document upload test` |

Expected result:

- Document appears under correct entity.
- Search/filter finds it.
- View/download works.
- Document history/versioning is visible if supported.

---
# PHASE 9 — Dashboards, Reports, Analytics

## Screen 25: Executive / Management Dashboard

**Navigation:** `Dashboard` / `Management Dashboard`

Date filters to test:

| Filter | Expected result |
|---|---|
| Today | KPIs calculate current date only |
| This Week | KPIs calculate current week |
| This Month | KPIs calculate current month |
| Custom | KPIs calculate selected start/end dates |

KPI areas to validate:

- Sales pipeline metrics.
- Booking and deposit metrics.
- Delivery metrics.
- Inventory / available stock metrics.
- Import shipment and landed cost metrics.
- Customer receivable metrics.
- Refund/excess metrics where present.

Expected result:

- KPI values match records created in this run when date filters include them.
- Charts are visible and not empty when matching data exists.
- Empty states are clear when no matching data exists.

## Screen 26: Reports & Analytics Hub

**Navigation:** `Reports & Analytics Hub`

Common controls to test on each report group:

| Control | Expected result |
|---|---|
| Search | Filters rows/cards by visible text |
| Status/Category filter | Filters to selected status/category |
| Date filter | Restricts metrics to selected period |
| Graph/Table flip | Card flips between chart view and table view inside report frame |
| Export CSV | Downloads currently relevant report data |
| Refresh Data | Reloads latest backend values |

Sales report tabs:

- Sales Invoices Report.
- Vehicle Deliveries Report.
- Enquiries Pipeline.
- Bookings Queue.

Expected result:

- Enquiry and booking records from this run appear.
- Delivery report shows delivered units after handover.
- Graph and table views match the same data.

Operational report tabs:

- Sales Invoices Report.
- Vehicle Deliveries Report.
- Enquiries Pipeline.
- Bookings Queue.

Expected result:

- Shipment/operational records are summarized accurately.
- CSV export works after UI changes.

Inventory & Fleet report checks:

- Current Stock Balances & Reorder Points.
- Fleet Lifecycle Status Distribution.

Expected result:

- Stock balance rows show warehouse, item code, product name, on hand, reserved, available, reorder point.
- Fleet lifecycle rows show warehouse, model, status, and units count.
- No blank `Status` or `Units Count` for received/available vehicles.

Customer Financial report checks:

- Customer code, customer name, type, total debited, total credited, net receivable.
- Customer from this run appears after payment/invoice/ledger activity.

Expected result:

- Net receivable values are color-coded correctly.
- Search and export work.

## Screen 27: Procurement & Import Pipeline Intelligence Reports

**Navigation:** `Logistics & Import → Procurement → Pipeline Intelligence & Reports`

| Tab | Expected result |
|---|---|
| Shipment Pipeline & Bottlenecks | Shipment stage counts and bottleneck cards update |
| Purchase Order Fulfillment | PO status and fulfillment data update |
| Baseline Exchange Rates | Dynamic currency list appears; new currencies apply to dropdowns |

Expected result:

- Shipment created in this run appears in pipeline reports.
- Received shipment reduces active shipment counts appropriately.
- PO fulfillment changes from confirmed to received after full receipt.
- Exchange rates match dynamic currency cards.

---

# Final UAT Checklist (Aligned with Rounds 1–4)

| Round / Area | Specific Pass Criteria | Status |
|---|---|---|
| **RBAC & Governance** | Role-based menu isolation; permission overrides; immutable audit trail | ☐ |
| **🔵 Round 1: Customer WHT Flag (Story 1.1)** | Toggle ON displays `WHT 2% Liable` badge in table and profile drawer | ☐ |
| **🔵 Round 1: Vehicle Attributes (Story 2.1)** | Colour, Engine Capacity CC, Battery Power kWh, and Usage Type save & display | ☐ |
| **🔵 Round 1: Lookups (Story 2.2)** | Vehicle color dropdown loads from `/api/lookups/colors` (7 seeded colors) | ☐ |
| **🔵 Round 1: Tax Hub (Story 2.3)** | Tax Configuration Hub displays VAT (15%), WHT (2%), and Excise tiers | ☐ |
| **Logistics & Landed Cost** | PO creation, exchange rates, shipment stages, zero-drift landed cost | ☐ |
| **Vehicle Receiving & Stock** | VIN/Chassis & Engine intake; vehicle created as `AVAILABLE_FOR_SALE` | ☐ |
| **🟣 Round 2: Pre-Advance Slip (Stories E16–E18)** | Sequence `PAS-YYYY-NNNNN`, 3-day countdown banner, isolated A4 print | ☐ |
| **🟣 Round 2: 100% Advance Mandate (Stories B3–B4)** | Booking auto-populates from slip and enforces 100% gross advance requirement | ☐ |
| **🟠 Round 3: CEO Installment Gate (Story P14)** | Partial installment deposit requires CEO approval modal before Finance confirmation | ☐ |
| **🟠 Round 3: Credit Transfer (Stories X9–X10)** | Two-sided atomic ledger debit/credit preview and commit with concurrency locking | ☐ |
| **🟠 Round 3: Non-Cash WHT Hub (Story IV14)** | `WHT_SETTLEMENT` credit ledger posting, certificate tracking & verification | ☐ |
| **🟠 Round 3: Dual Delivery Docs (Story DL5)** | Delivery Voucher (Gate Pass) & Handover Form (6-pack + declaration) with isolated A4 print | ☐ |
| **🟢 Round 4: Multi-Tax Invoicing (Stories IV1–IV13)** | Live breakdown: Subtotal + Excise (5%/10%) + VAT (15%) - WHT (2%) = Net Payable | ☐ |
| **🟢 Round 4: Settlement Allocation (Story IV5–IV6)** | Auto-deposit settlement, excess deposit alert, transitions vehicle to `SOLD` & booking `SETTLED` | ☐ |
| **🟢 Round 4: Tax Exemption Justification (Story IV11)**| Statutory tax overrides mandate legal reason and reference number | ☐ |
| **Excess Funds & Refunds** | Routing (`CUSTOMER_CREDIT`, `BOOKING_TRANSFER`, `REFUNDABLE`), 4-tier approval, payout | ☐ |
| **Dashboards & Intelligence Reports** | Live KPI calculations, graph/table flip, search, and CSV exports across all tabs | ☐ |

---

# Known Tester Notes

- **Pre-Advance Slip Print Isolation:** Pre-Advance Slips, Delivery Vouchers, and Handover Forms use CSS print isolation (`@media print`). When printing, browser print preview will render only the official A4 document without sidebar navigation, headers, or modal action buttons.
- **WHT Deduction Rule:** Commercial Withholding Tax (2%) is only subtracted on the Sales Invoice when the customer's **Withholding Tax Liable** toggle is set to `ON`. For standard retail customers, Net Payable equals Gross Commercial Total.
- **CEO Approval Requirement:** If `Split / Installment Deposit Plan` is checked on a BRV payment, Finance confirmation is blocked until an Admin or CEO completes the **`Review Installment (CEO Approval Gate)`** modal.
- **Delivery Document Verification:** The **`Gate Pass / Release Documents`** button in Deliveries opens a dual-tab modal containing both the **Delivery Voucher (Gate Pass)** and the **Handover Form & Declaration** (with the 6-item Handover Pack checklist).
- **Receiving & Chassis Uniqueness:** Do not reuse chassis or engine numbers. If a vehicle unit does not appear in allotment, verify that its status is `AVAILABLE_FOR_SALE` and matches the booked vehicle model.
- **Exchange Rates:** If a new currency does not immediately appear in PO dropdowns, confirm it was added in the dynamic exchange rates tab and refresh the screen.



