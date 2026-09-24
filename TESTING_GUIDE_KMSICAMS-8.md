# Testing Guide: KMSICAMS-8 (Management Dashboard)

## Overview
**KMSICAMS-8** implements the **Management Dashboard** (SRS §8.18) for KANAB Motors SIMS, adhering directly to `kanab_motors_schema_management_dashboard.sql` and the Jira/Confluence specifications across all areas:
1. **Foundational & Parametric Engine** (`F1`–`F5`): Dynamic date-range filters (`Today`, `This Week`, `This Month`, `Custom Range`), real-time SQL functions (`fn_management_dashboard_summary`, `fn_sales_performance_by_product_and_salesperson`), and `READY_FOR_DELIVERY` vehicle metric.
2. **Buildable Management KPIs (6 tiles)** (`K1`–`K6`): Total Sales (period-based), Available Inventory, Reserved Inventory, Vehicles Awaiting Allotment, Vehicles Ready for Delivery, Invoices Count.
3. **Linked Financial & Booking Module KPIs (7 tiles)** (`G1`–`G2`): Real live metrics linking directly to Advance Bookings, Payments & Customer Deposits (BRV), Customer Ledger Debits/Credits, Customer Available Credit, Excess Overpayments, and Refund Settlements.
4. **Sales Performance Cross-Tab** (`F3`): Multi-dimensional Product × Salesperson matrix with CSV export capability.

---

### Implemented SQL Functions & Migration

- **Migration**: `1710700000000-KMSICAMS8ManagementDashboard.ts`
- **Functions**:
  1. `fn_management_dashboard_summary(p_start_date DATE, p_end_date DATE)`
     Returns: `period_start`, `period_end`, `total_sales`, `invoice_count`, `vehicles_available`, `vehicles_reserved`, `pending_allotment_requests`, `vehicles_ready_for_delivery`.
  2. `fn_sales_performance_by_product_and_salesperson(p_start_date DATE, p_end_date DATE)`
     Returns: `salesperson_id`, `salesperson_name`, `item_id`, `item_name`, `model`, `invoice_count`, `units_sold`, `total_sales`.

---

## Step-by-Step UI Verification

### Test 1: Date-Range Parameterization (Story F1)
1. Open the sidebar and click **Executive Dashboard** (under *Executive Intelligence*).
2. Look at the date filter bar at the top right:
   - Click **Today**: Dates update to current date.
   - Click **This Week**: Start date updates to the beginning of the week.
   - Click **This Month**: Start date updates to the 1st of the current month.
   - Click **Custom**: Date pickers appear; choose a custom range and click **Apply**.
3. Verify all 13 KPI cards update dynamically to match the selected period.

---

### Test 2: The 6 Core Period Sales & Fleet Tiles (Story K1–K6, F2)
1. Verify the top section titled **Period Sales & Physical Fleet Inventory**:
   - **Total Period Sales**: Gross revenue for approved invoices within the date range.
   - **Available Inventory**: Real-time count of vehicles in `AVAILABLE_FOR_SALE` status.
   - **Reserved Inventory**: Real-time count of vehicles in `RESERVED` status.
   - **Pending Allotments**: Count of allotment requests in `REQUESTED` status.
   - **Ready for Delivery**: Real-time count of vehicles in `READY_FOR_DELIVERY` status (PDI passed).

---

### Test 3: The 7 Linked Financial & Booking Tiles (Story G1, G2)
1. Verify the section titled **Customer Accounts, Bookings & Financial Ledger KPIs**:
   - **Total Bookings**: Bookings created in the selected period (with `BOOKINGS` badge).
   - **Customer Deposits**: Sum of BRV deposit receipts in period (with `PAYMENTS` badge).
   - **Outstanding Balance**: Total customer net receivables uncollected (with `LEDGER` badge).
   - **Available Credit**: Unallocated customer credit balances (with `CREDIT` badge).
   - **Excess Payments**: Overpayments routed in period (with `EXCESS` badge).
   - **Pending Refunds**: Refund requests awaiting manager payout authorization.
   - **Processed Refunds**: Completed refund settlements.

---

### Test 4: Product × Salesperson Matrix & CSV Export (Story F3)
1. Scroll down to **Sales Performance Matrix: Product × Salesperson**.
2. Confirm the cross-tab displays:
   - **Salesperson**: Full name of assigned salesperson.
   - **Model & Product Item**: Specific model (e.g. `KMT-150`) and description.
   - **Invoices, Units Sold & Total Sales Revenue**.
3. Click **Export Matrix CSV**:
   - Confirm a CSV file named `sales_performance_cross_tab_<start>_to_<end>.csv` downloads immediately with all matching records.

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
    √ should query fn_management_dashboard_summary and linked 7 financial KPIs
    √ should query fn_sales_performance_by_product_and_salesperson cross-tab

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
```
