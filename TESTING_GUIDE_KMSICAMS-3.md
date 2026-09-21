# KANAB Motors — Comprehensive Story-by-Story Testing Guide (KMSICAMS-3)

> **Ticket Code:** `KMSICAMS-3` — Import, Shipment Tracking & Landed Cost Management  
> **Modules Covered:**  
> 1. Foundational Reference Data & Suppliers (Stories F1 – F4)  
> 2. Purchase Order Management (Stories PO1 – PO9)  
> 3. Shipment Tracking & Multi-Stage Logistics (Stories S1 – S7)  
> 4. Multi-Currency Shipment Cost Recording (Stories C1 – C6)  
> 5. Landed Cost Allocation Engine with Zero Rounding Drift (Stories A1 – A8)  
> 6. Receipt into Inventory & Vehicle Unit Creation (Stories R1 – R6)  
> 7. Document Centre Integration & Customs Clearance Gate (Stories D1 – D4)  
> 8. Procurement & Import Pipeline Reporting (Stories RP1 – RP2)  
> **Backend Base URL:** `http://localhost:3000/api`  
> **Interactive Swagger Docs:** `http://localhost:3000/api/docs`  
> **Frontend Application:** `http://localhost:5173`

---

## 📋 SECTION 1: Foundational Setup & Reference Data (Stories F1 – F4)

---

### TC-F1: International Supplier Master Data & Migration
* **Story F1:** International supplier entity, migration, and CRUD API.
* **Goal:** Verify that the `supplier` table exists with proper unique constraints and audit columns, and supports full CRUD operations.
* **Database Inspection:**
  ```sql
  SELECT column_name, data_type, is_nullable 
  FROM information_schema.columns 
  WHERE table_name = 'supplier';
  ```
* **API Verification Steps:**
  1. Send `POST /api/suppliers` with payload:
     ```json
     {
       "supplierName": "Toyota Tsusho Corporation",
       "country": "Japan",
       "contactPerson": "Kenji Sato",
       "phone": "+81-3-5288-2111",
       "email": "kenji.sato@toyota-tsusho.com",
       "address": "4-9-8 Meieki, Nakamura-ku, Nagoya"
     }
     ```
  2. Verify response status `201 Created` with generated `supplierId`.
  3. Send duplicate `POST /api/suppliers` with same `supplierName`.
  4. Verify response status `400 Bad Request` preventing duplicate supplier registration.
  5. Send `GET /api/suppliers` to list all registered suppliers.
* **UI Verification Steps:**
  1. In Sidebar, click **Suppliers Master** under *Import & Landed Cost*.
  2. Click **+ Register Supplier**, fill out supplier details, and click **Create Supplier**.
  3. Verify the supplier appears in the table with an active badge.

---

### TC-F2: Standard Cost Component Types Master
* **Story F2:** Pre-seeded standard cost component lookup table.
* **Goal:** Verify all 13 Ethiopian automotive import cost component types are seeded and available.
* **Database Inspection:**
  ```sql
  SELECT type_code, type_name FROM cost_component_type ORDER BY cost_component_type_id;
  ```
* **Expected Codes:**
  * `SEA_FREIGHT` — International Ocean Freight
  * `INSURANCE_TRANSIT` — Marine / Transit Insurance
  * `PORT_HANDLING_DJIBOUTI` — Port Handling Fees (Djibouti)
  * `CUSTOMS_DUTY_ETHIOPIA` — Ethiopian Customs Duty
  * `SURTAX` — Surtax
  * `EXCISE_TAX` — Excise Tax
  * `WITHHOLDING_TAX` — Advance Withholding Tax
  * `INLAND_TRANSPORT` — Inland Transport (Djibouti to Addis Ababa)
  * `STORAGE_DEMURRAGE` — Storage & Demurrage Fees
  * `CLEARING_AGENT_FEE` — Customs Clearing Agent Professional Fee
  * `INSPECTION_FEES` — Pre-Shipment / Port Inspection Fees
  * `TRANSIT_PERMIT` — Transit Permits & Documentation
  * `OTHER_IMPORT_COST` — Other Miscellaneous Import Expenses
* **API Verification:**
  * Send `GET /api/shipments/lookups/cost-component-types`.
  * Verify all 13 types are returned with IDs and descriptions.

---

### TC-F3: Exchange Rate Baseline & Immutable Snapshot Mechanics
* **Story F3:** Currency reference rates and snapshotting.
* **Goal:** Verify baseline rates exist for `USD`, `EUR`, and `ETB`, and updating baseline rates does not mutate past historical vouchers.
* **Steps:**
  1. Send `GET /api/shipments/lookups/exchange-rates`.
  2. Verify baseline rates (e.g., USD = 125.0000 ETB, EUR = 135.0000 ETB).
  3. Send `PUT /api/shipments/lookups/exchange-rates/USD` with `{"rateToEtb": 128.5000}`.
  4. Verify status `200 OK` with updated rate.
  5. In UI, navigate to **Import Pipeline & Reports** -> **Currency Exchange Rates (F3)** and verify the new rate is visible.

---

### TC-F4: Product Item Weight Integration
* **Story F4:** Add `weight_kg` attribute to `product_item` for weight-based landed cost apportionment.
* **Database Inspection:**
  ```sql
  SELECT item_id, item_code, item_name, weight_kg 
  FROM product_item 
  WHERE weight_kg IS NOT NULL;
  ```
* **Verification:**
  * Verify `weight_kg` is defined as `NUMERIC(10,2)` and can be queried or updated on items.

---

## 📋 SECTION 2: Purchase Order Management (Stories PO1 – PO9)

---

### TC-PO1: Sequential Purchase Order Number Generation
* **Story PO1:** `po_number` format `PO-YYYY-NNNNNN` via database sequence.
* **Goal:** Verify automated incrementation of sequential PO numbers.
* **Steps:**
  1. Create two purchase orders sequentially via `POST /api/purchase-orders`.
  2. Verify numbers follow pattern: `PO-2026-000001`, `PO-2026-000002`.

---

### TC-PO2: Purchase Order Multi-Currency & Line Consistency
* **Story PO2:** Multi-currency support (ETB, USD, EUR) with line currency inheritance.
* **Goal:** Ensure line item prices and totals strictly inherit and validate against the PO header currency.
* **Steps:**
  1. Create PO with currency `USD`.
  2. Include 2 line items:
     * Line 1: `quantityOrdered = 5`, `unitPrice = 28500.00`
     * Line 2: `quantityOrdered = 3`, `unitPrice = 34000.00`
  3. Verify database generated column `line_total` equals:
     * Line 1: $142,500.00
     * Line 2: $102,000.00
     * Total PO Commitment: $244,500.00

---

### TC-PO3: Create Purchase Order API with Nested Line Validation
* **Story PO3:** Atomically create PO and lines with validation.
* **API Payload (`POST /api/purchase-orders`):**
  ```json
  {
    "supplierId": 1,
    "currency": "USD",
    "notes": "Q3 2026 Land Cruiser & Hilux Allocation",
    "lines": [
      {
        "itemId": "1",
        "quantityOrdered": 4,
        "unitPrice": 42000.00
      }
    ]
  }
  ```
* **Expected Result:** HTTP 201 with PO status `DRAFT`.

---

### TC-PO4 & TC-PO5: PO Lifecycle Transitions & Approval Workflow
* **Stories PO4 & PO5:** Finite state machine for Purchase Orders.
* **State Transition Rules:**
  * `DRAFT` $\rightarrow$ `SUBMITTED` $\rightarrow$ `CONFIRMED` $\rightarrow$ `PARTIALLY_RECEIVED` $\rightarrow$ `RECEIVED`
  * `DRAFT` / `SUBMITTED` / `CONFIRMED` $\rightarrow$ `CANCELLED`
* **Test Steps:**
  1. Attempt invalid jump: `PATCH /api/purchase-orders/:id/status` with `{"status": "RECEIVED"}` while in `DRAFT`.
  2. Verify HTTP `400 Bad Request` rejecting invalid transition.
  3. Progress `DRAFT` $\rightarrow$ `SUBMITTED`.
  4. Progress `SUBMITTED` $\rightarrow$ `CONFIRMED`.
  5. Verify PO is now confirmed and eligible for shipment line assignment.

---

### TC-PO6 & TC-PO7: PO Listing, Search & Detailed Read API
* **Stories PO6 & PO7:** Query and inspect purchase orders.
* **Steps:**
  1. Call `GET /api/purchase-orders?status=CONFIRMED&search=PO-2026`.
  2. Call `GET /api/purchase-orders/:id`.
  3. Verify nested lines, supplier profile, and computed total amounts are included.

---

### TC-PO8: Edit Purchase Order API (Restricted to DRAFT)
* **Story PO8:** Modifications permitted only while in `DRAFT` status.
* **Steps:**
  1. Call `PUT /api/purchase-orders/:id` on a `CONFIRMED` order.
  2. Verify HTTP `400 Bad Request` with message: *"Only DRAFT purchase orders can be edited"*.

---

### TC-PO9: Open PO Lines Query API for Shipment Assignment
* **Story PO9:** Available confirmed PO lines query.
* **Steps:**
  1. Call `GET /api/purchase-orders/open-lines`.
  2. Verify response includes lines from `CONFIRMED` or `PARTIALLY_RECEIVED` purchase orders with item code, item name, and quantity ordered.

---

## 📋 SECTION 3: Shipment Tracking & Logistics (Stories S1 – S7)

---

### TC-S1: Shipment Data Model & Automated Numbering
* **Story S1:** `shipment_number` format `SHP-YYYY-NNNNNN` via sequence.
* **Goal:** Verify shipment creation with Bill of Lading and default allocation method.
* **Steps:**
  1. Call `POST /api/shipments` with payload:
     ```json
     {
       "billOfLadingNumber": "MSKU-982341029",
       "expectedArrivalDate": "2026-10-15",
       "allocationMethod": "BY_VALUE",
       "notes": "Maersk maritime shipment from Yokohama",
       "lines": [
         {
           "poLineId": "1",
           "quantityShipped": 4
         }
       ]
     }
     ```
  2. Verify response status `201 Created` with `shipmentNumber` like `SHP-2026-000001` and initial stage `ORDERED`.

---

### TC-S2 & TC-S3: Shipment Line Association & Over-Shipment Prevention
* **Stories S2 & S3:** Strict validation of line item shipping quantities against PO lines.
* **Steps:**
  1. Attempt to create a shipment with `quantityShipped = 10` for a PO line with `quantityOrdered = 4`.
  2. Verify HTTP `400 Bad Request` with error: *"Quantity shipped (10) cannot exceed PO line ordered quantity (4)"*.
  3. Submit valid quantity ($\le 4$) and verify successful line creation.

---

### TC-S4, TC-S5 & TC-S6: Six-Stage Shipment Lifecycle & Stage Progression
* **Stories S4, S5 & S6:** Shipment stage progression and audit trail in `shipment_stage_history`.
* **The 6 Sequential Stages:**
  1. `ORDERED` (Factory order confirmed)
  2. `SHIPPED` (Onboard maritime vessel)
  3. `AT_DJIBOUTI_PORT` (Discharged at Port of Doraleh/Djibouti)
  4. `ETHIOPIAN_CUSTOMS_CLEARANCE` (Mojo Dry Port / Kality Customs)
  5. `IN_TRANSIT_INLAND` (Highway transport to Addis Ababa)
  6. `RECEIVED` (Safely parked at KANAB Showroom / Yard)
* **Steps:**
  1. Progress shipment from `ORDERED` $\rightarrow$ `SHIPPED`.
  2. Progress `SHIPPED` $\rightarrow$ `AT_DJIBOUTI_PORT`.
  3. Inspect `shipment_stage_history` in DB:
     ```sql
     SELECT * FROM shipment_stage_history WHERE shipment_id = :shipmentId ORDER BY changed_at ASC;
     ```
  4. Verify timestamps, old stage, new stage, and user IDs are logged.

---

### TC-S7: Shipment Listing & Stage Filter API
* **Story S7:** Filter shipments by current logistics stage.
* **Steps:**
  1. Send `GET /api/shipments?stage=AT_DJIBOUTI_PORT`.
  2. Verify only shipments currently at the port are returned.

---

## 📋 SECTION 4: Multi-Currency Shipment Cost Recording (Stories C1 – C6)

---

### TC-C1 & TC-C2: Cost Component Recording & Immutable Snapshot
* **Stories C1 & C2:** Record expenses in foreign/local currencies with immutable exchange rate snapshotting.
* **Goal:** Verify that `amount_etb` is strictly calculated as `amount * exchange_rate_to_etb`.
* **API Payload (`POST /api/shipments/:id/costs`):**
  ```json
  {
    "costComponentTypeId": 1,
    "amount": 8400.00,
    "currency": "USD",
    "exchangeRateToEtb": 125.0000,
    "notes": "Ocean freight invoice from Maersk Line"
  }
  ```
* **Expected Result:**
  * Stored `amountEtb` = ETB 1,050,000.00.
  * Even if default USD exchange rate changes later to 130.00, this voucher remains ETB 1,050,000.00.

---

### TC-C3: Cost Deletion & Allocation Invalidation
* **Story C3:** Invalidate prior landed cost runs upon cost mutation.
* **Steps:**
  1. Allocate landed costs on a shipment (status `is_current = true`).
  2. Delete a cost component via `DELETE /api/shipments/:id/costs/:costId`.
  3. Query `shipment_line_landed_cost` in DB: verify `is_current` is updated to `false`, requiring re-allocation before receipting.

---

### TC-C4 & TC-C5: Total Landed Cost Aggregation & Breakdown Query
* **Stories C4 & C5:** Aggregate FOB value and all additional import expenses.
* **Steps:**
  1. Add Ocean Freight: USD 8,400 (ETB 1,050,000).
  2. Add Ethiopian Customs Duty: ETB 1,450,000.
  3. Add Inland Transport: ETB 180,000.
  4. Verify total additional costs sum to ETB 2,680,000.00.

---

### TC-C6: Cost Recording Restrictions by Stage
* **Story C6:** Inhibit adding new costs once shipment is marked `RECEIVED`.
* **Steps:**
  1. Move shipment to stage `RECEIVED`.
  2. Attempt `POST /api/shipments/:id/costs`.
  3. Verify HTTP `400 Bad Request` with message: *"Cannot add cost components to a shipment that is already RECEIVED"*.

---

## 📋 SECTION 5: Landed Cost Allocation Engine (Stories A1 – A8)

---

### TC-A1: Three Apportionment Basis Methods
* **Story A1:** Support `BY_VALUE` (FOB value proportion), `BY_QUANTITY` (unit count), and `BY_WEIGHT` (gross weight kg).
* **Verification:**
  * Check `LandedCostAllocationService`: verify formulas correctly apply corresponding weighting ratios across all shipment lines.

---

### TC-A2 & TC-A7: Hare-Niemeyer Zero-Rounding-Drift Mathematical Distribution
* **Stories A2 & A7:** Pure zero-drift allocation using Largest Remainder Method.
* **Goal:** Guarantee $\sum \text{allocated\_cost} \equiv \text{total\_additional\_costs}$ with 0.00 cents drift.
* **Automated Test Execution:**
  ```powershell
  cd d:\kanab\backend
  npm test -- src/modules/shipments/services/landed-cost-allocation.service.spec.ts
  ```
* **Test Scenarios Verified:**
  1. **3 Lines with Indivisible Total:**
     * Additional Cost: ETB 100.00 across 3 identical lines.
     * Standard division yields $33.3333...$ cents $\rightarrow$ sum = 99.99 (1 cent lost!).
     * Hare-Niemeyer distributes: Line 1: `33.34`, Line 2: `33.33`, Line 3: `33.33`.
     * Total allocated: **ETB 100.00** (drift = 0.00).
  2. **7 Lines Real-World Import Simulation:**
     * Total Additional Costs: ETB 1,483,921.43 across 7 unequal vehicle lines.
     * Total allocated: **ETB 1,483,921.43** (drift = 0.00).

---

### TC-A3 & TC-A4: Landed Cost Execution & Unit Cost Calculation
* **Stories A3 & A4:** Compute final landed cost per vehicle unit.
* **Steps:**
  1. Call `POST /api/shipments/:id/allocate-landed-cost` with `{"allocationMethod": "BY_VALUE"}`.
  2. Verify response contains:
     * `lines`: Array of line allocations with `fobAmountEtb`, `allocatedAdditionalCostsEtb`, `totalLandedCostEtb`, and `unitLandedCostEtb`.
     * `summary`: `totalFobEtb`, `totalAdditionalCostsEtb`, `totalLandedCostEtb`.
  3. Verify mathematical identity:
     $$\text{totalLandedCostEtb} = \text{totalFobEtb} + \text{totalAdditionalCostsEtb}$$
     $$\text{unitLandedCostEtb} = \frac{\text{totalLandedCostEtb}}{\text{quantityShipped}}$$

---

### TC-A5: Landed Cost Breakdown Report API
* **Story A5:** Fetch current active landed cost breakdown.
* **Steps:**
  1. Call `GET /api/shipments/:id/landed-cost-report`.
  2. In UI, click **Shipment Detail** -> **Landed Cost Engine** tab.
  3. Verify table displays each line with FOB, Allocated Costs, Landed Total, and Unit Landed Cost in ETB.

---

### TC-A6: Allocation Invalidation & Versioning
* **Story A6:** Maintain historical allocation runs with `is_current = false`.
* **Database Inspection:**
  ```sql
  SELECT allocation_run_id, is_current, allocated_at, total_landed_cost_etb 
  FROM shipment_line_landed_cost 
  WHERE shipment_id = :shipmentId 
  ORDER BY allocated_at DESC;
  ```
* **Verification:** Only the most recent allocation execution has `is_current = true`.

---

### TC-A8: Zero/Missing Weight Edge Case Handling
* **Story A8:** Guard against division by zero in `BY_WEIGHT` allocation.
* **Steps:**
  1. Attempt `POST /api/shipments/:id/allocate-landed-cost` with `allocationMethod = 'BY_WEIGHT'` on a shipment whose products have `weight_kg = 0` or `null`.
  2. Verify HTTP `400 Bad Request` with clear error: *"Total weight of shipment items is zero or undefined. Cannot allocate BY_WEIGHT"*.

---

## 📋 SECTION 6: Receipt into Inventory & Vehicle Unit Creation (Stories R1 – R6)

---

### TC-R1 & TC-R2: Multi-Batch Receipting & Over-Receipt Prevention
* **Stories R1 & R2:** Multi-batch receipt of shipped quantities.
* **Steps:**
  1. Shipment line has `quantityShipped = 3`.
  2. Receive batch 1: `quantityReceived = 2`.
  3. Verify `shipment_line.quantity_received` updates to `2`.
  4. Attempt to receive batch 2 with `quantityReceived = 2`.
  5. Verify HTTP `400 Bad Request` with error: *"Cannot receive 2 units. Remaining unreceived quantity is 1"*.
  6. Submit batch 2 with `quantityReceived = 1` $\rightarrow$ Successfully received.

---

### TC-R3 & TC-R4: Automated Vehicle Unit Creation with VIN & Landed Cost Stamp
* **Stories R3 & R4:** Creation of physical `vehicle_unit` records and stamping of landed cost.
* **API Payload (`POST /api/shipments/:id/receive`):**
  ```json
  {
    "shipmentLineId": "1",
    "quantityReceived": 2,
    "receiptDate": "2026-09-17",
    "vehicleUnits": [
      {
        "chassisNumber": "JTNB11HK804921001",
        "engineNumber": "1GD-9082341",
        "color": "Super White",
        "productionYear": 2026
      },
      {
        "chassisNumber": "JTNB11HK804921002",
        "engineNumber": "1GD-9082342",
        "color": "Attitude Black",
        "productionYear": 2026
      }
    ]
  }
  ```
* **Database Inspection:**
  ```sql
  SELECT unit_id, chassis_number, engine_number, status, shipment_line_id 
  FROM vehicle_unit 
  WHERE chassis_number IN ('JTNB11HK804921001', 'JTNB11HK804921002');

  SELECT * FROM vehicle_unit_landed_cost;
  ```
* **Expected Result:**
  * Vehicle units created with status `AVAILABLE_IN_STOCK`.
  * `vehicle_unit_landed_cost` row created stamping exact `final_landed_cost_etb`.

---

### TC-R5 & TC-R6: Purchase Order Fulfillment Status Auto-Update
* **Stories R5 & R6:** PO status transition upon full receipt.
* **Steps:**
  1. Check PO status after receiving all shipment lines.
  2. Verify PO status updates to `RECEIVED` (or `PARTIALLY_RECEIVED` if partial).
  3. Verify stock levels on `product_item` increment accordingly.

---

## 📋 SECTION 7: Document Centre Integration & Customs Clearance Gate (Stories D1 – D4)

---

### TC-D1 & TC-D4: Shipment Document Upload with Document Type Tagging
* **Stories D1 & D4:** Upload and associate documents to shipments with standardized types.
* **Standard Document Types:**
  * `COMMERCIAL_INVOICE`
  * `BILL_OF_LADING`
  * `PACKING_LIST`
  * `CUSTOMS_DECLARATION`
  * `TRANSIT_PERMIT`
  * `INSURANCE_CERTIFICATE`
  * `OTHER`
* **UI Steps:**
  1. Open a Shipment Detail page.
  2. Click the **Document Centre** tab.
  3. Select **Document Type** (e.g. `BILL_OF_LADING`), pick a file, and click **Upload Document**.
  4. Verify the document appears in the uploaded documents table with document type pill and upload timestamp.

---

### TC-D2: Document Completeness Check Blocking Customs Clearance
* **Story D2:** Automated regulatory compliance gate.
* **Rule:** Transitioning a shipment to `ETHIOPIAN_CUSTOMS_CLEARANCE` or `RECEIVED` **MUST** be rejected if a `CUSTOMS_DECLARATION` document is not attached.
* **Test Steps:**
  1. Create a new shipment at stage `AT_DJIBOUTI_PORT` with NO documents attached.
  2. Attempt to advance stage to `ETHIOPIAN_CUSTOMS_CLEARANCE`:
     ```json
     PATCH /api/shipments/:id/stage
     {
       "stage": "ETHIOPIAN_CUSTOMS_CLEARANCE",
       "notes": "Arrived at Mojo dry port"
     }
     ```
  3. Verify HTTP `400 Bad Request` with response:
     ```json
     {
       "statusCode": 400,
       "message": "Cannot transition to ETHIOPIAN_CUSTOMS_CLEARANCE: Missing mandatory document 'CUSTOMS_DECLARATION'. Please upload customs declaration before proceeding.",
       "error": "Bad Request"
     }
     ```
  4. Upload a document with `documentType = 'CUSTOMS_DECLARATION'`.
  5. Retry the stage progression.
  6. Verify stage progression succeeds `200 OK`.

---

## 📋 SECTION 8: Procurement & Import Pipeline Reporting (Stories RP1 – RP2)

---

### TC-RP1: Shipment Status & Pipeline Bottleneck Report
* **Story RP1:** Overview of all active shipments across the logistics funnel.
* **API Verification:**
  * Send `GET /api/shipments/reports/pipeline`.
  * Verify payload includes:
    * `totalShipments`
    * `totalActiveShipments`
    * `totalInlandTransit`
    * `stageBreakdown`: Count of shipments per stage
    * `recentShipments`: Array of recent shipments with stage, arrival date, lines count, and vouchers count.
* **UI Verification:**
  1. Navigate to **Import Pipeline & Reports** in Sidebar.
  2. Verify Tab 1: **Shipment Pipeline & Bottlenecks (RP1)** displays:
     * 4 high-level KPI cards.
     * Visual funnel distribution with progress tracks across all 6 logistics stages.
     * Table of recent pipeline shipments.

---

### TC-RP2: Purchase Order Status & Fulfillment Report
* **Story RP2:** Purchase Order portfolio and currency commitments.
* **API Verification:**
  * Send `GET /api/purchase-orders/reports/status`.
  * Verify payload includes:
    * `totalPOs`
    * `statusCounts`: Count of POs by status (`DRAFT`, `CONFIRMED`, `RECEIVED`, etc.)
    * `currencyTotals`: Total commitments broken down by `USD`, `ETB`, `EUR`
    * `totalOrderedUnits`: Total vehicle units contracted across all PO lines.
* **UI Verification:**
  1. In **Import Pipeline & Reports**, click **Purchase Order Fulfillment (RP2)** tab.
  2. Verify KPI cards for Total Orders, Total Units Contracted, USD Commitment, and ETB Commitment.
  3. Verify PO lifecycle status tiles and recent orders table.

---

## 🚀 End-to-End Automated Regression Command

To run the complete automated test suite across all modules (Modules 1, 2, and 3):

```powershell
cd d:\kanab\backend
npm test
```

Expected output:
```text
PASS src/modules/shipments/services/landed-cost-allocation.service.spec.ts
PASS src/modules/refunds/refunds.service.spec.ts
PASS src/modules/vehicles/vehicles.service.spec.ts
PASS src/modules/customers/customers.service.spec.ts
PASS src/modules/ledger/ledger.service.spec.ts

Test Suites: 5 passed, 5 total
Tests:       16 passed, 16 total
Snapshots:   0 total
Time:        2.072 s
```
