import { MigrationInterface, QueryRunner } from 'typeorm';

export class KMSICAMS6InvoiceDeliveryApprovalDocs1710400000000 implements MigrationInterface {
  name = 'KMSICAMS6InvoiceDeliveryApprovalDocs1710400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =====================================================================
    // 0. Update fn_transition_vehicle_status for Full Lifecycle
    // =====================================================================
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_transition_vehicle_status(
          p_vehicle_unit_id BIGINT,
          p_new_status      VARCHAR,
          p_user_id         INT DEFAULT NULL,
          p_action          VARCHAR DEFAULT 'STATUS_TRANSITION',
          p_notes           TEXT DEFAULT NULL
      ) RETURNS void AS $$
      DECLARE
          v_old_status VARCHAR;
      BEGIN
          SELECT current_status INTO v_old_status
          FROM vehicle_unit
          WHERE vehicle_unit_id = p_vehicle_unit_id
          FOR UPDATE;

          IF NOT FOUND THEN
              RAISE EXCEPTION 'Vehicle unit % not found', p_vehicle_unit_id;
          END IF;

          IF v_old_status = p_new_status THEN
              RETURN;
          END IF;

          IF p_new_status = 'ALLOTTED' AND v_old_status NOT IN ('AVAILABLE_FOR_SALE', 'RESERVED') THEN
              RAISE EXCEPTION 'Cannot transition vehicle % to ALLOTTED from status %', p_vehicle_unit_id, v_old_status;
          END IF;

          IF p_new_status = 'READY_FOR_DELIVERY' AND v_old_status NOT IN ('ALLOTTED', 'AVAILABLE_FOR_SALE') THEN
              RAISE EXCEPTION 'Cannot transition vehicle % to READY_FOR_DELIVERY from status %', p_vehicle_unit_id, v_old_status;
          END IF;

          IF p_new_status = 'SOLD' AND v_old_status NOT IN ('READY_FOR_DELIVERY', 'ALLOTTED') THEN
              RAISE EXCEPTION 'Cannot transition vehicle % to SOLD from status %', p_vehicle_unit_id, v_old_status;
          END IF;

          IF p_new_status = 'DELIVERED' AND v_old_status NOT IN ('SOLD', 'READY_FOR_DELIVERY') THEN
              RAISE EXCEPTION 'Cannot transition vehicle % to DELIVERED from status %', p_vehicle_unit_id, v_old_status;
          END IF;

          UPDATE vehicle_unit
          SET current_status = p_new_status::vehicle_status_enum,
              updated_at = now()
          WHERE vehicle_unit_id = p_vehicle_unit_id;

          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
              INSERT INTO audit_log (entity_type, entity_id, action, changed_by, old_value, new_value, created_at)
              VALUES (
                  'vehicle_unit',
                  p_vehicle_unit_id,
                  p_action,
                  p_user_id,
                  jsonb_build_object('status', v_old_status),
                  jsonb_build_object('status', p_new_status, 'notes', p_notes),
                  now()
              );
          END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // =====================================================================
    // 1. GENERIC BOOKING STAND-IN (booking_stub)
    // =====================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS booking_stub (
          booking_id BIGINT PRIMARY KEY REFERENCES booking(booking_id) ON DELETE CASCADE
      );

      INSERT INTO booking_stub (booking_id)
      SELECT booking_id FROM booking
      ON CONFLICT (booking_id) DO NOTHING;

      CREATE OR REPLACE FUNCTION fn_sync_booking_stub()
      RETURNS TRIGGER AS $$
      BEGIN
          INSERT INTO booking_stub (booking_id) VALUES (NEW.booking_id) ON CONFLICT DO NOTHING;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_sync_booking_stub ON booking;
      CREATE TRIGGER trg_sync_booking_stub
      AFTER INSERT ON booking
      FOR EACH ROW EXECUTE FUNCTION fn_sync_booking_stub();

      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_booking_allotment_requirement_stub'
        ) THEN
          ALTER TABLE booking_allotment_requirement
              ADD CONSTRAINT fk_booking_allotment_requirement_stub
              FOREIGN KEY (booking_id) REFERENCES booking_stub(booking_id);
        END IF;
      END $$;
    `);

    // =====================================================================
    // 2. DOCUMENT AND ATTACHMENT MANAGEMENT
    // =====================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_type (
          document_type_code        VARCHAR(50) PRIMARY KEY,
          document_type_name        VARCHAR(150) NOT NULL,
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
          ('OTHER',                'Other',                             NULL)
      ON CONFLICT (document_type_code) DO NOTHING;

      ALTER TABLE attachment ADD COLUMN IF NOT EXISTS document_type_code VARCHAR(50) REFERENCES document_type(document_type_code);

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

      DROP TRIGGER IF EXISTS trg_validate_document_type_entity ON attachment;
      CREATE TRIGGER trg_validate_document_type_entity
      BEFORE INSERT OR UPDATE ON attachment
      FOR EACH ROW EXECUTE FUNCTION fn_validate_document_type_entity();
    `);

    // =====================================================================
    // 3. APPROVAL WORKFLOW AND INTERNAL CONTROLS
    // =====================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workflow_type (
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
          ('DELIVERY',                    'Delivery Authorization')
      ON CONFLICT (workflow_type_code) DO NOTHING;

      CREATE TABLE IF NOT EXISTS approval_policy (
          workflow_type_code VARCHAR(50) NOT NULL REFERENCES workflow_type(workflow_type_code),
          approval_level     SMALLINT NOT NULL CHECK (approval_level > 0),
          required_role_id   SMALLINT NOT NULL REFERENCES role(role_id),
          PRIMARY KEY (workflow_type_code, approval_level)
      );

      -- Default approval policies linked to real roles
      INSERT INTO approval_policy (workflow_type_code, approval_level, required_role_id)
      SELECT 'SALES_ENQUIRY', 1, role_id FROM role WHERE role_name = 'SALES_MANAGER'
      ON CONFLICT DO NOTHING;

      INSERT INTO approval_policy (workflow_type_code, approval_level, required_role_id)
      SELECT 'ADVANCE_PAYMENT', 1, role_id FROM role WHERE role_name = 'FINANCE_MANAGER'
      ON CONFLICT DO NOTHING;

      INSERT INTO approval_policy (workflow_type_code, approval_level, required_role_id)
      SELECT 'BOOKING', 1, role_id FROM role WHERE role_name = 'SALES_MANAGER'
      ON CONFLICT DO NOTHING;

      INSERT INTO approval_policy (workflow_type_code, approval_level, required_role_id)
      SELECT 'VEHICLE_ALLOTMENT', 1, role_id FROM role WHERE role_name = 'SALES_MANAGER'
      ON CONFLICT DO NOTHING;

      INSERT INTO approval_policy (workflow_type_code, approval_level, required_role_id)
      SELECT 'STOCK_ADJUSTMENT', 1, role_id FROM role WHERE role_name = 'WAREHOUSE_MANAGER'
      ON CONFLICT DO NOTHING;

      INSERT INTO approval_policy (workflow_type_code, approval_level, required_role_id)
      SELECT 'SALES_INVOICE', 1, role_id FROM role WHERE role_name = 'FINANCE_MANAGER'
      ON CONFLICT DO NOTHING;

      INSERT INTO approval_policy (workflow_type_code, approval_level, required_role_id)
      SELECT 'BOOKING_CANCELLATION', 1, role_id FROM role WHERE role_name = 'SALES_MANAGER'
      ON CONFLICT DO NOTHING;

      INSERT INTO approval_policy (workflow_type_code, approval_level, required_role_id)
      SELECT 'CUSTOMER_REFUND', 1, role_id FROM role WHERE role_name = 'FINANCE_MANAGER'
      ON CONFLICT DO NOTHING;

      INSERT INTO approval_policy (workflow_type_code, approval_level, required_role_id)
      SELECT 'CUSTOMER_ACCOUNT_ADJUSTMENT', 1, role_id FROM role WHERE role_name = 'FINANCE_MANAGER'
      ON CONFLICT DO NOTHING;

      INSERT INTO approval_policy (workflow_type_code, approval_level, required_role_id)
      SELECT 'DELIVERY', 1, role_id FROM role WHERE role_name = 'SALES_MANAGER'
      ON CONFLICT DO NOTHING;

      DO $$ BEGIN
        CREATE TYPE approval_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE SEQUENCE IF NOT EXISTS approval_request_number_seq START 1;

      CREATE TABLE IF NOT EXISTS approval_request (
          approval_request_id BIGSERIAL PRIMARY KEY,
          request_number       VARCHAR(20) NOT NULL UNIQUE
                               DEFAULT ('APR-' || lpad(nextval('approval_request_number_seq')::text, 6, '0')),
          workflow_type_code   VARCHAR(50) NOT NULL REFERENCES workflow_type(workflow_type_code),
          entity_type          VARCHAR(50) NOT NULL,
          entity_id            BIGINT NOT NULL,
          status               approval_status_enum NOT NULL DEFAULT 'PENDING',
          current_level        SMALLINT NOT NULL DEFAULT 1,
          requested_by         INT REFERENCES app_user(user_id),
          requested_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
          finalized_at         TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_approval_request_entity ON approval_request(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_approval_request_status ON approval_request(status);

      CREATE UNIQUE INDEX IF NOT EXISTS uq_approval_request_pending
          ON approval_request(entity_type, entity_id, workflow_type_code) WHERE status = 'PENDING';

      CREATE TABLE IF NOT EXISTS approval_action (
          approval_action_id   BIGSERIAL PRIMARY KEY,
          approval_request_id  BIGINT NOT NULL REFERENCES approval_request(approval_request_id) ON DELETE CASCADE,
          approval_level       SMALLINT NOT NULL,
          decision              VARCHAR(10) NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED')),
          decided_by            INT REFERENCES app_user(user_id),
          decided_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
          comments              TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_approval_action_request ON approval_action(approval_request_id);

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
          v_decider_role_name VARCHAR;
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

          SELECT u.role_id, r.role_name INTO v_decider_role, v_decider_role_name
          FROM app_user u
          LEFT JOIN role r ON u.role_id = r.role_id
          WHERE u.user_id = p_decided_by;

          -- Role check: required role matches OR decider is ADMIN
          IF v_required_role IS NOT NULL AND v_decider_role IS DISTINCT FROM v_required_role AND v_decider_role_name <> 'ADMIN' THEN
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
    `);

    // =====================================================================
    // 4. SALES INVOICE AND SETTLEMENT MANAGEMENT
    // =====================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE invoice_status_enum AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

      CREATE TABLE IF NOT EXISTS sales_invoice (
          invoice_id          BIGSERIAL PRIMARY KEY,
          invoice_number      VARCHAR(20) NOT NULL UNIQUE
                              DEFAULT ('INV-' || lpad(nextval('invoice_number_seq')::text, 6, '0')),
          booking_id          BIGINT NOT NULL REFERENCES booking_stub(booking_id),
          customer_id         BIGINT NOT NULL REFERENCES customer(customer_id),
          item_id             BIGINT NOT NULL REFERENCES product_item(item_id),
          vehicle_unit_id     BIGINT REFERENCES vehicle_unit(vehicle_unit_id),
          quantity            NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
          unit_price          NUMERIC(18,2) NOT NULL CHECK (unit_price > 0),
          vat_amount          NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (vat_amount >= 0),
          gross_total         NUMERIC(18,2) GENERATED ALWAYS AS (quantity * unit_price + vat_amount) STORED,

          deposits_applied    NUMERIC(18,2) NOT NULL DEFAULT 0,
          outstanding_balance NUMERIC(18,2) GENERATED ALWAYS AS (quantity * unit_price + vat_amount - deposits_applied) STORED,
          excess_payment_flag BOOLEAN NOT NULL DEFAULT FALSE,

          status              invoice_status_enum NOT NULL DEFAULT 'DRAFT',
          created_by          INT REFERENCES app_user(user_id),
          created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_sales_invoice_booking ON sales_invoice(booking_id);
      CREATE INDEX IF NOT EXISTS idx_sales_invoice_customer ON sales_invoice(customer_id);
      CREATE INDEX IF NOT EXISTS idx_sales_invoice_status ON sales_invoice(status);

      CREATE OR REPLACE FUNCTION fn_apply_invoice_approval(p_invoice_id BIGINT, p_approved_by INT)
      RETURNS void AS $$
      DECLARE
          v_vehicle_unit_id BIGINT;
          v_invoice_number  VARCHAR(20);
          v_booking_id      BIGINT;
          v_customer_id     BIGINT;
          v_gross_total     NUMERIC(18,2);
          v_balance         NUMERIC(18,2);
      BEGIN
          SELECT vehicle_unit_id, invoice_number, booking_id, customer_id, gross_total, outstanding_balance
          INTO v_vehicle_unit_id, v_invoice_number, v_booking_id, v_customer_id, v_gross_total, v_balance
          FROM sales_invoice WHERE invoice_id = p_invoice_id;

          IF v_vehicle_unit_id IS NOT NULL THEN
              PERFORM fn_transition_vehicle_status(
                  v_vehicle_unit_id, 'SOLD', p_approved_by, 'SALES_INVOICE', 'Invoice ' || v_invoice_number
              );
          END IF;

          -- Update booking status to SETTLED
          UPDATE booking
          SET booking_status = 'SETTLED', updated_at = now()
          WHERE booking_id = v_booking_id;

          -- Post to customer ledger transaction if table exists
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_ledger_transaction') THEN
              INSERT INTO customer_ledger_transaction (
                  customer_id, transaction_type, debit_amount, credit_amount,
                  running_balance, reference_type, reference_id, description, created_by
              )
              VALUES (
                  v_customer_id,
                  'INVOICE_CHARGE',
                  v_gross_total,
                  0,
                  0,
                  'SALES_INVOICE',
                  v_invoice_number,
                  'Sales Invoice Settlement: ' || v_invoice_number,
                  p_approved_by
              );
          END IF;

          UPDATE sales_invoice SET status = 'APPROVED' WHERE invoice_id = p_invoice_id;
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION fn_auto_submit_invoice_for_approval()
      RETURNS TRIGGER AS $$
      BEGIN
          PERFORM fn_submit_for_approval('SALES_INVOICE', 'SALES_INVOICE', NEW.invoice_id, NEW.created_by);
          UPDATE sales_invoice SET status = 'PENDING_APPROVAL' WHERE invoice_id = NEW.invoice_id;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_auto_submit_invoice_for_approval ON sales_invoice;
      CREATE TRIGGER trg_auto_submit_invoice_for_approval
      AFTER INSERT ON sales_invoice
      FOR EACH ROW EXECUTE FUNCTION fn_auto_submit_invoice_for_approval();
    `);

    // =====================================================================
    // 5. DELIVERY AND HANDOVER MANAGEMENT
    // =====================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE delivery_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE SEQUENCE IF NOT EXISTS delivery_number_seq START 1;

      CREATE TABLE IF NOT EXISTS delivery (
          delivery_id                    BIGSERIAL PRIMARY KEY,
          delivery_number                VARCHAR(20) NOT NULL UNIQUE
                                         DEFAULT ('DEL-' || lpad(nextval('delivery_number_seq')::text, 6, '0')),
          booking_id                     BIGINT NOT NULL REFERENCES booking_stub(booking_id),
          vehicle_unit_id                BIGINT NOT NULL REFERENCES vehicle_unit(vehicle_unit_id),
          delivery_date                  DATE,
          responsible_employee           INT REFERENCES app_user(user_id),
          customer_acknowledged          BOOLEAN NOT NULL DEFAULT FALSE,
          pdi_completed                  BOOLEAN NOT NULL DEFAULT FALSE,
          financial_settlement_validated BOOLEAN NOT NULL DEFAULT FALSE,
          status                         delivery_status_enum NOT NULL DEFAULT 'PENDING',
          delivered_at                   TIMESTAMPTZ,
          created_by                     INT REFERENCES app_user(user_id),
          created_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_delivery_booking ON delivery(booking_id);
      CREATE INDEX IF NOT EXISTS idx_delivery_vehicle_unit ON delivery(vehicle_unit_id);
      CREATE INDEX IF NOT EXISTS idx_delivery_status ON delivery(status);

      CREATE TABLE IF NOT EXISTS pdi_checklist_item (
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
          ('Documentation complete')
      ON CONFLICT DO NOTHING;

      CREATE TABLE IF NOT EXISTS pdi_inspection (
          pdi_inspection_id BIGSERIAL PRIMARY KEY,
          vehicle_unit_id    BIGINT NOT NULL REFERENCES vehicle_unit(vehicle_unit_id),
          inspected_by       INT REFERENCES app_user(user_id),
          inspected_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS pdi_inspection_result (
          pdi_inspection_result_id BIGSERIAL PRIMARY KEY,
          pdi_inspection_id         BIGINT NOT NULL REFERENCES pdi_inspection(pdi_inspection_id) ON DELETE CASCADE,
          pdi_checklist_item_id     SMALLINT NOT NULL REFERENCES pdi_checklist_item(pdi_checklist_item_id),
          passed                    BOOLEAN NOT NULL,
          notes                     TEXT
      );

      CREATE OR REPLACE FUNCTION fn_apply_pdi_completion()
      RETURNS TRIGGER AS $$
      BEGIN
          PERFORM fn_transition_vehicle_status(NEW.vehicle_unit_id, 'READY_FOR_DELIVERY', NEW.inspected_by, 'PDI');

          UPDATE delivery SET pdi_completed = TRUE
          WHERE vehicle_unit_id = NEW.vehicle_unit_id AND status = 'PENDING';

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_apply_pdi_completion ON pdi_inspection;
      CREATE TRIGGER trg_apply_pdi_completion
      AFTER INSERT ON pdi_inspection
      FOR EACH ROW EXECUTE FUNCTION fn_apply_pdi_completion();

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

      DROP TRIGGER IF EXISTS trg_auto_submit_delivery_for_approval ON delivery;
      CREATE TRIGGER trg_auto_submit_delivery_for_approval
      AFTER INSERT ON delivery
      FOR EACH ROW EXECUTE FUNCTION fn_auto_submit_delivery_for_approval();
    `);

    // =====================================================================
    // 6. RETROFITS & DISPATCHER
    // =====================================================================
    await queryRunner.query(`
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

      DROP TRIGGER IF EXISTS trg_execute_allotment_approval ON allotment;
      DROP FUNCTION IF EXISTS fn_execute_allotment_approval();

      CREATE OR REPLACE FUNCTION fn_auto_submit_allotment_for_approval()
      RETURNS TRIGGER AS $$
      BEGIN
          PERFORM fn_submit_for_approval('VEHICLE_ALLOTMENT', 'VEHICLE_ALLOTMENT', NEW.allotment_id, NEW.requested_by);
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_auto_submit_allotment_for_approval ON allotment;
      CREATE TRIGGER trg_auto_submit_allotment_for_approval
      AFTER INSERT ON allotment
      FOR EACH ROW EXECUTE FUNCTION fn_auto_submit_allotment_for_approval();

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
              ELSIF NEW.entity_type = 'SALES_INVOICE' THEN
                  PERFORM fn_apply_invoice_approval(NEW.entity_id, v_last_decided_by);
              ELSIF NEW.entity_type = 'DELIVERY' THEN
                  PERFORM fn_apply_delivery_approval(NEW.entity_id, v_last_decided_by);
              END IF;
          ELSIF NEW.status = 'REJECTED' AND OLD.status <> 'REJECTED' THEN
              IF NEW.entity_type = 'VEHICLE_ALLOTMENT' THEN
                  UPDATE allotment SET status = 'REJECTED' WHERE allotment_id = NEW.entity_id;
              ELSIF NEW.entity_type = 'SALES_INVOICE' THEN
                  UPDATE sales_invoice SET status = 'REJECTED' WHERE invoice_id = NEW.entity_id;
              ELSIF NEW.entity_type = 'DELIVERY' THEN
                  UPDATE delivery SET status = 'REJECTED' WHERE delivery_id = NEW.entity_id;
              END IF;
          END IF;

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_dispatch_approval_decision ON approval_request;
      CREATE TRIGGER trg_dispatch_approval_decision
      AFTER UPDATE ON approval_request
      FOR EACH ROW EXECUTE FUNCTION fn_dispatch_approval_decision();

      CREATE OR REPLACE VIEW vw_pending_approvals AS
      SELECT
          ar.approval_request_id, ar.request_number, ar.workflow_type_code,
          wt.workflow_type_name, ar.entity_type, ar.entity_id, ar.current_level,
          ar.requested_by, ar.requested_at,
          ROUND(EXTRACT(EPOCH FROM (now() - ar.requested_at)) / 3600.0, 1) AS hours_pending
      FROM approval_request ar
      JOIN workflow_type wt ON wt.workflow_type_code = ar.workflow_type_code
      WHERE ar.status = 'PENDING';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS vw_pending_approvals;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_dispatch_approval_decision ON approval_request;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_dispatch_approval_decision;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_auto_submit_delivery_for_approval ON delivery;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_auto_submit_delivery_for_approval;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_apply_delivery_approval;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_apply_pdi_completion ON pdi_inspection;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_apply_pdi_completion;`);
    await queryRunner.query(`DROP TABLE IF EXISTS pdi_inspection_result;`);
    await queryRunner.query(`DROP TABLE IF EXISTS pdi_inspection;`);
    await queryRunner.query(`DROP TABLE IF EXISTS pdi_checklist_item;`);
    await queryRunner.query(`DROP TABLE IF EXISTS delivery;`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS delivery_number_seq;`);
    await queryRunner.query(`DROP TYPE IF EXISTS delivery_status_enum;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_auto_submit_invoice_for_approval ON sales_invoice;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_auto_submit_invoice_for_approval;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_apply_invoice_approval;`);
    await queryRunner.query(`DROP TABLE IF EXISTS sales_invoice;`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS invoice_number_seq;`);
    await queryRunner.query(`DROP TYPE IF EXISTS invoice_status_enum;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_record_approval_decision;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_submit_for_approval;`);
    await queryRunner.query(`DROP TABLE IF EXISTS approval_action;`);
    await queryRunner.query(`DROP TABLE IF EXISTS approval_request;`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS approval_request_number_seq;`);
    await queryRunner.query(`DROP TYPE IF EXISTS approval_status_enum;`);
    await queryRunner.query(`DROP TABLE IF EXISTS approval_policy;`);
    await queryRunner.query(`DROP TABLE IF EXISTS workflow_type;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_validate_document_type_entity ON attachment;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_validate_document_type_entity;`);
    await queryRunner.query(`ALTER TABLE attachment DROP COLUMN IF EXISTS document_type_code;`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_type;`);
    await queryRunner.query(`ALTER TABLE booking_allotment_requirement DROP CONSTRAINT IF EXISTS fk_booking_allotment_requirement_stub;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_sync_booking_stub ON booking;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_sync_booking_stub;`);
    await queryRunner.query(`DROP TABLE IF EXISTS booking_stub CASCADE;`);
  }
}
