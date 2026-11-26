# KANAB Motors — Company Profile, Importer Licenses & Rate Fix Manual Test Cases

**Scope:** 
1. Fix for **EST. UNIT RATE (USD)** / **Unit Price** auto-populating domestic retail sales price.
2. Centralized **Company Profile (Single Entity: KANAB Motors PLC)**.
3. Dynamic **Multiple Importer Licenses (`company_importer`)** with IEC, AD Code, and division scopes.
4. Procurement Integration: **Purchase Order Importer License Selection & Immutable Box 1 Document Snapshot**.
5. Referential Integrity: **Deletion Protection for Referenced Importers**.

**Execution Status:** ALL 12 TESTS PASSED (100% Verified with Admin Screenshots on 2026-11-23).

---

## 1. Before You Start

1. Ensure the backend and frontend are running on your local test environment:
   - **Backend API:** `http://localhost:3052` (NestJS)
   - **Frontend App:** `http://localhost:5173` (Vite / React)
2. Ensure database migration `1711000000014-MultipleCompanyImporters.ts` has been applied:
   - `company_importer` table exists and is linked to `company_profile`.
   - `importer_id` column exists on `purchase_order`.
   - Seeded primary default importer: `KANAB Motors PLC (Primary Importer)` (`ETH-IEC-994821` / `AD-CBE-0019284`).
3. Sign in to KANAB Motors with an authorized user (e.g. `admin` or a user with `COMPANY_PROFILE_EDIT` and `PURCHASE_ORDERS_CREATE` permissions).
4. Keep browser DevTools / Network tab open if you wish to inspect API payloads.

---

## 2. Test Fixture Reference Data

| Fixture | Key | Suggested Test Values | Purpose |
| :--- | :--- | :--- | :--- |
| **Primary Importer** | `IMP-01` | `KANAB Motors PLC (Primary Importer)`<br>IEC: `ETH-IEC-994821`, AD: `AD-CBE-0019284` | Pre-existing corporate default importer |
| **Secondary Importer** | `IMP-02` | `KANAB Commercial & EV Division`<br>IEC: `ETH-IEC-EV-77291`, AD: `AD-CBE-EV-0012` | Specialized heavy commercial vehicles & EV license |
| **Spare Parts Importer** | `IMP-03` | `KANAB Automotive Parts & Aftersales`<br>IEC: `ETH-IEC-SP-10492`, AD: `AD-CBE-SP-0088` | Specialized spare parts and accessories license |
| **Test Product** | `PROD-01` | Any existing catalog vehicle / motorcycle with a configured domestic `sellingPrice` | Proves retail sales price is NOT populated in import rate |

---

## 3. Manual Test Cases

### Part A: Rate Default Bug Fix (Boss Feedback 1)

#### TC-01: Import Requisition Unit Rate Defaults Blank (No domestic selling price)
* **Goal:** Verify that selecting an item in an Import Requisition does NOT automatically pre-fill the domestic retail sales price (in ETB) into `EST. UNIT RATE (USD)`.
* **Steps:**
  1. Navigate to **Procurement → Import Requisitions**.
  2. Click **+ New Import Requisition**.
  3. Select any **Requisition Department** and **Project / Allocation**.
  4. In the **Requisition Line Items** section:
     - Open the **Select Inventory Item / Spare Part** dropdown.
     - Choose a product that has a known domestic retail price (e.g. any motorcycle or vehicle).
  5. Inspect the **Est. Unit Rate (USD) \*** input field.
* **Expected Result:**
  - The **Est. Unit Rate (USD)** field remains **BLANK** (empty input with placeholder `0.00`).
  - It does **NOT** display the local showroom sales price (ETB).
  - You can enter the true estimated FOB import unit price (e.g., `1850.00`).

---

#### TC-02: Purchase Order Unit Price Defaults Blank (No retail selling price fallback)
* **Goal:** Verify that selecting an item in a Purchase Order modal does NOT automatically fill the domestic retail sales price or an arbitrary fallback ($2,500).
* **Steps:**
  1. Navigate to **Procurement → Purchase Orders**.
  2. Click **+ New Purchase Order**.
  3. Select a foreign vendor in **Foreign Supplier / Vendor \***.
  4. In the **Commercial Line Items & HSN Allocation** table:
     - Under **Inventory Item \***, select any catalog vehicle or motorcycle.
  5. Inspect the **Unit Price \*** field for that line.
* **Expected Result:**
  - The **Unit Price \*** input is **BLANK** (empty with placeholder `0.00`).
  - No domestic retail selling price or hardcoded default is inserted.
  - The user enters the negotiated proforma unit price (e.g., `2200.00`).

---

### Part B: Settings — Company Legal Profile & Multiple Importers (Boss Feedback 2)

#### TC-03: Single Corporate Legal Entity (KANAB Motors PLC)
* **Goal:** Verify that KANAB Motors remains a single legal entity at the company profile level, with no confusing multi-company selector.
* **Steps:**
  1. Navigate to **Settings → Company Profile** (`/settings/company-profile`).
  2. Inspect the page header and tabs.
* **Expected Result:**
  - Title reads: **Settings: Company Profile & Importer Information**.
  - Three distinct tabs are visible:
    1. **Company Legal Profile**
    2. **Importer Licenses (N)**
    3. **Importer Bank Accounts (N)**
  - Under Tab 1 (**Company Legal Profile**):
    - Legal Entity Name: `KANAB Motors PLC` (or your configured trading name).
    - General details: Trade Name, Registration No., TIN, VAT Registration No., Logo.
    - Headquarters Address: Full address, City, Country, Official Phone, Official Email, Website.
    - Right-hand card shows **Importer Regulatory Credentials** and a **Multiple Importer Licenses** shortcut card displaying total configured licenses.

---

#### TC-04: View Importer Licenses & KPI Overview Tab
* **Goal:** Verify the dedicated Importer Licenses management tab.
* **Steps:**
  1. On the Company Profile page, click on the **Importer Licenses** tab (or click `"Manage Importer Licenses →"` from Tab 1).
  2. Inspect the summary KPI cards and table.
* **Expected Result:**
  - Summary cards show:
    - **TOTAL IMPORTER LICENSES**: (e.g. `1` or more).
    - **PRIMARY DEFAULT IMPORTER**: Badge showing `KANAB Motors PLC (Primary Importer)` with its IEC number.
    - **ACTIVE REGULATORY LICENSES**: Count of active licenses.
  - The table displays columns:
    - **IMPORTER LICENSE / DIVISION**
    - **IEC NUMBER**
    - **AD CODE**
    - **OPERATIONAL SCOPE**
    - **DEFAULT** (showing `PRIMARY DEFAULT` badge with star icon)
    - **STATUS** (`Active` badge in green)
    - **ACTIONS** (`Edit`, status toggle, `Delete`)
  - A prominent button **+ Add Importer License** is displayed in the header.

---

#### TC-05: Register a New Secondary Importer License
* **Goal:** Add a second specialized importer license for KANAB Motors.
* **Steps:**
  1. On the **Importer Licenses** tab, click **+ Add Importer License**.
  2. In the modal, fill in the following test data:
     - **Importer / License Division Name \***: `KANAB Commercial & EV Division`
     - **Importer IEC No. \***: `ETH-IEC-EV-77291`
     - **Importer AD Code \***: `AD-CBE-EV-0012`
     - **Operational Scope / Description**: `Commercial electric trucks, chassis, and heavy utility haulage units`
     - **Designate as Primary Default**: *Leave Unchecked*
     - **License Active**: *Checked*
  3. Click **Add License**.
* **Expected Result:**
  - Success toast appears: `"Importer license 'KANAB Commercial & EV Division' added successfully!"`.
  - The modal closes.
  - The table immediately lists both `KANAB Motors PLC (Primary Importer)` and `KANAB Commercial & EV Division`.
  - Total Importer Licenses KPI increases to `2`.

---

#### TC-06: Field Validation on Importer IEC No. & AD Code Format
* **Goal:** Confirm input validation prevents malformed regulatory codes.
* **Steps:**
  1. Click **+ Add Importer License**.
  2. Enter **Division Name**: `Test Invalid Division`.
  3. Enter **Importer IEC No.**: `!!` (too short or invalid characters).
  4. Click **Add License**.
* **Expected Result:**
  - An inline red error alert appears: `"Importer IEC No. must be 3–50 characters (letters, numbers, - or /)."`.
  - The form is not submitted.
  5. Correct the IEC to `ETH-IEC-9999` and enter **Importer AD Code**: `##`.
  6. Click **Add License**.
* **Expected Result:**
  - Error alert appears: `"Importer AD Code must be 3–50 characters (letters, numbers, - or /)."`.
  7. Click **Cancel** to dismiss the modal.

---

#### TC-07: Designate Primary Default Importer License & Verify Legal Profile Sync
* **Goal:** Test changing the default importer license and verify automatic backward-compatible sync with `company_profile`.
* **Steps:**
  1. On the **Importer Licenses** table, locate the row for `KANAB Commercial & EV Division`.
  2. Click the **Make Default** button on that row.
* **Expected Result:**
  - Success toast: `"'KANAB Commercial & EV Division' designated as primary default importer license"`.
  - `KANAB Commercial & EV Division` now has the green **PRIMARY DEFAULT** badge.
  - The previous default importer now displays the **Make Default** button.
  3. Click on **Tab 1: Company Legal Profile**.
  4. Check the **Importer IEC No.** and **Importer AD Code** fields in the right-hand card.
* **Expected Result:**
  - The fields automatically show `ETH-IEC-EV-77291` and `AD-CBE-EV-0012`.
  5. Return to **Importer Licenses** and click **Make Default** on `KANAB Motors PLC (Primary Importer)` to restore it as primary default.

---

#### TC-08: Edit Importer License Details & Operational Scope
* **Goal:** Verify that modifying division names or operational descriptions persists properly.
* **Steps:**
  1. On the row for `KANAB Commercial & EV Division`, click **Edit**.
  2. Modify the **Operational Scope**: `Commercial electric vehicles, Mojo dry port bonded clearance, and specialized logistics`.
  3. Click **Update License**.
* **Expected Result:**
  - Success toast: `"Importer license 'KANAB Commercial & EV Division' updated successfully!"`.
  - The updated description is displayed in the table row.

---

#### TC-09: Toggle Importer License Active / Inactive Status
* **Goal:** Verify toggling license active/inactive state.
* **Steps:**
  1. On the row for `KANAB Commercial & EV Division`, click the status toggle button (next to Edit).
* **Expected Result:**
  - Status changes from green `Active` to red `Inactive`.
  - Success toast: `"Importer 'KANAB Commercial & EV Division' is now inactive"`.
  - **ACTIVE REGULATORY LICENSES** KPI decreases by 1.
  2. Click the toggle button again to reactivate it.
* **Expected Result:**
  - Status switches back to green `Active`.

---

### Part C: Procurement Integration — PO License Selection & Print Document

#### TC-10: Create Commercial Purchase Order with Secondary Importer License
* **Goal:** Verify selecting an importer license during PO creation and saving it with the order.
* **Steps:**
  1. Navigate to **Procurement → Purchase Orders**.
  2. Click **+ New Purchase Order**.
  3. In the modal:
     - **Foreign Supplier / Vendor \***: Select any foreign supplier.
     - **Importer License / Division \***: Open the dropdown and select `KANAB Commercial & EV Division (ETH-IEC-EV-77291)`.
     - **Order Currency \***: `USD`.
     - **PO Date \***: Current date.
     - Add 1 line item: select any item, Quantity: `2`, Unit Price: `15000`.
  4. Click **Create Purchase Order**.
* **Expected Result:**
  - Success toast: `"Purchase Order PO-XXXXXX created in DRAFT status"`.
  - The new PO appears at the top of the Purchase Orders list.

---

#### TC-11: Inspect Client-Format PO Document Layout (Box 1 Division & License Snapshot)
* **Goal:** Confirm Box 1 (Importer / Buyer Information) renders KANAB Motors PLC with the designated division license and regulatory codes.
* **Steps:**
  1. Locate the newly created Purchase Order in the table.
  2. Click the **Print / Document** icon (or action) to open the Client-Format PO Document Modal.
  3. Inspect **Box 1 (Top-Left): IMPORTER / BUYER INFORMATION**.
* **Expected Result:**
  - Main Company Header: **KANAB Motors PLC**.
  - Sub-division line: `Importer License: KANAB Commercial & EV Division`.
  - Importer IEC No: **ETH-IEC-EV-77291**.
  - Importer AD Code: **AD-CBE-EV-0012**.
  - Registered address, TIN, and contact details match KANAB Motors PLC.
  - Box 2 correctly displays the Foreign Exporter details.

---

#### TC-12: Delete Importer License Reference Integrity Guard
* **Goal:** Verify that deleting an importer license that is referenced in existing Purchase Orders is strictly blocked by the backend and frontend.
* **Steps:**
  1. Navigate back to **Settings → Company Profile → Importer Licenses** tab.
  2. Locate the row for `KANAB Commercial & EV Division` (which was just used in the PO created in TC-10).
  3. Click the red **Delete (Trash)** icon.
  4. In the browser confirmation dialog (`Are you sure you want to delete importer license 'KANAB Commercial & EV Division'?`), click **OK**.
* **Expected Result:**
  - The deletion is **BLOCKED**.
  - A friendly error toast appears:
    `"Could not delete importer license. It may be referenced by existing purchase orders. Deactivate it instead."`
  - The row remains intact in the table.
  - Existing PO transaction contracts are not broken or orphaned.

---

## 4. Test Execution Sign-Off Log

| Test Case | Description | Tested By | Date | Result (PASS / FAIL) | Notes / Observations |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **TC-01** | Import Requisition Unit Rate Defaults Blank | Admin | 2026-11-23 | **PASS** | Verified in modal: EST. UNIT RATE (USD) starts completely blank with placeholder 0.00 on product selection. |
| **TC-02** | Purchase Order Unit Price Defaults Blank | Admin | 2026-11-23 | **PASS** | Verified in modal: UNIT PRICE (USD) starts blank with placeholder 0.00. Importer License dropdown also visible. |
| **TC-03** | Single Legal Entity KANAB Motors PLC Overview | Admin | 2026-11-23 | **PASS** | Verified single legal entity KANAB Motors PLC maintained centrally; shows Importer shortcut card. |
| **TC-04** | Importer Licenses Tab & KPI Cards | Admin | 2026-11-23 | **PASS** | Verified Importer Licenses tab with KPI cards (Total, Primary Default, Active) and initial default row. |
| **TC-05** | Register New Secondary Importer License | Admin | 2026-11-23 | **PASS** | Successfully registered KANAB Commercial & EV Division (ETH-IEC-EV-77291 / AD-CBE-EV-0012); count incremented to 2. |
| **TC-06** | IEC & AD Code Input Validation | Admin | 2026-11-23 | **PASS** | Format regex validated; invalid chars ('!!') rejected with clear red modal error message. |
| **TC-07** | Designate Primary Default & Verify Legal Profile Sync | Admin | 2026-11-23 | **PASS** | Made secondary importer default; verified Tab 1 credentials automatically synced to ETH-IEC-EV-77291 / AD-CBE-EV-0012, then restored. |
| **TC-08** | Edit Importer License Details & Operational Scope | Admin | 2026-11-23 | **PASS** | Edit modal opened and successfully updated license details with success toast. |
| **TC-09** | Toggle License Active / Inactive Status | Admin | 2026-11-23 | **PASS** | Toggled license between Inactive (KPI reduced to 1) and Active (KPI restored to 2) cleanly. |
| **TC-10** | Create PO with Secondary Importer License | Admin | 2026-11-23 | **PASS** | PO-000019 created specifying KANAB Commercial & EV Division (ETH-IEC-EV-77291). |
| **TC-11** | Verify PO Printout Box 1 Importer Snapshot | Admin | 2026-11-23 | **PASS** | Verified official PO document: Box 1 renders KANAB Motors PLC + Importer License: KANAB Commercial & EV Division + IEC: ETH-IEC-EV-77291 / AD: AD-CBE-EV-0012. |
| **TC-12** | Verify Deletion Guard for Referenced Importer | Admin | 2026-11-23 | **PASS** | Attempted deletion of License #4 blocked with clear error: 'Cannot delete importer #4 because it is referenced in 1 Purchase Order(s). Please deactivate it instead.' |
