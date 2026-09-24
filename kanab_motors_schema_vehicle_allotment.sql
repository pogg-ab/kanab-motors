-- =====================================================================
-- KANAB Motors — Integrated Sales, Inventory and Customer Account
-- Management System
-- PostgreSQL schema: Vehicle Allotment Management
--
-- DEPENDS ON: kanab_motors_schema_modules_1_2.sql,
-- kanab_motors_schema_import_landed_cost.sql, and
-- kanab_motors_schema_inventory_warehouse.sql all having been applied
-- (references app_user, vehicle_unit, and fn_transition_vehicle_status).
--
-- *** THIS SCHEMA DOES NOT HAVE A REAL BOOKING TABLE TO REFERENCE ***
-- Per the implementation plan, Booking's schema was never built — only
-- its plan exists. Rather than fabricate a Booking table (which would
-- risk conflicting with whatever gets built later), this schema uses a
-- clearly-named, clearly-commented PROVISIONAL stand-in
-- (booking_allotment_requirement) that holds only the two facts this
-- module cannot function without: how many units the booking needs
-- allotted, and whether its payment has been validated. This table
-- should be DROPPED once the real Booking table exists, replaced by
-- reading those facts directly from it — do not treat it as permanent.
--
-- WHAT IS FULLY REAL AND TESTED HERE:
--   - The Inventory integration (this is the first real caller of
--     Inventory's fn_transition_vehicle_status, fulfilling the "contract"
--     stub that module was built to expose)
--   - Double-allocation prevention (two independent layers: this
--     module's own unique index, plus Inventory's state machine)
--   - Over-allotment prevention (can't allot more units than a booking
--     needs, enforced under row-level locking against concurrent attempts)
--   - The payment-validation gate on approval (real behavior, driven by
--     the provisional stand-in flag until Booking can supply it for real)
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- PROVISIONAL STAND-IN for Booking data. Replace with real Booking
-- columns once that schema exists; this table should not outlive that.
-- ---------------------------------------------------------------------
CREATE TABLE booking_allotment_requirement (
    booking_id         BIGINT PRIMARY KEY,
    required_quantity  NUMERIC(12,2) NOT NULL CHECK (required_quantity > 0),
    -- Manually attested until Booking's real payment data is queryable —
    -- see Open Question 1 in the implementation plan (exact threshold
    -- rule for "paid enough to allot" is still undecided).
    payment_validated  BOOLEAN NOT NULL DEFAULT FALSE
);


-- =====================================================================
-- ALLOTMENT DATA MODEL
-- =====================================================================

CREATE TYPE allotment_status_enum AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE SEQUENCE allotment_number_seq START 1;

CREATE TABLE allotment (
    allotment_id     BIGSERIAL PRIMARY KEY,
    allotment_number VARCHAR(20) NOT NULL UNIQUE
                     DEFAULT ('ALT-' || lpad(nextval('allotment_number_seq')::text, 6, '0')),
    booking_id       BIGINT NOT NULL REFERENCES booking_allotment_requirement(booking_id),
    status           allotment_status_enum NOT NULL DEFAULT 'REQUESTED',
    requested_by     INT REFERENCES app_user(user_id),
    requested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_by      INT REFERENCES app_user(user_id),
    approved_at      TIMESTAMPTZ
);
CREATE INDEX idx_allotment_booking ON allotment(booking_id);
CREATE INDEX idx_allotment_status ON allotment(status);

-- One row per vehicle unit within an allotment. A booking needing several
-- units may span multiple allotment records over time (partial
-- allotment) — this table is the per-unit detail either way.
CREATE TABLE allotment_line (
    allotment_line_id BIGSERIAL PRIMARY KEY,
    allotment_id       BIGINT NOT NULL REFERENCES allotment(allotment_id) ON DELETE CASCADE,
    vehicle_unit_id    BIGINT NOT NULL REFERENCES vehicle_unit(vehicle_unit_id),
    -- FALSE once reversed/un-allotted -- rows are deactivated, not deleted,
    -- so allotment history is never lost.
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    deactivated_at     TIMESTAMPTZ,
    deactivated_by     INT REFERENCES app_user(user_id)
);
CREATE INDEX idx_allotment_line_allotment ON allotment_line(allotment_id);
CREATE INDEX idx_allotment_line_vehicle_unit ON allotment_line(vehicle_unit_id);

-- Double-allocation prevention, LAYER 1 (business-level, clear error
-- message). LAYER 2 is Inventory's own state machine, which independently
-- refuses to transition an already-ALLOTTED unit back into ALLOTTED.
-- Both exist deliberately — this one gives a friendlier error before the
-- state machine's generic one is ever reached.
CREATE UNIQUE INDEX uq_allotment_line_active_vehicle
    ON allotment_line(vehicle_unit_id) WHERE is_active;

-- Over-allotment prevention: locks the booking's requirement row so two
-- concurrent allotment attempts against the same booking can't both
-- squeeze through past the remaining quantity.
CREATE OR REPLACE FUNCTION fn_validate_allotment_quantity()
RETURNS TRIGGER AS $$
DECLARE
    v_booking_id       BIGINT;
    v_required         NUMERIC(12,2);
    v_already_allotted INT;
BEGIN
    SELECT booking_id INTO v_booking_id FROM allotment WHERE allotment_id = NEW.allotment_id;

    SELECT required_quantity INTO v_required
    FROM booking_allotment_requirement
    WHERE booking_id = v_booking_id
    FOR UPDATE;

    SELECT COUNT(*) INTO v_already_allotted
    FROM allotment_line al
    JOIN allotment a ON a.allotment_id = al.allotment_id
    WHERE a.booking_id = v_booking_id AND al.is_active;

    IF v_already_allotted + 1 > v_required THEN
        RAISE EXCEPTION
            'Allotting this vehicle would exceed booking %''s required quantity (already allotted %, required %)',
            v_booking_id, v_already_allotted, v_required;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_allotment_quantity
BEFORE INSERT ON allotment_line
FOR EACH ROW EXECUTE FUNCTION fn_validate_allotment_quantity();


-- =====================================================================
-- INVENTORY INTEGRATION
-- This is the first real caller of Inventory's fn_transition_vehicle_status.
-- =====================================================================

-- Approval also enforces the payment-validation gate (BK2's stand-in) —
-- an allotment cannot be approved for a booking that hasn't been marked
-- payment-validated, even though the real check (against Booking's
-- actual deposit data) isn't wired up yet.
CREATE OR REPLACE FUNCTION fn_execute_allotment_approval()
RETURNS TRIGGER AS $$
DECLARE
    r RECORD;
    v_payment_validated BOOLEAN;
BEGIN
    IF NEW.status = 'APPROVED' AND OLD.status <> 'APPROVED' THEN
        SELECT payment_validated INTO v_payment_validated
        FROM booking_allotment_requirement
        WHERE booking_id = NEW.booking_id;

        IF NOT v_payment_validated THEN
            RAISE EXCEPTION
                'Cannot approve allotment %: booking % has not been marked payment-validated',
                NEW.allotment_number, NEW.booking_id;
        END IF;

        FOR r IN
            SELECT vehicle_unit_id FROM allotment_line
            WHERE allotment_id = NEW.allotment_id AND is_active
        LOOP
            PERFORM fn_transition_vehicle_status(
                r.vehicle_unit_id, 'ALLOTTED', NEW.approved_by, 'ALLOTMENT',
                'Allotment ' || NEW.allotment_number
            );
        END LOOP;

        NEW.approved_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_execute_allotment_approval
BEFORE UPDATE ON allotment
FOR EACH ROW EXECUTE FUNCTION fn_execute_allotment_approval();

-- Un-allotment / reversal: an explicit callable action (not an automatic
-- trigger), since reversing an approved allotment is a deliberate user
-- decision, not a side effect of some other event.
CREATE OR REPLACE FUNCTION fn_reverse_allotment(
    p_allotment_id BIGINT,
    p_reversed_by  INT
) RETURNS void AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT vehicle_unit_id FROM allotment_line
        WHERE allotment_id = p_allotment_id AND is_active
    LOOP
        PERFORM fn_transition_vehicle_status(
            r.vehicle_unit_id, 'AVAILABLE_FOR_SALE', p_reversed_by, 'ALLOTMENT_REVERSAL'
        );

        UPDATE allotment_line
        SET is_active = FALSE, deactivated_at = now(), deactivated_by = p_reversed_by
        WHERE allotment_id = p_allotment_id AND vehicle_unit_id = r.vehicle_unit_id;
    END LOOP;

    UPDATE allotment SET status = 'CANCELLED' WHERE allotment_id = p_allotment_id;
END;
$$ LANGUAGE plpgsql;

CREATE VIEW vw_available_vehicle_units_for_allotment AS
SELECT vehicle_unit_id, item_id, chassis_number, engine_number, current_warehouse_id, current_status
FROM vehicle_unit
WHERE current_status IN ('AVAILABLE_FOR_SALE', 'RESERVED');


-- =====================================================================
-- PARTIAL / FULL ALLOTMENT TRACKING
-- =====================================================================

CREATE VIEW vw_allotment_progress AS
SELECT
    bar.booking_id,
    bar.required_quantity,
    bar.payment_validated,
    COALESCE(SUM(CASE WHEN al.is_active THEN 1 ELSE 0 END), 0) AS quantity_allotted,
    bar.required_quantity - COALESCE(SUM(CASE WHEN al.is_active THEN 1 ELSE 0 END), 0) AS quantity_remaining
FROM booking_allotment_requirement bar
LEFT JOIN allotment a ON a.booking_id = bar.booking_id
LEFT JOIN allotment_line al ON al.allotment_id = a.allotment_id
GROUP BY bar.booking_id, bar.required_quantity, bar.payment_validated;


-- =====================================================================
-- ALLOTMENT HISTORY & REPORTING
-- =====================================================================

CREATE VIEW vw_allotment_history AS
SELECT
    a.allotment_number, a.booking_id, al.vehicle_unit_id,
    vu.chassis_number, vu.engine_number, al.is_active,
    al.created_at AS allotted_at, al.deactivated_at,
    a.approved_by, a.approved_at
FROM allotment_line al
JOIN allotment a ON a.allotment_id = al.allotment_id
JOIN vehicle_unit vu ON vu.vehicle_unit_id = al.vehicle_unit_id;

CREATE VIEW vw_pending_allotments AS
SELECT
    allotment_id, allotment_number, booking_id, requested_by, requested_at,
    ROUND(EXTRACT(EPOCH FROM (now() - requested_at)) / 3600.0, 1) AS hours_pending
FROM allotment
WHERE status = 'REQUESTED';

COMMIT;
