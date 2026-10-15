# KM-ICAMS: Final Changes Testing & Verification Guide
## Module 1 & Module 2 SRS Updates (Client Acceptance Walkthrough)

**Document Reference:** `FINAL_CHANGES_KMICAMS.md`  
**Application:** KANAB Motors Integrated Commercial & Assembly Management System (KM-ICAMS)  
**Author:** AI Engineering & Pair Programming Team  
**Reviewer:** Mohammed Oumer / Kanab Management  
**Target Environments:**
- Local Development: `http://localhost:5173`
- Hostinger VPS Production: Your configured VPS domain/IP  
**Credentials:**
- **Admin:** `admin` or `admin@kanabmotors.com` / `Admin@123`
- **Sales Manager:** `sales` or `sales@kanabmotors.com` / `Sales@123`

---

## 🗺️ 4-Round Implementation & Testing Roadmap

To easily track, differentiate, and verify all delivered features across the 4 review cycles, this guide is structured into 4 distinct Rounds:

| Round | Focus / Scope | Stories Covered | Test Suites |
|---|---|---|---|
| **🔵 ROUND 1** | **Core Master Data & Tax Flags** | Stories 1.1, 2.1, 2.2, 2.3 | **Test Suites 1, 2, 3, 4** |
| **🟣 ROUND 2** | **Pre-Advance Slip & 100% Advance Booking** | Stories E16–E18, B3–B4 | **Test Suites 5, 6** |
| **🟠 ROUND 3** | **Financial Controls, Credit Transfer, Non-Cash WHT & Dual Delivery Docs** | Stories P14, X9–X10, IV14, DL5 | **Test Suites 7, 8, 9, 10** |
| **🟢 ROUND 4** | **Sales Invoice & Multi-Tax Settlement Suite (Jira KMSICAMS-11)** | Stories IV1–IV13 | **Test Suite 11** |

---

## Executive Summary of Tested Changes (by Round)

### 🔵 Round 1: Customer Compliance & Vehicle Master Data Attributes
| Story # | Scope / Description | Implementation Details |
|---|---|---|
| **Story 1.1** | **Customer WHT Flag** | Added `withholdingTaxFlag` to Customer entity, DB column, create/edit modals, directory table badge, and profile view |
| **Story 2.1** | **Vehicle Attributes** | Added `colour`, `engine_capacity_cc`, `battery_power_kwh` to Product Items, tables, and lifecycle tracking |
| **Story 2.2** | **Reference Data Lookups** | Added `vehicle_color` lookup table with 7 seeded colors, plus REST endpoints `/api/lookups/colors` and `/api/lookups/uoms` |
| **Story 2.3** | **Multi-Tax Configuration** | Multi-tax tiers for VAT (15%), Excise duty, and WHT (2%) with customer and vehicle applicability |

### 🟣 Round 2: Pre-Advance Slip & 100% Advance Booking Mandate
| Story # | Scope / Description | Implementation Details |
|---|---|---|
| **Stories E16–E18**| **Pre-Advance Slip Model & Expiry** | Auto-generated upon enquiry approval with sequence `PAS-YYYY-NNNNN`, 3-day expiry indicator, and printable modal |
| **Stories B3 & B4**| **100% Advance Booking Origin** | Advance booking slip selector, converts slip, and calculates 100% full gross vehicle advance requirement |

### 🟠 Round 3: Financial Risk Controls, Credit Transfer & Delivery Documentation
| Story # | Scope / Description | Implementation Details |
|---|---|---|
| **Story P14** | **CEO Installment Gate** | Split / Installment deposit plan requires CEO approval gate modal before payment confirmation |
| **Stories X9 & X10**| **Customer Credit Transfer** | Atomic two-sided ledger posting of balancing debit and credit entries with row-level concurrency safety and transfer UI modal |
| **Story IV14** | **Non-Cash WHT Settlement** | Atomic `WHT_SETTLEMENT` credit ledger posting, physical certificate tracking, and Finance WHT Hub |
| **Story DL5** | **Two Printed Delivery Documents** | Official printable Delivery Voucher (Gate Pass) + Handover Form with 6-item Handover Pack & customer legal declaration |

### 🟢 Round 4: Jira KMSICAMS-11 (Sales Invoice and Settlement Management)
| Story # | Scope / Description | Implementation Details |
|---|---|---|
| **Stories IV1–IV13**| **Sales Invoice & Multi-Tax Settlement Suite** | Complete multi-tax evaluation engine (VAT 15%, Three-Wheeler Excise 5%, Motorcycle Excise 10%, WHT 2%), Net Customer Payable formula, deposit allocation, excess deposit identification, vehicle transition to SOLD, booking SETTLED, idempotent INVOICE_CHARGE customer ledger postings, and 7 automated unit tests |

---

# 🔵 ==========================================================================
# 🔵 ROUND 1: Customer Compliance & Vehicle Master Data Attributes
# 🔵 Stories: 1.1, 2.1, 2.2, 2.3 | Test Suites: 1, 2, 3, 4
# 🔵 ==========================================================================

## Test Suite 1: Customer Withholding Tax (WHT) Flag (Story 1.1)

### Test Case 1.1: Register a WHT-Liable Commercial Customer
1. In the left navigation menu, click **Customers** (icon: 👥).
2. Click the top-right button **+ New Customer**.
3. Fill in the required fields:
   - **Customer Type:** Select `DEALER` or `DIRECT_POS`
   - **Full Name / Business Name:** `Abyssinia Logistics PLC [TEST-WHT]`
   - **Mobile Number:** `+251911223344`
   - **TIN Number:** `0012345678`
   - **Region:** Select any region (e.g., `Addis Ababa`)
   - **Town / City:** `Bole Subcity`
4. **Locate the Withholding Tax (WHT) Toggle Card:**
   - Observe the card title: **Withholding Tax (WHT) Liable**
   - Read the subtitle: *"Customer holds legal exemption or is designated to deduct/pay Withholding Tax (2% commercial WHT rules)"*
   - **Toggle the switch ON** (the card highlights with an indigo/emerald border).
5. Click **Save Customer**.
6. **Expected Results:**
   - A success notification appears: *"Customer registered successfully"*.
   - The table refreshes, displaying `Abyssinia Logistics PLC [TEST-WHT]`.
   - In the **Tax / Financial Profile** column, verify the distinct badge: **`WHT 2% Liable`**.

---

### Test Case 1.2: Register a Standard (Non-WHT) Retail Customer
1. Click **+ New Customer**.
2. Fill in:
   - **Customer Type:** `DIRECT_POS`
   - **Full Name:** `Dawit Haile [TEST-NOWHT]`
   - **Mobile Number:** `+251922334455`
   - **TIN Number:** `0098765432`
   - **Region:** Select any region
   - **Town / City:** `Hawassa`
3. Leave the **Withholding Tax (WHT) Liable** toggle **OFF** (default).
4. Click **Save Customer**.
5. **Expected Results:**
   - Customer is saved.
   - In the customer list table, the Tax column displays **`Standard (Non-WHT)`** or plain TIN status without the WHT liable badge.

---

### Test Case 1.3: Edit Customer & Toggle WHT Status
1. In the Customers list table, find `Dawit Haile [TEST-NOWHT]`.
2. Click the **Edit** button (pencil icon) in the Actions column.
3. Observe the edit modal pre-fills all fields.
4. **Toggle the Withholding Tax (WHT) Liable switch ON**.
5. Click **Update Customer**.
6. **Expected Results:**
   - The customer record immediately updates.
   - The table row now reflects the **`WHT 2% Liable`** badge.

---

### Test Case 1.4: Verify WHT Flag in Customer Profile Drawer
1. Click the **View Profile** button (eye icon) on `Abyssinia Logistics PLC`.
2. In the profile drawer on the right:
   - Check the **Financial & Tax Compliance** section.
   - Verify that **Withholding Tax Status** is displayed with a status badge (**`WHT Liable (Deductible)`**).

---

## Test Suite 2: Multi-Tax Configuration (Story 2.3)

### Test Case 2.1: Open Tax Configuration Hub
1. In the left navigation menu, click **Products & Catalog** (icon: 📦).
2. In the top action bar, click **Tax Configuration** (or Manage Taxes).
3. Observe the tax configuration modal:
   - Modal header: **Multi-Tax Rate Configuration & Applicability**.
   - Verify existing active tax rules:
     - `Standard Ethiopian VAT` → Tax Type: **`VAT`** (15.00%) · Customer: `ALL` · Vehicle: `ALL`
     - `Standard Commercial WHT` → Tax Type: **`WHT`** (2.00%) · Customer: `ALL` · Vehicle: `ALL`
     - `Automotive Excise Duty Tier 1` → Tax Type: **`EXCISE`** (10.00%) · Customer: `ALL` · Vehicle: `THREE_WHEELER`
     - `Zero-Rated Tax Tier` → Tax Type: **`VAT`** (0.00%)

---

### Test Case 2.2: Create a New Definable Tax Tier with Applicability Rules
1. In the tax configuration modal, locate the **Add New Tax Rule** form.
2. Enter the following details:
   - **Tax Name:** `Electric Vehicle Green Incentive VAT`
   - **Tax Type:** Select **`VAT`** (choices: `VAT`, `EXCISE`, `WHT`)
   - **Rate (%):** `5.00`
   - **Applicable Customer Type:** Select **`ALL`** (choices: `ALL`, `DEALER`, `DIRECT_POS`, `GOVERNMENT`)
   - **Applicable Vehicle Type:** Select **`ELECTRIC_VEHICLE`** (choices: `ALL`, `THREE_WHEELER`, `MOTORCYCLE`, `ELECTRIC_VEHICLE`)
   - **Description:** `Subsidized VAT for green transport initiatives & electric fleet operators`
3. Click **Add Tax Rule**.
4. **Expected Results:**
   - The new tax tier appears in the active tax rules list.
   - Badges clearly indicate:
     - `[VAT]` in blue/indigo.
     - Rate: `5.00%`.
     - Target: `Vehicles: ELECTRIC_VEHICLE`.
     - Description preview visible.

---

### Test Case 2.3: Create an Excise Duty Rule
1. In the same modal, enter:
   - **Tax Name:** `Luxury 3-Wheeler Commercial Excise`
   - **Tax Type:** Select **`EXCISE`**
   - **Rate (%):** `15.00`
   - **Applicable Customer Type:** `DEALER`
   - **Applicable Vehicle Type:** `THREE_WHEELER`
   - **Description:** `Excise surcharge on imported passenger models`
2. Click **Add Tax Rule**.
3. **Expected Results:**
   - Successfully saved with amber **`EXCISE`** badge.

---

## Test Suite 3: Vehicle Attributes & Colour Lookups (Stories 2.1 & 2.2)

### Test Case 3.1: Register an ICE Vehicle Product Item (Colour + Engine CC)
1. On the **Products & Catalog** page, click **+ New Product Item**.
2. Fill in the standard fields:
   - **Item Code:** `VEH-BJ-BOXER-RED`
   - **Item Name:** `Bajaj Boxer 150 HD (Crimson Edition)`
   - **Category:** Select `VEHICLE` (or Finished Goods)
   - **Brand:** Select `Bajaj`
   - **Model:** `Boxer 150`
   - **Unit of Measure:** Select `PIECE` (from UOM lookup)
3. **Fill in the Vehicle Attributes (Story 2.1 & 2.2):**
   - **Vehicle Colour / Finish:** Click the input. Notice the browser auto-suggests pre-seeded colors:
     - *Jet Black*, *Crimson Red*, *Royal Blue*, *Arctic White*, *Silver Metallic*, *Forest Green*, *Golden Yellow*.
     - Type or select: **`Crimson Red`**.
   - **Engine / Motor Capacity (cc):** Type **`150cc`**.
   - **Battery Power (kWh):** Leave blank or type `0` (this is an ICE motorcycle).
4. **Pricing & Tax Selection:**
   - **Selling Price (ETB):** `245,000`
   - **Tax Configuration:** Select `Standard Ethiopian VAT (15%)`
   - **Reorder Level:** `5`
5. Click **Create Product Item**.
6. **Expected Results:**
   - Success toast appears: *"Product item created successfully"*.
   - In the Products table, locate `VEH-BJ-BOXER-RED`:
     - Under the item name, verify the attribute tags:
       - **`🎨 Crimson Red`** (in purple/indigo)
       - **`⚡ 150cc`** (in emerald green)

---

### Test Case 3.2: Register an Electric Vehicle Product Item (Colour + Battery kWh)
1. Click **+ New Product Item**.
2. Fill in:
   - **Item Code:** `VEH-EV-RICKSHAW-01`
   - **Item Name:** `Kanab e-Alpha Electric Rickshaw`
   - **Category:** Select `VEHICLE`
   - **Brand:** Select `Kanab EV` or `Bajaj`
   - **Model:** `e-Alpha Passenger`
   - **Unit of Measure:** `PIECE`
3. **Vehicle Attributes:**
   - **Vehicle Colour / Finish:** Select **`Arctic White`**
   - **Engine / Motor Capacity (cc):** Leave blank (or `0`)
   - **Battery Power (kWh):** Type **`7.5`**
4. **Pricing & Tax:**
   - **Selling Price (ETB):** `380,000`
   - **Tax Configuration:** Select `Electric Vehicle Green Incentive VAT (5%)` (created in Test 2.2)
   - **Reorder Level:** `3`
5. Click **Create Product Item**.
6. **Expected Results:**
   - The item is created.
   - The table row displays:
     - **`🎨 Arctic White`**
     - **`🔋 7.5 kWh`** (in amber/gold badge)
     - Tax Tier badge showing `5% VAT`.

---

### Test Case 3.3: Edit Vehicle Attributes
1. On `VEH-BJ-BOXER-RED`, click the **Edit** action button.
2. Change the colour to `Royal Blue` and update engine capacity to `150cc DTS-i`.
3. Click **Update Product Item**.
4. **Expected Results:**
   - Table immediately reflects `🎨 Royal Blue` and `⚡ 150cc DTS-i`.

---

## Test Suite 4: Vehicle Inventory & Lifecycle Verification

### Test Case 4.1: Inspect Vehicles Hub Table
1. In the left navigation menu, click **Vehicles** (icon: 🚗).
2. In the Vehicle Inventory list, locate any unit assigned to the newly created model (`VEH-BJ-BOXER-RED` or `VEH-EV-RICKSHAW-01`).
   *(Note: You can use **+ Register Single Unit** with Chassis `CH-TEST-2026-001` and Engine `ENG-TEST-2026-001` selecting `VEH-BJ-BOXER-RED` if you wish to see a live unit).*
3. Look at the **Model / Item Details** column:
   - Verify the vehicle unit row displays:
     - Item Name: `Bajaj Boxer 150 HD (Crimson Edition)`
     - Item Code: `VEH-BJ-BOXER-RED · Bajaj`
     - **`🎨 Royal Blue`** (or `Crimson Red`)
     - **`⚡ 150cc DTS-i`**

---

### Test Case 4.2: Inspect Vehicle Lifecycle & Specification Drawer
1. On that vehicle row, click the **Lifecycle** button (eye icon).
2. The **Vehicle Lifecycle & End-to-End Audit Trail** modal opens.
3. In **Section 1: Unit Identification & Location**:
   - Check the key-value specifications:
     - Chassis Number: `CH-TEST-2026-001`
     - Engine Number: `ENG-TEST-2026-001`
     - Brand / Model: `Bajaj · Bajaj Boxer 150 HD`
     - **Colour / Finish:** **`🎨 Royal Blue`**
     - **Engine / Power:** **`⚡ 150cc DTS-i`**
4. **Expected Results:**
   - All custom vehicle attributes flow cleanly from Product Master into individual Vehicle Unit identification.

---

# 🟣 ==========================================================================
# 🟣 ROUND 2: Pre-Advance Slip & 100% Full Gross Advance Booking Mandate
# 🟣 Stories: E16, E17, E18, B3, B4 | Test Suites: 5, 6
# 🟣 ==========================================================================

## Test Suite 5: Pre-Advance Slip (Stories E16, E17, E18)

### Test Case 5.1: Auto-Generation of Pre-Advance Slip upon Enquiry Approval
1. In the left navigation menu, click **Enquiries** (icon: 📋).
2. Locate any enquiry in `SUBMITTED` status (or click **+ New Sales Enquiry** to create one).
3. In the Actions column, click **Approve** (green checkmark).
4. **Expected Results:**
   - The status immediately updates to **`APPROVED`**.
   - A purple/indigo button appears in the row: **`Pre-Advance Slip`** (with file icon).
   - In the database, a `pre_advance_slip` record has been auto-generated with `slip_number` (e.g. `PAS-2026-00001`), `status: ACTIVE`, and `expires_at: NOW() + 3 days`.

---

### Test Case 5.2: Inspect & Print Pre-Advance Slip Modal (Story E17 & E18)
1. On that approved enquiry row, click **`Pre-Advance Slip`**.
2. The official printable modal opens:
   - Header: **KANAB MOTORS PLC — OFFICIAL PRE-ADVANCE SLIP**.
   - **Slip Ref:** e.g. `PAS-2026-00001` · Status: **`ACTIVE`** (emerald badge).
   - **Reservation Validity Card (Story E18):**
     - Shows: *"⏳ Reservation Validity: 3 Calendar Days (Configurable Policy)"*.
     - Issue date and exact Expiration Date (3 days after issue).
   - **Customer Particulars:** Full name, code, TIN, mobile number.
   - **Vehicle Particulars Table:** Item name, brand, colour tag, engine/battery specs, quantity, unit price, VAT (15%), total amount.
   - **Required Advance Amount Banner (Story B4):**
     - Displays required advance: **100% full gross price** (e.g., `ETB 245,000.00`).
     - *"100% Full Payment Mandate"*.
   - **Authorized Bank Accounts:** CBE, Awash, Dashen bank account numbers with instructions to quote the Slip Number.
3. Click the top-right button **Print Slip**.
   - Observe browser print preview dialog opens with clean letterhead formatting.

---

## Test Suite 6: Advance Booking Origin & 100% Full Advance (Stories B3 & B4)

### Test Case 6.1: Originating from an Approved Pre-Advance Slip
1. In the left navigation menu, click **Bookings** (icon: 📑).
2. Click **+ New Advance Booking**.
3. In the modal, locate the top card:
   - Title: **Originating Pre-Advance Slip (Story B3: Enquiry → Slip → Payment Mandate)**.
   - Click the dropdown: select the active Pre-Advance Slip generated in Test Suite 5.
4. **Expected Results:**
   - Customer and Vehicle Item are automatically populated.
   - Order Quantity and Unit Price are automatically set from the slip.
   - **Min Advance Req (ETB):** automatically locks to **100% of the Gross Total** (full vehicle price including VAT, fulfilling Story B4).

---

### Test Case 6.2: Create Booking & Verify Conversion
1. Enter or keep Sales Representative Name and click **Create Advance Booking**.
2. **Expected Results:**
   - Booking is created successfully with status `APPROVED`.
   - The Pre-Advance Slip status transitions to `CONVERTED`.
   - On the Bookings table, the required deposit matches 100% of the vehicle total.

---

# 🟠 ==========================================================================
# 🟠 ROUND 3: Financial Risk Controls, Credit Transfer & Delivery Docs
# 🟠 Stories: P14, X9, X10, IV14, DL5 | Test Suites: 7, 8, 9, 10
# 🟠 ==========================================================================

## Test Suite 7: Customer Deposit & CEO Installment Approval Gate (Story P14)

### Test Case 7.1: Submit Partial Installment Payment
1. In the left navigation menu, click **Payments & BRV** (icon: 💵).
2. Click top-right button **+ Record Payment (BRV)**.
3. Fill in payment fields:
   - Customer: Select any customer with an active booking.
   - Booking: Select the booking.
   - Deposit Amount: Enter a partial installment amount (e.g. `ETB 100,000`).
   - Bank: `Commercial Bank of Ethiopia (CBE)`.
   - Reference Number: `BRV-TEST-INST-001`.
4. **Toggle the Split / Installment Deposit Plan Card:**
   - Notice the card: **Split / Installment Deposit Plan (Story P14)**.
   - Subtitle: *"Customer is paying in installments. Requires mandatory CEO Approval Gate before ledger confirmation."*
   - Check the box **ON** (card highlights in amber).
5. Click **Record Payment**.
6. **Expected Results:**
   - Payment is saved with status `SUBMITTED`.
   - In the Status column, an amber badge displays: **`⏳ CEO Approval Req`**.
   - Notice the **Confirm** button is disabled with tooltip: *"Story P14: Requires CEO approval before ledger confirmation"*.

---

### Test Case 7.2: Review & Approve via CEO Gate
1. On that payment row, observe the amber button: **`CEO Gate`** (icon: alert triangle).
2. Click **`CEO Gate`**.
3. The **CEO Installment Approval Gate** modal opens:
   - Displays Receipt #, Customer Name, Installment Amount, and Bank Reference.
   - Notes input: type `"Approved by CEO under executive discretion for commercial fleet client"`.
4. Click **`✓ Approve Installment (CEO)`**.
5. **Expected Results:**
   - Success toast appears: *"Installment payment approved by CEO! Ready for ledger confirmation."*
   - Badge updates to **`✓ CEO Approved`** (emerald).
   - The **Confirm** button is now enabled!
6. Click **Confirm**:
   - The payment confirms and posts to the Customer Ledger.

---

## Test Suite 8: Customer Credit Transfer (Stories X9 & X10)

### Test Case 8.1: Initiate Two-Sided Atomic Credit Transfer
1. In the left navigation menu, click **Excess & Refunds** (or Settlement).
2. Click the tab **Excess & Customer Credit**.
3. In the Customer Balances table, find a customer holding an available credit balance (or route an excess payment to credit first).
4. Click the purple button **`Transfer Credit`** in the Actions column.
5. The **Customer Credit Transfer** modal opens:
   - **Source Customer (Debited):** Displays Customer Name and current Available Credit (e.g. `ETB 50,000`).
   - **Recipient Customer (Credited):** Select a different customer from the dropdown.
   - **Transfer Amount (ETB):** Enter e.g. `20,000`.
   - **Optional Destination Booking:** Select an order of the recipient customer (or leave as General Credit).
   - **Purpose Notes:** Type `"Authorized credit transfer between sister logistics firms"`.
   - **Live Two-Sided Atomic Ledger Preview:**
     - Side 1: `-ETB 20,000 (Debit Credit)`
     - Side 2: `+ETB 20,000 (Credit Allocation)`
6. Click **Confirm & Post Credit Transfer**.
7. **Expected Results:**
   - Success message appears: *"Successfully transferred ETB 20,000 credit from [Customer A] to [Customer B]"*.
   - Recipient Customer's Available Credit is credited by ETB 20,000 atomically.
   - In the Customer Ledger (`/ledger`), two balancing `CREDIT_TRANSFER` entries are logged with matching reference number.

---

## Test Suite 9: Tax Withheld by the Customer (Non-Cash Settlement) (Story IV14)

### Test Case 9.1: Generate Sales Invoice for WHT Customer & Verify Calculation
1. In the left navigation menu, click **Invoices** (icon: 🧾).
2. Click top-right button **+ Generate Sales Invoice**.
3. Select an advance booking for a commercial client (e.g. `Abyssinia Logistics PLC` with TIN `0012345678`).
4. Notice in the live settlement summary:
   - Base Vehicle Total: e.g. `ETB 200,000.00`
   - VAT (15%): `+ ETB 30,000.00` (or as configured)
   - Gross Total: `ETB 230,000.00`
   - Expected Customer Withholding Tax (2% commercial WHT deduction): `ETB 4,000.00`
5. Click **Confirm & Submit to Approval**.
6. **Expected Results:**
   - Invoice is created with status `DRAFT` or `PENDING_APPROVAL`.
   - In the table row, under the Invoice #, verify the amber badge: **`⏳ WHT 2% Pending Cert`**.

---

### Test Case 9.2: Record Non-Cash Withholding Tax Settlement (Story IV14)
1. On that invoice row, locate the purple **WHT Settlement** button (icon: tag/percent `🏷️`).
2. Click the **WHT Settlement** button.
3. The **Record Customer WHT Non-Cash Settlement** modal opens:
   - Header: **Record Customer WHT Non-Cash Settlement (Story IV14)**.
   - Statutory Rule Alert: Displays the mandatory non-cash settlement mandate:
     *"The customer is a designated withholding tax agent who withheld tax at source. This posts a WHT_SETTLEMENT credit linked to the invoice and booking. No cash reached KANAB. This credit is strictly non-refundable."*
   - Summary display shows:
     - Gross Invoice Total: e.g. `ETB 200,000.00`
     - Cash Received via BRV: e.g. `ETB 196,000.00`
     - Current Outstanding Balance: `ETB 4,000.00`
4. Fill in the modal fields:
   - **Withheld Tax Amount (ETB):** `4,000.00` (pre-filled with 2% deduction)
   - **Withholding Certificate #:** Type `01243` (matching the SRS statement doc example)
   - **Certificate Issue Date:** Today's date
   - **Certificate Physical Status:** Select `✓ Certificate Received & Verified`
   - **Audit Notes:** `Tax withheld at source, certificate 01243`
5. Observe the **Live Customer Ledger Atomic Posting Preview**:
   - `Sales Invoice: ETB 200,000 (Debit)`
   - `Bank Receipt Voucher (Cash): ETB 196,000 (Credit)`
   - `Tax withheld at source, cert 01243: ETB 4,000 (Credit)`
   - `Net Outstanding Balance: ETB 0.00`
6. Click **Confirm & Post WHT Settlement**.
7. **Expected Results:**
   - Success toast appears: *"Non-cash WHT settlement of ETB 4,000 recorded successfully! Customer ledger updated."*
   - Invoice row updates:
     - Under Invoice #, badge changes to emerald: **`✓ WHT Cert: 01243`**.
     - Deposits Applied shows: `ETB 200,000 (incl. ETB 4,000 WHT Non-Cash)`.
     - Balance Due becomes: **`ETB 0.00`**.

---

### Test Case 9.3: Customer Ledger Verification (Non-Cash WHT_SETTLEMENT Entry)
1. In the left navigation menu, click **Statement of Account** (or Customer Ledger).
2. Select the customer (`Abyssinia Logistics PLC`).
3. Inspect the transaction ledger table:
   - Line 1: `INVOICE_CHARGE` — Debit: `ETB 200,000.00`
   - Line 2: `ADVANCE_DEPOSIT` (BRV Cash) — Credit: `ETB 196,000.00`
   - Line 3: **`WHT_SETTLEMENT`** — Credit: **`ETB 4,000.00`** · Ref: `01243` · Description: *"Tax withheld at source, certificate 01243"*
   - Running Balance: **`ETB 0.00`**
4. **Expected Results:**
   - Matches the exact 3-line accounting table specified in SRS §IV14.

---

### Test Case 9.4: Non-Refundable Statutory Rule Verification
1. Navigate to **Customer Balances / Excess & Refunds** (`/settlement`).
2. Select the customer:
   - Notice **Total Cash Deposits** is `ETB 196,000.00` (does NOT include the ETB 4,000 non-cash WHT).
   - **Refundable Balance** is based ONLY on actual cash received.
3. If a refund is requested, the system enforces:
   - KANAB refunds only the net cash actually received (`ETB 196,000`), never the non-cash WHT deduction.

---

### Test Case 9.5: Finance Withholding Tax Certificates Hub
1. Return to **Invoices** page.
2. In the top tab bar, click **Withholding Tax (WHT) Tracking Hub (Story IV14)**.
3. Observe the Finance Hub view:
   - 4 KPI cards:
     - WHT Tracked Invoices
     - Total Tax Withheld (ETB)
     - Certificates on File
     - Missing Certificates (Pending Follow-up)
   - Table of all WHT orders with Customer Name, TIN, WHT Amount, and Certificate #.
4. On any record with missing certificate, click **Enter Cert #**:
   - Updates the certificate number and transitions status to `✓ Verified On File` or `★ Claimed Tax Credit`.

---

## Test Suite 10: Two Printed Documents for Delivery & Handover (Story DL5)

### Test Case 10.1: Document 1 — Official Delivery Voucher & Gate Pass
1. In the left navigation menu, click **Delivery & Handover** (icon: 🚗).
2. Locate any authorized delivery order (or click **New Handover Order** to create and authorize one).
3. In the Actions column, click the **Gate Pass / Release Documents** button (icon: eye / printer).
4. The printable document dialog opens.
5. In the top switcher bar, verify **1. Delivery Voucher (Gate Pass)** is active:
   - Document Header: **KANAB MOTORS PLC — DELIVERY VOUCHER & GATE PASS**.
   - Voucher Reference: e.g. `DV-DEL-000001` or `GP-DEL-000001`.
   - Customer Details: Full Name, Code, Phone, TIN, Delivery Location.
   - Vehicle Credentials: Model, Chassis / VIN, Engine Number, Colour tag, Engine CC/Power, Odometer reading.
   - Clearance Badges:
     - `✓ PDI PRE-DELIVERY INSPECTION VERIFIED`
     - `✓ FINANCIAL SETTLEMENT CLEARED (100% PAID / AUTHORIZED)`
   - Dual Clearance Signatures:
     - *Security Gate Clearance Officer*
     - *Releasing Dispatch Officer / Storekeeper*

---

### Test Case 10.2: Document 2 — Handover Form & Acceptance Declaration with Handover Pack
1. In the same modal dialog, click the second tab: **2. Handover Form & Declaration (Handover Pack)**.
2. Observe the document layout transitions:
   - Document Header: **KANAB MOTORS PLC — VEHICLE HANDOVER FORM & CUSTOMER ACCEPTANCE DECLARATION**.
   - Handover Reference: `HF-DEL-000001`.
   - Customer & Vehicle particulars clearly displayed.
   - **Official Handover Pack Checklist (Story DL5 explicit criteria):**
     1. `Ignition Keys (Original & Spare Sets) — 2 Sets — [ ✓ Handed Over ]`
     2. `Spare Wheel & Pneumatic Tyre (100% Tread) — 1 Unit — [ ✓ Handed Over ]`
     3. `Vehicle Tool Kit (Jack, Handle & Wheel Spanner) — 1 Set — [ ✓ Handed Over ]`
     4. `Owner's Operational & Maintenance Manual — 1 Copy — [ ✓ Handed Over ]`
     5. `Manufacturer Warranty Booklet & Service Schedule — 1 Booklet — [ ✓ Handed Over ]`
     6. `Temporary Vehicle Transit Permit / Official Plates — 1 Set — [ ✓ Handed Over ]`
   - **Customer Statutory Handover Declaration:**
     - Displays the formal legal text:
       *"I, the undersigned [Customer Name], hereby declare and confirm that I have physically inspected and taken formal delivery of the vehicle specified above in satisfactory, roadworthy condition, complete with all specified accessories, tools, and the Handover Pack listed herein. I acknowledge receipt of all official keys, user manuals, warranty terms, and accept full operational custody and responsibility from this timestamp."*
   - Handover Acceptance Signatures:
     - *Customer / Authorized Recipient Signature & Date*
     - *Kanab Motors Delivery Officer Signature & Date*

---

### Test Case 10.3: Official Printing
1. Click the bottom button: **Print Handover Form & Pack** (or Print Delivery Voucher).
2. Verify browser print preview opens cleanly on official letterhead without UI elements, tabs, or modal buttons.

---

# 🟢 ==========================================================================
# 🟢 ROUND 4: Sales Invoice & Multi-Tax Settlement Suite (Jira KMSICAMS-11)
# 🟢 Stories: IV1, IV2, IV3, IV4, IV5, IV6, IV7, IV8, IV9, IV10, IV11, IV12, IV13 | Test Suite: 11
# 🟢 ==========================================================================

## Test Suite 11: Sales Invoice and Settlement Management (Jira: KMSICAMS-11)

### Overview of Stories Implemented:
- **Story IV1 (Sales Invoice Data Model):** Persists `invoice_number`, `booking_id`, `customer_id`, `item_id`, `vehicle_unit_id`, `quantity`, `unit_price`, `vat_rate`, `vat_amount`, `excise_tax_rate`, `excise_tax_amount`, `total_tax_amount`, `gross_total`, `wht_rate`, `wht_amount`, `net_payable`, `deposits_applied`, `outstanding_balance`, `status`, and complete audit snapshot `tax_details` with applied rule references.
- **Story IV2 (Multi-Tax Evaluation Engine):** Multi-tier independent evaluation, configurable calculation bases (`VEHICLE_PRICE` vs `GROSS_INCL_EXCISE`), priority sequence (Priority 1: Excise, Priority 2: VAT, Priority 3: WHT), effective date rules, and audit trail for exemptions/overrides.
- **Story IV3 (Retrieve Customer Available Deposits):** Queries both booking deposits and general customer ledger available credits (`/api/invoices/customer/:customerId/available-deposits`).
- **Story IV4 & IV5 (Apply Payments & Calculate Outstanding Balance):** Allocates eligible deposits directly against `net_payable` (`outstanding_balance = net_payable - deposits_applied`).
- **Story IV6 (Identify Excess Customer Payments):** Identifies when total customer deposits exceed `net_payable` and flags invoice with `excessPaymentFlag` to route remaining balance to credit/refunds.
- **Story IV7 (Update Customer Ledger INVOICE_CHARGE):** Posts idempotent `INVOICE_CHARGE` entry with full multi-tax breakdown references and applied deposit `PAYMENT_ALLOCATION`.
- **Story IV8 (Update Booking Status):** Settle booking (`SETTLED`) upon invoice approval.
- **Story IV9 (Update Vehicle Status to SOLD):** Calls Inventory's `fn_transition_vehicle_status(vehicleUnitId, 'SOLD', userId, 'SALES_INVOICE')`.
- **Story IV10 (Invoice Approval Workflow):** Integrates with generic `approval_request` (`SALES_INVOICE`).
- **Story IV11 (RBAC & Audit):** Mandatory justification reason for tax overrides and exemptions (`tax_override_reason`, `tax_override_by`).
- **Story IV12 (UI Screens):** Interactive live multi-tax calculator, Tax Rules & Rates Hub tab, and tax breakdown audit tables in detail view.
- **Story IV13 (Tests/QA):** Comprehensive unit tests in `invoices.service.spec.ts` covering IV1 through IV11.

---

### Test Case 11.1: Verify Tax Rules & Rates Hub (Story IV2)
1. In the left navigation menu, click **Invoices & Finance** (icon: 🧾).
2. At the top of the Invoices page, notice the three tab buttons:
   - `Commercial Sales Invoices`
   - `Tax Rules & Rates Hub (Story IV2)`
   - `Withholding Tax (WHT) Tracking Hub (Story IV14)`
3. Click **Tax Rules & Rates Hub (Story IV2)**.
4. **Verify the Rules Table:**
   - **VAT (15%):** Type `VAT`, standard 15% rate, Priority 2.
   - **Three-Wheeler Excise (5%):** Type `EXCISE`, 5% rate on Vehicle Price, Priority 1.
   - **Motorcycle Excise (10%):** Type `EXCISE`, 10% rate on Vehicle Price, Priority 1.
   - **Withholding Tax (2%):** Type `WHT`, 2% rate, Priority 3, deducted at source.
5. **Verify Statutory Settlement Formula Distinction Card:**
   - *Step 1:* `Gross Total = Vehicle Price + VAT + Excise Tax` (taxes added to price)
   - *Step 2:* `Net Customer Payable = Gross Total - WHT` (tax withheld at source)
   - *Step 3:* `Outstanding Balance = Net Customer Payable - Deposits Applied`

---

### Test Case 11.2: Generate Sales Invoice with Live Multi-Tax Engine (Stories IV1, IV2, IV4, IV5)
1. Switch back to the **Commercial Sales Invoices** tab.
2. Click **+ Generate Invoice**.
3. In the modal, select an allotted booking (e.g. for a Motorcycle or Three-Wheeler).
4. **Observe the Live Settlement Breakdown & Calculation Summary:**
   - **Vehicle Subtotal:** e.g. `ETB 1,000,000.00`
   - **Excise Tax (5% or 10%):** Automatically calculated based on vehicle type (e.g. `+ ETB 100,000.00`).
   - **VAT (15%):** e.g. `+ ETB 150,000.00`.
   - **Gross Commercial Total:** `ETB 1,250,000.00` (Price + VAT + Excise).
   - **Withholding Tax (2%):** If customer is WHT-liable, `- ETB 20,000.00`.
   - **Net Customer Payable:** `ETB 1,230,000.00`.
   - **Deposits Allocated:** Automatically capped up to Net Customer Payable.
   - **Net Balance Due:** Remaining balance to be paid before delivery release.
5. Check or uncheck *"Automatically allocate available customer deposits"*. Observe the live Net Balance Due updating instantaneously.
6. Click **Confirm & Submit to Approval**.
7. **Expected Results:**
   - Success alert appears: *"Sales invoice generated with full tax audit breakdown and routed to approval workflow!"*
   - Invoice is created with status **`PENDING_APPROVAL`**.

---

### Test Case 11.3: Tax Overrides & Statutory Exemptions with Audit Justification (Stories IV2, IV11)
1. In the **Generate Sales Invoice** modal, select a booking.
2. Expand the collapsible panel: **Tax Overrides & Statutory Exemptions (Stories IV2 & IV11)**.
3. Check **VAT Exempt (0%)** or **Excise Duty Exempt (0%)**, or enter a custom rate (e.g. 5% VAT).
4. Try to submit without filling in the audit reason.
5. **Verify Error Validation:**
   - Modal displays error: *"Please provide a mandatory audit justification reason for the tax rate override or exemption (Story IV2 / IV11)"*.
6. Type a justification: *"Approved MoR statutory tax exemption certificate #AGRI-8891 for regional cooperative fleet"*.
7. Submit the form.
8. **Expected Results:**
   - Invoice is created successfully with the overridden rates.
   - The justification is permanently stored and visible in the Invoice Detail modal under *"Tax Exemption / Rate Override Audit Justification"*.

---

### Test Case 11.4: Invoice Approval, Settle Booking & Vehicle Status SOLD (Stories IV7, IV8, IV9, IV10)
1. Find the newly generated invoice in the Commercial Sales Invoices table (status: `PENDING_APPROVAL`).
2. Click the green **Approve & Settle** button (checkmark icon) or open the details modal (eye icon) and click **Approve & Settle**.
3. Confirm the confirmation prompt: *"Approve this sales invoice? This will finalize financial settlement and automatically mark the assigned vehicle as SOLD."*
4. **Expected Results:**
   - Invoice status transitions to **`APPROVED`**.
   - The associated booking status transitions to **`SETTLED`**.
   - The assigned vehicle unit status transitions to **`SOLD`** via `fn_transition_vehicle_status()`.
   - The customer ledger receives an immutable, idempotent **`INVOICE_CHARGE`** entry and balancing **`PAYMENT_ALLOCATION`** entry.

---

### Test Case 11.5: Detailed Multi-Tax Audit Snapshot View (Stories IV1, IV12)
1. On any approved or pending invoice, click the **View (eye icon)** button.
2. In the modal, verify the structured display:
   - Vehicle Subtotal
   - Excise Duty Rate & Amount
   - VAT Rate & Amount
   - Gross Commercial Total
   - Withholding Tax at Source (2%)
   - Net Customer Payable
   - Deposits Allocated
   - Outstanding Balance Due
3. Scroll to the **Applied Statutory Tax Rules Snapshot & Audit Trail (Story IV1 / IV2 / IV11)** table:
   - Verify it shows each applied rule name, tax type, rate percentage, exact tax amount, and calculation base for permanent historical consistency.

---

### Test Case 11.6: Execute KMSICAMS-11 Automated Unit Test Suite (Story IV13)
Open a terminal in `d:\kanab\backend` and run:
```bash
npm test -- backend/src/modules/invoices/invoices.service.spec.ts
```
**Expected Results:**
All 7 unit tests pass with zero failures:
```
PASS src/modules/invoices/invoices.service.spec.ts
  InvoicesService (KMSICAMS-11 Updated Story Points: Sales Invoice & Settlement)
    Story IV2: Tax Rule Evaluation Engine (evaluateTaxes)
      √ IV2.1: should evaluate standard vehicle tax (15% VAT, 0% Excise, 0% WHT)
      √ IV2.2: should evaluate Motorcycle with 10% Excise Duty + 15% VAT
      √ IV2.3: should evaluate Three-Wheeler for WHT Customer (Gross = Price + VAT + Excise; Net Payable = Gross - WHT)
      √ IV2.4: should honor tax exemptions and manual overrides with audit trail
    Story IV3: Retrieve Customer Available Deposits & Credits
      √ IV3.1: should combine booking deposits and ledger credits
    Story IV1, IV4, IV5, IV6: Create Invoice & Settlement Allocation
      √ IV1/IV4/IV5: should create invoice, apply deposits against net payable and submit to approval
    Story IV7, IV8, IV9, IV10: Approve Invoice & Final Settlement
      √ IV7/IV8/IV9: should transition vehicle to SOLD, settle booking, and post idempotent INVOICE_CHARGE

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```

---

## Verification & Sign-off Checklist (Structured by Round)

### 🔵 Round 1 Verification Checklist: Customer Compliance & Vehicle Master Data Attributes
| Requirement | Acceptance Criteria | Verified (Yes/No) | Notes |
|---|---|---|---|
| **Story 1.1** | Customer has Withholding Tax Flag toggle in UI | [ ] | Stored as `withholding_tax_flag` in PostgreSQL |
| **Story 1.1** | Customer directory shows WHT liable badge | [ ] | Filterable & visible at a glance |
| **Story 1.1** | Customer profile drawer displays WHT compliance status | [ ] | Included in Financial Details |
| **Story 2.1** | Product Item supports `colour` attribute | [ ] | Persisted and editable |
| **Story 2.1** | Product Item supports `engine_capacity_cc` | [ ] | e.g. `150cc`, `200cc` |
| **Story 2.1** | Product Item supports `battery_power_kwh` | [ ] | e.g. `7.5 kWh` for EVs |
| **Story 2.2** | Colour reference lookup pre-seeded with colors | [ ] | 7 colors available via `/api/lookups/colors` |
| **Story 2.2** | Unit of Measure lookup available | [ ] | PIECE, SET, KG, LTR via `/api/lookups/uoms` |
| **Story 2.3** | Tax config supports VAT, Excise Duty, and WHT | [ ] | Definable rate with tax type selection |
| **Story 2.3** | Tax config supports Customer and Vehicle applicability | [ ] | Rules by customer and vehicle classifications |

### 🟣 Round 2 Verification Checklist: Pre-Advance Slip & 100% Advance Booking
| Requirement | Acceptance Criteria | Verified (Yes/No) | Notes |
|---|---|---|---|
| **Story E16** | Pre-advance slip model & auto-generation on approval | [ ] | Generated with sequence `pre_advance_slip_seq` |
| **Story E17** | Pre-advance slip UI (printable modal) | [ ] | Letterhead, specs, full advance, bank accounts |
| **Story E18** | Slip expiry (3 days, configurable) | [ ] | Expiry indicator & status transition to EXPIRED |
| **Story B3** | Originating from approved enquiry, slip & payment | [ ] | Slip picker & booking slip linkage |
| **Story B4** | Advance is full current price (100%) | [ ] | Full gross advance calculated |

### 🟠 Round 3 Verification Checklist: Financial Controls, Credit Transfer & Delivery Docs
| Requirement | Acceptance Criteria | Verified (Yes/No) | Notes |
|---|---|---|---|
| **Story P14** | Instalment Approval gate (CEO) | [ ] | CEO review gate & confirm button restriction |
| **Story X9** | Credit transfer between customers (two-sided atomic ledger) | [ ] | Concurrency-safe atomic two-sided posting |
| **Story X10** | Credit transfer UI and tests | [ ] | Interactive modal with live ledger preview |
| **Story IV14**| Tax withheld by customer, recorded as non-cash settlement | [ ] | Atomic `WHT_SETTLEMENT` credit ledger posting |
| **Story IV14**| Non-refundable statutory rule (refunds only actual cash received) | [ ] | Enforced in ledger & refunds balance |
| **Story IV14**| Finance tracks WHT certificates & missing list | [ ] | Dedicated WHT Tracking Hub & certificate status |
| **Story DL5** | Document 1: Delivery Voucher (Gate Pass) | [ ] | Official printable voucher with security signatures |
| **Story DL5** | Document 2: Handover Form with Declaration & Pack | [ ] | Customer legal declaration + 6-item pack checklist |

### 🟢 Round 4 Verification Checklist: Sales Invoice and Settlement Suite (Jira KMSICAMS-11)
| Requirement | Acceptance Criteria | Verified (Yes/No) | Notes |
|---|---|---|---|
| **Story IV1** | Sales invoice data model with multi-tax & snapshot | [ ] | Vehicle price, VAT, Excise, WHT, Gross, Net, audit `tax_details` |
| **Story IV2** | VAT, WHT and Excise Tax calculation engine | [ ] | Priority sequence (1: Excise, 2: VAT, 3: WHT), configurable bases |
| **Story IV3** | Retrieve customer's available deposits & credits | [ ] | Combines booking deposit and available customer ledger credits |
| **Story IV4** | Apply eligible payments to invoice settlement | [ ] | Capped against `net_payable` to prevent duplicate/over-allocation |
| **Story IV5** | Calculate outstanding customer balance | [ ] | `Outstanding Balance = Net Customer Payable - Deposits Applied` |
| **Story IV6** | Identify excess customer payments | [ ] | Distinguishes unapplied credits & flags excess for customer ledger |
| **Story IV7** | Update customer ledger (`INVOICE_CHARGE` entry) | [ ] | Idempotent ledger charge with tax breakdown and deposit allocation |
| **Story IV8** | Update booking status (`SETTLED`) | [ ] | Booking marked `SETTLED` upon invoice approval |
| **Story IV9** | Update vehicle status (`READY_FOR_DELIVERY` -> `SOLD`) | [ ] | Invokes `fn_transition_vehicle_status('SOLD')` |
| **Story IV10**| Invoice approval workflow integration | [ ] | Dispatches `approval_request` (`SALES_INVOICE`) and settles on approval |
| **Story IV11**| RBAC and tax override audit justification | [ ] | Restricts access & requires audit reason for exemptions/overrides |
| **Story IV12**| UI: invoice generation and detail screens | [ ] | Interactive multi-tax live calculator & Tax Rules Hub tab |
| **Story IV13**| Tests/QA test suite | [ ] | Unit & regression tests covering IV1-IV11 (7/7 tests passed) |

---

## Technical Appendix & Direct API Verification (Optional)

If you wish to verify via Swagger API docs or curl:

1. **Swagger UI:** `http://localhost:3000/api/docs`
2. **Fetch Seeded Colours:**
   ```bash
   curl -X GET http://localhost:3000/api/lookups/colors \
     -H "Authorization: Bearer <TOKEN>"
   ```
3. **Fetch Multi-Tax Configurations:**
   ```bash
   curl -X GET http://localhost:3000/api/products/tax-configs \
     -H "Authorization: Bearer <TOKEN>"
   ```
4. **Fetch Customers with WHT Flag:**
   ```bash
   curl -X GET http://localhost:3000/api/customers \
     -H "Authorization: Bearer <TOKEN>"
   ```
