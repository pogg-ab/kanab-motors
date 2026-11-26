# KANAB Motors — Phase 5 Admin Manual Test Cases

Scope: updated Phase 5, IMP-23–IMP-32. Prepared 19 November 2026.

**Manual execution status: NOT RUN.** This is a separate guide; the Part 1 test document is unchanged. Automated verification is documented separately and does not replace your manual acceptance.

## 1. Before you start

1. Use your test environment, not live commercial shipments.
2. Deploy/restart the updated backend and frontend. Ensure migration **1711000000013 — CompletePhaseFive** has run. It adds container start/return/revision fields, insurance requirement, logistics policy and change history. Existing container dates are retained; no historical start dates are guessed.
3. If your normal startup does not apply migrations, run `npm --prefix backend run migration:run` from the project folder, then restart the backend. Have the deployment owner do this if you only have browser access.
4. Sign in with your assigned ADMIN account. Do not assume the example test-user credentials from automated tests exist in your environment.
5. Open **Suppliers Master → Freight Forwarders**. Then open **Shipments → select shipment → Logistics & Booking** (or the equivalent logistics tab). The workspace heading is **Shipment logistics — Phase 5**.
6. Record environment URL, build, tester, date, shipment numbers and existing policy values. Keep screenshots/PDFs and defect references.
7. Prepare another authorized quotation approver, a restricted user, and active users in the responsible reminder roles. An ADMIN account alone cannot prove restricted-user denial. If only one administrator is available, the policy allows an explicit self-approval exception; test both disabled and enabled settings and restore the agreed setting afterward.
8. Use **Refresh logistics** after changes and after scheduler runs. Most successful saves refresh automatically.

### Navigation within the shipment

| Section | What you do there |
| --- | --- |
| Logistics policy and reminder responsibilities | Set timezone, reminder days, recipients, uniqueness, approval exception and required milestones/documents |
| Freight quotations | Add/compare, attach evidence, select, approve/reject, inspect decision history |
| Bookings and transportation schedule | Create and edit booking, planned/actual dates and status |
| Containers and free-time deadlines | Create/edit containers, record start/allowance, calculate expiry and confirm return |
| Cargo readiness and milestones | Add/edit planned and actual milestones and completion |
| Shipment insurance | Set requirement, record/edit policies and evidence |
| ECTN and shipping requirements | Record/edit submission, status, deadline and cut-off |
| Change history — original and revised values | Inspect actor, timestamp, reason, original and revised fields |
| Container notification history | Inspect event, recipient, delivery status and deadline; manually run a scan |
| Shipping Document Lifecycle & Verification | Existing document controls retained below the logistics workspace |

### Fixture data

Use a run prefix such as `P5-UAT-20261119-A`. Record generated IDs/numbers, not just these aliases.

| Fixture | Suggested values |
| --- | --- |
| Shipment A / B | Two disposable shipments created through the existing shipment workflow with eligible PO lines |
| Forwarder A | Active, name `P5 Forwarder A`, country, contact person, phone, email and address |
| Forwarder B | Active, distinct details; use it for rejection/inactive tests |
| Quote A | Freight USD 4,000; destination charges 500; transit 20 days; valid future expiry |
| Quote B | Freight USD 4,500; destination charges 300; transit 15 days; same currency |
| Booking | Unique reference, vessel `UAT Vessel`, voyage `UAT-V1`, origin/destination ports, distinct estimated/actual dates |
| Container A | Unique number, 40ft HC, payload 25,000 kg, gross 23,000 kg, loading date, 14 free days |
| Container B | Different number, 20ft, 7 free days; different start date and return due date |
| Evidence | Small non-sensitive files for quote, policy, shipping document and return receipt |
| Reminder date D | The date shown in the workspace in the **configured logistics timezone**, not an assumed browser/server date |

**Policy defaults:** exclusive start-day counting per new container; uniqueness within shipment; free-time and empty-return offsets 7,3,1; ADMIN recipient role; self-approval disabled. Configure the client-agreed values before operational use. No milestone/document progression gate is invented: configure the actual required rules.

**Reminder behavior:** automatic scans run every 15 minutes while backend is running. A manual scan helps test logic but does not prove the background scheduler runs. Each threshold is delivered once per container, obligation, deadline revision and recipient. Missed thresholds are caught up once; overdue produces a separate event. Due today is not overdue until the next calendar date. Expiry and empty return are separate obligations. No monetary penalty is calculated automatically.

## 2. IMP-23 — Freight-forwarder master

### P5-01 — Create, edit and persist a forwarder

1. Open Suppliers Master → Freight Forwarders → register/add action.
2. Enter Forwarder A's name, country, contact person, phone, email, address and Active status.
3. Save, refresh and reopen; compare every value.
4. Edit its contact details; save/reopen.
5. Create Forwarder B.

Expected: both records persist with correct values. Existing IDs/relationships are retained after editing. Record screenshots and IDs.

### P5-02 — Inactive-forwarder enforcement

1. Deactivate Forwarder B in the master.
2. Open Shipment A → Add quotation; inspect the forwarder selector.
3. Confirm B is not selectable; A remains available.
4. Reactivate B, create/select a quote from B, then deactivate B before approval.
5. Attempt to approve that selected quote.
6. Reactivate B and repeat the permitted action.

Expected: inactive forwarder cannot be newly appointed, even when a quote was selected earlier. Existing history is preserved. Optional API/security verification: direct assignment of an inactive forwarder is rejected too.

## 3. IMP-24 and IMP-25 — Quotations, selection and approval

### P5-03 — Record complete competing quotations

1. Shipment A → Freight quotations → Add quotation.
2. Enter Forwarder A, unique reference, quotation date, valid-until date, freight 4,000, USD, transit 20, destination charges 500 and additional terms.
3. Save; open **Evidence / documents** on the quote and upload the quote file.
4. Add Quote B with the fixture values and its own evidence.
5. Refresh; compare the table and each record's fields; open/download evidence.

Expected: both quotations remain attached to the correct shipment and retain all entered details. Comparison keeps currency visible. Adding quotes does not post shipment costs or change landed-cost totals.

### P5-04 — Quotation validation

1. On a disposable quote attempt negative freight, negative destination charges and negative/non-integer transit days.
2. Enter a validity date earlier than quotation date and attempt Save.
3. Create a quote whose valid-until date is before D; attempt selection/approval.
4. Attempt blank required UI fields.

Expected: invalid values are rejected clearly; expired quotes cannot be selected/approved. No unexpected appointment or shipment-cost posting occurs.

### P5-05 — Separate selection and approval

1. In policy ensure **Allow an authorized quotation approver to approve their own selection** is disabled; save.
2. On Quote A click **Select for approval**; enter `Best overall commercial offer` and confirm.
3. Verify SELECTED / PENDING. Selection alone must not appoint a new forwarder.
4. As the same user, attempt **Approve forwarder** with a reason.
5. Sign in as a different authorized quotation approver; approve with a reason.
6. Reopen Shipment A and inspect selected forwarder and **Selection and approval history**.

Expected: self-approval is rejected by default; authorized second-user approval succeeds; winning forwarder is appointed; competing quotes are rejected/superseded consistently; actor, time and reason are retained.

### P5-06 — Authorized single-admin exception and rejection

1. For this test only, enable the self-approval policy exception and save as an authorized policy editor.
2. On a separate shipment select and approve your own quote with explicit reasons.
3. Verify it succeeds under the saved policy.
4. Create another pending quote and **Reject quotation**, entering a reason.
5. Inspect history, refresh, and verify rejected quote does not appoint its forwarder.
6. Restore the intended policy setting.

Expected: policy controls the exception; rejection persists with decision history. A client/API-provided self-approval flag alone cannot override disabled policy (covered by automated acceptance).

### P5-07 — Replacement selection and evidence retention

1. With an approved quote on a disposable shipment, add a new quote.
2. Select and approve it through the applicable policy.
3. Inspect both quote histories and the selected forwarder.
4. Attempt to delete evidence from the approved original quote.

Expected: new authorized appointment is consistent; previous decisions remain visible and are not erased; approved quotation evidence cannot be deleted.

## 4. IMP-26 — Booking and vessel details

### P5-08 — Create a complete booking

1. Ensure Shipment A has an approved forwarder.
2. Bookings and transportation schedule → Add booking.
3. Enter booking reference, carrier, vessel, voyage, origin/destination ports, estimated departure/arrival and status CONFIRMED. Leave forwarder blank to use the approved shipment selection, or choose the same approved forwarder.
4. Save and refresh.

Expected: correct forwarder and all booking values persist. Estimated dates remain distinct from actual dates. A confirmed booking requires the shipment's approved forwarder.

### P5-09 — Edit existing booking and actual dates

1. Count booking records. Click **Edit** on the existing booking.
2. Enter actual departure/arrival, revise estimated arrival if appropriate, and enter change reason `Carrier schedule update`.
3. Save and refresh; count records again.
4. Inspect Change history for original/revised dates, reason, actor and time.
5. Attempt arrival earlier than departure; then correct it.

Expected: same booking updated, no duplicate booking created; invalid chronology rejected; historical values retained.

### P5-10 — Unconfirmed booking action

1. On Shipment B create only a REQUESTED booking, or cancel its only confirmed booking with a reason.
2. Refresh and inspect Outstanding actions.
3. Complete legitimate quotation approval and confirm the booking.

Expected: a requested/cancelled booking does not suppress the missing-confirmed-booking action. The action clears when a confirmed booking exists.

## 5. IMP-27 — Containers and free-time lifecycle

### P5-11 — Multiple containers with complete loading data

1. Shipment A → Containers and free-time deadlines → Add container.
2. Enter Container A number/type/seal, payload 25,000, gross 23,000 and loading date.
3. Enter free-time start, 14 days, EXCLUSIVE, independent empty-return deadline and LOADED status.
4. Add Container B with different start and 7 days; save and refresh.
5. Verify each field and deadline remains associated with the correct container.

Expected: multiple independent records; no shipment-wide overwrite of durations or dates.

### P5-12 — Exact expiry calculation

Use disposable historical fixtures; the dates need not be today.

1. Enter start **2026-11-10**, days **14**, EXCLUSIVE; save.
2. Expect calculated expiry **2026-11-24**.
3. Edit convention to INCLUSIVE, enter reason and save; expect **2026-11-23**.
4. On separate records test start 2026-12-30 + 3 EXCLUSIVE → **2027-01-02**; start 2028-02-28 + 2 → **2028-03-01**.
5. Test zero days → expiry equals start date. Try negative or fractional days and invalid dates.

Expected: formulas and boundaries are correct; zero is retained rather than replaced by 14; invalid input is rejected. The shipping line/port determines which convention to select.

### P5-13 — Official deadline revision and audit

1. Edit Container A: change 14 free days to 16; first attempt without a change reason.
2. Enter `Shipping line approved two-day extension` and save.
3. Verify expiry moved by two days and container B did not change.
4. Change start date and empty-return deadline with a new reason; save.
5. Expand Change history and compare before/after fields, actor, timestamp and reason.
6. Upload official revision evidence through Evidence / documents.

Expected: reason required; per-container recalculation; original values and prior notifications retained; official evidence accessible.

### P5-14 — Legacy unknown start date

Precondition: a migrated old container has a recorded expiry but no known start. If none exist, mark this fixture-dependent case BLOCKED until the deployment owner supplies an isolated fixture.

1. Open the old record and note its preserved expiry and missing-start action.
2. Edit unrelated notes; verify expiry remains unchanged.
3. Attempt to change duration without supplying the agreed start date.
4. Enter the officially confirmed start and reason; save and check recalculation/history.

Expected: no fabricated start dates; old expiry preserved for unrelated edits; changing legacy allowance requires an agreed start.

### P5-15 — Container-number uniqueness

1. Set policy **Within shipment**; save. Add `P5-DUP-01` on Shipment A.
2. Attempt `p5-dup-01` on the same shipment, including surrounding spaces.
3. Add the number on Shipment B; expect allowed under this scope.
4. Select **Across unreturned containers**; try a new active reuse; expect blocked. Returned-history reuse is allowed under this policy.
5. Select **Across all history**; attempt reuse of a returned container number; expect blocked.
6. Restore client-agreed policy. Policy changes retain existing historical duplicates; correct those explicitly if needed.

Expected: normalization and selected scope enforced; simultaneous duplicate creation also prevented (automated acceptance covers concurrency).

### P5-16 — Delivery is not empty return

1. Edit a container to DELIVERED while leaving actual empty return blank; save with reason.
2. Give it a near/overdue deadline and run a scan.
3. Inspect countdown and notification history.

Expected: DELIVERED container remains subject to free-time/return alerts until actually returned.

### P5-17 — Confirm empty return and retain history

1. On a container with prior notifications click **Edit / confirm return**.
2. Attempt RETURNED without actual empty-return date; expect rejection.
3. Enter actual return date no later than D, at/after its start/loading dates, plus reason; save.
4. Verify status automatically RETURNED and date persists; upload receipt.
5. Run another scan and refresh history.
6. Attempt future actual return, or reopening an already-returned allocation through the API/support test where needed.

Expected: returned record retains original dates and notifications; no further reminders for it; future return invalid; closed allocation is not silently reopened. Use a new allocation for a later shipment.

## 6. IMP-28 — Cargo readiness and milestones

### P5-18 — Plan and complete milestones

1. Inspect defaults, including production completion on new shipments. Older shipments can add a missing milestone explicitly.
2. Add custom milestone `UAT_FACTORY_READY`, planned date and notes; save/reopen.
3. Edit, mark Completed and enter actual milestone date plus reason.
4. Verify responsible user and completion timestamp, actual date and completed state.
5. Correct completion through Edit with a reason; inspect history.

Expected: milestones are separate from shipment stage; custom planning persists; changes preserve original completion details in history. Future actual dates are rejected.

### P5-19 — Destination-specific milestone checkpoint

1. In policy add required milestone with exact name `UAT_FACTORY_READY`, Shipment A's PO destination/mode and stage SHIPPED; save.
2. Leave the matching milestone incomplete; try advancing shipment to SHIPPED using the usual stage controls.
3. Complete the milestone and retry after satisfying any other existing document/compliance rules.
4. Repeat with a nonmatching destination/mode shipment.

Expected: only applicable configured requirement blocks; actionable error identifies milestone. Unrelated shipments are not blocked by this rule. Blank destination/mode explicitly means all transactions.

## 7. IMP-29 — Insurance

### P5-20 — Requirement, policy and supporting evidence

1. Shipment insurance → Change insurance requirement → Required; enter reason.
2. Add policy with reference, insurer, coverage amount, **EUR** currency, premium, coverage type, start/issue and valid-until dates covering D.
3. Save; upload evidence on the policy.
4. Refresh and compare every field; download evidence.
5. Edit premium or dates with reason and inspect history.

Expected: explicit requirement stored; currency is not forced to USD; policy links/evidence and changes traceable; valid coverage clears the missing-coverage action.

### P5-21 — Insurance validity and missing coverage

1. On a disposable shipment requiring insurance, inspect actions with no policies.
2. Add expired policy; verify EXPIRED and unresolved coverage action.
3. Add future-start policy; verify NOT YET EFFECTIVE.
4. Test inactive policy and policy missing validity dates; verify accurate labels/action.
5. Enter validity end before start, nonpositive coverage or negative premium and attempt Save.
6. Add a valid current policy; verify action clears. Attempt deletion of retained policy evidence.

Expected: validity is derived from actual dates/active status; invalid financial/date inputs rejected; evidence retained for audit. Insurance warning is not an invented automatic shipment gate.

## 8. IMP-30 — ECTN and shipping deadlines

### P5-22 — Full tracking lifecycle

1. ECTN and shipping requirements → Add shipping requirement.
2. Enter custom requirement name, reference, PENDING, submission deadline and shipping cut-off; save.
3. Edit to SUBMITTED with submission date and reference; enter reason.
4. Edit to APPROVED after test authorization/evidence; save reason and attach evidence.
5. Verify all dates/statuses after refresh; inspect change history.

Expected: custom names and separate dates persist; submitted/approved entries require reference and submission date; no hard-coded SUBMITTED-only workflow.

### P5-23 — Missing/overdue tracking and configured gate

1. Create unapproved requirement with deadline/cut-off before D; inspect Outstanding actions.
2. Add a matching policy rule requiring exact document name before SHIPPED; save.
3. Attempt progression while requirement missing/unapproved; expect rejection identifying it.
4. Approve the correct record and retry after satisfying other gates.
5. Repeat on nonmatching destination/mode.

Expected: missing/late requirements are visible; only applicable confirmed rules block progression; separate shipping-document and PO compliance gates continue working.

## 9. IMP-31 — Notifications

### P5-24 — Configure and persist reminders

1. Expand policy; set agreed timezone, free-time offsets **7,3,1**, return offsets **7,3,1** and responsible roles with active users.
2. Save; refresh and verify exact settings.
3. Try invalid timezone, duplicate/negative/fractional offsets and no recipient roles; verify rejection.
4. Temporarily configure a different valid offset (e.g. 2), verify persistence and restore default/client values.

Expected: validated configurable policy; administrators do not need code changes for timing/recipient rules.

### P5-25 — Seven-, three-, one-day and overdue free-time alerts

Create separate unreturned containers with calculated expiries **D+8, D+7, D+3, D+1, D and D-1**. For example, choose starts D and allowances 8/7/3/1/0; use start D-2 with 1 day for expiry D-1. Keep return deadlines farther away so obligations are distinguishable.

1. Record each generated container number/expiry.
2. Open Container notification history → **Run deadline scan now**.
3. D+8: no free-time alert. D+7: BEFORE_7. D+3: BEFORE_3 and any missing earlier BEFORE_7 catch-up. D+1: BEFORE_1 and missing earlier thresholds.
4. D: due today, not overdue. D-1: separate OVERDUE event with critical severity.
5. Sign in as each responsible test recipient and inspect their notifications.

Expected: distinct events/recipient records for correct containers and deadlines. Catch-up events are intentional, not duplicate delivery. Inspect the full history rather than only unread badge counts.

### P5-26 — Empty return is an independent deadline

1. Create a container with free-time expiry D+20 and return due D+3; scan.
2. Verify EMPTY_RETURN events only for its due return obligation, not a premature FREE_TIME alert.
3. Create another with both deadlines D+3; scan and inspect separate event types.
4. Make return overdue on a separate unreturned fixture and scan.

Expected: both obligations tracked independently; matching calendar dates do not suppress either reminder; return overdue has its own event.

### P5-27 — Duplicate prevention and revised deadlines

1. Count notification rows for a near-deadline container.
2. Run the scan twice without changing data; refresh.
3. Verify no extra rows for the same threshold/recipient/revision.
4. Officially revise start/duration/return deadline with a reason; scan again.
5. Inspect new revision's reminders and preserved old history.

Expected: repeat scans idempotent; changed obligations can notify without erasing prior records. Automated acceptance additionally verifies concurrent scans.

### P5-28 — Actual scheduler, calendar boundaries and recipients

1. Create a fresh qualifying unreturned container; **do not manually scan**.
2. Leave backend running and wait up to its next 15-minute automatic scan; refresh recipient view/history.
3. Verify delivered event, recipient, timestamp and deadline.
4. Use controlled test support to check just before/after midnight in configured timezone and across weekend/month boundary; calendar days do not skip weekends.
5. If configured role has no active users, inspect FAILED history; activate/assign a test recipient and observe next scan.
6. Verify an unrelated non-admin user's inbox does not receive another user's container alerts; admin has monitoring access.

Expected: automatic delivery works independently of manual control; local calendar timing is correct; missing-recipient attempts are visible and subsequent delivery works. Do not alter a shared production clock; mark boundary variants BLOCKED if test support is unavailable.

### P5-29 — Return suppression and no automatic penalties

1. Confirm a notified container RETURNED with actual date/reason.
2. Run a manual scan and observe a later automatic scan.
3. Verify no new reminders for that returned allocation; old history remains.
4. Compare shipment-cost entries and landed-cost totals before/after expiry and scans.
5. Record a test demurrage/detention charge through the existing cost-component workflow only when explicitly entering the agreed amount.

Expected: alerts do not create monetary penalties; charges remain separate costs; original PO/quote totals are not silently changed.

## 10. IMP-32 — Overview and cross-feature checks

### P5-30 — Complete logistics overview

1. Open Shipment A's logistics workspace without navigating unrelated records.
2. Verify approved forwarder, quote comparison/history, bookings, container loading/deadline data, milestones, policies and tracking records.
3. Check remaining free/return days and approaching/due/overdue colors/actions against D.
4. Inspect Change history and Container notification history.
5. Verify insurance labels, missing confirmed-booking action and configured requirements agree with their underlying records.
6. Open Shipment B; ensure records/history are not mixed.

Expected: one coherent shipment overview; “free days granted” is distinct from “days remaining”; all actions point to real outstanding work.

### P5-31 — Permissions and trusted audit identity

1. As restricted user attempt master maintenance, quote approval, policy editing, container editing/return and evidence operations.
2. Verify actions are unavailable or denied according to assigned permissions and no change persists.
3. As authorized user make valid changes with reasons; inspect actual actor/time in history.
4. With technical support, test forged `userId`, self-approval flag, direct forwarder assignment without approved quote, and cross-shipment record ID.

Expected: server validates authorization and record ownership; audit uses authenticated actor. These negative API variants are included in automated acceptance where applicable; admin-only browsing cannot prove all of them.

### P5-32 — Existing workflow regression

1. Confirm the existing shipping-document verification controls still work below the new logistics sections.
2. Verify original PO-to-shipment links, shipment stages and stage history.
3. Compare actual cost components, allocations and conversion behavior before/after quote/insurance/deadline entry.
4. Open the Part 1 PO/payment screens; verify contractual totals and payment balances were not changed by logistics updates.

Expected: existing document, shipment and financial workflows remain functional; quotation estimates and operational reminders do not silently post actual costs.

## 11. Story coverage table

| Task | Feature | Manual cases |
| --- | --- | --- |
| IMP-23 | Forwarder master/active selection | P5-01, P5-02, P5-31 |
| IMP-24 | Multiple quotations, validity, comparison, evidence/history | P5-03, P5-04, P5-07 |
| IMP-25 | Selection, authorization and approval history | P5-05–P5-07, P5-31 |
| IMP-26 | Booking/vessel/estimated and actual schedules | P5-08–P5-10 |
| IMP-27 | Containers, calculation, revision, uniqueness and return | P5-11–P5-17 |
| IMP-28 | Cargo readiness/milestones | P5-18, P5-19 |
| IMP-29 | Insurance requirement/coverage/evidence | P5-20, P5-21 |
| IMP-30 | ECTN/tracking/cut-offs | P5-22, P5-23 |
| IMP-31 | Configurable free-time and return notifications | P5-24–P5-29 |
| IMP-32 | Logistics overview | P5-30, P5-32 |

## 12. Execution log, defects and cleanup

Use one row per case and per variant. PASS requires all assertions; BLOCKED means prerequisite unavailable; missing functionality or incorrect results are FAIL, not N/A.

| Case / variant | Tester / date | Record reference | Expected | Actual | PASS / FAIL / BLOCKED / NOT RUN | Evidence / defect |
| --- | --- | --- | --- | --- | --- | --- |
| P5-01 | | | | | NOT RUN | |
| P5-02 | | | | | NOT RUN | |

Defect format:

```text
Title: [Phase 5][IMP-xx][P5-xx] Observed problem
Build/environment:
User/role:
Preconditions and record numbers:
Steps to reproduce:
Expected:
Actual:
Evidence:
Impact/severity:
Retest result:
```

After execution:

1. Preserve PDFs/files, decision/change histories and notification evidence.
2. Restore agreed timezone/recipient/offset/uniqueness/approval settings and remove temporary test progression rules.
3. Close test allocations only through legitimate supported return/archive procedures; do not mark a live unreturned container RETURNED merely to stop alerts.
4. Confirm active test deadlines will not keep generating unwanted reminders.
5. Record totals: PASS __ / FAIL __ / BLOCKED __ / NOT RUN __.
6. Obtain business sign-off after required cases pass and any exceptions are explicitly accepted.

Tester ______  Business owner ______  Build ______  Date ______
