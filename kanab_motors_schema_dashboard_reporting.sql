-- =====================================================================
-- KANAB Motors — Integrated Sales, Inventory and Customer Account
-- Management System
-- PostgreSQL schema: Dashboard and Reporting
--
-- DEPENDS ON all five prior schema files having been applied.
--
-- WHY THIS FILE IS SMALL:
-- Per the implementation plan, most of this module's 32 requested
-- reports are either already served by views built in earlier modules
-- (Inventory Reports: vw_current_stock_balance, vw_vehicle_inventory_by_
-- status, vw_stock_movement_history — nothing new needed there at all),
-- or are straightforward views over sales_invoice/delivery, which are
-- real tables. This file adds exactly one retroactive column and a set
-- of new views. It deliberately contains NOTHING for:
--   - Customer Financial Reports (11 reports) — Ledger, Payment, Excess
--     Payment/Credit, and Refund don't exist. A view here would just
--     return zeros, and per the plan's recommendation, a report that
--     silently shows zero is worse than no report at all.
--   - Sales Enquiry report, Booking report, Cancelled Booking report —
--     same reasoning; Sales Enquiry and Booking don't exist.
-- If you're looking for schema covering those, there isn't any here on
-- purpose — see the implementation plan's structural note.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Retroactive: sales_invoice has no salesperson field today. Needed to
-- unblock "Sales by salesperson" (SR1 in the plan).
-- ---------------------------------------------------------------------
ALTER TABLE sales_invoice ADD COLUMN salesperson_id INT REFERENCES app_user(user_id);


-- =====================================================================
-- SALES REPORTS
-- All filtered to APPROVED invoices only -- draft/rejected invoices
-- aren't "sales" yet.
-- =====================================================================

CREATE VIEW vw_daily_sales_report AS
SELECT
    created_at::date AS sales_date,
    COUNT(*) AS invoice_count,
    SUM(quantity) AS units_sold,
    SUM(gross_total) AS total_sales
FROM sales_invoice
WHERE status = 'APPROVED'
GROUP BY created_at::date
ORDER BY sales_date DESC;

CREATE VIEW vw_monthly_sales_report AS
SELECT
    DATE_TRUNC('month', created_at)::date AS sales_month,
    COUNT(*) AS invoice_count,
    SUM(quantity) AS units_sold,
    SUM(gross_total) AS total_sales
FROM sales_invoice
WHERE status = 'APPROVED'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY sales_month DESC;

CREATE VIEW vw_sales_by_vehicle_type AS
SELECT
    pc.category_name,
    COUNT(*) AS invoice_count,
    SUM(si.quantity) AS units_sold,
    SUM(si.gross_total) AS total_sales
FROM sales_invoice si
JOIN product_item pi ON pi.item_id = si.item_id
JOIN product_category pc ON pc.category_id = pi.category_id
WHERE si.status = 'APPROVED'
GROUP BY pc.category_name;

CREATE VIEW vw_sales_by_model AS
SELECT
    pi.model,
    pi.item_name,
    COUNT(*) AS invoice_count,
    SUM(si.quantity) AS units_sold,
    SUM(si.gross_total) AS total_sales
FROM sales_invoice si
JOIN product_item pi ON pi.item_id = si.item_id
WHERE si.status = 'APPROVED'
GROUP BY pi.model, pi.item_name;

CREATE VIEW vw_sales_by_customer AS
SELECT
    c.customer_id, c.customer_code, c.full_name,
    COUNT(*) AS invoice_count,
    SUM(si.gross_total) AS total_sales
FROM sales_invoice si
JOIN customer c ON c.customer_id = si.customer_id
WHERE si.status = 'APPROVED'
GROUP BY c.customer_id, c.customer_code, c.full_name;

CREATE VIEW vw_sales_by_region AS
SELECT
    r.region_name,
    COUNT(*) AS invoice_count,
    SUM(si.gross_total) AS total_sales
FROM sales_invoice si
JOIN customer c ON c.customer_id = si.customer_id
LEFT JOIN region r ON r.region_id = c.region_id
WHERE si.status = 'APPROVED'
GROUP BY r.region_name;

CREATE VIEW vw_sales_by_customer_type AS
SELECT
    c.customer_type,
    COUNT(*) AS invoice_count,
    SUM(si.gross_total) AS total_sales
FROM sales_invoice si
JOIN customer c ON c.customer_id = si.customer_id
WHERE si.status = 'APPROVED'
GROUP BY c.customer_type;

CREATE VIEW vw_sales_by_salesperson AS
SELECT
    u.user_id AS salesperson_id, u.full_name AS salesperson_name,
    COUNT(*) AS invoice_count,
    SUM(si.gross_total) AS total_sales
FROM sales_invoice si
JOIN app_user u ON u.user_id = si.salesperson_id
WHERE si.status = 'APPROVED'
GROUP BY u.user_id, u.full_name;


-- =====================================================================
-- OPERATIONAL REPORTS (buildable subset only)
-- =====================================================================

CREATE VIEW vw_invoice_report AS
SELECT
    si.invoice_id, si.invoice_number, si.status, si.created_at,
    c.customer_code, c.full_name AS customer_name,
    pi.item_name, vu.chassis_number,
    si.quantity, si.unit_price, si.vat_amount, si.gross_total, si.outstanding_balance
FROM sales_invoice si
JOIN customer c ON c.customer_id = si.customer_id
JOIN product_item pi ON pi.item_id = si.item_id
LEFT JOIN vehicle_unit vu ON vu.vehicle_unit_id = si.vehicle_unit_id;

-- delivery has no direct customer_id (it only has a provisional
-- booking_id) -- this joins through sales_invoice via vehicle_unit_id as
-- a pragmatic stand-in for the real Booking-based link that will exist
-- once Booking is built. Assumes one approved invoice per vehicle unit;
-- revisit if that assumption ever breaks.
CREATE VIEW vw_delivery_report AS
SELECT
    d.delivery_id, d.delivery_number, d.status, d.delivery_date, d.delivered_at,
    vu.chassis_number, vu.engine_number,
    emp.full_name AS responsible_employee,
    si.invoice_number, c.full_name AS customer_name
FROM delivery d
JOIN vehicle_unit vu ON vu.vehicle_unit_id = d.vehicle_unit_id
LEFT JOIN app_user emp ON emp.user_id = d.responsible_employee
LEFT JOIN sales_invoice si ON si.vehicle_unit_id = d.vehicle_unit_id AND si.status = 'APPROVED'
LEFT JOIN customer c ON c.customer_id = si.customer_id;

-- Vehicle Allotment report: no new view needed -- vw_allotment_history
-- and vw_pending_allotments (built in the Vehicle Allotment module)
-- already cover this; OR3 in the plan is UI/export polish only.


-- =====================================================================
-- DASHBOARD (real data only — see structural note at top)
-- =====================================================================

CREATE VIEW vw_dashboard_summary AS
SELECT
    (SELECT COALESCE(SUM(gross_total), 0) FROM sales_invoice
        WHERE status = 'APPROVED' AND created_at::date = CURRENT_DATE) AS todays_sales,
    (SELECT COUNT(*) FROM sales_invoice
        WHERE status = 'APPROVED' AND created_at::date = CURRENT_DATE) AS todays_invoice_count,
    (SELECT COUNT(*) FROM vehicle_unit WHERE current_status = 'AVAILABLE_FOR_SALE') AS vehicles_available,
    (SELECT COUNT(*) FROM vehicle_unit WHERE current_status = 'RESERVED') AS vehicles_reserved,
    (SELECT COUNT(*) FROM vehicle_unit WHERE current_status = 'ALLOTTED') AS vehicles_allotted,
    (SELECT COUNT(*) FROM vehicle_unit WHERE current_status = 'SOLD') AS vehicles_sold,
    (SELECT COUNT(*) FROM vehicle_unit WHERE current_status = 'DELIVERED') AS vehicles_delivered,
    (SELECT COUNT(*) FROM approval_request WHERE status = 'PENDING') AS pending_approvals,
    (SELECT COUNT(*) FROM allotment WHERE status = 'REQUESTED') AS pending_allotments;
    -- Deliberately no "outstanding customer balances" / "pending refunds"
    -- columns here -- those need Ledger/Refund. The application layer
    -- should render those sections as "Pending — Customer Ledger module"
    -- (per DB2 in the implementation plan), not query for a number that
    -- doesn't exist yet.

COMMIT;
