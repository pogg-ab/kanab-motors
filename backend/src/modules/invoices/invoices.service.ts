import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SalesInvoice, InvoiceStatus } from './entities/sales-invoice.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { RecordWhtSettlementDto, UpdateWhtCertificateDto } from './dto/record-wht-settlement.dto';
import { LedgerService } from '../ledger/ledger.service';
import { LedgerTransactionType } from '../ledger/entities/customer-ledger-transaction.entity';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(SalesInvoice)
    private invoiceRepo: Repository<SalesInvoice>,
    @InjectRepository(Booking)
    private bookingRepo: Repository<Booking>,
    private dataSource: DataSource,
    private ledgerService: LedgerService,
  ) {}

  /**
   * Story IV2: VAT, WHT and Excise Tax rule evaluation and calculation engine.
   * - Evaluates applicable tax rules by vehicle type and customer tax standing
   * - Supports configurable calculation bases (VEHICLE_PRICE vs GROSS_INCL_EXCISE)
   * - Respects priority sequence: Priority 1 (Excise), Priority 2 (VAT), Priority 3 (WHT)
   * - Distinguishes taxes added to price from tax withheld at source
   * - Captures full auditable breakdown snapshot into taxDetails JSON
   */
  async evaluateTaxes(params: {
    subtotal: number;
    vehicleType?: string;
    isWhtCustomer?: boolean;
    vatRateOverride?: number;
    exciseRateOverride?: number;
    whtRateOverride?: number;
    isVatExempt?: boolean;
    isExciseExempt?: boolean;
    isWhtExempt?: boolean;
    calculationBase?: string;
    transactionDate?: string;
  }) {
    const txDate = params.transactionDate || new Date().toISOString().split('T')[0];
    const subtotal = Math.max(0, Number(params.subtotal) || 0);

    // 1. Fetch active tax rules from database applicable on transaction date
    let taxRules: any[] = [];
    try {
      taxRules = await this.dataSource.query(`
        SELECT 
          tax_config_id, tax_name, tax_rate_pct, tax_type, 
          applicable_customer_type, applicable_vehicle_type,
          calculation_base, priority, effective_from, effective_to
        FROM tax_configuration
        WHERE is_active = TRUE
          AND (effective_from IS NULL OR effective_from <= $1)
          AND (effective_to IS NULL OR effective_to >= $1)
        ORDER BY priority ASC, tax_rate_pct DESC
      `, [txDate]);
    } catch {
      taxRules = [];
    }

    const normVehicleType = (params.vehicleType || 'ALL').toUpperCase();

    // 2. Resolve Excise Tax (Priority 1)
    let exciseRate = 0;
    let exciseRuleName = 'No Excise Tax Applicable';
    let exciseRuleId: number | null = null;
    let isExciseApplicable = false;

    if (params.isExciseExempt) {
      exciseRate = 0;
      exciseRuleName = 'Excise Tax Exempted';
      isExciseApplicable = false;
    } else if (params.exciseRateOverride !== undefined && params.exciseRateOverride !== null) {
      exciseRate = Number(params.exciseRateOverride);
      exciseRuleName = `Excise Duty (Manual Override ${(exciseRate * 100).toFixed(1)}%)`;
      isExciseApplicable = exciseRate > 0;
    } else {
      const matchedExcise = taxRules.find(r => 
        r.tax_type === 'EXCISE' && 
        (r.applicable_vehicle_type === normVehicleType || (normVehicleType.includes(r.applicable_vehicle_type) && r.applicable_vehicle_type !== 'ALL'))
      ) || taxRules.find(r => r.tax_type === 'EXCISE' && r.applicable_vehicle_type === 'ALL');

      if (matchedExcise) {
        exciseRate = Number(matchedExcise.tax_rate_pct) / 100;
        exciseRuleName = matchedExcise.tax_name;
        exciseRuleId = matchedExcise.tax_config_id;
        isExciseApplicable = exciseRate > 0;
      } else if (normVehicleType.includes('MOTORCYCLE') || normVehicleType === 'MOTORCYCLE') {
        exciseRate = 0.10;
        exciseRuleName = 'Excise Tax Motorcycle (10%)';
        isExciseApplicable = true;
      } else if (normVehicleType.includes('THREE_WHEELER') || normVehicleType === 'THREE_WHEELER') {
        exciseRate = 0.05;
        exciseRuleName = 'Excise Tax Three-Wheeler (5%)';
        isExciseApplicable = true;
      }
    }

    const exciseTaxAmount = Math.round(subtotal * exciseRate * 100) / 100;

    // 3. Resolve VAT (Priority 2)
    let vatRate = 0.15; // Standard 15% Ethiopian VAT
    let vatRuleName = 'Standard VAT (15%)';
    let vatRuleId: number | null = null;
    let isVatApplicable = true;

    if (params.isVatExempt) {
      vatRate = 0;
      vatRuleName = 'VAT Exempted';
      isVatApplicable = false;
    } else if (params.vatRateOverride !== undefined && params.vatRateOverride !== null) {
      vatRate = Number(params.vatRateOverride);
      vatRuleName = `VAT (Manual Override ${(vatRate * 100).toFixed(1)}%)`;
      isVatApplicable = vatRate > 0;
    } else {
      const matchedVat = taxRules.find(r => r.tax_type === 'VAT');
      if (matchedVat) {
        vatRate = Number(matchedVat.tax_rate_pct) / 100;
        vatRuleName = matchedVat.tax_name;
        vatRuleId = matchedVat.tax_config_id;
        isVatApplicable = vatRate > 0;
      }
    }

    const calcBase = params.calculationBase || 'VEHICLE_PRICE';
    const vatTaxableBase = calcBase === 'GROSS_INCL_EXCISE' ? (subtotal + exciseTaxAmount) : subtotal;
    const vatAmount = Math.round(vatTaxableBase * vatRate * 100) / 100;

    // 4. Resolve Withholding Tax (WHT - Priority 3, Tax Withheld at Source)
    let whtRate = 0;
    let whtRuleName = 'No WHT Withheld';
    let whtRuleId: number | null = null;
    let whtApplicable = false;

    if (params.isWhtExempt) {
      whtRate = 0;
      whtRuleName = 'WHT Exempted';
      whtApplicable = false;
    } else if (params.whtRateOverride !== undefined && params.whtRateOverride !== null) {
      whtRate = Number(params.whtRateOverride);
      whtApplicable = whtRate > 0;
      whtRuleName = `Withholding Tax (${(whtRate * 100).toFixed(1)}%)`;
    } else if (params.isWhtCustomer) {
      whtRate = 0.02; // Standard 2% Commercial WHT
      whtApplicable = true;
      const matchedWht = taxRules.find(r => r.tax_type === 'WHT');
      if (matchedWht) {
        whtRate = Number(matchedWht.tax_rate_pct) / 100;
        whtRuleName = matchedWht.tax_name;
        whtRuleId = matchedWht.tax_config_id;
      } else {
        whtRuleName = 'Withholding Tax (2%)';
      }
    }

    const whtAmount = whtApplicable ? Math.round(subtotal * whtRate * 100) / 100 : 0;

    // 5. Calculate Totals (Story IV2: Gross Amount = Vehicle Subtotal + VAT + Excise; Net Payable = Gross - WHT)
    const totalTaxAmount = vatAmount + exciseTaxAmount;
    const grossTotal = subtotal + totalTaxAmount;
    const netPayable = Math.max(0, grossTotal - whtAmount);

    // 6. Detailed Auditable Breakdown Snapshot (Story IV2 Requirement 7)
    const taxDetails = {
      evaluatedAt: new Date().toISOString(),
      transactionDate: txDate,
      vehicleType: normVehicleType,
      calculationBase: calcBase,
      vehicleSubtotal: subtotal,
      appliedRules: [
        {
          priority: 1,
          taxType: 'EXCISE',
          ruleId: exciseRuleId,
          ruleName: exciseRuleName,
          ratePct: exciseRate * 100,
          taxableBase: subtotal,
          amount: exciseTaxAmount,
          effect: 'ADDED_TO_PRICE',
          isApplicable: isExciseApplicable,
          isExempt: !!params.isExciseExempt,
        },
        {
          priority: 2,
          taxType: 'VAT',
          ruleId: vatRuleId,
          ruleName: vatRuleName,
          ratePct: vatRate * 100,
          taxableBase: vatTaxableBase,
          amount: vatAmount,
          effect: 'ADDED_TO_PRICE',
          isApplicable: isVatApplicable,
          isExempt: !!params.isVatExempt,
        },
        {
          priority: 3,
          taxType: 'WHT',
          ruleId: whtRuleId,
          ruleName: whtRuleName,
          ratePct: whtRate * 100,
          taxableBase: subtotal,
          amount: whtAmount,
          effect: 'WITHHELD_FROM_PAYMENT',
          isApplicable: whtApplicable,
          isExempt: !!params.isWhtExempt,
        },
      ],
      totalAddedTax: totalTaxAmount,
      grossTotal,
      whtWithheld: whtAmount,
      netPayable,
      formula: 'Gross Total = Subtotal + VAT + Excise Tax; Net Payable = Gross Total - WHT',
    };

    return {
      subtotal,
      vatRate,
      vatAmount,
      exciseTaxRate: exciseRate,
      exciseTaxAmount,
      totalTaxAmount,
      grossTotal,
      whtApplicable,
      whtRate,
      whtAmount,
      netPayable,
      taxDetails,
    };
  }

  /**
   * Story IV3: Retrieve customer's available deposits and credits from booking & customer ledger
   */
  async getCustomerAvailableDeposits(customerId: string, bookingId?: string) {
    let bookingDeposits = 0;
    if (bookingId) {
      const bkg = await this.bookingRepo.findOne({ where: { bookingId: String(bookingId) } });
      if (bkg) {
        bookingDeposits = Number(bkg.totalAmountDeposited) || 0;
      }
    }

    let ledgerCredits = 0;
    try {
      const summaryRows = await this.dataSource.query(
        `SELECT unapplied_credit_balance, excess_payment_balance FROM customer_ledger_summary WHERE customer_id = $1`,
        [customerId]
      );
      if (summaryRows.length > 0) {
        ledgerCredits = Number(summaryRows[0].unapplied_credit_balance || 0) + Number(summaryRows[0].excess_payment_balance || 0);
      }
    } catch {
      ledgerCredits = 0;
    }

    const totalEligibleDeposits = bookingDeposits + ledgerCredits;
    return {
      customerId,
      bookingId,
      bookingDeposits,
      ledgerCredits,
      totalEligibleDeposits,
    };
  }

  async create(dto: CreateInvoiceDto, userId = 1): Promise<SalesInvoice> {
    const booking = await this.bookingRepo.findOne({
      where: { bookingId: String(dto.bookingId) },
      relations: ['customer', 'item'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking #${dto.bookingId} not found`);
    }

    const quantity = dto.quantity || Number(booking.quantity) || 1;
    let unitPrice = dto.unitPrice;
    if (unitPrice === undefined || unitPrice === null) {
      unitPrice = Number(booking.unitPrice) || (Number(booking.grossTotal) / quantity);
    }
    const subtotal = quantity * unitPrice;

    // Detect vehicle classification
    const itemName = (booking.item?.itemName || '').toUpperCase();
    const usageType = ((booking.item as any)?.usageType || '').toUpperCase();
    let vehicleType = 'ALL';
    if (itemName.includes('MOTORCYCLE') || usageType.includes('MOTORCYCLE')) {
      vehicleType = 'MOTORCYCLE';
    } else if (itemName.includes('THREE') || itemName.includes('TUK') || itemName.includes('BAJAJ') || usageType.includes('THREE_WHEELER')) {
      vehicleType = 'THREE_WHEELER';
    }

    // Customer WHT status
    const isWhtCustomer = Boolean((booking.customer as any)?.withholdingTaxFlag);

    // Evaluate taxes with full rule engine (Stories IV1 & IV2)
    const taxEval = await this.evaluateTaxes({
      subtotal,
      vehicleType,
      isWhtCustomer: dto.whtApplicable !== undefined ? dto.whtApplicable : isWhtCustomer,
      vatRateOverride: dto.vatRate ?? dto.taxRate,
      exciseRateOverride: dto.exciseRate,
      whtRateOverride: dto.whtRate,
      isVatExempt: dto.isVatExempt,
      isExciseExempt: dto.isExciseExempt,
      isWhtExempt: dto.isWhtExempt,
      calculationBase: dto.calculationBase,
    });

    // Resolve vehicle unit if not provided
    let vehicleUnitId = dto.vehicleUnitId ? String(dto.vehicleUnitId) : null;
    if (!vehicleUnitId) {
      const allotmentRow = await this.dataSource.query(`
        SELECT al.vehicle_unit_id
        FROM allotment_line al
        JOIN allotment a ON a.allotment_id = al.allotment_id
        WHERE a.booking_id = $1 AND a.status = 'APPROVED' AND al.is_active = TRUE
        LIMIT 1
      `, [booking.bookingId]);

      if (allotmentRow.length > 0) {
        vehicleUnitId = String(allotmentRow[0].vehicle_unit_id);
      }
    }

    // Deposits and settlement (Stories IV3, IV4, IV5, IV6)
    const totalDeposited = Number(booking.totalAmountDeposited) || 0;
    let depositsApplied = 0;
    let excessPaymentFlag = false;

    if (dto.applyDeposits !== false) {
      depositsApplied = Math.min(totalDeposited, taxEval.netPayable);
      excessPaymentFlag = totalDeposited > taxEval.netPayable;
    }

    const outstandingBalance = Math.max(0, taxEval.netPayable - depositsApplied);
    const whtStatus = taxEval.whtApplicable ? 'PENDING_CERTIFICATE' : 'NONE';

    // Insert invoice with all IV1 & IV2 & IV14 columns
    const insertResult = await this.dataSource.query(`
      INSERT INTO sales_invoice (
        booking_id, customer_id, item_id, vehicle_unit_id,
        quantity, unit_price, vat_amount, excise_tax_rate, excise_tax_amount,
        total_tax_amount, gross_total, net_payable, deposits_applied,
        outstanding_balance, excess_payment_flag, status, created_by,
        wht_applicable, wht_rate, wht_amount, wht_status,
        tax_details, tax_override_reason, tax_override_by
      )
      VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, 'PENDING_APPROVAL', $16,
        $17, $18, $19, $20,
        $21, $22, $23
      )
      RETURNING invoice_id
    `, [
      booking.bookingId,
      booking.customerId,
      booking.itemId,
      vehicleUnitId,
      quantity,
      unitPrice,
      taxEval.vatAmount,
      taxEval.exciseTaxRate,
      taxEval.exciseTaxAmount,
      taxEval.totalTaxAmount,
      taxEval.grossTotal,
      taxEval.netPayable,
      depositsApplied,
      outstandingBalance,
      excessPaymentFlag,
      userId,
      taxEval.whtApplicable,
      taxEval.whtRate,
      taxEval.whtAmount,
      whtStatus,
      JSON.stringify(taxEval.taxDetails),
      dto.taxOverrideReason || null,
      (dto.taxOverrideReason || dto.vatRate !== undefined || dto.exciseRate !== undefined || dto.isVatExempt || dto.isExciseExempt) ? userId : null,
    ]);

    const invoiceId = insertResult[0].invoice_id;

    // Story IV10: Route to generic Approval Workflow engine
    try {
      await this.dataSource.query(`
        SELECT fn_submit_for_approval('SALES_INVOICE', 'SALES_INVOICE', $1, $2)
      `, [invoiceId, userId]);
    } catch (err) {
      console.warn('⚠️ Approval submission note:', (err as any)?.message || err);
    }

    return this.findOne(String(invoiceId));
  }

  async findAll(filters?: { status?: InvoiceStatus; customerId?: string }): Promise<SalesInvoice[]> {
    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.booking', 'bkg')
      .leftJoinAndSelect('inv.customer', 'cust')
      .leftJoinAndSelect('inv.item', 'item')
      .leftJoinAndSelect('inv.vehicleUnit', 'vu')
      .leftJoinAndSelect('inv.creator', 'creator')
      .orderBy('inv.createdAt', 'DESC');

    if (filters?.status) {
      qb.andWhere('inv.status = :status', { status: filters.status });
    }
    if (filters?.customerId) {
      qb.andWhere('inv.customerId = :cid', { cid: filters.customerId });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<SalesInvoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { invoiceId: id },
      relations: ['booking', 'customer', 'item', 'vehicleUnit', 'creator'],
    });

    if (!invoice) {
      throw new NotFoundException(`Sales invoice #${id} not found`);
    }

    return invoice;
  }

  async approve(id: string, userId = 1, comments = 'Sales invoice approved and finalized'): Promise<SalesInvoice> {
    const invoice = await this.findOne(id);
    if (invoice.status === InvoiceStatus.APPROVED) {
      return invoice;
    }

    // Story IV9: Transition vehicle unit to SOLD via Inventory fn_transition_vehicle_status
    if (invoice.vehicleUnitId) {
      try {
        await this.dataSource.query(`
          SELECT fn_transition_vehicle_status($1, 'SOLD', $2, 'SALES_INVOICE', $3)
        `, [invoice.vehicleUnitId, userId, `Invoice ${invoice.invoiceNumber}`]);
      } catch (err) {
        console.warn('⚠️ Vehicle SOLD transition note:', (err as any)?.message || err);
      }
    }

    // Story IV8: Settle booking
    try {
      await this.dataSource.query(`
        UPDATE booking SET booking_status = 'SETTLED', updated_at = NOW() WHERE booking_id = $1
      `, [invoice.bookingId]);
    } catch (err) {
      console.warn('⚠️ Booking SETTLED update note:', (err as any)?.message || err);
    }

    // Story IV7: Post idempotent INVOICE_CHARGE to Customer Ledger
    const existingCharge = await this.dataSource.query(`
      SELECT transaction_id FROM customer_ledger_transaction 
      WHERE related_sales_invoice_id = $1 AND transaction_type = 'INVOICE_CHARGE' 
      LIMIT 1
    `, [id]);

    if (existingCharge.length === 0) {
      try {
        await this.ledgerService.postTransaction({
          customerId: String(invoice.customerId),
          transactionType: LedgerTransactionType.INVOICE_CHARGE,
          referenceNumber: invoice.invoiceNumber,
          description: `Sales Invoice Settlement: ${invoice.invoiceNumber} (Gross ETB ${Number(invoice.grossTotal).toLocaleString()}, VAT: ETB ${Number(invoice.vatAmount).toLocaleString()}, Excise: ETB ${Number(invoice.exciseTaxAmount || 0).toLocaleString()})`,
          debitAmount: Number(invoice.grossTotal),
          creditAmount: 0,
          relatedSalesInvoiceId: String(invoice.invoiceId),
          relatedBookingId: String(invoice.bookingId),
          processedBy: userId,
          summaryDelta: {
            outstandingBalance: Number(invoice.grossTotal),
          },
        });

        // If deposits were applied, post PAYMENT_ALLOCATION
        if (Number(invoice.depositsApplied) > 0) {
          await this.ledgerService.postTransaction({
            customerId: String(invoice.customerId),
            transactionType: LedgerTransactionType.PAYMENT_ALLOCATION,
            referenceNumber: `ALLOC-${invoice.invoiceNumber}`,
            description: `Deposit allocation against Invoice ${invoice.invoiceNumber}`,
            debitAmount: 0,
            creditAmount: Number(invoice.depositsApplied),
            relatedSalesInvoiceId: String(invoice.invoiceId),
            relatedBookingId: String(invoice.bookingId),
            processedBy: userId,
            summaryDelta: {
              outstandingBalance: -Number(invoice.depositsApplied),
            },
          });
        }
      } catch (err) {
        console.warn('⚠️ Ledger INVOICE_CHARGE note:', (err as any)?.message || err);
      }
    }

    // Story IV10: Update approval engine decision if pending request exists
    const pendingRequest = await this.dataSource.query(`
      SELECT approval_request_id
      FROM approval_request
      WHERE entity_type = 'SALES_INVOICE' AND entity_id = $1 AND status = 'PENDING'
      LIMIT 1
    `, [id]);

    if (pendingRequest.length > 0) {
      const requestId = pendingRequest[0].approval_request_id;
      await this.dataSource.query(`
        SELECT fn_record_approval_decision($1, $2, $3, $4)
      `, [requestId, 'APPROVED', userId, comments]);
    }

    // Mark invoice status as APPROVED
    await this.dataSource.query(`
      UPDATE sales_invoice SET status = 'APPROVED' WHERE invoice_id = $1
    `, [id]);

    return this.findOne(id);
  }

  async reject(id: string, userId = 1, comments = 'Sales invoice rejected'): Promise<SalesInvoice> {
    const invoice = await this.findOne(id);

    const pendingRequest = await this.dataSource.query(`
      SELECT approval_request_id
      FROM approval_request
      WHERE entity_type = 'SALES_INVOICE' AND entity_id = $1 AND status = 'PENDING'
      LIMIT 1
    `, [id]);

    if (pendingRequest.length > 0) {
      const requestId = pendingRequest[0].approval_request_id;
      await this.dataSource.query(`
        SELECT fn_record_approval_decision($1, $2, $3, $4)
      `, [requestId, 'REJECTED', userId, comments]);
    } else {
      await this.dataSource.query(`
        UPDATE sales_invoice SET status = 'REJECTED' WHERE invoice_id = $1
      `, [id]);
    }

    return this.findOne(id);
  }

  /**
   * Story IV14: Tax withheld by the customer, recorded as a non-cash settlement.
   * - Offsets invoice balance
   * - Records separate WHT_SETTLEMENT credit in customer ledger carrying certificate number
   * - Non-refundable (decreases outstanding debt without adding to cash refundable balance)
   */
  async recordWhtSettlement(id: string, dto: RecordWhtSettlementDto, userId = 1): Promise<SalesInvoice> {
    const invoice = await this.findOne(id);
    const amount = Number(dto.whtAmount);
    if (!amount || amount <= 0) {
      throw new BadRequestException('Withholding tax amount must be greater than zero');
    }

    const certNo = dto.certificateNumber?.trim() || `WHT-CERT-${invoice.invoiceNumber}`;
    const certDate = dto.certificateDate || new Date().toISOString().split('T')[0];
    const notes = dto.notes || `Tax withheld at source, certificate ${certNo}`;

    // 1. Post to Customer Ledger as atomic non-cash WHT_SETTLEMENT credit (Story IV14)
    // Non-refundable: decreases outstanding balance only, does NOT touch refundableBalance or totalDeposits
    await this.ledgerService.postTransaction({
      customerId: String(invoice.customerId),
      transactionType: LedgerTransactionType.WHT_SETTLEMENT,
      referenceNumber: certNo,
      description: notes,
      creditAmount: amount,
      debitAmount: 0,
      relatedSalesInvoiceId: String(invoice.invoiceId),
      relatedBookingId: String(invoice.bookingId),
      processedBy: userId,
      summaryDelta: {
        outstandingBalance: -amount,
      },
    });

    // 2. Update sales_invoice record:
    // Update deposits_applied (which in postgres satisfies outstanding_balance = quantity*unit_price+vat - deposits_applied = 0)
    await this.dataSource.query(`
      UPDATE sales_invoice
      SET deposits_applied = deposits_applied + $1,
          wht_applicable = TRUE,
          wht_amount = COALESCE(wht_amount, 0) + $1,
          wht_certificate_number = $2,
          wht_certificate_date = $3,
          wht_status = 'CERTIFICATE_RECEIVED',
          wht_settled_at = NOW()
      WHERE invoice_id = $4
    `, [amount, certNo, certDate, id]);

    return this.findOne(id);
  }

  /**
   * Story IV14: Finance tracks certificates.
   * Returns list of withheld amounts, certificate numbers, and status.
   */
  async getWhtCertificates(): Promise<any[]> {
    const rows = await this.dataSource.query(`
      SELECT 
        inv.invoice_id AS "invoiceId",
        inv.invoice_number AS "invoiceNumber",
        inv.created_at AS "createdAt",
        inv.gross_total AS "grossTotal",
        inv.deposits_applied AS "depositsApplied",
        inv.outstanding_balance AS "outstandingBalance",
        inv.status AS "status",
        inv.wht_applicable AS "whtApplicable",
        inv.wht_amount AS "whtAmount",
        inv.wht_certificate_number AS "whtCertificateNumber",
        inv.wht_certificate_date AS "whtCertificateDate",
        inv.wht_status AS "whtStatus",
        inv.wht_settled_at AS "whtSettledAt",
        c.customer_id AS "customerId",
        c.full_name AS "customerName",
        c.tin_number AS "tinNumber",
        c.mobile_number AS "mobileNumber",
        b.booking_number AS "bookingNumber"
      FROM sales_invoice inv
      JOIN customer c ON c.customer_id = inv.customer_id
      LEFT JOIN booking b ON b.booking_id = inv.booking_id
      WHERE inv.wht_applicable = TRUE OR (inv.wht_amount IS NOT NULL AND inv.wht_amount > 0) OR c.withholding_tax_flag = TRUE
      ORDER BY inv.created_at DESC
    `);
    return rows;
  }

  async updateWhtCertificate(id: string, dto: UpdateWhtCertificateDto): Promise<SalesInvoice> {
    const invoice = await this.findOne(id);
    const updates: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (dto.certificateNumber !== undefined) {
      updates.push(`wht_certificate_number = $${pIdx++}`);
      params.push(dto.certificateNumber);
    }
    if (dto.certificateDate !== undefined) {
      updates.push(`wht_certificate_date = $${pIdx++}`);
      params.push(dto.certificateDate);
    }
    if (dto.status !== undefined) {
      updates.push(`wht_status = $${pIdx++}`);
      params.push(dto.status);
    }

    if (updates.length > 0) {
      params.push(id);
      await this.dataSource.query(`
        UPDATE sales_invoice
        SET ${updates.join(', ')}
        WHERE invoice_id = $${pIdx}
      `, params);
    }

    return this.findOne(id);
  }
}
