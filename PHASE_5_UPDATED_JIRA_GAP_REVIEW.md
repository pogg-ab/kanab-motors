# Phase 5 — Updated Jira implementation and gap review

> **20 November 2026 follow-up:** Completed the missing browser controls in `ShipmentOperations.tsx`, integrated into the existing shipment cockpit. Quotations now capture dates/terms and expose evidence/history. Bookings, containers, milestones, insurance and tracking support create/edit workflows, dates, revision reasons and evidence. The overview renders countdowns, actions, changes and notification history; reminder policies and insurance requirements are editable. Backend and frontend builds passed; 21 focused unit tests and 7 isolated PostgreSQL acceptance tests passed. Browser/manual acceptance is intentionally left to the user. Changes are local, not deployed. The older baseline findings below are historical.

Reviewed: 19 November 2026.

> **Implementation follow-up:** The findings below are the pre-change baseline. The current working tree now implements the Phase 5 changes inside the existing `ShipmentsService`, shipment controller/entities and `ShipmentLogisticsCockpit`; the temporary separate Phase Five service/component were removed. The Part 1 manual guide is unchanged. Use the separate [Phase 5 manual guide](C:/Users/hp/Documents/kanab-motors/KANAB_PHASE5_ADMIN_MANUAL_TEST_CASES.md) for 32 acceptance cases covering IMP-23–IMP-32. Manual UAT remains NOT RUN. Apply migration 1711000000013 and restart the updated application before testing.

### Current implementation status

| Task | Implemented change | Status |
| --- | --- | --- |
| IMP-23 | Forwarder management, active validation and tracked changes | Implemented; manual UAT pending |
| IMP-24 | Complete quote inputs, comparison, evidence and visible decision history | Implemented; manual UAT pending |
| IMP-25 | Transactional selection/approval, trusted actors, configured self-approval exception, approved-only assignment | Implemented; manual UAT pending |
| IMP-26 | Existing-booking edits, estimated/actual dates, status validation and change history | Implemented; manual UAT pending |
| IMP-27 | Per-container starts, calculated expiry, counting convention, revisions, uniqueness scope and actual return | Implemented; manual UAT pending |
| IMP-28 | Production/custom milestones, planned/actual dates, completion history and configurable checkpoint rules | Implemented; manual UAT pending |
| IMP-29 | Insurance requirement, currency/validity, accurate status, editable policies and retained evidence | Implemented; manual UAT pending |
| IMP-30 | Full tracking dates/status editing, evidence, outstanding actions and configured progression gates | Implemented; manual UAT pending |
| IMP-31 | Configurable independent reminders, overdue events, local calendar handling, recipient delivery/history, deduplication and return suppression | Implemented; manual UAT pending |
| IMP-32 | Combined overview, deadline countdowns, overdue highlighting and original/revised history | Implemented; manual UAT pending |

Verification: full backend unit suite **168 tests passed**; final focused suites **21 tests passed**; isolated PostgreSQL migration/API acceptance suite **7 tests passed**. Test databases were created separately and removed afterward. These results do not claim live deployment or completed browser/manual acceptance. Configurable business-policy defaults and the 15-minute automatic scan cadence are documented in the manual guide.

---

## Conclusion

**The existing logistics module provides a substantial foundation, but it does not yet satisfy the updated Phase 5 acceptance criteria end to end.** The biggest missing work is the container grace-period lifecycle: explicit start date, calculated expiry, revisions with accountable history, actual empty return, countdowns, and configurable 7/3/1-day plus overdue notifications.

Existing functionality also has API-versus-admin-screen gaps. A field in a database/entity does not mean an administrator can maintain it through the application.

This review covers the supplied **Phase 5 only: IMP-23–IMP-32**. It does not assume the boss's revisions to Phases 6–9. No application code was changed during this review.

## Evidence and limits

- Requirements: latest user-supplied Phase 5 description, including sections 5.1–5.4.
- Implementation: current working tree, including existing uncommitted changes; migrations, entities, DTOs, controllers, services, frontend forms and tests.
- Historical baseline: `TESTING_GUIDE_KMSICAMS-12-PART2.md` and existing story labels in source. These are implementation documentation, **not a versioned copy of the previous Jira description**. Exact wording changes and who introduced them cannot be proven without Jira revision history.
- Validation: ran the existing logistics service unit suite; **9 tests passed, 1 suite passed**. These use mocked repositories and do not establish live database, browser or deployed scheduler behavior.
- No live admin walkthrough, migration execution, or notification delivery verification was performed. “Present” below means evidenced in source, not production acceptance.

## 1. What changed or expanded

| Requirement | Earlier repository evidence | Updated expectation | Assessment |
| --- | --- | --- | --- |
| IMP-27 containers | Container identity, duration, optional manually supplied free-time end and return due dates already exist | Explicit free-time start, calculated expiry, independent container periods, official revisions and return lifecycle | Expanded requirement; existing fields are only a foundation |
| IMP-31 | Old guide/source label this as the logistics overview | Dedicated configurable container free-time/deadline notifications | Confirmed story-ID meaning change relative to repository labels |
| IMP-32 | Old guide starts Phase 6 shipping-document control at IMP-32 | Phase 5 logistics overview, including countdown and actions | Confirmed ID collision; update traceability, do not assume all later IDs simply shift |
| Reminder behavior | Existing scanner issues one empty-return alert within a hard-coded seven-day window | Separate free-time reminders at 7, 3 and 1 calendar days; overdue follow-up; configurable timing; empty-return coverage | Major expansion not implemented |
| Return/history | RETURNED status exists; generic notification/audit infrastructure exists | Actual return date, no reminders after return, preserved original/revised dates and notification history | Partly reusable infrastructure, incomplete workflow |
| Admin data entry | Old guide already describes weights, loading/deadline dates and insurance validity | Updated case continues to need these | Existing UI gaps, not proven newly introduced client changes |

**Important:** the old guide is not reliable as proof of implementation. It describes container status `ON_BOARD`, whereas the current DTO permits LOADED, IN_TRANSIT, DISCHARGED, AT_PORT, DELIVERED and RETURNED. It describes a five-day warning, while current scanner uses seven days. Its scan URL differs from the current `POST /shipments/notifications/scan-alerts` route.

## 2. Story-by-story status

| Story | Already present | Missing/incomplete against updated case | Status |
| --- | --- | --- | --- |
| **IMP-23 — Forwarder master** | Company, country, contact details, active flag; master create/edit/activation UI; active-only listing | Assignment/quotation service paths do not enforce forwarder active status. A filtered dropdown does not enforce this business rule on the server. | Core present; enforcement gap |
| **IMP-24 — Quotations** | Multiple quotes per shipment; freight/currency/transit/destination charges; API validity/date/terms/attachment reference; comparison list; persisted decisions | Admin quote form does not submit validity, quotation date, terms or attachment. Returned decision-history collection is not rendered in the cockpit. | Partial |
| **IMP-25 — Selection and approval** | Separate selection, approval and rejection; reason, actor/date fields; approval permission; decision-history table; normal-path self-approval check | Direct assignment bypasses quote approval; client-provided actor and self-approval flag weaken controls. Admin history presentation incomplete. | Partial; authorization gaps |
| **IMP-26 — Booking/vessel** | Booking reference, forwarder, vessel/voyage, ports, estimated/actual departure and arrival in API/model; create/update endpoints and audit calls | Admin form creates a new CONFIRMED booking; no existing-booking edit flow or actual-date inputs found. Repeated “record/update” use can create additional bookings instead of update. | Backend largely present; admin partial |
| **IMP-27 — Containers/free time** | Multiple containers; number/type; backend payload/gross weight/loading; duration; optional end/return due dates; status; update endpoint | No start date or expiry calculation; no actual return date; no admin update/return workflow; weights/loading/deadlines not entered by current form; no container-number unique constraint found; update audit lacks actor. | Partial; major expanded scope missing |
| **IMP-28 — Milestones** | Separate milestone entity, fixed default list, custom-create API, planned/actual dates, completion identity/time, admin completion toggles | Production completion absent from defaults; no custom-create/planned/actual-date admin controls; no destination-based mandatory milestone configuration found; repeat completion changes lack append-only history. | Partial |
| **IMP-29 — Insurance** | Policy, insurer, coverage, currency, premium, issue/valid-until fields and shipment link; basic policy form | No explicit requirement flag found; UI fixes currency to USD and coverage type to All Risks, omits validity entry; no policy-specific evidence workflow found; display always says ACTIVE. | Partial |
| **IMP-30 — ECTN/cut-offs** | Backend document name/reference/status/submission/deadline/cut-off fields; create/update; generic tracking-deadline alerts | UI fixes document name/status and omits submission/cut-off dates and update flow; missing/overdue cargo-tracking actions are not fully surfaced in overview; stage gates inspect separate compliance/document records, not these tracking records. | Partial |
| **IMP-31 — Container notifications** | Automatic scan every 15 minutes; generic notification history and unique deduplication infrastructure; one empty-return alert; RETURNED excluded | No free-time expiry scan, distinct 7/3/1 reminders, configurable container offsets/recipients, separate overdue event, or business-calendar treatment for this branch. DELIVERED-but-not-returned containers are also excluded. | Required new behavior largely missing |
| **IMP-32 — Logistics overview** | Existing cockpit brings forwarder, quotes, booking, containers, milestones, insurance, tracking and document alerts together | Container cards show granted duration, not remaining days; no free-time expiry/empty-return countdown or overdue highlighting; action list omits these risks. Source still calls this IMP-31. | Core present; updated view partial |

No story is marked fully accepted: this is source review, and each currently has an unresolved acceptance/UI/control issue. This does not mean the module needs rebuilding.

## 3. Priority findings and code evidence

### G01 — Free-time expiry cannot be calculated from an agreed start date

**Priority: High. Stories: IMP-27, IMP-32. New/expanded requirement.**

The entity and DTO have `freeTimeDays` and optional `freeTimeEndDate`, but no `freeTimeStartDate`. Container create saves the DTO; update assigns it directly. Neither computes the expiry. Consequently November 10 + 14 days = November 24 is not an implemented business operation.

Evidence: [container entity](C:/Users/hp/Documents/kanab-motors/backend/src/modules/shipments/entities/shipment-container.entity.ts:42), [container DTO](C:/Users/hp/Documents/kanab-motors/backend/src/modules/shipments/dto/logistics.dto.ts:283), [create/update service](C:/Users/hp/Documents/kanab-motors/backend/src/modules/shipments/services/shipments.service.ts:1505).

Required change: persist start date and agreed counting convention; calculate per container on creation/revision; validate duration/dates and retain old values. Do not infer start from loading or shipment arrival without an agreed rule.

### G02 — Notifications do not implement the updated grace-period rules

**Priority: High. Story: IMP-31. New/expanded requirement.**

The container scanner reads only `emptyReturnDueDate <= now + 7 days`. It never reads `freeTimeEndDate`. Its deduplication key is container plus return deadline, so the first alert prevents additional reminders for the same deadline. Overdue dates satisfy the same condition and get the same “approaching” event; there is no separate transition to overdue follow-up.

It targets fixed role LOGISTICS_OFFICER rather than configurable logistics/operations recipients. It uses timestamp arithmetic rather than the business-date helper later used by payment/L/C alerts. The notification retrieval query accepts all records with null recipient user ID and does not filter them by recipient role, so a stored role label alone does not implement targeted delivery.

Evidence: [scanner](C:/Users/hp/Documents/kanab-motors/backend/src/modules/shipments/services/shipments.service.ts:1890), [container branch](C:/Users/hp/Documents/kanab-motors/backend/src/modules/shipments/services/shipments.service.ts:1907), [notification retrieval](C:/Users/hp/Documents/kanab-motors/backend/src/modules/shipments/services/shipments.service.ts:1855), [15-minute scheduling](C:/Users/hp/Documents/kanab-motors/backend/src/main.ts:249), [deduplication migration](C:/Users/hp/Documents/kanab-motors/backend/src/database/migrations/1711000000008-CompleteJiraAcceptanceGaps.ts:80).

Required change: distinguish free-time expiry and empty-return obligations; configure offsets with default 7/3/1 for free-time; include obligation, deadline revision, offset/event and recipient in deduplication; emit overdue independently; resolve recipients and preserve history. Confirm the allowed delay behind “immediately after expiry” because a 15-minute poll is not instantaneous.

### G03 — Return lifecycle and deadline revisions are incomplete

**Priority: High. Stories: IMP-27, IMP-31. Expanded requirement plus UI gap.**

RETURNED is a valid backend status and scanner excludes it, which is useful existing behavior. However, actual empty-return date is absent and no admin return-confirmation/edit action was found. DELIVERED is also excluded from alerts even though delivery does not necessarily mean the empty container was returned.

Updates capture before/after values through generic audit, but pass `undefined` as actor. Creation has no equivalent audit call. Therefore it would be inaccurate to say there is no history at all, but accountable official-revision history is incomplete.

Evidence: [entity](C:/Users/hp/Documents/kanab-motors/backend/src/modules/shipments/entities/shipment-container.entity.ts:48), [update/audit](C:/Users/hp/Documents/kanab-motors/backend/src/modules/shipments/services/shipments.service.ts:1514), [alert status filter](C:/Users/hp/Documents/kanab-motors/backend/src/modules/shipments/services/shipments.service.ts:1907), [admin creation](C:/Users/hp/Documents/kanab-motors/frontend/src/components/ShipmentLogisticsCockpit.tsx:223).

Required change: actual-return date and authorized confirmation, stop active reminders only when obligation is closed, retain prior notifications, bind audit actor to authenticated user, record revision reason and original/revised dates.

### G04 — Container admin screen cannot maintain the specified information

**Priority: High for admin acceptance. Stories: IMP-27, IMP-32. Mixed existing/new gaps.**

The form submits number, type, seal, duration and LOADED status only. Backend weight/loading/deadline fields are not exposed. Cards display “N Days Free Time”, which is the allowance, not remaining free days. Zero entered days is silently changed to 14 by `Number(freeTimeDays) || 14`.

Evidence: [submission](C:/Users/hp/Documents/kanab-motors/frontend/src/components/ShipmentLogisticsCockpit.tsx:223), [container cards](C:/Users/hp/Documents/kanab-motors/frontend/src/components/ShipmentLogisticsCockpit.tsx:637).

Required change: complete add/edit/view/return UI, calculated expiry, remaining days, distinct return deadline, approaching/overdue indicators and historical revisions. Confirm whether zero days is permitted; reject it explicitly or preserve it rather than silently substituting 14.

### G05 — Approval and active-forwarder rules can be bypassed

**Priority: High. Stories: IMP-23, IMP-25. Existing control gaps.**

Normal quote approval uses SHIPMENTS_QUOTATION_APPROVE and a separation-of-duties check. However, `PATCH /shipments/:id/forwarder/:forwarderId` requires only SHIPMENTS_CREATE and assigns the forwarder directly, without selected/approved quote checks. Assignment, quote creation and quote approval do not verify the forwarder remains active.

Quote DTOs accept `userId`; controllers use authenticated identity only if that value is absent. Approval DTO also accepts `allowSelfApproval`, which the service trusts. Thus server-owned actor/exception controls are not fully enforced even though normal UI flow looks correct.

Evidence: [assignment service](C:/Users/hp/Documents/kanab-motors/backend/src/modules/shipments/services/shipments.service.ts:1246), [assignment and quote routes](C:/Users/hp/Documents/kanab-motors/backend/src/modules/shipments/shipments.controller.ts:393), [approval logic](C:/Users/hp/Documents/kanab-motors/backend/src/modules/shipments/services/shipments.service.ts:1352), [approval DTO](C:/Users/hp/Documents/kanab-motors/backend/src/modules/shipments/dto/logistics.dto.ts:150).

Required change: enforce current active status at selection/approval/assignment; route appointment through the agreed approval policy; always derive actor from authentication; permit exceptions only through explicit server-authorized policy with audit. Confirm whether separate selector/approver is the agreed business rule.

### G06 — Backend fields are missing from admin workflows

**Priority: Medium to High. Existing completeness gaps.**

| Area | Backend support | Admin gap / action |
| --- | --- | --- |
| Quote | Quotation date, validity, additional terms, attachment ID; decision-history query | Add input/upload/view and history panel; validate attachment association |
| Booking | Create/update, actual/estimated dates, status | Edit existing booking and enter actual dates/status; current submit always calls create with CONFIRMED |
| Milestone | Custom name/planned/actual dates at creation; completion actor/time | Add production completion/custom planning/date management; expose responsible user; preserve each change rather than only latest completion values |
| Insurance | Currency and validity dates | Add requirement flag, dates/currency, linked evidence and real validity/status presentation; current badge always ACTIVE |
| ECTN/tracking | Custom name, submission/cut-off, status and update | Add full fields/editing; show missing/late actions; connect relevant progression rules only where agreed |

Evidence: [frontend create handlers](C:/Users/hp/Documents/kanab-motors/frontend/src/components/ShipmentLogisticsCockpit.tsx:127), [milestone service](C:/Users/hp/Documents/kanab-motors/backend/src/modules/shipments/services/shipments.service.ts:1527), [insurance entity](C:/Users/hp/Documents/kanab-motors/backend/src/modules/shipments/entities/shipment-insurance.entity.ts:12), [insurance display](C:/Users/hp/Documents/kanab-motors/frontend/src/components/ShipmentLogisticsCockpit.tsx:752), [tracking DTO](C:/Users/hp/Documents/kanab-motors/backend/src/modules/shipments/dto/logistics.dto.ts:405).

Generic shipment attachments and document controls exist. That is reusable infrastructure, but it does not by itself establish a usable quotation- or policy-specific evidence workflow. Similarly, existing document/compliance stage gates do not automatically enforce the separate cargo-tracking deadline/status records.

### G07 — Overview can conceal unresolved actions

**Priority: Medium. Stories: IMP-26, IMP-30, IMP-32. Existing/new gaps.**

The overview falls back to the first booking when no CONFIRMED booking exists. Its “No confirmed booking” warning is added only if no booking is returned at all; a REQUESTED/CANCELLED-only list can therefore suppress that warning. Its action list covers quotes, booking absence, containers absence and document verification, but not free-time countdowns or tracking cut-off risk.

Evidence: [overview](C:/Users/hp/Documents/kanab-motors/backend/src/modules/shipments/services/shipments.service.ts:1786).

Required change: distinguish “latest booking” from “confirmed booking”; derive actionable container, tracking and coverage indicators from actual dates/statuses.

## 4. Design-rule assessment

| Updated design rule | Assessment |
| --- | --- |
| Quotes separate from incurred costs | Separate quote and cost models; inspected quote flows do not post landed costs. Reuse this design. |
| Multiple independent containers | Existing one-to-many records support this; missing start/calculation/lifecycle work remains per container. |
| Unique container numbers where appropriate | No matching unique constraint found in inspected entity/migrations. Confirm global versus per-shipment/reusable-container rule before adding one. |
| Stage history separate from milestones | Implemented as separate models; preserve this. |
| Estimated versus actual dates | Booking/milestone models distinguish them; admin maintenance incomplete. |
| Destination-based mandatory milestones | Fixed defaults/custom records exist; no applicable mandatory-milestone configuration found. Document requirement configuration is a different feature. |
| Who changed what and when | Some quote/booking audits and milestone completion metadata exist; container/insurance/tracking actor capture and milestone revision history incomplete. |
| Revised free-time history | Generic update snapshots partly reusable; missing start/actual-return fields, actor and revision workflow. |
| Notification history and deduplication | Generic table/index exist; current one-key-per-return-deadline does not support multiple offsets/overdue lifecycle. No need to insist on a separate notification table if shared model is extended correctly. |
| Returned-container suppression | Backend excludes RETURNED; admin return flow/date absent; DELIVERED excluded prematurely. |
| Demurrage/detention costs separate | Existing shipment-cost components can record charges; no automatic tariff penalty calculation found in inspected container logic. Keep tariff-based calculation out until rules are configured. Verify estimated versus actual treatment before acceptance. |

## 5. Implementation order before final manual testing

1. **Container model and rules:** start date, counting convention, actual return, uniqueness policy, validated recalculation and accountable revisions. Migrate existing records without inventing historical start dates.
2. **Container admin workflow:** complete create/edit/return forms, countdowns, separate return deadline and history.
3. **Notifications:** configurable offsets/recipients, independent obligation types, overdue event, correct local dates, returned suppression, DELIVERED handling, revised-deadline deduplication and history.
4. **Authorization:** active-forwarder enforcement, approved appointment path, authenticated audit identity and controlled approval exceptions.
5. **Complete other admin forms:** quote validity/evidence/history, booking updates/actual dates, milestone planning/configuration/history, insurance validity/requirement/evidence and ECTN/cut-offs.
6. **Update story mapping and tests:** Phase 5 now ends at IMP-32; request the updated later phases before relabeling their story IDs.

## 6. Verification performed and tests still needed

Executed from `backend`:

```text
node ./node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/modules/shipments/services/shipments.logistics.spec.ts
Result: 1 suite passed; 9 tests passed.
```

Existing coverage includes forwarder listing, normal quote approval separation, booking/container creation, overview, document/report behavior and payment/L/C reminders. **The passing suite does not test the updated container expiry/reminder rules.**

Add meaningful acceptance tests for:

- November 10 + 14 days = November 24 under agreed convention; multiple containers with different starts/periods; month/year boundaries and zero/negative handling.
- Revised start/duration recalculates correctly and preserves actor/reason/original values.
- Independent 7/3/1 free-time reminders, separate empty-return obligations, overdue escalation/event, exact configured timezone boundaries and configurable offsets.
- Rerun/concurrent scan deduplication without suppressing later offsets or overdue events; changed deadline; actual return; DELIVERED but not RETURNED.
- Inactive forwarder, direct assignment bypass, supplied actor and self-approval exceptions.
- Admin persistence for all newly exposed fields and attachments; booking update must not silently create another record.
- Quoted freight and grace expiry do not silently alter landed costs or create unconfigured penalties.

## 7. Decisions to obtain from the business owner

These decisions refine implementation; they do not prevent fixing the confirmed gaps above.

1. Free-time start event and inclusive/exclusive counting by shipping line/port; any calendar exceptions.
2. Allowed delay for “immediate” overdue notification, channels, logistics/operations recipients and empty-return reminder offsets.
3. Container-number uniqueness/reuse policy and the evidence/reason required for official deadline revisions and return confirmation.
4. Forwarder approval separation and authorized exceptions.
5. Destination-specific required milestones and which ECTN/cut-off conditions block progression versus warn.
6. Updated Phases 6–9 and/or Jira revision history to finish exact change attribution and story mapping.

**Readiness recommendation:** proceed with testing existing basic logistics paths if useful, but do not sign off the updated Phase 5 until the container lifecycle/notifications and identified admin/control gaps are resolved.
