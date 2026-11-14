# KANAB Motors — Manual frontend acceptance test guide

Prepared 2026-11-11. Covers Import Process Part II (IMP-23–53), Client Feedback (KMS-FB-01–17), and Company Profile / Importer / Supplier Exporter requirements.

This is a test script, not a claim that every test already passes. Record actual results. Missing buttons, inaccessible fields, incorrect totals, or unavailable configuration are findings; do not mark them passed because a backend endpoint exists.

## 1. Preparation and recording results

1. Use a development/UAT environment with test data. These tests create financial transactions, approvals, stock movements and audit records. Do not use real customer payments.
2. Start the frontend and backend using your normal development procedure (or via Docker Compose if validating a containerized release). Confirm migrations ending `0008` and `0009` and automated test results (`npm --prefix backend test`, `npm --prefix backend run test:e2e`) with the developer, and verify `GET /api/health` returns HTTP 200 `{ "status": "ok" }` with clean browser loads and no console errors.
3. Sign in as Administrator (`admin`). Open a second browser profile/private window for another authorized user. Do not use one admin identity for both sides of separation-of-duties tests.
4. Seeded development/UAT accounts (from `seed.ts`; use your own approved credentials if your UAT environment rotated passwords):
   - **Admin (`ADMIN`)**: `admin` / `Admin@123` (`admin@kanabmotors.com`)
   - **Sales Manager (`SALES_MANAGER`)**: `sales` / `Sales@123` (`sales@kanabmotors.com`)
   - **Sales Representative (`SALESPERSON`)**: `salesperson` / `Sales@123` (`salesrep@kanabmotors.com`)
   - **Procurement (`PROCUREMENT`)**: `procurement` / `Procure@123` (`procurement@kanabmotors.com`)
   - **Finance Manager (`FINANCE_MANAGER`)**: `finance` / `Finance@123` (`finance@kanabmotors.com`)
   - **Finance Officer (`FINANCE_OFFICER`)**: `financeofficer` / `Finance@123` (`financeofficer@kanabmotors.com`)
   - **Inventory (`INVENTORY`)**: `inventory` / `Inventory@123` (`inventory@kanabmotors.com`)
   - **Approver (`APPROVER`)**: The `APPROVER` role (`SHIPMENTS_QUOTATION_APPROVE`, `ENQUIRIES_APPROVE`, `REFUNDS_APPROVE`, `PURCHASE_ORDERS_CONFIRM`) is seeded without a default user. Before starting `IM-01`/`IM-02`/`FB-02`, create a dedicated user in **Users & Permissions** assigned to `APPROVER` (for example `approver_uat` / `Approver@123` / `approver_uat@example.test`; password must be >= 8 chars with uppercase, lowercase, and digit/symbol).
5. Choose a unique run suffix, for example `UAT-20261111-A`. Add it to names, notes and references below. Keep the application's generated enquiry/booking/PO/shipment numbers.
6. Set `T` to your actual test date. `T+7` means seven days later. Use valid configured currencies (`USD`, `ETB`, `EUR`, `GBP`, `CNY`), warehouses (`Kality Assembly Plant Warehouse`), regions (`Addis Ababa`), categories, UOMs (`UNIT`, `PIECE`), and payment methods.
7. Prepare harmless files: `customer-authority.pdf`, `bank-slip.pdf`, `refund-letter.pdf`, `commercial-invoice-v1.pdf`, `commercial-invoice-v2.pdf`, `packing-list.pdf`, `bill-of-lading.pdf`, `customs-declaration.pdf`, and `pos-support.pdf`. Put the run suffix inside each document. A PDF should be a real readable PDF.
8. Record the starting customer balances, relevant stock quantities and original company/default-bank settings. Restore changed configuration after testing; retain transaction evidence rather than deleting posted records.

For every test record:

| Test ID | Tester / role | Record references | Actual result | Pass / Fail / Blocked / Not run | Evidence / defect ID |
|---|---|---|---|---|---|
| | | | | | |

**Pass:** all expected outcomes observed, including refresh/reopen persistence. **Fail:** behavior differs. **Blocked:** prerequisite or UI control unavailable. **Not run:** not attempted. Screenshots should show record reference, status and totals; avoid exposing real personal/bank data.

Navigation labels below come from the current sidebar. Some forms use tabs or row actions. If a described business action is not exposed in the frontend, record the missing action as a defect instead of using SQL/API calls to manufacture a pass.

## 2. Shared test data

| Record | Required & recommended inputs |
|---|---|
| Customer A | Type `DIRECT_POS`; Full Name `UAT Buyer A <suffix>`; Mobile **`+251911000101`**; Region `Addis Ababa`; Address/Town `Bole Sub-City, Addis Ababa`; Contact `Amina Test`; Email `buyer-a@example.test`; Preferred Contact `EMAIL`; Occupation `Engineer` |
| Customer B | Type `DIRECT_POS`; Full Name `UAT Buyer B <suffix>`; Mobile **`+251911000202`**; Region `Addis Ababa`; Address/Town `Kirkos Sub-City, Addis Ababa`; Contact `Beka Test`; Email `buyer-b@example.test`; Preferred Contact `PHONE`; Occupation `Trader` |
| Dealer | Type `DEALER`; Full Name `UAT Dealer <suffix>`; Mobile **`+251911000303`**; **TIN `0012345678`** (mandatory 10 digits for Dealer/Government); Region `Addis Ababa`; Address/Town `Mexico Square, Addis Ababa`; Contact `Dani Test`; Email `dealer@example.test`; Preferred Contact `SMS`; Business `Vehicle dealership` |
| Vehicle model | Item Code **`UAT-EV-<suffix>`**; Item Name `UAT EV <suffix>`; Category `IMPORTED_VEHICLE`; Brand `Bajaj` (or `Sinotruk`); UOM `UNIT`; Selling Price **`100000`** (use `Zero-Rated Tax Tier` for flat 100,000 gross, or adjust base price so total with 15% `Standard Ethiopian VAT` equals 100,000); Model Year `2026`; Powertrain `BEV`; Condition `NEW`; Fuel/Energy `ELECTRIC`; Driving Range **`400`** km; Battery Power **`60.48`** kWh; Colour `Pearl White` |
| Spare part (FB-08/09) | Item Code **`UAT-PART-<suffix>`**; Item Name `UAT Brake Pad <suffix>`; Category `SPARE_PARTS`; UOM `PIECE`; Purchase Price `600`; Selling Price **`1000`**; Tax `Standard Ethiopian VAT`; Warehouse `Kality Assembly Plant Warehouse`; initial stock `20` units via stock receipt/adjustment |
| International Supplier | Name `UAT Exporter <suffix>`; Country of Origin **`China`**; Contact `Wei Chen`; Phone `+86 21 5550 1234`; Email `exporter@example.test`; Address `Industrial Park, Pudong, Shanghai, China`; Exporter IEC **`0123456789`**; Exporter AD **`12345678901234`**; Status `ACTIVE` |
| Local Supplier | Name `UAT Local Supplier <suffix>`; Country of Origin **`Ethiopia`**; Contact `Selam Local`; Phone `+251 11 550 0001`; Email `local@example.test`; Exporter IEC *(blank)*; Exporter AD *(blank)*; Status `ACTIVE` |
| Forwarders | `UAT Freight A <suffix>` (`Ethiopia`, contact `Abebe Freight`, phone `+251 11 660 1111`, email `freight-a@example.test`, Active); `UAT Freight B <suffix>` (`Ethiopia`, contact `Dawit Freight`, phone `+251 11 660 2222`, email `freight-b@example.test`, Active); `UAT Freight Inactive <suffix>` (`Djibouti`, contact `Inactive Agent`, phone `+253 21 350000`, Inactive) |
| Company bank A | Account Holder `KANAB UAT`; Bank Name `UAT Import Bank A`; Currency `USD`; Account Number `100000000001`; Branch `UAT Main`; SWIFT `TESTETAA`; IFSC *(optional — leave blank initially, or test `TEST0123456`)*; Primary Default checked; Active checked |
| Company bank B | Account Holder `KANAB UAT`; Bank Name `UAT Import Bank B`; Currency `USD`; Account Number `100000000002`; Branch `UAT Secondary`; SWIFT `TESTETAA`; IFSC *(blank)*; Active checked; Primary Default unchecked initially |
| Import PO (PO1) | Supplier `UAT Exporter <suffix>`; Vehicle `UAT EV <suffix>`; **4 units × USD 10,000 = USD 40,000**; Currency `USD`; Bank Account = active default bank; Incoterms `FOB`; Mode `SEA`; Origin Country `China`; Port of Loading `Shanghai`; Port of Discharge `Djibouti`; Payment Terms `30% Advance, 70% Irrevocable L/C`; Expected Delivery `T+30`; PI Reference `PI-<suffix>` |
| Test VINs / Engines | Unit 1: `CHS-UAT-<suffix>-01` / `ENG-UAT-<suffix>-01`; Unit 2: `CHS-UAT-<suffix>-02` / `ENG-UAT-<suffix>-02`; Unit 3: `CHS-UAT-<suffix>-03` / `ENG-UAT-<suffix>-03`; Unit 4: `CHS-UAT-<suffix>-04` / `ENG-UAT-<suffix>-04` |
| Sales booking A/B | Customer A / Customer B; Vehicle `UAT EV <suffix>`; Qty `1`; Salesperson `UAT Sales <suffix>`; Final gross `100,000` (if tax applies on top of unit price, adjust unit price so final gross is `100,000`, or substitute actual gross in all calculations) |

Use valid format substitutes if your configured bank/country rules differ. Do not interpret an artificial identifier as an actual bank or registration.

## 3. Company Profile, importer and exporter tests

### CP-01 — Company fields, importer credentials, validation and persistence

**Navigate:** System & Settings → **Company & Importer Profile** (tab **Company & Importer Profile**). **Role:** Admin (`admin` / `Admin@123`).

1. Record original settings and check any pre-seeded baseline legal/importer values. Enter:
   - Registered Company Name *(required)*: `KANAB Motors PLC <suffix>` (or `KANAB Motors PLC`)
   - Trading Name / Brand Name: `KANAB UAT <suffix>`
   - Company Registration No.: `UAT-REG-001`
   - TIN *(required)*: `UAT-TIN-001`
   - VAT Registration No.: `UAT-VAT-001`
   - Company Logo: click **Upload Logo Image** and select a small valid PNG/SVG/JPG file (e.g. `company-logo.png`, <= 5 MB); confirm the preview thumbnail updates without any manual URL text input, and confirm **Remove Logo** restores default branding cleanly when tested.
   - Full Registered Address: `UAT Main Road`
   - City: `Addis Ababa`
   - Country: `Ethiopia`
   - Official Phone: select country code `+251` (Ethiopia) from the country-code dropdown and enter `11 662 4899` (check searching another country code such as `+971` UAE or `+86` China in the list, then keep `+251 11 662 4899`).
   - Official Email: `company@example.test`
   - Website: `https://example.test`
   - **Importer Regulatory Credentials (right panel):**
     - Importer IEC No.: `ETH-IEC-994821` (or `UAT-IEC-001`)
     - Importer AD Code: `AD-CBE-0019284` (or `UAT-AD-001`)
2. Click **Save Profile Changes**, refresh the page, and reopen. Confirm all left-panel and right-panel fields persist.
3. Verify validation and inline field errors across all inputs (fix or restore each before saving final valid values):
   - Official Email: enter `wrong-email` → verify inline error & error banner block saving until corrected.
   - Website: enter `not a url` (or `example.test` without `http://`/`https://`) → verify inline error & error banner block saving until corrected.
   - Official Phone: enter `123` (too short) → verify inline phone error blocks saving until corrected (or cleared).
   - Required fields: clear **Registered Company Name** or **TIN** → verify inline required error blocks saving.
   - Importer Regulatory Credentials (right panel): enter invalid **Importer IEC No.** `X!` or **Importer AD Code** `bad code` → verify inline validation error blocks saving (valid 3–50 char alphanumeric/`-`/`/` codes or blank save cleanly).
4. Verify dynamic branding & document rendering:
   - Confirm the **Sidebar** brand title and logo icon update to your Registered Company Name and uploaded logo.
   - Confirm the **Browser Tab title & icon (favicon)** update to the Registered Company Name and uploaded logo.
   - Open a second/private browser window at the **Login Page** (before logging in) and confirm the Login Page displays the Registered Company Name and uploaded logo.
   - Open a PO official printout (**Client-Format Official Document**) and confirm the company name, uploaded logo, and Importer IEC / AD Code render in the document header.

**Expected:** valid fields (including Importer IEC & AD Code) persist; invalid required/formatted fields show clear inline errors and an error alert without saving; original unrelated values remain. **Audit Trail Logs** identify user, time and changed profile. Company information appears in relevant generated documents. Record missing creation/multiple-profile controls separately; the data structure supporting future companies does not prove a UI exists to create one.

### CP-02 — Importer codes and historical documents

**Navigate:** **Company & Importer Profile** (same tab as `CP-01`). **Role:** Admin.

1. Under **Importer Regulatory Credentials**, enter Importer IEC No. `0123456789` and Importer AD Code `12345678901234`, then click **Save Profile Changes**. Also confirm optional codes can be saved blank when clearing them if business configuration allows.
2. When creating **PO1** in `IM-01` (or on a quick UAT PO if running `CP-02` standalone), open the PO document modal (**Client-Format Official Document** / **Print / Save as PDF**) and save as evidence (`0123456789` / `12345678901234`).
3. Change Importer IEC No. to `9876543210` and Importer AD Code to `43210987654321`; click **Save Profile Changes**. Create a new **PO2** and open its official document printout.
4. Reopen/regenerate **PO1**'s official document. Restore test importer settings afterward.

**Expected:** new transactions use updated codes (`9876543210` / `43210987654321`); **PO1** retains its transaction snapshot (`0123456789` / `12345678901234`) where historical preservation is required. No repeated manual importer entry is needed. Compare actual document text, not just form fields.

### CP-03 — Multiple banks, default selection and validation

**Navigate:** **Company & Importer Profile** → tab **Importer Bank Accounts**. **Role:** Admin.

1. Inspect the summary KPI cards (**Total Bank Accounts**, **Default Settlement Account**, **Active Forex Accounts**) and any pre-seeded accounts.
2. Click **Add Bank Account** and test validation first: try submitting with blank Account Holder Name, Bank Name, or Account Number, invalid SWIFT `BAD` (must be 8 or 11 alphanumeric chars), and invalid IFSC `BAD` (must be 4–50 alphanumeric/hyphen chars when provided). Valid optional IFSC example: `TEST0123456`.
3. Add **Company bank A** (`KANAB UAT`, `UAT Import Bank A`, `USD`, `100000000001`, `UAT Main`, SWIFT `TESTETAA`, IFSC blank or `TEST0123456`, Default checked, Active checked) and **Company bank B** (`KANAB UAT`, `UAT Import Bank B`, `USD`, `100000000002`, `UAT Secondary`, SWIFT `TESTETAA`, IFSC blank, Default unchecked, Active checked), plus test adding/selecting another supported currency (for example `CNY`). Ensure **A** is set as Primary Default.
4. Click **Make Default** on **B**; refresh the page: only **B** is `PRIMARY DEFAULT`.
5. Go to **Purchase Orders** → **New Purchase Order**: verify **B** is automatically selected in the Bank Account dropdown. Manually choose **A**, fill supplier/line/terms, save, and reopen/edit: verify **A** remains selected.
6. Cancel and click **New Purchase Order** again: verify **B** is automatically selected (verifies active default selection rather than first-list-item fallback).
7. On **Importer Bank Accounts**, try clicking the **Delete** (`Trash`) icon on **A** (referenced by the saved PO): expect block/error message directing you to deactivate instead. Toggle **Deactivate** on **A**, then open **New Purchase Order** and verify **A** is excluded from active new PO choices while the historical PO still displays **A** safely.
8. Toggle **Deactivate** on default **B** while another active test bank exists (for example your `CNY` test bank or re-activated bank): verify default fallback / selection behavior and new PO selection. With no active bank available, verify clear handling rather than silently selecting an inactive account.

**Expected:** one active default per company; active default chosen automatically; explicit active choice respected; inactive accounts excluded from new selections but historical references remain readable; referenced accounts cannot be deleted; account changes audited. Generated PO printout contains the selected bank details. Record whether later bank edits alter historical documents.

### CP-04 — Exporter master and historical snapshots

**Navigate:** **Suppliers Master**. **Role:** Admin or Procurement (`procurement` / `Procure@123`).

1. Click **Register International Supplier** (`+ Add Supplier`), enter Shared **International Supplier** inputs (`UAT Exporter <suffix>`, Country `China`, Contact `Wei Chen`, Phone `+86 21 5550 1234`, Email `exporter@example.test`, Address `Industrial Park, Pudong, Shanghai, China`, Exporter IEC `0123456789`, Exporter AD `12345678901234`, Status `ACTIVE`), and save.
2. Verify `IEC: 0123456789` and `AD: 12345678901234` badges appear on the directory row. Search the Suppliers list by `0123456789` to confirm filtering, then reopen and edit its phone/contact (`+86 21 5550 9999`).
3. Create **Local Supplier** (`UAT Local Supplier <suffix>`, Country `Ethiopia`, Contact `Selam Local`, Phone `+251 11 550 0001`, Email `local@example.test`) leaving Exporter IEC No. and Exporter AD Code **blank**; save.
4. Select `UAT Exporter <suffix>` on **PO1** and open/save its PO official document printout. Edit `UAT Exporter <suffix>` to Exporter IEC `EXP-REV-999` and Exporter AD `AD-REV-999`, create **PO2**, and compare both PO printouts.

**Expected:** international exporter fields persist and appear in supplier details/import documentation; local supplier codes remain optional; old PO preserves snapshot values (`0123456789` / `12345678901234`), new PO uses updated values (`EXP-REV-999` / `AD-REV-999`); **Audit Trail Logs** identify who changed codes.

### CP-05 — Company and bank permissions

**Roles to test in separate browser windows:**
- Admin (`admin` / `Admin@123`) & Finance Manager (`finance` / `Finance@123`) — both have `COMPANY_PROFILE_VIEW` + `COMPANY_PROFILE_EDIT`
- Procurement (`procurement` / `Procure@123`) — has `COMPANY_PROFILE_VIEW` + PO permissions (read-only profile/bank access, no `COMPANY_PROFILE_EDIT`)
- Sales Representative (`salesperson` / `Sales@123`) — has neither `COMPANY_PROFILE_VIEW` nor `COMPANY_PROFILE_EDIT`

1. As **Admin** and as **Finance Manager** (`finance`), open **Company & Importer Profile**, verify both tabs load and edits/saves succeed. Copy the logged-in URL/route context.
2. As **Sales Representative** (`salesperson`), inspect the sidebar (confirm **Company & Importer Profile** is not shown), confirm `localStorage`/tab switching or direct navigation does not render unauthorized data, and check browser DevTools Network tab (or direct API check with sales token) that `GET /api/company-profile` and `PUT /api/company-profile/1` return `403 Forbidden`.
3. As **Procurement** (`procurement`), verify read-only access to view company/bank accounts (`COMPANY_PROFILE_VIEW`) where edit buttons (**Save Profile Changes**, **Add Bank Account**, **Make Default**, **Edit**, **Delete**) are disabled/hidden and write API calls fail with `403`, while opening **Purchase Orders** still populates the Bank Account dropdown cleanly.

**Expected:** approved role matrix enforced for both viewing and editing. Hidden buttons alone are insufficient: direct navigation/API calls must not expose unauthorized data/actions. Record actual allowed roles and obtain business confirmation for bank-information visibility.

## 4. Import lifecycle — execute in order

### IM-01 — Requisition, PO and payment foundations (IMP-43, 47, 49–52)

1. Import Requisitions: create request for 4 units of the test vehicle, required date T+30, justification `UAT replenishment <suffix>`. Submit; approve with the required different role; convert to PO where offered.
2. Purchase Orders: complete the shared PO data, supplier, default bank, importer details, PI reference `PI-<suffix>`, payment terms and delivery details. Submit/approve using the available workflow.
3. Add payment milestones: USD 12,000 advance due T+2; USD 28,000 balance due T+20. Record a confirmed payment of USD 5,000 against the advance, with test evidence.
4. Add L/C reference `LC-<suffix>` with expiry T+7 and latest shipment date T+5, amount/currency and required document terms if the UI supports it. Use a separate suitable PO if payment rules prohibit combining methods.

**Expected:** unique linked references; correct approvals/history; PO total 40,000; commitments 40,000, confirmed payments 5,000, outstanding 35,000, advance remainder 7,000. A schedule alone must not count as paid. Negative/excess payments and invalid date combinations are rejected according to rules. Record any unavailable fields/actions.

### IM-02 — Forwarders and competing quotations (IMP-23–25)

1. Shipments & Landed Cost: create shipment S1 for 3 of PO1's 4 units; preserve the PO-line relationship. Open its logistics details/cockpit.
2. Inspect any seeded forwarders (such as ESLSE, Bolloré/AGL, Maersk, MSC if seeded). Add active forwarders A/B. Toggle one forwarder **Deactivate** → confirm `Inactive` status → reactivate back to `Active`. Make a separate inactive forwarder and check it cannot be selected for new work.
3. Click **Add Freight Quote**. For A enter **Freight Forwarder**, **Quotation Reference** `QA-<suffix>`, **Currency** USD, **Ocean / Air Freight Rate** 1,000, **Destination Charges (Port/Terminal)** 200, and **Estimated Transit Days** 20. Add B as `QB-<suffix>`, USD 900, destination charges 350 and 25 days. Validity, terms and quotation attachment are absent from this modal; record them as frontend gaps.
4. Compare both. Select A with reason `Faster transit; total quoted cost 1200 vs 1250`.
5. Refresh. Try approval with the selecting user; then approve with a different authorized approver. Use a separate quotation/shipment to test rejection with reason and subsequent reselection/resubmission.

**Expected:** selection remains PENDING until separate approval; self-approval/unauthorized approval blocked where separation is enforced; decision history retains selection, reason, actor, time, rejection and approval. Only the approved choice is used as approved freight selection. Quotes do not automatically become actual landed costs.

### IM-03 — Booking, containers and milestones (IMP-26–28, 31)

1. Add booking `BK-<suffix>`, vessel `UAT Ocean`, voyage `V001`, carrier `Maersk Line`, origin `Shanghai`, destination `Djibouti`, ETD `T+3`, ETA `T+23`; update actual departure separately when simulating departure.
2. Add two containers: `UATU0000001` (`40ft High Cube`, seal `SEAL-01-<suffix>`, payload `26000` kg, weight `14000` kg, free time `7` days, free-time end `T+30`, empty return `T+32`) and `UATU0000002` (`40ft High Cube`, seal `SEAL-02-<suffix>`, payload `26000` kg, weight `14000` kg, free time `7` days).
3. Try a duplicate container number (`UATU0000001`) and invalid negative weight/free time.
4. Record production completion, cargo readiness, booking confirmation and departure milestones, planned dates and completion dates. Leave one planned milestone at `T-1` incomplete.
5. Refresh/open logistics overview.

**Expected:** multiple containers retained independently; estimates and actuals separate; invalid values/duplicates handled; milestone actor/timestamps retained; overdue milestone visible; overview shows forwarder, booking, containers and outstanding actions. Missing input fields are defects, not skipped requirements.

### IM-04 — Insurance and cargo tracking (IMP-29–31)

1. Record insurance required: policy `POL-<suffix>`, insurer `UAT Insurance`, insured value `30000` `USD`, premium `150` `USD`, coverage type `All Risks (Institute Cargo Clauses A)`, validity `T` through `T+40`, supporting PDF.
2. Add ECTN/cargo-tracking reference `ECTN-<suffix>`, status `PENDING`, submission deadline `T-1` and shipment cut-off `T+2`. Later record `SUBMITTED` / `APPROVED` and dates.

**Expected:** policy coverage, premium, currency, validity and evidence persist; outstanding/overdue cargo requirement visible before progression; resolving it updates overview. Insurance quotes/premiums are not proof of payment.

### IM-05 — Document checklist applicability (IMP-32–33, 37, 46, 48)

1. Locate document requirement configuration. If no frontend configuration screen exists, record Blocked for manual configuration and ask the developer to prepare these rules on the UAT environment: Commercial Invoice required/verified at SHIPPED; Customs Declaration required/verified at ETHIOPIAN_CUSTOMS_CLEARANCE; destination Ethiopia; applicable sea shipment type. Record exact active rules before testing.
2. With S1 still ORDERED, inspect document report/dashboard. A customs-stage requirement must not be reported as currently due merely because it exists for a later stage.
3. Attempt SHIPPED without the configured invoice: expect a block naming the missing document. Upload it without verification and retry: expect a block when verification is required.
4. Verify it as authorized reviewer and retry: this document condition clears; other valid stage prerequisites may still block progression.
5. Check a rule for another country/type does not apply. Test a shipment whose actual destination differs from the importer company country if that business case is supported.

**Expected:** checklist, report, dashboard and transition enforcement agree on country, shipment type and stage. No country-to-port comparison. **Known assumption to validate:** current country resolution uses importer/company country. If actual destination differs, incorrect applicability is a defect; do not mark multi-destination support passed.

### IM-06 — Verification, versions and discrepancies (IMP-32, 34–35, 42)

1. Add Commercial Invoice v1 with reference `CI-<suffix>`, issue T, expiry T+30 and attachment. Associate the correct shipment/PO.
2. Reject v1 with `Incorrect quantity: 4 instead of shipment quantity 3`. Upload corrected v2 linked to/superseding v1 and submit for verification. Approve v2 with a reviewer comment.
3. Add B/L with reference different from the shipment's B/L; add an expired document (T-1); try expiry before issue date and inconsistent PI reference. Inspect discrepancy messages.
4. Resolve errors, or exercise an explicitly authorized override with a non-empty reason. Attempt override as an unauthorized user and without reason.
5. Refresh report and audit history.

**Expected:** old rejected version/history remains; current version is identifiable; discrepancy blocks or flags as required; unauthorized/empty override fails; valid override records actor/reason/time. Expiry is derived from date even if stored status previously says VERIFIED. Superseded versions must not cause misleading current completeness results.

### IM-07 — Original documents and release (IMP-36)

1. Open **Update Document Verification & Status** and test the visible **Original Paper Status** values: NOT_RECEIVED, RECEIVED, RELEASED_TO_AGENT, ENDORSED_TO_BANK and SURRENDERED. Save and refresh.
2. Original dispatch date, receipt date, courier/reference, electronic-release date and outstanding-release-payment inputs are absent from the current frontend. Record those IMP-36 items as frontend gaps.

**Expected:** selected Original Paper Status persists. Date sequencing and release-payment acceptance remain Blocked/Fail until their frontend controls exist.

### IM-08 — Notifications, escalation and workflow permissions (IMP-38–42)

1. Use the overdue milestone, pending/rejected/expired documents and near-due L/C from earlier tests. Add an unpaid overdue schedule and a near-due container return on separate test records if required.
2. Open notifications/monitoring. Use a visible scan action if offered; otherwise allow the background scan (currently approximately every 15 minutes while backend runs). As separate developer/ops evidence only (not a UI pass substitute), verify `POST /api/shipments/scan-deadlines` returns generated-notification count and creates non-duplicate alert records when deadlines are near/overdue. Record time and wait long enough for the configured rule.
3. Confirm event type, entity/reference, intended recipient/role, creation time, delivery status and link. Scan twice in the same event window.
4. Escalate one overdue notification through the UI if offered; inspect recipient/history. Mark read and refresh.
5. Resolve the underlying condition and check no new obsolete reminders appear. Old history may remain.
6. Try selecting/approving freight, verifying docs, changing stages, exporting reports and editing workflow rules as a restricted role and as the authorized role.

**Expected:** events route correctly; no unexplained duplicates; escalation/read history persists; restricted actions denied; material payment/compliance/booking/quotation/document/approval changes show actors/timestamps. Verify latest-shipment-date and completely absent required-document alerts explicitly; other notification types do not prove these exist. Record missing configuration/history UI as Blocked/Fail.

### IM-09 — Partial shipment, receipt and landed-cost reconciliation (IMP-45, 47, 49, 52)

1. S1 contains 3 units. Create S2 for the remaining 1 unit. Attempt allocating a fifth unit against the same PO line.
2. On S1 add an actual approved freight cost `USD 1,000` once. Select the existing allocation method (`BY_VALUE` or `BY_QUANTITY`) and a known valid exchange rate. Allocate costs; record calculation/version.
3. Complete stage/document prerequisites and receive 2 of S1's 3 units into `Kality Assembly Plant Warehouse` using `CHS-UAT-<suffix>-01` / `ENG-UAT-<suffix>-01` and `CHS-UAT-<suffix>-02` / `ENG-UAT-<suffix>-02`. Receive the 3rd unit later (`CHS-UAT-<suffix>-03` / `ENG-UAT-<suffix>-03`). Leave S2 unreceived initially.
4. At the first receipt checkpoint inspect reconciliation: ordered 4, shipped 4, received 2. At the next checkpoint: ordered 4, shipped 4, received 3. Then receive S2 (`CHS-UAT-<suffix>-04` / `ENG-UAT-<suffix>-04`) and verify received 4.
5. Attempt duplicate receipt of `CHS-UAT-<suffix>-01` and over-receipt. Recalculate landed costs without adding another freight cost.

**Expected:** no over-allocation/duplicate stock; outstanding ordered quantity 2 then 1 then 0 (if using ordered-minus-received definition); payment commitments/confirmed payments remain separate from stock costs. With no other charges and equal allocation, S1 freight is 1,000/3 per unit before rounding, total 1,000. Quotation values must not be added again. Converted totals reconcile to selected exchange rate with documented rounding; recalculation does not duplicate cost.

### IM-10 — Reports, filters, exports and drill-down (IMP-43–48)

**Navigate:** Import Pipeline & Reports.

1. Pipeline: find requisition, PO1, S1/S2; filter business unit, supplier, destination, status and date separately and combined. Clear filters and verify restoration.
2. Export filtered CSV, open it and compare references/counts with the screen. Confirm restricted roles cannot export unauthorized data.
3. Payment/L/C report: compare 40,000 commitments, 5,000 confirmed and 35,000 outstanding before further payments; verify due/overdue, expiry and latest-shipment dates.
4. Logistics: verify selected approved forwarder, vessel, overdue milestone and separate container deadlines. Export.
5. Document report: test Missing, Pending, Rejected, Expired and Verified filters; compare applicable checklist and latest versions; export.
6. Reconciliation: compare quantities/payments/costs with IM-09 and export. Check multiple shipments do not multiply PO totals.
7. Monitoring: compare underlying report totals; click metrics to reach the correct filtered records.

**Expected:** filters/exports agree, dates/currencies clearly labeled, no duplicated quantities/payments, metrics drill down correctly. Record missing export or drill-down actions rather than assuming presence.

## 5. Client feedback lifecycle

### FB-01 — Masters and vehicle specifications (KMS-FB-10, 16)

1. Customers & Dealers → **Register Customer / Dealer**: create A, B and the dealer using **Customer Category**, **Full Name / Organization Name**, **Mobile Number**, TIN/withholding controls when applicable, **Region**, **Address / Town**, and optional customer bank rows. Reopen each and search by the values named in the visible search box: name, code, mobile and TIN.
2. **Frontend gap:** Contact Person, Email, Preferred Contact Method and Business/Occupation are absent from the current create/edit forms. KMS-FB-10 must be recorded Failed/Blocked for these fields and searches.
3. Product Master Data → **Register Product Item (Model)**: enter **Item Code**, **Item Name**, **Vehicle Category**, **Brand**, **Model Specifics** `2026 New BEV`, **Unit of Measure**, **Vehicle Colour**, **Engine / Motor Capacity**, **Battery Power (kWh)** `60.48`, **Selling Price**, tax configuration, reorder level and **Weight per Unit (KG)**. Reopen it.
4. **Frontend gap:** Model Year, Powertrain, New/Used, Fuel/Energy Type and Driving Range are absent as separate controls. KMS-FB-16 and the requested Brand + Model + Year + New/Used selector display cannot be marked passed.

**Expected:** supported fields persist and existing inventory remains intact. The missing Jira controls are implementation gaps, not test-data errors.

### FB-02 — Enquiry, dual approval and conversion (KMS-FB-11–15, 17)

1. Sales Enquiries & Quotes → **Create Sales Enquiry**: choose **Customer**, **Vehicle Model**, **Quantity** 1, **Unit Price (ETB)** 100,000, **Salesperson Full Name**, and **Intended Payment Mode**. Save, refresh, and search by enquiry number, customer or model.
2. **Frontend gap:** Lead Source, Branch/Showroom, Vehicle Category, Preferred Colour, Required Delivery Date, Registration/Homologation, Charger Type, Target Budget/Currency, Financing/provider, Expected Deposit, Payment Timeline, Trade-in and Special Requirements/Notes are absent from this form. Record KMS-FB-11–14 Failed/Blocked for these fields.
3. Verify Enquiry No. and Enquiry Date are generated/displayed; they are not manual inputs in the current frontend.
4. Submit as representative. Attempt final approval before representative approval as applicable; complete representative then manager approvals using designated users. On a second enquiry, reject with reason, correct and resubmit.
5. Convert the approved enquiry to booking and compare only fields actually captured by the visible form. Attempt duplicate conversion. Missing Jira fields cannot receive a retention pass.

**Expected:** generated unique number/date, both approvals, actors/timestamps and rejection history work. KMS-FB-11–14 remain incomplete while their frontend inputs are absent.

### FB-03 — Booking and draft attachments (KMS-FB-01, 17)

1. Advance Bookings: optionally select **Approved Pre-Advance Slip**, then enter **Customer**, **Vehicle Item**, **Order Quantity** 1, **Unit Price (ETB)** 100,000, **Min Advance Req (ETB)** 20,000, **Salesperson Full Name**, and **Target Delivery Date** T+14. Click **Add Documents** before creation, attach two PDFs, open/download one, remove the other, then create the booking.
2. Reopen the saved booking: retained attachment must remain linked. Create another booking without attachments and confirm attachments are optional.
3. Verify generated reference/date and customer/vehicle details. Try negative Unit Price/Min Advance and Min Advance above gross. Payment Method is not present on the booking form; test it later on the BRV and record the KMS-FB-17 booking-form field as a frontend gap.

**Expected:** expected initial balance may show 80,000, but actual outstanding remains 100,000 before real receipts; actual received amount is 0. Labels must distinguish these quantities. Draft file survives creation; removed file unavailable; other booking cannot see A's file.

### FB-04 — BRV and actual booking balances (KMS-FB-02, 17)

1. BRV Receipts & Deposits: record/post receipt 20,000 for A with `bank-slip.pdf`, bank/payment reference `PAY-A1-<suffix>` and valid account/date.
2. Reopen receipt and booking, download attachment, inspect Customer Ledger & SOA.
3. Add/post a second receipt 30,000. Attempt duplicate reference/posting where validation supports it.

**Expected:** confirmed receipts 20,000 then 50,000; actual outstanding 80,000 then 50,000. Attachments remain on the correct BRV. Draft/unconfirmed receipt must not act as confirmed payment; duplicate posting must not double credit.

### FB-05 — Authorized excess transfer (KMS-FB-05)

1. Create B's booking gross 100,000, no receipts. On A, add confirmed 70,000 to reach total receipts 120,000 against gross 100,000: true excess 20,000.
2. Open excess-transfer action. Select A as source, B as destination, verify customer identities, amount 15,000, reason `Customer-authorized cross-customer transfer <suffix>`, authorization reference `AUTH-<suffix>` with supporting authority retained.
3. Complete any required approval and transfer. Refresh bookings, original receipts, both customer ledgers and audit.
4. Try 6,000 more (only 5,000 remains), zero/negative amount, same source/destination, missing authorization reference, insufficient-excess source and unauthorized user. Repeat-click/refresh after successful transfer to detect duplicates.

**Expected:** A's net allocated credit becomes 105,000, residual excess 5,000; B gets 15,000 and outstanding 85,000. Original receipts remain unchanged. One traceable transfer/paired ledger effect, no money created/lost, no partial update. All invalid attempts leave both balances unchanged. A required approval must be demonstrated, not inferred from an authorization text field.

### FB-06 — Refund attachments and lifecycle (KMS-FB-03)

1. **Excess & Refund Payouts**: request refund against an eligible test balance (or a separate test booking so `FB-05` arithmetic remains intact), reason `EXCESS_PAYMENT` / `Customer refund UAT <suffix>`, attach `refund-letter.pdf` and test bank details (`Commercial Bank of Ethiopia`, A/C `100099887766`, Holder `UAT Buyer A <suffix>`); submit.
2. Approver (`approver_uat` or authorized `FINANCE_MANAGER`) opens/downloads files; approve and process using normal controls. On another request test rejection with reason `Insufficient justification <suffix>`.

**Expected:** evidence remains accessible through requested/approved/processed or rejected states; wrong roles cannot approve/process; ledger/balance changes occur only at the appropriate financial step. Use a separate booking if necessary to preserve FB-05 arithmetic.

### FB-07 — Sold vehicle retained on premises (KMS-FB-06)

1. Allocate an available test VIN (`CHS-UAT-<suffix>-01` or available stock unit) to the correct buyer, approve allotment and complete invoice/sale prerequisites until `SOLD` or `READY_FOR_DELIVERY`.
2. **Vehicle Units & Chassis** / relevant custody action: retain vehicle for the actual buyer, ownership date `T`, retention reason `Customer collecting T+7`, storage/insurance responsibility and planned handover details where offered.
3. Try marking an unsold vehicle retained and assigning a different buyer. Try allocating retained VIN to B.
4. **Inventory & Warehouses**: inspect physical presence, available stock, company-owned valuation and customer custody details. Deliver/release later through **Deliveries & Handover**.

**Expected:** only eligible actual buyer accepted; retained VIN physically visible but unavailable for resale and excluded from company-owned inventory value; custody duration/responsibility traceable; eventual handover updates custody without a second sale or duplicate stock deduction. Missing storage/insurance fields are recorded.

### FB-08 — Spare parts POS attachments and credit reporting (KMS-FB-04, 07)

1. **Spare Parts & POS**: use `UAT-PART-<suffix>` (`UAT Brake Pad <suffix>`) in `Kality Assembly Plant Warehouse` with at least `10` units stocked; sell `3` units × `1,000` (customer `Customer A` / `UAT Buyer A <suffix>`). Record actual invoice total including taxes. Attach `pos-support.pdf` to the sale/invoice through the available document action.
2. Complete sale with payment method `CUSTOMER_CREDIT` (and supported terms/due date); reopen sale and invoice and download file. Record a partial payment of `1,000` through the proper receipt workflow.
3. Reports & Analytics Hub → credit sales report: locate customer/reference/date, invoice total, paid amount, outstanding, due date and status. Also locate a vehicle credit sale.
4. Filter date/customer/branch/status and export. Settle remaining balance and confirm the originally-credit sale remains correctly classified/history retained. Test approved reversal/refund on a separate transaction.

**Expected:** attachment survives completion and links correctly; outstanding = actual invoice total minus applicable confirmed allocations/adjustments; no full-payment assumption after partial payment; export matches filters; vehicle and spare-part credit sales represented.

### FB-09 — Stock aging (KMS-FB-08)

1. Inventory/report aging: locate a newly received VIN and spare part in the chosen warehouse/category. Compare stock-entry date to T.
2. Inspect existing UAT fixtures aged 30/31, 60/61, 90/91 and 180/181 days. If unavailable, record boundary tests Blocked and request dated test fixtures; do not change the computer clock or production records.
3. Filter warehouse, category, item/VIN and aging range; export. Compare a transferred item to the agreed age-origin policy.

**Expected:** correct 0–30, 31–60, 61–90, 91–180, >180 buckets; VIN shown for vehicles; spare-part product/warehouse detail; no unexplained age reset on transfer; exported totals match screen and source stock. Record batch-level limitations.

### FB-10 — Configurable approval reminders (KMS-FB-09)

1. Approval Queue & Policies currently renders the approval queue but no Reminder Engine button/modal. Record reminder configuration as a **frontend gap**; do not look for controls that are absent.
2. Submit a test approval and leave it pending. If no approver notification/history view exists, record delivery/history as Failed/Blocked. Background scheduler code is not a manual frontend pass.
3. Refresh/recheck within the same interval: no duplicate. Leave pending for the next interval if repeat reminders are configured. Test escalation if offered.
4. Approve one, reject another, cancel another; verify future reminders stop. Restore original settings.

**Expected:** visible configuration, delivery and history are required for a frontend Pass. KMS-FB-09 is Partial/Failed until those controls are present.

## 6. Closure, regression and acceptance (IMP-49–53)

1. Reopen pre-existing PO, shipment, booking, invoice, customer and inventory records. Confirm readability and unchanged balances/links.
2. Review Audit Trail Logs for every major test change: actor, time, entity, operation and material changes; rejected/overridden actions remain traceable where required. Bank data should follow the approved visibility/masking policy.
3. Repeat key restricted actions with non-admin users. Admin success does not prove role controls.
4. Record all UI failures and missing controls with steps, expected/actual result and screenshot. Retest fixed defects using a new run suffix.
5. Restore company, default bank and reminder settings using normal audited edits. Keep test financial documents clearly marked; do not delete posted data to hide discrepancies.
6. If validating a containerized release environment (`IMP-49`), confirm image/container deployment (`docker compose down` / `docker compose up -d` for `poggab/kanab-backend:latest` and `poggab/kanab-frontend:latest`), `GET /api/health` returning `{ "status": "ok" }`, and clean frontend navigation without browser console errors.
7. Attach completed results to the three Jira cases. Client/product owner signs acceptance only after all mandatory tests pass or exceptions are explicitly accepted.

## 7. Jira coverage checklist

| Jira requirement | Tests | Result |
|---|---|---|
| IMP-23 forwarder master | IM-02 | Not run |
| IMP-24 quotation comparison/history | IM-02 | Not run |
| IMP-25 separate forwarder approval | IM-02 | Not run |
| IMP-26 booking/vessel | IM-03 | Not run |
| IMP-27 multiple containers | IM-03 | Not run |
| IMP-28 milestones | IM-03 | Not run |
| IMP-29 insurance | IM-04 | Not run |
| IMP-30 ECTN/deadlines | IM-04, IM-08 | Not run |
| IMP-31 logistics overview | IM-03, IM-04 | Not run |
| IMP-32 metadata/versioning | IM-06 | Not run |
| IMP-33 configurable checklist | IM-05 | Not run |
| IMP-34 verification | IM-06 | Not run |
| IMP-35 consistency/override | IM-06 | Not run |
| IMP-36 original/release | IM-07 | Not run |
| IMP-37 stage enforcement | IM-05 | Not run |
| IMP-38 workflow configuration | IM-01, IM-02, IM-08 | Not run |
| IMP-39 role permissions | CP-05, IM-08, closure | Not run |
| IMP-40 deadline notifications | IM-08 | Not run |
| IMP-41 escalation/history | IM-08 | Not run |
| IMP-42 audit trail | IM-06, IM-08, closure | Not run |
| IMP-43 pipeline | IM-10 | Not run |
| IMP-44 payments/L/C report | IM-01, IM-10 | Not run |
| IMP-45 logistics report | IM-10 | Not run |
| IMP-46 document report | IM-05, IM-06, IM-10 | Not run |
| IMP-47 reconciliation | IM-09, IM-10 | Not run |
| IMP-48 monitoring | IM-05, IM-10 | Not run |
| IMP-49 migrations/regression | Preparation, closure; migration/schema evidence from developer | Not run |
| IMP-50 integrated workflow | IM-01 through IM-10 | Not run |
| IMP-51 exceptions/permissions | Negative steps throughout | Not run |
| IMP-52 calculations | IM-01, IM-09, IM-10, FB-04, FB-05 | Not run |
| IMP-53 UAT/defect resolution | Completed results and client sign-off | Not run |
| KMS-FB-01 booking attachments | FB-03 | Passed |
| KMS-FB-02 BRV attachments | FB-04 | Passed |
| KMS-FB-03 refund attachments | FB-06 | Passed |
| KMS-FB-04 POS/invoice attachments | FB-08 | Not run |
| KMS-FB-05 excess transfers | FB-05 | Passed |
| KMS-FB-06 customer-owned custody | FB-07 | Passed |
| KMS-FB-07 credit report | FB-08 | Not run |
| KMS-FB-08 stock aging | FB-09 | Not run |
| KMS-FB-09 approval reminders | FB-10 | Not run |
| KMS-FB-10 customer/dealer master | FB-01 | Passed |
| KMS-FB-11 enquiry details | FB-02 | Passed |
| KMS-FB-12 vehicle requirements | FB-01, FB-02 | Passed |
| KMS-FB-13 budget/preferences | FB-02 | Passed |
| KMS-FB-14 notes retention | FB-02 | Passed |
| KMS-FB-15 dual approvals | FB-02 | Passed |
| KMS-FB-16 vehicle specifications | FB-01 | Passed |
| KMS-FB-17 booking/payment distinctions | FB-02–05 | Passed |
| Company profile fields/access/audit | CP-01, CP-05 | Passed |
| Importer codes/reuse/history | CP-02 | Passed |
| Multiple banks/default/inactive/history | CP-03 | Passed |
| Supplier exporter details/history | CP-04 | Passed |

Final acceptance: environment ______; run suffix ______; passed ______; failed ______; blocked ______; not run ______; unresolved defect IDs ______; approved exceptions ______; client/product owner ______; date ______.
