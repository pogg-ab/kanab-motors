# KANAB MOTORS ENTERPRISE SIMS
## Current End-to-End Client Demonstration & Verification Guide

**Target Environment:** Local (`http://localhost:5173`) or agreed Kanab Motors UAT environment  
**Purpose:** End-to-end business workflow testing with accurate current screen inputs.  
**Rule for repeat tests:** Use a unique suffix for customer names, mobile numbers, TINs, chassis numbers, engine numbers, payment references, and document references. Example suffix: `20261001-01`.

---

## 1. Demo Accounts

Use the seeded accounts currently available in the system.

| Persona | Username / Email | Password | Main Scope |
|---|---|---|---|
| Admin | `admin` or `admin@kanabmotors.com` | `Admin@123` | Full access, users, permissions, reports, approvals |
| Finance Manager | `finance` or `finance@kanabmotors.com` | `Finance@123` | Payments, ledger, excess, refunds |
| Procurement | `procurement` or `procurement@kanabmotors.com` | `Procure@123` | Suppliers, purchase orders, shipments, landed cost, exchange rates |
| Inventory Lead | `inventory` or `inventory@kanabmotors.com` | `Inventory@123` | Vehicles, warehouses, inventory, stock operations |
| Sales Manager | `sales` or `sales@kanabmotors.com` | `Sales@123` | Customers, enquiries, bookings, sales workflow |

---

## 2. End-to-End Workflow Map

1. Users, roles, and audit logs.
2. Customer, product, and vehicle/unit setup.
3. Supplier, exchange rate, purchase order, shipment, and landed cost.
4. Inventory and warehouse stock operations.
5. Sales enquiry and booking.
6. Payment receipt and confirmation.
7. Vehicle allotment.
8. Customer ledger and statement of account.
9. Excess payment and refund settlement.
10. Invoice, PDI, delivery, and gate pass.
11. Dashboard and reporting validation.

---

# PHASE 1 — Governance, Users, Permissions, Audit

## Screen 1: Users & Permissions

**Navigation:** `Users & Permissions`

### Test actions

- Review users list.
- Review roles and permission matrix.
- Open live permission simulator.
- Edit a user only if needed for test access.

### Create User input checklist

- Username: `demo_user_20261001_01`
- Email: `demo_user_20261001_01@kanabmotors.com`
- Full Name: `Demo User 20261001 01`
- Role: choose one current role, for example `SALES_MANAGER`, `PROCUREMENT`, `INVENTORY`, `FINANCE_MANAGER`
- Initial Password: `Demo@1234`
- Force Password Change: optional depending on test
- Permission overrides: optional; use only if testing granular access

### Edit User input checklist

- Full Name
- Email
- Role
- Active status
- Reset Password, if needed
- Permission overrides, if needed

### Expected result

- User saves successfully.
- Permission simulator reflects role/module access.
- Unauthorized modules remain hidden or blocked.

---

## Screen 2: Audit Trail Logs


**Navigation:** `Audit Trail Logs`

### Screen 3: Customer Directory & KYC Master (`/customers`)
* **Goal**: Show corporate/individual customer onboarding, TIN validation, and zero-state ledger summary cards.
* **Demonstration Steps**:
  1. Navigate to **Core Masters $\rightarrow$ Customers** (`/customers`).
  2. Click **+ Add Customer**.
  3. Enter customer details:
     * **Full Name / Organization Name**: `Oromia Logistics & Transport Enterprise`
     * **Customer Type**: `CORPORATE`
     * **Mobile Number**: `+251911889900`
     * **TIN Number**: `0058291048` (demonstrate 10-digit validation check)
     * **Email**: `procurement@oromialogistics.et`
  4. Click **Register Customer**.
  5. Select the customer in the table:
     * Highlight the **6 Financial Summary KPI Cards**:
       `Total Deposits: 0.00` · `Allocated: 0.00` · `Outstanding: 0.00` · `Customer Credit: 0.00` · `Excess: 0.00` · `Refundable: 0.00`.
  6. **Negative Test**: Attempt creating a customer with the exact same TIN or Mobile $\rightarrow$ show that system rejects duplicates with a clear error banner.


### Test inputs and filters

- Search / filter by entity type: `customer`, `booking`, `payment`, `delivery`, `stock_adjustment`, `stock_transfer`
- Filter by action type if available: `INSERT`, `UPDATE`, `DELETE`
- Review timestamp, actor, entity, before/after values, and metadata.

### Expected result

- System activity is visible and traceable after creating/updating records.

---

# PHASE 2 — Master Data

## Screen 3: Customers & Dealers

**Navigation:** `Customers & Dealers`

### Add Customer input checklist

- Customer Category: choose one:
  - `DIRECT_POS`
  - `DEALER`
  - `GOVERNMENT`
  - `CORPORATE` if available in the current dropdown
- Full Name / Organization Name: `KANAB E2E Customer 20261001 01`
- Mobile Number: `+251911010101` or any unique valid mobile
- TIN Number:
  - Required for Dealer/Government-type accounts
  - Example: `0101010101`
  - Optional for direct POS if UI allows
- Region: `Addis Ababa` or available region
- Address / Town: `Bole Subcity, Addis Ababa`

### Optional bank account inputs

- Bank Name: `CBE`
- Account Number: `1000101010101`
- Holder Name: `KANAB E2E Customer 20261001 01`
- Branch: `Bole Branch`

### Negative tests

- Duplicate mobile number.
- Duplicate TIN.
- Dealer/Government customer without TIN.

### Expected result

- Customer is created.
- Customer detail panel shows profile and financial summary cards.

---

## Screen 4: Product Master Data

**Navigation:** `Product Master Data`

### Add Product / Vehicle Model input checklist

Use this if the target demo product does not already exist.

- Item Code: `KB-MC-BOXER150-E2E-01`
- Product Name: `Bajaj Boxer BM150 Motorcycle E2E`
- Model: `Boxer BM150`
- Category: `MOTORCYCLE` or available vehicle category
- Brand: `Bajaj`
- Unit of Measure: `UNIT`
- Selling Price: `212750`
- Tax: `Standard VAT 15%`
- Reorder Level: `1`
- Weight KG: optional if visible
- Is Individually Tracked: enable for vehicle/VIN-tracked unit; disable for spare/non-serialized stock item
- Active status: enabled

### Negative tests

- Duplicate item code.
- Missing required name/code/price.

### Expected result

- Product appears in Product Master and in downstream dropdowns where applicable.

---

## Screen 5: Vehicle Units & Chassis

**Navigation:** `Vehicle Units & Chassis`

### Register Unit input checklist

- Model / Description: choose the created or existing vehicle product, e.g. `Bajaj Boxer BM150 Motorcycle`
- Chassis Number: `KANAB-2026-CHAS-E2E-001`
- Engine Number: `KANAB-2026-ENG-E2E-001`
- Current Warehouse: `Kality Assembly Plant Warehouse` or `Gotera Distribution Center`
- Import / Production Notes: `E2E demo vehicle unit`

### Status update input checklist

- New Lifecycle Status: choose valid status from dropdown, for example `AVAILABLE_FOR_SALE`, `RECEIVED`, `READY_FOR_DELIVERY`, `SOLD`
- Notes / Reason: required if visible

### Negative tests

- Duplicate chassis number.
- Duplicate engine number.

### Expected result

- Vehicle unit appears in registry.
- Lifecycle status and warehouse are shown.

---

# PHASE 3 — Procurement, Currency, Shipment, Landed Cost

## Screen 6: Suppliers Master

**Navigation:** `Suppliers Master`

### Add Supplier input checklist

- Supplier Name: `E2E Global Motors Supplier 20261001`
- Country: `India` or available country text
- Contact Person: `Demo Contact`
- Phone: `+919900001001`
- Email: `supplier20261001@example.com`
- Address: `Industrial Zone, Mumbai`
- Supplier Status: `Active` for suppliers that can be used on new purchase orders; use `Inactive` when the supplier must remain in history but should not be selected for new procurement

### Expected result

- Active supplier appears in the Purchase Order supplier dropdown.
- If changed to Inactive, supplier remains in the master list/history but is removed from new active procurement selection.

---

## Screen 7: Import Pipeline & Reports — Baseline Exchange Rates

**Navigation:** `Import Pipeline & Reports → Baseline Exchange Rates (NBE)`

### Existing rate validation

- ETB must show `1.0000` and be locked.
- USD/EUR should appear if configured.

### Add Currency input checklist

- Code: `GBP` or other valid uppercase code not already present
- Rate to ETB: `158.25`
- Click `Add Currency`

### Update Currency input checklist

- Select non-ETB currency.
- Click `Update Default Rate`.
- New rate: `158.50`
- Save.

### Expected result

- New currency appears on the exchange-rate page.
- New currency appears in Purchase Order currency dropdown.
- New currency appears in Shipment cost currency dropdown.
- ETB remains locked at `1.0000`.

---

## Screen 8: Purchase Orders

**Navigation:** `Purchase Orders`

### Create International Purchase Order input checklist

- Supplier Partner: select active supplier, e.g. `E2E Global Motors Supplier 20261001`
- Contract Currency: choose from dynamic exchange-rate list, e.g. `USD`, `EUR`, `GBP`, or `ETB`
- PO Date: current date
- Product Item: choose product, e.g. `Bajaj Boxer BM150 Motorcycle E2E`
- Quantity: `2`
- Unit Price: enter value in selected currency, e.g. `1150` for USD or `212750` for ETB
- Add Line Item: use if testing multiple products
- Contract Terms & Logistics Notes: `CIF Djibouti, E2E demo procurement order`

### Status action checklist

- Submit / Confirm PO if available for the user role.
- Cancel only if testing cancellation.

### Expected result

- PO is created with generated PO number.
- Currency is saved on PO and PO lines.
- PO lines become available for shipment creation after confirmation.

---

## Screen 9: Shipments & Landed Cost

**Navigation:** `Shipments & Landed Cost`

### Create Shipment input checklist

- Bill of Lading Number: `BL-E2E-20261001-001`
- Expected Arrival Date: future date
- Landed Cost Apportionment: choose one of `By Value (FOB CIF Price)`, `By Quantity (Vehicle Units)`, or `By Weight (Metric Kg)`
- Confirmed PO Lines: select one or more available confirmed PO lines to consolidate
- Ship Qty: use the available remaining quantity for the selected PO line, for example `1`
- Shipment Notes / Route Details: `Carrier: Maersk Demo Line; Origin: Mumbai Port; Destination: Djibouti Port; E2E demo shipment`

Notes:

- Supplier is inferred from the selected confirmed PO line, so there is no separate Supplier field in this modal.
- Shipment date is generated by the system when the shipment is created, so there is no separate Shipment Date field.
- Carrier, origin port, destination port, vessel, and container details are currently captured in `Shipment Notes / Route Details`, not as separate structured fields.

### Shipment stages to test

Current system stages include:

- `ORDERED`
- `SHIPPED`
- `AT_DJIBOUTI_PORT`
- `ETHIOPIAN_CUSTOMS_CLEARANCE`
- `IN_TRANSIT_INLAND`
- `RECEIVED`

### Add Cost Component input checklist

- Cost Component Type: select available type, e.g. Freight, Insurance, Customs, Port Handling
- Currency: choose from dynamic exchange-rate list
- Exchange Rate to ETB: auto-filled from baseline exchange rate; manually editable for snapshot if allowed
- Amount in selected currency: `500`
- Voucher Notes / Invoice Ref: `Invoice #E2E-FREIGHT-001`

### Receive Physical Vehicle Units into Stock input checklist

- Quantity to Receive: must not exceed shipped quantity
- Warehouse: select target warehouse if visible
- Chassis Number: `KANAB-2026-CHAS-E2E-002`
- Engine Number: `KANAB-2026-ENG-E2E-002`
- Notes: `Received from E2E shipment`

### Expected result

- Shipment stage updates correctly.
- Cost component is stored with currency and exchange-rate snapshot.
- Landed cost allocation works without rounding drift.
- Received units move into inventory/vehicle registry.

---

# PHASE 4 — Inventory & Warehouse

## Screen 10: Inventory & Warehouses — Stock Balances

**Navigation:** `Inventory & Warehouses`

### Stock Balance filters

- Search: item code, product name, or warehouse
- Warehouse dropdown: `All Warehouses`, `Kality Assembly Plant Warehouse`, `Gotera Distribution Center`

### Receive Non-Serialized Stock input checklist

Use this for spare parts / stock items that are not individually VIN tracked.

- Warehouse: select warehouse
- Stock Item: select non-serialized product item
- Quantity: `5`
- Source Type: choose one:
  - `OPENING_BALANCE`
  - `LOCAL_PURCHASE`
  - `MANUAL_RECEIPT`
  - `CORRECTION`
- Notes: `Opening physical count for E2E spare parts shelf`

### Expected result

- Stock balance increases.
- Product name displays correctly.
- Movement history records receipt.

---

## Screen 11: Inventory — Stock Transfers

### New Transfer input checklist

- Source Warehouse: `Gotera Distribution Center`
- Destination Warehouse: `Kality Assembly Plant Warehouse`
- Item / Vehicle: select stock item or vehicle unit depending on dropdown
- Quantity: `1` for non-serialized stock, or selected vehicle unit for VIN item
- Reason / Notes: `E2E inter-warehouse transfer`

### Approval and completion

- Approve transfer.
- Complete transfer.

### Expected result

- Source balance decreases.
- Destination balance increases.
- Movement history shows transfer out and transfer in.

---

## Screen 12: Inventory — Stock Adjustments

### New Adjustment input checklist

- Warehouse: select warehouse
- Stock Balance Item: select item with available quantity
- Quantity Delta: `-1` for damage test or `+1` for found stock
- Adjustment Reason Category: choose one, for example:
  - `DAMAGE`
  - `FOUND`
  - `COUNT_CORRECTION`
  - other current dropdown option
- Mandatory Audit Notes & Explanation: `E2E stock adjustment test`

### Approval checklist

- Open Stock Adjustments tab.
- Approve requested adjustment.

### Expected result

- Requested adjustment appears first.
- After approval, balance updates.
- Movement history shows adjustment.

---

## Screen 13: Inventory — Local Assembly Intake

### Record Assembly Receipt input checklist

- Product / Model: select vehicle product
- Warehouse: select warehouse
- Chassis Number: `KANAB-2026-CHAS-ASM-001`
- Engine Number: `KANAB-2026-ENG-ASM-001`
- Assembly Date: current date
- Notes: `E2E local assembly intake`

### Expected result

- Vehicle unit is created in selected warehouse.
- Movement history records local production/assembly intake.

---

## Screen 14: Inventory — Movement History Log

### Filters to test

- Date range: start and end dates
- Warehouse dropdown
- Item dropdown
- Movement type dropdown if visible
- Search / refresh

### Expected result

- Receipts, transfers, adjustments, and assembly movements are visible with correct quantity sign.

---

# PHASE 5 — Sales Pipeline

## Screen 15: Sales Enquiries & Quotes

**Navigation:** `Sales Enquiries & Quotes`

### New Enquiry input checklist

- Customer: select created customer
- Product / Model: select product
- Quantity: `1`
- Unit Price: auto-filled or manually confirmed
- Payment Mode: select available payment mode
- Salesperson: current user or selected salesperson if visible
- Notes / Terms: `E2E sales enquiry`

### Approval and conversion

- Create enquiry.
- Approve enquiry if workflow requires approval.
- Convert approved enquiry to booking.

### Expected result

- Enquiry number is generated.
- VAT/gross total preview calculates correctly.
- Converted enquiry becomes locked or marked converted.
- Booking is created or available for creation.

---

## Screen 16: Advance Bookings

**Navigation:** `Advance Bookings`

### Create Booking input checklist

- Customer: select created customer
- Vehicle Item: select product
- Order Quantity: `1`
- Unit Price (ETB): use product selling price or agreed test price
- Min Advance Req (ETB): system-calculated or enter value, e.g. 20% of gross
- Sales Representative Name: `System Administrator` or logged-in sales user
- Target Delivery Date: future date

### Transfer Booking Deposit input checklist

- Select Destination Booking
- Transfer Amount (ETB)
- Transfer Justification: `Customer redirected deposit to another order`

### Cancel Booking input checklist

- Cancellation Reason
- Deposit Re-routing option if booking has deposits

### Expected result

- Booking is created.
- Required advance and gross total are visible.
- Booking status changes after payment confirmation.

---

# PHASE 6 — Payments and Ledger

## Screen 17: BRV Receipts & Deposits

**Navigation:** `BRV Receipts & Deposits`

### Record Payment input checklist

- Customer: select created customer
- Link to Booking: select booking if applicable
- Amount: use enough to meet advance requirement, e.g. `100000`
- Payment Method: choose available method, e.g. bank transfer / cash / cheque depending on dropdown
- Bank: `Commercial Bank of Ethiopia` or visible bank option
- Reference Number: `CBE-E2E-20261001-001`
- Reference Date: current date
- Notes: `E2E deposit receipt`

### Confirmation checklist

- Submit/save receipt.
- Confirm payment as finance role.

### Expected result

- Payment status changes to confirmed.
- Booking deposit updates.
- Customer ledger posts credit transaction.

---

## Screen 18: Customer Ledger & SOA

**Navigation:** `Customer Ledger & SOA`

### Statement filters and inputs

- Customer selector: select created customer
- Date range if visible
- Search / refresh if visible

### Manual Ledger Adjustment input checklist

- Adjustment Type: `CREDIT` or `DEBIT`
- Amount: `50000`
- Reference: `ADJ-E2E-20261001-001`
- Audit Reason: `E2E ledger adjustment validation`

### Expected result

- Deposits, allocated amount, outstanding balance, credit, excess, and refundable balance update correctly.
- Ledger row is append-only and export/print works.

---

# PHASE 7 — Allotment, Invoice, Delivery

## Screen 19: Vehicle Allotments

**Navigation:** `Vehicle Allotments`

### Create Allotment input checklist

- Booking: select eligible confirmed booking
- Vehicle Unit / Chassis: select available vehicle unit
- Notes: `E2E allotment request`

### Approval checklist

- Submit allotment request.
- Approve request with authorized user.

### Expected result

- Vehicle status changes to allotted/reserved.
- Same chassis cannot be allotted twice.

---

## Screen 20: Sales Invoices & VAT

**Navigation:** `Sales Invoices & VAT`

### Create Invoice input checklist

- Target Booking Order: select confirmed / allotted booking
- Review preview:
  - Customer
  - Item
  - Quantity
  - Unit Price
  - VAT
  - Gross Total
  - Customer Deposited on Booking

### Approval checklist

- Create invoice.
- Approve invoice if workflow requires.
- Print/export if required.

### Expected result

- Invoice number is generated.
- VAT and totals match booking/product values.
- Invoice appears in Reports & Analytics.

---

## Screen 21: Deliveries & Handover

**Navigation:** `Deliveries & Handover`

### PDI Checklist input checklist

- Select vehicle / delivery row.
- Record PDI Inspection.
- Complete all checklist items shown in the modal.
- Notes: `E2E PDI completed`
- Submit PDI Results.

### Delivery authorization input checklist

- Target Booking Order
- Vehicle Unit / Chassis
- Customer / recipient details if visible
- Representative / driver name if visible
- ID card / reference if visible
- Handover notes if visible

### Gate Pass checklist

- Generate Official Gate Pass.
- Print / preview gate pass.

### Expected result

- PDI sets unit to `READY_FOR_DELIVERY`.
- Delivery authorization sets unit/delivery to final delivered state.
- Gate pass is generated.

---

# PHASE 8 — Settlement, Refunds, Documents, Approvals

## Screen 22: Excess & Refund Payouts

**Navigation:** `Excess & Refund Payouts`

### Excess routing input checklist

- Customer: select customer with excess/credit
- Action: choose routing option, e.g. refundable balance or booking allocation
- Amount: amount available
- Notes: `E2E excess routing`

### Refund request input checklist

- Customer
- Amount
- Refund Reason
- Refund Method
- Bank account / payout reference if visible
- Notes: `E2E refund request`

### Refund approval ladder

- Review
- Approve
- Finance Process
- Confirm Payout

### Expected result

- Invalid over-refund is blocked.
- Valid refund posts ledger debit after payout confirmation.

---

## Screen 23: Approval Queue & Policies

**Navigation:** `Approval Queue & Policies`

### Inputs and filters

- Search request number / entity type
- Workflow/entity filter if visible
- Status filter if visible
- Decision notes: `E2E approval validation`

### Expected result

- Pending approvals from enquiries, payments, allotments, refunds, stock adjustments, and transfers appear when generated.
- Approve/reject actions update source module status.

---

## Screen 24: Unified Document Center

**Navigation:** `Unified Document Center`

### Upload / registry input checklist

- Entity Type: select available type
- Entity ID: enter related record ID
- Document Type: choose or enter type
- File: upload valid test PDF/JPG/PNG
- Notes / description if visible

### Filters

- Search file name, type, entity ID
- Entity type filter
- Document type filter

### Expected result

- Document is stored and searchable.
- Related entity document count updates if available.

---

# PHASE 9 — Dashboard and Reporting

## Screen 25: Executive Dashboard

**Navigation:** `Executive Dashboard`

### Filters to test

- Today
- This Week
- This Month
- Custom date range
- Invalid custom date range: start date after end date
- Refresh

### KPI cards to validate

- Total period sales
- Approved invoice count
- Available inventory
- Reserved inventory
- Pending allotments
- Ready for delivery
- Total bookings
- Customer deposits
- Outstanding customer balance
- Available credit
- Excess payments
- Pending refunds
- Processed refunds

### Charts / matrix to validate

- Financial KPI chart
- Fleet KPI chart
- Salesperson revenue chart
- Sales Performance Matrix: Product × Salesperson

### Expected result

- Date filters change period-based values.
- Inventory values show current/as-of values correctly.
- Sales matrix only shows rows when selected date range includes invoice data.

---

## Screen 26: Reports & Analytics Hub

**Navigation:** `Reports & Analytics Hub`

### Common report controls to test

- Main tabs:
  - Sales Reports
  - Operational Reports
  - Inventory & Fleet Reports
  - Customer Financial Reports
- Search current report
- Status/type filters where available
- Chart view
- Flip to table view
- CSV export
- Refresh data

### Sales report tabs

- Daily Sales
- Monthly Trend
- By Vehicle Model
- By Category
- By Customer
- By Region
- By Salesperson

### Operational report tabs

- Sales Invoices Report
- Vehicle Deliveries Report
- Enquiries Pipeline
- Bookings Queue

### Inventory/Fleet report checks

- Current stock balances and reorder points
- Fleet lifecycle status distribution
- Warehouse, model, status, and units count must be populated

### Customer financial report checks

- Customer code
- Customer name
- Type
- Total debited
- Total credited
- Net receivable

### Expected result

- Reports reflect data created in earlier phases.
- Search/filter works in chart and table view.
- Export works for each report.

---

## Screen 27: Import Pipeline & Reports

**Navigation:** `Import Pipeline & Reports`

### Tabs to test

- Shipment Pipeline & Bottlenecks
- Purchase Order Fulfillment
- Baseline Exchange Rates (NBE)

### Expected result

- Shipment pipeline shows current shipment stages.
- PO fulfillment shows ordered/received/open values.
- Exchange rates show ETB and configured dynamic currencies.

---

# Final UAT Checklist

| Area | Expected Status | Result |
|---|---|---|
| Login and role access | Correct users can access correct modules | `[ ]` |
| Customer creation | Unique customer saves and duplicate validation works | `[ ]` |
| Product setup | Product appears in downstream workflows | `[ ]` |
| Vehicle unit setup | Unique chassis/engine enforced | `[ ]` |
| Dynamic exchange rates | New currency appears in PO and shipment dropdowns | `[ ]` |
| Purchase order | PO created with selected dynamic currency | `[ ]` |
| Shipment and landed cost | Cost component saves with currency/rate snapshot | `[ ]` |
| Inventory receipt/transfer/adjustment | Balances and movement history update | `[ ]` |
| Enquiry and booking | VAT/gross/advance values calculate correctly | `[ ]` |
| Payment confirmation | Booking and ledger update | `[ ]` |
| Allotment | Chassis is locked to booking | `[ ]` |
| Invoice | VAT invoice created from booking | `[ ]` |
| PDI and delivery | Unit moves to ready/delivered state | `[ ]` |
| Settlement/refund | Excess/refund validations work | `[ ]` |
| Reports | Search, filter, flip, export work | `[ ]` |
| Dashboard | KPIs, filters, matrix, charts work | `[ ]` |
| Audit | Key actions are traceable | `[ ]` |

---

## Known Notes for Testers

- Do not reuse the same mobile, TIN, chassis, engine, or payment reference in repeated tests.
- If a report looks empty, confirm the selected date range includes the records being tested.
- ETB exchange rate is locked at `1.0000`.
- New currencies are configured in `Import Pipeline & Reports → Baseline Exchange Rates (NBE)`.
- Temporary test currencies should be removed or kept only if approved as real business configuration.


