-- =====================================================================
-- KANAB Motors — Integrated Sales, Inventory and Customer Account
-- Management System
-- PostgreSQL schema: Module 1 (Customer and Dealer Management) and
-- Module 2 (Product and Vehicle Master Data)
--
-- SCOPE NOTE: this covers only the two modules requested. Several
-- columns/tables here are foreign-key targets for, or depend on, other
-- modules (User & Role Management, Customer Ledger, Booking, Payment,
-- Refund, Inventory & Warehouse) that are not yet designed. Where that's
-- the case, a MINIMAL stub is created so these two modules aren't
-- blocked, clearly commented as such — see the implementation plan's
-- "Cross-Module Dependencies" section for the full reasoning.
--
-- DESIGN CHOICES WORTH FLAGGING (not silently assumed):
--   - customer_type and vehicle_status use native PostgreSQL ENUM types,
--     since both are small, well-known, stable sets. Trade-off: adding a
--     new value later requires ALTER TYPE ... ADD VALUE (a lightweight
--     but real migration). If you expect either list to change
--     frequently, a lookup table (like product_category/brand below)
--     would be more flexible at the cost of an extra join. Swap this out
--     if that trade-off doesn't suit you.
--   - region is a lookup table, not an enum or free text, pending
--     confirmation of Open Question #1 (does it need a full
--     Region -> Zone -> Town hierarchy?). Easy to extend either way from
--     this starting point.
--   - Mobile number format validation (e.g. Ethiopian local vs.
--     international format) is NOT enforced via CHECK constraint here,
--     since the exact required format wasn't specified — see the
--     commented example near the customer table.
-- =====================================================================

BEGIN;

-- =====================================================================
-- SHARED / FOUNDATIONAL STUBS
-- Minimal tables for entities owned by other modules, needed here only
-- as FK targets. Expect these to be EXTENDED (not replaced) when their
-- owning modules (User & Role Management, Document & Attachment
-- Management, Audit Trail, Inventory & Warehouse) are built.
-- =====================================================================

CREATE TABLE role (
    role_id     SMALLSERIAL PRIMARY KEY,
    role_name   VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE app_user (
    user_id      SERIAL PRIMARY KEY,
    username     VARCHAR(100) NOT NULL UNIQUE,
    full_name    VARCHAR(200) NOT NULL,
    role_id      SMALLINT NOT NULL REFERENCES role(role_id),
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Minimal warehouse lookup (see implementation plan story 2.10): Vehicle
-- Unit needs a warehouse FK now; full warehouse management belongs to the
-- Inventory and Warehouse Management module built in a later phase.
CREATE TABLE warehouse (
    warehouse_id    SERIAL PRIMARY KEY,
    warehouse_name  VARCHAR(150) NOT NULL,
    location        VARCHAR(250),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

-- Generic attachment table, shared across entities (customer documents
-- now; reusable later by other modules per SRS S8.16, Document and
-- Attachment Management).
CREATE TABLE attachment (
    attachment_id   BIGSERIAL PRIMARY KEY,
    entity_type     VARCHAR(50) NOT NULL,   -- e.g. 'customer', 'vehicle_unit'
    entity_id       BIGINT NOT NULL,
    file_name       VARCHAR(255) NOT NULL,
    file_path       TEXT NOT NULL,          -- storage location / URL
    content_type    VARCHAR(100),
    file_size_bytes BIGINT,
    uploaded_by     INT REFERENCES app_user(user_id),
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_attachment_entity ON attachment(entity_type, entity_id);

-- Generic audit log, shared across entities.
CREATE TABLE audit_log (
    audit_id     BIGSERIAL PRIMARY KEY,
    entity_type  VARCHAR(50) NOT NULL,
    entity_id    BIGINT NOT NULL,
    action       VARCHAR(20) NOT NULL,      -- INSERT / UPDATE / DELETE
    changed_by   INT REFERENCES app_user(user_id),
    changed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    old_value    JSONB,
    new_value    JSONB
);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- Shared trigger function: auto-touch updated_at on any UPDATE.
CREATE OR REPLACE FUNCTION fn_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================================
-- MODULE 1: CUSTOMER AND DEALER MANAGEMENT
-- =====================================================================

CREATE TYPE customer_type_enum AS ENUM ('DIRECT_POS', 'DEALER', 'GOVERNMENT');

CREATE TABLE region (
    region_id   SMALLSERIAL PRIMARY KEY,
    region_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE SEQUENCE customer_code_seq START 1;

CREATE TABLE customer (
    customer_id      BIGSERIAL PRIMARY KEY,
    -- Human-facing Customer ID (e.g. CUST-000001), distinct from the
    -- internal PK used for foreign keys.
    customer_code    VARCHAR(20) NOT NULL UNIQUE
                      DEFAULT ('CUST-' || lpad(nextval('customer_code_seq')::text, 6, '0')),
    customer_type    customer_type_enum NOT NULL,
    full_name        VARCHAR(200) NOT NULL,   -- individual name OR organization name
    region_id        SMALLINT REFERENCES region(region_id),
    address_town     VARCHAR(250),
    mobile_number    VARCHAR(20) NOT NULL UNIQUE,
    -- CHECK (mobile_number ~ '^\+?[0-9]{9,15}$'),  -- enable once exact format rules are confirmed
    tin_number       VARCHAR(30),
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_by       INT REFERENCES app_user(user_id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by       INT REFERENCES app_user(user_id),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- TIN required for Dealer/Government customers, optional for
    -- Direct/POS -- per SRS S7.1. A plain column comparison (not a
    -- subquery) so this is valid as a CHECK constraint in Postgres.
    CONSTRAINT chk_tin_required_for_dealer_gov
        CHECK (customer_type NOT IN ('DEALER', 'GOVERNMENT') OR tin_number IS NOT NULL)
);
CREATE INDEX idx_customer_type ON customer(customer_type);
CREATE INDEX idx_customer_region ON customer(region_id);

CREATE TRIGGER trg_customer_touch_updated_at
BEFORE UPDATE ON customer
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

-- "Account information, where applicable" -- banking details, e.g. for
-- refund payouts. One customer may have more than one bank account.
CREATE TABLE customer_bank_account (
    bank_account_id      BIGSERIAL PRIMARY KEY,
    customer_id          BIGINT NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    bank_name            VARCHAR(150) NOT NULL,
    account_number       VARCHAR(50) NOT NULL,
    account_holder_name  VARCHAR(200) NOT NULL,
    branch               VARCHAR(150),
    is_primary           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_customer_bank_account_customer ON customer_bank_account(customer_id);

-- ---------------------------------------------------------------------
-- Customer Account Summary
-- Per implementation plan stories 1.9/1.10: this table exists NOW so the
-- API/UI has something real to read, but its numeric columns are
-- maintained by the Customer Ledger, Booking, Payment, and Refund
-- modules once THEY are built (SRS Phases 6-7) -- they are NOT computed
-- here. Every customer gets a zero-state row via the trigger below.
--
-- "Refund history" and "complete transaction history" from the SRS are
-- deliberately NOT columns here -- they are list views, to be served
-- later by querying the future customer_ledger_transaction / refund
-- tables directly, filtered by customer_id. No schema is needed for
-- those until those modules exist.
-- ---------------------------------------------------------------------
CREATE TABLE customer_account_summary (
    customer_id           BIGINT PRIMARY KEY REFERENCES customer(customer_id) ON DELETE CASCADE,
    total_deposits         NUMERIC(18,2) NOT NULL DEFAULT 0,
    allocated_to_bookings  NUMERIC(18,2) NOT NULL DEFAULT 0,
    outstanding_balance    NUMERIC(18,2) NOT NULL DEFAULT 0,
    available_credit       NUMERIC(18,2) NOT NULL DEFAULT 0,
    excess_payments         NUMERIC(18,2) NOT NULL DEFAULT 0,
    refundable_balance      NUMERIC(18,2) NOT NULL DEFAULT 0,
    last_recalculated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION fn_create_customer_account_summary()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO customer_account_summary (customer_id) VALUES (NEW.customer_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_customer_account_summary
AFTER INSERT ON customer
FOR EACH ROW EXECUTE FUNCTION fn_create_customer_account_summary();


-- =====================================================================
-- MODULE 2: PRODUCT AND VEHICLE MASTER DATA
-- =====================================================================

-- Category/Brand/UoM kept as lookup TABLES rather than enums, since these
-- are more likely to grow over time than customer_type/vehicle_status.
CREATE TABLE product_category (
    category_id   SMALLSERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE  -- e.g. 'MOTORCYCLE', 'THREE_WHEELER', 'IMPORTED_VEHICLE'
);

CREATE TABLE brand (
    brand_id   SMALLSERIAL PRIMARY KEY,
    brand_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE unit_of_measure (
    uom_id   SMALLSERIAL PRIMARY KEY,
    uom_name VARCHAR(30) NOT NULL UNIQUE  -- e.g. 'EACH', 'UNIT'
);

-- NOTE: possible overlap with the Import & Landed Cost module's customs
-- duty/VAT handling (SRS S8.10, Open Question #4) -- confirm whether
-- these should be ONE shared tax engine before extending this table.
CREATE TABLE tax_configuration (
    tax_config_id  SMALLSERIAL PRIMARY KEY,
    tax_name       VARCHAR(100) NOT NULL,          -- e.g. 'Standard VAT 15%'
    tax_rate_pct   NUMERIC(5,2) NOT NULL CHECK (tax_rate_pct >= 0),
    is_active      BOOLEAN NOT NULL DEFAULT TRUE
);

-- item_code is left as a plain required-unique field WITHOUT an
-- auto-generated default (unlike customer_code) -- vehicle/motorcycle
-- item codes are more likely to be externally defined (manufacturer
-- model/SKU codes) than system-generated sequences. Confirm this
-- assumption if item codes should actually be auto-numbered instead.
CREATE TABLE product_item (
    item_id          BIGSERIAL PRIMARY KEY,
    item_code        VARCHAR(30) NOT NULL UNIQUE,
    item_name        VARCHAR(200) NOT NULL,
    category_id      SMALLINT NOT NULL REFERENCES product_category(category_id),
    brand_id         SMALLINT REFERENCES brand(brand_id),
    model            VARCHAR(100),
    uom_id           SMALLINT NOT NULL REFERENCES unit_of_measure(uom_id),
    selling_price    NUMERIC(18,2) NOT NULL CHECK (selling_price > 0),
    tax_config_id    SMALLINT REFERENCES tax_configuration(tax_config_id),
    reorder_level    INT NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_by       INT REFERENCES app_user(user_id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by       INT REFERENCES app_user(user_id),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_item_category ON product_item(category_id);
CREATE INDEX idx_product_item_brand ON product_item(brand_id);

CREATE TRIGGER trg_product_item_touch_updated_at
BEFORE UPDATE ON product_item
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

CREATE TYPE vehicle_status_enum AS ENUM (
    'RECEIVED', 'AVAILABLE_FOR_SALE', 'RESERVED', 'ALLOTTED',
    'READY_FOR_DELIVERY', 'SOLD', 'DELIVERED'
);

-- Individually tracked vehicle unit (one product_item "Model" -> many
-- physical vehicle_unit rows, each with its own chassis/engine number).
--
-- NOTE: this table defines the current_status FIELD and its allowed
-- values only. The actual transitions between statuses (e.g.
-- AVAILABLE_FOR_SALE -> RESERVED -> ALLOTTED -> READY_FOR_DELIVERY ->
-- SOLD -> DELIVERED) are driven by the Inventory, Allotment, Invoice, and
-- Delivery modules built in later phases -- no transition/state-machine
-- logic is implemented here, only a manual default of 'RECEIVED' on
-- insert.
CREATE TABLE vehicle_unit (
    vehicle_unit_id         BIGSERIAL PRIMARY KEY,
    item_id                 BIGINT NOT NULL REFERENCES product_item(item_id),  -- links to the Model
    chassis_number          VARCHAR(50) NOT NULL UNIQUE,
    engine_number           VARCHAR(50) NOT NULL UNIQUE,
    production_import_info  TEXT,
    current_warehouse_id    INT REFERENCES warehouse(warehouse_id),
    current_status          vehicle_status_enum NOT NULL DEFAULT 'RECEIVED',
    created_by              INT REFERENCES app_user(user_id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by              INT REFERENCES app_user(user_id),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vehicle_unit_item ON vehicle_unit(item_id);
CREATE INDEX idx_vehicle_unit_status ON vehicle_unit(current_status);
CREATE INDEX idx_vehicle_unit_warehouse ON vehicle_unit(current_warehouse_id);

CREATE TRIGGER trg_vehicle_unit_touch_updated_at
BEFORE UPDATE ON vehicle_unit
FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

COMMIT;
