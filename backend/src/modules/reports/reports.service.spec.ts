import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ReportsService } from './reports.service';

describe('ReportsService (KMSICAMS-7 Dashboard and Reporting)', () => {
  let service: ReportsService;
  let dataSource: any;

  beforeEach(async () => {
    dataSource = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should get dashboard summary with real-time sales and fleet distribution', async () => {
    dataSource.query
      .mockResolvedValueOnce([
        {
          todays_sales: 1500000,
          todays_invoice_count: 3,
          vehicles_available: 25,
          vehicles_reserved: 5,
          vehicles_allotted: 4,
          vehicles_sold: 10,
          vehicles_delivered: 8,
          pending_approvals: 2,
          pending_allotments: 1,
        },
      ])
      .mockResolvedValueOnce([
        {
          total_invoiced: 45000000,
          total_collected: 38000000,
          total_receivables: 7000000,
          active_confirmed_bookings: 12,
          open_enquiries: 8,
          active_customers: 45,
          active_shipments: 2,
        },
      ]);

    const result = await service.getDashboardSummary();
    expect(result.todays_sales).toBe(1500000);
    expect(result.vehicles_available).toBe(25);
    expect(result.total_receivables).toBe(7000000);
    expect(dataSource.query).toHaveBeenCalledWith(expect.stringContaining('vw_dashboard_summary'));
  });

  it('should query daily sales report with optional date filtering', async () => {
    dataSource.query.mockResolvedValueOnce([
      { sales_date: '2026-09-24', invoice_count: 2, units_sold: 2, total_sales: 1200000 },
    ]);

    const result = await service.getDailySalesReport({
      startDate: '2026-09-01',
      endDate: '2026-09-24',
    });

    expect(result.length).toBe(1);
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('vw_daily_sales_report WHERE sales_date BETWEEN $1 AND $2'),
      ['2026-09-01', '2026-09-24'],
    );
  });

  it('should query sales breakdowns: vehicle type, model, customer, region, salesperson', async () => {
    dataSource.query
      .mockResolvedValueOnce([{ category_name: 'Motorcycle', total_sales: 2500000 }])
      .mockResolvedValueOnce([{ model: 'KMT-150', total_sales: 1800000 }])
      .mockResolvedValueOnce([{ customer_code: 'CUST-001', total_sales: 3000000 }])
      .mockResolvedValueOnce([{ region_name: 'Addis Ababa', total_sales: 4000000 }])
      .mockResolvedValueOnce([{ customer_type: 'DEALER', total_sales: 5000000 }])
      .mockResolvedValueOnce([{ salesperson_name: 'Abebe Bikila', total_sales: 2100000 }]);

    const byType = await service.getSalesByVehicleType();
    const byModel = await service.getSalesByModel();
    const byCustomer = await service.getSalesByCustomer();
    const byRegion = await service.getSalesByRegion();
    const byCustomerType = await service.getSalesByCustomerType();
    const bySalesperson = await service.getSalesBySalesperson();

    expect(byType[0].category_name).toBe('Motorcycle');
    expect(byModel[0].model).toBe('KMT-150');
    expect(byCustomer[0].customer_code).toBe('CUST-001');
    expect(byRegion[0].region_name).toBe('Addis Ababa');
    expect(byCustomerType[0].customer_type).toBe('DEALER');
    expect(bySalesperson[0].salesperson_name).toBe('Abebe Bikila');
  });

  it('should query operational reports: invoices and deliveries', async () => {
    dataSource.query
      .mockResolvedValueOnce([{ invoice_number: 'INV-000001', status: 'APPROVED' }])
      .mockResolvedValueOnce([{ delivery_number: 'DEL-000001', status: 'APPROVED' }]);

    const invoices = await service.getInvoiceReport({ status: 'APPROVED' });
    const deliveries = await service.getDeliveryReport({ status: 'APPROVED' });

    expect(invoices[0].invoice_number).toBe('INV-000001');
    expect(deliveries[0].delivery_number).toBe('DEL-000001');
  });

  it('should query pipeline reports for enquiries and bookings', async () => {
    dataSource.query
      .mockResolvedValueOnce([{ status: 'OPEN', enquiry_count: 5, pipeline_value: 3500000 }])
      .mockResolvedValueOnce([{ status: 'CONFIRMED', booking_count: 10, total_fees: 500000 }]);

    const enquiries = await service.getEnquiriesReport();
    const bookings = await service.getBookingsReport();

    expect(enquiries[0].status).toBe('OPEN');
    expect(bookings[0].status).toBe('CONFIRMED');
  });

  it('should query customer financial summary with debit/credit receivables', async () => {
    dataSource.query.mockResolvedValueOnce([
      {
        customer_id: '1',
        customer_code: 'CUST-001',
        full_name: 'Solomon General Trading',
        total_debited: 1000000,
        total_credited: 800000,
        net_receivable: 200000,
      },
    ]);

    const financialSummary = await service.getCustomerFinancialSummary();
    expect(financialSummary[0].customer_code).toBe('CUST-001');
    expect(financialSummary[0].net_receivable).toBe(200000);
  });
});
