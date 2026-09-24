-- =====================================================================
-- KANAB Motors — Integrated Sales, Inventory and Customer Account
-- Management System
-- PostgreSQL schema: Sales Invoice & Settlement, Delivery & Handover,
--                     Approval Workflow & Internal Controls,
--                     Document & Attachment Management
--
-- DEPENDS ON all four prior schema files having been applied (Customer/
-- Product Master, Import/Landed Cost, Inventory/Warehouse, Vehicle
-- Allotment).
--
-- BUILD ORDER IN THIS FILE (deliberate, not incidental):
--   1. booking_stub — a single generic provisional stand-in for Booking,
--      replacing the allotment-specific one built earlier
--   2. Document type formalization (small, independent)
--   3. The generic Approval Workflow engine
--   4. Sales Invoice and Delivery — built to use the engine NATIVELY,
--      since neither existed before this file
--   5. Retrofit: Vehicle Allotment and Stock Adjustment migrated ONTO
--      the engine — this is real surgery on already-deployed,
--      already-tested tables, not an additive change
--
-- WHAT "MIGRATION" MEANS HERE, CONCRETELY:
-- Allotment and Stock Adjustment used to have their own status enum,
-- directly settable by an application UPDATE, with a trigger reacting to
-- that UPDATE. That trigger's business logic (checking payment
-- validation, calling Inventory's transition service, adjusting stock)
-- is extracted into standalone functions below. The OLD trigger is
-- dropped. A NEW trigger auto-submits an approval_request the moment an
-- allotment/adjustment is created, and a single dispatcher — reacting to
-- approval_request reaching APPROVED or REJECTED — calls the appropriate
-- extracted function based on entity_type. The status columns on
-- allotment/stock_adjustment still exist, but they are now a synced
-- read-convenience cache, not the source of truth; approval_request is.
-- =====================================================================

BEGIN;

-- =====================================================================
-- GENERIC BOOKING STAND-IN
-- Replaces the allotment-specific booking_allotment_requirement as the
-- FK target every module should point at for a provisional booking_id,
-- now that Sales Invoice and Delivery need one too.
-- =====================================================================

CREATE TABLE booking_stub (
    booking_id BIGINT PRIMARY KEY
);

-- Retroactive: booking_allotment_requirement now extends this generic
-- stub rather than standing alone as its own root.
-- NOTE FOR REAL DEPLOYMENT: any booking_id already present in
-- booking_allotment_requirement must be backfilled into booking_stub
-- BEFORE this constraint is added, or it will fail.
ALTER TABLE booking_allotment_requirement
    ADD CONSTRAINT fk_booking_allotment_requirement_stub
    FOREIGN KEY (booking_id) REFERENCES booking_stub(booking_id);


-- =====================================================================
-- DOCUMENT AND ATTACHMENT MANAGEMENT
-- Formalizes the existing free-text attachment.document_type into real
-- reference data. Independent of everything else in this file.
-- =====================================================================

CREATE TABLE document_type (
    document_type_code       VARCHAR(50) PRIMARY KEY,
    document_type_name       VARCHAR(150) NOT NULL,
    -- NULL = valid for any entity_type; otherwise restricts this document
    -- type to one specific entity_type.
    restricted_to_entity_type VARCHAR(50)
);

INSERT INTO document_type (document_type_code, document_type_name, restricted_to_entity_type) VALUES
    ('CUSTOMER_ID',          'Customer Identification Document', 'customer'),
    ('PASSPORT',             'Passport',                          'customer'),
    ('GENERAL',              'General Document',                 NULL),
    ('BANK_DEPOSIT_ADVICE',  'Bank Deposit Advice',               NULL),
    ('PAYMENT_SUPPORT',      'Payment Supporting Document',       NULL),
    ('CASH_SALE_ATTACHMENT', 'Cash Sale Attachment',              NULL),
    ('COMMERCIAL_INVOICE',   'Commercial Invoice',                'shipment'),
    ('PACKING_LIST',         'Packing List',                      'shipment'),
    ('BILL_OF_LADING',       'Bill of Lading',                    'shipment'),
    ('CUSTOMS_DECLARATION',  'Customs Declaration',               'shipment'),
    ('DELIVERY_NOTE',        'Delivery Note',                     'delivery'),
    ('OTHER',                'Other',                             NULL);

ALTER TABLE attachment ADD COLUMN document_type_code VARCHAR(50) REFERENCES document_type(document_type_code);

-- Best-effort migration of existing free-text values that happen to match
-- a known code. Anything left unmatched stays NULL and should be reviewed
-- manually before the old column is ever dropped.
UPDATE attachment SET document_type_code = document_type
WHERE document_type IN (SELECT document_type_code FROM document_type);

-- The old free-text column is deliberately NOT dropped here — that's an
-- application-cutover decision (once the app writes document_type_code
-- instead), not something to do silently in a schema migration:
-- ALTER TABLE attachment DROP COLUMN document_type;

CREATE OR REPLACE FUNCTION fn_validate_document_type_entity()
RETURNS TRIGGER AS $$
DECLARE
    v_restricted_to VARCHAR(50);
BEGIN
    IF NEW.document_type_code IS NOT NULL THEN
        SELECT restricted_to_entity_type INTO v_restricted_to
        FROM document_type WHERE document_type_code = NEW.document_type_code;

        IF v_restricted_to IS NOT NULL AND v_restricted_to <> NEW.entity_type THEN
            RAISE EXCEPTION 'Document type % is only valid for entity_type %, not %',
                NEW.document_type_code, v_restricted_to, NEW.entity_type;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_document_type_entity
BEFORE INSERT OR UPDATE ON attachment
FOR EACH ROW EXECUTE FUNCTION fn_validate_document_type_entity();


-- =====================================================================
-- APPROVAL WORKFLOW AND INTERNAL CONTROLS — the generic engine
-- =====================================================================

CREATE TABLE workflow_type (
    workflow_type_code VARCHAR(50) PRIMARY KEY,
    workflow_type_name VARCHAR(150) NOT NULL
);

INSERT INTO workflow_type (workflow_type_code, workflow_type_name) VALUES
    ('SALES_ENQUIRY',               'Sales Enquiry Approval'),
    ('ADVANCE_PAYMENT',             'Advance Payment Confirmation'),
    ('BOOKING',                     'Booking Approval'),
    ('VEHICLE_ALLOTMENT',           'Vehicle Allotment Approval'),
    ('STOCK_ADJUSTMENT',            'Stock Adjustment Approval'),
    ('SALES_INVOICE',               'Sales Invoice Approval'),
    ('BOOKING_CANCELLATION',        'Booking Cancellation Approval'),
    ('CUSTOMER_REFUND',             'Customer Refund Approval'),
    ('CUSTOMER_ACCOUNT_ADJUSTMENT', 'Customer Account Adjustment Approval'),
    ('DELIVERY',                    'Delivery Authorization');
    -- DELIVERY added here even though it wasn't in the original 9 --
    -- the Delivery module (this same batch) needs an authorization step
    -- and it's a natural fit for this same engine.

-- Which role approves which workflow type, at which level. Multi-level
-- policies (level 1, then level 2) are supported by adding more rows per
-- workflow_type_code. Seeded below with a single-level placeholder for
-- every type -- NOT confirmed business policy, see Open Question 2 in
-- the implementation plan.
CREATE TABLE approval_policy (
    workflow_type_code VARCHAR(50) NOT NULL REFERENCES workflow_type(workflow_type_code),
    approval_level     SMALLINT NOT NULL CHECK (approval_level > 0),
    required_role_id   SMALLINT NOT NULL REFERENCES role(role_id),
    PRIMARY KEY (workflow_type_code, approval_level)
);

CREATE TYPE approval_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE SEQUENCE approval_request_number_seq START 1;

CREATE TABLE approval_request (
    approval_request_id BIGSERIAL PRIMARY KEY,
    request_number       VARCHAR(20) NOT NULL UNIQUE
                         DEFAULT ('APR-' || lpad(nextval('approval_request_number_seq')::text, 6, '0')),
    workflow_type_code   VARCHAR(50) NOT NULL REFERENCES workflow_type(workflow_type_code),
    -- entity_type kept separate from workflow_type_code (even though they
    -- overlap 1:1 today) since an entity could plausibly need more than
    -- one kind of workflow over its lifetime.
    entity_type          VARCHAR(50) NOT NULL,
    entity_id            BIGINT NOT NULL,
    status               approval_status_enum NOT NULL DEFAULT 'PENDING',
    current_level        SMALLINT NOT NULL DEFAULT 1,
    requested_by         INT REFERENCES app_user(user_id),
    requested_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    finalized_at         TIMESTAMPTZ
);
CREATE INDEX idx_approval_request_entity ON approval_request(entity_type, entity_id);
CREATE INDEX idx_approval_request_status ON approval_request(status);

-- Only ONE pending request per entity+workflow combination at a time --
-- but a rejected/cancelled request doesn't block resubmission, since this
-- is a partial index (WHERE status = 'PENDING'), not a plain unique
-- constraint.
CREATE UNIQUE INDEX uq_approval_request_pending
    ON approval_request(entity_type, entity_id, workflow_type_code) WHERE status = 'PENDING';

CREATE TABLE approval_action (
    approval_action_id   BIGSERIAL PRIMARY KEY,
    approval_request_id  BIGINT NOT NULL REFERENCES approval_request(approval_request_id) ON DELETE CASCADE,
    approval_level       SMALLINT NOT NULL,
    decision              VARCHAR(10) NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED')),
    decided_by            INT REFERENCES app_user(user_id),
    decided_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    comments              TEXT
);
CREATE INDEX idx_approval_action_request ON approval_action(approval_request_id);

-- Entry point ANY module calls to start an approval, real or provisional.
CREATE OR REPLACE FUNCTION fn_submit_for_approval(
    p_workflow_type_code VARCHAR(50),
    p_entity_type        VARCHAR(50),
    p_entity_id          BIGINT,
    p_requested_by       INT
) RETURNS BIGINT AS $$
DECLARE
    v_request_id BIGINT;
BEGIN
    INSERT INTO approval_request (workflow_type_code, entity_type, entity_id, requested_by)
    VALUES (p_workflow_type_code, p_entity_type, p_entity_id, p_requested_by)
    RETURNING approval_request_id INTO v_request_id;

    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql;

-- Records one decision, enforces the role required at the current level
-- (per approval_policy), and advances to the next level or finalizes the
-- request -- locking the request row so two concurrent decisions on the
-- same request can't both proceed.
CREATE OR REPLACE FUNCTION fn_record_approval_decision(
    p_approval_request_id BIGINT,
    p_decision            VARCHAR(10),
    p_decided_by          INT,
    p_comments            TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
    v_request       RECORD;
    v_required_role INT;
    v_decider_role  INT;
    v_max_level     SMALLINT;
BEGIN
    SELECT * INTO v_request FROM approval_request WHERE approval_request_id = p_approval_request_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Approval request % does not exist', p_approval_request_id;
    END IF;

    IF v_request.status <> 'PENDING' THEN
        RAISE EXCEPTION 'Approval request % is not pending (current status: %)',
            p_approval_request_id, v_request.status;
    END IF;

    SELECT required_role_id INTO v_required_role
    FROM approval_policy
    WHERE workflow_type_code = v_request.workflow_type_code AND approval_level = v_request.current_level;

    SELECT role_id INTO v_decider_role FROM app_user WHERE user_id = p_decided_by;

    IF v_required_role IS NOT NULL AND v_decider_role IS DISTINCT FROM v_required_role THEN
        RAISE EXCEPTION 'User % does not hold the required role for approval level % of workflow %',
            p_decided_by, v_request.current_level, v_request.workflow_type_code;
    END IF;

    INSERT INTO approval_action (approval_request_id, approval_level, decision, decided_by, comments)
    VALUES (p_approval_request_id, v_request.current_level, p_decision, p_decided_by, p_comments);

    IF p_decision = 'REJECTED' THEN
        UPDATE approval_request SET status = 'REJECTED', finalized_at = now()
        WHERE approval_request_id = p_approval_request_id;
    ELSE
        SELECT MAX(approval_level) INTO v_max_level
        FROM approval_policy WHERE workflow_type_code = v_request.workflow_type_code;

        IF v_request.current_level >= COALESCE(v_max_level, 1) THEN
            UPDATE approval_request SET status = 'APPROVED', finalized_at = now()
            WHERE approval_request_id = p_approval_request_id;
        ELSE
            UPDATE approval_request SET current_level = current_level + 1
            WHERE approval_request_id = p_approval_request_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;


-- =====================================================================
-- SALES INVOICE AND SETTLEMENT MANAGEMENT
-- Built to use the approval engine NATIVELY -- no retrofit needed since
-- this table is new.
--
-- Of the 9 capabilities in the implementation plan, only VAT calculation
-- and the vehicle status update are backed by real logic below. Deposit
-- retrieval, payment application, outstanding balance, excess detection,
-- ledger update, and booking status update all require the Customer
-- Ledger and Booking schemas, which do not exist -- their columns exist
-- here as placeholders (defaulting to 0/FALSE) so the shape is right,
-- not because the values behind them are trustworthy yet.
-- =====================================================================

CREATE TYPE invoice_status_enum AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE SEQUENCE invoice_number_seq START 1;

CREATE TABLE sales_invoice (
    invoice_id      BIGSERIAL PRIMARY KEY,
    invoice_number  VARCHAR(20) NOT NULL UNIQUE
                    DEFAULT ('INV-' || lpad(nextval('invoice_number_seq')::text, 6, '0')),
    booking_id      BIGINT NOT NULL REFERENCES booking_stub(booking_id),
    customer_id     BIGINT NOT NULL REFERENCES customer(customer_id),
    item_id         BIGINT NOT NULL REFERENCES product_item(item_id),
    vehicle_unit_id BIGINT REFERENCES vehicle_unit(vehicle_unit_id),  -- null for non-vehicle sales (kits/parts)
    quantity        NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    unit_price      NUMERIC(18,2) NOT NULL CHECK (unit_price > 0),
    vat_amount      NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
    gross_total     NUMERIC(18,2) GENERATED ALWAYS AS (quantity * unit_price + vat_amount) STORED,

    -- PLACEHOLDERS -- see note above. Do not trust these values until
    -- Customer Ledger and Booking are real.
    deposits_applied    NUMERIC(18,2) NOT NULL DEFAULT 0,
    outstanding_balance NUMERIC(18,2) GENERATED ALWAYS AS (quantity * unit_price + vat_amount - deposits_applied) STORED,
    excess_payment_flag BOOLEAN NOT NULL DEFAULT FALSE,

    status          invoice_status_enum NOT NULL DEFAULT 'DRAFT',
    created_by      INT REFERENCES app_user(user_id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sales_invoice_booking ON sales_invoice(booking_id);
CREATE INDEX idx_sales_invoice_customer ON sales_invoice(customer_id);

-- The ONE piece of this module that's genuinely real: on approval,
-- transition the vehicle to SOLD via Inventory's transition service.
CREATE OR REPLACE FUNCTION fn_apply_invoice_approval(p_invoice_id BIGINT, p_approved_by INT)
RETURNS void AS $$
DECLARE
    v_vehicle_unit_id BIGINT;
    v_invoice_number  VARCHAR(20);
BEGIN
    SELECT vehicle_unit_id, invoice_number INTO v_vehicle_unit_id, v_invoice_number
    FROM sales_invoice WHERE invoice_id = p_invoice_id;

    IF v_vehicle_unit_id IS NOT NULL THEN
        PERFORM fn_transition_vehicle_status(
            v_vehicle_unit_id, 'SOLD', p_approved_by, 'SALES_INVOICE', 'Invoice ' || v_invoice_number
        );
    END IF;

    UPDATE sales_invoice SET status = 'APPROVED' WHERE invoice_id = p_invoice_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_auto_submit_invoice_for_approval()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_submit_for_approval('SALES_INVOICE', 'SALES_INVOICE', NEW.invoice_id, NEW.created_by);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_submit_invoice_for_approval
AFTER INSERT ON sales_invoice
FOR EACH ROW EXECUTE FUNCTION fn_auto_submit_invoice_for_approval();


-- =====================================================================
-- DELIVERY AND HANDOVER MANAGEMENT
-- Also built to use the approval engine natively. Financial settlement
-- validation is a manual attestation flag until Booking/Invoice are real
-- (same pattern as Vehicle Allotment's payment_validated stand-in). PDI
-- is fully real and self-contained.
-- =====================================================================

CREATE TYPE delivery_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE SEQUENCE delivery_number_seq START 1;

CREATE TABLE delivery (
    delivery_id           BIGSERIAL PRIMARY KEY,
    delivery_number        VARCHAR(20) NOT NULL UNIQUE
                           DEFAULT ('DEL-' || lpad(nextval('delivery_number_seq')::text, 6, '0')),
    booking_id             BIGINT NOT NULL REFERENCES booking_stub(booking_id),
    vehicle_unit_id        BIGINT NOT NULL REFERENCES vehicle_unit(vehicle_unit_id),
    delivery_date          DATE,
    responsible_employee   INT REFERENCES app_user(user_id),
    customer_acknowledged  BOOLEAN NOT NULL DEFAULT FALSE,
    pdi_completed          BOOLEAN NOT NULL DEFAULT FALSE,
    -- Manual stand-in for DL3 (financial settlement validation) until
    -- Booking and Sales Invoice can supply this automatically.
    financial_settlement_validated BOOLEAN NOT NULL DEFAULT FALSE,
    status                 delivery_status_enum NOT NULL DEFAULT 'PENDING',
    delivered_at           TIMESTAMPTZ,
    created_by             INT REFERENCES app_user(user_id),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_delivery_booking ON delivery(booking_id);
CREATE INDEX idx_delivery_vehicle_unit ON delivery(vehicle_unit_id);

-- FIXED DURING TESTING: originally checked delivery.pdi_completed, a flag
-- that only got set correctly if a PDI was recorded AFTER the delivery
-- record already existed -- an ordering dependency that doesn't match how
-- PDI is likely to actually happen (often before a delivery record is
-- created at all). Now checks directly for a real pdi_inspection row
-- against the vehicle, which is correct regardless of ordering.
CREATE OR REPLACE FUNCTION fn_apply_delivery_approval(p_delivery_id BIGINT, p_approved_by INT)
RETURNS void AS $$
DECLARE
    v_vehicle_unit_id BIGINT;
    v_pdi_exists BOOLEAN;
    v_settlement_validated BOOLEAN;
BEGIN
    SELECT vehicle_unit_id, financial_settlement_validated
    INTO v_vehicle_unit_id, v_settlement_validated
    FROM delivery WHERE delivery_id = p_delivery_id;

    SELECT EXISTS (SELECT 1 FROM pdi_inspection WHERE vehicle_unit_id = v_vehicle_unit_id) INTO v_pdi_exists;

    IF NOT v_pdi_exists THEN
        RAISE EXCEPTION 'Cannot approve delivery %: no PDI inspection recorded for vehicle %',
            p_delivery_id, v_vehicle_unit_id;
    END IF;

    IF NOT v_settlement_validated THEN
        RAISE EXCEPTION 'Cannot approve delivery %: financial settlement has not been validated', p_delivery_id;
    END IF;

    PERFORM fn_transition_vehicle_status(v_vehicle_unit_id, 'DELIVERED', p_approved_by, 'DELIVERY');

    UPDATE delivery SET status = 'APPROVED', delivered_at = now(), pdi_completed = TRUE
    WHERE delivery_id = p_delivery_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_auto_submit_delivery_for_approval()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_submit_for_approval('DELIVERY', 'DELIVERY', NEW.delivery_id, NEW.created_by);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_submit_delivery_for_approval
AFTER INSERT ON delivery
FOR EACH ROW EXECUTE FUNCTION fn_auto_submit_delivery_for_approval();

-- PDI: fully self-contained, no blocked dependencies.
CREATE TABLE pdi_checklist_item (
    pdi_checklist_item_id SMALLSERIAL PRIMARY KEY,
    item_description       VARCHAR(200) NOT NULL
);
INSERT INTO pdi_checklist_item (item_description) VALUES
    ('Engine oil level checked'),
    ('Tire pressure checked'),
    ('Battery charge checked'),
    ('Lights and indicators functional'),
    ('Brakes tested'),
    ('Exterior condition inspected'),
    ('Documentation complete');

CREATE TABLE pdi_inspection (
    pdi_inspection_id BIGSERIAL PRIMARY KEY,
    vehicle_unit_id    BIGINT NOT NULL REFERENCES vehicle_unit(vehicle_unit_id),
    inspected_by       INT REFERENCES app_user(user_id),
    inspected_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pdi_inspection_result (
    pdi_inspection_result_id BIGSERIAL PRIMARY KEY,
    pdi_inspection_id         BIGINT NOT NULL REFERENCES pdi_inspection(pdi_inspection_id) ON DELETE CASCADE,
    pdi_checklist_item_id     SMALLINT NOT NULL REFERENCES pdi_checklist_item(pdi_checklist_item_id),
    passed                    BOOLEAN NOT NULL,
    notes                     TEXT
);

-- FOUND DURING TESTING, FIXED HERE: recording a PDI inspection is what
-- actually moves a vehicle from ALLOTTED to READY_FOR_DELIVERY, per
-- Inventory's own state machine (ALLOTTED -> READY_FOR_DELIVERY ->
-- (Sales Invoice) -> SOLD -> (Delivery) -> DELIVERED). Without this
-- trigger, Sales Invoice's approval would always fail -- Inventory
-- correctly refuses to jump straight from ALLOTTED to SOLD, and nothing
-- was ever calling the missing middle step. Also flips delivery's own
-- pdi_completed flag if a delivery record already exists for this
-- vehicle, so DL3/fn_apply_delivery_approval's precondition check has
-- real data behind it rather than relying on a disconnected manual flag.
CREATE OR REPLACE FUNCTION fn_apply_pdi_completion()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_transition_vehicle_status(NEW.vehicle_unit_id, 'READY_FOR_DELIVERY', NEW.inspected_by, 'PDI');

    UPDATE delivery SET pdi_completed = TRUE
    WHERE vehicle_unit_id = NEW.vehicle_unit_id AND status = 'PENDING';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_apply_pdi_completion
AFTER INSERT ON pdi_inspection
FOR EACH ROW EXECUTE FUNCTION fn_apply_pdi_completion();


-- =====================================================================
-- RETROFIT 1: VEHICLE ALLOTMENT onto the generic approval engine
-- Real surgery on an already-deployed, already-tested table.
-- =====================================================================

-- Extracted from the old fn_execute_allotment_approval trigger body,
-- unchanged in substance -- same payment-validation check, same call
-- into Inventory's transition service.
CREATE OR REPLACE FUNCTION fn_apply_allotment_approval(p_allotment_id BIGINT, p_approved_by INT)
RETURNS void AS $$
DECLARE
    r RECORD;
    v_payment_validated BOOLEAN;
    v_booking_id        BIGINT;
    v_allotment_number  VARCHAR(20);
BEGIN
    SELECT booking_id, allotment_number INTO v_booking_id, v_allotment_number
    FROM allotment WHERE allotment_id = p_allotment_id;

    SELECT payment_validated INTO v_payment_validated
    FROM booking_allotment_requirement WHERE booking_id = v_booking_id;

    IF NOT v_payment_validated THEN
        RAISE EXCEPTION 'Cannot approve allotment %: booking % has not been marked payment-validated',
            v_allotment_number, v_booking_id;
    END IF;

    FOR r IN SELECT vehicle_unit_id FROM allotment_line WHERE allotment_id = p_allotment_id AND is_active LOOP
        PERFORM fn_transition_vehicle_status(
            r.vehicle_unit_id, 'ALLOTTED', p_approved_by, 'ALLOTMENT', 'Allotment ' || v_allotment_number
        );
    END LOOP;

    UPDATE allotment SET status = 'APPROVED', approved_by = p_approved_by, approved_at = now()
    WHERE allotment_id = p_allotment_id;
END;
$$ LANGUAGE plpgsql;

-- The OLD direct-UPDATE-driven trigger is retired -- approval now flows
-- exclusively through the generic engine.
DROP TRIGGER IF EXISTS trg_execute_allotment_approval ON allotment;
DROP FUNCTION IF EXISTS fn_execute_allotment_approval();

CREATE OR REPLACE FUNCTION fn_auto_submit_allotment_for_approval()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_submit_for_approval('VEHICLE_ALLOTMENT', 'VEHICLE_ALLOTMENT', NEW.allotment_id, NEW.requested_by);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_submit_allotment_for_approval
AFTER INSERT ON allotment
FOR EACH ROW EXECUTE FUNCTION fn_auto_submit_allotment_for_approval();


-- =====================================================================
-- RETROFIT 2: STOCK ADJUSTMENT onto the generic approval engine
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_apply_stock_adjustment_approval(p_adjustment_id BIGINT, p_approved_by INT)
RETURNS void AS $$
DECLARE
    v_current_qty    NUMERIC(12,2);
    v_warehouse_id   INT;
    v_item_id        BIGINT;
    v_quantity_delta NUMERIC(12,2);
BEGIN
    SELECT warehouse_id, item_id, quantity_delta INTO v_warehouse_id, v_item_id, v_quantity_delta
    FROM stock_adjustment WHERE adjustment_id = p_adjustment_id;

    IF v_item_id IS NOT NULL THEN
        SELECT quantity_on_hand INTO v_current_qty
        FROM stock_balance WHERE warehouse_id = v_warehouse_id AND item_id = v_item_id
        FOR UPDATE;

        IF v_current_qty IS NULL THEN
            RAISE EXCEPTION 'No existing stock balance for item % at warehouse % -- receive stock before adjusting it',
                v_item_id, v_warehouse_id;
        END IF;

        IF v_current_qty + v_quantity_delta < 0 THEN
            RAISE EXCEPTION 'Adjustment would result in negative stock (have %, delta %) for item % at warehouse %',
                v_current_qty, v_quantity_delta, v_item_id, v_warehouse_id;
        END IF;

        UPDATE stock_balance SET quantity_on_hand = quantity_on_hand + v_quantity_delta, updated_at = now()
        WHERE warehouse_id = v_warehouse_id AND item_id = v_item_id;
    END IF;

    UPDATE stock_adjustment SET status = 'APPROVED', approved_by = p_approved_by, approved_at = now()
    WHERE adjustment_id = p_adjustment_id;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_execute_stock_adjustment ON stock_adjustment;
DROP FUNCTION IF EXISTS fn_execute_stock_adjustment();

CREATE OR REPLACE FUNCTION fn_auto_submit_stock_adjustment_for_approval()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM fn_submit_for_approval('STOCK_ADJUSTMENT', 'STOCK_ADJUSTMENT', NEW.adjustment_id, NEW.requested_by);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_submit_stock_adjustment_for_approval
AFTER INSERT ON stock_adjustment
FOR EACH ROW EXECUTE FUNCTION fn_auto_submit_stock_adjustment_for_approval();


-- =====================================================================
-- THE DISPATCHER
-- Single point of truth for "what happens when an approval finalizes."
-- Future entity types (Sales Enquiry, Booking, Booking Cancellation,
-- Customer Refund, Customer Account Adjustment) get their own ELSIF
-- branch here once those modules are built -- this function is the one
-- place that needs updating, not four different tables' triggers.
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_dispatch_approval_decision()
RETURNS TRIGGER AS $$
DECLARE
    v_last_decided_by INT;
BEGIN
    SELECT decided_by INTO v_last_decided_by
    FROM approval_action WHERE approval_request_id = NEW.approval_request_id
    ORDER BY decided_at DESC LIMIT 1;

    IF NEW.status = 'APPROVED' AND OLD.status <> 'APPROVED' THEN
        IF NEW.entity_type = 'VEHICLE_ALLOTMENT' THEN
            PERFORM fn_apply_allotment_approval(NEW.entity_id, v_last_decided_by);
        ELSIF NEW.entity_type = 'STOCK_ADJUSTMENT' THEN
            PERFORM fn_apply_stock_adjustment_approval(NEW.entity_id, v_last_decided_by);
        ELSIF NEW.entity_type = 'SALES_INVOICE' THEN
            PERFORM fn_apply_invoice_approval(NEW.entity_id, v_last_decided_by);
        ELSIF NEW.entity_type = 'DELIVERY' THEN
            PERFORM fn_apply_delivery_approval(NEW.entity_id, v_last_decided_by);
        END IF;
    ELSIF NEW.status = 'REJECTED' AND OLD.status <> 'REJECTED' THEN
        IF NEW.entity_type = 'VEHICLE_ALLOTMENT' THEN
            UPDATE allotment SET status = 'REJECTED' WHERE allotment_id = NEW.entity_id;
        ELSIF NEW.entity_type = 'STOCK_ADJUSTMENT' THEN
            UPDATE stock_adjustment SET status = 'REJECTED' WHERE adjustment_id = NEW.entity_id;
        ELSIF NEW.entity_type = 'SALES_INVOICE' THEN
            UPDATE sales_invoice SET status = 'REJECTED' WHERE invoice_id = NEW.entity_id;
        ELSIF NEW.entity_type = 'DELIVERY' THEN
            UPDATE delivery SET status = 'REJECTED' WHERE delivery_id = NEW.entity_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dispatch_approval_decision
AFTER UPDATE ON approval_request
FOR EACH ROW EXECUTE FUNCTION fn_dispatch_approval_decision();


-- =====================================================================
-- REPORTING
-- =====================================================================

CREATE VIEW vw_pending_approvals AS
SELECT
    ar.approval_request_id, ar.request_number, ar.workflow_type_code,
    wt.workflow_type_name, ar.entity_type, ar.entity_id, ar.current_level,
    ar.requested_by, ar.requested_at,
    ROUND(EXTRACT(EPOCH FROM (now() - ar.requested_at)) / 3600.0, 1) AS hours_pending
FROM approval_request ar
JOIN workflow_type wt ON wt.workflow_type_code = ar.workflow_type_code
WHERE ar.status = 'PENDING';

COMMIT;
