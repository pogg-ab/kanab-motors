# Testing Guide: KMSICAMS-4 (Inventory & Warehouse Management)

## Overview
**KMSICAMS-4** implements the enterprise **Inventory and Warehouse Management** engine for KANAB Motors SIMS, adhering strictly to `kanab_motors_schema_inventory_warehouse.sql` and the 8 core sub-modules from Jira/Confluence.

---

### Architecture & Sub-Modules Implemented

| # | Sub-Module | Features & Artifacts |
|---|---|---|
| **1** | **Warehouse Management & RBAC** (`W1`–`W3`) | Extended warehouse entity (`warehouse_type`, `capacity`, `manager_user_id`, `contact_phone`). User-warehouse scoped security matrix (`user_warehouse_access`). |
| **2** | **Vehicle Status State Machine** (`V1`–`V8`) | Rules table (`vehicle_status_transition_rule`), history audit log (`vehicle_status_history`), atomic transition procedure `fn_transition_vehicle_status()`. Blocks invalid status jumps. |
| **3** | **General Stock Management** (`G1`–`G4`) | `stock_balance` table tracking `quantity_on_hand`, `quantity_reserved`, `quantity_available`. Reorder point alert view (`vw_low_stock_alert`). Auto-increments on non-serialized shipment receipt (`trg_shipment_receipt_stock_balance`). |
| **4** | **Stock Transfer** (`T1`–`T6`) | Inter-warehouse transfers for both serialized vehicle units and parts (`stock_transfer`, `stock_transfer_line`). Trigger `trg_execute_stock_transfer` shifts inventory atomically upon completion. |
| **5** | **Stock Adjustment** (`J1`–`J6`) | Adjustments with mandatory audit reason notes (`DAMAGE`, `LOSS`, `CYCLE_COUNT`, `FOUND`, `STATUS_CORRECTION`, `SCRAP`). Trigger `trg_execute_stock_adjustment` updates balances upon approval. |
| **6** | **Stock Movement History** (`H1`–`H2`) | Unified double-entry timeline view (`vw_stock_movement_history`) tracking `RECEIPT`, `TRANSFER_OUT` (-qty), `TRANSFER_IN` (+qty), `ADJUSTMENT`, and `VEHICLE_STATUS_CHANGE`. |
| **7** | **Local Assembly / Production Intake** (`P1`–`P4`) | Resolves SRS scope gap: locally assembled vehicles received directly via `production_receipt`, triggering `trg_create_vehicle_unit_from_production` to create unit and activate to `AVAILABLE_FOR_SALE`. |
| **8** | **Reporting & Analytics** (`RP1`–`RP3`) | Real-time views `vw_current_stock_balance` and `vw_vehicle_inventory_by_status`. |

---

## Prerequisites & Access
- **Backend**: `http://localhost:3000` (API documentation at `/api-docs`)
- **Frontend**: `http://localhost:5173`
- **Navigation**: Click **Inventory & Warehouses** in the left sidebar (under Operations) or switch to tab `Inventory & Warehouses`.

---

## Test Scenarios & Execution

### Test 1: Real-time Stock Balances & Low Stock Alerts
1. Open the **Stock Balances** tab.
2. Confirm the warehouse filter dropdown (`All Warehouses`, `Addis Ababa Central Depot`, etc.) filters records dynamically.
3. If an item's available quantity is at or below its configured `reorderLevel`, verify the red warning banner appears at the top indicating items requiring procurement.

---

### Test 2: Local Production Vehicle Intake (Story P1–P4)
1. Click **Assembly Intake** (green button at top right).
2. Choose a model/item, and enter:
   - **Chassis / VIN**: `KANAB-2026-CHAS-TEST01`
   - **Engine Number**: `KANAB-2026-ENG-TEST01`
   - **Receiving Warehouse**: `Addis Ababa Central Depot`
3. Click **Receive into Inventory**.
4. Switch to the **Local Assembly Intake** tab:
   - Confirm receipt is listed with inspection status `AVAILABLE_FOR_SALE`.
5. Switch to **Vehicles Master** or **Movement History Log**:
   - Confirm vehicle unit is created and active for sale.

---

### Test 3: Inter-Warehouse Stock Transfer (Story T1–T6)
1. Click **New Transfer** (cyan button at top right).
2. Set:
   - **From Warehouse**: Addis Ababa Central Depot (ID 1)
   - **To Warehouse**: Hawassa Regional Depot (ID 2)
   - Choose **General Item / Part**, select an item, and set quantity to `2`.
3. Click **Submit Request**.
4. Go to **Stock Transfers** tab:
   - Verify transfer status is `REQUESTED`.
   - Click **Approve** -> status changes to `APPROVED`.
   - Click **Complete** -> status changes to `COMPLETED`.
5. Go to **Movement History Log** tab:
   - Confirm two synchronized ledger entries exist:
     - `TRANSFER_OUT` (-2) at Addis Ababa Central Depot
     - `TRANSFER_IN` (+2) at Hawassa Regional Depot.

---

### Test 4: Stock Adjustment with Mandatory Audit Notes (Story J1–J6)
1. Switch to the **Stock Adjustments** tab.
2. Click **New Adjustment**:
   - Select warehouse and item.
   - Set **Quantity Delta**: `-1`
   - Select reason: `DAMAGE`
   - Enter **Mandatory Audit Notes**: `Packaging ripped during forklift transit, carton water damaged`.
3. Click **Submit for Approval**.
4. Confirm status is `REQUESTED`.
5. Click **Approve**:
   - Confirm status becomes `APPROVED`.
   - In **Stock Balances**, verify quantity on hand decreased by 1.

---

### Test 5: Vehicle Lifecycle State Machine Enforcement (Story V1–V8)
1. Switch to **Vehicle State Machine** tab.
2. Review the configured rules:
   - `RECEIVED` -> `AVAILABLE_FOR_SALE`
   - `AVAILABLE_FOR_SALE` -> `RESERVED`
   - `RESERVED` -> `ALLOTTED`
   - `RESERVED` -> `AVAILABLE_FOR_SALE`
   - `ALLOTTED` -> `READY_FOR_DELIVERY`
   - `ALLOTTED` -> `AVAILABLE_FOR_SALE`
   - `READY_FOR_DELIVERY` -> `SOLD`
   - `SOLD` -> `DELIVERED`
3. Try an invalid transition via API:
   ```bash
   curl -X POST http://localhost:3000/api/inventory/vehicles/101/transition \
     -H "Content-Type: application/json" \
     -d '{"toStatus": "SOLD"}'
   ```
   *Expected result*: Status 400 Bad Request with error stating invalid transition from `RECEIVED`/`AVAILABLE_FOR_SALE` to `SOLD`.

---

## Automated Test Verification
Run all backend unit tests from the `backend/` directory:
```bash
npm test -- src/modules/inventory/inventory.service.spec.ts
```
Expected output:
```
PASS src/modules/inventory/inventory.service.spec.ts
  InventoryService (KMSICAMS-4 Inventory & Warehouse)
    Warehouse Management & User-Scoped Access
      √ should return list of warehouses
      √ should update warehouse details
      √ should throw NotFoundException if warehouse to update is missing
      √ should manage user-warehouse access correctly
    Vehicle Status State Machine
      √ should transition vehicle status using database function fn_transition_vehicle_status
      √ should throw BadRequestException if transition function throws
    Stock Transfers
      √ should throw BadRequestException when source and destination warehouse are identical
      √ should approve a transfer in REQUESTED status
      √ should complete a transfer and trigger trg_execute_stock_transfer
    Stock Adjustments
      √ should reject adjustment creation if reason notes are missing
      √ should create stock adjustment and auto-submit to approval engine
    Local Production Vehicle Intake
      √ should record local production intake and return receipt with vehicle
    Reports and Stock Movement History
      √ should query vw_stock_movement_history
      √ should query vw_current_stock_balance and vw_vehicle_inventory_by_status

Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
```
