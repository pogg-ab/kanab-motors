# Testing Guide: KMSICAMS-7 (Dashboard and Reporting)

## Overview
**KMSICAMS-7** implements the enterprise **Dashboard and Reporting** module for KANAB Motors SIMS, adhering directly to `kanab_motors_schema_dashboard_reporting.sql` and the Jira/Confluence specifications across the 6 core functional areas:
1. **Foundational Reporting Infrastructure** (`F1`–`F3`)
2. **Sales Reports** (`SR1`–`SR7`)
3. **Customer Financial Reports** (`CF1`–`CF5`)
4. **Inventory & Fleet Reports** (`IR1`–`IR5`)
5. **Operational Reports** (`OR1`–`OR8`)
6. **Executive Dashboard Summary** (`DB1`–`DB4`)

---

### Architecture & Implemented Components

| Area | Features & Views | Description |
|---|---|---|
| **Executive Dashboard** (`DB1`–`DB4`) | `vw_dashboard_summary` + Live Financial Metrics | Real-time overview of Today's Sales, Units Sold, Available Fleet, Reserved, Allotted, Invoiced, Delivered, Pending Approvals, Pending Allotments, and Net Receivables. |
| **Sales Reports** (`SR1`–`SR7`) | `vw_daily_sales_report`, `vw_monthly_sales_report`, `vw_sales_by_vehicle_type`, `vw_sales_by_model`, `vw_sales_by_customer`, `vw_sales_by_region`, `vw_sales_by_customer_type`, `vw_sales_by_salesperson` | Multi-dimensional sales analysis filtered strictly to `APPROVED` invoices. Retroactive `salesperson_id` support on `sales_invoice`. |
| **Operational Reports** (`OR1`–`OR8`) | `vw_invoice_report`, `vw_delivery_report`, Enquiries Pipeline, Bookings Queue | Operational status audit, delivery handovers, customer invoice settlements, and pipeline conversion metrics. |
| **Inventory Reports** (`IR1`–`IR5`) | `vw_current_stock_balance`, `vw_vehicle_inventory_by_status` | Warehouse stock balances, physical VIN tracking by status, and low-stock reorder point monitoring. |
| **Financial Reports** (`CF1`–`CF5`) | Customer Financial Ledger & Receivables Summary | Real-time net receivables per customer calculated dynamically from double-entry ledger debits and cash collection credits. |
| **Foundational Exports** (`F1`, `F2`) | CSV & Spreadsheet Export Engine | Built-in single-click CSV export utility across every report table. |

---

## Prerequisites & Access
- **Backend API**: `http://localhost:3000/api/reports`
- **Frontend URL**: `http://localhost:5173`
- **Navigation**:
  - **Executive Dashboard**: Top item in Sidebar (`Executive Dashboard`)
  - **Reports & Analytics Hub**: Top item in Sidebar (`Reports & Analytics Hub`)

---

## Step-by-Step Test Scenarios

### Test 1: Executive Dashboard Live Metrics (Story DB1, DB2, DB3)
1. Open the sidebar and click **Executive Dashboard**.
2. Verify the 4 top Hero KPI Cards render with live database metrics:
   - **Today's Approved Sales**: Live total gross revenue of invoices approved today.
   - **Vehicles Available for Sale**: Count of physical units ready in inventory.
   - **Pending Approvals**: Count of items waiting in central approval queue.
   - **Net Customer Receivables**: Total ledger debits less collections.
3. Review the **Fleet Lifecycle Distribution** progress bar:
   - Displays percentage and counts for: `AVAILABLE FOR SALE`, `RESERVED`, `ALLOTTED`, `SOLD`, and `DELIVERED`.
4. Click any quick shortcut button (e.g. *Vehicle Allotments*, *Approval Queue*, or *Inventory*) to confirm quick routing.

---

### Test 2: Sales Reports Multi-Dimensional Analysis (Story SR1–SR7)
1. Click **Reports & Analytics Hub** in the sidebar.
2. Under the **Sales Reports** tab, test the sub-views:
   - **Daily Sales**: Displays daily sales date, invoice counts, units sold, and gross revenue.
   - **Monthly Trend**: Aggregated revenue grouped by month.
   - **By Vehicle Model**: Breakdown by model (e.g. `KMT-150`) and product name.
   - **By Category**: Grouped by motorcycle, three-wheeler, or spare parts.
   - **By Customer**: Top customers by revenue.
   - **By Region**: Revenue distribution across Addis Ababa, Oromia, etc.
   - **By Salesperson**: Performance by salesperson account.
3. Click the **Export CSV** button in any view:
   - Confirm a clean `.csv` file downloads immediately with all matching table records.

---

### Test 3: Operational Invoices & Deliveries Reports (Story OR1–OR8)
1. Switch to the **Operational Reports** tab.
2. Select **Sales Invoices Report (OR1)**:
   - Displays invoice number, customer, product, chassis number, gross total, and outstanding balance.
3. Select **Vehicle Deliveries Report (OR2)**:
   - Displays delivery number, customer, VIN, engine number, responsible employee, and delivery date.
4. Select **Enquiries Pipeline (OR4)** and **Bookings Queue (OR5)**:
   - Displays conversion pipelines and deposits collected.

---

### Test 4: Inventory & Financial Reports (Story IR1–IR5, CF1–CF5)
1. Switch to **Inventory & Fleet Reports**:
   - Verify warehouse on-hand, reserved, and available stock levels.
2. Switch to **Customer Financial Reports**:
   - Verify customer total debited, total credited, and net receivable balance.

---

## Automated Verification
Run backend unit tests:
```bash
npm test -- src/modules/reports/reports.service.spec.ts
```
Expected output:
```
PASS src/modules/reports/reports.service.spec.ts
  ReportsService (KMSICAMS-7 Dashboard and Reporting)
    √ should get dashboard summary with real-time sales and fleet distribution
    √ should query daily sales report with optional date filtering
    √ should query sales breakdowns: vehicle type, model, customer, region, salesperson
    √ should query operational reports: invoices and deliveries
    √ should query pipeline reports for enquiries and bookings
    √ should query customer financial summary with debit/credit receivables

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
```
