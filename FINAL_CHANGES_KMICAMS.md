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

## Executive Summary of Tested Changes

This testing walkthrough specifically validates the **4 bold red additions** in Module 1 and Module 2:

| Story # | Jira Reference | Scope / Description | Implementation Details |
|---|---|---|---|
| **1.1** | **Customer WHT Flag** | Customers require a Withholding Tax (WHT) flag depending on legal/tax standing | Added `withholdingTaxFlag` to Customer entity, DB column, create/edit modals, directory table badge, and profile view |
| **2.1** | **Vehicle Attributes** | Vehicles require Colour, Engine/Motor Capacity (cc), and Battery Power (kWh) | Added `colour`, `engine_capacity_cc`, `battery_power_kwh` to Product Items, tables, and lifecycle tracking |
| **2.2** | **Reference Data Lookups** | Lookups for vehicle colours and units of measure | Added `vehicle_color` lookup table with 7 seeded colors, plus REST endpoints `/api/lookups/colors` and `/api/lookups/uoms` |
| **2.3** | **Multi-Tax Configuration** | Multi-tax tiers for VAT (15%), Excise duty, and WHT (2%) with customer and vehicle applicability | Added `tax_type`, `applicable_customer_type`, `applicable_vehicle_type`, `description` to Tax Configuration modal & backend |

---

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

## Verification & Sign-off Checklist

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
| **Integration** | Vehicle Inventory & Lifecycle display colour and specs | [ ] | Displayed on `/vehicles` table and lifecycle modal |

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
