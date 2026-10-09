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
9. Section 10 excess funds credit routing and Section 11 refund management lifecycle.
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

### Test actions & filters
- Search / filter by entity type: `customer`, `booking`, `payment`, `refund`, `excess`, `delivery`, `stock_adjustment`, `stock_transfer`
- Filter by action type if available: `INSERT`, `UPDATE`, `DELETE`
- Review timestamp, actor, entity, before/after values, and metadata.
- Verify immutability: audit logs cannot be edited or deleted by any user persona.

### Expected result
- All system activity (including customer onboarding, excess routing, refund state transitions, and payout confirmation) is visible and traceable.

---

# PHASE 2 — Master Data

## Screen 3: Customer Directory & KYC Master

**Navigation:** `Core Masters → Customers & Dealers` (`/customers`)

### Demonstration Steps
1. Navigate to **Core Masters → Customers** (`/customers`).
2. Click **+ Add Customer**.
3. **Input Checklist**:
   - Customer Category: choose `DIRECT_POS`, `DEALER`, `GOVERNMENT`, or `CORPORATE`
   - Full Name / Organization Name: `Oromia Logistics & Transport Enterprise` (or `KANAB E2E Customer 20261001 01`)
   - Mobile Number: `+251911889900`
   - TIN Number: `0058291048` (demonstrate 10-digit validation check; required for Dealer/Government/Corporate)
   - Email: `procurement@oromialogistics.et`
   - Region: `Addis Ababa` or available region
   - Address / Town: `Bole Subcity, Addis Ababa`
4. **Bank Account Registration (KYC & Wire Refunds)**:
   - Bank Name: `Commercial Bank of Ethiopia (CBE)`
   - Account Number: `1000101010101`
   - Account Holder Name: `Oromia Logistics & Transport Enterprise`
   - Branch: `Bole Airport Branch`
   - Primary Account: `Yes` (used for Section 11 Wire Refund Payouts)
5. Click **Register Customer**.
6. Select the customer in the table to view the **6 Financial Summary KPI Cards**:
   - `Total Deposits: ETB 0.00`
   - `Allocated: ETB 0.00`
   - `Outstanding: ETB 0.00`
   - `Customer Credit: ETB 0.00`
   - `Unallocated Excess: ETB 0.00`
   - `Refundable Balance: ETB 0.00`

### Negative tests
- Attempt creating a customer with duplicate mobile number $\rightarrow$ System rejects with error banner.
- Attempt duplicate TIN $\rightarrow$ System rejects with error banner.
- Dealer / Corporate customer without TIN $\rightarrow$ System blocks submission.

### Expected result
- Customer profile saves successfully.
- Bank account is linked and ready for sensitive masked display in Section 11 refund workflows.
- Financial summary cards initialize cleanly at zero.

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

## Screen 22: Excess Funds, Credit Routing & Section 11 Refund Management

**Navigation:** `Financial Engine → Excess Funds & Refunds` (`/settlement`)

### Goal
Demonstrate compliance with **Client Business Rules Module 9 & Sections 10 / 11**:
1. **Section 10 Excess Payment & Credit Routing**: Instant reallocation of unallocated customer deposits between Store Credit and Refundable Balance.
2. **Section 11 Standardized Refund Requests**: Master category dropdown, registered bank account selection with sensitive account number masking (`••••••••1234`), and real-time Approval Tier badges.
3. **4-Stage Approval Pipeline & Step 4 Finance Payout**: Mandatory Bank Reference / Transaction ID, Payout Date, Payment Method, Audit Notes, and automatic Customer Ledger debit posting.

---

### Tab 1: Section 10 — Excess Deposits & Credit Routing

#### Demonstration Steps
1. Navigate to **Financial Engine → Excess Funds & Refunds** and select tab **Excess Deposits & Credit Routing**.
2. Locate a customer with unallocated excess funds in the table (columns: `CUSTOMER CODE`, `NAME / COMPANY`, `UNALLOCATED EXCESS`, `STORE CREDIT`, `REFUNDABLE BALANCE`).
3. Click **Route Deposit Funds** to open the allocation modal.
4. **Input Checklist**:
   - **Target Allocation / Action**:
     - `Transfer to Refundable Balance` (enables customer wire/cash refund payouts)
     - `Transfer to Store Credit` (allocates to customer credit for future vehicle bookings)
   - **Amount (ETB) \***: Enter desired transfer amount (e.g. `25000.00`).
   - **Internal Audit Justification & Notes**: `Routing excess wire deposit to refundable balance per customer written request`.
5. **Live Allocation Impact Simulation**:
   - Verify that the simulation banner updates dynamically:
     - `Remaining Excess`: `[Available - Transfer]`
     - `Projected Target Balance`: `[Current Target + Transfer]`
6. Click **Confirm Routing**.

#### Negative Tests
- Enter `0` or negative amount $\rightarrow$ Blocked with in-modal error alert (`<ModalErrorAlert>`).
- Enter amount exceeding unallocated excess balance $\rightarrow$ Blocked with clear validation error: *"Amount cannot exceed available unallocated excess"*.
- Modal remains open with error alert displayed on failure.

#### Expected Result
- Toast notification: `ETB X successfully routed to [Store Credit / Refundable Balance]!`.
- Customer financial summary and ledger balances update immediately.

---

### Tab 2: Section 11 — Customer Refund Management Lifecycle

#### Step 1: Initiate Refund Request
1. Switch to tab **Customer Refund Requests** and click **+ Initiate Refund Request**.
2. **Input Checklist**:
   - **Customer \***: Select customer from dropdown.
     - *Verified Balance Banner*: System displays live `Available Refundable Balance: ETB X,XXX.XX` (green badge).
   - **Target Customer Bank Account**:
     - System displays registered accounts with **sensitive account masking** (e.g. `Commercial Bank of Ethiopia (CBE) — ••••••••1010 (Oromia Logistics) ★ Primary`).
     - Select verified destination bank account.
     - *(If customer has no registered account, an amber notice alerts user)*.
   - **Refund Amount (ETB) \***:
     - Enter amount (e.g. `45000.00`) or click `Max Available (ETB X)`.
     - **Dynamic Approval Tier Badge**: Watch real-time tier calculation directly beneath input:
       - `≤ ETB 10,000` $\rightarrow$ **Tier 1: Finance Officer** (Cyan badge)
       - `ETB 10,001 – 50,000` $\rightarrow$ **Tier 2: Finance Manager** (Amber badge)
       - `> ETB 50,000` $\rightarrow$ **Tier 3: Senior Management / Executive** (Rose badge)
   - **Disbursement Method \***: Select `Bank Wire Transfer`, `Cashier Payment Order (CPO)`, `Bank Cheque`, or `Cash Payout`.
   - **Refund Reason (Section 11 Master Category) \***: Select from standardized dropdown:
     - `Excess Payment (customer paid more than required amount)`
     - `Booking Cancellation (booking cancelled and advance refundable)`
     - `Vehicle Model Change (existing payment returned or adjusted)`
     - `Inventory Unavailable (vehicle cannot be supplied)`
     - `Customer Cancellation (customer requested cancellation)`
     - `Other Approved Reason (specify below)`
   - **Specific Justification & Details** *(Mandatory if "Other Approved Reason" selected)*:
     - Enter detailed justification: `Management approved goodwill refund due to extended assembly transit delay`.
3. Click **Submit Request**.

#### Negative Tests
- Enter amount exceeding available refundable balance $\rightarrow$ Inline error & API block (SRS §7.4 validation: *"Refund request exceeds available refundable balance"*).
- Select `Other Approved Reason` without entering explanation $\rightarrow$ In-modal validation alert: *"Please specify the detailed explanation for Other Approved Reason"*.
- Submit without customer or zero amount $\rightarrow$ Modal stays open with clear error banner.

---

#### Step 2: 4-Stage Approval & Audit Ladder
The table displays the new refund row with:
- **REFUND REF**: `REF-XXXXXXXX`
- **CUSTOMER**: Name, Code, and Masked Bank Account (`Building` icon + `Bank • ••••••••1010`)
- **REASON & METHOD**: Standard category & payment method
- **AMOUNT (ETB)**: Amount + Approval Tier badge (`Tier 1 / Tier 2 / Tier 3`)
- **AUDIT PIPELINE**: `REQUESTED` $\rightarrow$ `REVIEWED` $\rightarrow$ `APPROVED` $\rightarrow$ `FINANCE PROCESSED` $\rightarrow$ `CONFIRMED`

**Execute the Sequential Workflow**:
1. **Sales / Operations Review**:
   - User with `REFUNDS_REVIEW` permission clicks **Review**.
   - Status transitions to `REVIEWED`.
2. **Manager Approval**:
   - User with `REFUNDS_APPROVE` permission clicks **Manager Approve**.
   - Status transitions to `APPROVED`, routed to Finance.
3. **Finance Audit**:
   - User with `REFUNDS_PROCESS` permission clicks **Finance Audit**.
   - Status transitions to `FINANCE_PROCESSED`.
4. **Step 4: Finance Payout Confirmation (Disbursement)**:
   - Click **Confirm Payout** $\rightarrow$ opens the dedicated **Confirm Finance Payout** modal.
   - **Read-Only Audit Summary**:
     - Refund Request Ref, Customer Name, Approved Amount, Destination Account (Masked).
   - **Mandatory Payout Inputs**:
     - **Bank Ref / Transaction ID \***: Enter bank wire transaction reference (e.g. `FT2610098234` or `CPO-98124`).
     - **Disbursement Date \***: Today's date or bank execution date.
     - **Actual Amount Disbursed (ETB) \***: Verified payout amount (defaults to approved refund amount).
     - **Payment Method \***: `BANK_TRANSFER`.
     - **Finance Audit Notes / Comments**: `Disbursed via CBE Corporate Internet Banking; debit advice attached`.
   - Click **Confirm & Post Payout**.

#### Rejection Flow (Optional Branch)
- At any pending stage prior to payout, authorized user clicks **Reject**.
- Opens Reject modal requiring **Mandatory Rejection Explanation**.
- On submission, status transitions to `REJECTED`. Customer refundable balance remains intact with zero deduction.

---

### Expected Result
- Toast: `Refund payout for REF-XXXXXXXX successfully confirmed! Ledger settled.`.
- Refund status updates to **CONFIRMED** (`Settled & Debited` green checkmark).
- Customer refundable balance is immediately debited by the payout amount.
- An immutable `DEBIT` transaction is automatically posted to the **Customer Ledger** with the bank transaction ID in the audit reference.
- All actions logged in **Audit Trail Logs** with actor ID, timestamp, and metadata.

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
| Excess & Refunds (Sec 10 & 11) | Excess credit routing, masked bank accounts, approval tiers, payout modal & ledger debit | `[ ]` |
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


