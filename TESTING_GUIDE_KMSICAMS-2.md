# KANAB Motors — Comprehensive Story-by-Story Testing Guide (KMSICAMS-2)

> **Ticket Code:** `KMSICAMS-2` — Financial Engine & Sales Pipeline  
> **Modules Covered:**  
> 1. Customer Ledger & Statement of Account (Stories L1 – L10)  
> 2. Sales Enquiry Management (Stories E1 – E15)  
> 3. Advance Order & Booking Management (Stories B1 – B14)  
> 4. Customer Deposit & Payment Management via BRV (Stories P1 – P13)  
> 5. Excess Payment & Customer Credit Management (Stories X1 – X8)  
> 6. Refund Management with SRS §7.4 Validation (Stories R1 – R12)  
> **Backend Base URL:** `http://localhost:3000/api`  
> **Interactive Swagger Docs:** `http://localhost:3000/api/docs`  
> **Frontend Application:** `http://localhost:5173`

---

## 📋 SECTION 1: Customer Ledger & Statement of Account (Stories L1 – L10)

---

### TC-L1: Customer Sub-Ledger Transaction Table & Schema Migration
* **Story L1:** Customer ledger data model & migration.
* **Goal:** Verify that `customer_ledger_transaction`, `customer_account_summary`, and sequential triggers exist in PostgreSQL.
* **Steps:**
  1. Open PostgreSQL (`kanab_motors` database) via psql or pgAdmin.
  2. Inspect table `customer_ledger_transaction`: verify columns `transaction_id`, `customer_id`, `transaction_date`, `transaction_type`, `reference_number`, `booking_id`, `payment_id`, `refund_id`, `debit_amount`, `credit_amount`, `running_balance`, `notes`.
  3. Inspect table `customer_account_summary`: verify columns `customer_id`, `total_deposits`, `allocated_to_bookings`, `outstanding_balance`, `available_credit`, `excess_payments`, `refundable_balance`, `last_recalculated_at`.
* **Expected Result:** Migration `1710100000000-KMSICAMS2FinancialEngine` executed cleanly with foreign keys to `customer`, `booking`, `customer_payment`, and `customer_refund`.

---

### TC-L2: Running Balance Determinism & Strict Chronological Calculation
* **Story L2:** Ensure every debit and credit transaction updates the running balance deterministically.
* **Goal:** Verify formula: $\text{New Running Balance} = \text{Previous Balance} + \text{Credit} - \text{Debit}$.
* **Steps:**
  1. Create a customer or pick existing customer `CUST-000001`.
  2. Post an initial credit of ETB 500,000 (deposit via BRV).
  3. Verify `running_balance` in ledger is `500,000.00`.
  4. Post a debit of ETB 150,000 (invoice charge or refund).
  5. Verify `running_balance` is `350,000.00`.
* **Expected Result:** Ledger records maintain monotonic chronological continuity without rounding discrepancies.

---

### TC-L3: Pessimistic Row Locking on Account Summary (`SELECT ... FOR UPDATE`)
* **Story L3:** Concurrency safety against race conditions during simultaneous deposits.
* **Goal:** Verify that concurrent deposit postings for the same customer are serialized and cannot corrupt balances.
* **Steps:**
  1. Execute unit test: `npm test -- src/modules/ledger/ledger.service.spec.ts`.
  2. Inspect `LedgerService.postTransaction()`: verify execution of `.setLock('pessimistic_write')` on `customer_account_summary`.
* **Expected Result:** Transactions acquire an exclusive row lock on `customer_account_summary` within an atomic database transaction.

---

### TC-L4: Customer Account Summary Real-time Recalculation
* **Story L4:** Customer account summary synchronization on financial events.
* **Goal:** Verify that `total_deposits`, `available_credit`, and `refundable_balance` update automatically upon ledger mutations.
* **Steps:**
  1. Confirm a BRV payment of ETB 200,000 for a customer.
  2. Query `customer_account_summary` for that customer.
* **Expected Result:** `total_deposits` increases by 200,000, and `last_recalculated_at` reflects the exact timestamp.

---

### TC-L5: Statement of Account API
* **Story L5:** Return complete Statement of Account with customer header and chronological ledger lines.
* **Goal:** Verify `GET /api/ledger/customers/{customerId}/statement`.
* **Steps:**
  1. In Swagger or browser, send `GET /api/ledger/customers/{customerId}/statement`.
* **Expected Result:** Returns HTTP 200 with JSON payload containing:
  - `summary`: summary balances (`totalDeposits`, `allocatedToBookings`, `refundableBalance`, etc.)
  - `transactions`: array of `{ transactionId, date, description, transactionType, reference, debit, credit, runningBalance }`.

---

### TC-L6: SOA Date Range and Booking Filtering
* **Story L6:** Query statement transactions filtered by `startDate`, `endDate`, and `bookingNumber`.
* **Goal:** Verify filtering parameters in `GET /api/ledger/customers/{customerId}/statement?startDate=2026-01-01&endDate=2026-12-31`.
* **Steps:**
  1. Supply query parameters `startDate` and `endDate`.
  2. Provide a specific `bookingNumber`.
* **Expected Result:** Returned transactions are strictly bounded within the date range and matching booking reference.

---

### TC-L7: Manual Audit Ledger Adjustments
* **Story L7:** Enable authorized Finance personnel to post adjustments with mandatory audit reason.
* **Goal:** Verify `POST /api/ledger/customers/{customerId}/adjustment`.
* **Steps:**
  1. Post payload:
     ```json
     {
       "amount": 2500,
       "type": "CREDIT",
       "reason": "Reconciliation of CBE bank service charge reversal",
       "bookingId": null
     }
     ```
* **Expected Result:** Transaction is posted with reference `ADJ-XXXXX`, running balance adjusted, and audit entry generated.

---

### TC-L8: Double-Entry Debit/Credit Integrity Check
* **Story L8:** Prevent invalid transactions with both debit and credit or negative values.
* **Goal:** Verify system rejects illegal financial entries.
* **Steps:**
  1. Attempt to post an adjustment with negative amount `-500`.
* **Expected Result:** Rejected with HTTP 400 Bad Request.

---

### TC-L9: Frontend SOA Table with Color-coded Debits/Credits (SRS §8.7)
* **Story L9:** Render official Statement of Account interface per SRS §8.7 layout.
* **Goal:** Verify visual appearance and calculations in `StatementOfAccountPage.tsx`.
* **Steps:**
  1. Open `http://localhost:5173` and click **"Customer Ledger & SOA"** in the sidebar.
  2. Select a customer from the dropdown.
* **Expected Result:** 
  - Displays KPI summary cards: Total Deposits, Allocated to Bookings, Available Credit, Excess / Refundable Balance.
  - Displays chronological Statement table with green Credit numbers, red Debit numbers, and running balance column.

---

### TC-L10: CSV / PDF Export of Statement of Account
* **Story L10:** Provide export capability for customer audit and external tax reporting.
* **Goal:** Verify **"Export CSV"** and **"Print SOA"** buttons on the SOA page.
* **Steps:**
  1. Click **"Export CSV"**: verify browser downloads a formatted CSV containing headers and transactions.
  2. Click **"Print SOA"**: verify browser opens print preview with official KANAB Motors header.
* **Expected Result:** Formatted print and download functions execute without error.

---

## 📋 SECTION 2: Sales Enquiry Management (Stories E1 – E15)

---

### TC-E1: Sales Enquiry Data Model & Sequential Numbering (`ENQ-YYYY-XXXXX`)
* **Story E1:** Enquiry data model and sequence generator.
* **Goal:** Verify table `sales_enquiry` and sequence `enquiry_number_seq`.
* **Steps:**
  1. Inspect PostgreSQL table `sales_enquiry`.
  2. Create an enquiry and inspect `enquiry_number`.
* **Expected Result:** Formatted as `ENQ-YYYY-XXXXX` (e.g., `ENQ-2026-00001`).

---

### TC-E2: Dynamic 15% Ethiopian VAT Auto-Computation Engine
* **Story E2:** Live VAT calculation on quote creation.
* **Goal:** Verify formula: $\text{Subtotal} = \text{Quantity} \times \text{Unit Price}$, $\text{VAT (15\%)} = \text{Subtotal} \times 0.15$, $\text{Estimated Sales Value} = \text{Subtotal} + \text{VAT}$.
* **Steps:**
  1. Navigate to **"Sales Enquiries & Quotes"** $\rightarrow$ Click **"+ New Sales Enquiry"**.
  2. Enter Quantity `2` and Unit Price `ETB 1,000,000`.
* **Expected Result:**
  - Net Subtotal: `ETB 2,000,000`
  - 15% VAT: `ETB 300,000`
  - Total Estimated Value: `ETB 2,300,000` auto-calculated in real time.

---

### TC-E3: Multi-Vehicle Unit & Pricing Calculation
* **Story E3:** Dynamic vehicle pricing preview based on product catalog selection.
* **Goal:** Changing product auto-populates `sellingPrice` from product catalog.
* **Steps:**
  1. Select a vehicle model in the Enquiry modal.
* **Expected Result:** Unit price field automatically updates with the product's catalog base price.

---

### TC-E4: Salesperson Attribution & Branch Assignment
* **Story E4:** Track salesperson name on all quotations.
* **Goal:** Verify salesperson field persistence.
* **Steps:**
  1. Fill in `salespersonName: "Dawit Kebede"` and submit enquiry.
* **Expected Result:** Enquiry record stores `salesperson_name = 'Dawit Kebede'`.

---

### TC-E5: Customer Prospect Linking & Auto-fill
* **Story E5:** Link enquiry to registered Customer or Dealer.
* **Goal:** Enquiries must reference an existing valid customer ID.
* **Steps:**
  1. Select Customer `CUST-000001` in the enquiry creation form.
* **Expected Result:** Links customer foreign key and renders customer name and TIN.

---

### TC-E6: Create Sales Enquiry API (`POST /api/enquiries`)
* **Story E6:** API endpoint for enquiry generation.
* **Goal:** Verify `POST /api/enquiries`.
* **Steps:**
  1. In Swagger, execute `POST /api/enquiries` with customer, item, quantity, unit price, payment mode.
* **Expected Result:** Returns HTTP 201 with status `SUBMITTED`.

---

### TC-E7: Enquiry Status Lifecycle State Machine
* **Story E7:** Support lifecycle transitions: `SUBMITTED` $\rightarrow$ `APPROVED` $\rightarrow$ `CONVERTED` / `REJECTED`.
* **Goal:** Verify that only valid status transitions are permitted.
* **Steps:**
  1. Inspect status badge on enquiry list: shows `SUBMITTED` for new enquiries.
* **Expected Result:** Transitions occur strictly according to defined business rules.

---

### TC-E8: Sales Manager Review & Approval Workflow
* **Story E8:** Approve enquiry quotation.
* **Goal:** Verify `PATCH /api/enquiries/{id}/status` with `status: "APPROVED"`.
* **Steps:**
  1. In the Enquiries table, click **"Approve"** on a `SUBMITTED` enquiry.
* **Expected Result:** Status badge turns green (`APPROVED`) and unlocks the **"Convert to Booking"** action.

---

### TC-E9: Sales Enquiry Rejection with Mandatory Reason
* **Story E9:** Reject enquiry with mandatory audit reason.
* **Goal:** Verify rejection requires a reason string.
* **Steps:**
  1. Click **"Reject"** on an enquiry and submit reason: *"Customer chose alternative leasing terms"*.
* **Expected Result:** Status becomes `REJECTED` and `rejection_reason` is stored.

---

### TC-E10: Convert Approved Enquiry to Advance Booking
* **Story E10:** 1-Click conversion of approved enquiry into an Advance Booking (`POST /api/bookings/convert-enquiry/{id}`).
* **Goal:** Verify conversion transfers vehicle, quantity, price, customer, and creates a booking.
* **Steps:**
  1. Click **"Convert to Booking"** on an `APPROVED` enquiry.
* **Expected Result:**
  - Enquiry status changes to `CONVERTED`.
  - New Booking `BKG-YYYY-XXXXX` is created with identical financial figures.

---

### TC-E11: Enquiry Expiry & Validity Window Tracking
* **Story E11:** Track validity period of quotes (default 30 days).
* **Goal:** Visual indicator for quotes approaching expiry.
* **Steps:**
  1. Inspect enquiry table: verify creation date and validity indicators.
* **Expected Result:** Outdated quotes are flagged for re-estimation.

---

### TC-E12: Filter Enquiries by Status, Date Range & Salesperson
* **Story E12:** Search and filter enquiries in dashboard.
* **Goal:** Filter buttons: All, Submitted, Approved, Converted, Rejected.
* **Steps:**
  1. Click status filter pill **"Approved"**.
* **Expected Result:** Only approved enquiries are displayed.

---

### TC-E13: Printable Quotation / Proforma Invoice Generation
* **Story E13:** Generate printable proforma quotation.
* **Goal:** Click view/print button on enquiry.
* **Steps:**
  1. Click print icon on an enquiry row.
* **Expected Result:** Displays official quotation voucher with VAT breakdown, terms, and signature lines.

---

### TC-E14: Enquiry Search & Pagination API
* **Story E14:** Fast search by enquiry number, customer name, vehicle model.
* **Goal:** Type in the search input on the Enquiries page.
* **Steps:**
  1. Enter search term (e.g. `ENQ-` or customer name).
* **Expected Result:** Table filters instantly.

---

### TC-E15: Frontend Sales Enquiry Management Dashboard
* **Story E15:** Unified UI for pipeline tracking.
* **Goal:** Verify EnquiriesPage metrics (Total Enquiries, Pipeline Value, Converted Bookings).
* **Steps:**
  1. Open `http://localhost:5173` $\rightarrow$ **"Sales Enquiries & Quotes"**.
* **Expected Result:** KPI cards and interactive table render seamlessly.

---

## 📋 SECTION 3: Advance Order & Booking Management (Stories B1 – B14)

---

### TC-B1: Advance Order Booking Data Model & Sequence (`BKG-YYYY-XXXXX`)
* **Story B1:** Booking table schema and sequence generator.
* **Goal:** Verify table `booking` and sequence `booking_number_seq`.
* **Steps:**
  1. Inspect table `booking` in PostgreSQL.
  2. Create a booking.
* **Expected Result:** Generated booking number matches pattern `BKG-YYYY-XXXXX`.

---

### TC-B2: Configurable Advance Deposit Threshold (Default 20%)
* **Story B2:** Enforce minimum required advance deposit.
* **Goal:** Verify 20% of gross total is pre-calculated as `required_advance_amount`.
* **Steps:**
  1. Create booking for ETB 2,300,000 gross total.
* **Expected Result:** `requiredAdvanceAmount` is set to `ETB 460,000` (20%).

---

### TC-B3: Booking Lifecycle State Machine
* **Story B3:** Order lifecycle: `PENDING_APPROVAL` / `PENDING_DEPOSIT` $\rightarrow$ `CONFIRMED` $\rightarrow$ `ALLOTTED` $\rightarrow$ `SETTLED` / `CANCELLED`.
* **Goal:** Transition tracking based on deposit milestones.
* **Steps:**
  1. Create booking: initial status is `PENDING_APPROVAL` or `APPROVED`.
* **Expected Result:** Status reflects exact payment and allocation state.

---

### TC-B4: Booking Outstanding Balance Auto-Computation
* **Story B4:** Dynamic calculation: $\text{Outstanding Balance} = \text{Gross Total} - \text{Total Amount Deposited}$.
* **Goal:** Verify outstanding balance updates when payments are credited.
* **Steps:**
  1. Inspect booking with Gross Total `1,000,000` and Deposit Paid `300,000`.
* **Expected Result:** Outstanding Balance equals `700,000.00`.

---

### TC-B5: Direct Booking Creation API (`POST /api/bookings`)
* **Story B5:** Create booking directly without an existing enquiry.
* **Goal:** Verify `POST /api/bookings`.
* **Steps:**
  1. In Swagger, execute `POST /api/bookings` with customerId, itemId, quantity, unitPrice, requiredAdvanceAmount.
* **Expected Result:** Returns HTTP 201 with created booking.

---

### TC-B6: Booking Vehicle Stock Queue & Priority Allocation
* **Story B6:** Link booking to vehicle queue for VIN/Chassis allocation.
* **Goal:** Ready for physical unit assignment when stock arrives.
* **Steps:**
  1. View booking in Bookings table: status indicates queue position.
* **Expected Result:** Booking is marked eligible for allocation once advance is satisfied.

---

### TC-B7: Booking Deposit Tracking & Real-time Progress Bar
* **Story B7:** Visual deposit progress bar in UI.
* **Goal:** Display deposited amount vs required advance.
* **Steps:**
  1. Open **"Advance Bookings"** page.
  2. Inspect the "DEPOSIT / ADVANCE PROGRESS" column.
* **Expected Result:** Shows progress bar with paid amount, required amount, and green highlight when advance threshold is reached.

---

### TC-B8: Auto-Promotion to `CONFIRMED` upon Meeting Advance Threshold
* **Story B8:** Automatically promote booking when deposits $\ge$ required advance.
* **Goal:** Payment confirmation triggers booking confirmation.
* **Steps:**
  1. Post BRV deposit equal to or greater than required advance for a booking.
* **Expected Result:** Booking status automatically updates to `CONFIRMED`.

---

### TC-B9: Target Delivery Date Tracking & Overdue Alerts
* **Story B9:** Delivery deadline monitoring.
* **Goal:** Flag bookings approaching or exceeding target delivery date.
* **Steps:**
  1. Inspect booking delivery dates.
* **Expected Result:** Clear date display in bookings list.

---

### TC-B10: Inter-Booking Deposit Transfer API (`POST /api/bookings/transfer`)
* **Story B10:** Transfer deposited funds between bookings.
* **Goal:** Verify `POST /api/bookings/transfer`.
* **Steps:**
  1. In UI, click the transfer icon ($\rightleftharpoons$) on a booking with deposited funds.
  2. Select destination booking and enter transfer amount `ETB 100,000`.
  3. Submit transfer.
* **Expected Result:** HTTP 200/201: Source booking deposit decreases by 100,000; destination booking deposit increases by 100,000.

---

### TC-B11: Source Booking Deposit Deduction and Destination Credit
* **Story B11:** Financial balance consistency during inter-booking transfer.
* **Goal:** Verify neither funds are lost nor duplicated.
* **Steps:**
  1. Check ledger transactions for customer after transfer.
* **Expected Result:** Internal transfer audit entries reflect zero net customer balance change.

---

### TC-B12: Booking Cancellation API (`PATCH /api/bookings/{id}/cancel`)
* **Story B12:** Cancel booking with mandatory cancellation reason.
* **Goal:** Verify `PATCH /api/bookings/{id}/cancel`.
* **Steps:**
  1. In Bookings page, click Cancel icon ($\times$) on an active booking.
  2. Enter reason: *"Customer financing cancelled"*.
  3. Confirm cancellation.
* **Expected Result:** Status becomes `CANCELLED`.

---

### TC-B13: Cancellation Deposit Re-routing (Refundable vs Credit Balance)
* **Story B13:** When a cancelled booking has deposits paid, route funds to `REFUNDABLE` or `CREDIT` balance.
* **Goal:** Prevent stranded deposits on cancelled bookings.
* **Steps:**
  1. Cancel a booking that has ETB 300,000 paid with `routeTo: "REFUNDABLE"`.
  2. Check customer account summary.
* **Expected Result:** Customer's `refundableBalance` increases by ETB 300,000.

---

### TC-B14: Frontend Bookings Management & Allocation Interface
* **Story B14:** Unified Bookings Dashboard.
* **Goal:** Verify KPIs (Total Bookings, Total Booked Value, Deposits Collected).
* **Steps:**
  1. Open `http://localhost:5173` $\rightarrow$ **"Advance Bookings"**.
* **Expected Result:** Real-time statistics, search, status filters, and action modals work smoothly.

---

## 📋 SECTION 4: Customer Deposit & Payment Management via BRV (Stories P1 – P13)

---

### TC-P1: Bank Receipt Voucher (BRV) Schema & Sequence (`BRV-YYYY-XXXXX`)
* **Story P1:** BRV table and sequence generator.
* **Goal:** Verify table `customer_payment` and sequence `receipt_number_seq`.
* **Steps:**
  1. Inspect table `customer_payment`.
  2. Create a payment voucher.
* **Expected Result:** Generates receipt number formatted as `BRV-YYYY-XXXXX`.

---

### TC-P2: Supported Payment Instruments
* **Story P2:** Validate payment instruments (`TRANSFER`, `BANK_DEPOSIT`, `CHEQUE`, `CASH`).
* **Goal:** Verify selection and persistence of instrument types.
* **Steps:**
  1. Open **"BRV Receipts & Deposits"** $\rightarrow$ Click **"+ New BRV Deposit"**.
  2. Select payment method dropdown.
* **Expected Result:** Displays Bank Wire Transfer, CPO / Deposit Slip, Cheque, and Cash.

---

### TC-P3: Bank Slip & Reference Code Uniqueness Validation
* **Story P3:** Capture bank reference (TT number, CPO number, slip number).
* **Goal:** Verify bank reference is stored and searchable.
* **Steps:**
  1. Submit BRV with `referenceNumber: "CBE-TT-998877"`.
* **Expected Result:** Reference is stored and searchable in the payments list.

---

### TC-P4: Deposit Inflow Purpose Categorization
* **Story P4:** Link deposit to specific booking or general account balance.
* **Goal:** Verify optional booking assignment.
* **Steps:**
  1. In the New BRV modal, select a customer.
  2. Observe linked booking dropdown: shows customer's active bookings.
* **Expected Result:** Can link deposit to a specific booking or leave unassigned as general credit.

---

### TC-P5: Create BRV Payment Record API (`POST /api/payments`)
* **Story P5:** Submit new BRV voucher into verification queue.
* **Goal:** Verify `POST /api/payments`.
* **Steps:**
  1. In Swagger, execute `POST /api/payments` with customer, amount, instrumentType, bankName, referenceNumber.
* **Expected Result:** Returns HTTP 201 with status `SUBMITTED`.

---

### TC-P6: Finance Verification Queue (`status: SUBMITTED`)
* **Story P6:** Unconfirmed payments do not affect ledger until confirmed.
* **Goal:** Verify two-stage audit control (Maker-Checker principle).
* **Steps:**
  1. Create a payment: status is `SUBMITTED`.
  2. Check customer ledger.
* **Expected Result:** Ledger balance is NOT altered until Finance explicitly confirms the payment.

---

### TC-P7: BRV Confirmation Workflow (`PATCH /api/payments/{id}/confirm`)
* **Story P7:** Finance auditor confirms bank deposit slip against bank statement.
* **Goal:** Verify `PATCH /api/payments/{id}/confirm`.
* **Steps:**
  1. In Payments table, click **"Confirm"** on a `SUBMITTED` payment.
* **Expected Result:** Payment status becomes `CONFIRMED`.

---

### TC-P8: Automated Ledger Credit Transaction Generation on Confirmation
* **Story P8:** Confirming payment automatically writes a CREDIT transaction to `customer_ledger_transaction`.
* **Goal:** Ledger posting occurs atomically on confirmation.
* **Steps:**
  1. Confirm payment.
  2. Inspect `customer_ledger_transaction`.
* **Expected Result:** A CREDIT entry is posted referencing `BRV-YYYY-XXXXX`, and running balance increments.

---

### TC-P9: Automated Booking Deposit Allocation & Balance Reduction
* **Story P9:** If payment is linked to a booking, update `totalAmountDeposited` and `outstandingBalance`.
* **Goal:** Booking deposit progress updates automatically.
* **Steps:**
  1. Confirm a payment linked to booking `BKG-2026-00001`.
  2. Inspect the booking.
* **Expected Result:** `totalAmountDeposited` increases by payment amount, and `outstandingBalance` decreases.

---

### TC-P10: Payment Rejection Workflow with Audit Reason (`PATCH /api/payments/{id}/reject`)
* **Story P10:** Reject invalid or bounced slips with audit reason.
* **Goal:** Verify rejection transitions status to `REJECTED`.
* **Steps:**
  1. Reject payment with reason: *"Cheque returned due to insufficient drawer funds"*.
* **Expected Result:** Status is `REJECTED`, no ledger credit is posted.

---

### TC-P11: Official 3-Signature BRV Voucher Print Layout
* **Story P11:** Render official printable voucher per Ethiopian accounting standards.
* **Goal:** Click print icon on any BRV voucher in the table.
* **Steps:**
  1. Click printer icon on a payment row.
* **Expected Result:** Opens modal with company TIN, VAT registration, receipt number, amount in ETB, and signature lines for Cashier, Accountant, and Finance Manager.

---

### TC-P12: Deposit Payments Search, Date Filtering & Reconciliation
* **Story P12:** Filter vouchers by date range, bank name, reference number.
* **Goal:** Fast audit lookup.
* **Steps:**
  1. Type CBE reference in search bar.
* **Expected Result:** Instantly filters matching voucher.

---

### TC-P13: Frontend Bank Receipt Voucher Management Interface
* **Story P13:** PaymentsPage metrics & interactive table.
* **Goal:** Verify KPIs (Total Confirmed Inflow, Pending Verification, Total BRVs Issued).
* **Steps:**
  1. Open `http://localhost:5173` $\rightarrow$ **"BRV Receipts & Deposits"**.
* **Expected Result:** All KPI cards, filters, and action buttons render correctly.

---

## 📋 SECTION 5: Excess Payment & Customer Credit Management (Stories X1 – X8)

---

### TC-X1: Automatic Overpayment Detection on Booking Settlement
* **Story X1:** Detect payments exceeding booking total order value.
* **Goal:** System flags surplus deposits as unallocated excess.
* **Steps:**
  1. On a booking with balance `ETB 100,000`, confirm a payment of `ETB 150,000`.
* **Expected Result:** Booking is marked settled; ETB 50,000 is recognized as excess funds.

---

### TC-X2: Excess Deposit Calculation & Segregation
* **Story X2:** Maintain separate tracking for unallocated excess funds.
* **Goal:** Verify `excess_payments` in `customer_account_summary`.
* **Steps:**
  1. Query `customer_account_summary` for customer with excess payment.
* **Expected Result:** `excess_payments` reflects unallocated balance.

---

### TC-X3: 1-Click Excess Routing API (`POST /api/excess/customers/{id}/route`)
* **Story X3:** Route excess funds to customer credit or refundable balance.
* **Goal:** Verify endpoint `POST /api/excess/customers/{id}/route`.
* **Steps:**
  1. In Settlement page $\rightarrow$ **"Excess Deposits & Credit Routing"** tab.
  2. Click **"Route Deposit Funds"** on a customer row.
* **Expected Result:** Modal opens allowing selection of destination (`TRANSFER_TO_REFUNDABLE` or `TRANSFER_TO_CREDIT`) and amount.

---

### TC-X4: Route Excess to Customer Credit Balance (`TRANSFER_TO_CREDIT`)
* **Story X4:** Retain excess funds in company as store credit for future invoices/parts.
* **Goal:** Increases `availableCredit`.
* **Steps:**
  1. Submit routing with destination `TRANSFER_TO_CREDIT`.
* **Expected Result:** `availableCredit` increments; funds are retained for future sales.

---

### TC-X5: Route Excess to Customer Refundable Balance (`TRANSFER_TO_REFUNDABLE`)
* **Story X5:** Move excess funds to refundable balance to enable payout disbursement.
* **Goal:** Increases `refundableBalance`.
* **Steps:**
  1. Submit routing with destination `TRANSFER_TO_REFUNDABLE`.
* **Expected Result:** `refundableBalance` increments, unlocking refund payout eligibility.

---

### TC-X6: Company Credit Balance Audit Trail & Ledger Logging
* **Story X6:** Log internal routing in audit trail.
* **Goal:** Ensure every reclassification is recorded with user attribution.
* **Steps:**
  1. Check audit log after routing.
* **Expected Result:** Audit entry captures old vs new balance classifications.

---

### TC-X7: Excess & Credit Balance Portfolio Reporting API
* **Story X7:** Report outstanding excess funds and customer credit.
* **Goal:** Verify `GET /api/excess/reports/excess-payments` and `GET /api/excess/reports/credit-balances`.
* **Steps:**
  1. Execute report endpoints via Swagger.
* **Expected Result:** Returns aggregated excess liability summary.

---

### TC-X8: Frontend Excess Deposit & Customer Credit Routing Dashboard
* **Story X8:** SettlementPage Tab 2 interface.
* **Goal:** Verify customer excess list and routing modal.
* **Steps:**
  1. Navigate to **"Excess & Refund Payouts"** $\rightarrow$ Tab: **"Excess Deposits & Credit Routing"**.
* **Expected Result:** Displays customer table with "Route Deposit Funds" modal.

---

## 📋 SECTION 6: Refund Management with SRS §7.4 Validation (Stories R1 – R12)

---

### TC-R1: Customer Refund Request Schema & Sequence (`RFD-YYYY-XXXXX`)
* **Story R1:** Refund request data model and sequence generator.
* **Goal:** Verify table `customer_refund` and sequence `refund_number_seq`.
* **Steps:**
  1. Inspect table `customer_refund`.
  2. Submit a refund request.
* **Expected Result:** Generates refund number formatted as `RFD-YYYY-XXXXX`.

---

### TC-R2: Strict SRS §7.4 Refund Limit Enforcement
* **Story R2:** **CRITICAL COMPLIANCE:** A refund request CANNOT exceed the customer's available refundable balance.
* **Goal:** Verify server-side rejection if `refundAmount > refundableBalance`.
* **Steps:**
  1. Select customer with `refundableBalance = ETB 50,000`.
  2. Attempt to request refund of `ETB 100,000`.
  3. Submit request.
* **Expected Result:** 
  - Server returns HTTP 400 Bad Request.
  - Error message: *"Refund amount (100,000) exceeds customer refundable balance (50,000) per SRS §7.4"*.
  - Verified by automated unit test in `refunds.service.spec.ts`.

---

### TC-R3: Customer Bank Payout Destination Validation
* **Story R3:** Capture bank account details for wire disbursement.
* **Goal:** Validate payout method and banking particulars.
* **Steps:**
  1. Submit refund request with disbursement method (Bank Wire, CPO, Cheque, Cash).
* **Expected Result:** Banking details are stored on the refund record.

---

### TC-R4: Create Customer Refund Request API (`POST /api/refunds`)
* **Story R4:** Submit refund request into review queue.
* **Goal:** Verify `POST /api/refunds`.
* **Steps:**
  1. In Swagger, execute `POST /api/refunds` with valid customerId, amount $\le$ refundableBalance, refundReason, refundMethod.
* **Expected Result:** Returns HTTP 201 with status `REQUESTED`.

---

### TC-R5: 4-Stage Approval Pipeline — Stage 1: Branch Review (`PATCH /api/refunds/{id}/review`)
* **Story R5:** Sales / Branch operations initial verification.
* **Goal:** Transition status from `REQUESTED` to `REVIEWED`.
* **Steps:**
  1. In Refund table, click **"Review"** on a `REQUESTED` refund.
* **Expected Result:** Status badge updates to `REVIEWED`.

---

### TC-R6: 4-Stage Approval Pipeline — Stage 2: Manager Approval (`PATCH /api/refunds/{id}/approve`)
* **Story R6:** Sales Manager approval.
* **Goal:** Transition status from `REVIEWED` to `APPROVED`.
* **Steps:**
  1. Click **"Manager Approve"** on a `REVIEWED` refund.
* **Expected Result:** Status badge updates to `APPROVED` and routes to Finance Audit.

---

### TC-R7: 4-Stage Approval Pipeline — Stage 3: Finance Audit & Processing (`PATCH /api/refunds/{id}/process`)
* **Story R7:** Finance department audit and authorization.
* **Goal:** Transition status from `APPROVED` to `FINANCE_PROCESSED`.
* **Steps:**
  1. Click **"Finance Audit"** on an `APPROVED` refund.
* **Expected Result:** Status badge updates to `FINANCE_PROCESSED`.

---

### TC-R8: 4-Stage Approval Pipeline — Stage 4: Disbursement & Payout Confirmation (`PATCH /api/refunds/{id}/confirm-payout`)
* **Story R8:** Cashier / Treasury dispatches funds and enters wire reference.
* **Goal:** Transition status to `CONFIRMED`.
* **Steps:**
  1. Click **"Confirm Payout"** on a `FINANCE_PROCESSED` refund.
* **Expected Result:** Status becomes `CONFIRMED`.

---

### TC-R9: Automated Ledger Debit Posting upon Refund Payout Confirmation
* **Story R9:** Confirming payout automatically posts a DEBIT transaction to customer ledger.
* **Goal:** Reconcile customer ledger on cash outflow.
* **Steps:**
  1. Confirm refund payout.
  2. Inspect `customer_ledger_transaction`.
* **Expected Result:** DEBIT transaction is posted referencing `RFD-YYYY-XXXXX`, reducing running balance.

---

### TC-R10: Customer Refundable Balance Deduction & Account Summary Synchronization
* **Story R10:** Deduct refund amount from `refundable_balance` in `customer_account_summary`.
* **Goal:** Account summary accurately reflects settled refund.
* **Steps:**
  1. Query `customer_account_summary` after payout.
* **Expected Result:** `refundable_balance` decreases by exact payout amount.

---

### TC-R11: Refund Request Rejection Workflow (`PATCH /api/refunds/{id}/reject`)
* **Story R11:** Reject refund request with mandatory explanation.
* **Goal:** Transition status to `REJECTED`.
* **Steps:**
  1. In Swagger, execute `PATCH /api/refunds/{id}/reject` with `reason: "Invalid claim documentation"`.
* **Expected Result:** Status becomes `REJECTED`; refundable balance remains intact.

---

### TC-R12: Frontend Customer Refund Management & Audit Workflow Interface
* **Story R12:** Complete UI for managing refund pipeline.
* **Goal:** Verify SettlementPage Tab 1 interface.
* **Steps:**
  1. Open `http://localhost:5173` $\rightarrow$ **"Excess & Refund Payouts"**.
  2. Test **"+ Request Refund"** button and live workflow stage buttons.
* **Expected Result:** Full lifecycle (Request $\rightarrow$ Review $\rightarrow$ Approve $\rightarrow$ Finance $\rightarrow$ Payout) can be executed and tracked in real-time.

---

## 🚀 Quick Verification Command Reference

```powershell
# 1. Run all backend unit tests (includes SRS §7.4 refund validation & ledger pessimistic locks)
cd d:\kanab\backend
npm test

# 2. Re-verify backend compilation
npm run build

# 3. Re-verify frontend production build
cd d:\kanab\frontend
npm run build
```
