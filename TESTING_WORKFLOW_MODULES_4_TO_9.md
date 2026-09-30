# KANAB MOTORS — Full Enterprise Workflow & Verification Guide
## Complete End-to-End Client Demonstration Script (Modules 1 through 12, A to Z)

> [!NOTE]
> This master document provides the **100% complete, screen-by-screen testing runbook** covering every single page, navigation tab, database constraint, financial ledger entry, and approval gate in KANAB Motors.
> For the executive presentation guide with diagrams, see [END_TO_END_CLIENT_DEMO_TESTING_GUIDE.md](file:///d:/kanab/END_TO_END_CLIENT_DEMO_TESTING_GUIDE.md).

---

### Target Environments
* **Live Production (Hostinger VPS)**: `https://kanab.skylinkict.com`
* **Local Development Instance**: `http://localhost:5173`

### Multi-Role Login Personas
* **Super Admin / General Manager**: `admin` / `admin123` (All 74 permissions)
* **Sales Specialist**: `dawit` / `sales123` (Customers, Enquiries, Quotes, Bookings)
* **Sales Manager**: `samuel` / `manager123` (Enquiry Approval, Booking Convert)
* **Finance Officer**: `tewodros` / `finance123` (BRV Entry, Customer Ledger, SOA)
* **Finance Manager**: `hanna` / `finance123` (Payment Confirmation, Excess Routing, Refund Payout)
* **Warehouse Manager**: `almaz` / `warehouse123` (Stock, Chassis Intake, Allotment, PDI & Delivery Gate Pass)

---

## 🗺️ Master Demonstration Index: All 22 Screens in Operational Order

```
Phase 1: Governance & Security
  ├── 1. Users & RBAC Matrix (/users)
  └── 2. System Audit Trail (/audit)

Phase 2: Core Master Data & KYC
  ├── 3. Customers Master (/customers)
  ├── 4. Product Catalog (/products)
  └── 5. Physical Vehicle Units (/vehicles)

Phase 3: International Procurement & Importation
  ├── 6. Foreign Suppliers (/suppliers)
  ├── 7. Purchase Orders (/purchase-orders)
  ├── 8. Shipments & Landed Cost Ledger (/shipments)
  └── 9. Procurement Reports (/procurement-reports)

Phase 4: Warehousing & Inventory
  └── 10. Stock Balances & Transfers (/inventory)

Phase 5: Commercial Sales Pipeline
  ├── 11. Sales Enquiries & Proforma Quotes (/enquiries)
  └── 12. Advance Order Bookings (/bookings)

Phase 6: Financial Engine — Deposits
  └── 13. Bank Receipt Vouchers (BRV) (/payments)

Phase 7: Physical Vehicle Allotment
  └── 14. VIN / Chassis Allotment (/allotments)

Phase 8: Financial Engine — Ledger & SOA
  └── 15. Customer Ledger & Statement of Account (/statement)

Phase 9: Settlement, Excess & Refunds
  └── 16. Excess Payment Routing & Refunds (/settlement)

Phase 10: Invoicing & Handover Gate Pass
  ├── 17. Commercial Sales Invoices (/invoices)
  └── 18. Pre-Delivery Inspection (PDI) & Gate Pass (/deliveries)

Phase 11: Enterprise Controls
  ├── 19. Unified Approvals Queue (/approvals)
  └── 20. Centralized Document Center (/documents)

Phase 12: Executive Intelligence
  ├── 21. Real-Time Fleet Dashboard (/dashboard)
  └── 22. Reporting Hub (/reports)
```

---

## 🧪 STEP-BY-STEP VERIFICATION RUNBOOK (A to Z)

### Step 1: Users & RBAC Matrix (`/users`)
1. Log in as `admin`. Go to `/users`.
2. Open **Role Permission Simulator**. Select `SALESPERSON` (19 perms), `FINANCE_OFFICER` (18 perms), and `ADMIN` (74 perms).
3. Verify that Admin inherits all privileges automatically.

### Step 2: System Audit Trail (`/audit`)
1. Navigate to `/audit`.
2. Observe chronological system logs displaying entity names, timestamps, user IDs, and before/after diffs.

### Step 3: Customer Master & KYC (`/customers`)
1. Navigate to `/customers`. Click **+ Add Customer**.
2. Enter:
   * Name: `Oromia Logistics Enterprise`
   * Type: `CORPORATE`
   * Mobile: `+251911889900`
   * TIN: `0058291048`
3. Save customer. Verify the 6 KPI cards initialize at `0.00`.
4. Test duplicate prevention: re-enter same TIN or phone $\rightarrow$ duplicate blocked with alert.

### Step 4: Product Master Catalog (`/products`)
1. Navigate to `/products`.
2. Inspect `Isuzu D-Max Double Cab 4x4` (`D-MAX-4X4`).
3. Verify selling price (`ETB 3,500,000.00`), 15% VAT rate, and reorder levels.

### Step 5: Physical Vehicle Units (`/vehicles`)
1. Navigate to `/vehicles`. Click **+ Register Vehicle Unit**.
2. Enter:
   * Model: `Isuzu D-Max Double Cab 4x4`
   * Chassis (VIN): `KANAB-CH-2026-9001`
   * Engine: `ENG-4JJ1-9001`
   * Warehouse: `Gotera Distribution Center`
3. Save unit. Status displays **`AVAILABLE_FOR_SALE`**.
4. Test duplicate prevention: Re-enter same chassis $\rightarrow$ unique constraint blocks duplicate.

### Step 6: International Suppliers (`/suppliers`)
1. Navigate to `/suppliers`.
2. Inspect global manufacturers (e.g. `ISUZU Motors International FZE`, `Sinotruk International`).

### Step 7: Purchase Orders (`/purchase-orders`)
1. Navigate to `/purchase-orders`.
2. Review foreign currency PO lines, quantity, and currency conversions.

### Step 8: Shipments & Landed Cost Engine (`/shipments`)
1. Navigate to `/shipments`. Open `SHP-2026-0001`.
2. Review the 7 shipment tracking milestones from Port of Origin to Gotera facility.
3. Review the **Hare-Niemeyer Landed Cost Aggregation Ledger**: shows zero-drift allocation of Freight, Insurance, and Customs Duty across individual chassis.

### Step 9: Procurement Analytics (`/procurement-reports`)
1. Navigate to `/procurement-reports`.
2. Review port dwell times, customs clearance bottlenecks, and shipping lead times.

### Step 10: Warehouse Stock Balances (`/inventory`)
1. Navigate to `/inventory`.
2. Verify stock balance formula: $\text{Available} = \text{Current Stock} - \text{Reserved}$.
3. View the **Stock Transfer Station** for inter-warehouse movement audit logs.

### Step 11: Sales Enquiries & Quotations (`/enquiries`)
1. Navigate to `/enquiries`. Click **+ New Sales Enquiry**.
2. Select Customer `Oromia Logistics Enterprise` and Model `Isuzu D-Max Double Cab 4x4`.
3. Quantity: `1`.
4. Observe real-time 15% VAT calculation:
   * Subtotal: `ETB 3,500,000.00`
   * 15% VAT: `ETB 525,000.00`
   * Gross Total: `ETB 4,025,000.00`
5. Save Enquiry $\rightarrow$ sequence number generated: `ENQ-XXXXXX` (Status: `SUBMITTED`).
6. Click **Print Proforma Quote** $\rightarrow$ renders official isolated corporate quote.
7. Click **Approve** $\rightarrow$ Status switches to `APPROVED`.
8. Click **Convert to Booking** $\rightarrow$ Enquiry locks as `CONVERTED` and booking is created.

### Step 12: Advance Order Bookings (`/bookings`)
1. Navigate to `/bookings`. Locate booking `BKG-2026-XXXXX`.
2. Note Gross Total (`ETB 4,025,000.00`), required 20% advance (`ETB 805,000.00`), and Outstanding (`ETB 4,025,000.00`).
3. Status is `PENDING_APPROVAL` / `PENDING_DEPOSIT`.

### Step 13: Bank Receipt Vouchers (BRV) (`/payments`)
1. Navigate to `/payments`. Click **+ Record Payment**.
2. Complete BRV:
   * Customer: `Oromia Logistics Enterprise`
   * Booking: Select `BKG-2026-XXXXX`
   * Amount: `ETB 1,000,000.00`
   * Method: `Electronic Transfer`
   * Bank: `Commercial Bank of Ethiopia (CBE)`
   * Reference: `CBE-TRX-9821849`
3. Save receipt $\rightarrow$ auto-generates `BRV-2026-XXXXX` (`SUBMITTED`).
4. As Finance Officer, click **Confirm & Post to Ledger**.
5. Check booking: Total Deposited is `ETB 1,000,000.00`, Outstanding is `ETB 3,025,000.00`, status is `CONFIRMED`.

### Step 14: Vehicle Allotment & VIN Locking (`/allotments`)
1. Navigate to `/allotments`. Booking `BKG-2026-XXXXX` is now eligible.
2. Click **Create Allotment Request**:
   * Select available chassis `KANAB-CH-2026-9001`.
   * Submit request (`ALT-XXXXXX`).
3. Click **Approve Allotment**.
4. In `/vehicles`, chassis `KANAB-CH-2026-9001` status changes to `ALLOTTED`.
5. Verify chassis is now blocked from duplicate selection.

### Step 15: Customer Financial Ledger & Statement of Account (`/statement`)
1. Navigate to `/statement`. Select `Oromia Logistics Enterprise`.
2. Review 6 KPI Cards: Total Deposits: `1,000,000.00`, Allocated: `1,000,000.00`, Outstanding: `3,025,000.00`.
3. Verify immutable transaction row: `ADVANCE_DEPOSIT`, `BRV-2026-XXXXX`, Credit: `1,000,000.00`.
4. Click **+ Post Ledger Adjustment**: Add a test Credit of `50,000.00` with reason `Goodwill promotional discount`.
5. Click **Export CSV / Excel** $\rightarrow$ File downloads formatted.
6. Click **Print Official SOA** $\rightarrow$ Official statement opens with Kanab Motors corporate letterhead and reference `SOA-CUST-...`.

### Step 16: Excess Routing & Refunds (`/settlement`)
1. In `/payments`, record a final payment of `ETB 3,125,000.00` on the booking (an intentional overpayment of `ETB 100,000.00`). Confirm payment.
2. Booking status transitions to `SETTLED` (Fully Paid).
3. Go to `/settlement`. Under **Excess Payment Routing**, `ETB 100,000.00` excess is detected.
4. Click **Transfer to Refundable Balance**.
5. Under **Refunds & Disbursements**, click **+ Request Refund**:
   * Attempt refunding `150,000.00` $\rightarrow$ system blocks: *Refund exceeds available refundable balance*.
   * Request valid `100,000.00` (`RFD-XXXXX`).
6. Advance 5-tier approval: `Review -> Approve -> Finance Process (masked bank) -> Confirm Payout`.
7. In `/statement`, verify a new `REFUND` debit of `100,000.00` posted to ledger automatically.

### Step 17: Commercial Sales Invoices (`/invoices`)
1. Navigate to `/invoices`. Locate invoice for `BKG-2026-XXXXX`.
2. Inspect vehicle subtotal (`ETB 3,500,000.00`) and 15% VAT (`ETB 525,000.00`).
3. Click **Print Official Tax Invoice** $\rightarrow$ Renders printable commercial tax invoice.

### Step 18: Pre-Delivery Inspection (PDI) & Official Gate Pass (`/deliveries`)
1. Navigate to `/deliveries`.
2. Complete the 7 PDI Inspection points (Fluids, Battery, Tires, Electronics, Exterior, Toolkit, Road Test).
3. Click **Authorize Delivery & Issue Gate Pass**.
4. Enter driver name and national ID $\rightarrow$ Click **Print Official Gate Pass & Delivery Note**.
5. Check `/vehicles`: Chassis status updates to `DELIVERED` / `SOLD`.

### Step 19: Unified Approvals Queue (`/approvals`)
1. Navigate to `/approvals`.
2. Show pending actions queue across Enquiries, Allotments, Payments, and Refunds.

### Step 20: Centralized Document Center (`/documents`)
1. Navigate to `/documents`.
2. Inspect registry of digital proofs (deposit slips, customs docs, PDI certificates).

### Step 21: Executive Dashboard (`/dashboard`)
1. Navigate to `/dashboard`.
2. Present the 7 financial KPI tiles, sales pipeline funnel, and fleet inventory breakdown.

### Step 22: Reporting Hub (`/reports`)
1. Navigate to `/reports`.
2. Review interactive reports (Sales, Invoices, Deliveries, Stock Balances).
3. Demonstrate **Flip to Table View** and **Export Report**.

---

### Sign-Off Verification Table

| Step | Page / URL | Feature Verified | Result |
| :---: | :--- | :--- | :---: |
| 1 | `/users` | RBAC Simulator & 74 permissions | `PASS` |
| 2 | `/audit` | Immutable audit log & diffs | `PASS` |
| 3 | `/customers` | KYC, TIN check, 6 KPI cards | `PASS` |
| 4 | `/products` | Vehicle catalog, 15% VAT | `PASS` |
| 5 | `/vehicles` | Unique chassis/engine intake | `PASS` |
| 6 | `/suppliers` | Foreign OEM supplier master | `PASS` |
| 7 | `/purchase-orders` | Line allocations, foreign POs | `PASS` |
| 8 | `/shipments` | Milestones, Hare-Niemeyer cost | `PASS` |
| 9 | `/procurement-reports`| Dwell time & pipeline reports | `PASS` |
| 10 | `/inventory` | Stock formula, transfer logs | `PASS` |
| 11 | `/enquiries` | Live VAT, proforma, convert | `PASS` |
| 12 | `/bookings` | 20% Advance gate, installments | `PASS` |
| 13 | `/payments` | BRV receipt, CBE bank, confirm | `PASS` |
| 14 | `/allotments` | VIN locking, no double-allot | `PASS` |
| 15 | `/statement` | Append-only ledger, SOA print | `PASS` |
| 16 | `/settlement` | Excess routing, 5-tier refund | `PASS` |
| 17 | `/invoices` | Commercial tax invoice print | `PASS` |
| 18 | `/deliveries` | 7 PDI checks, Gate Pass print | `PASS` |
| 19 | `/approvals` | Cross-module approvals queue | `PASS` |
| 20 | `/documents` | Central attachments registry | `PASS` |
| 21 | `/dashboard` | 7 C-Suite tiles, fleet charts | `PASS` |
| 22 | `/reports` | Chart/Table flip, CSV exports | `PASS` |
