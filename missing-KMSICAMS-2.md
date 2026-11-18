# KANAB Motors — Testing Guide for New Additions & Corrections (`missing-KMSICAMS-2`)

> **Ticket Code:** `KMSICAMS-2` — Sales & Financial Pipeline (Client Feedback & Red-Line Jira Updates)  
> **Document Purpose:** Comprehensive, step-by-step quality assurance and demonstration guide covering all newly added stories, client feedback enhancements, and architectural corrections.  
> **Backend Base URL:** `http://localhost:3000/api` (Local) / `https://kanab.skylinkict.com/api` (Production VPS)  
> **Frontend Application:** `http://localhost:5173` (Local) / `https://kanab.skylinkict.com` (Production VPS)  
> **Docker Hub Images:** `poggab/kanab-backend:latest` & `poggab/kanab-frontend:latest`  

---

## 📌 Executive Summary of What Was Corrected & Added

| # | Story / Module | Type | Description |
|---|---|:---:|---|
| **1** | **Commission Agent Tracking & Auto-Calculation** | **NEW STORY 1** | Lead source `COMMISSION_AGENT`, Agent profile, dynamic live commission formula ($\text{Sales Amount} \times \frac{\text{Commission \%}}{100}$), pipeline carry-forward, and executive reporting. |
| **2** | **Customer Vehicle Inspection & Expiration Governance** | **NEW STORY 2** | Physical pre-purchase inspection workflow (`INSP-YYYY-XXXXX`), allowed duration (default 2h), live countdown timer, extension with reason, cancellation with reason, technical outcomes (`ACCEPTED`/`REJECTED`/`PENDING_DECISION`), and automated enquiry cancellation upon expiration. |
| **3** | **Financing Institution Tracking (Bank & Microfinance)** | **NEW STORY 3** | `CASH`, `BANK_FINANCING`, `MICROFINANCE_FINANCING`, loan officer tracking, live loan amount & customer equity calculation ($100 - \text{Financing \%}$), lifecycle tracking modal, and financing performance dashboard. |
| **4** | **Pre-Advance Slip Auto-Generation & Validity (E16–E18)** | **RED UPDATE** | Auto-generated upon Sales Manager approval, 100% advance price lock, 3-day validity window countdown, and printable PDF document. |
| **5** | **100% Full Advance Booking Mandate (B3–B4)** | **RED UPDATE** | Enforces that every booking originates from an approved enquiry with a valid Pre-Advance Slip and locks the required advance to 100% full current price. |
| **6** | **Installment Payment Approval Gate (P14)** | **RED UPDATE** | Enforces CEO / CSO management sign-off before split or installment payment vouchers can be confirmed. |
| **7** | **Atomic Customer Credit Transfer (X9–X10)** | **RED UPDATE** | Atomic two-sided ledger posting transferring available credit between accounts with strict idempotency and audit logs. |
| **8** | **UI/UX Transformation** | **RED UPDATE** | Redesigned the Sales Enquiry page into the sleek, modern aesthetic of the Supplier Master Data page with 4 top navigation tabs and real-time KPI metrics. |

---

## 📑 SECTION 1: Commission Agent Tracking & Automatic Calculation (New Story 1)

### Feature Overview
When a vehicle deal is facilitated by an intermediary or broker, the sales representative can select `COMMISSION_AGENT` as the lead source. The system captures the agent's identity, contact information, and agreed commission percentage, dynamically computing the exact commission amount live and persisting it across the booking and order lifecycle.

---

### TC-COMM-01: Commission Agent Field Trigger & Dynamic Calculation
* **Objective:** Verify that selecting `COMMISSION_AGENT` triggers the commission section and dynamically computes the commission amount.
* **Prerequisites:** User is signed in as a Salesperson or Admin.
* **Test Steps:**
  1. Navigate to **Commercial Sales** $\rightarrow$ **Sales Enquiry Pipeline**.
  2. Click **+ New Sales Enquiry**.
  3. Select Customer: `CUST-000001 — Alazar Commercial Trade`.
  4. Select Vehicle Item: `BP-002 (kanab-0032)` with Unit Price `ETB 1,500,000.00`, Quantity: `1`.
  5. Note the Subtotal (`ETB 1,500,000.00`), VAT 15% (`ETB 225,000.00`), and Estimated Sales Value (`ETB 1,725,000.00`).
  6. In **Lead Source**, select `COMMISSION_AGENT`.
  7. **Verify:** A highlighted purple section **"Commission Agent Details & Auto-Calculation"** appears.
  8. Enter Agent Name: `Dawit Kebede`.
  9. Enter Agent Phone: `+251 911 334455`.
  10. Enter Commission Rate: `3.00` (%).
  11. **Verify:** The Auto-Calculated Commission field instantly updates to:
      $$\text{ETB } 1,725,000.00 \times \frac{3.00}{100} = \text{ETB } 51,750.00$$
  12. Change Quantity from `1` to `2`.
  13. **Verify:** Estimated Sales Value becomes `ETB 3,450,000.00` and Commission Amount automatically updates to `ETB 103,500.00` without page refresh.
* **Expected Result:** Commission amount is calculated live and remains read-only.

---

### TC-COMM-02: Commission Rate Boundary & Mandatory Field Validation
* **Objective:** Verify that invalid commission rates ($\le 0\%$ or $> 100\%$) and missing agent credentials are blocked.
* **Test Steps:**
  1. In the New Sales Enquiry modal with `COMMISSION_AGENT` selected, leave Agent Name empty.
  2. Click **Submit Enquiry**.
  3. **Verify Error:** *"Commission Agent Name is mandatory when lead source is Commission Agent."*
  4. Fill in Agent Name: `Dawit Kebede`.
  5. Set Commission Rate % to `0`.
  6. Click **Submit Enquiry**.
  7. **Verify Error:** *"Commission Percentage must be between 0.01% and 100%."*
  8. Set Commission Rate % to `105`.
  9. Click **Submit Enquiry**.
  10. **Verify Error:** *"Commission Percentage must be between 0.01% and 100%."*
  11. Set Commission Rate % to `2.5`.
  12. Click **Submit Enquiry**.
* **Expected Result:** The enquiry submits successfully with code `201 Created`.

---

### TC-COMM-03: Commission Display in Enquiry Pipeline & Booking Carry-Forward
* **Objective:** Verify that commission details appear as an badges in the table and are carried forward when converting to a booking.
* **Test Steps:**
  1. On the **Sales Enquiry Pipeline** tab, locate the newly created enquiry.
  2. Inspect the **Vehicle Model** column.
  3. **Verify:** A badge is displayed:
     `🤝 Agent: Dawit Kebede (2.5% · ETB 43,125.00)`.
  4. Click **Approve** (as Sales Manager).
  5. Click **Convert to Booking**.
  6. In the database / backend inspect `booking` record for the new booking number.
* **Expected Result:** `booking.commission_agent_name = 'Dawit Kebede'`, `booking.commission_percentage = 2.50`, and `booking.commission_amount = 43125.00` are populated.

---

### TC-COMM-04: Commission Intelligence Performance Dashboard
* **Objective:** Verify the executive Commission Agent Performance dashboard.
* **Test Steps:**
  1. On the top navigation bar, click the tab **Commissions & Financing Intelligence**.
  2. Locate the left panel: **Commission Agent Tracking (Story 1)**.
  3. **Verify KPI Cards:**
     - **Active Agents:** Count of distinct agents registered.
     - **Agent Deals:** Total count of enquiries tied to commission agents.
     - **Accrued Commission:** Total ETB value of commissions payable.
  4. Inspect the **Agent Breakdown Table**:
     - Verify columns: `AGENT NAME`, `PHONE`, `DEALS`, `SALES VOLUME`, `COMMISSION`.
     - Confirm `Dawit Kebede` is listed with accurate deal count and accrued commission total.
* **Expected Result:** `GET /enquiries/reports/commissions` returns accurate, aggregated agent metrics.

---

## 📑 SECTION 2: Customer Vehicle Inspection & Expiration Management (New Story 2)

### Feature Overview
Before confirming a vehicle purchase or converting to a booking, customers can perform a physical vehicle inspection. The system assigns a sequence number (`INSP-YYYY-XXXXX`), records vehicle specifications (VIN/Chassis and Engine #), sets a strict duration countdown (default 2 hours / 120 min), and automatically cancels the enquiry if the inspection window expires without completion.

---

### TC-INSP-01: Schedule a Physical Vehicle Inspection
* **Objective:** Verify scheduling a vehicle inspection with auto-generated reference number.
* **Test Steps:**
  1. Go to the **Sales Enquiry Pipeline** tab.
  2. On an enquiry in `SUBMITTED` or `APPROVED` status, locate the **Inspect** button in the Actions column.
  3. Click **Inspect** (or go to the **Vehicle Inspections & Expirations** tab and click **Schedule Vehicle Inspection**).
  4. **Verify Modal:** Header reads **"Schedule Vehicle Inspection"** with enquiry reference and customer name.
  5. Enter VIN / Chassis Number: `WBA33AY08PFS99120`.
  6. Enter Engine Number: `ENG-772910-ET`.
  7. Inspector Name defaults to logged-in user or type: `Senior Technical Inspector`.
  8. Allowed Duration defaults to `120` minutes (2 hours).
  9. Enter Pre-Check Notes: `Battery health test 98%, paint thickness verified, odometer 12 km`.
  10. Click **Start Inspection & Timer**.
* **Expected Result:** Inspection is created with status `IN_PROGRESS`, start timestamp `started_at = now()`, and deadline `deadline_at = now() + 120 minutes`.

---

### TC-INSP-02: Live Reactive Countdown Timer & Status Badges
* **Objective:** Verify the live countdown timer updates every second and changes styling as the deadline approaches.
* **Test Steps:**
  1. View the enquiry row in the **Sales Enquiry Pipeline** or go to the **Vehicle Inspections & Expirations** tab.
  2. Observe the Inspection column:
     - **Verify:** A badge with a timer is ticking down in real-time (e.g., `⏳ 1h 59m 45s`).
     - **Color Thresholds:**
       - $> 30\text{ minutes remaining:}$ Cyan badge (`badge-cyan`).
       - $0\text{ to }30\text{ minutes remaining:}$ Amber warning badge (`badge-amber`).
       - $\le 0\text{ minutes:}$ Rose expired badge (`badge-rose`).
* **Expected Result:** Countdown ticks down seamlessly without requiring page reload.

---

### TC-INSP-03: Extend Inspection Duration with Mandatory Justification
* **Objective:** Verify that an in-progress inspection can be extended with a mandatory audit reason.
* **Test Steps:**
  1. In the **Vehicle Inspections & Expirations** tab, locate the running inspection.
  2. Click the **Extend** button.
  3. Select Extension Time: `+30 Minutes` (or `+60 Minutes`).
  4. Leave Extension Reason empty and click **Confirm Extension**.
  5. **Verify Error:** *"Extension reason is mandatory."*
  6. Enter Reason: `Workshop lift was occupied; suspension ultrasound scan delayed by 25 minutes.`
  7. Click **Confirm Extension**.
* **Expected Result:**
  - Deadline `deadline_at` is extended by 30 minutes.
  - Duration displays `120 min (+30m ext)`.
  - Countdown timer immediately reflects the additional 30 minutes.

---

### TC-INSP-04: Complete Inspection with "ACCEPTED" Outcome & Customer Ack
* **Objective:** Verify successful completion of an inspection clearing the vehicle for booking.
* **Test Steps:**
  1. On the active inspection, click **Complete**.
  2. In **Customer Technical Inspection Outcome**, select:
     `ACCEPTED — Vehicle passed technical checks & accepted by customer`.
  3. Enter Findings / Notes: `Customer test drove for 15 km, battery thermal management verified, zero cosmetic flaws.`
  4. Check the box: **"Customer Signed Physical Vehicle Inspection Acknowledgment Slip"**.
  5. Click **Confirm Completion**.
* **Expected Result:**
  - Inspection status changes to `COMPLETED`.
  - Outcome badge displays `ACCEPTED` in green.
  - Enquiry row shows `✓ Accepted` and remains eligible for immediate booking conversion.

---

### TC-INSP-05: Inspection Cancellation with Mandatory Reason
* **Objective:** Verify that an inspection can be cancelled with audit justification.
* **Test Steps:**
  1. On an in-progress inspection, click **Cancel**.
  2. Leave Cancellation Reason empty and submit.
  3. **Verify Error:** *"Cancellation reason is mandatory."*
  4. Enter Reason: `Customer cancelled appointment due to scheduling conflict.`
  5. Submit.
* **Expected Result:** Inspection status updates to `CANCELLED`, and audit notes record the reason.

---

### TC-INSP-06: Automatic Expiration & Sales Enquiry Cancellation
* **Objective:** Verify that when the allowed duration deadline passes without completion, the inspection expires and the sales enquiry is automatically cancelled.
* **Test Steps:**
  1. Schedule an inspection on a test enquiry with a duration of `1` minute (or simulate deadline expiration).
  2. Wait for the countdown timer to reach `0s`.
  3. Trigger background expiration sweep via backend operational endpoint:
     `GET /enquiries/inspections` or wait for system timer.
  4. Refresh the **Sales Enquiry Pipeline** table.
* **Expected Result:**
  - Inspection status updates to `EXPIRED`.
  - Sales enquiry status automatically updates to `CANCELLED`.
  - Rejection / cancellation reason states: *"Customer failed to complete vehicle inspection within the allowed period"*.

---

## 📑 SECTION 3: Financing Institution Tracking & Calculation — Bank & Microfinance (New Story 3)

### Feature Overview
Accommodates vehicle purchases financed via commercial banks or microfinance institutions (MFIs). The system captures the credit provider, contact officer, and financing ratio (default 70%), dynamically computing the loan amount versus customer equity contribution, and providing a lifecycle management modal.

---

### TC-FIN-01: Bank Financing Selection & Live Calculation Formula
* **Objective:** Verify live auto-calculation of financed loan amount and customer contribution.
* **Test Steps:**
  1. Click **+ New Sales Enquiry**.
  2. Select Customer and Vehicle Item: Total Value = `ETB 2,000,000.00`.
  3. In **Commercial Financing Structure**, select `Bank Financing (Commercial Bank)`.
  4. **Verify:** Financing % defaults to `70`%.
  5. **Verify Live Calculations:**
     - **Auto-Calculated Financed Amount (70%):**
       $$\text{ETB } 2,000,000.00 \times \frac{70}{100} = \text{ETB } 1,400,000.00$$
     - **Customer Contribution Required (30%):**
       $$\text{ETB } 2,000,000.00 - \text{ETB } 1,400,000.00 = \text{ETB } 600,000.00$$
  6. Change Financing % to `80.0`.
  7. **Verify:**
     - Financed Amount updates to `ETB 1,600,000.00`.
     - Customer Contribution updates to `ETB 400,000.00 (20%)`.
* **Expected Result:** Math is dynamic and computed in real-time.

---

### TC-FIN-02: Microfinance Institution (MFI) Financing
* **Objective:** Verify MFI financing options and institution metadata capture.
* **Test Steps:**
  1. In the New Sales Enquiry modal, select `Microfinance Institution (MFI) Financing`.
  2. **Verify Field Label:** Changes to *"MFI Institution Name *"*.
  3. Enter MFI Institution Name: `Sinquee Microfinance Institution`.
  4. Enter Loan Officer: `Tirhas Hailu (Senior Credit Analyst)`.
  5. Enter Officer Phone: `+251 922 889900`.
  6. Submit enquiry.
* **Expected Result:** Enquiry is saved with `financing_option = 'MICROFINANCE_FINANCING'`, `financing_type = 'MICROFINANCE'`, and institution credentials.

---

### TC-FIN-03: Financing Lifecycle Progression Tracking Modal
* **Objective:** Verify advancing financing applications through credit review stages.
* **Test Steps:**
  1. On the **Sales Enquiry Pipeline** table, find the financed enquiry.
  2. Notice the badge:
     `🏦 Commercial Bank of Ethiopia (70% · ETB 1,400,000.00)`.
  3. Click the **Financing** action button.
  4. **Verify Modal:** Header displays **"Commercial Financing Lifecycle Tracking"**.
  5. Select Status: `APPROVED — Formal bank credit commitment letter issued`.
  6. Enter Bank Application Reference Number: `CBE-CR-2026-88192`.
  7. Enter Approved Loan Amount: `1400000`.
  8. Enter Credit Evaluation Notes: `Letter of commitment received from CBE Finfine branch. Disbursement scheduled upon advance deposit confirmation.`
  9. Click **Update Financing Status**.
* **Expected Result:**
  - Status updates to `APPROVED`.
  - Approved loan amount is saved and displayed on the enquiry row.
  - Stage is ready for subsequent `DISBURSED` marking when the bank releases funds.

---

### TC-FIN-04: Institutional Portfolio & Performance Analytics
* **Objective:** Verify the executive dashboard tracking Bank vs MFI financing distribution.
* **Test Steps:**
  1. Navigate to the tab **Commissions & Financing Intelligence**.
  2. Locate the right panel: **Financing Institution Performance (Story 3)**.
  3. **Verify KPI Cards:**
     - **Financed Deals:** Total count of financed enquiries.
     - **Loan Requested:** Total ETB loan volume in pipeline.
     - **Customer Equity:** Total customer cash contribution required.
  4. Inspect the **Institution Performance Table**:
     - Columns: `INSTITUTION`, `TYPE`, `DEALS`, `FINANCED ETB`, `CUSTOMER EQUITY`.
     - Confirm CBE and Sinquee MFI appear with their respective deal counts and loan totals.
* **Expected Result:** `GET /enquiries/reports/financing` aggregates banking exposure accurately.

---

## 📑 SECTION 4: Core Red-Line Jira Updates & Governance Fixes

---

### TC-RED-01: Pre-Advance Slip Auto-Generation & 3-Day Validity (Stories E16–E18)
* **Objective:** Verify that Sales Manager approval automatically generates an official Pre-Advance Slip with a 3-day validity period and 100% advance mandate.
* **Test Steps:**
  1. Create a Sales Enquiry in `SUBMITTED` status.
  2. Click **Approve** as Sales Manager.
  3. **Verify:**
     - Enquiry status updates to `APPROVED`.
     - A Pre-Advance Slip is generated automatically in `pre_advance_slip` table.
  4. Click the **Pre-Advance Slip** button on the enquiry row (or navigate to the **Pre-Advance Slips (3-Day Validity)** tab).
  5. **Verify Printable Sheet Preview:**
     - Slip Number displayed in format `SLIP-YYYY-XXXXX`.
     - 3-day validity window countdown badge (e.g. `⏳ 3d left`).
     - **Required Advance Amount Banner:** Displays **"Advance is 100% of full current price"** (not 25%).
     - Authorized Bank Deposit Accounts listed: CBE, Awash Bank, Dashen Bank.
     - Print Isolation: Clicking **Print Slip** opens clean browser print preview without navigation sidebars.
* **Expected Result:** Complete adherence to stories E16, E17, and E18.

---

### TC-RED-02: 100% Full Advance Booking Mandate (Stories B3–B4)
* **Objective:** Verify that every booking requires 100% advance deposit based on the approved Pre-Advance Slip.
* **Test Steps:**
  1. On an approved enquiry with a valid Pre-Advance Slip, click **Convert to Booking**.
  2. Confirm conversion.
  3. Open the newly created Booking record in **Advance Bookings**.
  4. **Verify Financial Fields:**
     - `required_advance_amount` is equal to `gross_total` ($100\%$ full price).
     - `slip_id` is linked to the active Pre-Advance Slip.
* **Expected Result:** Meets strict mandate that advance bookings require 100% price commitment.

---

### TC-RED-03: Installment Approval Gate (Story P14)
* **Objective:** Verify that installment or split payment vouchers cannot be finalized without CSO / Management sign-off.
* **Test Steps:**
  1. In **BRV Receipts & Deposits**, submit a deposit marked as `isInstallment = true`.
  2. Attempt to click **Confirm** as a standard cashier or sales rep.
  3. **Verify:** Confirmation is blocked with message: *"Installment payments require CEO / CSO management authorization before confirmation."*
  4. Log in as CEO / CSO user (`Admin` or `CSO`).
  5. Endorse installment approval.
  6. Confirm payment voucher.
* **Expected Result:** Two-tier installment governance enforced cleanly.

---

### TC-RED-04: Atomic Customer Credit Transfer (Stories X9–X10)
* **Objective:** Verify two-sided atomic ledger credit transfer between customer accounts.
* **Test Steps:**
  1. Go to **Customer Ledger & SOA** $\rightarrow$ **Excess & Credit Transfers**.
  2. Select Source Customer with available credit of `ETB 100,000.00`.
  3. Select Destination Customer.
  4. Enter Transfer Amount: `ETB 40,000.00`.
  5. Provide Authorization Reference and submit.
  6. **Verify Atomic Ledger Entries:**
     - Source customer ledger shows debit of `ETB 40,000.00` (`running_balance` decreases by 40,000).
     - Destination customer ledger shows credit of `ETB 40,000.00` (`running_balance` increases by 40,000).
     - Both transactions share atomic execution within a single database transaction.
* **Expected Result:** Double-entry ledger integrity is maintained with zero drift.

---

## 📑 SECTION 5: UI & Aesthetics Verification (Supplier Master Style)

### TC-UI-01: Tab Navigation & KPI Header Review
* **Objective:** Verify the visual overhaul of the Sales Enquiry page matching the Supplier Master Data page.
* **Test Steps:**
  1. Open `https://kanab.skylinkict.com` $\rightarrow$ **Pre-Sales & Proforma Pipeline** (`/enquiries`).
  2. Inspect the top breadcrumb:
     `★ Financial Engine / Commercial Sales / Sales Enquiry Pipeline`.
  3. Inspect the 4 Tab Pills:
     - `[📄 Sales Enquiry Pipeline (N)]`
     - `[🚗 Vehicle Inspections & Expirations (N Active)]`
     - `[📋 Pre-Advance Slips (3-Day Validity) (N)]`
     - `[📈 Commissions & Financing Intelligence]`
  4. Switch between all 4 tabs and verify:
     - Tab switching is instant with active styling.
     - KPI metric cards dynamically change based on the active tab context.
     - Tables render with horizontal scroll protection, clean padding, and high-contrast status badges.
* **Expected Result:** Consistent UI language aligning with the procurement and master data modules.

---

## 🚀 Quick Deployment Command (Hostinger VPS)

To deploy these latest builds on your Hostinger production server:

```bash
cd /opt/kanab-motors
docker compose pull && docker compose up -d
```

Verify container health:
```bash
docker compose ps
```
