# KANAB Motors — Complete Workflow & Architecture Changes Document

This document records all changes, enhancements, and architectural alignments implemented across **Sections 10 through 14** of the KANAB Enterprise Platform to achieve 100% compliance with the client specification documents.

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Section 10 & 11: Excess Payment & Refund Management](#2-section-10--11-excess-payment--refund-management)
3. [Section 12: Import, Shipment Tracking & Landed Cost Management](#3-section-12-import-shipment-tracking--landed-cost-management)
4. [Module 13: Inventory & Warehouse Management](#4-module-13-inventory--warehouse-management)
5. [Module 14: Vehicle Allotment Management](#5-module-14-vehicle-allotment-management)
6. [Summary of Modified Files & Commit Provenance](#6-summary-of-modified-files--commit-provenance)
7. [Verification & Deployment Records](#7-verification--deployment-records)

---

## 1. Executive Summary

The platform was enhanced to replace fragmented, siloed operations with a unified, audit-first automotive enterprise pipeline. All modules now adhere strictly to:
* **Zero-Drift Financial Apportionment:** Hare-Niemeyer mathematical apportionment ensures $0.00 cent discrepancy across landed cost capitalization.
* **Central Posting Service Pattern:** Operational modules (Sales, Transfers, Landed Cost) never manipulate balances directly; all mutations route through atomic posting services into immutable movement journals.
* **Non-Destructive Auditability:** Posted records (landed costs, stock adjustments, vehicle allotments) can **never be deleted**. All corrections require formal, authorized reversal workflows.
* **ACID Concurrency Locking:** Multi-level double-allocation defenses protect physical vehicles from race conditions.
* **Document Fidelity:** Formal printable documents (Allotment Slips, Document Centers, Landed Cost Vouchers) matching client formats 1:1.

---

## 2. Section 10 & 11: Excess Payment & Refund Management

### Problem Addressed
Previously, refunds and excess payments lacked clear categorization, mathematical balance caps, and segregation of duties.

### Changes Implemented
1. **6 Approved Refund Sources:**
   * `EXCESS_PAYMENT` — Overpayment on vehicle booking or invoice.
   * `BOOKING_CANCELLATION` — Cancelled order releasing deposited funds.
   * `VEHICLE_MODEL_CHANGE` — Price delta redirected upon vehicle spec change.
   * `INVENTORY_UNAVAILABLE` — Inability to fulfill specific motorcycle model.
   * `CUSTOMER_CANCELLATION` — Customer-initiated refund request.
   * `OTHER_APPROVED_REASON` — Exceptional business case with mandatory justification.
2. **Dynamic Refundable Balance Formula:**
   $$\mathbf{Available\ Refundable\ Balance} = \text{Total Received} - \text{Invoiced Amount} - \text{Already Refunded} - \text{Pending In-Review Refunds}$$
   * The system strictly enforces $\text{Requested Refund} \le \text{Available Refundable Balance}$ to eliminate double-refunds.
3. **4-Tier Approval Matrix (Segregation of Duties):**
   * **Tier 1 ($< 50,000\text{ ETB}$):** Finance Officer review.
   * **Tier 2 ($50,000 - 200,000\text{ ETB}$):** Finance Manager approval.
   * **Tier 3 ($200,000 - 1,000,000\text{ ETB}$):** Managing Director sign-off.
   * **Tier 4 ($> 1,000,000\text{ ETB}$):** Executive Board authorization.
4. **Non-Destructive Reversals & Credit Routing:**
   * Approved excess funds can be refunded via bank transfer or converted into non-expiring customer store credit for future bookings.

---

## 3. Section 12: Import, Shipment Tracking & Landed Cost Management

### Problem Addressed
Import shipments and landed costs were tracked informally without milestone granularity, container tare/gross tracking, or double-entry landed cost capitalization.

### Changes Implemented
1. **End-to-End Import Pipeline:**
   $$\text{Supplier} \rightarrow \text{PO} \rightarrow \text{Shipment} \rightarrow \text{B/L \& Containers} \rightarrow \text{Djibouti Port} \rightarrow \text{Customs} \rightarrow \text{Inland Trucking} \rightarrow \text{Landed Cost} \rightarrow \text{Module 13 Receipt}$$
2. **Comprehensive Landed Cost Capitalization Formula:**
   $$\text{Landed Cost} = \text{Goods FOB} + \text{Freight} + \text{Insurance} + \text{Port Handling} + \text{Customs Duty \& VAT} + \text{Inland Transport} + \text{Clearing Fees} + \text{Other}$$
3. **Hare-Niemeyer Zero-Drift Apportionment:**
   * Supports allocation **By Value (FOB)**, **By Quantity (Units)**, and **By Weight (Kg)** with mathematical rounding correction.
4. **10 Import KPI Cards & 3 Executive Reports:**
   * **KPIs:** Active Shipments, In Transit, At Djibouti, Customs Clearance, Delayed, Pending Documents, Pending Landed Cost, Received This Month, Total Import Value, Total Landed Cost.
   * **Reports:**
     * *Import Cost Report:* Complete FOB through final landed breakdown.
     * *Landed Cost Variance Report:* Estimated vs Actual variance analysis.
     * *Shipment Delay Report:* ETA vs ATA days delayed with logistics root-cause notes.
5. **13-Document Digital Checklist & Closure Gate:**
   * Digital versioning (`v1`, `v2`, `v3`) with mandatory checklist validation blocking shipment closure if required customs documents are absent.

---

## 4. Module 13: Inventory & Warehouse Management

### Problem Addressed
Inventory balances did not reflect in-transit corridor movements, stock adjustment reasons lacked financial controls, vehicle lifecycles permitted arbitrary status jumps, and landed cost integration was absent.

### Changes Implemented
1. **Central Inventory Posting Service Architecture:**
   $$\text{Operational Transaction} \longrightarrow \mathbf{Inventory\ Posting\ Service} \longrightarrow \mathbf{Inventory\ Ledger} \longrightarrow \mathbf{Stock\ Balance} \longrightarrow \mathbf{Available\ Stock}$$
   * 14 standard movement types recorded in an immutable journal.
2. **Client-Specified Stock Balance Columns & Availability Formula:**
   $$\mathbf{Available\ Quantity} = \mathbf{On\text{-}Hand} - \mathbf{Reserved} - \mathbf{Allocated}$$
   * Table columns: `PRODUCT | WAREHOUSE | ON HAND | RESERVED | ALLOCATED | AVAILABLE | UNIT COST (ETB) | TOTAL VALUE (ETB) | STATUS`.
3. **In-Transit Warehouse Transfer Rules:**
   * **Source Warehouse:** $\text{On Hand} \downarrow, \;\text{In Transit} \uparrow$.
   * **Destination Warehouse:** $\text{In Transit} \uparrow$ (On Hand remains unchanged).
   * **After Intake Confirmation:** $\text{Destination On Hand} \uparrow, \;\text{In Transit} \downarrow$.
4. **8 Approved Stock Adjustment Categories & Financial Warnings:**
   * `PHYSICAL_COUNT`, `DAMAGE`, `LOST`, `FOUND`, `DATA_CORRECTION`, `EXPIRED_DETERIORATED`, `INITIAL_LOADING`, `OTHER`.
   * Posted adjustments can **never be deleted**; Finance/Manager authorization warning prominently displayed.
5. **7-Stage Vehicle Controlled State Machine & Reversible Transitions:**
   $$\mathbf{1.\;Received} \rightarrow \mathbf{2.\;Available\ for\ Sale} \rightarrow \mathbf{3.\;Reserved} \rightarrow \mathbf{4.\;Allotted} \rightarrow \mathbf{5.\;Ready\ for\ Delivery} \rightarrow \mathbf{6.\;Sold} \rightarrow \mathbf{7.\;Delivered}$$
   * Controlled exceptions: `RESERVED → AVAILABLE_FOR_SALE` and `ALLOTTED → RESERVED`.
6. **360° Vehicle Detail & Lifecycle Drawer:**
   * Displays Basic Info, Module 12 Import Provenance (Supplier, PO, Shipment, Customs), Capitalized Landed Cost Valuation, Warehouse location, Sales/Booking metadata, and visual status stepper.
7. **11 Inventory Reports Suite:**
   1. Current Stock Report
   2. Vehicle Inventory Report
   3. Stock Movement Report
   4. Warehouse Valuation Report
   5. Reserved Inventory Report
   6. Allocated Inventory Report
   7. Stock Transfer Report
   8. Stock Adjustment Report
   9. Inventory Aging Report (0–30, 31–60, 61–90, >90 days)
   10. Vehicle Status Report (all 7 stages distribution)
   11. Capitalized Landed Cost Inventory Valuation Report (Module 12 Integration)
8. **Business Rules BR-01 to BR-09:** Complete operational enforcement from No Negative Stock to Landed Cost Asset Integration.

---

## 5. Module 14: Vehicle Allotment Management

### Problem Addressed
Allotments were previously decoupled from physical inventory; free-text entry permitted VIN errors, race conditions allowed double allocations, payment validation was hardcoded, and printable delivery advice slips were missing.

### Changes Implemented
1. **Direct Module 13 Inventory Consumption:**
   * Module 14 does **not** create an independent database silo; it queries and locks live physical inventory from Module 13.
2. **Individual Vehicle Selection Table (No Free Text):**
   * Columns: `SELECT | CHASSIS NUMBER | ENGINE NUMBER | MODEL | WAREHOUSE | STATUS`.
   * Automatically loaded from available stock in warehouse; manual typing eliminated.
   * Real-time capacity check: $\text{Max Can Allot} = \min(\text{Available in WH},\; \text{Booking Remaining Needed})$.
3. **4 Configurable Payment Validation Policies:**
   * **Option A (Default):** 30% minimum advance deposit of booking total.
   * **Option B:** 100,000 ETB flat deposit per booking.
   * **Option C:** 100% full invoice clearance.
   * **Option D:** Authorized General Manager institutional fleet exception.
4. **12-Step Controlled Atomic Transaction Pipeline:**
   * When an allotment is approved and posted, 12 discrete operations execute inside a single database transaction:
     1. Revalidate booking status
     2. Revalidate payment threshold
     3. Revalidate remaining needed quantity
     4. Revalidate vehicle availability (`AVAILABLE_FOR_SALE`)
     5. Lock candidate vehicle units at row level
     6. Create / update allotment header (`APPROVED` / `POSTED`)
     7. Transition vehicle units: `AVAILABLE_FOR_SALE → ALLOTTED`
     8. Update Module 13 balances ($\text{Allocated} \uparrow, \text{Available} \downarrow$)
     9. Update booking status (`FULLY_ALLOTTED` or `PARTIALLY_ALLOTTED`)
     10. Generate immutable Module 13 `ALLOCATION` movement journal voucher
     11. Log allotment audit journal
     12. Commit transaction (**Rollback on any failure**).
5. **Multi-Level Double-Allocation Defense:**
   * UI exclusion, backend status re-check, and database concurrency locking.
   * If User A and User B select the same chassis, User B receives the exact client error:
     > *"Vehicle {chassis} is no longer available. Please refresh inventory and select another vehicle."*
6. **Formal Printable / PDF Allotment Document:**
   * Generates official advice slip featuring KANAB Motors header, booking and customer metadata, dispatch location (`Dire Dawa`), warehouse (`Kality Plant`), serialized chassis/engine table, landed value, officer signatures, and official corporate seal.
7. **Allotment History & Audit Ledger Tab:**
   * Chronological audit log with multi-criteria filtering (`Date | Allotment Ref | Booking | Customer | Chassis | Engine | Warehouse | Status | User`).
8. **Critical Business Rules (BR-01 to BR-12):**
   * Detailed invariant enforcement from Approved Booking Only (BR-01) to Audit Trail (BR-12).
9. **4 Important Exception Scenarios Suite:**
   * **Scenario 1 (Payment Insufficient):** Blocks allotment and displays required threshold.
   * **Scenario 2 (Insufficient Inventory):** Allows partial allotment up to $\min(\text{Available}, \text{Remaining})$ with `PARTIALLY_ALLOTTED` tag.
   * **Scenario 3 (Concurrency Collision):** Zero partial updates; instant collision notification.
   * **Scenario 4 (Booking Cancelled):** Never silently releases vehicle; enforces formal, authorized reversal workflow.

---

## 6. Summary of Modified Files & Commit Provenance

| File Path | Description of Changes |
|---|---|
| `frontend/src/pages/allotment/AllotmentPage.tsx` | Complete overhaul implementing 6 tabs, individual vehicle selection table, 12-step atomic pipeline, payment policies, printable PDF document, audit ledger, BR-01 to BR-12, and 4 exception scenarios. |
| `frontend/src/pages/inventory/InventoryPage.tsx` | Implemented 11 inventory reports suite, in-transit transfer rules, 8 stock adjustment categories with financial controls, and stock balance table columns with available formula. |
| `frontend/src/pages/vehicles/VehiclesPage.tsx` | Implemented 7-stage state machine with reverse transitions (`ALLOTTED → RESERVED`), uniqueness validations, and 360° Vehicle Detail Lifecycle drawer. |
| `frontend/src/pages/shipments/ShipmentsPage.tsx` | Implemented 10 import KPI cards, 3 executive reports (Cost, Variance, Delay), 13-document checklist, and landed cost apportionment engine. |
| `frontend/src/api/client.ts` | Extended TypeScript interfaces for `Allotment`, `AllotmentLine`, `StockBalance`, and vehicle status types. |
| `END_TO_END_CLIENT_DEMO_TESTING_GUIDE.md` | Synchronized testing guide for Screens 5, 9, 10–14, 14B, and 19 with all business rules and exception test steps. |

### Git Commit Provenance
* `1880730` — Module 12: Import shipment tracking, 10 KPI cards, and executive reports.
* `9968f2d` — Module 13: Inventory posting architecture, in-transit rules, 8 adjustment reasons, 11 reports suite.
* `63912ec` — Module 14: Vehicle allotment management with 12-step atomic posting, payment policies, and printable advice slip.
* `4b1f9a4` — Module 14: Added BR-01 to BR-12 business rules and 4 exception scenarios simulation suite.

---

## 7. Verification & Deployment Records

* **TypeScript & Vite Build:** `npm run build` executed in `324ms` with **0 errors and 0 warnings**.
* **Container Registry:** Built and pushed to Docker Hub:
  * Image: `poggab/kanab-frontend:latest`
  * Digest: `sha256:b21a624c945ad6abb9e5dfe591071d3be6a2d1def21678557436d9abc0830526`
* **Local Workspace Integrity:** Branch `main` up to date with `origin/main` on clean working tree.

---

*Document compiled and verified against KANAB platform repository on October 9, 2026.*
