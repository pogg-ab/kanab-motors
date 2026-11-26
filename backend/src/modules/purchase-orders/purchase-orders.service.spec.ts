import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrder, POStatus } from './entities/purchase-order.entity';
import { PurchaseOrderLine } from './entities/purchase-order-line.entity';
import { CompanyProfile } from './entities/company-profile.entity';
import { CompanyBankAccount } from './entities/company-bank-account.entity';
import { ImportComplianceRecord } from './entities/import-compliance-record.entity';
import { PoPaymentSchedule } from './entities/po-payment-schedule.entity';
import { PoPaymentTransaction } from './entities/po-payment-transaction.entity';
import { PoLetterOfCredit } from './entities/po-letter-of-credit.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { ProductItem } from '../products/entities/product-item.entity';
import { ExchangeRateDefault } from '../shipments/entities/exchange-rate-default.entity';
import { AuditService } from '../audit/audit.service';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('PurchaseOrdersService (KMSICAMS-12 Phases 2, 3, 4)', () => {
  let service: PurchaseOrdersService;
  let poRepo: any;
  let poLineRepo: any;
  let companyProfileRepo: any;
  let bankAccountRepo: any;
  let complianceRepo: any;
  let paymentScheduleRepo: any;
  let paymentTxnRepo: any;
  let lcRepo: any;
  let supplierRepo: any;
  let productRepo: any;
  let exchangeRateRepo: any;
  let auditService: any;
  let dataSource: any;

  describe('permit progress editing', () => {
    it('updates references and dates with an atomic authenticated audit', async () => {
      dataSource.manager.findOne.mockResolvedValue({complianceRecordId:'7',status:'SUBMITTED',applicationReference:'OLD',applicationDate:'2026-01-01'});
      const result = await service.updateComplianceRecord('7',{applicationReference:'NEW',submissionDate:'2026-01-03'},42);
      expect(result.applicationReference).toBe('NEW');
      expect(dataSource.manager.findOne).toHaveBeenCalledWith(ImportComplianceRecord,expect.objectContaining({lock:{mode:'pessimistic_write'}}));
      expect(dataSource.manager.query).toHaveBeenCalledWith(expect.stringContaining('audit_log'),['7',42,expect.stringContaining('OLD'),expect.stringContaining('NEW')]);
    });
    it('protects finalized permits from edits', async () => {
      dataSource.manager.findOne.mockResolvedValue({complianceRecordId:'7',status:'APPROVED'});
      await expect(service.updateComplianceRecord('7',{documentReference:'changed'},42)).rejects.toThrow('renew finalized permits');
      expect(dataSource.manager.save).not.toHaveBeenCalled();
    });
    it('rejects invalid date ordering against saved dates', async () => {
      dataSource.manager.findOne.mockResolvedValue({complianceRecordId:'7',status:'APPLIED',issueDate:'2026-01-10'});
      await expect(service.updateComplianceRecord('7',{expiryDate:'2026-01-01'},42)).rejects.toThrow('Expiry precedes');
      expect(dataSource.manager.save).not.toHaveBeenCalled();
    });
  });

  beforeEach(async () => {
    poRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn().mockResolvedValue({poId:'1',status:'CONFIRMED',currency:'USD',lines:[]}),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    poLineRepo = {
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    companyProfileRepo = {
      findOne: jest.fn().mockResolvedValue({
        companyName: 'KANAB Motors PLC',
        iecNo: 'ETH-IEC-994821',
        adCode: 'AD-CBE-0019284',
      }),
    };

    bankAccountRepo = {
      find: jest.fn().mockResolvedValue([{ bankAccountId: 1, bankName: 'CBE', accountNumber: '1000' }]),
      findOne: jest.fn().mockResolvedValue({ bankAccountId: 1, bankName: 'CBE', accountNumber: '1000' }),
    };

    complianceRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((data) => ({ ...data, complianceRecordId: '1' })),
      save: jest.fn((data) => Promise.resolve(data)),
      findOne: jest.fn(),
    };

    paymentScheduleRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((data) => ({ ...data, paymentScheduleId: '1' })),
      save: jest.fn((data) => Promise.resolve(data)),
      findOne: jest.fn(),
    };

    paymentTxnRepo = {
      create: jest.fn((data) => ({ ...data, paymentTransactionId: '1' })),
      save: jest.fn((data) => Promise.resolve(data)),
    };

    lcRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((data) => ({ ...data, lcId: '1' })),
      save: jest.fn((data) => Promise.resolve(data)),
    };

    supplierRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    productRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    exchangeRateRepo = {
      findOne: jest.fn().mockResolvedValue({ currency: 'USD', rateToEtb: 120 }),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const manager:any = {
      findOne: jest.fn((entity,options)=> entity===PurchaseOrder?poRepo.findOne(options):entity===PoPaymentSchedule?paymentScheduleRepo.findOne(options):entity===PoPaymentTransaction?paymentTxnRepo.findOne(options):undefined),
      find: jest.fn(async (entity,options)=>entity===PurchaseOrderLine?poLineRepo.find(options):entity===PoPaymentSchedule?paymentScheduleRepo.find(options):entity===PoPaymentTransaction?(await paymentScheduleRepo.findOne({}))?.transactions||[]:[]),
      create: jest.fn((entity,data)=>({...data})),
      save: jest.fn(async (entity,data)=>data),
      update: jest.fn(),
      query: jest.fn().mockResolvedValue([]),
    };
    dataSource = {
      manager,
      query: jest.fn().mockResolvedValue([]),
      transaction: jest.fn(async cb=>cb(manager)),
      createQueryRunner: jest.fn().mockReturnValue({
        connect: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
        manager: {
          create: jest.fn((entity, data) => ({ ...data, poId: '1' })),
          save: jest.fn((entity, data) => Promise.resolve(data || entity)),
          delete: jest.fn().mockResolvedValue(undefined),
          query: jest.fn().mockResolvedValue([{ value: 1 }]),
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        { provide: getRepositoryToken(PurchaseOrder), useValue: poRepo },
        { provide: getRepositoryToken(PurchaseOrderLine), useValue: poLineRepo },
        { provide: getRepositoryToken(CompanyProfile), useValue: companyProfileRepo },
        { provide: getRepositoryToken(CompanyBankAccount), useValue: bankAccountRepo },
        { provide: getRepositoryToken(ImportComplianceRecord), useValue: complianceRepo },
        { provide: getRepositoryToken(PoPaymentSchedule), useValue: paymentScheduleRepo },
        { provide: getRepositoryToken(PoPaymentTransaction), useValue: paymentTxnRepo },
        { provide: getRepositoryToken(PoLetterOfCredit), useValue: lcRepo },
        { provide: getRepositoryToken(Supplier), useValue: supplierRepo },
        { provide: getRepositoryToken(ProductItem), useValue: productRepo },
        { provide: getRepositoryToken(ExchangeRateDefault), useValue: exchangeRateRepo },
        { provide: AuditService, useValue: auditService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<PurchaseOrdersService>(PurchaseOrdersService);
  });

  describe('Commercial & Compliance Validation Gate (Story IMP-11, IMP-15)', () => {
    it('should PASS validation when mandatory commercial terms and compliant records are present', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        poId: '1',
        incoterms: 'FOB',
        modeOfShipment:'SEA',destinationCountry:'Ethiopia',paymentTerms:'CAD',paymentMethod:'CASH_AGAINST_DOCUMENTS',
        portOfLoading: 'Nhava Sheva',
        portOfDischarge: 'Djibouti',
        bankAccountId: 1,
      } as any);

      complianceRepo.find.mockResolvedValue([
        { complianceRecordId: '1', requirementType: 'IMPORT_PERMIT', status: 'APPROVED' },
      ]);

      const result = await service.validateCommercialReadiness('1');
      expect(result.isReady).toBe(true);
    });

    it('should REJECT validation if mandatory terms like incoterms or ports are missing', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        poId: '1',
        incoterms: '',
        portOfLoading: '',
        portOfDischarge: 'Djibouti',
        bankAccountId: 1,
      } as any);

      await expect(service.validateCommercialReadiness('1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('Payment Schedule & Transaction Recording (Story IMP-16, IMP-18)', () => {
    it('should initiate payment without changing confirmed balance before finance approval', async () => {
      const mockSchedule = {
        paymentScheduleId: '1',
        amountDue: 30000,
        currency: 'USD',
        status: 'PLANNED',
        transactions: [],
      };
      paymentScheduleRepo.findOne.mockResolvedValue(mockSchedule);

      const txn = await service.recordPaymentTransaction({
        paymentScheduleId: '1',
        bankName: 'Test bank',
        paymentReference: 'SWIFT-FT-99281',
        amountPaid: 30000,
        currency: 'USD',
      });

      expect(txn).toBeDefined();
      expect(txn.status).toBe('INITIATED');
      expect(mockSchedule.status).toBe('PLANNED');
    });

    it('should REJECT payment transaction if amount exceeds milestone balance over allowable buffer', async () => {
      const mockSchedule = {
        paymentScheduleId: '1',
        amountDue: 10000,
        currency: 'USD',
        status: 'PLANNED',
        transactions: [],
      };
      paymentScheduleRepo.findOne.mockResolvedValue(mockSchedule);

      await expect(
        service.recordPaymentTransaction({
          paymentScheduleId: '1',
          bankName: 'Test bank',
        paymentReference: 'SWIFT-FT-EXCESS',
          amountPaid: 15000, // Exceeds by 50%
          currency: 'USD',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should strictly REJECT overpayment exceeding remaining milestone balance (IMP-18)', async () => {
      const mockSchedule = {
        paymentScheduleId: '1',
        amountDue: 10000,
        currency: 'USD',
        status: 'PARTIALLY_PAID',
        transactions: [{ amountPaid: 9000, status: 'CONFIRMED' }],
      };
      paymentScheduleRepo.findOne.mockResolvedValue(mockSchedule);

      await expect(
        service.recordPaymentTransaction({
          paymentScheduleId: '1',
          bankName: 'Test bank',
        paymentReference: 'SWIFT-FT-OVERPAY',
          amountPaid: 1050, // Remaining is 1000, 1050 would be allowed by old 5% buffer but must fail now
          currency: 'USD',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should calculate milestone amountDue from percentage and validate 100% total limit (IMP-16, IMP-17)', async () => {
      poRepo.findOne.mockResolvedValue({poId:'1',status:'DRAFT',currency:'USD'});
      poLineRepo.find.mockResolvedValue([{quantityOrdered:10,unitPrice:5000}]);

      paymentScheduleRepo.find.mockResolvedValue([
        { paymentScheduleId: '1', paymentPercentage: 50 },
      ]);

      // Adding 40% should succeed (total 90%)
      const schedule = await service.createPaymentSchedule({
        poId: '1',
        milestoneName: 'Second Milestone',
        dueDate:'2026-12-01',
        paymentPercentage: 40,
      });
      expect(schedule).toBeDefined();

      // Adding 60% should fail (50 + 60 = 110% > 100%)
      await expect(
        service.createPaymentSchedule({
          poId: '1',
          milestoneName: 'Excess Milestone',
          dueDate:'2026-12-01',
          paymentPercentage: 60,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not recalculate delivery for an unconfirmed payment (POX-08)', async () => {
      const mockPo = {
        poId: '1',
        deliveryLeadTimeDays: 30,
        expectedDeliveryDate: '2026-11-01',
      };
      const mockSchedule = {
        paymentScheduleId: '1',
        milestoneName: '30% Mandatory Advance Payment',
        amountDue: 30000,
        currency: 'USD',
        status: 'PLANNED',
        transactions: [],
        purchaseOrder: mockPo,
      };
      paymentScheduleRepo.findOne.mockResolvedValue(mockSchedule);
      poRepo.save.mockImplementation((p: any) => Promise.resolve(p));

      await service.recordPaymentTransaction({
        paymentScheduleId: '1',
        bankName: 'Test bank',
        paymentReference: 'ADV-TXN-01',
        amountPaid: 30000,
        paymentDate: '2026-11-17',
        currency: 'USD',
      });

      expect(poRepo.save).not.toHaveBeenCalled();
      expect(mockPo.expectedDeliveryDate).toBe('2026-11-01');
    });
  });

  describe('Letter of Credit (Story IMP-20)', () => {
    it('should prevent duplicate Letter of Credit reference numbers', async () => {
      lcRepo.findOne.mockResolvedValue({ lcId: '5', lcNumber: 'LC-2024-CBE-001' });

      await expect(
        service.createLetterOfCredit({
          poId: '1',
          lcNumber: 'LC-2024-CBE-001',
          issuingBank: 'Commercial Bank of Ethiopia',
          amount: 50000,
          currency: 'USD',
          issueDate: '2024-03-01',
          expiryDate: '2024-09-01',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject L/C expiry date earlier than issue date', async () => {
      lcRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createLetterOfCredit({
          poId: '1',
          lcNumber: 'LC-2026-BAD-DATE-1',
          issuingBank: 'Commercial Bank of Ethiopia',
          amount: 28000,
          currency: 'USD',
          issueDate: '2026-11-20',
          expiryDate: '2026-11-18',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject L/C latest shipment date later than expiry date', async () => {
      lcRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createLetterOfCredit({
          poId: '1',
          lcNumber: 'LC-2026-BAD-DATE-2',
          issuingBank: 'Commercial Bank of Ethiopia',
          amount: 28000,
          currency: 'USD',
          issueDate: '2026-11-11',
          expiryDate: '2026-11-18',
          latestShipmentDate: '2026-11-20',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject ISSUED Letter of Credit if latest shipment date is missing (IMP-20)', async () => {
      lcRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createLetterOfCredit({
          poId: '1',
          lcNumber: 'LC-2026-NO-SHIPMENT-DATE',
          issuingBank: 'Commercial Bank of Ethiopia',
          amount: 28000,
          currency: 'USD',
          issueDate: '2026-11-11',
          expiryDate: '2026-11-18',
          status: 'ISSUED',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Importer Bank Account Default Selection', () => {
    it('should fetch only active bank accounts ordered with default account first', async () => {
      await service.getBankAccounts();
      expect(bankAccountRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { isDefault: 'DESC', bankAccountId: 'ASC' },
      });
    });
  });
  describe('Part 1 regression controls',()=>{
    it.each([100.01, 0.05])('reconciles PO edits to %s without changing cancelled milestones or payment history', async (total) => {
      const po:any = {poId:'1', status:POStatus.DRAFT, currency:'USD', updatedAt:new Date(), lines:[{quantityOrdered:1,unitPrice:100,currency:'USD'}]};
      jest.spyOn(service,'findOne').mockResolvedValue(po);
      jest.spyOn(service as any,'lineDefaults').mockResolvedValue(new Map());
      const history = [{status:'REVERSED',amountPaid:10}];
      const schedules:any[] = [33.33,33.33,33.34].map((paymentPercentage,i)=>({paymentScheduleId:String(i),paymentPercentage,amountDue:paymentPercentage,status:'PLANNED',transactions:i===0?history:[]}));
      const cancelled = {paymentScheduleId:'9',paymentPercentage:100,amountDue:999,status:'CANCELLED',transactions:[]};
      const runner = dataSource.createQueryRunner();
      Object.assign(runner.manager,{findOne:jest.fn().mockResolvedValue(po),count:jest.fn().mockResolvedValue(0),find:jest.fn().mockResolvedValue([...schedules,cancelled])});
      await service.update('1',{lines:[{itemId:'1',quantityOrdered:1,unitPrice:total}]} as any);
      expect(schedules.reduce((sum,s)=>sum+Math.round(s.amountDue*100),0)).toBe(Math.round(total*100));
      expect(cancelled.amountDue).toBe(999);
      expect(history).toEqual([{status:'REVERSED',amountPaid:10}]);
      expect(runner.commitTransaction).toHaveBeenCalled();
    });
    it('blocks PO amount changes while payments are initiated or confirmed', async () => {
      const po:any={poId:'1',status:POStatus.DRAFT,currency:'USD',updatedAt:new Date(),lines:[{quantityOrdered:1,unitPrice:100,currency:'USD'}]};
      jest.spyOn(service,'findOne').mockResolvedValue(po);
      const runner=dataSource.createQueryRunner();
      Object.assign(runner.manager,{findOne:jest.fn().mockResolvedValue(po),count:jest.fn().mockResolvedValue(1)});
      await expect(service.update('1',{lines:[{itemId:'1',quantityOrdered:1,unitPrice:100.01}]} as any)).rejects.toThrow('Reverse/adjust');
      expect(runner.rollbackTransaction).toHaveBeenCalled();
      expect(runner.manager.save).not.toHaveBeenCalled();
    });
    it('rejects an independent amount or calculation base that disagrees with the percentage',()=>{
      const po:any={currency:'USD',lines:[{quantityOrdered:10,unitPrice:100}],paymentMethod:'TELEGRAPHIC_TRANSFER'};
      expect(()=>(service as any).scheduleValues({milestoneName:'Advance',paymentPercentage:30,amountDue:200,dueDate:'2027-01-01'},po)).toThrow('Amount must equal');
      expect(()=>(service as any).scheduleValues({milestoneName:'Advance',paymentPercentage:30,poAmountBase:2000,dueDate:'2027-01-01'},po)).toThrow('Calculation base');
      expect(()=>(service as any).scheduleValues({milestoneName:'Advance',paymentPercentage:30},po)).toThrow('due date');
    });
    it('requires a complete schedule and keeps penny rounding reconciled',async()=>{
      poRepo.findOne.mockResolvedValue({poId:'1',status:'DRAFT',currency:'USD'});
      poLineRepo.find.mockResolvedValue([{quantityOrdered:1,unitPrice:0.05}]);
      dataSource.manager.delete=jest.fn();
      const milestones=[33.33,33.33,33.34].map((paymentPercentage,i)=>({milestoneName:`M${i}`,paymentPercentage,dueDate:'2027-01-01'}));
      const result=await service.replacePaymentSchedules('1',milestones,1);
      expect(result.reduce((sum,s)=>sum+Number(s.amountDue),0)).toBeCloseTo(0.05,2);
      await expect(service.replacePaymentSchedules('1',milestones.slice(0,2),1)).rejects.toThrow('100%');
    });
    it('rejects L/C issuance through a status change without shipment date',async()=>{
      lcRepo.findOne.mockResolvedValue({lcId:'1',status:'DRAFT',issueDate:'2026-01-01',expiryDate:'2027-01-01'});
      await expect(service.updateLetterOfCreditStatus('1','ISSUED','Approval',1)).rejects.toThrow('independent');
    });
    it('keeps issued document output independent from later master data changes',async()=>{
      const document={grandTotal:1000,bankDetails:{bankName:'Original bank'},standardRemarks:['Approved terms']};
      jest.spyOn(service,'findOne').mockResolvedValue({issuedDocument:document} as any);
      expect(await service.getPOPrintData('1')).toEqual(document);
      expect(companyProfileRepo.findOne).not.toHaveBeenCalled();
      expect(bankAccountRepo.findOne).not.toHaveBeenCalled();
    });
    it('reports each currency separately and excludes cancelled obligations',async()=>{
      paymentScheduleRepo.find.mockResolvedValue([
        {amountDue:100,currency:'USD',status:'PARTIALLY_PAID',paymentPercentage:100,dueDate:'2000-01-01',transactions:[{status:'CONFIRMED',amountPaid:40},{status:'INITIATED',amountPaid:20}],purchaseOrder:{status:'CONFIRMED'}},
        {amountDue:200,currency:'EUR',status:'PLANNED',transactions:[],purchaseOrder:{status:'CONFIRMED'}},
        {amountDue:900,currency:'USD',status:'CANCELLED',transactions:[]},
      ]);
      const report=await service.getFinancialObligationsSummary();
      expect(report.totalCommitted).toBeNull();
      expect(report.byCurrency.USD).toEqual({totalCommitted:100,totalPaid:40,outstandingBalance:60,overdueAmount:60});
      expect(report.byCurrency.EUR.outstandingBalance).toBe(200);
      expect(report.allMilestones).toHaveLength(2);
    });
    it.each(['LETTER_OF_CREDIT','CASH_AGAINST_DOCUMENTS'])('enforces method-specific evidence for %s confirmation',async(paymentMethod)=>{
      const po:any={poId:'1',status:'CONFIRMED'};
      const txn:any={paymentTransactionId:'2',paymentScheduleId:'1',status:'INITIATED',amountPaid:100,currency:'USD'};
      const schedule:any={paymentScheduleId:'1',poId:'1',currency:'USD',amountDue:100,status:'PLANNED',paymentMethod};
      dataSource.manager.findOne.mockImplementation(async(entity)=>entity===PurchaseOrder?po:entity===PoPaymentSchedule?schedule:txn);
      dataSource.manager.find.mockResolvedValue([]);
      await expect(service.decidePayment('2','CONFIRMED','Bank verified',1)).rejects.toThrow(paymentMethod==='LETTER_OF_CREDIT'?'valid issued':'supporting banking documents');
      expect(txn.status).toBe('INITIATED');
    });
    it('only completes advance delivery after confirmed payments and clears it on reversal',async()=>{
      const po:any={poId:'1',status:'CONFIRMED',issuedDate:'2026-11-20',deliveryLeadTimeDays:5,leadTimeDayType:'CALENDAR',leadTimeTrigger:'ISSUANCE_AND_ADVANCE'};
      const txn:any={paymentTransactionId:'2',paymentScheduleId:'1',status:'INITIATED',amountPaid:100,paymentDate:'2026-11-21',currency:'USD'};
      const first:any={paymentTransactionId:'1',paymentScheduleId:'1',status:'CONFIRMED',amountPaid:200,paymentDate:'2026-11-17'};
      const schedule:any={paymentScheduleId:'1',poId:'1',amountDue:300,currency:'USD',isAdvance:true,status:'PARTIALLY_PAID',transactions:[first,txn]};
      dataSource.manager.findOne.mockImplementation(async(entity)=>entity===PurchaseOrder?po:entity===PoPaymentSchedule?schedule:txn);
      dataSource.manager.find.mockImplementation(async(entity)=>entity===PoPaymentSchedule?[schedule]:[first,txn].filter(t=>t.status==='CONFIRMED'));
      await service.decidePayment('2','CONFIRMED','Verified',1);
      expect(dataSource.manager.update).toHaveBeenLastCalledWith(PurchaseOrder,{poId:'1'},{expectedDeliveryDate:'2026-11-26'});
      await service.decidePayment('2','REVERSED','Bank reversed',1);
      expect(dataSource.manager.update).toHaveBeenLastCalledWith(PurchaseOrder,{poId:'1'},{expectedDeliveryDate:null});
    });
  });

});

