-- =====================================================================
-- KANAB Motors — Integrated Sales, Inventory and Customer Account
-- Management System
-- PostgreSQL schema: Management Dashboard (SRS §8.18)
--
-- DEPENDS ON all six prior schema files having been applied.
--
-- WHY FUNCTIONS, NOT VIEWS:
-- The implementation plan calls for date-range parameterization (today /
-- week / month / custom), and a plain SQL view can't accept parameters.
-- Both objects below are SQL-callable functions returning a table, so the
-- caller passes a start/end date directly rather than needing a family of
-- near-duplicate views (vw_dashboard_today, vw_dashboard_this_week, ...).
--
-- WHAT THIS FILE DELIBERATELY DOES NOT CONTAIN:
-- Per the implementation plan, 7 of the 13 requested KPIs (total
-- bookings, total customer deposits, outstanding customer balances,
-- customer credit balances, excess payments, pending refunds, processed
-- refunds) need Booking, Deposit/Payment, Customer Ledger, Excess
-- Payment/Credit, or Refund — none of which exist. There is intentionally
-- no schema here for any of them, and no placeholder columns returning
-- zero. Building those into a single-screen dashboard alongside real
-- numbers, with no visual distinction, would be worse than not showing
-- them at all — see the plan's structural note.
--
-- HANDOFF NOTE for whoever builds the blocked modules later — wire these
-- in as separate, clearly-flagged columns/tiles, not folded silently into
-- the functions below:
--   - total_bookings              <- needs Booking
--   - total_customer_deposits     <- needs Customer Deposit/Payment
--   - outstanding_customer_balance <- needs Customer Ledger
--   - customer_credit_balance     <- needs Excess Payment/Credit
--   - excess_payments             <- needs Excess Payment/Credit
--   - pending_refunds             <- needs Refund
--   - processed_refunds           <- needs Refund
--
-- ON REAL-TIME REFRESH (F5 in the plan): both functions below compute
-- directly from live tables on every call, giving genuinely real-time
-- results at the cost of recomputing each time. If data volume grows to
-- where that's too slow, converting either into a materialized view with
-- a scheduled refresh (e.g. via pg_cron) is a straightforward upgrade —
-- not attempted here since there's no signal yet that it's needed.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Core summary: period-scoped sales alongside point-in-time inventory
-- counts. Sales are filtered by the given date range; inventory counts
-- are always "right now" regardless of the range, since a stock level is
-- inherently a snapshot, not something that happened "during" a period.
--
-- "Vehicles awaiting allotment" (Open Question 1 in the plan) is
-- deliberately exposed as TWO distinct columns rather than one, since the
-- two readings are genuinely different facts:
--   - vehicles_reserved: vehicle_unit rows sitting in RESERVED status
--   - pending_allotment_requests: allotment records not yet approved
-- =====================================================================
CREATE OR REPLACE FUNCTION fn_management_dashboard_summary(
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_end_date   DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    period_start                DATE,
    period_end                  DATE,
    total_sales                 NUMERIC(18,2),
    invoice_count                BIGINT,
    vehicles_available           BIGINT,
    vehicles_reserved            BIGINT,
    pending_allotment_requests   BIGINT,
    vehicles_ready_for_delivery  BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p_start_date,
        p_end_date,
        COALESCE((
            SELECT SUM(gross_total) FROM sales_invoice
            WHERE status = 'APPROVED' AND created_at::date BETWEEN p_start_date AND p_end_date
        ), 0::NUMERIC(18,2)),
        (SELECT COUNT(*) FROM sales_invoice
            WHERE status = 'APPROVED' AND created_at::date BETWEEN p_start_date AND p_end_date),
        (SELECT COUNT(*) FROM vehicle_unit WHERE current_status = 'AVAILABLE_FOR_SALE'),
        (SELECT COUNT(*) FROM vehicle_unit WHERE current_status = 'RESERVED'),
        (SELECT COUNT(*) FROM allotment WHERE status = 'REQUESTED'),
        (SELECT COUNT(*) FROM vehicle_unit WHERE current_status = 'READY_FOR_DELIVERY');
END;
$$ LANGUAGE plpgsql STABLE;

-- ---------------------------------------------------------------------
-- Sales performance by product AND salesperson together (F3 in the
-- plan) -- genuinely new, since the existing vw_sales_by_model and
-- vw_sales_by_salesperson (from the prior Dashboard/Reporting schema)
-- are each only one-dimensional. Each returned row is one
-- salesperson/product combination, forming a cross-tab the UI can
-- render as a matrix or a sortable/filterable table.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_sales_performance_by_product_and_salesperson(
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_end_date   DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    salesperson_id    INT,
    salesperson_name  VARCHAR(200),
    item_id           BIGINT,
    item_name         VARCHAR(200),
    model             VARCHAR(100),
    invoice_count     BIGINT,
    units_sold        NUMERIC(12,2),
    total_sales       NUMERIC(18,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.user_id, u.full_name,
        pi.item_id, pi.item_name, pi.model,
        COUNT(*),
        SUM(si.quantity),
        SUM(si.gross_total)
    FROM sales_invoice si
    JOIN app_user u ON u.user_id = si.salesperson_id
    JOIN product_item pi ON pi.item_id = si.item_id
    WHERE si.status = 'APPROVED' AND si.created_at::date BETWEEN p_start_date AND p_end_date
    GROUP BY u.user_id, u.full_name, pi.item_id, pi.item_name, pi.model
    ORDER BY SUM(si.gross_total) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMIT;
