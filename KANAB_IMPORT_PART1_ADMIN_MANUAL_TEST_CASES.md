# KANAB Motors — Import Processes Part 1

Admin manual testing guide and test cases

Prepared: 19 November 2026. Source: the supplied Jira description, “KANAB Motors — Missing Import Processes - Part 1”. Covers all four phases and all 30 stories: IMP-01–IMP-22 and POX-01–POX-08.

**Execution status: NOT RUN.** This document specifies tests; it does not claim the application passed them.

## 1. How to execute

1. Use a dedicated test environment and sign in with your assigned ADMIN account. Do not use live supplier payments or sensitive banking documents.
2. Complete setup, then work through Phases 1–4 in order. Keep separate disposable records for invalid-data tests.
3. Follow every numbered step and compare the result with the expected outcome. Refresh and reopen after saving to verify persistence.
4. Record PASS, FAIL, BLOCKED, N/A or NOT RUN for each case and each variant. PASS means every assertion passed. N/A needs an agreed scope reason; missing functionality is not N/A.
5. Capture record numbers, screenshots, PDFs, actual results and defect links in the execution log. Missing required controls are UI coverage defects. Missing environment dependencies are blockers.
6. Tests marked **support required** need a restricted account, controlled dates, scheduler observation or technical evidence. ADMIN alone cannot prove unauthorized users are denied access or prove database constraints.

Navigation below was checked against frontend source, not a running deployment. Record differences in your deployed build. The Jira remains the expected behavior even if current implementation differs.

### Navigation

| Area | Admin navigation/control |
| --- | --- |
| Importer and banks | Company Profile → importer IEC/AD fields and bank accounts |
| Exporter | Suppliers Master → edit test supplier |
| Product data | Product master/catalog → test item |
| Requisitions | Import Requisitions → create/edit/view, submit, approve/reject, Review Stock, Generate Purchase Order |
| PO workflow | Purchase Orders → Edit PO, Submit PO, Confirm & Authorize PO |
| PO details | Purchase Orders row → **Manage PO Details & Import Features** |
| Global policy | Purchase Orders → **Import policy, standard terms and deadline responsibilities** |
| Extended PO controls | PO detail → Delivery and commercial rules; Payment schedule; Payment decisions and evidence; Applicable compliance checklist; Contract amendments |
| Compliance | PO detail → Regulatory Compliance and extended checklist controls |
| Supplier payment | PO detail → Payment Schedules; do not substitute customer-payment screens |
| L/C | PO detail → Letters of Credit |
| PDF | PO row → **Print Client-Format Purchase Order**; use Save as PDF in print dialog if required |
| Reporting/notifications | Locate the deployed supplier-payment report and responsible-user inbox with the deployment owner. A shipment dashboard or notification count alone is insufficient. |

### Run information

| Field | Fill in |
| --- | --- |
| Environment URL, build/commit | |
| Tester, date, ADMIN account | |
| Restricted requester, finance approver, reminder recipient | |
| Configured system timezone and scheduler interval | |
| Requisition, PO and shipment references | |
| Policy version, approved document template | |
| Evidence folder / Jira execution link | |

## 2. Setup and fixtures

### SET-01 — Access and environment

1. Sign in as ADMIN and open Company Profile, Suppliers Master, Import Requisitions, Purchase Orders and Shipments.
2. Verify pages load without permission/data errors.
3. Arrange a requester without approval permissions, an authorized finance decision-maker and an active reminder recipient. Record actual permissions.
4. Confirm test notification channels, scheduler interval and where delivery history is visible.
5. Record existing global policy/master values before changing them so they can be restored.

Expected: prerequisites are ready; any unavailable dependency is recorded as BLOCKED.

### SET-02 — Test data

Create records through their admin master screens. Prefix names/references with `UAT-P1-<date>-<sequence>`. Use valid test formats accepted by the applicable policy.

| Fixture | Value |
| --- | --- |
| Business unit | UAT Import Operations |
| Supplier A / B | Two active test suppliers with distinct identities |
| Importer | Dedicated test company/entity supported by deployment |
| Product A | Quantity 10 × unit rate USD 6,000 = USD 60,000 |
| Product B | Quantity 20 × unit rate USD 2,000 = USD 40,000 |
| Baseline PO | **USD 100,000** total |
| Product details | Valid item references/UOM; technical specification; quality requirement; intended use; notes |
| Request | Current request date, future required delivery, justification “UAT import replenishment”, budget USD 100,000 |
| Planning | Demand 50, MOQ 10, lead time 30; record actual stock and open supply |
| Commercial | FOB, named place Nhava Sheva, loading Nhava Sheva, discharge Djibouti, SEA, destination matching test policy |
| Payment | 30% advance / 40% intermediate / 30% final T/T |
| Bank A / B | Distinct fictitious accounts with holder, bank, number, branch, currency and applicable IFSC/SWIFT |
| Files | Permitted small PDF/image files for proforma, agreement, permit and payment receipt |

Keep separate POs for MAIN (happy path), INVALID, AMEND, LC, ALERT and Supplier B reporting. These are tester aliases: record actual generated numbers. Selecting a product can prefill its price; explicitly set fixture rates.

### SET-03 — Confirm rules before asserting results

Record the agreed rules for importer entities and bank selection; conditional IEC/AD/IFSC/SWIFT fields; classification ownership/overrides; origin per header or line; currency/rounding; draft schedules below 100%; partial-paid amendments; overpayment approval; compliance checkpoints and transaction types; L/C date exceptions; notification repeat/catch-up rules.

For delivery, confirm the event establishing issuance, later-of-issuance-and-completed-advance rule, calendar versus working days, weekends/holidays and trigger-day inclusion. PO date is not automatically issue date.

Obtain the approved client PO visual template. The pasted Jira gives required content but not the actual template or embedded calculation image. Content tests can proceed; exact visual matching remains blocked until the reference is available. Unconfirmed rules block only affected assertions.

## 3. Phase 1 — Import Requisition and Requirement Planning

### TC-01 — Requisition model and creation [IMP-01, IMP-02]

Precondition: SET-01/02 complete.

1. Open Import Requisitions → create action.
2. Enter business unit, request/required-delivery dates, justification, USD and estimated budget 100,000.
3. Add Products A/B with fixture quantities/prices; enter technical specification, quality requirements, intended application and notes for each line.
4. Save; record reference; close, refresh and reopen.
5. Inspect creator/audit information. Create another requisition and compare references.

Expected: DRAFT saved with unique reference, valid product links, complete header/line data and audit information. Log any required field not exposed; do not assume it persisted merely because totals match.

### TC-02 — Required fields and invalid lines [IMP-01, IMP-02]

Use a disposable draft and restore valid data after each variant.

1. Clear each required header individually and attempt Save/Submit.
2. Try blank product, no lines, quantity 0, negative quantity and nonnumeric input where possible.
3. Try negative price; record the agreed zero-estimate rule.
4. Test invalid date ordering and unsupported currency through available controls.
5. Enter a fractional quantity for a UOM that permits it and verify precision.

Expected: invalid submission is blocked with useful feedback and no corrupted saved record. Allowed decimal quantities persist; the Jira proposes decimal quantities, so an integer-only restriction needs review. Database reference constraints require TC-45 support evidence.

### TC-03 — Edit, submit and editing restrictions [IMP-02, IMP-03]

1. Edit draft quantity, specification, justification and required date; save/reopen.
2. Submit for approval; check SUBMITTED.
3. Attempt editing/deleting lines or resubmitting through available controls and a previously opened stale tab.
4. Refresh both views.

Expected: draft changes persist; submitted changes follow the agreed restrictions; stale actions do not bypass state controls or duplicate transitions.

### TC-04 — Approve and audit [IMP-03]

1. Open a submitted requisition as an authorized approver.
2. Approve, entering comments if offered.
3. Reopen and inspect approver, decision, timestamp and stored comment.
4. Attempt approval again.

Expected: APPROVED once, correct decision history. If approval uses fixed comments, verify the actual recorded text and note any requirement for editable comments.

### TC-05 — Reject, correct, resubmit, cancel [IMP-03]

1. Submit another request; reject with `UAT: revise quantity`.
2. Verify REJECTED and audit details; edit quantity, save, resubmit and approve.
3. On separate records, cancel in each policy-permitted state using the business cancellation action.
4. Try submitting, approving or converting a cancelled request.

Expected: rejected requests can be corrected; history remains; valid cancellation produces CANCELLED and prevents invalid progression. Closing a modal is not cancellation. Missing cancellation controls are a UI gap.

### TC-06 — Stock and outstanding review [IMP-04]

1. Record known Product A stock on hand, reserved/available stock, outstanding PO quantity and open requisition quantity from source screens.
2. Choose **Review Stock** and compare all figures, including pending requisitions/open PO pipeline.
3. Repeat for another item and an item without supply history.
4. Close/cancel a disposable source order/request through its workflow and review again.

Expected: product-specific figures reconcile; open-supply rules exclude ineligible records; potential duplicate/excess ordering is visible. Unavailable inventory must not masquerade as verified zero.

### TC-07 — Demand and order planning [IMP-05]

1. Enter demand/requested quantity 50, MOQ 10, lead time 30 and a written rationale on a draft line.
2. Save/reopen; review stock and suggested order quantity.
3. Compute the expected suggestion using the approved formula and known balances.
4. Repeat with supply above demand, shortage below MOQ and missing planning inputs; change MOQ/demand and review again.

Expected: assumptions/rationale persist; suggestions match available data and the agreed MOQ/formula rules. Jira does not specify a numeric suggestion formula, so record it before judging the answer.

### TC-08 — Convert approved requisition once [IMP-06]

1. Open an approved request → **Generate Purchase Order**.
2. Select Supplier A/Bank A and fixture terms; generate and record the PO number.
3. Open Purchase Orders; compare every product, quantity, price and currency; inspect the source requisition link.
4. Attempt conversion again from the reopened request and a stale tab.
5. Attempt conversion from draft, submitted, rejected and cancelled records where controls allow.

Expected: exactly one linked draft PO; no re-entry of all lines; only approved requests convert. Source may display CONVERTED_TO_PO; verify actual status and relationship.

## 4. Phase 2 — PO Commercial Terms and Agreements

### TC-09 — Importer and exporter masters [POX-01, POX-02]

1. Company Profile: save/reopen applicable importer IEC/AD codes and identity/address.
2. Suppliers Master: save/reopen Supplier A exporter IEC/AD values.
3. Select Supplier A on a PO and compare; repeat for Supplier B and another importer entity if supported.
4. Test codes blank where inapplicable, then blank where policy requires them.

Expected: correct entity/supplier values persist; requirements are conditional. Historical snapshots are covered in TC-17.

### TC-10 — Bank-account management [POX-03]

1. Add Bank A with holder, bank, account number, branch, currency and applicable IFSC/SWIFT; save/reopen.
2. Add Bank B; select different banks on MAIN and INVALID POs.
3. Check each PO's selected details.
4. Deactivate a disposable bank and attempt selection on a new PO.
5. Omit each policy-required bank field and attempt applicable saving/issuance.

Expected: correct entity/account selection, appropriate inactive-account behavior and conditional validation. Document uses selected details; access controls are TC-44.

### TC-11 — Structured commercial and shipment terms [IMP-07, IMP-10]

1. Edit MAIN PO: payment terms, Incoterm, ports, mode, packing, lead time.
2. PO detail → **Delivery and commercial rules**: named place, destination, payment method, day calculation and trigger → **Save commercial rules and lines**.
3. Save/reopen and compare all values.
4. Test AIR and ROAD on copies and check their applicable requirements.
5. Later link a shipment with a differing actual port and compare agreed PO versus actual shipment data.

Expected: workflow-driving terms use structured controls; notes remain free text; agreed and actual details remain distinguishable. Actual vessel/container details belong to shipments.

### TC-12 — Proforma and commercial agreements [IMP-08]

1. Open **PO agreements / attachments**; upload proforma and contract files with available category/reference metadata.
2. Enter proforma invoice number and contract reference in supported PO fields.
3. Reopen/download and compare files to originals.
4. Open another PO to check association isolation.
5. Test unsupported type, over-limit file and post-issuance removal against configured policy.

Expected: documents and references are tracked against the correct PO, retrievable and access-controlled; invalid uploads fail clearly. Missing tracking fields are recorded as gaps.

### TC-13 — Inspection, warranty, packing, origin [IMP-09, IMP-10]

1. Record inspection required and instructions, warranty terms and packing requirements on a draft PO.
2. Enter origin at the agreed level; use differing origins for two lines if that is required/supported.
3. Save/reopen and inspect document content.
4. Toggle inspection requirement and test any conditional instruction/approval rule.

Expected: requirements persist at the proper level; applicable packing/origin appears in document; structured inspection requirement drives configured behavior. Missing warranty/origin controls are not a reason to skip acceptance.

### TC-14 — Classification, UOM and totals [POX-04]

1. Open **Line descriptions and classification**; enter descriptions, HSN/SAC and UOM; test an authorized override and save.
2. Check A = 60,000, B = 40,000 and total = USD 100,000.
3. Change quantity/rate on a draft copy and verify recalculation after reopening.
4. Test decimal rate (3 × 12.3456 = 37.0368 before display rounding), invalid classification, missing required UOM and disallowed override.

Expected: correct agreed rounding, validation and totals; PO contractual total is distinct from landed cost.

### TC-15 — Commercial readiness [IMP-11]

1. Record current import policy; configure an agreed destination/method condition requiring selected codes, bank details, named place, origin and ports.
2. Save/reopen policy.
3. On matching INVALID PO, remove each required field individually and attempt Submit/Confirm & Authorize PO.
4. Restore valid values and complete the workflow.
5. Repeat on a nonmatching transaction with optional fields blank.

Expected: missing applicable information blocks approval/issuance with a specific reason; valid and nonmatching transactions are not incorrectly blocked. Record actual approval identity and issuance date.

### TC-16 — Standard terms and remarks [POX-07]

1. In global import policy configure the Jira terms: importer bears applicable arrival duties/taxes; supplier bears charges in its country; delivery follows agreed issuance/advance rule.
2. Use supported `{days}`, `{dayType}`, `{trigger}` placeholders where applicable; save.
3. Add a unique PO-specific remark and generate its document.
4. Create another PO and ensure the unique remark is not global.
5. Change global terms after issuance and regenerate the earlier document.

Expected: applicable terms render without unresolved placeholders; PO-specific additions remain local; approved wording stays preserved; 30 days is configurable, not hard-coded for every PO.

### TC-17 — Snapshots and amendments [IMP-07, IMP-11, POX-01–POX-05, POX-07]

1. Issue AMEND PO; save PDF and source values.
2. Modify test importer/exporter codes, bank details, product description/UOM/classification and standard terms in masters.
3. Reprint issued PO and compare original values.
4. Try directly editing a material issued term.
5. Enter **Reason for payment decision or PO amendment** → **Reopen for amendment and reapproval**; change an allowed term and resubmit/reapprove.
6. Inspect revision history → **View previous issued PO**; restore test masters afterward.

Expected: master changes do not silently rewrite historical documents; material changes follow approved workflow; prior version, actor, date and reason remain traceable. New POs use current masters.

### TC-18 — Client-format PDF [POX-05]

1. Choose **Print Client-Format Purchase Order** and save PDF.
2. Compare branding, PO number, issue date and approval details to approved template.
3. Check importer/exporter identity; payment terms; Incoterm/named place; origin; packing; ports and mode.
4. Check sequential row numbers, item code/description, HSN/SAC, quantity, UOM, rate, line amount, grand total/currency, words, selected bank and all remarks.
5. Create a multi-page PO with many lines and long descriptions/terms; print and inspect every page.

Expected: complete correct content, no missing rows, clipping, overlap or unreadable text; screen/PDF totals agree. Exact layout sign-off requires the missing approved template.

### TC-19 — Amount in words [POX-06]

1. Print USD 100,000 PO: words must mean one hundred thousand US dollars.
2. Test USD 1,234.56: words must express the dollars and fifty-six cents.
3. Test integer total, supported second currency and rounding boundary.
4. Change draft total and regenerate; look for any independently editable words value.

Expected: numeric total and words derive from the same rounded result/currency; no manually maintained contradictory amount. Wording conventions follow the approved template.

### TC-20 — Calendar-day delivery [POX-08]

Precondition: confirmed later-of-issuance/completed-advance rule, 30 calendar days, excluding trigger day. Use controlled dates or equivalent current dates.

1. Set issue 2026-11-19 and the agreed rule. Before full advance, inspect pending delivery calculation.
2. Complete advance 2026-11-21; expect **2026-12-21**.
3. On another PO, pay advance before issue 2026-11-19; expect **2026-12-19**.
4. Repeat with partial advance; trigger must wait for agreed completion.
5. Change lead time to 10 on a copy and verify calculation uses 10.

Expected: later qualifying event drives date; no premature final date; approved edits follow status policy. If inclusion rule differs, document the agreed expected date first.

### TC-21 — Working-day and issuance-only delivery [POX-08]

1. Choose WORKING days and record weekends/holidays.
2. With Monday–Friday working days and no holiday, trigger Friday 2026-11-20 plus 2 working days gives **2026-11-24**, excluding trigger day.
3. Add holiday 2026-11-23; expect **2026-11-25**.
4. Test issuance-only trigger on another PO; advance must not delay its date.
5. Reopen and compare date and contractual wording; restore holiday policy.

Expected: configured calendar, duration and trigger are honored.

## 5. Phase 3 — Import Registration and Regulatory Compliance

### TC-22 — Destination/transaction checklist [IMP-13]

1. Global policy → **Required permits and registrations** → **Add permit rule**.
2. Set test destination, SEA, type, authority, checkpoint and attachment requirement; save.
3. Open matching PO → **Applicable compliance checklist**; verify missing requirement.
4. Compare a different destination and AIR transaction.
5. Test blank destination/mode scope in the dedicated environment; verify documented all-transactions behavior.
6. Check any additional agreed transaction-type discriminator; record a gap if only mode is available but another type is required.

Expected: checklist matches configured applicability without unrelated blocks.

### TC-23 — Compliance record persistence [IMP-12]

1. PO compliance controls → **Register permit** or Add Regulatory Compliance Requirement.
2. Enter type, authority, application/document references, application/submission/issue/expiry dates and notes.
3. Save/reopen; verify status, PO association, identity, creator and timestamps.
4. Where applicable, link a valid shipment; also test a PO-only record without shipment.
5. Open another PO and verify no incorrect association.

Expected: required information and optional shipment link persist. Log unavailable fields/links for UI and support verification.

### TC-24 — Application, evidence and decisions [IMP-14]

1. Create pending record; enter application information and exercise supported APPLIED/SUBMITTED transitions.
2. Use **Evidence** to attach permit; reopen/download.
3. Approve as authorized user; inspect decision/history.
4. Reject another record with notes.
5. Attempt approval without required evidence and with invalid issue/expiry ordering.

Expected: pending/applied/submitted/approved/rejected tracking works; configured state/date/evidence rules apply and history remains.

### TC-25 — Expiry and renewal [IMP-14]

1. Create an expired test permit and inspect checklist validity.
2. Choose **Renew**, enter new references/dates, attach evidence and submit/approve.
3. Verify linked old/new records and retained original evidence/history.
4. Try satisfying a gate with expired original or pending renewal.

Expected: expired and missing requirements are identifiable; eligible valid approval satisfies the gate; renewal does not overwrite history.

### TC-26 — Compliance checkpoints [IMP-15]

Repeat independently for PAYMENT, SHIPMENT and CUSTOMS, plus PO_CONFIRMATION if configured.

1. Configure the agreed checkpoint on a test transaction.
2. Leave permit missing and attempt the actual action: payment confirmation, shipment progression or customs progression respectively.
3. Repeat with pending, rejected, expired and approved-but-missing-required-evidence records.
4. Provide valid approved evidence and retry.
5. Repeat on a transaction with no applicable gate.

Expected: each invalid applicable condition blocks the business action with a reason; valid approval unblocks it; unrelated transactions progress. Checklist display alone does not prove enforcement. External government/bank submission is separate scope.

## 6. Phase 4 — Payment Schedule and Financial Commitments

### TC-27 — Complete T/T schedule [IMP-16, IMP-17]

Precondition: MAIN PO USD 100,000; no transactions.

1. PO detail → **Payment schedule** → **Add milestone** for Advance, Intermediate, Final.
2. Set T/T, percentages 30/40/30 and distinct due dates; mark Advance as advance payment.
3. Choose **Save complete schedule (100%)**; reopen.
4. Inspect PO link, method, percentage, currency, due date, calculated amount, status and notes where supported.

Expected: **30,000 + 40,000 + 30,000 = USD 100,000**, percentage total 100%; basis is contractual PO total, not landed cost.

### TC-28 — Schedule validation/rounding [IMP-16, IMP-17]

1. Attempt complete totals 90% and 110% on INVALID PO.
2. Test negative/over-100 individual percentage, blank T/T percentage, missing due date and invalid number.
3. Test incomplete draft saving under agreed rule; attempt finalizing below 100%.
4. On USD 100 total use 33.33/33.33/33.34%; expect 33.33/33.33/33.34 amounts, total 100.
5. Test a fractional-cent calculation against approved residual/rounding policy.
6. Attempt inconsistent manual amount through any available T/T amount field.

Expected: complete total equals 100%, never exceeds it; required inputs validated; derived amounts cannot contradict percentages; rounded totals reconcile.

### TC-29 — Unpaid recalculation [IMP-17]

1. Create unpaid USD 100,000 PO with 30/40/30 schedule.
2. Through allowed draft/amendment process increase contract to 120,000.
3. Reopen: expect **36,000 / 48,000 / 36,000**.
4. Before payments replace percentages with 20/50/30; expect **24,000 / 60,000 / 36,000**.

Expected: unpaid amounts follow authorized basis/percentage changes and reapproval policy.

### TC-30 — Partial payments and confirmation [IMP-18]

1. On MAIN Advance 30,000 choose record-payment action; enter 10,000 USD, date, bank/reference and save.
2. Attach receipt via **Payment decisions and evidence → Evidence**.
3. Inspect actual transaction status. Current source creates INITIATED even if a button says **Confirm Payment & Post**; verify deployed behavior.
4. Before confirmation expect paid 0/outstanding 30,000.
5. Enter decision reason and choose **CONFIRMED** as authorized user; expect paid 10,000/outstanding 20,000 and partial status.
6. Record/confirm another 20,000; expect paid 30,000/outstanding 0 and paid status.
7. Reopen and inspect both transactions, evidence, dates, references and audit identity.

Expected: only confirmed transactions affect balances; partial payment history persists; full advance satisfies its delivery trigger where applicable.

### TC-31 — Reject and reverse [IMP-18]

1. On separate 30,000 milestone initiate 5,000 then REJECT with reason; expect paid 0/outstanding 30,000.
2. Record/confirm another 5,000; expect outstanding 25,000.
3. REVERSE confirmed payment with reason; expect net paid 0/outstanding 30,000.
4. Attempt repeated reversal/invalid status transition and inspect history.

Expected: rejection does not count; reversal restores balance once; original transactions and reasons remain traceable.

### TC-32 — Overpayment and invalid transactions [IMP-18]

1. With 30,000 due and 10,000 confirmed, attempt another 20,001 confirmation without approved exception.
2. Verify rejection leaves paid 10,000/outstanding 20,000.
3. Test zero/negative amount, missing required reference/date and incompatible currency.
4. Double-click submission and repeat confirmation from stale tab; count records/reconcile balances.
5. Test explicit overpayment approval separately if agreed; document duplicate-bank-reference policy rather than assuming it.

Expected: no unapproved overpayment or invalid posting; replayed confirmation does not double-count; approved exceptions are auditable.

### TC-33 — Amend after recorded payment [IMP-17, IMP-18]

1. On AMEND PO create schedule, confirm partial advance and save balances/history evidence.
2. Attempt normal schedule replacement and paid-milestone percentage change.
3. Attempt contract adjustment through authorized amendment workflow.
4. Compare historic payment amounts/dates/references/statuses before and after.
5. Reconcile unpaid changes under agreed adjustment rule to amended contract minus confirmed payments.

Expected: unsafe replacement blocked; history never silently rewritten; unpaid recalculation controlled/audited. Exact partial-paid allocation needs agreed business rules.

### TC-34 — Payment-method and bank requirements [IMP-19]

1. Select T/T, L/C and Cash against documents on separate transactions.
2. Enter each method's required bank/reference/transaction-specific details; save/reopen.
3. Remove required fields individually and attempt completion.
4. Switch method before payment and inspect stale/inapplicable obligations.
5. Check supplier/PO links and separation from shipment-cost entries.

Expected: method-specific validation and persistence; supplier payment is not represented merely by a landed-cost record.

### TC-35 — L/C details and lifecycle [IMP-20]

1. LC PO → Letters of Credit → create.
2. Enter unique reference, issuing bank, 100,000 USD, issue date, latest shipment and later expiry.
3. Enter documentary requirements through supported field; save/reopen all details and PO link.
4. Exercise permitted Draft/Issued/Utilized/Cancelled lifecycle actions and inspect audit.

Expected: independent dates, documentary obligations, amount/currency and relevant status persist; missing required controls are gaps.

### TC-36 — L/C date validation and deadline states [IMP-20]

1. Try issuing without latest shipment, then without expiry.
2. Try latest shipment after expiry; apply only documented banking exceptions.
3. Test equal dates under agreed rule.
4. Use latest shipment yesterday with future expiry; inspect missed-shipment status independently.
5. Use expired L/C; inspect reporting/status.

Expected: both dates required for issuance, ordering controlled, missed shipment distinguished from expiry.

### TC-37 — Reminder configuration [IMP-21]

1. Open global policy; record timezone, each responsible role, escalation role and escalation days.
2. Configure agreed test settings (for example Africa/Nairobi), save/reopen.
3. Verify recipient roles have active test users and delivery channel works.
4. Record scheduler cadence and history location.

Expected: persisted configuration maps to intended recipients. Admin seeing an alert does not prove recipient delivery.

### TC-38 — T/T seven-day reminders [IMP-21; support required]

Let D be today's date in configured system timezone. Recompute dates each run.

1. Create unpaid milestones due D+8, D+7, D+6, D and D-1 before the next scheduled run.
2. Observe an actual automatic run; inspect recipient inbox and delivery history.
3. Verify D+7 upcoming reminder names correct PO/milestone, amount, deadline and recipient.
4. D+8 must not receive its seven-day reminder early; D+6 follows agreed catch-up/repeat policy.
5. D is due today, not overdue before agreed cutoff; D-1 is overdue if unpaid.
6. Complete one milestone before reminder and cancel another where permitted; inspect active-obligation handling.

Expected: reminder date = due date minus seven calendar days; correct timezone/recipient; overdue recognized. Manual triggering alone does not prove automation.

### TC-39 — Independent L/C reminders [IMP-21; support required]

1. Create L/C A latest shipment D+7, expiry D+14; L/C B latest shipment D, expiry D+7.
2. Observe automatic run and recipient/history.
3. A must have latest-shipment reminder today; its seven-day expiry reminder belongs on D+7.
4. B must have expiry reminder today independently of shipment status.
5. Where allowed, create both deadlines D+7; verify two distinct obligation reminders.
6. Inspect LC_LATEST_SHIPMENT versus LC_EXPIRY reference/deadline/recipient/sent time.

Expected: one deadline never overwrites/suppresses the other; each reminder is seven days early.

### TC-40 — Overdue, escalation and boundaries [IMP-21; support required]

1. Create overdue unpaid T/T, missed-shipment and expired-L/C fixtures.
2. Observe overdue notifications/report flags for all three types.
3. At configured threshold verify escalation recipient/history.
4. Using controlled test facilities, observe local midnight/weekend behavior; compare policy timezone with browser timezone.
5. Change future deadline through authorized workflow; inspect rescheduling and preserved sent history.
6. Where facilities permit, simulate delivery failure/recovery and inspect failed/sent history and configured retry behavior.
7. Observe another scheduler run for duplicate/repeat behavior under agreed policy.

Expected: calendar-day timing, escalation and delivery history are accurate. Do not change a shared production clock. Mark unavailable controlled-time/history checks BLOCKED for support.

### TC-41 — Outstanding-balance report [IMP-22]

1. Locate supplier-payment report; filter fresh USD 100,000 PO with 30/40/30 schedule.
2. Confirm only 10,000 Advance; expect scheduled 100,000, paid **10,000**, outstanding **90,000**, Advance outstanding **20,000**.
3. Make only Advance overdue on separate fixture; expect overdue **20,000**, not 30,000 or 90,000.
4. Inspect percentages, amounts, statuses, upcoming dates and supplier/PO identity.
5. Add initiated/rejected/reversed transactions and reconcile net confirmed payments only.
6. Filter Supplier A/B and individual PO; clear filters and compare totals; compare export if available.
7. Add second currency: verify separate amounts or explicit conversion basis/rate.
8. Inspect L/C latest-shipment and expiry dates and approaching/overdue flags.

Expected: report reconciles to schedules/history without leakage, double counting or unexplained mixed-currency totals. Shipment-only reporting cannot pass this case.

## 7. Cross-phase and regression checks

### TC-42 — End-to-end admin journey [all stories]

1. Create requisition; review supply/planning; submit and approve.
2. Convert once; complete commercial/master/classification/bank data and agreements.
3. Register/approve compliance, pass readiness, issue PO and save PDF.
4. Create 30/40/30 schedule; confirm advance and verify delivery date.
5. Link shipment; exercise compliance gates.
6. On a separate L/C PO inspect documentary requirements, dates and reminders.
7. Complete remaining T/T payments; verify paid 100,000/outstanding 0.
8. Follow source requisition, attachments, permits, payments and audit links.

Expected: all phases work together; an individual failed case stays failed even if the journey completes.

### TC-43 — Existing functionality regression

1. Create a direct PO and compare basic quantities/rates/currency/status behavior with converted PO.
2. Consolidate eligible lines from two POs into shipment; verify source/remaining quantities.
3. Add known shipment cost (e.g. USD 5,000), allocate under supported method and reconcile allocations.
4. Verify contractual PO remains 100,000 and its 30% remains 30,000 despite changed landed cost.
5. Verify existing currency conversion using a recorded test rate.
6. Open/print legacy PO under agreed legacy-data policy.

Expected: existing PO management, shipment/line consolidation and landed-cost allocation remain functional and distinct from payments.

### TC-44 — Permissions and audit [support required]

1. As ADMIN verify permitted operations succeed with correct audit actor.
2. Sign in as restricted requester; attempt requisition approval/rejection, PO confirmation, policy/bank editing, payment confirmation/reversal.
3. Verify authorized PO-specific remarks do not grant global-term editing.
4. Check bank/evidence visibility under agreed role policy.
5. Try stale links/open actions after permission removal; verify server denies changes, not only hides buttons.
6. Return as ADMIN and verify unauthorized changes did not persist; inspect history.

Expected: authorization enforced; actions/decisions record correct actor, timestamps and comments. Admin-only execution cannot pass this test.

### TC-45 — Model/persistence evidence [support required]

1. Save, refresh and relogin for requisition/lines, compliance, schedules, transactions and L/C records.
2. Record visible identifiers, source links and audit details.
3. Request read-only developer/QA evidence of unique requisition references, valid product/parent references, decimal precision, nullable shipment link and notification reference/delivery history.
4. Request confirmation of appropriate reuse of existing masters, attachments, approvals and calculation mechanisms.
5. Attach evidence and distinguish technical verification from UI observations.

Expected: Jira model intent is met; table names may differ when extending reusable models. Successful UI saves alone do not prove database constraints.

## 8. Traceability — all tasks/features

| Phase | Story | Cases |
| --- | --- | --- |
| 1 | IMP-01 Requisition model | 01, 02, 45 |
| 1 | IMP-02 Creation/editing | 01–03, 44 |
| 1 | IMP-03 Approval workflow | 03–05, 44 |
| 1 | IMP-04 Stock/open supply review | 06 |
| 1 | IMP-05 Demand planning | 07 |
| 1 | IMP-06 Convert to PO | 08 |
| 2 | IMP-07 Commercial terms | 11, 17 |
| 2 | IMP-08 Proforma/agreements | 12 |
| 2 | IMP-09 Inspection/warranty/packing | 13 |
| 2 | IMP-10 Shipment commercial details | 11, 13 |
| 2 | IMP-11 Readiness | 15, 17, 44 |
| 2 | POX-01 Importer profile | 09, 17 |
| 2 | POX-02 Exporter information | 09, 17 |
| 2 | POX-03 Importer bank accounts | 10, 17, 44 |
| 2 | POX-04 Classification/UOM | 14, 17 |
| 2 | POX-05 Client PO PDF | 17, 18 |
| 2 | POX-06 Amount in words | 19 |
| 2 | POX-07 Terms/remarks | 16, 17, 44 |
| 2 | POX-08 Delivery calculation | 20, 21, 30 |
| 3 | IMP-12 Compliance model | 23, 45 |
| 3 | IMP-13 Checklist | 22 |
| 3 | IMP-14 Permit tracking | 24, 25 |
| 3 | IMP-15 Checkpoint validation | 26 |
| 4 | IMP-16 Schedule model | 27, 28, 45 |
| 4 | IMP-17 T/T management | 27–29, 33 |
| 4 | IMP-18 Transactions | 30–33, 44, 45 |
| 4 | IMP-19 Method/bank details | 34 |
| 4 | IMP-20 L/C tracking | 35, 36, 45 |
| 4 | IMP-21 Notifications | 37–40, 45 |
| 4 | IMP-22 Balance report | 41 |

TC-42 integrates all phases. TC-43 protects existing features in the Jira assessment basis. Additional vessel/container/insurance development beyond this supplied Part 1 backlog is not an invented extra phase.

## 9. Execution and defect records

Create a row per case and per variant, for example `TC-26-PAYMENT-MISSING` and `TC-26-CUSTOMS-EXPIRED`.

| Case/variant | Tester/date | Record references | Actual result | Status | Evidence/defect |
| --- | --- | --- | --- | --- | --- |
| SET-01 | | | | NOT RUN | |
| SET-02 | | | | NOT RUN | |
| SET-03 | | | | NOT RUN | |
| TC-01 | | | | NOT RUN | |

Defect template:

```text
Title: [Part 1][Story][Case] Concrete observed problem
Environment/build:
Role/account:
Preconditions and record references:
Steps:
1.
2.
Expected:
Actual:
Impact/severity:
Screenshot/PDF/notification evidence:
Reproducibility:
Related Jira story:
Retest build/date/result:
```

## 10. Cleanup and sign-off

1. Ensure each of the 30 stories has execution evidence; list all blocked variants, missing controls and unresolved rules.
2. Save financial reconciliation evidence and PDFs.
3. Restore changed policy, holidays, responsible roles, masters and standard terms from baseline.
4. Cancel/archive disposable records using supported workflows; preserve audit and payment history. Do not delete confirmed payments to force balances.
5. Check no unwanted test reminders remain on active fixtures.
6. Record PASS __ / FAIL __ / BLOCKED __ / N/A __ / NOT RUN __, including variant counts.
7. Obtain QA/business sign-off after required cases pass and any remaining exceptions are explicitly accepted.

Tester ______  Business owner ______  Build ______  Date ______
