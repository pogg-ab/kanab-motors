# Jira Part 1 — implementation update

Updated 17 November 2026. Scope: IMP-01 through IMP-22 and POX-01 through POX-08 in the supplied Jira text. The user confirmed that the current PO print layout is the approved format.

## Overall result

Implementation is complete for all 30 supplied Part 1 tasks, including the two functional gaps identified in the second review. Manual browser/PDF and business acceptance will be performed by the user. No production deployment was performed.

Fixed Ethiopian permit records are no longer created by either direct PO creation or requisition conversion. The destination/mode policy supplies the applicable checklist; actual permit applications are registered explicitly. Existing records are preserved.

Existing pending/applied/submitted permits now support editing application/document references and processing dates through the UI and a permission-protected API. Updates use a row lock and an atomic before/after audit with the authenticated actor. Invalid date ordering and edits to finalized permits are rejected.

The table describes delivered implementation, not production deployment. Existing user changes were retained.

| Task | Feature | Implementation delivered | Verification / remaining acceptance |
|---|---|---|---|
| IMP-01 | Requisition model | Existing header/line model, references, product links and audit fields retained. Planning fields included. | Schema migrations through 0012 applied to isolated database. |
| IMP-02 | Create/edit requisitions | Permissions, authenticated requester/audit identity, editable-state checks and locked editing. | Unit tests pass; isolated test rejected spoofed requester ID. |
| IMP-03 | Approval workflow | Authorized transitions, authenticated actors, decision audit and optimistic state checks against concurrent changes. | Unit tests pass; unauthorized approval rejected in isolated test. |
| IMP-04 | Stock/order review | Receipts deducted from outstanding POs; available stock and open requisitions included. | Unit tests pass; live inventory reconciliation remains an acceptance step. |
| IMP-05 | Demand planning | MOQ, estimated lead time and demand rationale stored and editable in UI; recommendations use supplied MOQ, requested demand and product reorder level. | Source/build verified; browser acceptance pending. |
| IMP-06 | Convert approved requisition | Header row lock, unique source index, valid prices, product descriptions/UOM, company/supplier data and payment/checklist initialization. | Isolated concurrent conversion test produced exactly one PO and one conflict. |
| IMP-07 | Commercial terms | Named place, destination, payment method, inspection flag, calendar/working days and delivery trigger persisted; UI controls added. | Builds pass; isolated database workflow passes. |
| IMP-08 | Proforma/contracts | PO attachment flow integrated with existing document storage and entity-specific permission checks. | Import attachment tests pass; browser upload acceptance pending. |
| IMP-09 | Inspection/warranty/packing | Existing text capture retained; controlled inspection-required flag and readiness validation added. | Source/build verified. |
| IMP-10 | Shipment commercial details | Agreed ports, origin and mode retained on PO; actual logistics remain separate. | Existing implementation retained. |
| IMP-11 | Commercial readiness | Valid Incoterms/modes, destination, commercial fields, configured conditional fields, complete T/T schedules and valid L/C checks. | Unit coverage passes; isolated database confirmation flow passes. |
| POX-01 | Importer profile | Reusable importer IEC/AD profile retained; issued document captures importer data. | Existing profile tests pass. |
| POX-02 | Exporter information | Exporter IEC/AD fields retained; supplier data snapshotted at issuance. | Source/build verified. |
| POX-03 | Importer banks | Active bank selection and company ownership checks; current selected bank snapshotted at approval; legacy snapshot migration prepared. | Snapshot regression passes; migration 0012 successfully applied in isolated database. |
| POX-04 | Line classification | HSN/SAC overrides, validated configured UOM and description snapshots; arbitrary classification defaults removed from service-created lines. | Source/build verified; classification can be required by configured commercial rules. |
| POX-05 | Client PO PDF | Approved existing layout retained; print portal isolates document; repeating table headers and page-break handling; issue/approval information. | Frontend production build passes. Rendered PDF/browser QA pending. |
| POX-06 | Amount in words | Same rounded subtotal drives numeric total and words; cents carry corrected; unknown currency labels no longer silently say Dollars. | Utility tests pass. |
| POX-07 | Standard terms | Central configurable terms with delivery placeholders, issued wording snapshot, amendment reason, prior-document history and resubmission/reapproval. | Source/build verified; amendment acceptance flow pending. |
| POX-08 | Expected delivery | Later of issuance and completed confirmed advance; issuance-only option; calendar/working days and holidays; reversal recalculates eligibility. | Delivery, partial payment and reversal regression tests pass. |
| IMP-12 | Compliance model | Existing transaction-linked model plus renewal relationships; shipment association validated against PO. | Model migration verified through 0011; final API acceptance pending. |
| IMP-13 | Destination checklist | Configurable destination/mode/requirement/authority/checkpoint/evidence policy and UI; fixed country-specific record creation removed from both PO creation paths. | Requirement applicability unit tests pass. Configure confirmed client rules before rollout. |
| IMP-14 | Permit tracking | Registration, audited editing of application/document references and processing dates, renewals, evidence, status decisions and derived expiry; finalized records protected. | Unit and database edit/audit/permission/protection checks pass; manual acceptance owned by user. |
| IMP-15 | Compliance checkpoints | Configured missing/pending/expired/evidence-less permits block PO confirmation, payment, shipment or customs at the designated checkpoint. | Rule unit tests pass; configured confirmation blocking verified in database tests; manual cross-module acceptance owned by user. |
| IMP-16 | Payment model | Percentage/base fields, multiple milestones, advance designation, currencies, due dates and transaction history. | Schema and unit tests pass. |
| IMP-17 | Percentage T/T schedules | Complete schedule editor, exact 100% validation, calculated amounts, caller-base/amount mismatch rejection, due dates, rounding reconciliation and history safeguards. | Percentage and rounding regression tests pass. Isolated database schedule flow passes. |
| IMP-18 | Payment transactions | Initiated/confirmed/rejected/reversed states; finance decisions with reasons; strict balance/currency checks; consistent row locks; evidence retention and authenticated actors. | Payment/evidence unit tests pass. Concurrent database payment confirmation and reversal pass. |
| IMP-19 | Payment/bank rules | Bank/reference requirements, matching currencies, valid issued L/C for L/C payment confirmation, CAD supporting-document requirement. | Method-specific regression tests pass. |
| IMP-20 | L/C tracking | Independent dates, issued-creation and issued-transition checks, controlled status transitions, audit and derived deadline indicators. | L/C unit tests pass. Isolated database L/C checks pass. |
| IMP-21 | Deadline notifications | Independent payment/L/C shipment/L/C expiry upcoming and overdue alerts; calendar-day timezone, configured roles/escalation, cancellation filtering and deduplication. | Notification timezone/escalation regression passes. Default logistics role corrected; database deadline scan passes. |
| IMP-22 | Financial report | All milestones/percentages, confirmed-only paid amounts, overdue amounts and currency-separated totals; cancelled obligations excluded; separate L/C deadline indicators. | Mixed-currency and reconciliation unit tests pass; frontend build passes. |

## Verification results

- Full backend suite: **22 suites, 160 tests passed**.
- Isolated PostgreSQL API acceptance: **4 scenarios passed**, including concurrent conversion, trusted identities/permissions, policy gates, payment schedules, snapshots, concurrent overpayment protection, reversals, and L/C deadlines.
- Extended database assertions pass for absence of fixed permit records after conversion, permitted reference/date edits, persisted audit, forbidden status injection, unauthorized editing and finalized-record protection.
- Backend production build passed.
- Frontend production build passed.
- git diff --check passed.
- Migration 1711000000012 applied successfully to codex_import_acceptance_20261117. The earlier approval-service usage block is resolved.
- The general seed script previously exposed an unrelated missing tax_configuration.calculation_base column. Import acceptance uses targeted fixtures; this unrelated seed issue was not changed.

## Handoff

1. User owns manual browser/PDF, business-rule and target-environment acceptance, as explicitly requested.
2. Configure confirmed client destination requirements, conditional fields, roles, timezone and holidays through Import Policy.
3. Apply migrations and deploy to the intended application environment through the normal release process. Production was not changed.

No known implementation gap from the supplied 30-task report remains. This status does not claim manual acceptance, deployment, or that the live Jira issue was changed.

Legacy bank snapshots preserve values available at migration time and cannot reconstruct older bank changes. Existing paid schedules retain their history.
