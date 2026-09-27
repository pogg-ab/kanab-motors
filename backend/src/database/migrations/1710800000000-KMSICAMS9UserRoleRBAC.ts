import { MigrationInterface, QueryRunner } from 'typeorm';

export class KMSICAMS9UserRoleRBAC1710800000000 implements MigrationInterface {
  name = 'KMSICAMS9UserRoleRBAC1710800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // -------------------------------------------------------------------------
    // 1. Foundational: Expand app_user and role entities (U1, U3)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE app_user ADD COLUMN IF NOT EXISTS email VARCHAR(150) UNIQUE;
      ALTER TABLE app_user ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
      ALTER TABLE app_user ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}';
      ALTER TABLE app_user ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
      ALTER TABLE app_user ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

      ALTER TABLE role ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
      ALTER TABLE role ADD COLUMN IF NOT EXISTS description VARCHAR(255);
      ALTER TABLE role ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}';
      ALTER TABLE role ADD COLUMN IF NOT EXISTS is_system_role BOOLEAN NOT NULL DEFAULT FALSE;
    `);

    // -------------------------------------------------------------------------
    // 2. Protect Built-in System Roles from Deletion (U3)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_protect_system_roles()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.is_system_role = TRUE THEN
          RAISE EXCEPTION 'Cannot delete built-in system role "%" (role_id: %)', OLD.role_name, OLD.role_id;
        END IF;
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_protect_system_roles ON role;
      CREATE TRIGGER trg_protect_system_roles
      BEFORE DELETE ON role
      FOR EACH ROW EXECUTE FUNCTION fn_protect_system_roles();
    `);

    // -------------------------------------------------------------------------
    // 3. User Deactivation/Reactivation Auditing (U5)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_audit_app_user_status()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
          INSERT INTO audit_log (
            entity_type,
            entity_id,
            action,
            changed_by,
            changed_at,
            old_value,
            new_value
          )
          VALUES (
            'app_user',
            NEW.user_id,
            CASE WHEN NEW.is_active THEN 'REACTIVATED' ELSE 'DEACTIVATED' END,
            NULLIF(current_setting('app.current_user_id', true), '')::INT,
            now(),
            jsonb_build_object('is_active', OLD.is_active, 'username', OLD.username),
            jsonb_build_object('is_active', NEW.is_active, 'username', NEW.username)
          );
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_audit_app_user_status ON app_user;
      CREATE TRIGGER trg_audit_app_user_status
      AFTER UPDATE OF is_active ON app_user
      FOR EACH ROW EXECUTE FUNCTION fn_audit_app_user_status();
    `);

    // -------------------------------------------------------------------------
    // 4. Seed/Ensure the 8 KANAB Roles Exist & are Protected System Roles (U4)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      -- Ensure 8 canonical roles
      INSERT INTO role (role_name, display_name, description, is_system_role)
      VALUES 
        ('ADMIN', 'System Administrator', 'Full unrestricted master access across all modules and permissions', TRUE),
        ('SALESPERSON', 'Salesperson', 'Customer onboarding, vehicle enquiries, quotes, and booking submissions', TRUE),
        ('SALES_MANAGER', 'Sales Manager', 'Quotation approvals, booking allocations, cancellations, and sales oversight', TRUE),
        ('FINANCE_OFFICER', 'Finance Officer', 'Bank deposit slip verification, payment recording, and ledger audits', TRUE),
        ('FINANCE_MANAGER', 'Finance Manager', 'Ledger adjustments, refund authorization, fiscal approvals, and financial reporting', TRUE),
        ('WAREHOUSE_MANAGER', 'Warehouse Manager', 'Physical vehicle intake, yard storage, stock adjustments, and gate passes', TRUE),
        ('APPROVER', 'Approver', 'Executive signing authority for quotes, purchase orders, and refund claims', TRUE),
        ('MANAGEMENT_USER', 'Management User', 'Executive read-only access to operational reports and management dashboards', TRUE)
      ON CONFLICT (role_name) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        is_system_role = TRUE;
    `);

    // -------------------------------------------------------------------------
    // 5. Permission Model: Module Reference Data (18 Modules) (P1)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS system_module (
        module_code   VARCHAR(50) PRIMARY KEY,
        module_name   VARCHAR(100) NOT NULL,
        description   TEXT,
        display_order INT DEFAULT 0
      );

      INSERT INTO system_module (module_code, module_name, description, display_order)
      VALUES
        ('CUSTOMER', 'Customer CRM', 'Customer directory, corporate dealers, bank accounts, and compliance documents', 1),
        ('PRODUCT', 'Product Master Data', 'Vehicle models, specifications, categories, brands, and tax configuration', 2),
        ('ENQUIRY', 'Sales Enquiry & Quotes', 'Customer vehicle enquiries, 15% VAT quotations, and price calculations', 3),
        ('BOOKING', 'Advance Bookings', 'Advance order reservations, VIN allocation queue, and cancellation policies', 4),
        ('PAYMENT', 'Payment Receipts (BRV)', 'Bank Receipt Vouchers, deposit slips, payment verification, and receipts', 5),
        ('LEDGER', 'Customer Ledger & SOA', 'Financial engine running balance, SOA generation, and balance adjustments', 6),
        ('EXCESS_PAYMENT', 'Excess Payment Routing', 'Overpayment credit routing, advance allocations, and reconciliation', 7),
        ('REFUND', 'Customer Refunds', 'Multi-tier refund requests, finance audit reviews, and bank disbursements', 8),
        ('IMPORT', 'International Logistics', 'Manufacturers, POs, landed cost engine, and 6-stage logistics pipeline', 9),
        ('INVENTORY', 'Inventory & Warehousing', 'Physical vehicle inventory, chassis/VIN tracking, and stock adjustments', 10),
        ('ALLOTMENT', 'Vehicle Allotment', 'Firm vehicle allotments, VIN reservation locks, and batch releases', 11),
        ('INVOICE', 'Sales Invoices', 'Commercial sales invoices, VAT breakdowns, and 3-way matching', 12),
        ('DELIVERY', 'Delivery & Handover', 'Gate passes, pre-delivery inspections, release orders, and vehicle handover', 13),
        ('APPROVAL_WORKFLOW', 'Approval Workflow Engine', 'Configurable multi-tier approval policies, queues, and audit decisions', 14),
        ('DOCUMENT', 'Document Management', 'Legal attachments, trade licenses, TIN certificates, and import documents', 15),
        ('DASHBOARD', 'Management Dashboards', 'Executive KPIs, pipeline metrics, sales targets, and fiscal analytics', 16),
        ('AUDIT', 'Audit & Compliance', 'Immutable SHA-256 audit logs, system event history, and compliance trails', 17),
        ('USER_ROLE_MGMT', 'User & Role Management (RBAC)', 'Corporate user directory, role configurations, and permission matrix', 18)
      ON CONFLICT (module_code) DO UPDATE SET
        module_name = EXCLUDED.module_name,
        description = EXCLUDED.description,
        display_order = EXCLUDED.display_order;
    `);

    // -------------------------------------------------------------------------
    // 6. Permission Model: Action Reference Data (9 Actions) (P2)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS system_action (
        action_code   VARCHAR(50) PRIMARY KEY,
        action_name   VARCHAR(100) NOT NULL,
        description   TEXT,
        display_order INT DEFAULT 0
      );

      INSERT INTO system_action (action_code, action_name, description, display_order)
      VALUES
        ('VIEW', 'View', 'Inspect records, search directories, and browse detailed views', 1),
        ('CREATE', 'Create', 'Create new records, initiate requests, or draft transactions', 2),
        ('EDIT', 'Edit', 'Modify existing record fields, update status, and revise drafts', 3),
        ('APPROVE', 'Approve', 'Execute formal managerial authorization and sign off workflows', 4),
        ('CANCEL', 'Cancel', 'Cancel transactions, void orders, and revoke pending requests', 5),
        ('REFUND', 'Refund', 'Disburse customer refunds and execute financial repayments', 6),
        ('ADJUST_BALANCE', 'Adjust Balance', 'Post manual debit/credit ledger adjustments or inventory count adjustments', 7),
        ('EXPORT_REPORT', 'Export Report', 'Download and export detailed CSV and official PDF reports', 8),
        ('MANAGE_USERS', 'Manage Users', 'Administer corporate accounts, assign roles, and alter security privileges', 9)
      ON CONFLICT (action_code) DO UPDATE SET
        action_name = EXCLUDED.action_name,
        description = EXCLUDED.description,
        display_order = EXCLUDED.display_order;
    `);

    // -------------------------------------------------------------------------
    // 7. Permission Model: Composite Role-Permission Matrix (P3)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS role_permission (
        role_id     SMALLINT NOT NULL REFERENCES role(role_id) ON DELETE CASCADE,
        module_code VARCHAR(50) NOT NULL REFERENCES system_module(module_code) ON DELETE CASCADE,
        action_code VARCHAR(50) NOT NULL REFERENCES system_action(action_code) ON DELETE CASCADE,
        granted     BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at  TIMESTAMPTZ DEFAULT now(),
        updated_by  INT REFERENCES app_user(user_id),
        PRIMARY KEY (role_id, module_code, action_code)
      );

      CREATE INDEX IF NOT EXISTS idx_role_permission_lookup 
        ON role_permission(role_id, module_code, action_code) WHERE granted = TRUE;
    `);

    // -------------------------------------------------------------------------
    // 8. Permission Model: Generic Permission Check Function (P4)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_user_has_permission(
        p_user_id     INT,
        p_module_code VARCHAR,
        p_action_code VARCHAR
      ) RETURNS BOOLEAN AS $$
      DECLARE
        v_user_active   BOOLEAN;
        v_role_id       SMALLINT;
        v_role_name     VARCHAR;
        v_user_perms    TEXT[];
        v_granted       BOOLEAN;
        v_perm_key      VARCHAR;
        v_perm_key_alt  VARCHAR;
      BEGIN
        IF p_user_id IS NULL THEN
          RETURN FALSE;
        END IF;

        -- 1. Fetch user status, role, and custom permissions
        SELECT u.is_active, u.role_id, r.role_name, u.permissions
        INTO v_user_active, v_role_id, v_role_name, v_user_perms
        FROM app_user u
        LEFT JOIN role r ON u.role_id = r.role_id
        WHERE u.user_id = p_user_id;

        IF NOT FOUND OR v_user_active IS FALSE THEN
          RETURN FALSE;
        END IF;

        -- 2. Super Administrator master bypass
        IF v_role_name IN ('ADMIN', 'System Administrator') THEN
          RETURN TRUE;
        END IF;

        IF v_user_perms IS NOT NULL AND 'ALL_PERMISSIONS' = ANY(v_user_perms) THEN
          RETURN TRUE;
        END IF;

        -- 3. Check role_permission matrix table
        SELECT granted INTO v_granted
        FROM role_permission
        WHERE role_id = v_role_id
          AND module_code = UPPER(p_module_code)
          AND action_code = UPPER(p_action_code);

        IF FOUND AND v_granted IS TRUE THEN
          RETURN TRUE;
        END IF;

        -- 4. Check user custom permission overrides (e.g. CUSTOMER_VIEW or CUSTOMERS_VIEW)
        v_perm_key := UPPER(p_module_code) || '_' || UPPER(p_action_code);
        v_perm_key_alt := UPPER(p_module_code) || 'S_' || UPPER(p_action_code);

        IF v_user_perms IS NOT NULL AND (v_perm_key = ANY(v_user_perms) OR v_perm_key_alt = ANY(v_user_perms)) THEN
          RETURN TRUE;
        END IF;

        RETURN FALSE;
      END;
      $$ LANGUAGE plpgsql STABLE;
    `);

    // -------------------------------------------------------------------------
    // 9. Seed Default Permission Matrix for All 8 Roles (P5)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      DO $$
      DECLARE
        v_admin_id       SMALLINT;
        v_salesperson_id SMALLINT;
        v_sales_mgr_id   SMALLINT;
        v_fin_off_id     SMALLINT;
        v_fin_mgr_id     SMALLINT;
        v_wh_mgr_id      SMALLINT;
        v_approver_id    SMALLINT;
        v_mgmt_id        SMALLINT;
      BEGIN
        SELECT role_id INTO v_admin_id FROM role WHERE role_name IN ('ADMIN', 'System Administrator') LIMIT 1;
        SELECT role_id INTO v_salesperson_id FROM role WHERE role_name IN ('SALESPERSON', 'Salesperson') LIMIT 1;
        SELECT role_id INTO v_sales_mgr_id FROM role WHERE role_name IN ('SALES_MANAGER', 'Sales Manager') LIMIT 1;
        SELECT role_id INTO v_fin_off_id FROM role WHERE role_name IN ('FINANCE_OFFICER', 'Finance Officer') LIMIT 1;
        SELECT role_id INTO v_fin_mgr_id FROM role WHERE role_name IN ('FINANCE_MANAGER', 'Finance Manager') LIMIT 1;
        SELECT role_id INTO v_wh_mgr_id FROM role WHERE role_name IN ('WAREHOUSE_MANAGER', 'Warehouse Manager') LIMIT 1;
        SELECT role_id INTO v_approver_id FROM role WHERE role_name IN ('APPROVER', 'Approver') LIMIT 1;
        SELECT role_id INTO v_mgmt_id FROM role WHERE role_name IN ('MANAGEMENT_USER', 'Management User') LIMIT 1;

        -- Admin: granted across all 18 modules and 9 actions
        IF v_admin_id IS NOT NULL THEN
          INSERT INTO role_permission (role_id, module_code, action_code, granted)
          SELECT v_admin_id, m.module_code, a.action_code, TRUE
          FROM system_module m
          CROSS JOIN system_action a
          ON CONFLICT (role_id, module_code, action_code) DO UPDATE SET granted = TRUE;
        END IF;

        -- Management User: VIEW and EXPORT_REPORT on all modules
        IF v_mgmt_id IS NOT NULL THEN
          INSERT INTO role_permission (role_id, module_code, action_code, granted)
          SELECT v_mgmt_id, m.module_code, a.action_code, TRUE
          FROM system_module m
          CROSS JOIN system_action a
          WHERE a.action_code IN ('VIEW', 'EXPORT_REPORT')
          ON CONFLICT (role_id, module_code, action_code) DO UPDATE SET granted = TRUE;
        END IF;

        -- Salesperson: View + Create on Enquiry, Booking, Customer, Document; View on Product, Payment, Ledger, Inventory, Allotment
        IF v_salesperson_id IS NOT NULL THEN
          INSERT INTO role_permission (role_id, module_code, action_code, granted) VALUES
            (v_salesperson_id, 'CUSTOMER', 'VIEW', TRUE),
            (v_salesperson_id, 'CUSTOMER', 'CREATE', TRUE),
            (v_salesperson_id, 'CUSTOMER', 'EDIT', TRUE),
            (v_salesperson_id, 'PRODUCT', 'VIEW', TRUE),
            (v_salesperson_id, 'ENQUIRY', 'VIEW', TRUE),
            (v_salesperson_id, 'ENQUIRY', 'CREATE', TRUE),
            (v_salesperson_id, 'ENQUIRY', 'EDIT', TRUE),
            (v_salesperson_id, 'BOOKING', 'VIEW', TRUE),
            (v_salesperson_id, 'BOOKING', 'CREATE', TRUE),
            (v_salesperson_id, 'PAYMENT', 'VIEW', TRUE),
            (v_salesperson_id, 'PAYMENT', 'CREATE', TRUE),
            (v_salesperson_id, 'LEDGER', 'VIEW', TRUE),
            (v_salesperson_id, 'INVENTORY', 'VIEW', TRUE),
            (v_salesperson_id, 'ALLOTMENT', 'VIEW', TRUE),
            (v_salesperson_id, 'DOCUMENT', 'VIEW', TRUE),
            (v_salesperson_id, 'DOCUMENT', 'CREATE', TRUE),
            (v_salesperson_id, 'DASHBOARD', 'VIEW', TRUE)
          ON CONFLICT (role_id, module_code, action_code) DO UPDATE SET granted = TRUE;
        END IF;

        -- Sales Manager: Salesperson perms + Approvals, Cancellations, Allocations, Invoices
        IF v_sales_mgr_id IS NOT NULL THEN
          INSERT INTO role_permission (role_id, module_code, action_code, granted) VALUES
            (v_sales_mgr_id, 'CUSTOMER', 'VIEW', TRUE),
            (v_sales_mgr_id, 'CUSTOMER', 'CREATE', TRUE),
            (v_sales_mgr_id, 'CUSTOMER', 'EDIT', TRUE),
            (v_sales_mgr_id, 'CUSTOMER', 'EXPORT_REPORT', TRUE),
            (v_sales_mgr_id, 'PRODUCT', 'VIEW', TRUE),
            (v_sales_mgr_id, 'ENQUIRY', 'VIEW', TRUE),
            (v_sales_mgr_id, 'ENQUIRY', 'CREATE', TRUE),
            (v_sales_mgr_id, 'ENQUIRY', 'EDIT', TRUE),
            (v_sales_mgr_id, 'ENQUIRY', 'APPROVE', TRUE),
            (v_sales_mgr_id, 'ENQUIRY', 'CANCEL', TRUE),
            (v_sales_mgr_id, 'ENQUIRY', 'EXPORT_REPORT', TRUE),
            (v_sales_mgr_id, 'BOOKING', 'VIEW', TRUE),
            (v_sales_mgr_id, 'BOOKING', 'CREATE', TRUE),
            (v_sales_mgr_id, 'BOOKING', 'EDIT', TRUE),
            (v_sales_mgr_id, 'BOOKING', 'APPROVE', TRUE),
            (v_sales_mgr_id, 'BOOKING', 'CANCEL', TRUE),
            (v_sales_mgr_id, 'BOOKING', 'EXPORT_REPORT', TRUE),
            (v_sales_mgr_id, 'ALLOTMENT', 'VIEW', TRUE),
            (v_sales_mgr_id, 'ALLOTMENT', 'CREATE', TRUE),
            (v_sales_mgr_id, 'ALLOTMENT', 'EDIT', TRUE),
            (v_sales_mgr_id, 'ALLOTMENT', 'APPROVE', TRUE),
            (v_sales_mgr_id, 'ALLOTMENT', 'CANCEL', TRUE),
            (v_sales_mgr_id, 'INVOICE', 'VIEW', TRUE),
            (v_sales_mgr_id, 'DELIVERY', 'VIEW', TRUE),
            (v_sales_mgr_id, 'PAYMENT', 'VIEW', TRUE),
            (v_sales_mgr_id, 'PAYMENT', 'CREATE', TRUE),
            (v_sales_mgr_id, 'LEDGER', 'VIEW', TRUE),
            (v_sales_mgr_id, 'DOCUMENT', 'VIEW', TRUE),
            (v_sales_mgr_id, 'DOCUMENT', 'CREATE', TRUE),
            (v_sales_mgr_id, 'DASHBOARD', 'VIEW', TRUE),
            (v_sales_mgr_id, 'DASHBOARD', 'EXPORT_REPORT', TRUE)
          ON CONFLICT (role_id, module_code, action_code) DO UPDATE SET granted = TRUE;
        END IF;

        -- Finance Officer: Payments, Ledger, Excess, Refunds (drafting/review)
        IF v_fin_off_id IS NOT NULL THEN
          INSERT INTO role_permission (role_id, module_code, action_code, granted) VALUES
            (v_fin_off_id, 'CUSTOMER', 'VIEW', TRUE),
            (v_fin_off_id, 'BOOKING', 'VIEW', TRUE),
            (v_fin_off_id, 'PAYMENT', 'VIEW', TRUE),
            (v_fin_off_id, 'PAYMENT', 'CREATE', TRUE),
            (v_fin_off_id, 'PAYMENT', 'EDIT', TRUE),
            (v_fin_off_id, 'LEDGER', 'VIEW', TRUE),
            (v_fin_off_id, 'EXCESS_PAYMENT', 'VIEW', TRUE),
            (v_fin_off_id, 'EXCESS_PAYMENT', 'EDIT', TRUE),
            (v_fin_off_id, 'REFUND', 'VIEW', TRUE),
            (v_fin_off_id, 'REFUND', 'CREATE', TRUE),
            (v_fin_off_id, 'INVOICE', 'VIEW', TRUE),
            (v_fin_off_id, 'DASHBOARD', 'VIEW', TRUE)
          ON CONFLICT (role_id, module_code, action_code) DO UPDATE SET granted = TRUE;
        END IF;

        -- Finance Manager: Full financial suite + refunds, ledger adjustments, invoice approvals
        IF v_fin_mgr_id IS NOT NULL THEN
          INSERT INTO role_permission (role_id, module_code, action_code, granted) VALUES
            (v_fin_mgr_id, 'CUSTOMER', 'VIEW', TRUE),
            (v_fin_mgr_id, 'CUSTOMER', 'EXPORT_REPORT', TRUE),
            (v_fin_mgr_id, 'BOOKING', 'VIEW', TRUE),
            (v_fin_mgr_id, 'PAYMENT', 'VIEW', TRUE),
            (v_fin_mgr_id, 'PAYMENT', 'CREATE', TRUE),
            (v_fin_mgr_id, 'PAYMENT', 'EDIT', TRUE),
            (v_fin_mgr_id, 'PAYMENT', 'APPROVE', TRUE),
            (v_fin_mgr_id, 'PAYMENT', 'CANCEL', TRUE),
            (v_fin_mgr_id, 'PAYMENT', 'EXPORT_REPORT', TRUE),
            (v_fin_mgr_id, 'LEDGER', 'VIEW', TRUE),
            (v_fin_mgr_id, 'LEDGER', 'EDIT', TRUE),
            (v_fin_mgr_id, 'LEDGER', 'ADJUST_BALANCE', TRUE),
            (v_fin_mgr_id, 'LEDGER', 'EXPORT_REPORT', TRUE),
            (v_fin_mgr_id, 'EXCESS_PAYMENT', 'VIEW', TRUE),
            (v_fin_mgr_id, 'EXCESS_PAYMENT', 'EDIT', TRUE),
            (v_fin_mgr_id, 'EXCESS_PAYMENT', 'APPROVE', TRUE),
            (v_fin_mgr_id, 'EXCESS_PAYMENT', 'CANCEL', TRUE),
            (v_fin_mgr_id, 'REFUND', 'VIEW', TRUE),
            (v_fin_mgr_id, 'REFUND', 'CREATE', TRUE),
            (v_fin_mgr_id, 'REFUND', 'APPROVE', TRUE),
            (v_fin_mgr_id, 'REFUND', 'REFUND', TRUE),
            (v_fin_mgr_id, 'REFUND', 'CANCEL', TRUE),
            (v_fin_mgr_id, 'REFUND', 'EXPORT_REPORT', TRUE),
            (v_fin_mgr_id, 'INVOICE', 'VIEW', TRUE),
            (v_fin_mgr_id, 'INVOICE', 'CREATE', TRUE),
            (v_fin_mgr_id, 'INVOICE', 'APPROVE', TRUE),
            (v_fin_mgr_id, 'INVOICE', 'EXPORT_REPORT', TRUE),
            (v_fin_mgr_id, 'AUDIT', 'VIEW', TRUE),
            (v_fin_mgr_id, 'AUDIT', 'EXPORT_REPORT', TRUE),
            (v_fin_mgr_id, 'DASHBOARD', 'VIEW', TRUE),
            (v_fin_mgr_id, 'DASHBOARD', 'EXPORT_REPORT', TRUE)
          ON CONFLICT (role_id, module_code, action_code) DO UPDATE SET granted = TRUE;
        END IF;

        -- Warehouse Manager: Inventory, Deliveries, Stock Adjustments, Import receiving
        IF v_wh_mgr_id IS NOT NULL THEN
          INSERT INTO role_permission (role_id, module_code, action_code, granted) VALUES
            (v_wh_mgr_id, 'PRODUCT', 'VIEW', TRUE),
            (v_wh_mgr_id, 'INVENTORY', 'VIEW', TRUE),
            (v_wh_mgr_id, 'INVENTORY', 'CREATE', TRUE),
            (v_wh_mgr_id, 'INVENTORY', 'EDIT', TRUE),
            (v_wh_mgr_id, 'INVENTORY', 'APPROVE', TRUE),
            (v_wh_mgr_id, 'INVENTORY', 'ADJUST_BALANCE', TRUE),
            (v_wh_mgr_id, 'INVENTORY', 'EXPORT_REPORT', TRUE),
            (v_wh_mgr_id, 'ALLOTMENT', 'VIEW', TRUE),
            (v_wh_mgr_id, 'DELIVERY', 'VIEW', TRUE),
            (v_wh_mgr_id, 'DELIVERY', 'CREATE', TRUE),
            (v_wh_mgr_id, 'DELIVERY', 'EDIT', TRUE),
            (v_wh_mgr_id, 'DELIVERY', 'APPROVE', TRUE),
            (v_wh_mgr_id, 'DELIVERY', 'EXPORT_REPORT', TRUE),
            (v_wh_mgr_id, 'IMPORT', 'VIEW', TRUE),
            (v_wh_mgr_id, 'IMPORT', 'EDIT', TRUE),
            (v_wh_mgr_id, 'DOCUMENT', 'VIEW', TRUE),
            (v_wh_mgr_id, 'DOCUMENT', 'CREATE', TRUE),
            (v_wh_mgr_id, 'DASHBOARD', 'VIEW', TRUE)
          ON CONFLICT (role_id, module_code, action_code) DO UPDATE SET granted = TRUE;
        END IF;

        -- Approver: Multi-module workflow approval rights
        IF v_approver_id IS NOT NULL THEN
          INSERT INTO role_permission (role_id, module_code, action_code, granted) VALUES
            (v_approver_id, 'ENQUIRY', 'VIEW', TRUE),
            (v_approver_id, 'ENQUIRY', 'APPROVE', TRUE),
            (v_approver_id, 'BOOKING', 'VIEW', TRUE),
            (v_approver_id, 'BOOKING', 'APPROVE', TRUE),
            (v_approver_id, 'PAYMENT', 'VIEW', TRUE),
            (v_approver_id, 'PAYMENT', 'APPROVE', TRUE),
            (v_approver_id, 'REFUND', 'VIEW', TRUE),
            (v_approver_id, 'REFUND', 'APPROVE', TRUE),
            (v_approver_id, 'ALLOTMENT', 'VIEW', TRUE),
            (v_approver_id, 'ALLOTMENT', 'APPROVE', TRUE),
            (v_approver_id, 'INVOICE', 'VIEW', TRUE),
            (v_approver_id, 'INVOICE', 'APPROVE', TRUE),
            (v_approver_id, 'DELIVERY', 'VIEW', TRUE),
            (v_approver_id, 'DELIVERY', 'APPROVE', TRUE),
            (v_approver_id, 'APPROVAL_WORKFLOW', 'VIEW', TRUE),
            (v_approver_id, 'APPROVAL_WORKFLOW', 'APPROVE', TRUE),
            (v_approver_id, 'DASHBOARD', 'VIEW', TRUE)
          ON CONFLICT (role_id, module_code, action_code) DO UPDATE SET granted = TRUE;
        END IF;
      END $$;
    `);

    // -------------------------------------------------------------------------
    // 10. Retrofit High-Stakes Write Path R1: fn_record_approval_decision
    // -------------------------------------------------------------------------
    await queryRunner.query(`
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

          -- KMSICAMS-9 Generalized RBAC check: Decider must have APPROVE on APPROVAL_WORKFLOW
          IF NOT fn_user_has_permission(p_decided_by, 'APPROVAL_WORKFLOW', 'APPROVE') THEN
              RAISE EXCEPTION 'User % does not possess APPROVE permission on APPROVAL_WORKFLOW module', p_decided_by;
          END IF;

          SELECT required_role_id INTO v_required_role
          FROM approval_policy
          WHERE workflow_type_code = v_request.workflow_type_code AND approval_level = v_request.current_level;

          SELECT u.role_id, r.role_name INTO v_decider_role, v_decider_role_name
          FROM app_user u
          LEFT JOIN role r ON u.role_id = r.role_id
          WHERE u.user_id = p_decided_by;

          -- Role check: required role matches OR decider is ADMIN / System Administrator
          IF v_required_role IS NOT NULL AND v_decider_role IS DISTINCT FROM v_required_role AND v_decider_role_name NOT IN ('ADMIN', 'System Administrator') THEN
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

    // -------------------------------------------------------------------------
    // 11. Retrofit High-Stakes Write Path R2: Stock Adjustment Creation
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_check_stock_adjustment_create_permission()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.requested_by IS NOT NULL THEN
          IF NOT fn_user_has_permission(NEW.requested_by, 'INVENTORY', 'CREATE') THEN
            RAISE EXCEPTION 'User % does not possess CREATE permission on INVENTORY module to initiate stock adjustments', NEW.requested_by;
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_check_stock_adjustment_create ON stock_adjustment;
      CREATE TRIGGER trg_check_stock_adjustment_create
      BEFORE INSERT ON stock_adjustment
      FOR EACH ROW EXECUTE FUNCTION fn_check_stock_adjustment_create_permission();
    `);

    // -------------------------------------------------------------------------
    // 12. Retrofit High-Stakes Write Path R3: Sales Invoice Creation
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_check_sales_invoice_create_permission()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.created_by IS NOT NULL THEN
          IF NOT fn_user_has_permission(NEW.created_by, 'INVOICE', 'CREATE') THEN
            RAISE EXCEPTION 'User % does not possess CREATE permission on INVOICE module to generate sales invoices', NEW.created_by;
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_check_sales_invoice_create ON sales_invoice;
      CREATE TRIGGER trg_check_sales_invoice_create
      BEFORE INSERT ON sales_invoice
      FOR EACH ROW EXECUTE FUNCTION fn_check_sales_invoice_create_permission();
    `);

    // -------------------------------------------------------------------------
    // 13. View / Export Enforcement: Row-Level Security Prototype on Customer (V1, V2)
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE customer ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS customer_rbac_select_policy ON customer;
      CREATE POLICY customer_rbac_select_policy ON customer
        FOR SELECT
        USING (
          current_setting('app.current_user_id', true) IS NULL
          OR current_setting('app.current_user_id', true) = ''
          OR fn_user_has_permission(current_setting('app.current_user_id', true)::INT, 'CUSTOMER', 'VIEW')
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS customer_rbac_select_policy ON customer;`);
    await queryRunner.query(`ALTER TABLE customer DISABLE ROW LEVEL SECURITY;`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_check_sales_invoice_create ON sales_invoice;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_check_sales_invoice_create_permission;`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_check_stock_adjustment_create ON stock_adjustment;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_check_stock_adjustment_create_permission;`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_audit_app_user_status ON app_user;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_audit_app_user_status;`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_protect_system_roles ON role;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_protect_system_roles;`);

    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_user_has_permission;`);
    await queryRunner.query(`DROP TABLE IF EXISTS role_permission;`);
    await queryRunner.query(`DROP TABLE IF EXISTS system_action;`);
    await queryRunner.query(`DROP TABLE IF EXISTS system_module;`);

    await queryRunner.query(`
      ALTER TABLE role DROP COLUMN IF EXISTS is_system_role;
      ALTER TABLE role DROP COLUMN IF EXISTS display_name;
      ALTER TABLE app_user DROP COLUMN IF EXISTS must_change_password;
      ALTER TABLE app_user DROP COLUMN IF EXISTS last_login_at;
    `);
  }
}
