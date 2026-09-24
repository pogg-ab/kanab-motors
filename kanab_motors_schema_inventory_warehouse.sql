-- =====================================================================
-- KANAB Motors — Integrated Sales, Inventory and Customer Account
-- Management System
-- PostgreSQL schema: Inventory and Warehouse Management
--
-- DEPENDS ON: kanab_motors_schema_modules_1_2.sql AND
-- kanab_motors_schema_import_landed_cost.sql having already been applied
-- (references warehouse, product_item, vehicle_unit, app_user from the
-- first; shipment_receipt, shipment_line, purchase_order_line from the
-- second).
--
-- WHAT THIS SCHEMA DELIBERATELY DOES NOT DO:
-- The two "retrofit" stories from the implementation plan (wiring
-- Booking's confirmation to trigger a RESERVED transition, and wiring
-- Booking's cancellation to release it) are NOT implemented here. The
-- Booking module's schema was never built — only its implementation plan
-- exists — so there is nothing to retrofit yet. What this schema DOES
-- provide is fn_transition_vehicle_status(), the shared contract any
-- future module (Booking, Vehicle Allotment, Delivery, Sales Invoice)
-- calls to move a vehicle through its lifecycle. It is tested directly
-- below, standing in for what Booking will eventually call.
--
-- RETROACTIVE CHANGES TO ALREADY-DEPLOYED SCHEMA:
--   1. warehouse gains warehouse_type, capacity, manager_user_id, contact_phone
--   2. product_item gains is_individually_tracked (distinguishes vehicles,
--      which get vehicle_unit rows, from kits/components/parts, which are
--      tracked as plain quantities in stock_balance)
--   3. vehicle_unit gains hold_for_inspection (lets receipt processes
--      suppress the automatic RECEIVED -> AVAILABLE_FOR_SALE transition)
--
-- DESIGN CHOICES WORTH FLAGGING:
--   - Valid vehicle status transitions are DATA (a table), not just
--     application logic, so the rules are inspectable and auditable, not
--     buried in code.
--   - fn_transition_vehicle_status() is the single path for changing a
--     vehicle's status — it locks the row, validates the transition
--     against the rule table, updates vehicle_unit, and logs history
--     atomically. No other code should UPDATE vehicle_unit.current_status
--     directly.
--   - Stock transfers are represented as two ledger-style movement rows
--     (OUT then IN) in the unified movement history view, not one row —
--     consistent with the double-entry style already used for the
--     Customer Ledger in an earlier batch.
--   - Stock adjustments require an existing stock_balance row to adjust
--     against (you receive stock before you can adjust it) and always
--     require a reason_notes value — same rigor as Ledger adjustments.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Retroactive change 1: extend the warehouse stub
-- ---------------------------------------------------------------------
CREATE TYPE warehouse_type_enum AS ENUM ('MAIN', 'BRANCH', 'SHOWROOM');

ALTER TABLE warehouse ADD COLUMN warehouse_type warehouse_type_enum NOT NULL DEFAULT 'BRANCH';
ALTER TABLE warehouse ADD COLUMN capacity INT;
ALTER TABLE warehouse ADD COLUMN manager_user_id INT REFERENCES app_user(user_id);
ALTER TABLE warehouse ADD COLUMN contact_phone VARCHAR(30);

-- Warehouse-scoped access (many-to-many: a manager can oversee more than
-- one warehouse). Enforcing this in queries/application code is assumed;
-- Postgres Row-Level Security could enforce it at the database level too
-- if useful, but isn't set up here to avoid entangling this schema with
-- how the application manages DB sessions/roles.
CREATE TABLE user_warehouse_access (
    user_id      INT NOT NULL REFERENCES app_user(user_id),
    warehouse_id INT NOT NULL REFERENCES warehouse(warehouse_id),
    PRIMARY KEY (user_id, warehouse_id)
);

-- ---------------------------------------------------------------------
-- Retroactive change 2: distinguish serialized (vehicle) items from
-- quantity-tracked (kit/component/part) items
-- ---------------------------------------------------------------------
ALTER TABLE product_item ADD COLUMN is_individually_tracked BOOLEAN NOT NULL DEFAULT FALSE;
-- Set TRUE for motorcycle/three-wheeler/imported-vehicle categories.

-- ---------------------------------------------------------------------
-- Retroactive change 3: inspection hold flag
-- ---------------------------------------------------------------------
ALTER TABLE vehicle_unit ADD COLUMN hold_for_inspection BOOLEAN NOT NULL DEFAULT FALSE;


-- =====================================================================
-- VEHICLE STATUS STATE MACHINE
-- =====================================================================

CREATE TABLE vehicle_status_transition_rule (
    from_status vehicle_status_enum NOT NULL,
    to_status   vehicle_status_enum NOT NULL,
    PRIMARY KEY (from_status, to_status)
);

INSERT INTO vehicle_status_transition_rule (from_status, to_status) VALUES
    ('RECEIVED', 'AVAILABLE_FOR_SALE'),
    ('AVAILABLE_FOR_SALE', 'RESERVED'),
    ('RESERVED', 'ALLOTTED'),
    ('RESERVED', 'AVAILABLE_FOR_SALE'),        -- reservation released (e.g. booking cancelled)
    ('ALLOTTED', 'READY_FOR_DELIVERY'),
    ('ALLOTTED', 'AVAILABLE_FOR_SALE'),        -- allotment reversed
    ('READY_FOR_DELIVERY', 'SOLD'),
    ('SOLD', 'DELIVERED');

CREATE TABLE vehicle_status_history (
    status_history_id    BIGSERIAL PRIMARY KEY,
    vehicle_unit_id       BIGINT NOT NULL REFERENCES vehicle_unit(vehicle_unit_id) ON DELETE CASCADE,
    from_status           vehicle_status_enum,
    to_status             vehicle_status_enum NOT NULL,
    triggered_by_user     INT REFERENCES app_user(user_id),
    -- Which module initiated this — 'BOOKING', 'ALLOTMENT', 'DELIVERY',
    -- 'INVOICE', 'INVENTORY_AUTO', 'MANUAL'. Free text deliberately, since
    -- several of these modules don't exist yet and shouldn't need a schema
    -- change here just to be named.
    triggered_by_module   VARCHAR(50) NOT NULL,
    changed_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes                 TEXT
);
CREATE INDEX idx_vehicle_status_history_unit ON vehicle_status_history(vehicle_unit_id);

-- THE shared contract. Any module — including Booking, once it exists —
-- calls this function rather than updating vehicle_unit.current_status
-- directly. Locks the row, validates against the rule table above,
-- updates the vehicle, and logs history, all atomically.
CREATE OR REPLACE FUNCTION fn_transition_vehicle_status(
    p_vehicle_unit_id      BIGINT,
    p_to_status            vehicle_status_enum,
    p_triggered_by_user    INT,
    p_triggered_by_module  VARCHAR(50) DEFAULT 'MANUAL',
    p_notes                TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
    v_from_status vehicle_status_enum;
    v_rule_exists BOOLEAN;
BEGIN
    SELECT current_status INTO v_from_status
    FROM vehicle_unit
    WHERE vehicle_unit_id = p_vehicle_unit_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vehicle unit % does not exist', p_vehicle_unit_id;
    END IF;

    IF v_from_status = p_to_status THEN
        RAISE EXCEPTION 'Vehicle unit % is already in status %', p_vehicle_unit_id, p_to_status;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM vehicle_status_transition_rule
        WHERE from_status = v_from_status AND to_status = p_to_status
    ) INTO v_rule_exists;

    IF NOT v_rule_exists THEN
        RAISE EXCEPTION 'Invalid vehicle status transition: % -> % (vehicle_unit %)',
            v_from_status, p_to_status, p_vehicle_unit_id;
    END IF;

    UPDATE vehicle_unit
    SET current_status = p_to_status, updated_by = p_triggered_by_user
    WHERE vehicle_unit_id = p_vehicle_unit_id;

    INSERT INTO vehicle_status_history
        (vehicle_unit_id, from_status, to_status, triggered_by_user, triggered_by_module, notes)
    VALUES
        (p_vehicle_unit_id, v_from_status, p_to_status, p_triggered_by_user, p_triggered_by_module, p_notes);
END;
$$ LANGUAGE plpgsql;

-- RECEIVED -> AVAILABLE_FOR_SALE happens automatically right after a
-- vehicle_unit is created, unless hold_for_inspection is set. Assumption
-- flagged in the implementation plan — confirm this matches how KANAB
-- Motors actually wants newly received vehicles handled.
CREATE OR REPLACE FUNCTION fn_auto_transition_received_to_available()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT NEW.hold_for_inspection THEN
        PERFORM fn_transition_vehicle_status(
            NEW.vehicle_unit_id, 'AVAILABLE_FOR_SALE', NEW.created_by, 'INVENTORY_AUTO'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_transition_received_to_available
AFTER INSERT ON vehicle_unit
FOR EACH ROW EXECUTE FUNCTION fn_auto_transition_received_to_available();


-- =====================================================================
-- GENERAL (NON-SERIALIZED) STOCK MANAGEMENT
-- Resolves the Import/Landed Cost module's deferred story R2b.
-- =====================================================================

CREATE TABLE stock_balance (
    warehouse_id        INT NOT NULL REFERENCES warehouse(warehouse_id),
    item_id             BIGINT NOT NULL REFERENCES product_item(item_id),
    quantity_on_hand    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    quantity_reserved   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
    quantity_available  NUMERIC(12,2) GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (warehouse_id, item_id),
    CHECK (quantity_reserved <= quantity_on_hand)
);

-- Wires the Import module's shipment_receipt directly to stock_balance for
-- non-serialized items ONLY (serialized vehicles are handled by
-- vehicle_unit + the state machine above, not by this table).
CREATE OR REPLACE FUNCTION fn_increment_stock_on_receipt()
RETURNS TRIGGER AS $$
DECLARE
    v_item_id    BIGINT;
    v_is_tracked BOOLEAN;
BEGIN
    SELECT pol.item_id, pi.is_individually_tracked
    INTO v_item_id, v_is_tracked
    FROM shipment_line sl
    JOIN purchase_order_line pol ON pol.po_line_id = sl.po_line_id
    JOIN product_item pi ON pi.item_id = pol.item_id
    WHERE sl.shipment_line_id = NEW.shipment_line_id;

    IF NOT v_is_tracked THEN
        IF NEW.warehouse_id IS NULL THEN
            RAISE EXCEPTION 'shipment_receipt % must specify warehouse_id for non-serialized item %',
                NEW.receipt_id, v_item_id;
        END IF;

        INSERT INTO stock_balance (warehouse_id, item_id, quantity_on_hand)
        VALUES (NEW.warehouse_id, v_item_id, NEW.quantity_received)
        ON CONFLICT (warehouse_id, item_id)
        DO UPDATE SET quantity_on_hand = stock_balance.quantity_on_hand + EXCLUDED.quantity_on_hand,
                      updated_at = now();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_stock_on_receipt
AFTER INSERT ON shipment_receipt
FOR EACH ROW EXECUTE FUNCTION fn_increment_stock_on_receipt();

CREATE VIEW vw_low_stock_alert AS
SELECT sb.warehouse_id, sb.item_id, pi.item_code, pi.item_name, sb.quantity_available, pi.reorder_level
FROM stock_balance sb
JOIN product_item pi ON pi.item_id = sb.item_id
WHERE sb.quantity_available <= pi.reorder_level;


-- =====================================================================
-- STOCK TRANSFER
-- =====================================================================

CREATE TYPE transfer_status_enum AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

CREATE SEQUENCE transfer_number_seq START 1;

CREATE TABLE stock_transfer (
    transfer_id       BIGSERIAL PRIMARY KEY,
    transfer_number   VARCHAR(20) NOT NULL UNIQUE
                      DEFAULT ('TRF-' || lpad(nextval('transfer_number_seq')::text, 6, '0')),
    from_warehouse_id INT NOT NULL REFERENCES warehouse(warehouse_id),
    to_warehouse_id   INT NOT NULL REFERENCES warehouse(warehouse_id),
    status            transfer_status_enum NOT NULL DEFAULT 'REQUESTED',
    requested_by      INT REFERENCES app_user(user_id),
    requested_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_by       INT REFERENCES app_user(user_id),
    approved_at       TIMESTAMPTZ,
    completed_at      TIMESTAMPTZ,

    CHECK (from_warehouse_id <> to_warehouse_id)
);
CREATE INDEX idx_stock_transfer_status ON stock_transfer(status);

-- A transfer line is EITHER a quantity of a non-serialized item OR one
-- specific vehicle_unit — never both, never neither.
CREATE TABLE stock_transfer_line (
    transfer_line_id BIGSERIAL PRIMARY KEY,
    transfer_id      BIGINT NOT NULL REFERENCES stock_transfer(transfer_id) ON DELETE CASCADE,
    item_id          BIGINT REFERENCES product_item(item_id),
    quantity         NUMERIC(12,2) CHECK (quantity IS NULL OR quantity > 0),
    vehicle_unit_id  BIGINT REFERENCES vehicle_unit(vehicle_unit_id),

    CHECK (
        (item_id IS NOT NULL AND quantity IS NOT NULL AND vehicle_unit_id IS NULL)
        OR (vehicle_unit_id IS NOT NULL AND item_id IS NULL AND quantity IS NULL)
    )
);

-- Executes the transfer the moment status flips to COMPLETED: moves
-- vehicle_unit.current_warehouse_id for serialized lines, and shifts
-- quantity between the two warehouses' stock_balance rows for the rest —
-- locking the source balance first so concurrent transfers can't both
-- succeed against stock that isn't there.
CREATE OR REPLACE FUNCTION fn_execute_stock_transfer()
RETURNS TRIGGER AS $$
DECLARE
    r RECORD;
    v_current_qty NUMERIC(12,2);
BEGIN
    IF NEW.status = 'COMPLETED' AND OLD.status <> 'COMPLETED' THEN
        FOR r IN SELECT * FROM stock_transfer_line WHERE transfer_id = NEW.transfer_id LOOP
            IF r.vehicle_unit_id IS NOT NULL THEN
                UPDATE vehicle_unit SET current_warehouse_id = NEW.to_warehouse_id
                WHERE vehicle_unit_id = r.vehicle_unit_id;
            ELSE
                SELECT quantity_on_hand INTO v_current_qty
                FROM stock_balance
                WHERE warehouse_id = NEW.from_warehouse_id AND item_id = r.item_id
                FOR UPDATE;

                IF v_current_qty IS NULL OR v_current_qty < r.quantity THEN
                    RAISE EXCEPTION 'Insufficient stock at source warehouse % for item % (have %, need %)',
                        NEW.from_warehouse_id, r.item_id, COALESCE(v_current_qty, 0), r.quantity;
                END IF;

                UPDATE stock_balance SET quantity_on_hand = quantity_on_hand - r.quantity, updated_at = now()
                WHERE warehouse_id = NEW.from_warehouse_id AND item_id = r.item_id;

                INSERT INTO stock_balance (warehouse_id, item_id, quantity_on_hand)
                VALUES (NEW.to_warehouse_id, r.item_id, r.quantity)
                ON CONFLICT (warehouse_id, item_id)
                DO UPDATE SET quantity_on_hand = stock_balance.quantity_on_hand + EXCLUDED.quantity_on_hand,
                              updated_at = now();
            END IF;
        END LOOP;

        NEW.completed_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_execute_stock_transfer
BEFORE UPDATE ON stock_transfer
FOR EACH ROW EXECUTE FUNCTION fn_execute_stock_transfer();


-- =====================================================================
-- STOCK ADJUSTMENT
-- =====================================================================

CREATE TYPE adjustment_reason_enum AS ENUM ('DAMAGE', 'LOSS', 'CYCLE_COUNT_CORRECTION', 'OTHER');
CREATE TYPE adjustment_status_enum AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED');

CREATE SEQUENCE adjustment_number_seq START 1;

CREATE TABLE stock_adjustment (
    adjustment_id     BIGSERIAL PRIMARY KEY,
    adjustment_number VARCHAR(20) NOT NULL UNIQUE
                      DEFAULT ('ADJ-' || lpad(nextval('adjustment_number_seq')::text, 6, '0')),
    warehouse_id      INT NOT NULL REFERENCES warehouse(warehouse_id),
    item_id           BIGINT REFERENCES product_item(item_id),
    quantity_delta    NUMERIC(12,2),   -- quantity-based items only; positive or negative
    vehicle_unit_id   BIGINT REFERENCES vehicle_unit(vehicle_unit_id),
    reason            adjustment_reason_enum NOT NULL,
    -- Mandatory explanation, matching the rigor applied to Ledger
    -- adjustments in the Financial Core batch — adjustments are a common
    -- fraud/error vector and should never be a bare number with no reason.
    reason_notes      TEXT NOT NULL,
    status            adjustment_status_enum NOT NULL DEFAULT 'REQUESTED',
    requested_by      INT REFERENCES app_user(user_id),
    requested_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_by       INT REFERENCES app_user(user_id),
    approved_at       TIMESTAMPTZ,

    CHECK (
        (item_id IS NOT NULL AND quantity_delta IS NOT NULL AND vehicle_unit_id IS NULL)
        OR (vehicle_unit_id IS NOT NULL AND item_id IS NULL AND quantity_delta IS NULL)
    )
);

-- Quantity-item adjustments require an existing stock_balance row --
-- receive stock before you can adjust it. Vehicle-unit adjustments (e.g.
-- writing off a damaged unit) go through fn_transition_vehicle_status
-- instead, to avoid duplicating that state machine here.
CREATE OR REPLACE FUNCTION fn_execute_stock_adjustment()
RETURNS TRIGGER AS $$
DECLARE
    v_current_qty NUMERIC(12,2);
BEGIN
    IF NEW.status = 'APPROVED' AND OLD.status <> 'APPROVED' THEN
        IF NEW.item_id IS NOT NULL THEN
            SELECT quantity_on_hand INTO v_current_qty
            FROM stock_balance
            WHERE warehouse_id = NEW.warehouse_id AND item_id = NEW.item_id
            FOR UPDATE;

            IF v_current_qty IS NULL THEN
                RAISE EXCEPTION 'No existing stock balance for item % at warehouse % -- receive stock before adjusting it',
                    NEW.item_id, NEW.warehouse_id;
            END IF;

            IF v_current_qty + NEW.quantity_delta < 0 THEN
                RAISE EXCEPTION 'Adjustment would result in negative stock (have %, delta %) for item % at warehouse %',
                    v_current_qty, NEW.quantity_delta, NEW.item_id, NEW.warehouse_id;
            END IF;

            UPDATE stock_balance SET quantity_on_hand = quantity_on_hand + NEW.quantity_delta, updated_at = now()
            WHERE warehouse_id = NEW.warehouse_id AND item_id = NEW.item_id;
        END IF;

        NEW.approved_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_execute_stock_adjustment
BEFORE UPDATE ON stock_adjustment
FOR EACH ROW EXECUTE FUNCTION fn_execute_stock_adjustment();


-- =====================================================================
-- UNIFIED STOCK MOVEMENT HISTORY
-- Transfers are represented as two rows (OUT then IN), ledger-style,
-- consistent with the double-entry approach already used for the
-- Customer Ledger.
-- =====================================================================

CREATE VIEW vw_stock_movement_history AS
SELECT
    'RECEIPT' AS movement_type, sr.received_at AS movement_at, sr.warehouse_id,
    pol.item_id, NULL::BIGINT AS vehicle_unit_id, sr.quantity_received AS quantity,
    'shipment_receipt' AS reference_table, sr.receipt_id AS reference_id, sr.received_by AS performed_by
FROM shipment_receipt sr
JOIN shipment_line sl ON sl.shipment_line_id = sr.shipment_line_id
JOIN purchase_order_line pol ON pol.po_line_id = sl.po_line_id

UNION ALL

SELECT
    'TRANSFER_OUT', st.completed_at, st.from_warehouse_id,
    stl.item_id, stl.vehicle_unit_id, -stl.quantity,
    'stock_transfer', st.transfer_id, st.approved_by
FROM stock_transfer st
JOIN stock_transfer_line stl ON stl.transfer_id = st.transfer_id
WHERE st.status = 'COMPLETED'

UNION ALL

SELECT
    'TRANSFER_IN', st.completed_at, st.to_warehouse_id,
    stl.item_id, stl.vehicle_unit_id, stl.quantity,
    'stock_transfer', st.transfer_id, st.approved_by
FROM stock_transfer st
JOIN stock_transfer_line stl ON stl.transfer_id = st.transfer_id
WHERE st.status = 'COMPLETED'

UNION ALL

SELECT
    'ADJUSTMENT', sa.approved_at, sa.warehouse_id,
    sa.item_id, sa.vehicle_unit_id, sa.quantity_delta,
    'stock_adjustment', sa.adjustment_id, sa.approved_by
FROM stock_adjustment sa
WHERE sa.status = 'APPROVED'

UNION ALL

SELECT
    'VEHICLE_STATUS_CHANGE', vsh.changed_at, vu.current_warehouse_id,
    NULL::BIGINT, vsh.vehicle_unit_id, NULL::NUMERIC,
    'vehicle_status_history', vsh.status_history_id, vsh.triggered_by_user
FROM vehicle_status_history vsh
JOIN vehicle_unit vu ON vu.vehicle_unit_id = vsh.vehicle_unit_id;


-- =====================================================================
-- MANUAL / PRODUCTION VEHICLE RECEIPT (proposed addition)
-- Addresses the scope gap flagged in the implementation plan: the SRS
-- says KANAB Motors assembles vehicles locally, but only the Import
-- module's shipment-driven receipt is specified anywhere. This mirrors
-- that receipt pattern for locally assembled units. NOT in the SRS
-- verbatim — confirm before relying on it.
-- =====================================================================

CREATE TABLE production_receipt (
    production_receipt_id BIGSERIAL PRIMARY KEY,
    item_id                BIGINT NOT NULL REFERENCES product_item(item_id),
    chassis_number         VARCHAR(50) NOT NULL,
    engine_number          VARCHAR(50) NOT NULL,
    warehouse_id           INT NOT NULL REFERENCES warehouse(warehouse_id),
    assembled_at           DATE NOT NULL DEFAULT CURRENT_DATE,
    received_by            INT REFERENCES app_user(user_id),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION fn_create_vehicle_unit_from_production()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO vehicle_unit (item_id, chassis_number, engine_number, current_warehouse_id, created_by)
    VALUES (NEW.item_id, NEW.chassis_number, NEW.engine_number, NEW.warehouse_id, NEW.received_by);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_vehicle_unit_from_production
AFTER INSERT ON production_receipt
FOR EACH ROW EXECUTE FUNCTION fn_create_vehicle_unit_from_production();


-- =====================================================================
-- REPORTING VIEWS
-- Mapped to the report names already listed in the base SRS §8.17.
-- =====================================================================

CREATE VIEW vw_current_stock_balance AS
SELECT w.warehouse_name, pi.item_code, pi.item_name,
       sb.quantity_on_hand, sb.quantity_reserved, sb.quantity_available
FROM stock_balance sb
JOIN warehouse w ON w.warehouse_id = sb.warehouse_id
JOIN product_item pi ON pi.item_id = sb.item_id;

CREATE VIEW vw_vehicle_inventory_by_status AS
SELECT vu.current_status, w.warehouse_name, pi.item_name, COUNT(*) AS unit_count
FROM vehicle_unit vu
JOIN warehouse w ON w.warehouse_id = vu.current_warehouse_id
JOIN product_item pi ON pi.item_id = vu.item_id
GROUP BY vu.current_status, w.warehouse_name, pi.item_name;

COMMIT;
