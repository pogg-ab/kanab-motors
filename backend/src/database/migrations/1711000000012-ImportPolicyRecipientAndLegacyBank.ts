import { MigrationInterface, QueryRunner } from 'typeorm';

export class ImportPolicyRecipientAndLegacyBank1711000000012 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`UPDATE purchase_order SET lead_time_trigger='ISSUANCE_AND_ADVANCE' WHERE lead_time_trigger='PO issuance and confirmed advance payment';
      UPDATE po_payment_schedule s SET po_amount_base=t.total,payment_percentage=round(100*s.amount_due/t.total,2) FROM (SELECT po_id,sum(line_total) total FROM purchase_order_line GROUP BY po_id) t WHERE s.po_id=t.po_id AND s.payment_percentage IS NULL AND t.total>0;
      UPDATE import_process_policy SET settings=jsonb_set(settings,'{recipients,lcShipment}','"PROCUREMENT"')
      WHERE settings#>>'{recipients,lcShipment}'='LOGISTICS_OFFICER'
      AND NOT EXISTS(SELECT 1 FROM role WHERE role_name='LOGISTICS_OFFICER');
      UPDATE purchase_order po SET bank_snapshot=jsonb_build_object('bankAccountId',b.bank_account_id,'accountName',b.account_name,'bankName',b.bank_name,'accountNumber',b.account_number,'bankBranch',b.bank_branch,'ifscCode',b.ifsc_code,'swiftCode',b.swift_code,'currency',b.currency)
      FROM company_bank_account b WHERE po.bank_account_id=b.bank_account_id AND po.bank_snapshot IS NULL AND po.status IN ('CONFIRMED','PARTIALLY_RECEIVED','RECEIVED');`);
  }
  async down() { /* Retain historical snapshots and corrected recipient configuration. */ }
}
