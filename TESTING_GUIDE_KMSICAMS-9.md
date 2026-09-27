# KMSICAMS-9 Module: User and Role Management (Role-Based Access Control)
## Enterprise Implementation, Architecture Decision, Rollout Checklist & Verification Guide

---

### 1. Executive Summary & Architecture Overview
**KMSICAMS-9** introduces system-wide Role-Based Access Control (RBAC) to KANAB Motors, replacing stubbed role indicators with an enterprise-grade authorization kernel enforced at both the PostgreSQL database engine layer and NestJS API services.

The system manages **8 Canonical Corporate Roles**, **18 Functional Modules**, and **9 System Actions**, providing a granular 162-cell permission matrix per role alongside row-level security and high-stakes write path interceptors.

---

### 2. Architecture Decisions: V1 — RLS vs. Application-Layer Filtering

| Dimension | Application-Layer Filtering (Primary) | PostgreSQL Row-Level Security (RLS Prototype) |
| :--- | :--- | :--- |
| **Enforcement Point** | NestJS Guards & Service Query Builders | PostgreSQL Database Engine Kernel |
| **Connection Pooling Compatibility** | 100% compatible with shared TypeORM connection pools. | Requires setting session context variable `app.current_user_id` per query or transaction. |
| **Performance Overhead** | Minimal; permission evaluated in memory from cached JWT claims or single index lookup. | Evaluated for every scanned row; can impact bulk sequential scans on multi-million row tables. |
| **Bypass Risk** | Vulnerable if an API handler omits filtering or guard. | Impervious to direct psql or rogue queries; enforced at database engine level. |
| **KANAB Enterprise Decision** | **Dual Defense-in-Depth**: Application-layer filtering serves as primary gateway control, backed by database triggers on write paths and PostgreSQL RLS on core entities (`customer`). |

---

### 3. Core Database Entities & Migrations
Migration: `1710800000000-KMSICAMS9UserRoleRBAC.ts`

1. **`app_user` Enhancements**:
   - `password_hash VARCHAR(255)` — Bcrypt-hashed credentials.
   - `last_login_at TIMESTAMPTZ` — Audit timestamp updated upon successful JWT authentication.
   - `must_change_password BOOLEAN DEFAULT FALSE` — Flag forcing credential reset on initial login.
   - `is_active BOOLEAN DEFAULT TRUE` — Account active/suspended flag.
   - `trg_audit_app_user_status` — DB trigger automatically writing status transitions into `audit_log`.

2. **`role` Enhancements & Protection**:
   - `is_system_role BOOLEAN DEFAULT FALSE` — Built-in protection flag.
   - `trg_protect_system_roles` — DB trigger that **blocks deletion** of built-in system roles with an explicit exception.
   - 8 Canonical Roles:
     1. `ADMIN` (`System Administrator`)
     2. `SALESPERSON` (`Salesperson`)
     3. `SALES_MANAGER` (`Sales Manager`)
     4. `FINANCE_OFFICER` (`Finance Officer`)
     5. `FINANCE_MANAGER` (`Finance Manager`)
     6. `WAREHOUSE_MANAGER` (`Warehouse Manager`)
     7. `APPROVER` (`Approver`)
     8. `MANAGEMENT_USER` (`Management User`)

3. **18 Functional Modules (`system_module`)**:
   - `CUSTOMER`, `PRODUCT`, `ENQUIRY`, `BOOKING`, `PAYMENT`, `LEDGER`, `EXCESS_PAYMENT`, `REFUND`, `IMPORT`, `INVENTORY`, `ALLOTMENT`, `INVOICE`, `DELIVERY`, `APPROVAL_WORKFLOW`, `DOCUMENT`, `DASHBOARD`, `AUDIT`, `USER_ROLE_MGMT`.

4. **9 System Actions (`system_action`)**:
   - `VIEW`, `CREATE`, `EDIT`, `APPROVE`, `CANCEL`, `REFUND`, `ADJUST_BALANCE`, `EXPORT_REPORT`, `MANAGE_USERS`.

5. **Permission Matrix (`role_permission`) & Engine Function**:
   - `role_permission (role_id, module_code, action_code, granted)`
   - Function `fn_user_has_permission(p_user_id INT, p_module_code VARCHAR, p_action_code VARCHAR) RETURNS BOOLEAN`:
     - Denies inactive/suspended users.
     - Grants immediate bypass for Super Administrator (`ADMIN` / `System Administrator` or `ALL_PERMISSIONS`).
     - Evaluates `role_permission` matrix lookup table.
     - Respects user-specific custom permission overrides.

---

### 4. Retrofit: High-Stakes Write Paths (R1, R2, R3)
- **R1: Wire into `fn_record_approval_decision`**:
  - Enforces `fn_user_has_permission(p_decided_by, 'APPROVAL_WORKFLOW', 'APPROVE')` alongside the existing `approval_policy` required role check.
- **R2: Wire into Stock Adjustment creation**:
  - Trigger `trg_check_stock_adjustment_create` validates `fn_user_has_permission(NEW.requested_by, 'INVENTORY', 'CREATE')` before allowing insertion into `stock_adjustment`.
- **R3: Wire into Sales Invoice creation**:
  - Trigger `trg_check_sales_invoice_create` validates `fn_user_has_permission(NEW.created_by, 'INVOICE', 'CREATE')` before allowing insertion into `sales_invoice`.

---

### 5. R4: Rollout Checklist (Remaining Write Paths for Future Phases)

The following write paths are identified across earlier modules and documented for incremental phase-in:

| Module | Write Path / Action | Current Enforcement | Rollout Priority | Planned Trigger / Function |
| :--- | :--- | :--- | :--- | :--- |
| **Booking** | Advance Booking Creation | Controller / Service | Phase 9.1 | `trg_check_booking_create` (`BOOKING:CREATE`) |
| **Booking** | Booking VIN Allocation | Service Allocation Engine | Phase 9.1 | `trg_check_booking_allocate` (`BOOKING:EDIT`) |
| **Booking** | Booking Cancellation | Service Policy Engine | Phase 9.1 | `trg_check_booking_cancel` (`BOOKING:CANCEL`) |
| **Payment** | BRV Deposit Recording | Controller / Service | Phase 9.1 | `trg_check_payment_create` (`PAYMENT:CREATE`) |
| **Payment** | BRV Slip Confirmation | Finance Service | Phase 9.1 | `trg_check_payment_approve` (`PAYMENT:APPROVE`) |
| **Ledger** | Manual Debit/Credit Adjustment | Ledger Service Check | Phase 9.2 | `trg_check_ledger_adjust` (`LEDGER:ADJUST_BALANCE`) |
| **Refund** | Refund Claim Submission | Refund Workflow Service | Phase 9.2 | `trg_check_refund_create` (`REFUND:CREATE`) |
| **Refund** | Bank Refund Disbursement | Disbursement Service | Phase 9.2 | `trg_check_refund_disburse` (`REFUND:REFUND`) |
| **Import** | Purchase Order Confirmation | Logistics Service | Phase 9.3 | `trg_check_po_confirm` (`IMPORT:APPROVE`) |
| **Import** | Landed Cost Expense Allocation | Landed Cost Engine | Phase 9.3 | `trg_check_landed_cost_allocate` (`IMPORT:EDIT`) |
| **Delivery**| Gate Pass & Handover Release | Warehouse Handover Service| Phase 9.3 | `trg_check_delivery_approve` (`DELIVERY:APPROVE`) |

---

### 6. Verification Steps & Test Results

#### Unit & Integration Tests:
- Test command: `npm test` in `backend`
- Results: **11 test suites passed, 66 tests passed (100% passing)**.
- Coverage includes:
  - Password policy validation (rejects passwords without uppercase/number/special char or <8 chars).
  - Unique username & email collision guards.
  - Automatic `last_login_at` timestamp updating on login.
  - Protection of built-in system roles against deletion.
  - Active user assignment guards against role deletion.
  - User status toggling (deactivation/reactivation) and audit logging.
  - Permission matrix assembly (18 modules × 9 actions) and bulk updating.
  - Real-time `fn_user_has_permission` SQL function execution.

#### Frontend UI Capabilities:
- Navigate to `http://localhost:5173/users`:
  1. **Tab 1: Corporate Users Directory**:
     - Metric KPI cards for total accounts, system roles, 18 modules, and security enforcement.
     - Table with Avatar, Full Name, Username, Role (with System Role shield badge), Permissions summary, Last Login, Status toggle, and Edit Privileges button.
     - User Registration modal with interactive real-time password policy checklist and "Force password change upon first login" checkbox.
  2. **Tab 2: Role & Permission Matrix**:
     - Role picker covering the 8 Canonical Roles.
     - 18 Rows (Modules) × 9 Columns (Actions) interactive checkbox grid.
     - Batch controls: "Grant All", "Clear All", "Revert", and "Save Matrix".
     - Notice for System Administrator explaining master kernel privileges.
  3. **Tab 3: Live RBAC Evaluator & QA**:
     - Subject User dropdown, Module dropdown, and Action dropdown.
     - One-click evaluation calling PostgreSQL `fn_user_has_permission()` in real time with diagnostic reasoning and write-path impact analysis.
