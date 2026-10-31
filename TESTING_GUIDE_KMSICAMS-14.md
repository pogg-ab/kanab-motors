# Testing & Verification Guide: KMSICAMS-14 Client Feedback Implementation Backlog

This comprehensive testing guide validates all **17 client feedback enhancement tasks** (`KMSI-14-01` through `KMSI-14-17`) across the 6 implementation phases in KANAB Motors ERP.

---

## Overview of Implemented Backlog Items

| Task ID | Component / Area | Implementation Summary |
|---|---|---|
| **KMSI-14-01** | Advance Order Booking | Optional supporting attachments (Order contracts, ID, deposit slips) |
| **KMSI-14-02** | Bank Receipt Voucher (BRV) | Optional attachments for bank deposit slips and transfer confirmations |
| **KMSI-14-03** | Customer Refund Requests | Supporting documents & written letters attached throughout approval pipeline |
| **KMSI-14-04** | Spare Parts POS & Invoices | Attachments for signed delivery notes, gate passes, VAT invoice copies |
| **KMSI-14-05** | Excess Payment Reallocation | Transfer excess customer payments across different customer bookings with audit trail |
| **KMSI-14-06** | Vehicle Physical Custody | Customer-owned vehicles retained in company stock isolated from sellable inventory |
| **KMSI-14-07** | Financial Reporting | Dedicated Credit Sales Report (Vehicles & Parts on credit, collections, aging, overdue) |
| **KMSI-14-08** | Inventory Reporting | Stock Aging Tracking Report with configurable aging buckets (`0-30`, `31-60`, `61-90`, `91-180`, `>180` days) |
| **KMSI-14-09** | Approval Notifications | Automated reminder & escalation engine scanning pending approvals at `2h`, `4h`, `8h`, `24h` thresholds |
| **KMSI-14-10** | Customer Master | Contact Person, Email, Preferred Contact Method, Business/Occupation |
| **KMSI-14-11** | Sales Enquiry Details | Enquiry No, Enquiry Date, Lead Source, Branch/Showroom |
| **KMSI-14-12** | Vehicle Requirements | Vehicle Category, Vehicle Reference, Preferred Colour, Required Delivery Date, Homologation, Charger |
| **KMSI-14-13** | Budget & Payment Prefs | Target Budget, Currency, Payment Method, Financing Required, Expected Deposit, Timeline, Bank |
| **KMSI-14-14** | Customer Notes | Customer Requirements and Audit Notes |
| **KMSI-14-15** | Two-Stage Approval | Sales Representative Review & Endorsement $\rightarrow$ Sales Manager Final Approval Workflow |
| **KMSI-14-16** | Product Master Specifications | Model Year, Powertrain (`BEV`, `PHEV`, `HEV`, `ICE`), Condition (`NEW`, `USED`), Fuel Type, EV Driving Range |
| **KMSI-14-17** | Advance Order Booking Snapshot | Vehicle Snapshot (Brand + Model + Year + New/Used), Price, Expected Deposit, Confirmed Deposit, Outstanding Balance |

---

## Phase 1: Master Data & Enquiry Enrichment

### Test 1: Customer Master Data Enrichment (`KMSI-14-10`)
1. Navigate to **Customers** (`/customers`).
2. Click **Add Customer**.
3. Select Customer Type (e.g., `DEALER` or `DIRECT_POS`).
4. Fill in:
   - Full Name: `Abyssinia Logistics PLC`
   - Mobile: `+251911223344`
   - Contact Person: `Ato Tadesse Haile`
   - Email: `tadesse@abyssinialogistics.com`
   - Preferred Contact Method: `EMAIL`
   - Business / Occupation: `Freight Forwarding & Heavy Haulage`
   - Town / Address: `Bole Subcity, Woreda 03, Addis Ababa`
5. Save the customer.
6. Click on the customer card to open details:
   - Verify that **Contact Person**, **Email Address**, **Preferred Contact Method**, and **Business / Occupation** are displayed correctly.
7. Click **Edit Customer**, update the email and occupation, and verify persistence.

### Test 2: Product Master Vehicle Specifications (`KMSI-14-16`)
1. Navigate to **Product Catalog** (`/products`).
2. Click **Create New Product**.
3. Fill in product basic fields:
   - Item Code: `BYD-ATTO3-2024`
   - Item Name: `BYD Atto 3 Superior Extended`
   - Model Year: `2024`
   - Powertrain: `BEV (Pure Electric)`
   - Condition: `NEW (Brand New)`
   - Fuel / Energy Type: `Electric`
   - EV Driving Range: `420` km
   - Battery Power: `60.48` kWh
   - Selling Price: `ETB 3,850,000`
4. Save the product.
5. In the product catalog list/table, verify the badges:
   - `2024 · NEW`
   - `BEV · 420km`
   - `🔋 60.48 kWh`

---

## Phase 2: Sales Enquiry Details & Two-Stage Approval Workflow

### Test 3: Sales Enquiry Enrichment & Draft Submission (`KMSI-14-11` to `KMSI-14-14`)
1. Navigate to **Sales Enquiries** (`/enquiries`).
2. Click **New Sales Enquiry**.
3. Verify all enriched sections:
   - Customer & Vehicle selection
   - Lead Source (`Walk-in`, `Referral`, `Website`, `Social Media`, etc.)
   - Branch / Showroom (`Bole Flagship Showroom`, etc.)
   - Vehicle Category & Preferred Colour
   - Registration / Homologation Needs
   - EV Charger Included toggle
   - Target Budget, Currency, Financing Requirement, Expected Deposit
   - Customer Requirements & Notes
4. Submit the enquiry. It is initialized in `SUBMITTED` or `DRAFT` status with a unique Enquiry Number.

### Test 4: Two-Stage Approval Workflow (`KMSI-14-15`)
1. In the enquiries list:
   - Find the newly submitted enquiry in status `SUBMITTED`.
2. Notice the action button: **Rep Endorse** (Stage 1).
3. Click **Rep Endorse**:
   - The modal appears: *"Stage 1: Sales Rep Review"*.
   - Enter audit notes (e.g., *"Customer documents verified, spec availability confirmed"*).
   - Click **Approve / Endorse**.
   - Status transitions to `SALES_REP_APPROVED`.
4. Now, notice the next action button: **Mgr Approve** (Stage 2).
5. Click **Mgr Approve**:
   - The modal appears: *"Stage 2: Sales Manager Approval"*.
   - Enter manager review notes.
   - Click **Confirm Approval**.
   - Status transitions to `APPROVED`.
6. Once `APPROVED`, the **Convert to Booking** button becomes active.
7. Attempting to convert an unapproved enquiry (or calling the backend booking API) will be blocked with a 400 Bad Request error.

---

## Phase 3: Supporting Attachments on Transactions

### Test 5: Booking Supporting Attachments (`KMSI-14-01`, `KMSI-14-17`)
1. Navigate to **Advance Bookings** (`/bookings`).
2. In the bookings table, verify the vehicle snapshot displays `Brand · Model · Year · Condition`.
3. Locate any booking and click the **Docs** (`Paperclip`) button.
4. The `Booking Attachments` modal opens:
   - Select document type (e.g., `Signed Order Contract` or `Bank Deposit Slip`).
   - Select a sample PDF or image file and click **Upload File**.
   - Verify upload completes and document appears in the attached documents list with filename, size, upload date, and document type tag.
   - Click download/view icon to verify access.

### Test 6: BRV Bank Receipt Voucher Attachments (`KMSI-14-02`)
1. Navigate to **Payments & Receipts** (`/payments`).
2. On any BRV row, click the **Paperclip** button.
3. Upload a sample bank slip or transfer advice.
4. Verify attachment is retained and accessible to finance audit.

### Test 7: Customer Refunds Attachments (`KMSI-14-03`)
1. Navigate to **Settlement & Refunds** (`/settlement`).
2. In the Refunds table, click the **Docs** button on any refund row.
3. Attach a customer refund request letter or bank confirmation.

### Test 8: Spare Parts POS Attachments (`KMSI-14-04`)
1. Navigate to **Spare Parts** (`/spare-parts`) $\rightarrow$ **Sales History**.
2. Click **Docs** on any sale record.
3. Attach signed gate pass or VAT invoice copy.

---

## Phase 4: Financial & Custody Controls

### Test 9: Transfer Excess Customer Payments Across Bookings (`KMSI-14-05`)
1. Navigate to **Payments & Receipts** (`/payments`).
2. Click **Transfer Excess Funds** in the header.
3. The modal *Transfer Excess Customer Payment* opens:
   - **Source Booking**: Select a booking that has deposited funds.
   - **Destination Booking**: Select a destination booking (can belong to a different customer).
   - **Transfer Amount**: Enter ETB amount.
   - **Customer Authorization & Ledger Reason**: Enter client authorization reference (minimum 5 chars).
4. Click **Execute Fund Transfer**:
   - The backend records the transfer in `customer_payment_transfer`.
   - Posts double-entry ledger entries adjusting customer balances.
   - Updates source and destination booking deposit totals and outstanding balances in real time.

### Test 10: Customer-Owned Stock Retained in Company Custody (`KMSI-14-06`)
1. Navigate to **Vehicles** (`/vehicles`).
2. Locate a sold or allotted vehicle.
3. Click **Custody** (`Shield` button):
   - Select the owning customer.
   - Enter custody retention reason (e.g., *"Customer requested deferred delivery until showroom completion"*).
   - Enter expected handover date.
   - Click **Confirm Custody Retention**.
4. Observe the vehicle unit:
   - It displays a prominent `🛡️ Customer Custody` badge.
   - Ownership status is changed to `CUSTOMER_OWNED` in database.
   - It is excluded from sellable inventory.
5. When the customer arrives for handover:
   - Click **Handover** (`CheckCircle` button).
   - Confirm completion: vehicle custody is released and handover timestamp is stamped.

---

## Phase 5: Financial & Inventory Reporting

### Test 11: Credit Sales Report (`KMSI-14-07`)
1. Navigate to **Reports & Analytics Hub** (`/reports`).
2. Click on the **Credit Sales & Stock Aging (KMSI-14)** tab.
3. Select **Credit Sales Report**:
   - Verify KPI summary cards:
     - Total Credit Sales
     - Total Collected
     - Outstanding Receivables
     - Overdue Balances
   - Filter by vehicle sales vs spare parts sales.
   - Search by customer name or invoice number.
   - Click **Export CSV** and verify the generated file format.

### Test 12: Stock Aging Tracking Report (`KMSI-14-08`)
1. In the same view, click **Stock Aging Tracking (KMSI-14)**.
2. Verify aging bucket breakdown cards:
   - `0-30 Days`, `31-60 Days`, `61-90 Days`, `91-180 Days`, `>180 Days`.
3. Filter by category (Individual Vehicles by VIN/Chassis vs Spare Parts SKU).
4. Inspect rows:
   - Shows days in stock, age bucket badge, unit price/value, warehouse.
5. Click **Export CSV** to download the comprehensive stock aging manifest.

---

## Phase 6: Automated Approval Notifications Engine

### Test 13: Approval Reminder & Escalation Engine (`KMSI-14-09`)
1. Navigate to **Approvals** (`/approvals`).
2. Click **Reminder Engine** (`Bell` icon in header).
3. The modal displays:
   - **Immediate Approval Scan**: Click **Scan Now** to trigger real-time scan.
   - **Configured Reminder Thresholds**: Shows `2h`, `4h`, `8h`, and `24h` intervals with active toggles.
   - Click **Pause** or **Activate** on any rule to toggle state.
   - **Dispatched Reminders Audit Trail**: Displays log history with sent time, workflow type, interval, recipient, and escalation flag.

