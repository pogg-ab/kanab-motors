import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Delivery, DeliveryStatus } from './entities/delivery.entity';
import { PdiChecklistItem } from './entities/pdi-checklist-item.entity';
import { PdiInspection } from './entities/pdi-inspection.entity';
import { PdiInspectionResult } from './entities/pdi-inspection-result.entity';
import { VehicleUnit } from '../vehicles/entities/vehicle-unit.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { CreatePdiInspectionDto } from './dto/create-pdi-inspection.dto';

@Injectable()
export class DeliveriesService {
  constructor(
    @InjectRepository(Delivery)
    private deliveryRepo: Repository<Delivery>,
    @InjectRepository(PdiChecklistItem)
    private pdiChecklistItemRepo: Repository<PdiChecklistItem>,
    @InjectRepository(PdiInspection)
    private pdiInspectionRepo: Repository<PdiInspection>,
    @InjectRepository(PdiInspectionResult)
    private pdiInspectionResultRepo: Repository<PdiInspectionResult>,
    @InjectRepository(VehicleUnit)
    private vehicleUnitRepo: Repository<VehicleUnit>,
    @InjectRepository(Booking)
    private bookingRepo: Repository<Booking>,
    private dataSource: DataSource,
  ) {}

  async getPdiChecklist(): Promise<PdiChecklistItem[]> {
    return this.pdiChecklistItemRepo.find({
      order: { pdiChecklistItemId: 'ASC' },
    });
  }

  async recordPdiInspection(dto: CreatePdiInspectionDto, userId = 1): Promise<PdiInspection> {
    const vehicle = await this.vehicleUnitRepo.findOne({
      where: { vehicleUnitId: String(dto.vehicleUnitId) },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle unit #${dto.vehicleUnitId} not found`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Insert inspection header (which fires trg_apply_pdi_completion)
      const inspInsert = await queryRunner.query(`
        INSERT INTO pdi_inspection (vehicle_unit_id, inspected_by)
        VALUES ($1, $2)
        RETURNING pdi_inspection_id
      `, [dto.vehicleUnitId, userId]);

      const inspectionId = inspInsert[0].pdi_inspection_id;

      // 2. Insert checklist items
      for (const res of dto.results) {
        await queryRunner.query(`
          INSERT INTO pdi_inspection_result (pdi_inspection_id, pdi_checklist_item_id, passed, notes)
          VALUES ($1, $2, $3, $4)
        `, [inspectionId, res.checklistItemId, res.passed, res.notes || null]);
      }

      await queryRunner.commitTransaction();

      return this.pdiInspectionRepo.findOne({
        where: { pdiInspectionId: String(inspectionId) },
        relations: ['vehicleUnit', 'inspector', 'results', 'results.checklistItem'],
      }) as Promise<PdiInspection>;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(err.message || 'Failed to record PDI inspection');
    } finally {
      await queryRunner.release();
    }
  }

  async getVehiclePdi(vehicleUnitId: string): Promise<PdiInspection | null> {
    return this.pdiInspectionRepo.findOne({
      where: { vehicleUnitId },
      relations: ['vehicleUnit', 'inspector', 'results', 'results.checklistItem'],
      order: { inspectedAt: 'DESC' },
    });
  }

  async createDelivery(dto: CreateDeliveryDto, userId = 1): Promise<Delivery> {
    const vehicle = await this.vehicleUnitRepo.findOne({
      where: { vehicleUnitId: String(dto.vehicleUnitId) },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle unit #${dto.vehicleUnitId} not found`);
    }

    const booking = await this.bookingRepo.findOne({
      where: { bookingId: String(dto.bookingId) },
      relations: ['customer', 'item'],
    });
    if (!booking) {
      throw new NotFoundException(`Booking #${dto.bookingId} not found`);
    }

    // Check PDI completion
    const pdi = await this.pdiInspectionRepo.findOne({
      where: { vehicleUnitId: String(dto.vehicleUnitId) },
    });
    const pdiCompleted = !!pdi;

    // Financial settlement validation (DL3)
    let financialSettlementValidated = dto.financialSettlementValidated || false;
    if (!financialSettlementValidated) {
      // Auto-validate if booking is SETTLED or sales invoice is APPROVED
      const invoice = await this.dataSource.query(`
        SELECT status, outstanding_balance
        FROM sales_invoice
        WHERE booking_id = $1 AND status = 'APPROVED'
        LIMIT 1
      `, [booking.bookingId]);

      if (invoice.length > 0 && Number(invoice[0].outstanding_balance) <= 0) {
        financialSettlementValidated = true;
      } else if (booking.bookingStatus === 'SETTLED') {
        financialSettlementValidated = true;
      }
    }

    const insertResult = await this.dataSource.query(`
      INSERT INTO delivery (
        booking_id, vehicle_unit_id, delivery_date, responsible_employee,
        customer_acknowledged, pdi_completed, financial_settlement_validated,
        status, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8)
      RETURNING delivery_id
    `, [
      booking.bookingId,
      vehicle.vehicleUnitId,
      dto.deliveryDate || new Date().toISOString().split('T')[0],
      dto.responsibleEmployee || userId,
      dto.customerAcknowledged || false,
      pdiCompleted,
      financialSettlementValidated,
      userId,
    ]);

    const deliveryId = insertResult[0].delivery_id;
    return this.findOne(String(deliveryId));
  }

  async findAll(): Promise<Delivery[]> {
    return this.deliveryRepo
      .createQueryBuilder('del')
      .leftJoinAndSelect('del.booking', 'bkg')
      .leftJoinAndSelect('bkg.customer', 'cust')
      .leftJoinAndSelect('bkg.item', 'item')
      .leftJoinAndSelect('del.vehicleUnit', 'vu')
      .leftJoinAndSelect('del.responsibleStaff', 'staff')
      .leftJoinAndSelect('del.creator', 'creator')
      .orderBy('del.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string): Promise<Delivery> {
    const delivery = await this.deliveryRepo.findOne({
      where: { deliveryId: id },
      relations: [
        'booking',
        'booking.customer',
        'booking.item',
        'vehicleUnit',
        'vehicleUnit.item',
        'responsibleStaff',
        'creator',
      ],
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery #${id} not found`);
    }

    return delivery;
  }

  async authorize(id: string, userId = 1, comments = 'Delivery authorized and vehicle dispatched'): Promise<Delivery> {
    const delivery = await this.findOne(id);
    if (delivery.status === DeliveryStatus.APPROVED) {
      return delivery;
    }

    // Find pending approval request
    const pendingRequest = await this.dataSource.query(`
      SELECT approval_request_id
      FROM approval_request
      WHERE entity_type = 'DELIVERY' AND entity_id = $1 AND status = 'PENDING'
      LIMIT 1
    `, [id]);

    if (pendingRequest.length > 0) {
      const requestId = pendingRequest[0].approval_request_id;
      await this.dataSource.query(`
        SELECT fn_record_approval_decision($1, $2, $3, $4)
      `, [requestId, 'APPROVED', userId, comments]);
    } else {
      await this.dataSource.query(`
        SELECT fn_apply_delivery_approval($1, $2)
      `, [id, userId]);
    }

    return this.findOne(id);
  }

  async generateGatePass(id: string): Promise<any> {
    const delivery = await this.findOne(id);
    const pdi = await this.getVehiclePdi(delivery.vehicleUnitId);

    return {
      gatePassNumber: `GP-${delivery.deliveryNumber}`,
      deliveryNumber: delivery.deliveryNumber,
      deliveryDate: delivery.deliveryDate || new Date().toISOString().split('T')[0],
      status: delivery.status,
      customer: {
        customerId: delivery.booking?.customer?.customerId,
        name: delivery.booking?.customer?.fullName,
        contactPerson: delivery.booking?.customer?.fullName,
        phone: delivery.booking?.customer?.mobileNumber,
      },
      booking: {
        bookingId: delivery.booking?.bookingId,
        bookingNumber: delivery.booking?.bookingNumber,
        bookingStatus: delivery.booking?.bookingStatus,
      },
      vehicle: {
        vehicleUnitId: delivery.vehicleUnit?.vehicleUnitId,
        chassisNumber: delivery.vehicleUnit?.chassisNumber,
        engineNumber: delivery.vehicleUnit?.engineNumber,
        model: delivery.vehicleUnit?.item?.itemName,
        itemCode: delivery.vehicleUnit?.item?.itemCode,
        currentStatus: delivery.vehicleUnit?.currentStatus,
      },
      verifications: {
        pdiCompleted: delivery.pdiCompleted,
        financialSettlementValidated: delivery.financialSettlementValidated,
        customerAcknowledged: delivery.customerAcknowledged,
      },
      pdiSummary: pdi
        ? {
            inspectionId: pdi.pdiInspectionId,
            inspectedAt: pdi.inspectedAt,
            inspectorName: pdi.inspector?.fullName,
            totalChecks: pdi.results?.length,
            passedChecks: pdi.results?.filter((r) => r.passed).length,
          }
        : null,
      dispatchedBy: delivery.responsibleStaff?.fullName || 'Authorized Staff',
      deliveredAt: delivery.deliveredAt,
      issuedAt: new Date(),
    };
  }
}
