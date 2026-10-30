# Testing Guide: KMSICAMS-12 (Missing Import Processes - Part 1)

## Overview
**KMSICAMS-12** implements the comprehensive, enterprise-grade import lifecycle for **KANAB Motors**, adhering directly to the Jira & Confluence specifications across all 4 operational phases:
1. **Phase 1: Import Requisition & Requirement Planning** (`IMP-01` – `IMP-06`)
2. **Phase 2: Purchase Order Commercial Terms & Agreements** (`IMP-07` – `IMP-11`, `POX-01` – `POX-08`)
3. **Phase 3: Import Registration & Regulatory Compliance** (`IMP-12` – `IMP-15`)
4. **Phase 4: Payment Schedule & Import Financial Commitments** (`IMP-16` – `IMP-22`)

---

### Architecture & Implemented Components

| Phase & Story IDs | Feature / Area | Technical Components | Business Functionality |
|---|---|---|---|
| **Phase 1**<br>`IMP-01`–`IMP-06` | **Import Requisitions** | `import_requisition`, `import_requisition_line`<br>`ImportRequisitionsService`<br>`ImportRequisitionsPage.tsx` | Requisition draft $\rightarrow$ submit $\rightarrow$ approve/reject workflow; real-time stock-on-hand & pipeline review; safety stock suggestions; one-click conversion to PO with source linkage. |
| **Phase 2**<br>`IMP-07`–`IMP-11`<br>`POX-01`–`POX-08` | **Commercial Terms & PO Printout** | `company_profile`, `company_bank_account`, `supplier`<br>`amount-in-words.ts`<br>`ClientPODocumentModal.tsx` | Importer/Exporter IEC & AD codes; foreign remittance bank accounts; Incoterms, Ports, Lead times, Proforma Invoice; Amount in Words; strict client-format corporate PO document layout (Clauses 1–3, bank snapshot, stamp/signature blocks). |
| **Phase 3**<br>`IMP-12`–`IMP-15` | **Regulatory Compliance** | `import_compliance_record`<br>`PurchaseOrdersService`<br>`PurchaseOrdersPage.tsx` | Compliance checklist tracking (MOTRI Import Permit, NBE Central Bank Forex, ECAE/SGS Pre-Shipment Inspection); stage verification and commercial readiness gating. |
| **Phase 4**<br>`IMP-16`–`IMP-22` | **Payment Schedules & L/C** | `po_payment_schedule`, `po_payment_transaction`, `po_letter_of_credit`<br>`FinancialCommitmentsReport.tsx`<br>`ProcurementReportsPage.tsx` | Milestone payment tracking (Advance, B/L, Delivery); bank wire transaction recording; Letter of Credit (L/C) portfolio tracking; cross-PO financial commitments & outstanding foreign currency liability reporting. |

---

## Prerequisites & Access

- **Frontend Application**: `http://localhost:5173` (or VPS deployed URL)
- **Backend API Base**: `http://localhost:3000/api` (Swagger docs at `/api/docs`)
- **Default Test Users**:
  - **Admin / System Manager**: Full access across all modules
  - **Procurement Officer**: `PURCHASE_ORDERS_VIEW`, `PURCHASE_ORDERS_CREATE`, `PURCHASE_ORDERS_EDIT`
  - **Procurement / General Manager**: `PURCHASE_ORDERS_CONFIRM`, `PURCHASE_ORDERS_CANCEL`
- **Sidebar Navigation Items**:
  - **Procurement & Logistics $\rightarrow$ Import Requisitions**: Planning, review, approval & conversion
  - **Procurement & Logistics $\rightarrow$ Purchase Orders**: Commercial terms, compliance, payment milestones, L/C, and client PDF print
  - **Procurement & Logistics $\rightarrow$ Import Pipeline & Reports**: Tab 4 *"Financial Commitments & L/C (IMP-22)"*

---

## Step-by-Step Test Scenarios

---

### Phase 1: Import Requisition and Requirement Planning

#### Test 1.1: Stock Review & Intelligent Order Planning (`IMP-04`, `IMP-05`)
1. Log into the system and navigate to **Procurement $\rightarrow$ Import Requisitions**.
2. Click **Create Requisition**.
3. In the form, select a product item from the dropdown (e.g., *Bajaj RE 4S 205cc* or a vehicle unit).
4. Notice the **Live Stock & Pipeline Intelligence** panel update automatically:
   - **Current Stock on Hand**: Confirms available physical units across all warehouses.
   - **Reserved Stock**: Units locked for existing approved bookings.
   - **Open PO Pipeline**: Quantities already on order but not yet received.
   - **Safety Stock Threshold & Suggested Order Quantity**: Calculates replenishment deficit automatically based on stock balance and safety buffer.
5. Enter a business unit ID (e.g. `BU-ADDIS-01`), justification note (e.g. `Quarterly Fleet Replenishment`), required delivery date, and add line items with estimated unit prices.
6. Click **Save Requisition**.
7. **Verification**:
   - The requisition appears in the table with status `DRAFT`.
   - Total estimated budget and line count calculate and render correctly.

#### Test 1.2: Requisition Approval State Machine (`IMP-02`, `IMP-03`)
1. In the **Import Requisitions** table, find the newly created `DRAFT` requisition.
2. Click the **Submit** button.
   - Status updates from `DRAFT` to `SUBMITTED`.
3. Test Rejection & Resubmission:
   - Click **Reject Requisition**.
   - A modal prompts for mandatory rejection reason. Enter `"Estimated budget exceeds quarterly threshold"`.
   - Requisition status moves to `REJECTED` and rejection comments are preserved.
   - Notice the **Edit** button is enabled for rejected requisitions so user can adjust lines and budget.
   - Click **Submit** again to re-enter the approval queue.
4. Test Approval:
   - Click **Approve Requisition**.
   - Status transitions to `APPROVED`.
   - The approver's name and approval timestamp are recorded.

#### Test 1.3: One-Click PO Generation with Duplicate Prevention (`IMP-06`)
1. Select the `APPROVED` requisition and click **Convert to PO**.
2. A conversion modal opens displaying:
   - Requisition source reference.
   - Supplier selection dropdown (filtered to active suppliers).
   - Commercial parameters (Incoterms, Mode of Shipment, Destination Port, Lead Time).
   - Default foreign remittance bank account.
3. Select a supplier and click **Generate Purchase Order**.
4. **Verification**:
   - Requisition status automatically updates to `CONVERTED_TO_PO`.
   - A new Purchase Order is created containing all line items, quantities, and pricing mapped from the requisition.
   - Clicking **Convert to PO** again on the same requisition is prevented by the system.

---

### Phase 2: Purchase Order Commercial Terms and Agreements

#### Test 2.1: Importer & Exporter Master Data (`POX-01`, `POX-02`, `POX-03`)
1. Navigate to **Purchase Orders** and click **New Purchase Order**.
2. Examine the commercial fields:
   - **Forex Bank Account**: Lists pre-configured corporate bank accounts showing Bank Name, Account Number, Branch, IFSC, and SWIFT Code.
   - **Incoterms**: Dropdown supporting `FOB`, `CIF`, `CFR`, `EXW`, `DAP`, `CIP`.
   - **Port of Loading**: e.g., `Nhava Sheva (JNPT), Mumbai, India` or `Shanghai Port, China`.
   - **Port of Discharge**: e.g., `Djibouti Free Port / Mojo Dry Port`.
   - **Mode of Shipment**: `SEA`, `AIR`, `LAND`.
   - **Delivery Lead Time**: Configurable lead time days (e.g. `30` days) and Lead Time Trigger (`Upon PO Issuance & Advance Payment`).
   - **Proforma Invoice & Contract Reference**: Number and date capture.
3. Select a supplier and inspect the line item grid:
   - **HSN/SAC Code**: Classification code per line item (default `8711.20` or item code).
   - **Unit of Measure (UOM)**: `PCS`, `SET`, `UNITS`.

#### Test 2.2: Commercial Readiness Checkpoint (`IMP-11`)
1. Create or select a `DRAFT` Purchase Order.
2. In the order row or details modal, click **Verify Commercial Readiness**.
3. **Verification**:
   - If mandatory terms (Incoterms, Ports, Bank Account, Line items) are complete, a green banner confirms:
     `"PO is commercially ready for confirmation and regulatory permit processing."`
   - If required fields are missing, an alert lists the missing commercial prerequisites before progression.

#### Test 2.3: Client-Format PO Document Preview & Amount in Words (`POX-05`, `POX-06`, `POX-07`)
1. In the **Purchase Orders** table, locate any confirmed or draft PO.
2. Click the **Print PO Document** button (Printer icon).
3. The **Client-Format Commercial PO Modal** renders:
   - **Header & Company Profile (`POX-01`)**: KANAB Motors trade name, address, Tax TIN, Importer IEC Code, and AD Code.
   - **Exporter / Supplier Profile (`POX-02`)**: Supplier legal name, factory address, Country of Origin, and Exporter IEC/AD details.
   - **Commercial Matrix**: Tabular breakdown of Incoterms, Payment Terms, Port of Loading, Port of Discharge, Mode of Shipment, Proforma Invoice, and Delivery Lead Time.
   - **Line Items Table (`POX-04`)**: `Sl. No.`, `Item Code`, `Item Description`, `HSN/SAC Code`, `Quantity`, `UOM`, `Unit Rate`, and `Amount`.
   - **Grand Total & Amount in Words (`POX-06`)**: Automatic multi-currency text representation (e.g., `"US DOLLARS ONE HUNDRED TWENTY-FIVE THOUSAND ONLY"`).
   - **Designated Remittance Bank Details (`POX-03`)**: Account name, Bank name, Account number, Branch, IFSC, and SWIFT.
   - **Standard Contractual Conditions (`POX-07`)**:
     - *Clause 1*: Import duties and local taxes on arrival borne by the importing company.
     - *Clause 2*: Bank charges and foreign expenses incurred in supplier's country borne by supplier.
     - *Clause 3*: Delivery lead time rule measured from PO issuance and advance payment completion.
   - **Signatures & Corporate Seal Blocks**: Dual-column sign-off blocks for Authorized Signatory and Supplier Acceptance.
4. Click **Print Document** or **Save PDF** to verify printer CSS output.

---

### Phase 3: Import Registration and Regulatory Compliance

#### Test 3.1: Compliance Checklist Management (`IMP-12`, `IMP-13`, `IMP-14`)
1. In the **Purchase Orders** list, click on any PO to open the **4-Tab Details Modal**.
2. Click the **Regulatory Compliance** tab.
3. Observe the auto-seeded regulatory checklist items:
   - **MOTRI Import Permit**: Ministry of Trade and Regional Integration permit.
   - **NBE Central Bank Approval**: National Bank of Ethiopia foreign exchange allocation approval.
   - **ECAE / SGS PSI Inspection**: Pre-Shipment Inspection quality certificate.
4. Click **Add Compliance Clearance**:
   - Select Clearance Type (e.g., `ECAE Pre-Shipment Inspection (PSI)`).
   - Enter Issuing Authority (e.g., `Societe Generale de Surveillance (SGS)`).
   - Enter Reference Number, Application Date, Issue Date, and Expiry Date.
   - Click **Save Clearance Record**.
5. Test Stage Verification (`IMP-15`):
   - Click **Mark Approved** on a pending permit.
   - Status updates with a green badge (`APPROVED`), recording verification timestamps and audit notes.

---

### Phase 4: Payment Schedule and Import Financial Commitments

#### Test 4.1: Milestone Schedules & Payment Tracking (`IMP-16`, `IMP-17`, `IMP-18`, `IMP-19`)
1. In the PO Details Modal, click the **Payment Schedules** tab.
2. Verify the pre-configured commercial milestones:
   - **30% Advance T/T**: Due upon PO confirmation.
   - **70% Against Bill of Lading (B/L)**: Due upon ocean transit dispatch.
3. Test Payment Recording (`IMP-18`):
   - On the **30% Advance** milestone, click **Record Payment**.
   - Enter Payment Date, Amount Paid (e.g., full or partial advance), Payment Reference (`SWIFT-NBE-2026-9912`), Bank Name (`Commercial Bank of Ethiopia - Forex Div`), and Notes.
   - Click **Confirm Payment Transaction**.
4. **Verification**:
   - The milestone updates with the paid amount and remaining balance.
   - Milestone status automatically transitions to `PARTIALLY_PAID` or `PAID`.
   - The transaction is logged in the immutable transaction history audit trail.

#### Test 4.2: Letter of Credit (L/C) Tracking (`IMP-20`, `IMP-21`)
1. In the PO Details Modal, click the **Letters of Credit** tab.
2. Click **Record Letter of Credit**.
3. Fill in the commercial banking details:
   - **L/C Reference Number**: `LC-CBE-2026-ET-00441`
   - **Issuing Bank**: `Commercial Bank of Ethiopia (CBE) International Banking Dept`
   - **Instrument Amount**: `USD 75,000.00`
   - **Issue Date**: Today's date
   - **Expiry Date**: 90 days from today
   - **Latest Shipment Date**: 60 days from today
4. Click **Save Letter of Credit**.
5. **Verification**:
   - The L/C appears in the portfolio grid with status `ISSUED`.
   - Expiry dates and latest shipment deadlines are tracked and highlighted.

#### Test 4.3: Cross-PO Financial Commitments & Outstanding Balance Report (`IMP-22`)
1. Navigate to **Procurement $\rightarrow$ Import Pipeline & Reports**.
2. Click the new 4th tab: **Financial Commitments & L/C (IMP-22)**.
3. Verify the Summary KPI Cards:
   - **Total Contractual Commitments**: Aggregated milestone obligations across all POs.
   - **Confirmed Disbursed / Paid**: Total confirmed wire settlements and remittances.
   - **Outstanding Balance Payable**: Net outstanding foreign currency liability owed to global suppliers.
   - **Active Letters of Credit**: Count of active commercial bank instruments in effect.
4. Inspect the **Upcoming Milestone Commitments Table**:
   - Groups open milestones with PO Number, Supplier Name, Milestone Name, Due Date, Amount Due, Paid, Remaining, and Status (`PLANNED`, `DUE`, `OVERDUE`).
5. Inspect the **Active Letters of Credit Portfolio Table**:
   - Lists all open L/C instruments with reference, issuing bank, amounts, expiry dates, and shipment deadlines.
6. Click **Refresh Financials** to verify live query recalculation.

---

## API Verification (cURL / PowerShell)

If you prefer testing backend endpoints directly, run the following commands:

### 1. Test Stock Review & Planning Endpoint (`IMP-04`)
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/import-requisitions/stock-review/1" -Method GET
```
*Expected response:*
```json
{
  "itemId": "1",
  "stockOnHand": 24,
  "stockReserved": 8,
  "stockAvailable": 16,
  "openPOQuantity": 50,
  "pendingRequisitionQuantity": 0,
  "totalPipeline": 66,
  "minimumOrderQuantity": 10,
  "safetyStockThreshold": 30,
  "suggestedOrderQuantity": 14
}
```

### 2. Test Commercial Readiness Validation (`IMP-11`)
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/purchase-orders/1/validate-readiness" -Method GET
```
*Expected response:*
```json
{
  "isReady": true,
  "messages": ["PO is commercially ready for confirmation and regulatory permit processing."]
}
```

### 3. Test Cross-PO Financial Commitments Summary (`IMP-22`)
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/purchase-orders/financial-commitments" -Method GET
```
*Expected response:*
```json
{
  "totalCommitted": 125000,
  "totalPaid": 37500,
  "outstandingBalance": 87500,
  "upcomingMilestonesCount": 2,
  "activeLettersOfCreditCount": 1
}
```

---

## Final Verification Checklist

| Phase | Story | Verification Item | Status |
|:---:|:---:|---|:---:|
| **1** | `IMP-01` | Requisitions and line items persist with multi-currency fields | [ ] PASS |
| **1** | `IMP-03` | Status workflow enforces Draft $\rightarrow$ Submitted $\rightarrow$ Approved / Rejected | [ ] PASS |
| **1** | `IMP-04` | Live stock, reserved units, and pipeline quantities display accurately | [ ] PASS |
| **1** | `IMP-06` | Approved requisition converts into PO with source linkage and duplicate lock | [ ] PASS |
| **2** | `POX-01` | Importer IEC & AD codes render on company profile and generated document | [ ] PASS |
| **2** | `POX-03` | Remittance bank account (IFSC / SWIFT) selectable and snapshot captured | [ ] PASS |
| **2** | `POX-05` | Client corporate PO document displays matching client format (Clauses 1–3, seal) | [ ] PASS |
| **2** | `POX-06` | Calculated grand total is rendered in words across multiple currencies | [ ] PASS |
| **2** | `IMP-11` | Commercial readiness check confirms mandatory fields before issuance | [ ] PASS |
| **3** | `IMP-12` | Import compliance records tracked per PO and shipment | [ ] PASS |
| **3** | `IMP-13` | Default permits (MOTRI, NBE FX, PSI) auto-seeded upon PO creation | [ ] PASS |
| **4** | `IMP-16` | Multi-milestone payment schedule created (Advance, B/L) | [ ] PASS |
| **4** | `IMP-18` | Payment transaction records partial/full settlement with bank references | [ ] PASS |
| **4** | `IMP-20` | Letter of Credit tracks issuing bank, expiry date, and shipment deadlines | [ ] PASS |
| **4** | `IMP-22` | Cross-PO Financial Commitments report calculates outstanding supplier balance | [ ] PASS |
