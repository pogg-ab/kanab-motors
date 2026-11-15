# KANAB Motors — Frontend Client Presentation Guide

Prepared: 15 November 2026  
Purpose: A presenter’s guide to demonstrating the current sales, inventory, procurement, and customer account workflows.

> Presenter note: This guide is based on the current frontend source and selected backend workflow checks. It is not a record of a live acceptance test. Rehearse the steps with your demo database before the meeting. Menu items and actions depend on the signed-in user’s permissions and each record’s status.

## 1. Where to start and where to finish

**Start at the Executive Dashboard. Finish at Reports & Analytics Hub, then return to the Executive Dashboard for your closing remarks.**

Tell one connected story: **“A customer requests a vehicle, the business approves the sale, finance verifies payment, operations assigns a specific vehicle, and the customer receives it with supporting documents.”**

Use the sidebar labels below to navigate. The presentation order deliberately follows the business process rather than the sidebar’s visual order.

### Recommended main demonstration: 35–40 minutes

| Order | Page | Time | Main point |
|---|---|---:|---|
| 1 | Login → Executive Dashboard | 3 min | Introduce the system and management overview |
| 2 | Customers & Dealers | 3 min | Identify the customer and maintain their profile |
| 3 | Product Master Data → Vehicle Units & Chassis → Inventory & Warehouses | 4 min | Explain models, individual vehicles, and available stock |
| 4 | Sales Enquiries & Quotes | 5 min | Capture demand, review pricing, approve, and view the pre-advance slip |
| 5 | Advance Bookings | 2 min | Turn the approved enquiry into a reservation |
| 6 | BRV Receipts & Deposits → Advance Bookings | 4 min | Verify payment and show its effect on the booking |
| 7 | Vehicle Allotments | 3 min | Assign and approve the exact chassis |
| 8 | Sales Invoices & VAT | 3 min | Review the invoice and settlement |
| 9 | Deliveries & Handover | 4 min | Complete inspection, release, and handover documentation |
| 10 | Customer Ledger & SOA | 2 min | Reconcile the customer’s financial position |
| 11 | Approval Queue & Policies → Unified Document Center → Audit Trail Logs | 3 min | Demonstrate oversight and traceability |
| 12 | Reports & Analytics Hub → Executive Dashboard | 3 min | Finish with business visibility and questions |

Allow another 15–20 minutes for the procurement, spare parts, and administration extensions in section 5, plus questions.

## 2. Prepare before the meeting

- Start the backend and frontend and confirm the database is reachable. The documented local frontend address is `http://localhost:5173`; use the address shown by your running environment.
- Use a demo database and a user with the permissions needed for the presentation. Have the appropriate reviewer accounts ready if demonstrating separate roles.
- Prepare one identifiable demo customer, one vehicle model, and one matching physical vehicle in `AVAILABLE_FOR_SALE` status.
- Prepare an approved enquiry and booking as backup, plus an approved invoice and completed delivery that you can open if time runs short.
- Use a valid salesperson’s full name on the enquiry. Generic values such as “Admin,” “Test,” or “Demo Salesperson” can block conversion.
- Check that the pre-advance slip you plan to show is still active; slips can expire.
- Prepare sample attachments: customer supporting document, bank slip, and relevant invoice or import documents.
- Check the quote totals, required advance, invoice amount, and deposit amounts during rehearsal. For the main demo, use a straightforward fully paid sale; leave installments, credit, exemptions, and withholding tax for follow-up discussion.
- Set report dates to include your demo transactions. Recheck date filters when returning to the dashboard.
- Rehearse the print previews for the pre-advance slip, receipt, allotment, invoice where available, and gate pass. Close each preview before continuing.
- Keep this guide open on another screen. Avoid reading every field aloud: explain the purpose, show one action, and point out the result.

### Demo record tracker

Fill this in during rehearsal so you can find the same transaction on every page.

| Record | Your demo reference |
|---|---|
| Customer name / code | ____________________ |
| Product / model | ____________________ |
| Vehicle chassis / engine number | ____________________ |
| Enquiry / pre-advance slip | ____________________ |
| Booking | ____________________ |
| BRV receipt(s) | ____________________ |
| Allotment | ____________________ |
| Invoice | ____________________ |
| Delivery / gate pass | ____________________ |

## 3. Explain the workflow before clicking

### Main sales workflow

```text
Customer + Product + Available Vehicle Stock
                     ↓
Sales Enquiry → Required Review / Approval → Pre-Advance Slip
                     ↓
Convert Approved Enquiry to Advance Booking
                     ↓
Record BRV Deposit → Finance Confirmation → Check Booking Balance
                     ↓
Request Vehicle Allotment → Approve Specific Chassis
                     ↓
Complete Required Payment / Settlement → Sales Invoice Approval
                     ↓
Pre-Delivery Inspection → Delivery Order → Authorize Release → Gate Pass
                     ↓
Customer Ledger / Statement → Reports / Dashboard
```

**Sequence note:** For this demonstration, use **Convert to Booking** from the approved enquiry, then record a BRV linked to that booking. The current conversion implementation permits this sequence. The manual booking form contains wording about an enquiry → slip → payment mandate, while the BRV form also supports general deposits without a booking. Avoid mixing those alternative entry paths in the main demo.

**Approval note:** Follow the review steps presented for your user and record. The code includes sales representative and sales manager review paths; do not promise that every role can complete every approval with one click.

Opening words:

> “Today I’ll walk through the current KANAB Motors system using one vehicle sale. We’ll follow the customer from enquiry through payment, vehicle allocation, invoicing, and delivery, and then see how management tracks the result.”

## 4. Main demonstration: page-by-page script

### Step 1 — Login and Executive Dashboard

**Show / do:**

1. Sign in with the prepared demo account and select **Executive Dashboard** explicitly; the application can remember the last opened page.
2. Briefly orient the client to the sidebar and its business areas.
3. Select **This Month**, or a custom period containing your demo data.
4. Point to sales revenue, customer deposits, outstanding receivables, customer credit, excess payments, and vehicle status information displayed on the page.
5. Explain one figure rather than reading all the cards.

**Say:** “This is the management starting point. It brings together sales, customer money, and vehicle availability so managers can identify where attention is needed.”

**Result to highlight:** A useful overview for a selected reporting period. Do not describe it as continuously updating automatically; refresh or reapply filters when checking changes.

**Transition:** “Let’s follow the customer and transactions behind these figures.”

### Step 2 — Customers & Dealers

**Show / do:**

1. Search for the prepared customer and open their profile.
2. Show the customer code, customer type, contact details, region/address, and TIN fields.
3. Show banking details and supporting documents where present.
4. If creating a record live, use unique demo contact details and complete the required fields. Explain that dealer and government customers require a TIN.
5. Point out the customer account summary, using actual values from the selected record.

**Say:** “The customer profile provides the common reference for sales, deposits, documents, and account follow-up.”

**Result to highlight:** The same customer will be selected throughout the sale.

**Transition:** “Now we’ll look at what this customer wants to buy and which physical units are available.”

### Step 3 — Product Master Data, Vehicle Units & Chassis, and Inventory & Warehouses

**Show / do:**

1. In **Product Master Data**, open the chosen model and show its item code, category/brand, selling price, and relevant specifications.
2. In **Vehicle Units & Chassis**, find a physical unit of that model. Show its unique chassis number, engine number, warehouse, and current status.
3. In **Inventory & Warehouses → Stock Balances**, show the model’s warehouse stock.
4. Briefly point out **Stock Transfers**, **Movement History Log**, and **Vehicle State Machine**. Use an existing movement if you need an example.

**Say:** “The product record describes the model. The vehicle unit identifies the exact physical vehicle. Inventory shows where stock is held and its operational status.”

**Result to highlight:** A matching unit is available for sale. Keep its chassis reference for the allotment step.

**Transition:** “With the customer and stock identified, the sales team can prepare the enquiry.”

### Step 4 — Sales Enquiries & Quotes

**Show / do:**

1. Open the enquiry form or a prepared enquiry.
2. Show the customer, vehicle model, quantity, price, salesperson’s full name, and relevant terms or notes.
3. Point out the displayed subtotal, VAT, and total. Describe the current calculation shown on screen rather than making broader tax-compliance claims.
4. Submit the enquiry, then complete the required review/approval steps with the permitted user, or open the prepared approved example.
5. Open the resulting pre-advance slip and show its reference, customer, vehicle, amount, and validity.
6. On the approved enquiry, choose **Convert to Booking** and note the resulting booking number.

**Say:** “The enquiry records the commercial terms for review. Approval provides the pre-advance document, and conversion carries the approved sale into the booking workflow.”

**Result to highlight:** The enquiry is converted and a booking reference is produced.

**Transition:** “The request is now a reservation that finance and operations can follow.”

### Step 5 — Advance Bookings

**Show / do:**

1. Find the booking created in the previous step.
2. Show the customer, model, quantity, booked price, required advance, deposited amount, outstanding balance, and booking status.
3. Explain that a model reservation is different from assigning a specific chassis.
4. Briefly mention cancellation and transfer actions only if asked; keep the main sale moving forward.

**Say:** “The booking is the working record for this customer’s vehicle order. It lets the team track both the payment requirement and fulfillment progress.”

**Result to highlight:** A traceable booking exists, with the payment position clearly visible.

**Transition:** “Next, finance records and verifies the customer’s deposit.”

### Step 6 — BRV Receipts & Deposits, then return to Advance Bookings

**Show / do:**

1. Create a receipt for the same customer and explicitly select the **Linked Booking**. Do not leave it as a general deposit for this walkthrough.
2. Enter the rehearsed amount, instrument type, bank, and reference details.
3. Show the supporting bank-slip attachment action and open a sample attachment if prepared.
4. Show the submitted receipt, then confirm it with the permitted finance user. If an installment review is required, demonstrate that approval stage or use the prepared standard-payment example.
5. Open the official BRV voucher.
6. Return to **Advance Bookings** and verify the deposited amount, remaining balance, and status.

**Say:** “Entering a receipt and confirming it are separate steps. Finance verifies the payment before we rely on it for the booking’s financial progress.”

**Result to highlight:** The confirmed payment is reflected against the intended booking. For a shorter demo, record the full rehearsed amount; for a staged-payment demo, show the advance now and the remaining payment before settlement and delivery.

**Transition:** “Once the required advance is satisfied, operations can assign the actual vehicle.”

### Step 7 — Vehicle Allotments

**Show / do:**

1. Create an allotment request for the demo booking.
2. Select the matching available unit by chassis number.
3. Show the booking/customer relationship, model, and selected vehicle before submitting.
4. Complete the permitted approval action, or open the prepared approved allotment.
5. Open the formal allotment document and show the history where available.

**Say:** “This is where the customer’s model-level order becomes an assignment of a specific physical vehicle.”

**Result to highlight:** The booking and chassis are linked. The implementation checks the advance requirement, model match, available-for-sale status, quantity, and duplicate allocation.

**Transition:** “We can now review the invoice for the assigned vehicle and complete financial settlement.”

### Step 8 — Sales Invoices & VAT

**Show / do:**

1. If there is a remaining payment in your rehearsed standard sale, record and confirm it through **BRV Receipts & Deposits** before continuing.
2. Open the invoice creation action and select the eligible booking/vehicle offered by the form.
3. Show the customer, chassis, net amount, VAT, and gross total.
4. Submit and complete the permitted **Approve Invoice & Settle** action, or show the prepared approved invoice.
5. Open invoice details and supporting documents. Use the available invoice output/print action only after rehearsing it.
6. Mention withholding tax and exemption handling as additional cases only if relevant to the client; do not add them to the main transaction.

**Say:** “The invoice connects the commercial sale to the customer, assigned vehicle, tax calculation, and settlement.”

**Result to highlight:** An approved invoice with amounts that agree with your prepared transaction. Confirm the actual financial position rather than assuming invoice approval alone means all money has been received.

**Transition:** “Financial processing is followed by inspection and controlled handover.”

### Step 9 — Deliveries & Handover

**Show / do:**

1. Open **PDI Checklist Station** and explain that PDI means pre-delivery inspection.
2. Choose **Record PDI Inspection**, select the demo vehicle, and show the checklist and inspection details. Review each check explicitly; the form can initialize checks as passed.
3. Submit the prepared successful inspection and verify the result.
4. Return to the delivery orders view and create the delivery record using the eligible vehicle and customer details.
5. Complete **Authorize Release** with the permitted user once inspection and settlement requirements are satisfied.
6. Open **Gate Pass** and show vehicle identity, customer details, inspection information, and handover/signature sections. Show print preview if rehearsed.

**Say:** “The handover process connects physical inspection with financial clearance and the documents needed to release the vehicle.”

**Result to highlight:** An authorized delivery record and its gate-pass documentation. Check the vehicle’s resulting status; delivery approval and vehicle lifecycle status are separate fields.

**Transition:** “Let’s close the transaction by checking the customer’s account.”

### Step 10 — Customer Ledger & SOA

**Show / do:**

1. Select the same customer and a date range that includes the transaction.
2. Show the receipt and invoice references in the account activity.
3. Explain the displayed debit, credit, and balance information using the page’s actual labels.
4. Show the statement output/export action available in your rehearsed session.
5. If the account contains earlier transactions, explain them before discussing the closing balance.

**Say:** “The statement gives finance and the customer one view of account activity, rather than requiring them to reconstruct it from separate documents.”

**Result to highlight:** The demonstrated transaction can be traced into the account. A zero balance is expected only if the actual account entries and settlement support it.

**Transition:** “The same process also leaves records for review, document retrieval, and management reporting.”

### Step 11 — Approvals, documents, and audit trail

| Page | What to show | What to say |
|---|---|---|
| **Approval Queue & Policies** | An existing pending request, its type/status, and available review controls; briefly show policy information exposed to your role | “Reviewers can see work awaiting a decision and apply the required controls.” |
| **Unified Document Center** | Search/filter for a prepared document and show its linked record and retrieval action | “Supporting evidence stays associated with the business record.” |
| **Audit Trail Logs** | Find a relevant action and show the actor, timestamp, affected record, and change details exposed in the view | “The team can investigate who performed an action and when.” |

Keep this section brief. Show one concrete example per page. Do not claim every action is audited unless verified.

**Transition:** “Finally, management can review these activities across the business.”

### Step 12 — Reports & Analytics Hub, then Executive Dashboard

**Show / do:**

1. Open **Sales Reports** and select **Daily Sales**, **Monthly Trend**, or **By Vehicle Model**.
2. Apply a period containing the demo data and show one meaningful result.
3. Open **Operational Reports** and show the sales invoice or vehicle delivery report.
4. Briefly show **Inventory & Fleet Reports** and **Customer Financial Reports**. Mention **Credit Sales & Stock Aging** as a further management view.
5. Demonstrate an available export with prepared data if needed.
6. Return to **Executive Dashboard**, refresh/reapply the period, and explain the overview using the actual figures. Do not promise that every dashboard card must change after one transaction.

**Say:** “We have followed the same customer from enquiry to handover. These reports allow management to review sales, fulfillment, stock, and customer balances across many transactions.”

**Closing words:**

> “That completes the main workflow currently represented in the application. I’d now like to confirm whether the approval responsibilities, documents, and reports match how your teams work, and capture any changes you want prioritized.”

## 5. Optional extensions

### A. Procurement and import workflow — 10–12 minutes

Present this as a second story: **“How stock reaches the business before it is sold.”** Use prepared linked records instead of entering an entire shipment live.

```text
Suppliers Master → Import Requisitions → Review / Approval
   → Purchase Orders → Shipments & Landed Cost
   → Shipment Documents / Receipt → Inventory & Warehouses
   → Import Pipeline & Reports
```

| Order / page | Show / do | Talking point |
|---|---|---|
| 1. **Suppliers Master** | Open a supplier; show contact details and the freight-forwarder area | “Procurement maintains the parties involved in supply and transport.” |
| 2. **Import Requisitions** | Open a prepared request; show items, quantities, budget information, status, and approval/conversion controls | “The buying requirement is reviewed before it becomes a supplier order.” |
| 3. **Purchase Orders** | Open the related PO; show supplier, line items, quantities, values, and current status | “The PO records the agreed purchasing requirement.” |
| 4. **Shipments & Landed Cost** | Open a shipment; show logistics, tracking, costs, allocation, documents, and receipt areas | “The shipment brings together movement, supporting evidence, and import costs.” |
| 5. Shipment cost/document detail | Show a prepared cost entry, currency/exchange-rate information, allocation, and sample commercial invoice or bill of lading | “Management can inspect what contributes to the landed cost.” |
| 6. Shipment receipt → **Inventory & Warehouses** | Show an existing completed receipt and identify the resulting vehicle/stock records | “Receipt connects the import process to physical stock.” |
| 7. **Import Pipeline & Reports** | Show a prepared pipeline or cost report | “Procurement can review shipment progress and cost information.” |

Before the meeting, verify the exact receipt and posting prerequisites on your prepared shipment. Do not advance stages merely to make the status bar look complete. Finish by returning to **Inventory & Warehouses** and connect this stock to the sales story.

### B. Spare Parts & POS — 3–4 minutes

1. Open **Spare Parts & POS** and show the catalog tab with a prepared part.
2. Show stock by warehouse and any useful low-stock filter.
3. Open the POS tab and prepare a sample sale using an in-stock part; show quantity, price, customer/payment details, and total fields available in the form.
4. Complete a sale only in the rehearsed demo environment, then show its receipt and resulting stock/report information. Otherwise, use a prepared completed sale.
5. Open the reports tab to show how parts activity can be reviewed.

**Say:** “Alongside vehicle sales, the system has a separate working area for parts catalog, stock, and counter sales.”

### C. Excess payments and refunds — 2–3 minutes

1. Open **Excess & Refund Payouts** with a prepared customer who has an eligible balance.
2. Show the balance, proposed refund/settlement details, and approval/status information.
3. If discussing cross-customer payment transfers, show the corresponding transfer/review controls in **BRV Receipts & Deposits**, including authorization information.
4. Explain the review process using the actual record. Use a prepared completed example to illustrate the outcome.

**Say:** “Customer money may also need to be refunded or transferred through a controlled process.”

### D. Company settings and access — 2–3 minutes

| Page | Show | Talking point |
|---|---|---|
| **Company & Importer Profile** | Company identity, importer information, branding, and bank details available on the page | “Shared company information supports consistent business documents and identity.” |
| **Users & Permissions** | A prepared user/role and permission assignment | “Access can reflect each team’s responsibilities.” |

If useful, briefly sign in with a prepared restricted account to demonstrate the actual menu/actions available to that role. Return to your presenter account afterward.

## 6. If you only have 15 minutes

Use existing records and show the relationship between them rather than entering forms live.

| Time | Navigation | Evidence to show |
|---|---|---|
| 0–2 min | Executive Dashboard | Selected period and two management figures |
| 2–4 min | Customers & Dealers → Sales Enquiries & Quotes | Customer, approved quote, and pre-advance slip |
| 4–7 min | Advance Bookings → BRV Receipts & Deposits | Booking reference, confirmed receipt, and payment position |
| 7–9 min | Vehicle Allotments | Same booking assigned to a specific chassis |
| 9–12 min | Sales Invoices & VAT → Deliveries & Handover | Approved invoice, inspection evidence, and gate pass |
| 12–15 min | Customer Ledger & SOA → Reports & Analytics Hub | Account traceability, one report, and closing questions |

## 7. Handling interruptions during the demo

| Situation | Presenter response |
|---|---|
| A page is empty | Check filters/date range and permissions, then use the prepared example. An empty page alone does not demonstrate a completed workflow. |
| An action is missing | Check role and record status. Explain the intended responsibility and switch to the prepared authorized account if appropriate. |
| An approval blocks progress | Show the pending state as part of the process; use the prepared approved record to continue the story. |
| Conversion fails | Check that the enquiry is fully approved and has a valid salesperson name. |
| Allotment fails | Check the deposit threshold, matching model, available-for-sale status, remaining quantity, and existing allocation. |
| Delivery authorization fails | Check inspection and financial settlement requirements; continue with the prepared completed delivery. |
| A request or export fails | Acknowledge the issue, capture the message for follow-up, and move to the next prepared record. Do not describe the failed operation as completed. |
| The client requests a new feature | Record the requested outcome and who needs it. Distinguish the feature visible today from proposed work. |

## 8. Questions to capture at the end

- Does this sales-to-delivery sequence match your daily process?
- Who should submit, review, approve, and release each type of transaction?
- Are the customer, receipt, invoice, allotment, and handover documents sufficient?
- Which reports do managers need daily, weekly, and monthly?
- Which exception should we review next: installments, credit sales, withholding tax, refunds, transfers, or import costing?
- What changes are essential before your team starts user acceptance testing?

## 9. Presenter’s final checklist

- [ ] I can find the same customer, booking, chassis, invoice, and delivery quickly.
- [ ] I have rehearsed the main workflow with the intended permissions.
- [ ] I know which steps I will execute live and which completed records I will show.
- [ ] My slips, report dates, attachments, and print previews are ready.
- [ ] I can explain model vs. physical unit, booking vs. allotment, and submitted vs. confirmed payment.
- [ ] I will finish with the account statement, reports, and concrete client feedback.

---

Internal reference: Navigation and page names were checked against `frontend/src/App.tsx`, `frontend/src/components/Sidebar.tsx`, and the corresponding files under `frontend/src/pages/`. Conversion and allotment prerequisites were cross-checked in the booking and allotment backend services. This guide does not certify deployment readiness, complete test coverage, or regulatory compliance.
