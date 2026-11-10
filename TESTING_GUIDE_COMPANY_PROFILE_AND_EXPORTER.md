# Testing & Verification Guide: Company Profile, Importer Information & Supplier Exporter Information

This guide walks through testing and validating the **Company Profile Settings**, **Importer Information & Bank Accounts**, and **Supplier Master Exporter Information** in KANAB Motors ERP.

---

## 1. Overview of Implemented Components

| Area | Feature | Components & Endpoints |
|---|---|---|
| **Company Legal Profile** | Central entity profile (Company Name, Trade Name, Reg No, TIN, VAT No, Logo, Address, Contact, Website) | `company_profile` table<br>`GET /api/company-profile`<br>`PUT /api/company-profile/:id`<br>`CompanyProfilePage.tsx` |
| **Importer Information** | Importer IEC No and Importer AD Code | Stored centrally on `company_profile` and auto-populated downstream on Purchase Orders, B/L, and Customs Declarations |
| **Importer Bank Accounts** | Multi-account management with primary default designation, currency support (USD, EUR, ETB), SWIFT & IFSC codes, and transaction deletion protection | `company_bank_account` table<br>`GET/POST/PUT/DELETE /api/company-profile/bank-accounts`<br>`CompanyProfilePage.tsx` (Tab 2) |
| **Supplier Master Extension** | Exporter IEC No and Exporter AD Code on international manufacturer directory | `supplier` table<br>`SuppliersService`<br>`SuppliersPage.tsx` |
| **Downstream Integration** | Automatic linkage of Company Profile, Importer Codes, and Exporter Codes on PO Printouts & Landed Cost | `PurchaseOrdersService.getPOPrintData`<br>`ClientPODocumentModal.tsx` |

---

## 2. Step-by-Step Test Scenarios

### Test 1: Manage Company Legal & Importer Profile
1. Log in to KANAB Motors ERP.
2. In the sidebar, scroll down to the **System Governance & Settings** section and click **Company & Importer Profile** (`/settings` or tab `company-profile`).
3. Verify that the current company details load:
   - **Company Name:** `KANAB Motors PLC`
   - **Trading Name:** `KANAB Motors Ethiopia`
   - **Registration No:** `MOT/AA/01/2020/00491`
   - **TIN:** `TIN-0092837461`
   - **VAT Registration No:** `VAT-ET-99018274`
   - **Importer IEC No:** `ETH-IEC-994821`
   - **Importer AD Code:** `AD-CBE-0019284`
4. Update any field (for example, edit the Email to `procurement@kanabmotors.com` or update the website URL).
5. Click **Save Profile Changes** in the top right.
6. Observe the green confirmation toast: *"Company Profile & Importer settings saved successfully!"*.
7. Refresh the page and confirm the changes persisted.

---

### Test 2: Importer Bank Details & Default Account Designation
1. On the **Company Profile** page, click the second tab: **Importer Bank Accounts**.
2. Notice the summary KPI cards:
   - **Total Bank Accounts**
   - **Default Settlement Account**
   - **Active Forex Accounts**
3. Review the seeded accounts:
   - *Commercial Bank of Ethiopia* (USD Forex) — Marked with green badge **PRIMARY DEFAULT**
   - *Dashen Bank SC* (EUR Forex)
   - *Awash International Bank* (ETB Main)
4. Click **+ Add Bank Account**.
5. Fill in the modal:
   - Account Holder Name: `KANAB MOTORS PLC - CNY ESCROW`
   - Bank Name: `Bank of China (Djibouti / Addis Rep Office)`
   - Currency: `CNY (Chinese Yuan)`
   - Account Number: `992837461029`
   - Branch: `Regional Trade Corridor Branch`
   - SWIFT Code: `BKCHETAA`
   - Check: `Account Active`
6. Click **Add Bank Account**.
7. Confirm that the new account appears in the table with active status.
8. Click **Make Default** on another account (e.g., Dashen Bank EUR Forex):
   - Confirm that Dashen Bank becomes the new **PRIMARY DEFAULT** and CBE unsets cleanly (guaranteeing only one active default per company).

---

### Test 3: Bank Account Deletion Protection (Integrity Guard)
1. On an active bank account referenced by existing Purchase Orders (e.g. Account #1):
2. Click the **Delete** (trash icon) button and confirm.
3. Observe the system integrity block:
   - The system intercepts the hard delete and alerts: *"Cannot delete bank account #1 because it is referenced by Purchase Order transaction(s). Please deactivate it instead."*
4. Click the **Deactivate** toggle switch:
   - The account status toggles to `Inactive` badge, preventing selection in future POs while preserving historical transaction references.

---

### Test 4: Supplier Master – Exporter Information (IEC & AD Code)
1. Navigate to **Procurement & Logistics → Suppliers Master Data** (`/suppliers`).
2. Click **+ Register Supplier**.
3. Fill in the basic info:
   - Company Name: `Shanghai Auto Industrial Export Corp`
   - Country: `China`
   - Contact Person: `Zhang Wei`
   - Phone: `+86 21 8899 4433`
   - Email: `export@saic-intl.com`
4. In the new **Exporter Regulatory Information (POX-02)** section, fill in:
   - **Exporter IEC No:** `EXP-CN-884920`
   - **Exporter AD Code:** `AD-BOC-SH-091`
5. Click **Register Supplier**.
6. Verify in the Suppliers directory table:
   - The supplier row displays badges: `IEC: EXP-CN-884920` and `AD: AD-BOC-SH-091`.
7. Test the search filter by typing `EXP-CN-884920` — confirm the supplier matches and filters accurately.

---

### Test 5: Downstream Purchase Order Integration
1. Navigate to **Procurement & Logistics → Purchase Orders** (`/purchase-orders`).
2. Open any existing confirmed PO or click **Print Client PO** (`Printer` icon).
3. In the official PO document viewer:
   - **Box 1 (Importer / Buyer):** Confirms KANAB Motors PLC legal name, Importer IEC No (`ETH-IEC-994821`), Importer AD Code (`AD-CBE-0019284`), TIN, address, and contact details from the central Company Profile.
   - **Box 2 (Exporter / Manufacturer):** Confirms supplier name, Exporter IEC No, Exporter AD Code, and country.
   - **Bank Remittance Snapshot:** Confirms the selected Importer Bank Account details.

