# Testing Guide: KANAB Motors — Missing Import Process Part II (KMSICAMS-12 Part 2)

**Scope:** Phases 5 through 9 (`IMP-23` – `IMP-53`)  
**Target Applications:**  
- **Backend API:** `poggab/kanab-backend:latest` (`v1.0.0`)  
- **Frontend SPA:** `poggab/kanab-frontend:latest` (`v1.0.0`)  
- **Database:** PostgreSQL with TypeORM Migration `1711000000005-KMSICAMS12Part2LogisticsAndDocuments`

---

## 1. Prerequisites and Setup

1. **Verify Services Running:**
   ```bash
   docker compose up -d
   ```
2. **Verify Database Migration:**
   Run the migration if not already applied:
   ```bash
   npm --prefix backend run migration:run
   ```
   *Expected:* Output ends with `Migration 1711000000005-KMSICAMS12Part2LogisticsAndDocuments has been executed successfully.`
3. **Verify Automated Unit Tests:**
   ```bash
   npm --prefix backend test
   ```
   *Expected:* 18 test suites passed, 108 tests passed (100% pass rate).
4. **Login Credentials:**
   - Admin / Import Manager: `admin@kanab.com` (or authorized user with `SHIPMENTS_UPDATE`, `SUPPLIERS_CREATE`, `SUPPLIERS_EDIT`).

---

## 2. Test Scenarios by Phase

---

### Phase 5: Freight-Forwarder Management and Shipment Booking (`IMP-23` – `IMP-31`)

#### Test Case 5.1: Freight Forwarder Master Catalog (`IMP-23`)
1. Navigate to **Procurement &gt; Suppliers Master Data** in the navigation menu.
2. Click the second tab: **Freight Forwarders (IMP-23)**.
3. Observe default pre-seeded forwarders:
   - *Ethiopian Shipping and Logistics Services Enterprise (ESLSE)*
   - *Bolloré Logistics Ethiopia / Africa Global Logistics (AGL)*
   - *Maersk Ethiopia PLC*
   - *MSC Mediterranean Shipping Company Djibouti / Ethiopia*
4. Click **Register Freight Forwarder**.
5. Fill in:
   - Name: `DHL Global Forwarding Ethiopia`
   - Country: `Ethiopia`
   - Contact Person: `Abebe Bekele`
   - Phone: `+251 91 123 4567`
   - Email: `abebe.bekele@dhl.com`
   - Address: `Bole Sub-City, Addis Ababa`
   - Status: `Active`
6. Click **Register Forwarder**.
7. Verify that the new forwarder appears in the table with `Active` status.
8. Click **Deactivate** icon and verify status changes to `Inactive`. Toggle back to `Active`.

#### Test Case 5.2: Multi-Quotation Management & Approval Selection (`IMP-24`, `IMP-25`)
1. Navigate to **Logistics &gt; Shipments**. Select or create an open shipment (e.g. `SHP-2026-0001`).
2. Click the tab: **Logistics & Booking (IMP-31)**.
3. Scroll to the **Freight Forwarder Quotations** section.
4. Click **+ Add Forwarder Quote**.
5. Submit Quote 1:
   - Forwarder: *Ethiopian Shipping and Logistics Services Enterprise (ESLSE)*
   - Quote Ref: `ESLSE-Q-2026-881`
   - Freight Amount: `4,800.00` USD
   - Transit Days: `28`
   - Destination Port Charges: `450.00` USD
6. Add Quote 2:
   - Forwarder: *Maersk Ethiopia PLC*
   - Quote Ref: `MSK-ET-9901`
   - Freight Amount: `5,200.00` USD
   - Transit Days: `21`
   - Destination Port Charges: `380.00` USD
7. Observe the quotation comparison table showing both bids side-by-side.
8. On the ESLSE quotation row, click **Select & Approve Forwarder**.
9. Enter Selection Reason: `Selected due to competitive inland multimodal direct through-bill to Modjo Dry Port.`
10. Confirm selection.
11. **Verification:**
    - The ESLSE row displays a green badge `SELECTED (APPROVED)`.
    - The Selected Logistics Partner card at the top updates to `Ethiopian Shipping and Logistics Services Enterprise (ESLSE)`.

#### Test Case 5.3: Vessel Booking & Schedule Capture (`IMP-26`)
1. In the **Logistics & Booking** tab, scroll to **Vessel Booking & Marine Schedule**.
2. Click **Record / Update Booking**.
3. Fill in:
   - Booking Reference: `BKG-ESLSE-99410`
   - Vessel Name: `MV LAKE TANA`
   - Voyage Number: `V.2604W`
   - Origin Port: `Shanghai Port, China`
   - Destination Port: `Djibouti Port (Direct corridor to Modjo)`
   - Estimated Departure (ETD): `2026-11-10`
   - Estimated Arrival (ETA): `2026-12-05`
   - Booking Status: `CONFIRMED`
4. Click **Save Booking Details**.
5. **Verification:** The vessel schedule panel shows `MV LAKE TANA - Voy V.2604W` with route and estimated dates.

#### Test Case 5.4: Container Management & Demurrage Free-Time (`IMP-27`)
1. Scroll to **Container Inventory & Demurrage Control**.
2. Click **+ Add Container**.
3. Register Container 1:
   - Container Number: `MSKU1234567`
   - Container Type: `40FT_HQ`
   - Payload Capacity: `28,500 kg`
   - Gross Weight: `24,200 kg`
   - Loading Date: `2026-11-08`
   - Port Free-Time End Date: `2026-12-15` (7 days free time)
   - Empty Container Return Due Date: `2026-12-25` (14 days inland free time)
   - Status: `ON_BOARD`
4. Click **Save Container**.
5. Register Container 2: `MSKU7654321` (`40FT_HQ`, `ON_BOARD`).
6. **Verification:**
   - Both containers appear in the table with their free-time deadlines.
   - Demurrage risk warnings display if return dates approach within 5 days.

#### Test Case 5.5: Cargo Readiness & Shipping Milestones (`IMP-28`)
1. Scroll to **Shipping Milestones Progress Sequence**.
2. Observe 5 default sequenced milestones:
   1. `CARGO_READY`
   2. `BOOKING_CONFIRMED`
   3. `VESSEL_DEPARTED`
   4. `PORT_ARRIVED`
   5. `CUSTOMS_CLEARED`
3. Click the checkbox next to **CARGO_READY** to mark it complete.
4. Note that the system records the timestamp and your active user email as the completer.
5. Click **VESSEL_DEPARTED** to complete it.
6. **Verification:** Progress meter updates to `2 / 5 Milestones Completed (40%)`.

#### Test Case 5.6: Marine Cargo Insurance Capture (`IMP-29`)
1. Scroll to **Marine Cargo Insurance Policy**.
2. Click **Record Insurance Policy**.
3. Fill in:
   - Insurer Name: `Ethiopian Insurance Corporation (EIC)`
   - Policy Number: `EIC-MAR-2026-00451`
   - Coverage Amount: `150,000.00`
   - Currency: `USD`
   - Premium Amount: `750.00`
   - Policy Start Date: `2026-11-01`
   - Policy Expiry Date: `2027-01-31`
4. Click **Save Insurance Policy**.
5. **Verification:** The Insurance Card displays `EIC-MAR-2026-00451` with `ACTIVE POLICY` badge and full coverage amount.

#### Test Case 5.7: ECTN / Cargo Tracking Deadline Control (`IMP-30`)
1. Scroll to **ECTN / BESC & Regulatory Cargo Tracking**.
2. Click **Record ECTN Reference**.
3. Fill in:
   - Tracking Reference / ECTN No: `ECTN-DJ-2026-9908`
   - Tracking Document Type: `ECTN`
   - Submission Deadline: `2026-11-09`
   - Status: `SUBMITTED`
4. Click **Save Cargo Tracking**.
5. **Verification:** Tracking reference displays with deadline countdown and `SUBMITTED` badge.

---

### Phase 6: Shipping Document Control and Verification (`IMP-32` – `IMP-37`)

#### Test Case 6.1: Structured Shipping Document Checklist & Verification (`IMP-32` – `IMP-35`)
1. In the **Logistics & Booking** tab, scroll to **Shipping Document Lifecycle & Verification**.
2. Observe the standard regulatory document checklist:
   - `COMMERCIAL_INVOICE`
   - `PACKING_LIST`
   - `BILL_OF_LADING`
   - `CERTIFICATE_OF_ORIGIN`
   - `INSPECTION_CERTIFICATE`
   - `CUSTOMS_DECLARATION`
3. Click **Update Status** on `BILL_OF_LADING`:
   - Enter Document Reference: `ESLSE-BL-ADD-901`
   - Issue Date: `2026-11-10`
   - Verification Status: Select `VERIFIED`
   - Original Paper Status: Select `RELEASED_TO_AGENT`
   - Notes: `Original B/L verified with ESLSE booking agent.`
4. Click **Save Document Record**.
5. **Verification:** The Bill of Lading row turns green with badge `VERIFIED` and original paper status `RELEASED_TO_AGENT`.

#### Test Case 6.2: Stage Gating Enforcement (`IMP-37`)
1. In `ShipmentDetailPage`, attempt to advance the shipment stage to `ETHIOPIAN_CUSTOMS_CLEARANCE` without a verified `CUSTOMS_DECLARATION`.
2. Notice the warning alert enforcing that required regulatory documents must be verified prior to customs clearance completion.

---

### Phase 7: Workflow, Automated Deadlines, and Scan Notifications (`IMP-38` – `IMP-42`)

#### Test Case 7.1: Automated Container Free-Time Scanner
1. Trigger the background scan API via curl or backend service:
   ```bash
   curl -X POST http://localhost:3000/api/shipments/scan-deadlines \
     -H "Authorization: Bearer <TOKEN>"
   ```
2. Verify response:
   ```json
   {
     "notificationsGenerated": 0,
     "message": "Import deadline scan completed successfully"
   }
   ```
3. Set a container return date to within 2 days in the past or future.
4. Re-run scan; verify an alert record is created in `import_notification` without duplicates.

---

### Phase 8: Operational Monitoring & Reconciliation Matrix (`IMP-43` – `IMP-48`)

#### Test Case 8.1: Logistics Tracking Report (`IMP-45`)
1. Navigate to **Reports &gt; Procurement Reports**.
2. Click the tab: **Import Reconciliation & Logistics (IMP-45–48)**.
3. Select sub-tab: **Shipment & Logistics Report (IMP-45)**.
4. **Verification:**
   - KPI cards reflect: Total Shipments Tracked, Assigned Forwarders, Active Vessel Bookings, Insured Shipments.
   - Shipments table lists `MV LAKE TANA`, forwarder name, container counts, completed milestones, and insurance coverage.

#### Test Case 8.2: Document Completeness Report (`IMP-46`)
1. Switch to sub-tab: **Document Completeness Report (IMP-46)**.
2. **Verification:**
   - Table displays every required document across all active shipments.
   - Shows verification status (`VERIFIED`, `PENDING`, `REJECTED`) and original paper release status (`RELEASED_TO_AGENT`, `ENDORSED_TO_BANK`).
   - Search bar filters by document type or shipment number.

#### Test Case 8.3: Import Reconciliation Matrix (`IMP-47`)
1. Switch to sub-tab: **Import Reconciliation Matrix (IMP-47)**.
2. **Verification:**
   - Displays three-way quantity matching:
     - **Ordered Qty** (from Purchase Order line)
     - **Shipped Qty** (from Bill of Lading / Shipment line)
     - **Received Qty** (from Warehouse physical Goods Receipt Note)
     - **Outstanding Qty** (unfulfilled quantity)
   - Variance status badges:
     - `MATCHED` (Green)
     - `UNDER_RECEIVED` / `IN_TRANSIT` (Amber)
     - `NOT_SHIPPED` (Rose)
   - Search by PO #, Supplier, or Item Code works seamlessly.

---

### Phase 9: Docker Deployment Verification (`IMP-49` – `IMP-53`)

#### Test Case 9.1: Container Pull & Health Verification
1. Pull latest published images from Docker Hub:
   ```bash
   docker pull poggab/kanab-backend:latest
   docker pull poggab/kanab-frontend:latest
   ```
2. Run images using `docker compose`:
   ```bash
   docker compose down
   docker compose up -d
   ```
3. Verify backend health:
   ```bash
   curl http://localhost:3000/api/health
   ```
   *Expected:* HTTP 200 `{ "status": "ok" }`.
4. Open browser to `http://localhost:5173` (or configured frontend port) and verify all logistics pages load without console errors.

---
**Testing Guide KMSICAMS-12 Part 2 complete.**
