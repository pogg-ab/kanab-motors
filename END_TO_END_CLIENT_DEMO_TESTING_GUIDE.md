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

**Navigation:** `Vehicle Units & Chassis` (`/vehicles`)

### Goal
Demonstrate compliance with **Client Specification: Vehicle Inventory Management, Controlled State Machine & Uniqueness Rules**:
1. **Uniqueness Rules (BR-02)**: The system strictly prevents duplicate:
   - Chassis number (`chassisNumber` UNIQUE)
   - Engine number (`engineNumber` UNIQUE)
   - Vehicle Inventory ID (`id` UNIQUE)
   *(Critically enforced for both imported CBU/CKD shipments and locally assembled units).*
2. **7-Stage Vehicle Controlled State Machine**:
   $$\mathbf{1.\;RECEIVED} \longrightarrow \mathbf{2.\;AVAILABLE\_FOR\_SALE} \longrightarrow \mathbf{3.\;RESERVED} \longrightarrow \mathbf{4.\;ALLOTTED} \longrightarrow \mathbf{5.\;READY\_FOR\_DELIVERY} \longrightarrow \mathbf{6.\;SOLD} \longrightarrow \mathbf{7.\;DELIVERED}$$
   - **1. Received**: Vehicle has physically arrived and been recorded through an approved stock receipt / customs intake. Exists in warehouse, not yet released for sale.
   - **2. Available for Sale**: Vehicle has passed required receiving/PDI inspection checks and can be sold.
   - **3. Reserved**: Vehicle has been reserved against an approved customer booking deposit.
   - **4. Allotted**: A specific chassis/VIN has been assigned to a specific customer booking.
   - **5. Ready for Delivery**: Vehicle has completed all required preparation, PDI, documentation, and invoicing.
   - **6. Sold**: Sales transaction/invoice has been completed according to business rules.
   - **7. Delivered**: Vehicle has physically been handed over to the customer with gate pass.
3. **Controlled Reversible Exceptions**:
   - `RESERVED → AVAILABLE_FOR_SALE`: Automatically allowed when a customer booking is cancelled or deposit expires.
   - `ALLOTTED → RESERVED`: Authorized exception if an approved allotment is cancelled before delivery (frees VIN back to pool).
4. **Important Reservation Validation (BR-04)**:
   - A vehicle **cannot** be reserved if $\text{Status} \neq \text{AVAILABLE\_FOR\_SALE}$ unless a specific authorized workflow permits it.
5. **Single Allocation Concurrency Lock (BR-03)**:
   - The same vehicle **cannot** be allocated to two active bookings simultaneously. Enforced via database and service-level transaction concurrency protection.
6. **Vehicle Detail & Complete Lifecycle Modal (★ Client Specification)**:
   - Click the **Lifecycle** (eye icon) button on any vehicle row to inspect its full 360° lifecycle drawer:
     - **Basic Information**: Chassis number, Engine number, Brand, Model.
     - **Import Information (Module 12 Integration)**: Supplier name, PO reference, Shipment number, Customs declaration reference.
     - **Financial Information (Module 12 Integration)**: Purchase FOB Cost, Allocated Landed Cost (Freight/Duty/Port), Total Capitalized Inventory Valuation.
     - **Warehouse Location**: Current warehouse and physical zone/bay.
     - **Sales / Booking Information**: Customer name, Booking number, Sales Invoice reference.
     - **Status History & Audit Stepper**: Visual stepper tracking progression across all 7 stages with audit timestamps.

### Register Unit input checklist
- Model / Description: choose the vehicle product, e.g. `Bajaj Boxer BM150 Motorcycle`
- Chassis Number: `KANAB-2026-CHAS-E2E-001`
- Engine Number: `KANAB-2026-ENG-E2E-001`
- Current Warehouse: `Kality Assembly Plant Warehouse`
- Import / Production Notes: `E2E demo vehicle unit`

### Status update input checklist
- New Lifecycle Status: choose valid forward transition (e.g. `AVAILABLE_FOR_SALE`) or controlled reverse exception (`RESERVED → AVAILABLE_FOR_SALE`, `ALLOTTED → RESERVED`).
- Notes / Reason: mandatory for state transitions.

### Negative tests
- **BR-02 Duplicate Chassis / Engine**: Try registering a second vehicle with `KANAB-2026-CHAS-E2E-001` $\rightarrow$ System rejects with duplicate validation error alert.
- **BR-03 Double Allocation**: Try allocating an already allotted chassis to another booking $\rightarrow$ System rejects with concurrency lock error.
- **BR-04 Invalid Reservation**: Try reserving a vehicle that is not in `AVAILABLE_FOR_SALE` state $\rightarrow$ System rejects with transition policy error.

### Expected result
- Vehicle appears in registry with real-time status badge and warehouse location.
- Clicking **Lifecycle** opens the comprehensive Vehicle Detail modal showing full provenance (Supplier, PO, Shipment, Landed Cost, Customer, Booking).

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

## Screen 9: Import, Shipment Tracking & Landed Cost Management

**Navigation:** `Procurement & Supply Chain → Shipments & Landed Cost` (`/shipments`)

### Goal
Demonstrate 100% compliance with **Client Specification: Import, Shipment Tracking and Landed Cost Management**:
1. **End-to-End Import Process**: `Supplier → Purchase Order → Supplier Invoice → Shipment Created → Shipping / Bill of Lading → Djibouti Port → Port / Handling Charges → Ethiopian Customs (Customs Duty, VAT, Other Charges) → Clearing Agent → Inland Transport → Landed Cost Calculation → Goods Receipt → Inventory Valuation (Module 13)`.
2. **Import Purchase Order Tracking**: Consolidating confirmed PO lines into international shipments.
3. **Structured Shipment Fields & Container Tracking**: Bill of lading, container references, carrier, origin/destination ports, vessel departure, and arrival dates.
4. **Milestone Tracking Lifecycle**:
   `PO CREATED → READY FOR SHIPMENT → SHIPPED → IN TRANSIT → ARRIVED DJIBOUTI → PORT HANDLING → CUSTOMS CLEARANCE → CLEARED → INLAND TRANSPORT → RECEIVED → LANDED COST POSTED → CLOSED`.
5. **Multi-Currency Management**: Foreign supplier costs (`USD`, `EUR`) combined with local expenses (`ETB`) with immutable baseline exchange rate snapshots.
6. **Landed Cost Components & Formula**:
   $$\text{Landed Cost} = \text{Goods Value} + \text{Freight} + \text{Insurance} + \text{Port Charges} + \text{Customs Costs} + \text{Inland Transport} + \text{Clearing Fees} + \text{Other Capitalizable Costs}$$
7. **Accounting Integration & Financial References**:
   Where accounting integration is required, the system generates proper double-entry accounting references:
   - For Base Goods Receipt:
     $$\text{Inventory (Dr)} \longrightarrow \text{Supplier / Cash / Payable (Cr)}$$
   - For Capitalizable Landed Costs:
     $$\text{Inventory / Landed Cost (Dr)} \longrightarrow \text{Payable / Cash (Cr)}$$
   *(Exact GL accounts and tax treatment configured and approved by Finance).*
8. **10 Import Dashboard KPI Cards**:
   - `Active Shipments`: Active consignment batches in-flight.
   - `In Transit`: Consolidated maritime vessels and cross-border road trucking.
   - `At Djibouti`: Shipments berthed at Doraleh Container Terminal (DCT).
   - `Customs Clearance`: Transit declarations undergoing Ethiopian Customs Commission (ECC) filing.
   - `Delayed`: Consignments exceeding estimated arrival dates (past ETA).
   - `Pending Documents`: Shipments with missing mandatory documents under checklist closure gate.
   - `Pending Landed Cost`: Shipments arriving without finalized landed cost apportionment vouchers.
   - `Received This Month`: Consignments fully taken into physical stock (Module 13).
   - `Total Import Value`: Sum of declared FOB goods values in ETB.
   - `Total Landed Cost`: Total capitalized consignments including freight, duty, port, and trucking.
9. **Shipment Tracking Screen & Filters**:
   - **Recommended Columns**: `Shipment | Supplier | PO Reference | Container / B/L | ETA (Djibouti) | Current Stage | Status`
   - **Recommended Filters**: `Supplier`, `PO`, `Shipment`, `Status (Active / Closed)`, `Current Location/Stage`, `Expected Arrival Date`, `Product`, `Container`, `Date Range`.
10. **3 Executive Import Reports**:
    - **Import Cost Report**: `Shipment | Goods Cost (FOB) | Freight | Customs | Port | Transport | Clearing | Total Landed` (Complete view of real import cost for Finance).
    - **Landed Cost Variance Report**: `Shipment | Estimated Landed Cost | Actual Landed Cost | Variance (ETB) | Variance (%) | Analysis Note` (e.g. IMP-001 20M vs 21M = +1M unfavorable; IMP-002 15M vs 14.5M = -0.5M favorable).
    - **Shipment Delay Report**: `Shipment | Supplier | Expected Date (ETA) | Actual Date (ATA) | Days Delayed | Current Stage | Logistics Root Cause / Reason`.
11. **Permissions & Segregation-of-Duties (RBAC) Matrix**:
    | Function | Procurement | Finance | Warehouse | Manager | Admin |
    |---|:---:|:---:|:---:|:---:|:---:|
    | View Shipment | ✓ | ✓ | ✓ | ✓ | ✓ |
    | Create Shipment | ✓ | - | - | ✓ | ✓ |
    | Update Tracking | ✓ | - | ✓ | ✓ | ✓ |
    | Add Costs | ✓ | ✓ | - | ✓ | ✓ |
    | Calculate Landed Cost | ✓ | ✓ | - | ✓ | ✓ |
    | Approve Landed Cost | - | ✓ | - | ✓ | ✓ |
    | Post Landed Cost | - | ✓ | - | ✓ | ✓ |
    | View Documents | ✓ | ✓ | ✓ | ✓ | ✓ |
    | Close Shipment | ✓ | ✓ | - | ✓ | ✓ |
    *Note: Strict segregation of duties enforces that Procurement cannot approve or post landed costs; only Finance, Manager, and Admin can execute.*
12. **Key Business Rules (Rules 1 to 9)**:
    - **Rule 1 — PO Traceability**: Every shipment must be linked to a valid PO unless explicitly authorized for exceptional imports.
    - **Rule 2 — No Negative Costs**: Cost amounts must be positive unless the transaction is an authorized adjustment.
    - **Rule 3 — Currency Traceability**: Store: Original Currency, Original Amount, Exchange Rate, Base Currency Amount (ETB).
    - **Rule 4 — Allocation Completeness**: Allocated landed cost must equal the amount being allocated ($\text{Total Cost} = \sum \text{Allocations}$ with zero-drift Hare-Niemeyer rounding).
    - **Rule 5 — Inventory Reconciliation**: After posting: $\text{Inventory Valuation} = \text{Supplier Cost} + \text{Capitalized Landed Costs}$.
    - **Rule 6 — No Duplicate Posting**: One landed-cost posting cannot be applied twice.
    - **Rule 7 — Posted Records**: Posted landed costs cannot be freely edited or deleted.
    - **Rule 8 — Historical Exchange Rate**: Posting must preserve the exchange rate snapshot used for the transaction.
    - **Rule 9 — Document Traceability**: Every major cost voucher must have a supporting document where required by Finance.
13. **Acceptance Criteria (AC-01 to AC-20)**:
    - `AC-01 (PO Linkage)`: System can create import shipments from existing confirmed supplier POs.
    - `AC-02 (Shipment Tracking)`: System tracks shipments from supplier dispatch through final warehouse receipt.
    - `AC-03 (Milestones)`: Users can record planned and actual shipment milestones.
    - `AC-04 (Container)`: A shipment can contain multiple containers with individual tare/gross metrics.
    - `AC-05 (Partial Shipment)`: One PO can be linked to multiple split shipments.
    - `AC-06 (Customs)`: Customs declaration, duty, VAT, and related information are recorded.
    - `AC-07 (Import Costs)`: Freight, insurance, port, customs, transport, and clearing costs can be registered.
    - `AC-08 (Multi-Currency)`: USD/EUR and ETB transactions are recorded while retaining original currency values.
    - `AC-09 (Exchange Rate)`: Every foreign-currency cost retains the baseline exchange rate used for conversion.
    - `AC-10 (Allocation)`: Landed costs can be allocated by Value, Quantity, or Weight.
    - `AC-11 (Allocation Validation)`: Sum of allocated costs equals the amount being allocated ($0.00$ cent drift).
    - `AC-12 (Unit Cost)`: System calculates final landed cost per unit.
    - `AC-13 (Vehicle Cost)`: Individually tracked vehicle units (VIN/chassis) receive specific landed cost associations.
    - `AC-14 (Documents)`: 13 import documents can be uploaded and linked to shipments with digital versioning.
    - `AC-15 (Approval)`: Landed cost requires Finance/Manager approval before posting.
    - `AC-16 (Inventory)`: Posted landed cost updates Module 13 inventory asset valuation.
    - `AC-17 (Duplicate Protection)`: System prevents duplicate landed-cost posting.
    - `AC-18 (Adjustment)`: Additional costs discovered after posting are handled through non-destructive valuation adjustments.
    - `AC-19 (Audit)`: All changes, approvals, postings, and adjustments are logged in immutable audit trails.
    - `AC-20 (Reconciliation)`: Full reconciliation between $\text{Supplier Cost} + \text{Capitalized Import Costs} = \text{Total Landed Cost} = \sum \text{Item Allocated Costs} = \text{Inventory Valuation}$.
14. **Zero-Drift Apportionment Methods (Hare-Niemeyer)**:
    - **Method 1 — By Value**: Allocates proportional to FOB price.
    - **Method 2 — By Quantity**: Allocates per unit.
    - **Method 3 — By Weight**: Allocates per gross kg.
15. **Allocation Rule Configuration**:
    | Cost Component | Default Allocation Method |
    |---|---|
    | Freight | By Weight |
    | Insurance | By Value |
    | Port Handling (Djibouti) | By Weight |
    | Customs Duty & VAT | By Value |
    | Clearing Fee | By Value |
    | Inland Transport | By Weight |
    | Supplier Cost | Actual Item Value |
    *Rule: Authorized Finance users can override the allocation method where business rules permit.*
16. **Import Document Center**: 13-document checklist, digital versioning (`v1`, `v2`, `v3`), and closure validation (prevents shipment closure if mandatory documents are missing, subject to authorized override).
17. **Landed Cost Approval Lifecycle**:
    `DRAFT → CALCULATED → SUBMITTED → FINANCE REVIEW → APPROVED → POSTED`.
18. **Module 13 Inventory Valuation Integration**:
    - Automatic per-vehicle landed cost stamping (`Unit Landed Cost ETB`).
    - Inventory received at fully capitalized landed cost (e.g. 508,862.50 ETB/unit vs 168,000.00 ETB base invoice price).
    - **Duplicate Posting Prevention**: System returns *"Landed cost already posted for shipment {shipmentNumber}"* if re-posted.
    - **Cost Adjustment Process**: Subsequent invoices arriving post-receipt create non-destructive *Inventory Valuation Adjustments*.

---

### Step 1: Create Import Shipment
1. Navigate to **Shipments & Landed Cost** and click **+ Create Shipment**.
2. **Shipment Field Specification**:
   - **Shipment No.**: System-generated (e.g. `SHP-202610-001`).
   - **Supplier**: Inferred from linked confirmed PO lines (`E2E Global Motors Supplier 20261001`).
   - **Related Purchase Order**: Select confirmed PO (e.g. `PO-202610-001`).
   - **Shipment Type**: `VEHICLES_CKD_CBU` (or Parts/Kits).
   - **Origin Country & Port**: `India` / `Mumbai Port (Nhava Sheva)`.
   - **Destination Port**: `Djibouti Port`.
   - **Shipping Line / Carrier**: `Maersk Line` (or `Ethiopian Shipping Lines`).
   - **Bill of Lading Number \***: `BL-MSK-20261001-001`.
   - **Container Management**:
     - Container Number: `MSKU-982341-2`
     - Container Count: `1 × 40ft High Cube`
     - Container Type: `40HC`
     - Seal Number: `SL-892104`
     - Gross / Net Weight: `12,500 KG / 10,800 KG`
     - Volume: `68 CBM`
     - Number of Packages: `100 crates`
   - **Date Schedules**:
     - Estimated Departure Date (ETD): Current or past date.
     - Actual Departure Date (ATD): Recorded upon vessel departure.
     - Estimated Arrival Date (ETA Djibouti) \*: Future date (+14 days).
     - Actual Arrival Date (ATA Djibouti): Recorded upon port arrival.
     - Estimated Ethiopia Arrival (ETA Ethiopia): (+21 days).
   - **Landed Cost Apportionment Method \***:
     - `By Value (FOB / CIF Basis Price)` — recommended for mixed vehicle models.
     - `By Quantity (Vehicle Units)` — recommended for identical motorcycle batches.
     - `By Weight (Metric Kg)` — recommended for spare parts shipments.
   - **Consolidated PO Lines \***: Select available confirmed PO line(s) and enter shipped quantity (e.g. `2 units`).
   - **Shipment Notes / Route Details**: `Full container load (FCL), transit via Red Sea to Djibouti, then inland transit to Kality Assembly Plant`.
3. Click **Create Shipment**.

---

### Step 2: Milestone Lifecycle Tracking
Maintain chronological milestone audit history for each shipment:

| Milestone Stage | Planned Date | Actual Date | Operational Description |
|---|---|---|---|
| **Supplier Ready** | 01/10 | 02/10 | Supplier completes factory packing and pre-shipment inspection. |
| **Vessel Departure (SHIPPED)** | 05/10 | 06/10 | Loaded onto vessel at Mumbai Port; B/L issued. |
| **IN TRANSIT** | 12/10 | 12/10 | Deep sea maritime transit through Gulf of Aden. |
| **Djibouti Arrival (ARRIVED DJIBOUTI)** | 20/10 | 22/10 | Vessel berths at Port of Djibouti (Doraleh Container Terminal). |
| **PORT HANDLING** | 22/10 | 23/10 | Terminal container handling, demurrage, and port discharge. |
| **Customs Start (CUSTOMS CLEARANCE)** | 25/10 | 26/10 | Ethiopian Customs transit declaration & clearing agent filing. |
| **Customs Clearance (CLEARED)** | 30/10 | 31/10 | Customs duties, VAT, and surcharges assessed and cleared. |
| **INLAND TRANSPORT** | 02/11 | 02/11 | Cross-border trucking from Djibouti corridor to Addis Ababa. |
| **Warehouse Receipt (RECEIVED)** | 05/11 | 05/11 | Physical vehicle offloading and technical intake at Kality Plant. |

Advance the shipment stage through the action buttons on the shipment detail screen.

---

### Step 3: Import Document Center Checklist
Navigate to the **Document Centre** tab. Verify and upload required shipping documentation:

| Document Type | Mandatory? | Purpose in Import Pipeline |
|---|---|---|
| **Commercial Invoice** | Yes | Supplier declaration of goods value and terms (CIF/FOB). |
| **Packing List** | Yes | Detailed container cargo weight, package count, and volume. |
| **Bill of Lading (B/L)** | Yes | Carrier title document for port release at Djibouti. |
| **Customs Declaration** | Yes | Ethiopian Customs Commission declaration form. |
| **Customs Assessment** | Optional | Formal duty and VAT assessment slip. |
| **Customs Payment Receipt** | Optional | ECC electronic payment confirmation voucher. |
| **Insurance Certificate** | Yes | Marine transport insurance coverage policy. |
| **Freight Invoice** | Optional | Ocean carrier freight invoice. |
| **Port Invoice (Djibouti)** | Optional | Doraleh container terminal handling voucher. |
| **Clearing Agent Invoice** | Optional | Transit clearing and customs agent fee voucher. |
| **Inland Transport Invoice** | Optional | Cross-border corridor trucking fee invoice. |
| **Certificate of Origin** | Optional | Country of origin certification for duty preference. |
| **Other Import Documents** | Optional | Technical specifications, test certificates, or PDI notes. |

> **Document Validation Rule:** The system prevents shipment closure if mandatory documents are missing, subject to authorized override. Document version history is preserved (`v1`, `v2`, `v3`).

---

### Step 4: Record Djibouti Port Handling & Multi-Currency Vouchers
Under the **Cost Components** section, add the multi-currency expenditure vouchers:

1. **Ocean Freight**:
   - Cost Type: `FREIGHT`
   - Currency: `USD`
   - Exchange Rate to ETB: `158.50` (auto-filled snapshot from baseline rates)
   - Amount: `2,200.00 USD` (`348,700.00 ETB`)
   - Vendor: `Maersk Line Ethiopia Agent`
   - Invoice Reference: `INV-MSK-9901`
2. **Djibouti Port Handling**:
   - Cost Type: `PORT_HANDLING`
   - Currency: `USD`
   - Exchange Rate: `158.50`
   - Amount: `650.00 USD` (`103,025.00 ETB`)
   - Vendor: `Djibouti Port SA (DP World / DCT)`
   - Invoice Reference: `DCT-202610-441`
3. **Ethiopian Customs Duties & VAT**:
   - Cost Type: `CUSTOMS_DUTY`
   - Currency: `ETB`
   - Exchange Rate: `1.0000`
   - Amount: `145,000.00 ETB`
   - Vendor: `Ethiopian Customs Commission (ECC)`
   - Invoice Reference: `ECC-DECL-88192`
4. **Clearing Agent & Inland Transport**:
   - Cost Type: `INLAND_TRANSPORT`
   - Currency: `ETB`
   - Exchange Rate: `1.0000`
   - Amount: `85,000.00 ETB`
   - Vendor: `Ethiopian Freight Forwarding & Shipping Enterprise`
   - Invoice Reference: `EFF-TRUCK-102`

---

### Step 5: Execute Landed Cost Allocation & Review Calculation Screen
Navigate to the **Landed Cost Engine (Allocation)** tab:
1. Review the **Landed Cost Aggregation Ledger (ETB)**:
   - Goods Value (Base FOB): `336,000.00 ETB` (2 units @ 168,000 ETB)
   - Total Additional Costs: `681,725.00 ETB` (Freight + Port + Customs + Transport)
   - **Consignment Final Landed Value**: `1,017,725.00 ETB`
2. Select Apportionment Methodology:
   - `By Value (BY_VALUE)` (default for vehicle units).
   - Alternatively select `By Weight` or `By Quantity`.
3. Click **Execute Hare-Niemeyer Zero-Drift Allocation**.
   - Guaranteed **0.00 Cents Rounding Drift** across all lines.
4. **Unit Landed Cost Stamping**:
   - Unit 1 Stamped Landed Cost: `508,862.50 ETB`
   - Unit 2 Stamped Landed Cost: `508,862.50 ETB`
5. **Vehicle-Level Costing Component Breakdown**:
   For each serialized vehicle unit:
   - Base Supplier FOB: `168,000.00 ETB`
   - Freight Share: `174,350.00 ETB`
   - Djibouti Port Share: `51,512.50 ETB`
   - Customs Duty Share: `72,500.00 ETB`
   - Inland Transport Share: `42,500.00 ETB`
   - **Total Landed Cost per Vehicle**: `508,862.50 ETB`
6. Click **Commit to Inventory Asset Ledger →** to post to Module 13 Inventory Valuation.

---

### Step 6: Physical Vehicle Unit Receipt & Stock Intake
When the shipment reaches `RECEIVED` stage:
1. Click **Receive Vehicle Units into Stock**.
2. **Input Checklist**:
   - Warehouse: `Kality Assembly Plant Warehouse`
   - Quantity to Receive: `2`
   - Unit 1:
     - Chassis Number: `KANAB-2026-CHAS-E2E-002`
     - Engine Number: `KANAB-2026-ENG-E2E-002`
   - Unit 2:
     - Chassis Number: `KANAB-2026-CHAS-E2E-003`
     - Engine Number: `KANAB-2026-ENG-E2E-003`
   - Technical Intake Notes: `Received in good condition; container seal verified intact; landed cost capitalized into inventory`.
3. Submit Intake.

### Negative Tests
- Attempting to close shipment with missing mandatory documents (Commercial Invoice, Bill of Lading, Customs Declaration).
- Attempting to re-post landed cost after already posted: system prevents duplicate posting and shows: *"Landed cost already posted for shipment {shipmentNumber}"*.
- Adding negative cost or invalid exchange rate (blocked by validation).

### Expected Result
- Landed cost calculation dynamically capitalizes total CIF, duty, port, and freight costs onto each received unit (`Unit Landed Cost ETB`).
- Received units enter **Vehicle Units & Chassis Registry** and **Module 13 Inventory Balances** with fully capitalized unit values (e.g. `508,862.50 ETB` rather than base invoice price of `168,000.00 ETB`).
- Landed cost status advances along the lifecycle: `DRAFT → CALCULATED → SUBMITTED → FINANCE REVIEW → APPROVED → POSTED`.
- Shipment status advances to `LANDED COST POSTED` $\rightarrow$ `CLOSED`.

---

# PHASE 4 — Inventory & Warehouse Management (Module 13)

## Module 13 Architectural Core Concepts & Business Rules

### 1. Central Inventory Posting Service Architecture
The inventory subsystem implements a centralized **Inventory Posting Service**, following the enterprise audit-ledger design used in the Customer Ledger (Module 9):
- **Core Principle:** Operational modules (Sales, Procurement, Shipments, Transfers) **never** manipulate stock balances directly.
- **Posting Pipeline:**
  $$\begin{aligned}
  \text{Operational Transaction (Sales / Import / Transfer / Adjustment)} &\longrightarrow \mathbf{Inventory\ Posting\ Service} \\
  &\longrightarrow \mathbf{Inventory\ Ledger\ (Immutable\ Journal)} \\
  &\longrightarrow \mathbf{Stock\ Balance\ Table\ (Fast\ Read\ Projection)} \\
  &\longrightarrow \mathbf{Available\ Stock\ Engine}
  \end{aligned}$$
- **Audit Guarantee:** The movement ledger remains the authoritative single source of truth; balance tables serve high-performance querying and concurrency validation.

---

### 2. Core Stock Categories & Availability Formula
The system clearly distinguishes between 6 distinct inventory states:
- **Physical Stock (On-Hand)**: Actual physical inventory currently recorded in the warehouse.
- **Reserved Stock**: Stock committed to a customer booking/order but not yet physically allocated/issued.
- **Allocated Stock**: Specific stock or VIN-serialized vehicle unit assigned to a particular customer booking.
- **Available Stock**: Stock that can still be sold or allocated.
- **Sold Stock**: Stock invoiced and settled.
- **Delivered Stock**: Physical dispatch completed to customer.

$$\mathbf{Available\ Quantity} = \mathbf{On\text{-}Hand\ Quantity} - \mathbf{Reserved\ Quantity} - \mathbf{Allocated\ Quantity}$$

---

### 3. In-Transit Stock Transfer Rules (★ Client Specification)
> **Important Rule:** A transfer must **not** immediately remove stock from the destination or source availability:
- **At Source Warehouse:**
  $$\text{On-Hand} \downarrow \quad \text{and} \quad \text{In-Transit} \uparrow$$
- **At Destination Warehouse:**
  $$\text{In-Transit} \uparrow \quad (\text{On-Hand remains unchanged})$$
- **After Confirmed Receipt at Destination:**
  $$\text{Destination On-Hand} \uparrow \quad \text{and} \quad \text{In-Transit} \downarrow$$
This guarantees accurate visibility of physical stock in-flight along cross-warehouse or inter-city transit corridors without phantom inventory.

---

### 4. Stock Adjustment Categories & Financial Controls (★ Client Specification)
Stock adjustments are required when system quantity differs from physical count or an authorized correction is required.
- **8 Approved Adjustment Reason Categories:**
  1. `PHYSICAL_COUNT` — Physical stock count difference (cycle count / wall-to-wall audit)
  2. `DAMAGE` — Damaged stock (transit or warehouse handling defect)
  3. `LOST` — Lost stock (missing / unaccounted)
  4. `FOUND` — Found stock (discovered surplus inventory)
  5. `DATA_CORRECTION` — Data correction (clerical / SKU mapping error)
  6. `EXPIRED_DETERIORATED` — Expired / deteriorated stock
  7. `INITIAL_LOADING` — Initial stock loading (master onboarding)
  8. `OTHER` — Other approved reason (mandatory management justification)
- **Financial Controls (BR-06):**
  - Adjustments affecting inventory valuation require appropriate **Finance / Manager authorization**.
  - **Posted adjustments can NEVER be deleted.** All corrections must be made through explicit reversal or counter-adjustment transactions.

---

### 5. 14 Comprehensive Stock Movement Types
Every stock transaction generates an immutable journal voucher categorized under one of 14 system movement types:
1. `RECEIPT` — Standard inbound intake from PO, local supplier, or opening loading.
2. `TRANSFER_OUT` — Dispatch from source warehouse into transit corridor.
3. `TRANSFER_IN` — Intake at destination warehouse completing transfer.
4. `ADJUSTMENT_IN` — Upward stock count correction (+ variance).
5. `ADJUSTMENT_OUT` — Downward stock write-off (- variance).
6. `RESERVATION` — Stock reserved against customer booking.
7. `RESERVATION_RELEASE` — Reservation cancelled / released back to available pool.
8. `ALLOCATION` — Chassis / item bound to approved customer booking.
9. `DEALLOCATION` — Allotment cancelled / chassis returned to unallocated stock.
10. `SALE` — Invoiced / settled transaction.
11. `DELIVERY` — Physical handover and gate pass dispatch to client.
12. `RETURN` — Customer return taken back into inventory.
13. `DAMAGE` — Segregation of damaged units into quarantined status.
14. `OPENING_BALANCE` — Baseline migration balance loading.

---

### 6. Critical Business Rules (BR-01 to BR-09)
| Rule Code | Rule Title | Architectural Enforcement |
|---|---|---|
| **BR-01** | **No Negative Stock** | System strictly prevents stock from becoming negative unless explicitly authorized by configurable business rule. |
| **BR-02** | **No Duplicate Vehicle** | Chassis number, engine number, and vehicle inventory ID must be globally unique across all warehouses and shipments. |
| **BR-03** | **No Double Allocation** | A vehicle cannot be actively allocated to two active bookings. Enforced via database and service-level transaction concurrency protection. |
| **BR-04** | **Reservation Validation** | Only available inventory (`AVAILABLE_FOR_SALE`) can normally be reserved; non-available vehicles cannot be committed. |
| **BR-05** | **Approved Transaction Only** | Inventory balances change **only** after transaction posting / confirmation; draft records never affect stock. |
| **BR-06** | **Posted Transactions Cannot Be Deleted** | Corrections must be made through explicit reversal or adjustment transactions. |
| **BR-07** | **Complete Traceability** | Every inventory change must reference its source transaction (PO, Shipment, Booking, Invoice, Gate Pass). |
| **BR-08** | **Transfer Integrity** | Source and destination inventory must remain mathematically consistent throughout the transit pipeline ($\Delta \text{Source} + \Delta \text{Transit} + \Delta \text{Dest} = 0$). |
| **BR-09** | **Landed Cost Integration** | Imported inventory must use the approved capitalized landed cost from Module 12 for accurate inventory valuation. |

---

### 7. Segregation-of-Duties (RBAC) Permissions Matrix
| Role | Main Inventory Permissions |
|---|---|
| **Warehouse Officer** | Receive, transfer, view stock balances |
| **Warehouse Manager** | Approve receipts, transfers, and physical adjustments |
| **Sales** | View stock availability, reserve stock against bookings |
| **Finance** | View warehouse valuation, approve financial adjustments & landed cost postings |
| **Sales Manager** | Approve vehicle allocations and allotment cancellations |
| **Manager / Director** | Approve major stock adjustments and exceptional write-offs |
| **Admin** | System configuration, warehouse master, full audit access |

---

## Screen 10: Inventory & Warehouses — Stock Balances

**Navigation:** `Inventory & Warehouses → Stock Balances` (`/inventory`)

### Goal
Display multi-warehouse stock balances matching the **Client-Recommended Table Columns**:
$$\mathbf{Product} \;\vert\; \mathbf{Warehouse} \;\vert\; \mathbf{On\text{-}Hand} \;\vert\; \mathbf{Reserved} \;\vert\; \mathbf{Allocated} \;\vert\; \mathbf{Available} \;\vert\; \mathbf{Unit\ Cost\ (ETB)} \;\vert\; \mathbf{Total\ Value\ (ETB)} \;\vert\; \mathbf{Status}$$

### Stock Balance Filters
- **Warehouse Filter**: `All Warehouses`, `Kality Assembly Plant Warehouse`, `Gotera Distribution Center`
- **Search**: Item code, SKU, or product description.
- **Real-Time Recalculation**: $\text{Available} = \text{On-Hand} - \text{Reserved} - \text{Allocated}$.
- **Valuation Footers**: Aggregated total units and portfolio asset value in ETB.

---

## Screen 11: Inventory — Stock Transfers

**Navigation:** `Inventory & Warehouses → Stock Transfers` (`/inventory`)

### Transfer Input Checklist
- Source Warehouse: `Gotera Distribution Center`
- Destination Warehouse: `Kality Assembly Plant Warehouse`
- Item / Vehicle: select stock item or serialized chassis
- Quantity: `1`
- Reason / Notes: `Transit transfer between central depot and assembly plant`

### In-Transit State Verification
1. Submit transfer (Status: `REQUESTED`).
2. Warehouse manager approves dispatch (Status: `APPROVED` $\rightarrow$ `DISPATCHED`).
3. Verify in-transit rules:
   - Source On-Hand drops by 1; Source In-Transit rises by 1.
   - Destination In-Transit rises by 1.
4. Receiving officer confirms intake (Status: `RECEIVED`).
   - Destination On-Hand rises by 1; In-Transit drops to 0.

---

## Screen 12: Inventory — Stock Adjustments

**Navigation:** `Inventory & Warehouses → Stock Adjustments` (`/inventory`)

### New Adjustment Input Checklist
- Warehouse: select warehouse
- Stock Balance Item: select item with physical count discrepancy
- Quantity Delta: `-2` (e.g. system 100 vs physical 98) or `+1` (surplus found)
- **Adjustment Reason Category (Client 8 Reasons)**:
  - `PHYSICAL_COUNT` (Physical stock count difference)
  - `DAMAGE` (Damaged stock)
  - `LOST` (Lost stock)
  - `FOUND` (Found stock)
  - `DATA_CORRECTION` (Data correction)
  - `EXPIRED_DETERIORATED` (Expired/deteriorated stock)
  - `INITIAL_LOADING` (Initial stock loading)
  - `OTHER` (Other approved reason)
- Mandatory Audit Notes: `Physical cycle count revealed 2 missing units during bi-weekly audit`
- **Financial Control Warning:** System prominently alerts that posted adjustments can *never be deleted* and require Finance/Manager authorization.

---

## Screen 13: Inventory — Local Assembly Intake

**Navigation:** `Inventory & Warehouses → Assembly Intake` (`/inventory`)

### Record Assembly Receipt Input Checklist
- Product / Model: select motorcycle model (e.g. `Bajaj Boxer BM150 Motorcycle`)
- Warehouse: `Kality Assembly Plant Warehouse`
- Chassis Number: `KANAB-2026-CHAS-ASM-001` (unique)
- Engine Number: `KANAB-2026-ENG-ASM-001` (unique)
- Assembly Date: current date
- Notes: `Local assembly line batch run #1`

---

## Screen 14: Inventory — Movement History Log

**Navigation:** `Inventory & Warehouses → Movement History` (`/inventory`)

### Filters & Verification
- Filter by all 14 Movement Types (`RECEIPT`, `TRANSFER_OUT`, `TRANSFER_IN`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `RESERVATION`, `ALLOCATION`, etc.).
- Warehouse filter, Item SKU filter, and Date Range filter.
- Immutable journal displays sequential audit records with quantity deltas and balance-after snapshots.

---

## Screen 14B: 11 Inventory Reports Suite (★ Client Specification)

**Navigation:** `Inventory & Warehouses → 11 Inventory Reports ★` (`/inventory`)

### Goal
Provide executive and operational visibility through the **11 Client-Mandated Inventory Reports**:

| # | Report Title | Core Columns & Purpose |
|---|---|---|
| **1** | **Current Stock Report** | `Product \| Warehouse \| On Hand \| Reserved \| Allocated \| Available` (Real-time physical vs available stock across all warehouses). |
| **2** | **Vehicle Inventory Report** | `Chassis No \| Engine No \| Brand & Model \| Warehouse \| Status \| Booking Ref \| Customer` (Full serialized unit roster). |
| **3** | **Stock Movement Report** | `Timestamp \| Movement Type \| Product \| Warehouse \| Qty Delta \| Reference \| Performed By` (Comprehensive movement audit trail). |
| **4** | **Warehouse Valuation Report** | `Warehouse \| Product \| On Hand Qty \| Unit Cost (ETB) \| Total Value (ETB)` (Financial inventory asset balance sheet). |
| **5** | **Reserved Inventory Report** | `Booking Ref \| Customer \| Product \| Reserved Qty \| Deposit Amount (ETB) \| Expiry Date` (Committed stock pending delivery). |
| **6** | **Allocated Inventory Report** | `Customer \| Booking Ref \| Chassis No \| Allocated Date \| Allocated By \| Status` (Physical VIN-to-customer binding). |
| **7** | **Stock Transfer Report** | `Transfer Ref \| Date \| Source \| Destination \| Item / Chassis \| Quantity \| Status` (Inter-warehouse transfer monitoring). |
| **8** | **Stock Adjustment Report** | `Adjustment Ref \| Date \| Warehouse \| Item \| System Qty \| Physical Qty \| Variance \| Reason Category \| Approved By` (Audit variance analysis). |
| **9** | **Inventory Aging Report** | `Product \| Warehouse \| Total Units \| 0-30 Days \| 31-60 Days \| 61-90 Days \| >90 Days (Slow-Moving)` (Holding duration & obsolescence risk). |
| **10** | **Vehicle Status Report** | Distribution across all 7 stages: `Received (24) \| Available for Sale (18) \| Reserved (6) \| Allotted (8) \| Ready for Delivery (5) \| Sold (12) \| Delivered (24)`. |
| **11** | **Inventory Valuation Report (Module 12 Integration)** | `Shipment Ref \| PO Ref \| Received Qty \| Supplier FOB (ETB) \| Capitalized Costs (ETB) \| Unit Landed Cost (ETB) \| Total Asset Valuation (ETB)` (Audited landed cost capitalization). |

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

## Screen 19: Vehicle Allotment Management (Module 14)

**Navigation:** `Logistics & Sales Pipeline → Vehicle Allotment Management` (`/allotment`)

### Goal
Demonstrate compliance with **Client Specification: Module 14 — Vehicle Allotment Management**:
1. **Relationship with Previous Modules**:
   - Module 14 does **not** create an independent vehicle inventory system.
   - It directly **consumes real-time vehicle inventory information from Module 13**.
   - Integrations: Module 5 (Product Master), Module 7 (Bookings), Module 8 (Customer Payments), Module 9 (Customer Ledger), Module 10 (Customer Credit), Module 11 (Refund / Cancellation), Module 12 (Imported Vehicles & Landed Cost), Module 13 (Real-Time Vehicle Inventory), and Module 15+ (Delivery Handover & Invoicing).
2. **Current Allotment Format Specification**:
   - **Header**: Allotment Number, Allotment Date, Booking Number, Customer, Customer Type, Dispatch Location, Warehouse, Salesperson, Remarks, Status, Prepared By, Approved By, Approval Date.
   - **Item Information**: Product/Item, Model, Booking Quantity, Previously Allotted Quantity, Current Allotment Quantity, Remaining Quantity.
   - **Vehicle Information**: Vehicle ID, Chassis Number, Engine Number, Warehouse, Unit Cost, Vehicle Status.
3. **Booking Eligibility Validation**:
   - Booking Status: `APPROVED` / `CONFIRMED`.
   - Booking Quantity: $\text{Remaining Quantity} > 0$.
   - Customer Status: Customer account must be active and valid.
   - Payment Requirement: Active deposit threshold satisfied.
   - Cancellation Gate: Cancelled or closed bookings are strictly blocked from allotment.
   - Product Matching: Assigned vehicles must strictly match the booked product/model.
4. **Configurable Payment Status Validation Rules**:
   - **Option A — Minimum Deposit (Active Default)**: Required Deposit = 30% of Booking Value.
   - **Option B — Fixed Amount**: Required Payment = 100,000 ETB per Booking.
   - **Option C — Full Payment**: Paid Amount $\ge$ Booking Total Due (100%).
   - **Option D — Manager Exception Override**: Authorized General Manager waiver for institutional fleet tenders.
5. **Inventory Availability Validation**:
   - Real-time stock retrieved directly from Module 13:
     $$\text{Max Allotment Capacity} = \min(\text{Available in Warehouse},\; \text{Booking Remaining Needed})$$
   - Availability is re-verified dynamically during both request submission and final posting.
6. **Individual Vehicle Selection Table**:
   - Format: `SELECT | CHASSIS NUMBER | ENGINE NUMBER | MODEL | WAREHOUSE | STATUS`.
   - Chassis and Engine serials auto-loaded directly from inventory (eliminates manual data-entry errors).
   - Only vehicles in `AVAILABLE_FOR_SALE` status eligible for allocation.
7. **Double Allocation Defense (Multi-Level Protection)**:
   - **UI Level**: Already allocated or reserved vehicles hidden from candidate table.
   - **Backend Level**: Pre-transaction re-validation of vehicle availability.
   - **Database Level**: Concurrency locking preventing simultaneous assignment of the same VIN.
   - **Standard Concurrency Notice**: *"Vehicle {chassis} is no longer available. Please refresh inventory and select another vehicle."*
8. **12-Step Controlled Atomic Transaction Pipeline**:
   When an allotment is approved and posted, the system executes 12 steps in a single atomic database transaction:
   1. Revalidate booking
   2. Revalidate payment status
   3. Revalidate remaining quantity
   4. Revalidate vehicle availability
   5. Lock selected vehicles
   6. Create / update allotment record
   7. Update vehicle status (`AVAILABLE_FOR_SALE → ALLOTTED`)
   8. Update inventory allocation (Module 13 on-hand, reserved, allocated balances)
   9. Update booking allocation status (`FULLY_ALLOTTED` or `PARTIALLY_ALLOTTED`)
   10. Create inventory movement history (`ALLOCATION` voucher)
   11. Create allotment audit journal record
   12. Commit transaction with complete rollback on any exception.
9. **Allotment Status Machine & Segregation-of-Duties (RBAC)**:
   $$\mathbf{DRAFT} \longrightarrow \mathbf{SUBMITTED} \longrightarrow \mathbf{UNDER\_REVIEW} \longrightarrow \mathbf{APPROVED} \longrightarrow \mathbf{POSTED}$$
   - Exceptions: `REJECTED`, `CANCELLED`, `REVERSED`.
   - Approval Roles Matrix:
     | Action | Sales Officer | Sales Manager | Finance | Admin |
     |---|:---:|:---:|:---:|:---:|
     | Create Allotment | ✓ | ✓ | - | ✓ |
     | Submit Review | ✓ | ✓ | - | ✓ |
     | View Payment | ✓ | ✓ | ✓ | ✓ |
     | Approve Allotment | - | ✓ | - | ✓ |
     | Reject Allotment | - | ✓ | - | ✓ |
     | Post to Inventory | - | ✓ | ✓* | ✓ |
     | Reverse / Un-allot | - | ✓ | ✓ | ✓ |
10. **Allotment Cancellation & Non-Destructive Reversal**:
    - `ALLOTTED → ALLOTMENT REVERSED → AVAILABLE_FOR_SALE`.
    - Preserves historical allotment record intact; creates explicit reversal transaction.
11. **Allotment History & Audit Ledger Tab**:
    - Columns: `Date | Allotment Ref | Booking | Customer | Chassis Number | Engine Number | Warehouse | Status | User / Actor`.
12. **Printable / PDF Allotment Document (★)**:
    - Formal advice slip with KANAB Motors header, booking and customer metadata, breakdown table, serial master roster, signatures (`Prepared By`, `Approved By`), and official corporate stamp.
13. **Critical Business Rules (BR-01 to BR-12)**:
    | Rule Code | Rule Title | Operational Enforcement |
    |---|---|---|
    | **BR-01** | **Approved Booking Only** | Only eligible/approved bookings can normally be allotted. Draft, cancelled, or closed bookings are strictly blocked. |
    | **BR-02** | **Payment Eligibility** | The applicable payment requirement (e.g. Option A: 30% deposit) must be satisfied before allotment. |
    | **BR-03** | **Inventory Availability** | Vehicle must be strictly available (`AVAILABLE_FOR_SALE`) at the time of transaction posting. |
    | **BR-04** | **Product Matching** | Vehicle product and model must match the booking item specification exactly. |
    | **BR-05** | **Quantity Control** | Current Allotment $\le$ Booking Quantity - Previously Allotted Quantity. Over-allocation blocked. |
    | **BR-06** | **No Duplicate Vehicle** | One active physical vehicle cannot have multiple active allotments across the system. |
    | **BR-07** | **Chassis Uniqueness** | Chassis number (VIN) must uniquely identify a vehicle across all warehouses. |
    | **BR-08** | **Engine Uniqueness** | Engine serial number must be globally unique according to vehicle master rules. |
    | **BR-09** | **Atomic Posting** | All inventory and booking updates must occur within one controlled database transaction. |
    | **BR-10** | **No Deletion** | Posted allotments can NEVER be deleted. Complete audit permanence required. |
    | **BR-11** | **Reversal Workflow** | Corrections must use formal cancellation/reversal workflows that record both original and reversal vouchers. |
    | **BR-12** | **Audit Trail** | Every status, warehouse, user, and allocation change must be recorded with actor and timestamp. |
14. **4 Important Exception Scenarios**:
    - **Scenario 1 — Payment Insufficient**:
      - *Input:* Booking Qty = 10, Deposit Status = NOT ELIGIBLE (<30% advance).
      - *Result:* Allotment blocked. Modal error alert displayed with reason. Protects working capital from un-collateralized vehicle locking.
    - **Scenario 2 — Insufficient Inventory**:
      - *Input:* Booking Remaining = 10, Available in Warehouse = 6.
      - *Result:* Maximum allotment: 6. System allows partial allotment if payment eligibility is satisfied, updating booking status to `PARTIALLY_ALLOTTED` with 4 remaining.
    - **Scenario 3 — Vehicle Selected by Another User (Concurrency Collision)**:
      - *Input:* User A selects CH-00125. User B commits it first. User A submits.
      - *Result:* Allotment fails with: *"Vehicle CH-00125 is no longer available. Please refresh inventory."* Zero partial posting occurs.
    - **Scenario 4 — Booking Cancelled with Active Allotment**:
      - *Pipeline:* $\text{Booking Cancelled} \longrightarrow \text{Active Allotment Found} \longrightarrow \text{Authorized Reversal Required} \longrightarrow \text{Vehicle Available}$.
      - *Rule:* The system does **not** silently release the vehicle. An explicit authorized reversal workflow is required to safeguard financial and inventory integrity.

---

### Step-by-Step Test Procedure

#### Step 1: Verify Eligible Bookings Queue
1. Open **Vehicle Allotment Management** and click the **Eligible Bookings Queue** tab.
2. Confirm confirmed orders appear with deposit status (e.g. `ETB 100,000+` verified $\ge 30\%$).
3. Click **Allot Vehicles** next to a booking to open the allocation modal.

#### Step 2: Select Individual Vehicles from Module 13 Inventory
1. In the **New Vehicle Allotment Request** modal:
   - Selected Booking auto-populates Customer, Customer Type, Model, and Deposit status.
   - Review computed capacity: $\text{Available in WH} = N, \;\text{Remaining Needed} = M, \;\text{Max Can Allot} = \min(N, M)$.
2. Select vehicle unit checkbox from the table displaying `Chassis Number | Engine Number | Model | Warehouse | Status`.
3. Enter optional remarks (e.g. `Allocation for Dire Dawa commercial fleet dispatch`).
4. Click **Submit Allotment Request**.

#### Step 3: Review & Atomic 12-Step Posting
1. In the **Allotments & Approvals** tab, locate the requested allotment.
2. Click **Review & Post** to open the approval review drawer.
3. Verify Customer Type, Deposit Verification (≥30%), and the Assigned Vehicle table.
4. Click **Approve & Post Allotment**:
   - System executes the 12-step atomic transaction.
   - Vehicle status transitions from `AVAILABLE_FOR_SALE` to `ALLOTTED`.
   - Module 13 Allocated Stock balance increments; Available Stock decrements.
   - Status updates to `APPROVED` / `POSTED`.

#### Step 4: Generate Formal Printable PDF Document
1. Click **Document** on the approved allotment row.
2. Review the formal **Vehicle Allotment Advice**:
   - Allotment No, Date, Booking No, Customer, Dispatch Location (`Dire Dawa`), Warehouse (`Kality Plant`).
   - Serialized VIN/Chassis and Engine table with unit valuation.
   - Signatures for Sales Officer, Sales Manager, and Official Corporate Seal.
3. Click **Print Document (PDF)** to trigger browser print preview.

#### Step 5: Test Non-Destructive Reversal / Un-Allotment
1. On an approved allotment, click **Un-allot**.
2. Confirm the reversal warning.
3. Verify vehicle units return to `AVAILABLE_FOR_SALE` in Module 13.
4. Open the **Allotment History & Audit Ledger** tab and confirm both the original allotment and reversal records remain visible for audit compliance.

#### Step 6: Verify Business Rules & Exception Scenarios Tab
1. Click the **BR-01–BR-12 & Exception Scenarios ★** tab.
2. Review the live invariant matrix for all 12 business rules and the 4 interactive exception scenario simulation cards (Payment Insufficient, Partial Allotment, Concurrency Race Condition, and Cancelled Booking Non-Silent Reversal).

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
Demonstrate compliance with **Client Specification: Refund Request Screen & Architecture**:
1. **Financial Source of Truth & Architecture**:
   ```
   Customer Management
      ↓
   Booking Order
      ↓
   Customer Payment (BRV Receipts)
      ↓
   Customer Ledger (Financial Source of Truth)
      ↓                           \
   Statement of Account          10. Excess Deposits & Credit Routing
                                    ↓
                                 11. Refund Management
                                    ↓ (Refund Request → Review & Approval → Finance Processing → Confirm Payout)
                                 Customer Ledger Posting (Immutable DEBIT)
                                    ↓
                                 Customer Account Settlement & SOA
   ```
2. **Refund Management Dashboard**:
   - **8 KPI Cards**: `Pending Requests`, `Approved`, `Processing`, `Completed`, `Rejected`, `Failed`, `Total Refund Amount`, `Pending Refund Amount`.
   - **Filter Grid**: Customer, Customer Type, Booking, Date Range, Refund Reason, Refund Method, Status, Amount Range, Finance Processor.
   - **Refund List Columns**: `Refund No`, `Customer`, `Booking`, `Reason`, `Amount`, `Method`, `Status`.
3. **Recommended Refund Request UI Specification**:
   - Customer `[Select Customer]`
   - Booking `[Select Booking]` (links refund directly to booking order if applicable)
   - Original Payment `[Select Payment]` (links to initial BRV receipt reference)
   - Refund Source `[Excess Payment / Booking Cancellation / Model Change / Inventory Unavailable / Customer Cancellation / Other]`
   - Refund Reason `[Section 11 Master Category]`
   - Refundable Balance `[Displayed dynamic limit ETB]` *(strict rule: requested amount should never exceed displayed refundable balance)*
   - Refund Amount `[ETB]` + Real-time Approval Tier badge
   - Refund Method `[Bank Wire Transfer / CPO / Cheque / Cash]`
   - Target Bank & Account Holder `[Auto-populated from customer KYC]`
   - Account Number `[Masked: ••••••••1234]`
   - Supporting Documents `[Upload / File attachment]`
   - Remarks / Audit Notes `[Detailed explanation]`

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
2. **Input Checklist (Recommended UI Specification)**:
   - **Customer \***: Select customer from dropdown.
     - *Verified Balance Banner*: System displays live `Available Refundable Balance: ETB X,XXX.XX` (green badge).
   - **Booking Order (Optional)**: Select related booking order (e.g. `BK-202610-001`) if refund stems from booking cancellation or advance adjustment.
   - **Original Payment Reference**: Select or enter related deposit voucher (e.g. `BRV-202610-001`).
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
   - **Specific Justification & Remarks** *(Mandatory if "Other Approved Reason" selected)*:
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
- **BOOKING**: Linked booking order reference if present
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


