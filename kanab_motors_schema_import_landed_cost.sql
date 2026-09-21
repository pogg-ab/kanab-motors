-- =====================================================================
-- KANAB Motors — Integrated Sales, Inventory and Customer Account
-- Management System
-- PostgreSQL schema: Import, Shipment Tracking and Landed Cost Management
--
-- DEPENDS ON: kanab_motors_schema_modules_1_2.sql having already been
-- applied (references app_user, warehouse, attachment, product_item,
-- vehicle_unit from that script).
--
-- RETROACTIVE CHANGES TO ALREADY-DEPLOYED SCHEMA (flagged explicitly,
-- consistent with the implementation plan — not silently folded in):
--   1. product_item gains weight_kg (needed for BY_WEIGHT allocation)
--   2. attachment gains document_type (needed for the Document Centre's
--      completeness checks — e.g. confirming a customs declaration is
--      attached before a shipment can be marked customs-cleared)
--   3. vehicle_unit gains shipment_line_id (links a received vehicle back
--      to the shipment line it arrived on) — this ALTER runs further
--      down, after shipment_line exists, since it references that table
--
-- DESIGN CHOICES WORTH FLAGGING:
--   - Exchange rates are snapshotted PER TRANSACTION (on
--     shipment_cost_component), not looked up from a live/historical
--     rate table later — standard accounting practice, and avoids
--     retroactively changing a cost after the fact if rates move.
--     exchange_rate_default exists only as an editable *suggested*
--     starting value for data entry, not an authoritative source.
--   - shipment_line_landed_cost and vehicle_unit_landed_cost are
--     separate, append-only-style tables (is_current flag) rather than
--     mutable columns — preserves recalculation history if a customs
--     assessment changes after the initial estimate, consistent with the
--     audit-first design used for the Customer Ledger.
--   - shipment_receipt is its own table (not just a counter on
--     shipment_line) specifically to support partial/multi-batch
--     receipt, with a trigger enforcing received quantity never exceeds
--     shipped quantity — including under concurrent receipt entries via
--     row locking.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- Retroactive change 1: weight-based allocation support
-- ---------------------------------------------------------------------
ALTER TABLE product_item ADD COLUMN weight_kg NUMERIC(10,2)
    CHECK (weight_kg IS NULL OR weight_kg > 0);

-- ---------------------------------------------------------------------
-- Retroactive change 2: document type tagging on the shared attachment table
-- ---------------------------------------------------------------------
ALTER TABLE attachment ADD COLUMN document_type VARCHAR(50);
-- e.g. 'COMMERCIAL_INVOICE', 'PACKING_LIST', 'BILL_OF_LADING',
-- 'CUSTOMS_DECLARATION' when entity_type = 'shipment'


-- =====================================================================
-- FOUNDATIONAL REFERENCE DATA
-- =====================================================================

CREATE TABLE supplier (
    supplier_id     SERIAL PRIMARY KEY,
    supplier_name   VARCHAR(200) NOT NULL,
    country         VARCHAR(100),
    contact_person  VARCHAR(150),
    phone           VARCHAR(30),
    email           VARCHAR(150),
    address         TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cost_component_type (
    cost_component_type_id SMALLSERIAL PRIMARY KEY,
    type_code       VARCHAR(40) NOT NULL UNIQUE,
    type_name       VARCHAR(150) NOT NULL
);
INSERT INTO cost_component_type (type_code, type_name) VALUES
    ('GOODS_VALUE', 'Goods Value'),
    ('FREIGHT', 'Freight'),
    ('INSURANCE', 'Insurance'),
    ('DJIBOUTI_PORT_HANDLING', 'Djibouti Port Handling'),
    ('ETHIOPIAN_CUSTOMS_DUTY', 'Ethiopian Customs Duty'),
    ('ETHIOPIAN_VAT', 'Ethiopian VAT'),
    ('INLAND_TRANSPORT', 'Inland Transport'),
    ('CLEARING_AGENT_FEES', 'Clearing Agent Fees');

CREATE TYPE currency_enum AS ENUM ('ETB', 'USD', 'EUR');

-- Editable SUGGESTED default rate only — see design note above.
CREATE TABLE exchange_rate_default (
    currency      currency_enum PRIMARY KEY,
    rate_to_etb   NUMERIC(18,6) NOT NULL CHECK (rate_to_etb > 0),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO exchange_rate_default (currency, rate_to_etb) VALUES ('ETB', 1.000000);


-- =====================================================================
-- PURCHASE ORDER MANAGEMENT
-- =====================================================================

CREATE TYPE po_status_enum AS ENUM (
    'DRAFT', 'SUBMITTED', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'
);

CREATE SEQUENCE po_number_seq START 1;

CREATE TABLE purchase_order (
    po_id       BIGSERIAL PRIMARY KEY,
    po_number   VARCHAR(20) NOT NULL UNIQUE
                DEFAULT ('PO-' || lpad(nextval('po_number_seq')::text, 6, '0')),
    supplier_id INT NOT NULL REFERENCES supplier(supplier_id),
    po_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    currency    currency_enum NOT NULL,
    status      po_status_enum NOT NULL DEFAULT 'DRAFT',
    notes       TEXT,
    created_by  INT REFERENCES app_user(user_id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by  INT REFERENCES app_user(user_id),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_po_supplier ON purchase_order(supplier_id);
CREATE INDEX idx_po_status ON purchase_order(status);

CREATE TRIGGER trg_po_touch_updated_at
BEFORE UPDATE ON purchase_order
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

CREATE TABLE purchase_order_line (
    po_line_id       BIGSERIAL PRIMARY KEY,
    po_id            BIGINT NOT NULL REFERENCES purchase_order(po_id) ON DELETE CASCADE,
    item_id          BIGINT NOT NULL REFERENCES product_item(item_id),
    quantity_ordered NUMERIC(12,2) NOT NULL CHECK (quantity_ordered > 0),
    unit_price       NUMERIC(18,4) NOT NULL CHECK (unit_price > 0),
    currency         currency_enum NOT NULL,
    line_total       NUMERIC(18,2) GENERATED ALWAYS AS (quantity_ordered * unit_price) STORED
);
CREATE INDEX idx_po_line_po ON purchase_order_line(po_id);
CREATE INDEX idx_po_line_item ON purchase_order_line(item_id);


-- =====================================================================
-- SHIPMENT TRACKING
-- =====================================================================

-- Stage names are a reasonable default for an Ethiopia-via-Djibouti import
-- chain, NOT confirmed against KANAB Motors' actual tracked checkpoints
-- (see implementation plan, Open Question 2).
CREATE TYPE shipment_stage_enum AS ENUM (
    'ORDERED', 'SHIPPED', 'AT_DJIBOUTI_PORT', 'ETHIOPIAN_CUSTOMS_CLEARANCE',
    'IN_TRANSIT_INLAND', 'RECEIVED'
);

CREATE SEQUENCE shipment_number_seq START 1;

CREATE TABLE shipment (
    shipment_id            BIGSERIAL PRIMARY KEY,
    shipment_number        VARCHAR(20) NOT NULL UNIQUE
                           DEFAULT ('SHIP-' || lpad(nextval('shipment_number_seq')::text, 6, '0')),
    current_stage          shipment_stage_enum NOT NULL DEFAULT 'ORDERED',
    bill_of_lading_number  VARCHAR(60),
    expected_arrival_date  DATE,
    actual_arrival_date    DATE,
    -- Allocation method chosen for this shipment's landed cost (see Landed
    -- Cost Allocation section below). CHECK instead of enum here since
    -- this is compared against a plain string in application code as
    -- often as it's stored — either is valid; kept simple deliberately.
    allocation_method      VARCHAR(20) NOT NULL DEFAULT 'BY_VALUE'
                           CHECK (allocation_method IN ('BY_VALUE', 'BY_QUANTITY', 'BY_WEIGHT')),
    notes                  TEXT,
    created_by             INT REFERENCES app_user(user_id),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by             INT REFERENCES app_user(user_id),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shipment_stage ON shipment(current_stage);

CREATE TRIGGER trg_shipment_touch_updated_at
BEFORE UPDATE ON shipment
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

-- Many-to-many: a shipment can consolidate multiple PO lines; a PO line can
-- ship across multiple shipments (assumed cardinality — Open Question 1).
CREATE TABLE shipment_line (
    shipment_line_id  BIGSERIAL PRIMARY KEY,
    shipment_id       BIGINT NOT NULL REFERENCES shipment(shipment_id) ON DELETE CASCADE,
    po_line_id        BIGINT NOT NULL REFERENCES purchase_order_line(po_line_id),
    quantity_shipped  NUMERIC(12,2) NOT NULL CHECK (quantity_shipped > 0),
    -- Maintained by the fn_update_shipment_line_received_qty trigger below,
    -- not set directly by application code, to prevent drift against the
    -- individual shipment_receipt entries that back it.
    quantity_received NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
    UNIQUE (shipment_id, po_line_id)
);
CREATE INDEX idx_shipment_line_shipment ON shipment_line(shipment_id);
CREATE INDEX idx_shipment_line_po_line ON shipment_line(po_line_id);

-- Timestamped stage-transition history.
CREATE TABLE shipment_stage_history (
    stage_history_id  BIGSERIAL PRIMARY KEY,
    shipment_id       BIGINT NOT NULL REFERENCES shipment(shipment_id) ON DELETE CASCADE,
    from_stage        shipment_stage_enum,
    to_stage          shipment_stage_enum NOT NULL,
    changed_by        INT REFERENCES app_user(user_id),
    changed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes             TEXT
);
CREATE INDEX idx_shipment_stage_history_shipment ON shipment_stage_history(shipment_id);

-- Auto-log every stage change — no application code path can skip logging it.
CREATE OR REPLACE FUNCTION fn_log_shipment_stage_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.current_stage IS DISTINCT FROM OLD.current_stage THEN
        INSERT INTO shipment_stage_history (shipment_id, from_stage, to_stage, changed_by)
        VALUES (NEW.shipment_id, OLD.current_stage, NEW.current_stage, NEW.updated_by);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_shipment_stage_change
AFTER UPDATE ON shipment
FOR EACH ROW EXECUTE FUNCTION fn_log_shipment_stage_change();

-- ---------------------------------------------------------------------
-- Retroactive change 3: link received vehicles back to their shipment line.
-- Runs here, not earlier, since it needs shipment_line to exist first.
-- ---------------------------------------------------------------------
ALTER TABLE vehicle_unit ADD COLUMN shipment_line_id BIGINT REFERENCES shipment_line(shipment_line_id);
CREATE INDEX idx_vehicle_unit_shipment_line ON vehicle_unit(shipment_line_id);


-- =====================================================================
-- MULTI-CURRENCY COST COMPONENT RECORDING
-- =====================================================================

CREATE TABLE shipment_cost_component (
    cost_component_id      BIGSERIAL PRIMARY KEY,
    shipment_id            BIGINT NOT NULL REFERENCES shipment(shipment_id) ON DELETE CASCADE,
    cost_component_type_id SMALLINT NOT NULL REFERENCES cost_component_type(cost_component_type_id),
    amount                 NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    currency               currency_enum NOT NULL,
    -- Snapshot at time of entry — see design note at top of file.
    exchange_rate_to_etb   NUMERIC(18,6) NOT NULL CHECK (exchange_rate_to_etb > 0),
    amount_etb             NUMERIC(18,2) GENERATED ALWAYS AS (amount * exchange_rate_to_etb) STORED,
    notes                  TEXT,
    created_by             INT REFERENCES app_user(user_id),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_etb_rate_is_one CHECK (currency <> 'ETB' OR exchange_rate_to_etb = 1)
);
CREATE INDEX idx_shipment_cost_component_shipment ON shipment_cost_component(shipment_id);


-- =====================================================================
-- LANDED COST ALLOCATION
-- Both tables use an is_current flag rather than being overwritten in
-- place, so a recalculation (e.g. after final customs assessment differs
-- from the initial estimate) preserves history instead of erasing it.
-- =====================================================================

CREATE TABLE shipment_line_landed_cost (
    line_landed_cost_id  BIGSERIAL PRIMARY KEY,
    shipment_line_id     BIGINT NOT NULL REFERENCES shipment_line(shipment_line_id) ON DELETE CASCADE,
    allocated_cost_etb   NUMERIC(18,2) NOT NULL,
    allocation_basis     VARCHAR(20) NOT NULL,  -- snapshot of the method used at calculation time
    is_current           BOOLEAN NOT NULL DEFAULT TRUE,
    calculated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    calculated_by        INT REFERENCES app_user(user_id)
);
CREATE INDEX idx_shipment_line_landed_cost_line ON shipment_line_landed_cost(shipment_line_id);
-- Enforces "at most one CURRENT allocation per line" while still allowing
-- historical (is_current = false) rows to accumulate.
CREATE UNIQUE INDEX uq_shipment_line_landed_cost_current
    ON shipment_line_landed_cost(shipment_line_id) WHERE is_current;

-- Per-unit landed cost for individually tracked vehicles. One shipment_line
-- can cover several vehicle_unit rows (e.g. 5 units of the same model on
-- one line) — this table is where the line-level allocation gets divided
-- down to each specific chassis/engine-tracked unit.
CREATE TABLE vehicle_unit_landed_cost (
    vehicle_unit_cost_id  BIGSERIAL PRIMARY KEY,
    vehicle_unit_id       BIGINT NOT NULL REFERENCES vehicle_unit(vehicle_unit_id) ON DELETE CASCADE,
    shipment_line_id      BIGINT NOT NULL REFERENCES shipment_line(shipment_line_id),
    landed_cost_etb       NUMERIC(18,2) NOT NULL,
    is_current            BOOLEAN NOT NULL DEFAULT TRUE,
    calculated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    calculated_by         INT REFERENCES app_user(user_id)
);
CREATE INDEX idx_vehicle_unit_landed_cost_unit ON vehicle_unit_landed_cost(vehicle_unit_id);
CREATE UNIQUE INDEX uq_vehicle_unit_landed_cost_current
    ON vehicle_unit_landed_cost(vehicle_unit_id) WHERE is_current;

-- NOTE: the allocation CALCULATION itself (dividing a shipment's total
-- landed cost across lines by value/quantity/weight with zero rounding
-- drift) is application logic, not something a schema can enforce. The
-- tables above are where that calculation's *results* land, with the
-- is_current mechanism guaranteeing at most one authoritative figure per
-- line/unit at any moment.


-- =====================================================================
-- RECEIPT INTO INVENTORY
-- Its own table (not just a counter) to support partial/multi-batch
-- receipt against a single shipment_line.
-- =====================================================================

CREATE TABLE shipment_receipt (
    receipt_id         BIGSERIAL PRIMARY KEY,
    shipment_line_id   BIGINT NOT NULL REFERENCES shipment_line(shipment_line_id),
    quantity_received  NUMERIC(12,2) NOT NULL CHECK (quantity_received > 0),
    received_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    received_by        INT REFERENCES app_user(user_id),
    warehouse_id       INT REFERENCES warehouse(warehouse_id)
);
CREATE INDEX idx_shipment_receipt_line ON shipment_receipt(shipment_line_id);

-- Keeps shipment_line.quantity_received in sync automatically, and — under
-- a row lock on the parent line — rejects any receipt that would push the
-- cumulative total past what was actually shipped, including under
-- concurrent receipt entries for the same line.
CREATE OR REPLACE FUNCTION fn_update_shipment_line_received_qty()
RETURNS TRIGGER AS $$
DECLARE
    v_shipped          NUMERIC(12,2);
    v_already_received NUMERIC(12,2);
BEGIN
    SELECT quantity_shipped, quantity_received INTO v_shipped, v_already_received
    FROM shipment_line
    WHERE shipment_line_id = NEW.shipment_line_id
    FOR UPDATE;

    IF v_already_received + NEW.quantity_received > v_shipped THEN
        RAISE EXCEPTION
            'Receipt quantity (%) would push total received to % of only % shipped for shipment_line %',
            NEW.quantity_received, v_already_received + NEW.quantity_received, v_shipped, NEW.shipment_line_id;
    END IF;

    UPDATE shipment_line
    SET quantity_received = quantity_received + NEW.quantity_received
    WHERE shipment_line_id = NEW.shipment_line_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_shipment_line_received_qty
AFTER INSERT ON shipment_receipt
FOR EACH ROW EXECUTE FUNCTION fn_update_shipment_line_received_qty();

COMMIT;
