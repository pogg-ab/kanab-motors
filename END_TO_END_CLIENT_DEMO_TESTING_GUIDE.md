# KANAB MOTORS ENTERPRISE SIMS
## End-to-End Client Demonstration & UAT Testing Guide

**Last updated:** October 9, 2026  
**Aligned with:** `WORKFLOW_CHANGES.md`, current backend DTOs, and current UI behavior  
**Target environment:** Local (`http://localhost:5173`) or deployed Kanab UAT environment  
**Purpose:** One clean end-to-end script with the flows, required inputs, validation values, and expected results.

---

## 0. Testing Rules

Use one unique suffix for each full run.

```text
RUN_SUFFIX: 20261009-02
SHORT_SUFFIX: 100902
```

Rules:

- Use unique values for customer names, mobiles, TINs, references, chassis numbers, engine numbers, PO/shipment references, and payment references.
- Do not reuse chassis or engine numbers after a successful receiving test.
- For deployed testing, confirm the latest backend is deployed and restarted, and migrations are applied.
- For every table screen, test search, at least one status/category filter, refresh, and CSV export if available.
- For every upload screen, test upload progress, view attached file, and replace file.

---

## 1. Demo Accounts

| Persona | Username / Email | Password | Main Scope |
|---|---|---|---|
| Admin | `admin` or `admin@kanabmotors.com` | `Admin@123` | Full access, users, permissions, reports, approvals |
| Finance Manager | `finance` or `finance@kanabmotors.com` | `Finance@123` | Payments, ledger, excess, refunds |
| Procurement | `procurement` or `procurement@kanabmotors.com` | `Procure@123` | Suppliers, purchase orders, shipments, landed cost, exchange rates |
| Inventory Lead | `inventory` or `inventory@kanabmotors.com` | `Inventory@123` | Warehouses, stock, vehicle intake, transfers, adjustments |
| Sales Manager | `sales` or `sales@kanabmotors.com` | `Sales@123` | Customers, enquiries, bookings, allotments, delivery |

Expected result: login succeeds, role access is correct, unauthorized modules are hidden or blocked.

---

## 2. Full Workflow Map

1. Governance: users, roles, permissions, audit logs.
2. Master data: customers, bank accounts, products, vehicles, warehouses.
3. Procurement: suppliers, dynamic exchange rates, purchase orders.
4. Shipment and landed cost: shipment creation, documents, stages, cost components, allocation, receiving.
5. Inventory and warehouse: stock balances, movement history, transfers, adjustments, local assembly, reports.
6. Sales: enquiries, quotations, bookings.
7. Payments and ledger: BRV receipt, confirmation, SOA.
8. Allotment: select live vehicle inventory, post allotment, print advice slip, reverse if needed.
9. Delivery: invoice, PDI, handover, gate pass.
10. Settlement: excess deposit routing, refund request, approval, payout.
11. Dashboards and reports: date filters, search, charts, flip/table views, CSV export.

---

## 3. Reusable Test Data

### Customer

| Field | Value |
|---|---|
| Customer Type | `DEALER` |
| Full Name | `KANAB Fresh UAT Dealer 20261009-02` |
| Mobile Number | `+251911100902` |
| TIN Number | `TIN100902` or any unique 10-digit TIN accepted by the UI |
| Region | `Addis Ababa` |
| Address / Town | `Bole Subcity, Addis Ababa` |
| Bank Name | `Commercial Bank of Ethiopia` |
| Account Number | `100010090201` |
| Account Holder | `KANAB Fresh UAT Dealer 20261009-02` |
| Branch | `Bole Branch` |
| Primary Account | `Yes` |

### Product / Vehicle Model

| Field | Value |
|---|---|
| Item Code | `UAT-HILUX-100902` |
| Item Name | `Toyota Hilux Double Cab 4x4 Fresh UAT` |
| Category | `IMPORTED_VEHICLE` |
| Brand | `Toyota` |
| Model | `Hilux Double Cab 4x4` |
| UOM | `UNIT` |
| Selling Price | `212750` |
| Reorder Level | `0` |
| Weight Kg | `1850` |
| Individually Tracked | `Yes` for vehicles |
| Active | `Yes` |

### Supplier

| Field | Value |
|---|---|
| Supplier Name | `Fresh UAT Toyota Export Supplier 20261009-02` |
| Country / Region | `Japan` |
| Contact Person | `Fresh UAT Import Contact` |
| Phone | `+8190100902` |
| Email | `supplier2026100902@example.com` |
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

**Navigation:** `Core Masters → Customers & Dealers`

| Field | Required | Test value |
|---|---:|---|
| Customer Type | Yes | `DEALER` |
| Full Name / Organization | Yes | `KANAB Fresh UAT Dealer 20261009-02` |
| Mobile Number | Yes | `+251911100902` |
| TIN Number | Required for `DEALER` and `GOVERNMENT` | `TIN100902` or accepted unique 10-digit TIN |
| Region | Optional | `Addis Ababa` |
| Address / Town | Optional | `Bole Subcity, Addis Ababa` |
| Bank Name | Optional but needed for refunds | `Commercial Bank of Ethiopia` |
| Account Number | Optional but needed for refunds | `100010090201` |
| Account Holder Name | Optional but needed for refunds | `KANAB Fresh UAT Dealer 20261009-02` |
| Branch | Optional | `Bole Branch` |
| Primary Account | Optional | `Yes` |

Expected result:

- Customer is created with a customer code.
- Bank account appears under customer profile.
- Financial cards start at zero for deposits, allocated, outstanding, credit, unallocated excess, and refundable balance.

Negative checks:

- Duplicate mobile number is rejected.
- Duplicate TIN is rejected.
- Dealer/Government without TIN is blocked.

## Screen 4: Product Master Data

**Navigation:** `Product Master Data`

| Field | Required | Test value |
|---|---:|---|
| Item Code | Yes | `UAT-HILUX-100902` |
| Item Name | Yes | `Toyota Hilux Double Cab 4x4 Fresh UAT` |
| Category | Yes | `IMPORTED_VEHICLE` |
| Brand | Optional | `Toyota` |
| Model | Optional | `Hilux Double Cab 4x4` |
| Unit of Measure | Yes | `UNIT` |
| Selling Price | Yes | `212750` |
| Tax Config | Optional | `Standard VAT 15%` |
| Reorder Level | Optional | `0` |
| Weight Kg | Optional, needed for weight allocation | `1850` |
| Active | Optional | `Yes` |

Expected result:

- Product appears in product lists, PO item dropdowns, booking dropdowns, and inventory screens.
- Weight is available for landed-cost `BY_WEIGHT` allocation tests.

Negative checks:

- Duplicate item code is rejected.
- Selling price less than or equal to zero is rejected.

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

## Screen 15: Sales Enquiries & Quotes

**Navigation:** `Sales Enquiries & Quotes`

| Field | Required | Test value |
|---|---:|---|
| Customer | Yes | `KANAB Fresh UAT Dealer 20261009-02` |
| Product / Model | Yes | Product from this run or available sales product |
| Quantity | Yes | `1` |
| Unit Price | Optional | `212750` |
| Salesperson Name | Yes | `Demo Salesperson` |
| Payment Mode | Optional | `BANK_DEPOSIT` |

Expected result:

- Enquiry is created.
- Quote value includes price and VAT where applicable.
- Status can move to approved/converted according to UI.
- Enquiry appears in reports.

Negative checks: quantity less than 1, missing customer, or missing item is blocked.

## Screen 16: Advance Bookings

**Navigation:** `Advance Bookings`

| Field | Required | Test value |
|---|---:|---|
| Customer | Yes | `KANAB Fresh UAT Dealer 20261009-02` |
| Product / Model | Yes | Same model used for enquiry |
| Enquiry | Optional | Select approved enquiry if using conversion path |
| Quantity | Yes | `1` |
| Unit Price | Optional | `212750` |
| Required Advance Amount | Optional | `75000` |
| Salesperson Name | Yes | `Demo Salesperson` |
| Target Delivery Date | Optional | Future date |

Expected result:

- Booking is created.
- Booking status reflects payment state.
- Booking appears in eligible queues after payment threshold is met.

Deposit transfer inputs:

| Field | Required | Test value |
|---|---:|---|
| Source Booking | Yes | Booking with excess/available amount |
| Target Booking | Yes | Another active booking |
| Amount | Yes | `10000` |

Expected result: ledger and audit trail show the transfer.

Cancel booking inputs:

| Field | Required | Test value |
|---|---:|---|
| Reason | Yes | `Customer requested cancellation during E2E test` |
| Route To | Optional | `CUSTOMER_CREDIT` or `REFUNDABLE` |

Expected result: booking cancels and excess/refundable/customer credit updates according to selected route.

---

# PHASE 6 — Payments and Ledger

## Screen 17: BRV Receipts & Deposits

**Navigation:** `BRV Receipts & Deposits`

| Field | Required | Test value |
|---|---:|---|
| Customer | Required if not linked to booking | `KANAB Fresh UAT Dealer 20261009-02` |
| Booking | Optional recommended | Booking from this run |
| Instrument Type | Yes | `BANK_DEPOSIT` |
| Bank Name | Yes | `Commercial Bank of Ethiopia` |
| Amount | Yes | `100000` |
| Reference Number | Yes | `BRV-E2E-100902` |
| Reference Date | Optional | Current date |
| Notes | Optional | `Fresh UAT advance deposit` |

Confirmation:

- Confirm payment as Finance Manager/Admin.
- Optional rejection branch reason: `Invalid bank reference for negative test`.

Expected result:

- Payment records as pending then confirmed.
- Customer ledger credits customer/booking.
- Booking paid amount and allotment eligibility update.
- Duplicate reference is blocked.

## Screen 18: Customer Ledger & SOA

**Navigation:** `Customer Ledger & SOA`

| Field | Test value |
|---|---|
| Customer | `KANAB Fresh UAT Dealer 20261009-02` |
| Date Range | Current test month |
| Export | CSV/PDF if available |

Expected result:

- Payment credit appears.
- Booking allocation appears.
- Balance, outstanding, excess, and refundable values are correct.
- Statement export works.

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

- Eligible booking appears in queue.
- Available vehicle table shows chassis, engine, model, warehouse, and status.
- Selected vehicle posts through the 12-step atomic pipeline.
- Vehicle status becomes `ALLOTTED`.
- Booking becomes partially or fully allotted.
- Advice slip/printable document includes customer, booking, chassis, engine, warehouse, dispatch info, landed value, and signatures.

Exception checks:

| Scenario | Expected result |
|---|---|
| Insufficient payment | Allotment blocked with threshold message |
| No available vehicle | No vehicle selectable; partial allotment only if units exist |
| Double allocation attempt | Second attempt blocked with vehicle no longer available message |
| Cancelled booking | Allotment blocked or reversal workflow required |

Reversal/un-allotment, if available:

```text
Reason: Customer requested model change during E2E test
```

Expected result: vehicle status returns according to allowed transition, audit/movement history records reversal, and posted history is not deleted.

## Screen 20: Sales Invoices & VAT

**Navigation:** `Sales Invoices & VAT`

| Field | Required | Test value |
|---|---:|---|
| Booking | Yes | Fully/partially allotted booking from this run |
| Vehicle / Allotment | Yes | Selected allotted vehicle |
| Invoice Date | Optional | Current date |
| VAT | System-calculated | 15% if standard VAT product |
| Notes | Optional | `Fresh UAT invoice test 20261009-02` |

Expected result:

- Invoice is created with invoice number.
- VAT and totals are correct.
- Ledger reflects invoice debit.
- Invoice can be approved if approval flow is enabled.

## Screen 21: PDI, Delivery & Gate Pass

**Navigation:** `PDI Station & Gate Pass Dispatch` / `Deliveries & Handover`

PDI inputs:

| Field | Required | Test value |
|---|---:|---|
| Vehicle Unit | Yes | Allotted vehicle from this run |
| Checklist Items | Yes | Mark all critical checks `Passed` |
| Notes | Optional | `Verified during E2E test` |

Delivery inputs:

| Field | Required | Test value |
|---|---:|---|
| Booking | Yes | Booking from this run |
| Vehicle Unit | Yes | PDI-passed vehicle |
| Delivery Date | Optional | Current date |
| Responsible Employee | Optional | Admin/current user |
| Customer Acknowledged | Required for handover | `Yes` |
| Financial Settlement Validated | Required for delivery | `Yes` |

Expected result:

- PDI saves and can be reviewed.
- Delivery handover is created only after settlement/PDI rules are met.
- Vehicle status moves to ready/sold/delivered according to configured flow.
- Gate pass document is generated or shown.
- Reports show delivered unit.

Negative checks:

- Delivery without PDI is blocked.
- Delivery without financial settlement validation is blocked.

---

# PHASE 8 — Excess Funds, Refunds, Documents, Approvals

## Screen 22: Excess Funds & Refund Management

**Navigation:** `Excess & Refund Payouts`

Create or use a payment amount greater than booking/invoice requirement.

Example:

```text
Payment amount: ETB 300,000
Booking required/allocated amount: ETB 212,750
Expected excess: ETB 87,250
```

Excess routing inputs:

| Field | Required | Test value |
|---|---:|---|
| Customer | Yes | `KANAB Fresh UAT Dealer 20261009-02` |
| Excess Source | Yes | Confirmed BRV/payment from this run |
| Route Type | Yes | `CUSTOMER_CREDIT`, `BOOKING_TRANSFER`, or `REFUNDABLE` |
| Amount | Yes | `10000` or available excess |
| Target Booking | Required for booking transfer | Target booking if used |
| Notes | Optional | `E2E excess routing test` |

Expected result:

- Excess amount decreases by routed amount.
- Customer credit/refundable/target booking balance increases correctly.
- Ledger and audit record the route.

Refund request inputs:

| Field | Required | Test value |
|---|---:|---|
| Customer | Yes | `KANAB Fresh UAT Dealer 20261009-02` |
| Booking | Optional | Booking from this run |
| Original Payment Reference | Optional | `BRV-E2E-100902` |
| Refund Reason | Yes | `EXCESS_PAYMENT - Fresh UAT refund test 20261009-02` |
| Refund Amount | Yes | Amount less than or equal to available refundable balance |
| Refund Method | Optional | `BANK_TRANSFER` |
| Bank Account | Recommended | Primary customer bank account |

Expected formula enforced:

```text
Available Refundable Balance = Total Received - Invoiced Amount - Already Refunded - Pending In-Review Refunds
```

Approval ladder:

| Tier | Amount | Expected approval |
|---|---:|---|
| Tier 1 | `< 50,000 ETB` | Finance Officer review |
| Tier 2 | `50,000–200,000 ETB` | Finance Manager approval |
| Tier 3 | `200,000–1,000,000 ETB` | Managing Director approval |
| Tier 4 | `> 1,000,000 ETB` | Executive Board authorization |

Payout confirmation inputs:

| Field | Required | Test value |
|---|---:|---|
| Payment Reference | Optional | `CBE-PAYOUT-100902` |
| Actual Amount Paid | Optional | Same as approved amount |
| Payment Method | Optional | `BANK_TRANSFER` |
| Notes | Optional | `Wire transfer confirmed during E2E test` |

Expected result:

- Approved refund can be paid out.
- Ledger updates without double-refund.
- Refund status and audit trail show full lifecycle.

Negative checks:

- Refund greater than available balance is blocked.
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

# Final UAT Checklist

| Area | Pass Criteria | Status |
|---|---|---|
| Login and RBAC | Correct module access by role | ☐ |
| Customers/KYC | Customer and bank account create successfully | ☐ |
| Products | Product/model available in PO/booking dropdowns | ☐ |
| Suppliers | Active/inactive status works; KPI cards dynamic | ☐ |
| Exchange Rates | Add/update currencies; dropdowns update | ☐ |
| Purchase Orders | PO create/confirm; lines available for shipment | ☐ |
| Shipments | Shipment create, documents upload, stage flow works | ☐ |
| Landed Cost | Cost component + zero-drift allocation works | ☐ |
| Receiving | Warehouse, chassis, engine, notes save; vehicle created | ☐ |
| Inventory | Stock/vehicle reports and movement history update | ☐ |
| Sales | Enquiry and booking create successfully | ☐ |
| Payments | BRV record/confirm updates ledger | ☐ |
| Allotment | Vehicle selected from live inventory and posted | ☐ |
| Delivery | PDI, invoice, handover, gate pass complete | ☐ |
| Excess/Refund | Routing, refund request, approval, payout complete | ☐ |
| Dashboards | Date filters, KPIs, charts update | ☐ |
| Reports | Search/filter/flip/export works across report tabs | ☐ |
| Audit | Key actions visible and immutable | ☐ |

---

# Known Tester Notes

- If receiving fails with a `shipment_line_id null` error, the deployed backend does not include the latest receiving fix in `shipments.service.ts`; redeploy/restart backend.
- If `Receipt Notes` fails, the database is missing the `shipment_receipt.notes` migration.
- If new currencies do not appear in PO or shipment cost dropdowns, confirm the exchange rate was added on the Baseline Exchange Rates page and refresh the page.
- If a shipment cannot advance to customs/received, upload the mandatory Customs Declaration document first.
- If a vehicle does not appear for allotment, confirm it is `AVAILABLE_FOR_SALE`, matches the booking model, and is not already allotted/reserved.


