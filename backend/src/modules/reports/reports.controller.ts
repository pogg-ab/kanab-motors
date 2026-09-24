import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';

@ApiTags('Dashboard and Reporting (KMSICAMS-7)')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard/summary')
  @ApiOperation({ summary: 'Executive Real-Time Dashboard Summary KPIs' })
  getDashboardSummary() {
    return this.reportsService.getDashboardSummary();
  }

  @Get('management-dashboard/summary')
  @ApiOperation({ summary: 'Management Dashboard 13 KPIs with date range filter (KMSICAMS-8)' })
  getManagementDashboardSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getManagementDashboardSummary(startDate, endDate);
  }

  @Get('management-dashboard/sales-cross-tab')
  @ApiOperation({ summary: 'Sales Performance cross-tab by Product × Salesperson (KMSICAMS-8)' })
  getSalesPerformanceCrossTab(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getSalesPerformanceCrossTab(startDate, endDate);
  }

  @Get('sales/daily')
  @ApiOperation({ summary: 'Daily sales breakdown report' })
  getDailySalesReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getDailySalesReport({ startDate, endDate });
  }

  @Get('sales/monthly')
  @ApiOperation({ summary: 'Monthly sales aggregate report' })
  getMonthlySalesReport() {
    return this.reportsService.getMonthlySalesReport();
  }

  @Get('sales/by-vehicle-type')
  @ApiOperation({ summary: 'Sales distribution by vehicle category' })
  getSalesByVehicleType() {
    return this.reportsService.getSalesByVehicleType();
  }

  @Get('sales/by-model')
  @ApiOperation({ summary: 'Sales distribution by vehicle model' })
  getSalesByModel() {
    return this.reportsService.getSalesByModel();
  }

  @Get('sales/by-customer')
  @ApiOperation({ summary: 'Sales revenue breakdown by customer' })
  getSalesByCustomer() {
    return this.reportsService.getSalesByCustomer();
  }

  @Get('sales/by-region')
  @ApiOperation({ summary: 'Regional sales distribution' })
  getSalesByRegion() {
    return this.reportsService.getSalesByRegion();
  }

  @Get('sales/by-customer-type')
  @ApiOperation({ summary: 'Sales by customer segment (Direct POS, Dealer, Govt)' })
  getSalesByCustomerType() {
    return this.reportsService.getSalesByCustomerType();
  }

  @Get('sales/by-salesperson')
  @ApiOperation({ summary: 'Sales team performance by salesperson' })
  getSalesBySalesperson() {
    return this.reportsService.getSalesBySalesperson();
  }

  @Get('operational/invoices')
  @ApiOperation({ summary: 'Detailed invoice operations report' })
  getInvoiceReport(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getInvoiceReport({
      status,
      limit: limit ? parseInt(limit, 10) : 100,
    });
  }

  @Get('operational/deliveries')
  @ApiOperation({ summary: 'Detailed vehicle deliveries operations report' })
  getDeliveryReport(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getDeliveryReport({
      status,
      limit: limit ? parseInt(limit, 10) : 100,
    });
  }

  @Get('operational/enquiries')
  @ApiOperation({ summary: 'Sales enquiries pipeline status report' })
  getEnquiriesReport() {
    return this.reportsService.getEnquiriesReport();
  }

  @Get('operational/bookings')
  @ApiOperation({ summary: 'Advance bookings pipeline status report' })
  getBookingsReport() {
    return this.reportsService.getBookingsReport();
  }

  @Get('financial/summary')
  @ApiOperation({ summary: 'Customer financial ledger and receivables summary report' })
  getCustomerFinancialSummary() {
    return this.reportsService.getCustomerFinancialSummary();
  }
}
