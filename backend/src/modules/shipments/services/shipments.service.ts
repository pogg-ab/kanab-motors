import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { deadlineState, expiryDate, reminderEvents, validDate } from '../utils/container-rules';
import { loadImportPolicy, businessDate, dateAfter, assertCompliance } from '../../purchase-orders/utils/import-rules';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager, In } from 'typeorm';
import {
  Shipment,
  ShipmentStage,
  AllocationMethod,
} from '../entities/shipment.entity';
import { ShipmentLine } from '../entities/shipment-line.entity';
import { ShipmentStageHistory } from '../entities/shipment-stage-history.entity';
import { ShipmentCostComponent } from '../entities/shipment-cost-component.entity';
import { ShipmentReceipt } from '../entities/shipment-receipt.entity';
import { CostComponentType } from '../entities/cost-component-type.entity';
import { ExchangeRateDefault } from '../entities/exchange-rate-default.entity';
import { Attachment } from '../../customers/entities/attachment.entity';
import { VehicleUnit, VehicleStatus } from '../../vehicles/entities/vehicle-unit.entity';
import { PurchaseOrder, POStatus } from '../../purchase-orders/entities/purchase-order.entity';
import { PurchaseOrderLine } from '../../purchase-orders/entities/purchase-order-line.entity';
import { ShipmentLineLandedCost } from '../entities/shipment-line-landed-cost.entity';
import { VehicleUnitLandedCost } from '../entities/vehicle-unit-landed-cost.entity';
import {
  AddCostComponentDto,
  CreateShipmentDto,
  ReceiveShipmentLineDto,
} from '../dto/shipment.dto';
import { LandedCostAllocationService } from './landed-cost-allocation.service';
import { FreightForwarder } from '../entities/freight-forwarder.entity';
import { ShipmentFreightQuotation } from '../entities/shipment-freight-quotation.entity';
import { ShipmentBooking } from '../entities/shipment-booking.entity';
import { ShipmentContainer } from '../entities/shipment-container.entity';
import { ShipmentMilestone } from '../entities/shipment-milestone.entity';
import { ShipmentInsurance } from '../entities/shipment-insurance.entity';
import { ShipmentCargoTracking } from '../entities/shipment-cargo-tracking.entity';
import { ShipmentDocument } from '../entities/shipment-document.entity';
import { ImportNotification } from '../entities/import-notification.entity';
import {
  CreateFreightForwarderDto,
  UpdateFreightForwarderDto,
  CreateFreightQuotationDto,
  SelectFreightQuotationDto,
  ApproveFreightQuotationDto,
  RejectFreightQuotationDto,
  CreateShipmentBookingDto,
  CreateShipmentContainerDto,
  CreateShipmentMilestoneDto,
  CreateShipmentInsuranceDto,
  CreateCargoTrackingDto,
  CreateShipmentDocumentDto,
  VerifyShipmentDocumentDto,
  UpdateOriginalDocumentStatusDto,
} from '../dto/logistics.dto';
import { AuditService } from '../../audit/audit.service';

export const LOGISTICS_DEFAULTS = {
  timezone: 'Africa/Nairobi', freeTimeOffsets: [7,3,1], returnOffsets: [7,3,1],
  recipientRoles: ['ADMIN'], allowSelfApproval: false, containerUniqueness: 'PER_SHIPMENT',
  milestoneRules: [] as { destination: string; mode: string; name: string; stage: string }[],
  trackingRules: [] as { destination: string; mode: string; name: string; stage: string }[],
};
const RECORDS = {
  containers: { entity: ShipmentContainer, dto: CreateShipmentContainerDto, id: 'containerId', table: 'shipment_container' },
  bookings: { entity: ShipmentBooking, dto: CreateShipmentBookingDto, id: 'bookingId', table: 'shipment_booking' },
  milestones: { entity: ShipmentMilestone, dto: CreateShipmentMilestoneDto, id: 'milestoneId', table: 'shipment_milestone' },
  insurance: { entity: ShipmentInsurance, dto: CreateShipmentInsuranceDto, id: 'insuranceId', table: 'shipment_insurance' },
  tracking: { entity: ShipmentCargoTracking, dto: CreateCargoTrackingDto, id: 'trackingId', table: 'shipment_cargo_tracking' },
};
const STAGES = ['SHIPPED','AT_DJIBOUTI_PORT','ETHIOPIAN_CUSTOMS_CLEARANCE','IN_TRANSIT_INLAND','RECEIVED'];


@Injectable()
export class ShipmentsService {
  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepo: Repository<Shipment>,
    @InjectRepository(ShipmentLine)
    private readonly shipmentLineRepo: Repository<ShipmentLine>,
    @InjectRepository(ShipmentStageHistory)
    private readonly stageHistoryRepo: Repository<ShipmentStageHistory>,
    @InjectRepository(ShipmentCostComponent)
    private readonly costRepo: Repository<ShipmentCostComponent>,
    @InjectRepository(ShipmentReceipt)
    private readonly receiptRepo: Repository<ShipmentReceipt>,
    @InjectRepository(CostComponentType)
    private readonly costTypeRepo: Repository<CostComponentType>,
    @InjectRepository(ExchangeRateDefault)
    private readonly exchangeRateRepo: Repository<ExchangeRateDefault>,
    @InjectRepository(Attachment)
    private readonly attachmentRepo: Repository<Attachment>,
    @InjectRepository(VehicleUnit)
    private readonly vehicleUnitRepo: Repository<VehicleUnit>,
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderLine)
    private readonly poLineRepo: Repository<PurchaseOrderLine>,
    @InjectRepository(ShipmentLineLandedCost)
    private readonly lineCostRepo: Repository<ShipmentLineLandedCost>,
    @InjectRepository(VehicleUnitLandedCost)
    private readonly vehicleUnitCostRepo: Repository<VehicleUnitLandedCost>,
    @InjectRepository(FreightForwarder)
    private readonly forwarderRepo: Repository<FreightForwarder>,
    @InjectRepository(ShipmentFreightQuotation)
    private readonly quotationRepo: Repository<ShipmentFreightQuotation>,
    @InjectRepository(ShipmentBooking)
    private readonly bookingRepo: Repository<ShipmentBooking>,
    @InjectRepository(ShipmentContainer)
    private readonly containerRepo: Repository<ShipmentContainer>,
    @InjectRepository(ShipmentMilestone)
    private readonly milestoneRepo: Repository<ShipmentMilestone>,
    @InjectRepository(ShipmentInsurance)
    private readonly insuranceRepo: Repository<ShipmentInsurance>,
    @InjectRepository(ShipmentCargoTracking)
    private readonly cargoTrackingRepo: Repository<ShipmentCargoTracking>,
    @InjectRepository(ShipmentDocument)
    private readonly shipmentDocRepo: Repository<ShipmentDocument>,
    @InjectRepository(ImportNotification)
    private readonly notificationRepo: Repository<ImportNotification>,
    private readonly dataSource: DataSource,
    private readonly landedCostService: LandedCostAllocationService,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  private async audit(entityType: string, entityId: string, action: 'INSERT' | 'UPDATE', userId?: number, oldValue?: any, newValue?: any) {
    await this.auditService?.log({ entityType, entityId, action, changedBy: userId, oldValue, newValue });
  }

  async create(dto: CreateShipmentDto): Promise<Shipment> {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Shipment must contain at least one PO line');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const duplicateLineIds = dto.lines
        .map((line) => String(line.poLineId))
        .filter((lineId, idx, arr) => arr.indexOf(lineId) !== idx);
      if (duplicateLineIds.length > 0) {
        throw new BadRequestException('A PO line can only appear once in a shipment');
      }

      for (const requestedLine of dto.lines) {
        const poLine = await queryRunner.manager
          .getRepository(PurchaseOrderLine)
          .createQueryBuilder('pol')
          .setLock('pessimistic_write')
          .where('pol.poLineId = :poLineId', { poLineId: requestedLine.poLineId })
          .getOne();

        if (!poLine) {
          throw new BadRequestException(`PO line #${requestedLine.poLineId} does not exist`);
        }

        const purchaseOrder = await queryRunner.manager.findOne(PurchaseOrder, {
          where: { poId: poLine.poId },
        });

        if (!purchaseOrder) {
          throw new BadRequestException(`PO line #${requestedLine.poLineId} is not linked to a purchase order`);
        }

        if (![POStatus.CONFIRMED, POStatus.PARTIALLY_RECEIVED].includes(purchaseOrder.status)) {
          throw new BadRequestException(
            `PO line #${requestedLine.poLineId} belongs to a ${purchaseOrder.status} purchase order`,
          );
        }

        const shipped = await queryRunner.manager
          .getRepository(ShipmentLine)
          .createQueryBuilder('sl')
          .select('COALESCE(SUM(sl.quantityShipped), 0)', 'quantity')
          .where('sl.poLineId = :poLineId', { poLineId: requestedLine.poLineId })
          .getRawOne<{ quantity: string }>();

        const alreadyShipped = Number(shipped?.quantity || 0);
        const remaining = Number(poLine.quantityOrdered) - alreadyShipped;
        if (Number(requestedLine.quantityShipped) > remaining) {
          throw new BadRequestException(
            `PO line #${requestedLine.poLineId} only has ${remaining} unit(s) remaining to ship`,
          );
        }
      }

      const shipmentNumber = await this.generateShipmentNumber(queryRunner.manager);
      const shipment = queryRunner.manager.create(Shipment, {
        shipmentNumber,
        currentStage: ShipmentStage.ORDERED,
        billOfLadingNumber: dto.billOfLadingNumber,
        expectedArrivalDate: dto.expectedArrivalDate,
        allocationMethod: dto.allocationMethod || 'BY_VALUE',
        notes: dto.notes,
        createdBy: dto.userId,
        updatedBy: dto.userId,
      });

      const savedShipment = await queryRunner.manager.save(Shipment, shipment);

      const lines = dto.lines.map((l) =>
        queryRunner.manager.create(ShipmentLine, {
          shipmentId: savedShipment.shipmentId,
          poLineId: l.poLineId,
          quantityShipped: l.quantityShipped,
          quantityReceived: 0,
        }),
      );

      await queryRunner.manager.save(ShipmentLine, lines);

      // Log initial stage history
      const history = queryRunner.manager.create(ShipmentStageHistory, {
        shipmentId: savedShipment.shipmentId,
        fromStage: null,
        toStage: ShipmentStage.ORDERED,
        changedBy: dto.userId,
        notes: 'Initial shipment creation',
      });
      await queryRunner.manager.save(ShipmentStageHistory, history);

      // Story IMP-28: Auto-seed standard logistics shipping milestones
      const defaultMilestones = [
        'PRODUCTION_COMPLETED',
        'CARGO_READY',
        'BOOKING_CONFIRMED',
        'CONTAINER_STUFFED',
        'CUSTOMS_EXPORT_CLEARED',
        'VESSEL_DEPARTED',
        'PORT_OF_DJIBOUTI_ARRIVED',
        'CUSTOMS_IMPORT_CLEARED',
        'INLAND_DISPATCHED',
        'WAREHOUSE_RECEIVED',
      ];
      const milestoneEntities = defaultMilestones.map((name) =>
        queryRunner.manager.create(ShipmentMilestone, {
          shipmentId: savedShipment.shipmentId,
          milestoneName: name,
          isCompleted: false,
        }),
      );
      await queryRunner.manager.save(ShipmentMilestone, milestoneEntities);

      // Story IMP-33: Auto-seed standard shipping document checklist
      const defaultDocTypes = [
        'COMMERCIAL_INVOICE',
        'PACKING_LIST',
        'BILL_OF_LADING',
        'CERTIFICATE_OF_ORIGIN',
        'PRE_SHIPMENT_INSPECTION_CERTIFICATE',
        'CUSTOMS_DECLARATION',
        'INSURANCE_CERTIFICATE',
        'ECTN_CERTIFICATE',
      ];
      const docEntities = defaultDocTypes.map((type) =>
        queryRunner.manager.create(ShipmentDocument, {
          shipmentId: savedShipment.shipmentId,
          documentType: type,
          verificationStatus: 'PENDING',
          originalDocumentStatus: 'NOT_RECEIVED',
        }),
      );
      await queryRunner.manager.save(ShipmentDocument, docEntities);

      await queryRunner.commitTransaction();

      return this.findOne(savedShipment.shipmentId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async generateShipmentNumber(manager: DataSource['manager']): Promise<string> {
    await manager.query(`CREATE SEQUENCE IF NOT EXISTS shipment_number_seq START WITH 1 INCREMENT BY 1`);
    const result = await manager.query(`SELECT nextval('shipment_number_seq') AS value`);
    const value = Number(result?.[0]?.value || 0);
    if (!value) {
      throw new BadRequestException('Unable to generate shipment number');
    }
    return `SH-${String(value).padStart(6, '0')}`;
  }

  async findAll(params?: {
    search?: string;
    stage?: ShipmentStage;
    page?: number;
    limit?: number;
  }): Promise<{ items: Shipment[]; total: number; page: number; limit: number }> {
    const page = Number(params?.page) || 1;
    const limit = Number(params?.limit) || 20;
    const skip = (page - 1) * limit;

    const query = this.shipmentRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.lines', 'lines')
      .leftJoinAndSelect('lines.poLine', 'poLine')
      .leftJoinAndSelect('poLine.item', 'item')
      .leftJoinAndSelect('s.costComponents', 'costs');

    if (params?.search) {
      query.andWhere(
        '(s.shipmentNumber ILIKE :search OR s.billOfLadingNumber ILIKE :search OR s.notes ILIKE :search)',
        { search: `%${params.search}%` },
      );
    }

    if (params?.stage) {
      query.andWhere('s.currentStage = :stage', { stage: params.stage });
    }

    query.orderBy('s.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await query.getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<Shipment> {
    const shipment = await this.shipmentRepo.findOne({
      where: { shipmentId: id },
      relations: [
        'lines',
        'lines.poLine',
        'lines.poLine.item',
        'lines.poLine.purchaseOrder',
        'lines.poLine.purchaseOrder.supplier',
        'lines.poLine.purchaseOrder.companyProfile',
        'lines.receipts',
        'costComponents',
        'costComponents.costComponentType',
        'stageHistory',
        'stageHistory.user',
        'creator',
        'updater',
        'selectedForwarder',
        'quotations',
        'quotations.forwarder',
        'bookings',
        'bookings.forwarder',
        'containers',
        'milestones',
        'insurances',
        'cargoTrackings',
        'documents',
        'documents.verifier',
      ],
      order: {
        stageHistory: { changedAt: 'ASC' },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment #${id} not found`);
    }

    shipment.lines = (shipment.lines || []).map((line) => {
      const receiptTotal = (line.receipts || []).reduce(
        (sum, receipt) => sum + Number(receipt.quantityReceived || 0),
        0,
      );
      if (receiptTotal > Number(line.quantityReceived || 0)) {
        line.quantityReceived = receiptTotal;
      }
      return line;
    });

    return shipment;
  }

  async updateStage(
    id: string,
    targetStage: ShipmentStage,
    notes?: string,
    userId?: number,
  ): Promise<Shipment> {
    const shipment = await this.findOne(id);
    const fromStage = shipment.currentStage;

    if (fromStage === targetStage) {
      throw new BadRequestException(`Shipment is already in ${targetStage}`);
    }

    const validTransitions: Record<ShipmentStage, ShipmentStage[]> = {
      [ShipmentStage.ORDERED]: [ShipmentStage.SHIPPED],
      [ShipmentStage.SHIPPED]: [ShipmentStage.AT_DJIBOUTI_PORT],
      [ShipmentStage.AT_DJIBOUTI_PORT]: [ShipmentStage.ETHIOPIAN_CUSTOMS_CLEARANCE],
      [ShipmentStage.ETHIOPIAN_CUSTOMS_CLEARANCE]: [ShipmentStage.IN_TRANSIT_INLAND],
      [ShipmentStage.IN_TRANSIT_INLAND]: [ShipmentStage.RECEIVED],
      [ShipmentStage.RECEIVED]: [],
    };

    let configuredTransition: any[] = [];
    try {
      configuredTransition = await this.dataSource.query(
        `SELECT transition_id FROM import_workflow_transition
         WHERE workflow_type='SHIPMENT' AND from_status=$1 AND to_status=$2 AND is_active=TRUE`,
        [fromStage, targetStage],
      );
    } catch {
      configuredTransition = [];
    }
    if (configuredTransition.length === 0 && !validTransitions[fromStage]?.includes(targetStage)) {
      throw new BadRequestException(`Invalid shipment stage transition from ${fromStage} to ${targetStage}`);
    }

    await this.assertLogisticsProgress(shipment,targetStage);
    const checkpoint = targetStage === ShipmentStage.SHIPPED ? 'SHIPMENT' : targetStage === ShipmentStage.ETHIOPIAN_CUSTOMS_CLEARANCE ? 'CUSTOMS' : null;
    if (checkpoint) {
      const orders = new Map((shipment.lines || []).map(l => [l.poLine?.purchaseOrder?.poId, l.poLine?.purchaseOrder]));
      for (const po of orders.values()) if (po) await assertCompliance(this.dataSource,po,checkpoint);
    }
    // Configurable document completeness rules (IMP-33/37).
    const firstPo = shipment.lines?.[0]?.poLine?.purchaseOrder;
    const shipmentType = firstPo?.modeOfShipment || null;
    const rawRequirements = await this.dataSource.query(
      `SELECT destination_country, shipment_type, process_stage, document_type, requires_verification
       FROM shipment_document_requirement
       WHERE process_stage = $1 AND is_required = TRUE AND is_active = TRUE
       ORDER BY document_type`,
      [targetStage],
    );
    const hasCountryRule = (rawRequirements || []).some((r: any) => Boolean(r.destination_country));
    const destinationCountry = hasCountryRule
      ? await this.resolveShipmentDestinationCountry(shipment)
      : null;
    const requirements = (rawRequirements || []).filter((req: any) =>
      this.isRequirementApplicableToShipment(req, {
        currentStage: targetStage,
        destinationCountry,
        shipmentType,
      }),
    );
    if (requirements.length > 0) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const controlledDocs = await this.shipmentDocRepo.find({ where: { shipmentId: id } });
      const failures = requirements.filter((r: any) => {
        const matchingDocs = controlledDocs.filter((d) => d.documentType === r.document_type);
        if (matchingDocs.length === 0) return true;
        const hasValidDoc = matchingDocs.some((doc) => {
          const isExpired =
            Boolean(doc.expiryDate && String(doc.expiryDate).slice(0, 10) < todayStr) ||
            doc.verificationStatus === 'EXPIRED';
          if (isExpired || doc.verificationStatus === 'REJECTED') return false;
          return r.requires_verification ? doc.verificationStatus === 'VERIFIED' : true;
        });
        return !hasValidDoc;
      });
      if (failures.length > 0) {
        throw new BadRequestException(
          `Document Completeness Check Failed: required verified documents are missing, unverified, or expired: ${failures.map((r: any) => r.document_type).join(', ')}.`,
        );
      }
    }

    // Backward-compatible checks for databases that have not configured rules.
    // 1. Advancing to ETHIOPIAN_CUSTOMS_CLEARANCE requires verified Customs Declaration
    if (targetStage === ShipmentStage.ETHIOPIAN_CUSTOMS_CLEARANCE) {
      const customsAttachment = await this.attachmentRepo.findOne({
        where: {
          entityType: 'shipment',
          entityId: String(id),
          documentType: 'CUSTOMS_DECLARATION',
        },
      });
      const structuredCustoms = await this.shipmentDocRepo.findOne({
        where: {
          shipmentId: id,
          documentType: 'CUSTOMS_DECLARATION',
          verificationStatus: 'VERIFIED',
        },
      });

      if (requirements.length === 0 && !structuredCustoms) {
        throw new BadRequestException(
          `Document Completeness Check Failed: Mandatory Customs Declaration document ('CUSTOMS_DECLARATION') must be uploaded or marked VERIFIED in Shipping Document Control before advancing to ${targetStage}.`,
        );
      }
    }

    // 2. Advancing to RECEIVED (closure) requires full mandatory import document packet
    if (targetStage === ShipmentStage.RECEIVED) {
      const requiredDocs = requirements.length === 0 ? ['CUSTOMS_DECLARATION', 'COMMERCIAL_INVOICE', 'BILL_OF_LADING'] : [];
      const attached = await this.attachmentRepo.find({
        where: {
          entityType: 'shipment',
          entityId: String(id),
        },
      });

      const missing = requiredDocs.filter(
        (docType) => !attached.some((a) => a.documentType === docType && a.filePath),
      );

      if (missing.length > 0) {
        const labels: Record<string, string> = {
          CUSTOMS_DECLARATION: 'Customs Declaration',
          COMMERCIAL_INVOICE: 'Commercial Invoice',
          BILL_OF_LADING: 'Bill of Lading',
        };
        const missingLabels = missing.map((m) => labels[m] || m).join(', ');
        throw new BadRequestException(
          `Document Completeness Check Failed: Cannot advance to RECEIVED stage. The following mandatory import documents are missing: ${missingLabels}. Please upload all required files in the Document Centre.`,
        );
      }
    }

    shipment.currentStage = targetStage;
    shipment.updatedBy = userId;
    if (targetStage === ShipmentStage.RECEIVED && !shipment.actualArrivalDate) {
      shipment.actualArrivalDate = new Date().toISOString().split('T')[0];
    }

    const saved = await this.shipmentRepo.save(shipment);

    const history = this.stageHistoryRepo.create({
      shipmentId: id,
      fromStage,
      toStage: targetStage,
      changedBy: userId,
      notes,
    });
    await this.stageHistoryRepo.save(history);

    return this.findOne(id);
  }

  async addCostComponent(shipmentId: string, dto: AddCostComponentDto): Promise<ShipmentCostComponent> {
    const shipment = await this.shipmentRepo.findOne({
      where: { shipmentId },
      select: ['shipmentId', 'currentStage'],
    });
    if (!shipment) {
      throw new NotFoundException(`Shipment #${shipmentId} not found`);
    }
    if (shipment.currentStage === ShipmentStage.RECEIVED) {
      throw new BadRequestException('Cannot add cost components after a shipment is received');
    }

    const componentType = await this.costTypeRepo.findOne({
      where: { costComponentTypeId: dto.costComponentTypeId },
    });
    if (!componentType) {
      throw new BadRequestException(`Cost component type #${dto.costComponentTypeId} does not exist`);
    }

    const normalizedCurrency = dto.currency.trim().toUpperCase();
    let rate = dto.exchangeRateToEtb;
    if (!rate) {
      if (normalizedCurrency === 'ETB') {
        rate = 1.0;
      } else {
        const defaultRate = await this.exchangeRateRepo.findOne({
          where: { currency: normalizedCurrency },
        });
        if (!defaultRate) {
          throw new BadRequestException(`No default exchange rate is configured for ${normalizedCurrency}`);
        }
        rate = Number(defaultRate.rateToEtb);
      }
    }

    if (normalizedCurrency === 'ETB' && rate !== 1.0) {
      throw new BadRequestException('Exchange rate for ETB must always be 1.0');
    }

    const cost = this.costRepo.create({
      shipmentId,
      costComponentTypeId: dto.costComponentTypeId,
      amount: dto.amount,
      currency: normalizedCurrency,
      exchangeRateToEtb: rate,
      notes: dto.notes,
      createdBy: dto.userId,
    });

    const savedCost = await this.costRepo.save(cost);
    await this.invalidateCurrentAllocation(shipmentId);
    return savedCost;
  }

  async removeCostComponent(shipmentId: string, costComponentId: string): Promise<void> {
    const shipment = await this.shipmentRepo.findOne({
      where: { shipmentId },
      select: ['shipmentId', 'currentStage'],
    });
    if (!shipment) {
      throw new NotFoundException(`Shipment #${shipmentId} not found`);
    }
    if (shipment.currentStage === ShipmentStage.RECEIVED) {
      throw new BadRequestException('Cannot remove cost components after a shipment is received');
    }

    const cost = await this.costRepo.findOne({ where: { shipmentId, costComponentId } });
    if (!cost) {
      throw new NotFoundException(`Cost Component #${costComponentId} not found`);
    }
    await this.costRepo.remove(cost);
    await this.invalidateCurrentAllocation(shipmentId);
  }

  private async invalidateCurrentAllocation(shipmentId: string): Promise<void> {
    const lines = await this.shipmentLineRepo.find({ where: { shipmentId } });
    const lineIds = lines.map((line) => line.shipmentLineId);
    if (lineIds.length === 0) {
      return;
    }

    await this.lineCostRepo
      .createQueryBuilder()
      .update(ShipmentLineLandedCost)
      .set({ isCurrent: false })
      .where('shipmentLineId IN (:...lineIds) AND isCurrent = true', { lineIds })
      .execute();

    await this.vehicleUnitCostRepo
      .createQueryBuilder()
      .update(VehicleUnitLandedCost)
      .set({ isCurrent: false })
      .where('shipmentLineId IN (:...lineIds) AND isCurrent = true', { lineIds })
      .execute();
  }

  async receiveLine(shipmentId: string, dto: ReceiveShipmentLineDto): Promise<ShipmentReceipt> {
    const shipment = await this.findOne(shipmentId);
    const line = shipment.lines.find((l) => String(l.shipmentLineId) === String(dto.shipmentLineId));
    if (!line) {
      throw new BadRequestException(`Shipment line #${dto.shipmentLineId} not found in this shipment`);
    }

    const vehicles = dto.vehicles || dto.vehicleUnits || [];
    if (dto.vehicles && dto.vehicleUnits) {
      throw new BadRequestException('Use either vehicles or vehicleUnits, not both');
    }

    if (vehicles.length > 0 && vehicles.length !== Number(dto.quantityReceived)) {
      throw new BadRequestException('Vehicle count must match quantity received');
    }

    let currentLineCost = await this.lineCostRepo.findOne({
      where: { shipmentLineId: dto.shipmentLineId, isCurrent: true },
    });
    if (!currentLineCost) {
      try {
        await this.landedCostService.calculateAndPersistAllocation(
          shipmentId,
          shipment.allocationMethod || 'BY_VALUE',
          dto.userId,
        );
        currentLineCost = await this.lineCostRepo.findOne({
          where: { shipmentLineId: dto.shipmentLineId, isCurrent: true },
        });
      } catch (allocErr) {
        // Fallback: If landed cost cannot be calculated, proceed with receiving physical inventory
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const receivedSoFar = await queryRunner.manager
        .getRepository(ShipmentReceipt)
        .createQueryBuilder('sr')
        .select('COALESCE(SUM(sr.quantityReceived), 0)', 'quantity')
        .where('sr.shipmentLineId = :shipmentLineId', { shipmentLineId: dto.shipmentLineId })
        .getRawOne<{ quantity: string }>();
      const totalReceivedAfterThisReceipt = Number(receivedSoFar?.quantity || 0) + Number(dto.quantityReceived);
      if (totalReceivedAfterThisReceipt > Number(line.quantityShipped)) {
        throw new BadRequestException(
          `Shipment line #${dto.shipmentLineId} only has ${
            Number(line.quantityShipped) - Number(receivedSoFar?.quantity || 0)
          } unit(s) remaining to receive`,
        );
      }

      const actualLineId = String(line.shipmentLineId || (line as any).shipment_line_id || dto.shipmentLineId);
      if (!actualLineId || actualLineId === 'undefined' || actualLineId === 'null') {
        throw new BadRequestException('Invalid or missing shipment line ID');
      }

      // 1. Record shipment_receipt directly via SQL to guarantee column values are passed
      const receiptRows = await queryRunner.query(
        `INSERT INTO shipment_receipt (shipment_line_id, quantity_received, warehouse_id, notes, received_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          actualLineId,
          Number(dto.quantityReceived),
          dto.warehouseId ? Number(dto.warehouseId) : null,
          dto.notes || null,
          dto.userId ? Number(dto.userId) : null,
        ],
      );

      const rawReceipt = receiptRows[0];
      const savedReceipt = queryRunner.manager.create(ShipmentReceipt, {
        receiptId: String(rawReceipt.receipt_id),
        shipmentLineId: String(rawReceipt.shipment_line_id),
        quantityReceived: Number(rawReceipt.quantity_received),
        warehouseId: rawReceipt.warehouse_id,
        notes: rawReceipt.notes,
        receivedBy: rawReceipt.received_by,
        receivedAt: rawReceipt.received_at,
      });

      await queryRunner.manager.update(ShipmentLine, actualLineId, {
        quantityReceived: totalReceivedAfterThisReceipt,
      });

      // 2. If serialized vehicles are provided (Story R1), create vehicle_unit records
      if (vehicles.length > 0) {
        const itemId = line.poLine?.itemId;
        if (!itemId) {
          throw new BadRequestException('Cannot register vehicles: item ID missing on PO line');
        }

        const vehicleUnits: VehicleUnit[] = [];
        for (const v of vehicles) {
          const unit = queryRunner.manager.create(VehicleUnit, {
            itemId,
            chassisNumber: v.chassisNumber.trim(),
            engineNumber: v.engineNumber.trim(),
            currentWarehouseId: dto.warehouseId || 1,
            currentStatus: VehicleStatus.RECEIVED,
            holdForInspection: false,
            createdBy: dto.userId,
            shipmentLineId: actualLineId,
            productionImportInfo: `Imported via ${shipment.shipmentNumber} (Bill of Lading: ${shipment.billOfLadingNumber || 'N/A'})`,
          });
          vehicleUnits.push(unit);
        }
        const savedUnits = await queryRunner.manager.save(VehicleUnit, vehicleUnits);

        await queryRunner.manager
          .createQueryBuilder()
          .update(VehicleUnitLandedCost)
          .set({ isCurrent: false })
          .where('vehicleUnitId IN (:...vehicleUnitIds) AND isCurrent = true', {
            vehicleUnitIds: savedUnits.map((unit) => unit.vehicleUnitId),
          })
          .execute();

        const receivedUnitCount = await queryRunner.manager
          .getRepository(VehicleUnit)
          .createQueryBuilder('vu')
          .where('vu.shipmentLineId = :shipmentLineId', { shipmentLineId: actualLineId })
          .getCount();

        const allocatedCost = currentLineCost ? Number(currentLineCost.allocatedCostEtb) : 0;
        const unitCost = Math.round((allocatedCost / Number(line.quantityShipped)) * 100) / 100;
        const unitCostRows = savedUnits.map((unit) =>
          queryRunner.manager.create(VehicleUnitLandedCost, {
            vehicleUnitId: unit.vehicleUnitId,
            shipmentLineId: actualLineId,
            landedCostEtb: unitCost,
            isCurrent: true,
            calculatedBy: dto.userId,
          }),
        );

        if (receivedUnitCount <= Number(line.quantityShipped) && unitCostRows.length > 0 && unitCost > 0) {
          await queryRunner.manager.save(VehicleUnitLandedCost, unitCostRows);
        }
      }

      const freshLines = await queryRunner.manager.find(ShipmentLine, {
        where: { shipmentId },
      });
      const allReceived = freshLines.every(
        (shipmentLine) => Number(shipmentLine.quantityReceived) >= Number(shipmentLine.quantityShipped),
      );
      const anyReceived = freshLines.some((shipmentLine) => Number(shipmentLine.quantityReceived) > 0);
      if (allReceived || anyReceived) {
        const previousStage = shipment.currentStage;
        const nextStage = allReceived ? ShipmentStage.RECEIVED : shipment.currentStage;
        const actualArrivalDate = allReceived && !shipment.actualArrivalDate
          ? new Date().toISOString().split('T')[0]
          : shipment.actualArrivalDate;

        await queryRunner.manager.update(Shipment, shipmentId, {
          currentStage: nextStage,
          actualArrivalDate,
          updatedBy: dto.userId,
        });

        if (allReceived && previousStage !== ShipmentStage.RECEIVED) {
          const history = queryRunner.manager.create(ShipmentStageHistory, {
            shipmentId,
            fromStage: previousStage,
            toStage: ShipmentStage.RECEIVED,
            changedBy: dto.userId,
            notes: dto.notes || 'Shipment automatically marked RECEIVED after full inventory receipt',
          });
          await queryRunner.manager.save(ShipmentStageHistory, history);
        }
      }

      const poId = line.poLine?.poId;
      if (poId) {
        await this.syncPurchaseOrderFulfillmentStatus(poId, dto.userId, queryRunner.manager);
      }

      await queryRunner.commitTransaction();
      return savedReceipt;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async syncPurchaseOrderFulfillmentStatus(
    poId: string,
    userId?: number,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<void> {
    const poLines = await manager.find(PurchaseOrderLine, { where: { poId } });
    if (poLines.length === 0) {
      return;
    }

    const poLineIds = poLines.map((poLine) => poLine.poLineId);
    const receivedRows = await manager
      .getRepository(ShipmentLine)
      .createQueryBuilder('sl')
      .select('sl.poLineId', 'poLineId')
      .addSelect('COALESCE(SUM(sl.quantityReceived), 0)', 'quantityReceived')
      .where('sl.poLineId IN (:...poLineIds)', { poLineIds })
      .groupBy('sl.poLineId')
      .getRawMany<{ poLineId: string; quantityReceived: string }>();

    const receivedByPoLine = new Map(
      receivedRows.map((row) => [String(row.poLineId), Number(row.quantityReceived)]),
    );
    const poAllReceived = poLines.every(
      (poLine) => (receivedByPoLine.get(String(poLine.poLineId)) || 0) >= Number(poLine.quantityOrdered),
    );
    const poAnyReceived = poLines.some(
      (poLine) => (receivedByPoLine.get(String(poLine.poLineId)) || 0) > 0,
    );

    if (poAllReceived || poAnyReceived) {
      await manager.update(PurchaseOrder, poId, {
        status: poAllReceived ? POStatus.RECEIVED : POStatus.PARTIALLY_RECEIVED,
        updatedBy: userId,
      });
    }
  }

  // Reference lookups
  async getCostComponentTypes(): Promise<CostComponentType[]> {
    return this.costTypeRepo.find({ order: { costComponentTypeId: 'ASC' } });
  }

  async createCostComponentType(typeName?: string): Promise<CostComponentType> {
    if (!typeName || !typeName.trim()) {
      throw new BadRequestException('Cost component type name is required');
    }
    const cleanName = typeName.trim();
    let typeCode = cleanName.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').slice(0, 40);
    if (!typeCode || typeCode === '_') {
      typeCode = `TYPE_${Date.now()}`;
    }

    const existing = await this.costTypeRepo.findOne({
      where: [{ typeName: cleanName }, { typeCode }],
    });
    if (existing) {
      return existing;
    }

    const newType = this.costTypeRepo.create({
      typeName: cleanName,
      typeCode,
    });
    return this.costTypeRepo.save(newType);
  }

  private readonly defaultExchangeRates: Record<string, number> = {
    ETB: 1.0,
    USD: 125.0,
    EUR: 135.0,
  };

  private async ensureDefaultExchangeRates(): Promise<void> {
    for (const [currency, rateToEtb] of Object.entries(this.defaultExchangeRates)) {
      const existing = await this.exchangeRateRepo.findOne({ where: { currency } });
      if (!existing) {
        await this.exchangeRateRepo.save(this.exchangeRateRepo.create({ currency, rateToEtb }));
      } else if (currency === 'ETB' && Number(existing.rateToEtb) !== 1) {
        existing.rateToEtb = 1;
        await this.exchangeRateRepo.save(existing);
      }
    }
  }

  async getExchangeRates(): Promise<ExchangeRateDefault[]> {
    await this.ensureDefaultExchangeRates();
    return this.exchangeRateRepo.find({ order: { currency: 'ASC' } });
  }

  async updateExchangeRate(currency: string, rateToEtb: number): Promise<ExchangeRateDefault> {
    await this.ensureDefaultExchangeRates();
    const normalizedCurrency = currency.trim().toUpperCase();
    if (!/^[A-Z]{3,10}$/.test(normalizedCurrency)) {
      throw new BadRequestException('Currency code must be 3 to 10 uppercase letters');
    }
    if (normalizedCurrency === 'ETB' && Number(rateToEtb) !== 1) {
      throw new BadRequestException('Exchange rate for ETB must always be 1.0');
    }

    let rec = await this.exchangeRateRepo.findOne({ where: { currency: normalizedCurrency } });
    if (!rec) {
      rec = this.exchangeRateRepo.create({ currency: normalizedCurrency, rateToEtb: normalizedCurrency === 'ETB' ? 1 : rateToEtb });
    } else {
      rec.rateToEtb = normalizedCurrency === 'ETB' ? 1 : rateToEtb;
    }
    return this.exchangeRateRepo.save(rec);
  }

  async getDocuments(shipmentId: string): Promise<Attachment[]> {
    await this.findOne(shipmentId);
    return this.attachmentRepo.find({
      where: { entityType: 'shipment', entityId: shipmentId },
      order: { uploadedAt: 'DESC' },
    });
  }

  async addDocument(
    shipmentId: string,
    file: {
      fileName: string;
      filePath: string;
      contentType: string;
      sizeBytes: number;
      documentType?: string;
      userId?: number;
    },
  ): Promise<Attachment> {
    await this.findOne(shipmentId);
    const attachment = this.attachmentRepo.create({
      entityType: 'shipment',
      entityId: shipmentId,
      documentType: file.documentType,
      fileName: file.fileName,
      filePath: file.filePath,
      contentType: file.contentType,
      fileSizeBytes: String(file.sizeBytes),
      uploadedBy: file.userId,
    });
    return this.attachmentRepo.save(attachment);
  }

  async deleteDocument(shipmentId: string, docId: string): Promise<void> {
    await this.findOne(shipmentId);
    const attachment = await this.attachmentRepo.findOne({
      where: { attachmentId: docId, entityType: 'shipment', entityId: shipmentId },
    });
    if (!attachment) {
      throw new NotFoundException(`Shipment document #${docId} not found`);
    }
    await this.attachmentRepo.remove(attachment);
  }

  async getPipelineReport(filters?: {
    businessUnit?: string;
    supplier?: string;
    destination?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<any> {
    let shipments: Shipment[] = [];
    try {
      shipments = await this.shipmentRepo.find({
        relations: [
          'stageHistory',
          'costComponents',
          'lines',
          'lines.poLine',
          'lines.poLine.purchaseOrder',
          'lines.poLine.purchaseOrder.supplier',
          'bookings',
          'selectedForwarder',
        ],
        order: { createdAt: 'DESC' },
      });
    } catch {
      shipments = await this.shipmentRepo.find({
        relations: ['stageHistory', 'costComponents', 'lines'],
        order: { createdAt: 'DESC' },
      });
    }

    const requisitions: any[] =
      (await this.dataSource?.query?.(`
        SELECT requisition_id, requisition_number, business_unit_id, status, required_delivery_date, created_at
        FROM import_requisition ORDER BY created_at DESC
      `)) || [];

    const reqById = new Map<string, any>();
    for (const r of requisitions) {
      reqById.set(String(r.requisition_id), r);
    }

    const purchaseOrdersRaw: any[] =
      (await this.dataSource?.query?.(`
        SELECT po.po_id, po.po_number, po.status, po.po_date, po.expected_delivery_date,
               po.country_of_origin, po.port_of_discharge, po.requisition_id, s.supplier_name
        FROM purchase_order po JOIN supplier s ON s.supplier_id = po.supplier_id
        ORDER BY po.created_at DESC
      `)) || [];

    const purchaseOrders = purchaseOrdersRaw.map((po) => {
      const req = po.requisition_id ? reqById.get(String(po.requisition_id)) : undefined;
      return {
        ...po,
        business_unit_id: po.business_unit_id || req?.business_unit_id || 'Default Business Unit',
        destination: po.port_of_discharge || 'Addis Ababa / Modjo',
      };
    });

    const mappedShipments = shipments.map((s) => {
      const firstPo = s.lines?.[0]?.poLine?.purchaseOrder;
      const req = firstPo?.requisitionId ? reqById.get(String(firstPo.requisitionId)) : undefined;
      const booking = s.bookings?.[0];
      const destination = booking?.destinationPort || firstPo?.portOfDischarge || 'Addis Ababa / Modjo';
      const supplierName = firstPo?.supplier?.supplierName || '—';
      const businessUnit = req?.business_unit_id || 'Fleet & Commercial Vehicle Assembly';
      const totalVehicles = (s.lines || []).reduce((sum, l) => sum + Number(l.quantityShipped || 0), 0);

      return {
        shipmentId: s.shipmentId,
        shipmentNumber: s.shipmentNumber,
        currentStage: s.currentStage,
        billOfLadingNumber: s.billOfLadingNumber || null,
        expectedArrivalDate: s.expectedArrivalDate || null,
        actualArrivalDate: s.actualArrivalDate || null,
        createdAt: s.createdAt,
        poNumber: firstPo?.poNumber || null,
        poId: firstPo?.poId || null,
        supplierName,
        originCountry: firstPo?.countryOfOrigin || booking?.originPort || null,
        destination,
        businessUnit,
        forwarderName: s.selectedForwarder?.name || null,
        totalVehicles,
        linesCount: s.lines?.length || 0,
        costsCount: s.costComponents?.length || 0,
      };
    });

    const businessUnitsSet = new Set<string>();
    const suppliersSet = new Set<string>();
    const destinationsSet = new Set<string>();
    mappedShipments.forEach((s) => {
      if (s.businessUnit) businessUnitsSet.add(s.businessUnit);
      if (s.supplierName && s.supplierName !== '—') suppliersSet.add(s.supplierName);
      if (s.destination) destinationsSet.add(s.destination);
    });
    purchaseOrders.forEach((po) => {
      if (po.business_unit_id) businessUnitsSet.add(po.business_unit_id);
      if (po.supplier_name) suppliersSet.add(po.supplier_name);
      if (po.destination) destinationsSet.add(po.destination);
    });
    requisitions.forEach((r) => {
      if (r.business_unit_id) businessUnitsSet.add(r.business_unit_id);
    });

    const fBu = filters?.businessUnit?.trim().toLowerCase();
    const fSupplier = filters?.supplier?.trim().toLowerCase();
    const fDest = filters?.destination?.trim().toLowerCase();
    const fStatus = filters?.status?.trim().toUpperCase();
    const fStart = filters?.startDate?.trim();
    const fEnd = filters?.endDate?.trim();
    const fSearch = filters?.search?.trim().toLowerCase();

    const inDateRange = (dateVal?: any) => {
      if (!fStart && !fEnd) return true;
      if (!dateVal) return false;
      const d = String(dateVal).slice(0, 10);
      if (fStart && d < fStart) return false;
      if (fEnd && d > fEnd) return false;
      return true;
    };

    const filteredShipments = mappedShipments.filter((s) => {
      if (fBu && s.businessUnit.toLowerCase() !== fBu) return false;
      if (fSupplier && !s.supplierName.toLowerCase().includes(fSupplier)) return false;
      if (fDest && !s.destination.toLowerCase().includes(fDest)) return false;
      if (fStatus && s.currentStage !== fStatus) return false;
      const keyDate = s.expectedArrivalDate || s.actualArrivalDate || s.createdAt;
      if (!inDateRange(keyDate)) return false;
      if (fSearch) {
        const hay = `${s.shipmentNumber} ${s.billOfLadingNumber || ''} ${s.poNumber || ''} ${s.supplierName} ${s.destination} ${s.forwarderName || ''}`.toLowerCase();
        if (!hay.includes(fSearch)) return false;
      }
      return true;
    });

    const filteredPOs = purchaseOrders.filter((po) => {
      if (fBu && String(po.business_unit_id || '').toLowerCase() !== fBu) return false;
      if (fSupplier && !String(po.supplier_name || '').toLowerCase().includes(fSupplier)) return false;
      if (fDest && !String(po.destination || '').toLowerCase().includes(fDest)) return false;
      if (fStatus && !Object.values(ShipmentStage).includes(fStatus as ShipmentStage) && String(po.status || '').toUpperCase() !== fStatus) {
        return false;
      }
      if (!inDateRange(po.expected_delivery_date || po.po_date)) return false;
      if (fSearch) {
        const hay = `${po.po_number} ${po.supplier_name || ''} ${po.country_of_origin || ''} ${po.destination || ''}`.toLowerCase();
        if (!hay.includes(fSearch)) return false;
      }
      return true;
    });

    const filteredReqs = requisitions.filter((r) => {
      if (fBu && String(r.business_unit_id || '').toLowerCase() !== fBu) return false;
      if (fStatus && !Object.values(ShipmentStage).includes(fStatus as ShipmentStage) && String(r.status || '').toUpperCase() !== fStatus) {
        return false;
      }
      if (!inDateRange(r.required_delivery_date || r.created_at)) return false;
      if (fSearch) {
        const hay = `${r.requisition_number} ${r.business_unit_id || ''} ${r.status || ''}`.toLowerCase();
        if (!hay.includes(fSearch)) return false;
      }
      return true;
    });

    const stageCounts: Record<string, number> = {};
    for (const stage of Object.values(ShipmentStage)) {
      stageCounts[stage] = 0;
    }

    let totalActiveShipments = 0;
    let totalInlandTransit = 0;

    for (const s of filteredShipments) {
      stageCounts[s.currentStage] = (stageCounts[s.currentStage] || 0) + 1;
      if (s.currentStage !== ShipmentStage.RECEIVED) {
        totalActiveShipments++;
      }
      if (s.currentStage === ShipmentStage.IN_TRANSIT_INLAND) {
        totalInlandTransit++;
      }
    }

    return {
      totalShipments: filteredShipments.length,
      totalRequisitions: filteredReqs.length,
      totalPurchaseOrders: filteredPOs.length,
      totalActiveShipments,
      totalInlandTransit,
      stageBreakdown: stageCounts,
      shipments: filteredShipments,
      recentShipments: filteredShipments.slice(0, 20),
      requisitions: filteredReqs,
      purchaseOrders: filteredPOs,
      filterOptions: {
        businessUnits: Array.from(businessUnitsSet).sort(),
        suppliers: Array.from(suppliersSet).sort(),
        destinations: Array.from(destinationsSet).sort(),
        stages: Object.values(ShipmentStage),
      },
    };
  }

  private toCsvCell(val: unknown): string {
    if (val === null || val === undefined) return '';
    const str = val instanceof Date ? val.toISOString() : String(val);
    if (/[",\r\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private buildCsv(headers: string[], rows: unknown[][]): string {
    return [
      headers.map((h) => this.toCsvCell(h)).join(','),
      ...rows.map((r) => r.map((cell) => this.toCsvCell(cell)).join(',')),
    ].join('\r\n');
  }

  async exportPipelineReportCsv(filters?: {
    businessUnit?: string;
    supplier?: string;
    destination?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<{ filename: string; csv: string }> {
    const report = await this.getPipelineReport(filters);
    const headers = [
      'Shipment No',
      'Current Stage',
      'PO Number',
      'Supplier',
      'Business Unit',
      'Destination',
      'Forwarder',
      'Bill of Lading',
      'Total Vehicles',
      'Expected Arrival',
      'Actual Arrival',
      'Lines Count',
      'Costs Count',
    ];
    const rows = (report.shipments || []).map((s: any) => [
      s.shipmentNumber,
      s.currentStage,
      s.poNumber || '',
      s.supplierName || '',
      s.businessUnit || '',
      s.destination || '',
      s.forwarderName || '',
      s.billOfLadingNumber || '',
      s.totalVehicles ?? 0,
      s.expectedArrivalDate || '',
      s.actualArrivalDate || '',
      s.linesCount ?? 0,
      s.costsCount ?? 0,
    ]);
    return {
      filename: `import-pipeline-report-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: this.buildCsv(headers, rows),
    };
  }

  // =========================================================================
  // KMSICAMS-12 Part II: Phase 5 - Freight Forwarder Master & Logistics Booking
  // =========================================================================

  // Story IMP-23: Freight Forwarder Master Data
  async getFreightForwarders(activeOnly = true): Promise<FreightForwarder[]> {
    return this.forwarderRepo.find({
      where: activeOnly ? { isActive: true } : {},
      order: { name: 'ASC' },
    });
  }

  async createFreightForwarder(dto: CreateFreightForwarderDto, actor?: number): Promise<FreightForwarder> {
    if (!dto.name?.trim() || !dto.country?.trim()) throw new BadRequestException('Forwarder name and country required');
    return this.dataSource.transaction(async m=>{
      await m.query('SELECT pg_advisory_xact_lock(734510)');
      const repo=m.getRepository(FreightForwarder);
      const saved=await repo.save(repo.create({...dto,name:dto.name.trim(),country:dto.country.trim()}));
      await this.recordLogisticsHistory(m,null,'freight_forwarder',saved.freightForwarderId,actor,'Created',null,saved);
      return saved;
    });
  }

  async updateFreightForwarder(id: string, dto: UpdateFreightForwarderDto, actor?: number): Promise<FreightForwarder> {
    return this.dataSource.transaction(async m=>{
      await m.query('SELECT pg_advisory_xact_lock(734510)');
      const repo=m.getRepository(FreightForwarder);
      const forwarder=await repo.findOne({where:{freightForwarderId:id},lock:{mode:'pessimistic_write'}});
      if(!forwarder) throw new NotFoundException('Freight forwarder not found');
      const old={...forwarder};
      Object.assign(forwarder,dto);
      if(!forwarder.name?.trim()||!forwarder.country?.trim()) throw new BadRequestException('Forwarder name and country required');
      const saved=await repo.save(forwarder);
      await this.recordLogisticsHistory(m,null,'freight_forwarder',id,actor,'Updated',old,saved);
      return saved;
    });
  }

  async setShipmentSelectedForwarder(shipmentId: string, forwarderId: string): Promise<Shipment> {
    await this.dataSource.transaction(async m=>{
      await m.query('SELECT pg_advisory_xact_lock(734510)');
      await this.activeForwarder(forwarderId,m);
      const approved=await m.getRepository(ShipmentFreightQuotation).findOne({where:{shipmentId,freightForwarderId:forwarderId,selectionStatus:'SELECTED',approvalStatus:'APPROVED'}});
      if(!approved) throw new BadRequestException('Select and approve a quotation before assigning its forwarder');
      await m.update(Shipment,{shipmentId},{selectedForwarderId:forwarderId});
    });
    return this.findOne(shipmentId);
  }

  // Story IMP-24 & IMP-25: Freight Quotation Management, Selection & Approval
  async getShipmentQuotations(shipmentId: string): Promise<any[]> {
    const quotations = await this.quotationRepo.find({
      where: { shipmentId },
      relations: ['forwarder', 'creator', 'selector', 'approver'],
      order: { quotationDate: 'DESC' },
    });

    let historyRows: any[] = [];
    try {
      historyRows =
        (await this.dataSource?.query?.(
          `SELECT dh.*, u.full_name AS decided_by_name, u.email AS decided_by_email
           FROM freight_quotation_decision_history dh
           LEFT JOIN app_user u ON u.user_id = dh.decided_by
           WHERE dh.shipment_id = $1
           ORDER BY dh.decided_at DESC, dh.decision_history_id DESC`,
          [shipmentId],
        )) || [];
    } catch {
      historyRows = [];
    }

    return quotations.map((q) => ({
      ...q,
      decisionHistory: historyRows.filter((h) => String(h.quotation_id) === String(q.quotationId)),
    }));
  }

  async addShipmentQuotation(shipmentId: string, dto: CreateFreightQuotationDto): Promise<ShipmentFreightQuotation> {
    await this.findOne(shipmentId);
    const forwarder=await this.forwarderRepo.findOne({where:{freightForwarderId:dto.freightForwarderId}});
    if(!forwarder?.isActive) throw new BadRequestException('Select an active forwarder');
    if(dto.validUntil && dto.quotationDate && dto.validUntil<dto.quotationDate) throw new BadRequestException('Quotation validity cannot precede quotation date');
    const quotation = this.quotationRepo.create({
      shipmentId,
      freightForwarderId: dto.freightForwarderId,
      quotationReference: dto.quotationReference,
      quotationDate: dto.quotationDate || new Date().toISOString().split('T')[0],
      validUntil: dto.validUntil,
      freightAmount: dto.freightAmount,
      currency: dto.currency || 'USD',
      estimatedTransitDays: dto.estimatedTransitDays,
      destinationCharges: dto.destinationCharges || 0,
      additionalTerms: dto.additionalTerms,
      attachmentId: dto.attachmentId,
      selectionStatus: 'PENDING',
      approvalStatus: 'PENDING',
      createdBy: dto.userId,
    });
    const saved = await this.quotationRepo.save(quotation);
    await this.audit('shipment_freight_quotation', saved.quotationId, 'INSERT', dto.userId, undefined, { ...saved });
    return saved;
  }

  async selectShipmentQuotation(
    shipmentId: string,
    quotationId: string,
    dto: SelectFreightQuotationDto,
  ): Promise<ShipmentFreightQuotation> {
    return this.quotationDecision(shipmentId,quotationId,'SELECTED',dto.selectionReason,dto.userId);
  }

  async approveShipmentQuotation(
    shipmentId: string,
    quotationId: string,
    dto: ApproveFreightQuotationDto,
  ): Promise<ShipmentFreightQuotation> {
    return this.quotationDecision(shipmentId,quotationId,'APPROVED',dto.approvalNotes || 'Approved by authorized approver',dto.userId);
  }

  async rejectShipmentQuotation(
    shipmentId: string,
    quotationId: string,
    dto: RejectFreightQuotationDto,
  ): Promise<ShipmentFreightQuotation> {
    return this.quotationDecision(shipmentId,quotationId,'REJECTED',dto.rejectionReason,dto.userId);
  }

  // Story IMP-26: Shipment Booking and Vessel Tracking
  async getShipmentBookings(shipmentId: string): Promise<ShipmentBooking[]> {
    return this.bookingRepo.find({
      where: { shipmentId },
      relations: ['forwarder', 'creator'],
      order: { createdAt: 'DESC' },
    });
  }

  async createShipmentBooking(shipmentId: string, dto: CreateShipmentBookingDto): Promise<ShipmentBooking> {
    return this.saveLogisticsRecord('bookings',shipmentId,undefined,dto,dto.userId);
  }

  async updateShipmentBooking(bookingId: string, dto: Partial<CreateShipmentBookingDto>): Promise<ShipmentBooking> {
    return this.saveLogisticsRecord('bookings',undefined,bookingId,dto,dto.userId);
  }

  // Story IMP-27: Container Management
  async getShipmentContainers(shipmentId: string): Promise<ShipmentContainer[]> {
    return this.containerRepo.find({
      where: { shipmentId },
      order: { createdAt: 'DESC' },
    });
  }

  async addShipmentContainer(shipmentId: string, dto: CreateShipmentContainerDto, actor?: number): Promise<ShipmentContainer> {
    return this.saveLogisticsRecord('containers',shipmentId,undefined,dto,actor);
  }

  async updateShipmentContainer(containerId: string, dto: Partial<CreateShipmentContainerDto>, actor?: number): Promise<ShipmentContainer> {
    return this.saveLogisticsRecord('containers',undefined,containerId,dto,actor);
  }

  // Story IMP-28: Cargo Milestones
  async getShipmentMilestones(shipmentId: string): Promise<ShipmentMilestone[]> {
    let milestones = await this.milestoneRepo.find({
      where: { shipmentId },
      relations: ['completer'],
      order: { milestoneId: 'ASC' },
    });

    if (milestones.length === 0) {
      const defaultMilestones = [
        'PRODUCTION_COMPLETED',
        'CARGO_READY',
        'BOOKING_CONFIRMED',
        'CONTAINER_STUFFED',
        'CUSTOMS_EXPORT_CLEARED',
        'VESSEL_DEPARTED',
        'PORT_OF_DJIBOUTI_ARRIVED',
        'CUSTOMS_IMPORT_CLEARED',
        'INLAND_DISPATCHED',
        'WAREHOUSE_RECEIVED',
      ];
      const milestoneEntities = defaultMilestones.map((name) =>
        this.milestoneRepo.create({
          shipmentId,
          milestoneName: name,
          isCompleted: false,
        }),
      );
      milestones = await this.milestoneRepo.save(milestoneEntities);
    }

    return milestones;
  }

  async addShipmentMilestone(shipmentId: string, dto: CreateShipmentMilestoneDto): Promise<ShipmentMilestone> {
    return this.saveLogisticsRecord('milestones',shipmentId,undefined,dto,dto.userId);
  }

  async updateShipmentMilestone(
    milestoneId: string,
    isCompleted: boolean,
    notes?: string,
    userId?: number,
  ): Promise<ShipmentMilestone> {
    return this.saveLogisticsRecord('milestones',undefined,milestoneId,{isCompleted,notes,revisionReason:notes||'Update milestone completion'},userId);
  }

  // Story IMP-29: Shipment Insurance
  async getShipmentInsurances(shipmentId: string): Promise<ShipmentInsurance[]> {
    return this.insuranceRepo.find({
      where: { shipmentId },
      order: { createdAt: 'DESC' },
    });
  }

  async addShipmentInsurance(shipmentId: string, dto: CreateShipmentInsuranceDto, actor?: number): Promise<ShipmentInsurance> {
    return this.saveLogisticsRecord('insurance',shipmentId,undefined,dto,actor);
  }

  // Story IMP-30: Cargo Tracking & ECTN
  async getShipmentCargoTracking(shipmentId: string): Promise<ShipmentCargoTracking[]> {
    return this.cargoTrackingRepo.find({
      where: { shipmentId },
      order: { createdAt: 'DESC' },
    });
  }

  async addShipmentCargoTracking(shipmentId: string, dto: CreateCargoTrackingDto, actor?: number): Promise<ShipmentCargoTracking> {
    return this.saveLogisticsRecord('tracking',shipmentId,undefined,dto,actor);
  }

  async updateShipmentCargoTracking(trackingId: string, dto: Partial<CreateCargoTrackingDto>, actor?: number): Promise<ShipmentCargoTracking> {
    return this.saveLogisticsRecord('tracking',undefined,trackingId,dto,actor);
  }

  // =========================================================================
  // KMSICAMS-12 Part II: Phase 6 - Shipping Document Control and Verification
  // =========================================================================

  // Stories IMP-32 through IMP-37: Shipment Documents
  async getShipmentDocumentsList(shipmentId: string): Promise<ShipmentDocument[]> {
    let docs = await this.shipmentDocRepo.find({
      where: { shipmentId },
      relations: ['verifier', 'creator', 'purchaseOrder'],
      order: { createdAt: 'ASC' },
    });

    if (docs.length === 0) {
      const defaultDocTypes = [
        'COMMERCIAL_INVOICE',
        'PACKING_LIST',
        'BILL_OF_LADING',
        'CERTIFICATE_OF_ORIGIN',
        'PRE_SHIPMENT_INSPECTION_CERTIFICATE',
        'CUSTOMS_DECLARATION',
        'INSURANCE_CERTIFICATE',
        'ECTN_CERTIFICATE',
      ];
      const docEntities = defaultDocTypes.map((type) =>
        this.shipmentDocRepo.create({
          shipmentId,
          documentType: type,
          verificationStatus: 'PENDING',
          originalDocumentStatus: 'NOT_RECEIVED',
        }),
      );
      docs = await this.shipmentDocRepo.save(docEntities);
    }

    return docs;
  }

  async addShipmentDocument(shipmentId: string, dto: CreateShipmentDocumentDto): Promise<ShipmentDocument> {
    await this.findOne(shipmentId);
    if (dto.supersedesDocumentId) {
      const previous = await this.shipmentDocRepo.findOne({ where: { shipmentDocumentId: dto.supersedesDocumentId, shipmentId } });
      if (!previous) throw new BadRequestException('Superseded document does not belong to this shipment');
      dto.versionNumber = dto.versionNumber || previous.versionNumber + 1;
    }
    const doc = this.shipmentDocRepo.create({
      shipmentId,
      ...dto,
      verificationStatus: dto.verificationStatus || 'PENDING',
      originalDocumentStatus: dto.originalDocumentStatus || 'NOT_RECEIVED',
      createdBy: dto.userId,
    });
    const saved = await this.shipmentDocRepo.save(doc);
    await this.audit('shipment_document', saved.shipmentDocumentId, 'INSERT', dto.userId, undefined, { ...saved });
    return saved;
  }

  private async checkDocumentConsistency(doc: ShipmentDocument): Promise<string[]> {
    const issues: string[] = [];
    const shipment = await this.findOne(doc.shipmentId);
    const po = doc.poId ? await this.poRepo.findOne({ where: { poId: doc.poId }, relations: ['lettersOfCredit'] }) : undefined;
    if (doc.issueDate && doc.expiryDate && new Date(doc.issueDate) > new Date(doc.expiryDate)) {
      issues.push('Issue date is after expiry date');
    }
    if (doc.expiryDate && new Date(doc.expiryDate) < new Date(new Date().toISOString().split('T')[0])) {
      issues.push('Document is expired');
    }
    if (doc.documentType === 'BILL_OF_LADING' && shipment.billOfLadingNumber && doc.documentReference !== shipment.billOfLadingNumber) {
      issues.push(`Bill of Lading reference does not match shipment reference ${shipment.billOfLadingNumber}`);
    }
    if (doc.documentType === 'COMMERCIAL_INVOICE' && po?.proformaInvoiceNo && doc.documentReference && doc.documentReference !== po.proformaInvoiceNo) {
      issues.push(`Invoice reference does not match PO proforma invoice ${po.proformaInvoiceNo}`);
    }
    if (po?.lettersOfCredit?.length && !doc.documentReference) {
      issues.push('Document reference is required for a Letter of Credit transaction');
    }
    return issues;
  }

  async verifyShipmentDocument(docId: string, dto: VerifyShipmentDocumentDto): Promise<ShipmentDocument> {
    const doc = await this.shipmentDocRepo.findOne({ where: { shipmentDocumentId: docId } });
    if (!doc) {
      throw new NotFoundException(`Shipment document #${docId} not found`);
    }
    const oldValue = { ...doc };
    doc.verificationStatus = dto.status;
    doc.verifiedBy = dto.userId;
    doc.verifiedAt = new Date();
    if (dto.documentReference !== undefined) doc.documentReference = dto.documentReference;
    if (dto.issueDate !== undefined) doc.issueDate = dto.issueDate;
    if (dto.originalDocumentStatus !== undefined) doc.originalDocumentStatus = dto.originalDocumentStatus;
    if (dto.notes !== undefined) doc.verificationNotes = dto.notes;
    const issues = await this.checkDocumentConsistency(doc);
    doc.discrepancyDetails = issues.length ? { issues } : undefined;
    doc.discrepancyStatus = issues.length ? 'FLAGGED' : 'CLEAR';
    if (dto.status === 'VERIFIED' && issues.length > 0) {
      if (!dto.overrideReason?.trim()) {
        throw new BadRequestException(`Document consistency checks failed: ${issues.join('; ')}. Provide an authorized override reason to continue.`);
      }
      doc.discrepancyStatus = 'OVERRIDDEN';
      doc.overrideReason = dto.overrideReason.trim();
    }
    const saved = await this.shipmentDocRepo.save(doc);
    await this.audit('shipment_document', docId, 'UPDATE', dto.userId, oldValue, { ...saved });
    return saved;
  }

  async updateOriginalDocumentStatus(docId: string, dto: UpdateOriginalDocumentStatusDto): Promise<ShipmentDocument> {
    const doc = await this.shipmentDocRepo.findOne({ where: { shipmentDocumentId: docId } });
    if (!doc) {
      throw new NotFoundException(`Shipment document #${docId} not found`);
    }
    const oldValue = { ...doc };
    doc.originalDocumentStatus = dto.status;
    if (dto.releaseDate) doc.releaseDate = dto.releaseDate;
    if (dto.originalDispatchedAt) doc.originalDispatchedAt = new Date(dto.originalDispatchedAt);
    if (dto.originalReceivedAt) doc.originalReceivedAt = new Date(dto.originalReceivedAt);
    if (dto.electronicReleaseAt) doc.electronicReleaseAt = new Date(dto.electronicReleaseAt);
    if (dto.releasePaymentStatus) doc.releasePaymentStatus = dto.releasePaymentStatus;
    const saved = await this.shipmentDocRepo.save(doc);
    await this.audit('shipment_document', docId, 'UPDATE', dto.userId, oldValue, { ...saved });
    return saved;
  }

  async getDocumentRequirements(): Promise<any[]> {
    return this.dataSource.query(`SELECT * FROM shipment_document_requirement ORDER BY process_stage, document_type`);
  }

  async getImportWorkflowConfiguration(): Promise<any[]> {
    return this.dataSource.query(`SELECT * FROM import_workflow_transition ORDER BY workflow_type, from_status, to_status`);
  }

  async saveDocumentRequirement(body: any): Promise<any> {
    const rows = await this.dataSource.query(
      `INSERT INTO shipment_document_requirement
       (destination_country, shipment_type, process_stage, document_type, is_required, requires_verification, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (destination_country, shipment_type, process_stage, document_type)
       DO UPDATE SET is_required=EXCLUDED.is_required, requires_verification=EXCLUDED.requires_verification, is_active=EXCLUDED.is_active
       RETURNING *`,
      [body.destinationCountry || null, body.shipmentType || null, body.processStage, body.documentType, body.isRequired !== false, body.requiresVerification !== false, body.isActive !== false],
    );
    return rows[0];
  }

  // Story IMP-32: Shipment Logistics Cockpit Overview
  async getShipmentLogisticsOverview(shipmentId: string): Promise<any> {
    const shipment = await this.findOne(shipmentId);
    const [quotations, bookings, containers, milestones, insurances, tracking, docs] = await Promise.all([
      this.getShipmentQuotations(shipmentId),
      this.getShipmentBookings(shipmentId),
      this.getShipmentContainers(shipmentId),
      this.getShipmentMilestones(shipmentId),
      this.getShipmentInsurances(shipmentId),
      this.getShipmentCargoTracking(shipmentId),
      this.getShipmentDocumentsList(shipmentId),
    ]);

    const activeBooking = bookings.find((b) => b.bookingStatus === 'CONFIRMED') || null;
    const selectedQuotation = quotations.find((q) => q.selectionStatus === 'SELECTED') || null;
    const todayStr = new Date().toISOString().slice(0, 10);

    // Calculate action items / alerts
    const alerts: string[] = [];
    if (!selectedQuotation && quotations.length === 0) {
      alerts.push('No freight quotation recorded yet.');
    } else if (!selectedQuotation) {
      alerts.push('Freight quotations recorded but none selected yet.');
    } else if (selectedQuotation.approvalStatus !== 'APPROVED') {
      alerts.push('Selected freight quotation is pending executive approval.');
    }

    if (!activeBooking) {
      alerts.push('No confirmed ocean/air vessel booking registered.');
    }

    if (containers.length === 0) {
      alerts.push('No container allocations recorded for this shipment.');
    }

    const unverifiedDocs = docs.filter((d) => {
      const isExpired = Boolean(d.expiryDate && String(d.expiryDate).slice(0, 10) < todayStr) || d.verificationStatus === 'EXPIRED';
      return d.verificationStatus === 'PENDING' || d.verificationStatus === 'REJECTED' || isExpired;
    });
    if (unverifiedDocs.length > 0) {
      alerts.push(`${unverifiedDocs.length} shipping documents awaiting verification, rejected, or expired.`);
    }

    return {
      shipment: {
        shipmentId: shipment.shipmentId,
        shipmentNumber: shipment.shipmentNumber,
        currentStage: shipment.currentStage,
        expectedArrivalDate: shipment.expectedArrivalDate,
        billOfLadingNumber: shipment.billOfLadingNumber,
        selectedForwarder: shipment.selectedForwarder,
      },
      quotations,
      bookings,
      selectedQuotation,
      activeBooking,
      containersCount: containers.length,
      containers,
      milestones,
      insurances,
      cargoTracking: tracking,
      documentsCount: docs.length,
      documents: docs,
      alerts,
      ...await this.getLogisticsSupplement(shipment),
    };
  }

  // =========================================================================
  // KMSICAMS-12 Part II: Phase 7 - Notifications & Overdue Alerts
  // =========================================================================

  async getImportNotifications(params?: { unreadOnly?: boolean; role?: string; userId?: number }): Promise<ImportNotification[]> {
    const qb = this.notificationRepo.createQueryBuilder('n').orderBy('n.createdAt', 'DESC').take(50);
    if (params?.unreadOnly) {
      qb.andWhere('n.isRead = false');
    }
    if (params?.userId) {
      qb.andWhere(`(n.recipientUserId = :userId OR (n.recipientUserId IS NULL AND (n.recipientRole IS NULL OR n.recipientRole=(SELECT r.role_name FROM app_user u JOIN role r ON r.role_id=u.role_id WHERE u.user_id=:userId))) OR EXISTS(SELECT 1 FROM app_user u JOIN role r ON r.role_id=u.role_id WHERE u.user_id=:userId AND r.role_name='ADMIN'))`, { userId: params.userId });
    }
    return qb.getMany();
  }

  async markNotificationRead(id: string): Promise<ImportNotification> {
    const n = await this.notificationRepo.findOne({ where: { notificationId: id } });
    if (!n) throw new NotFoundException('Notification not found');
    n.isRead = true;
    n.readAt = new Date();
    return this.notificationRepo.save(n);
  }

  async escalateNotification(id: string, recipientRole: string, userId?: number): Promise<ImportNotification> {
    const notification = await this.notificationRepo.findOne({ where: { notificationId: id } });
    if (!notification) throw new NotFoundException('Notification not found');
    notification.escalationLevel = Number(notification.escalationLevel || 0) + 1;
    notification.recipientRole = recipientRole;
    const saved = await this.notificationRepo.save(notification);
    await this.dataSource.query(
      `INSERT INTO import_notification_escalation
       (notification_id, escalation_level, recipient_role, recipient_user_id, delivery_status)
       VALUES ($1,$2,$3,$4,'DELIVERED')`,
      [id, saved.escalationLevel, recipientRole, userId || null],
    );
    return saved;
  }

  // Story IMP-40: Automated scan of upcoming deadlines and alerts
  async generateAutomatedImportAlerts(): Promise<number> {
    let createdCount = 0;
    const now = new Date();
    const upcomingDays = 7;
    const futureLimit = new Date(now.getTime() + upcomingDays * 24 * 60 * 60 * 1000);

    const notify = async (data: Partial<ImportNotification> & { eventType: string; entityType: string; entityId: string; title: string; message: string; deduplicationKey: string }) => {
      const existing = await this.notificationRepo.findOne({ where: { deduplicationKey: data.deduplicationKey } });
      if (existing) return;
      try { await this.notificationRepo.save(this.notificationRepo.create({
        severity: 'WARNING', deliveryChannel: 'IN_APP', deliveryStatus: 'DELIVERED', deliveredAt: new Date(), escalationLevel: 0, ...data,
      }));
      createdCount++;
      } catch (error) { if (error?.code !== '23505') throw error; }
    };

    createdCount += await this.scanContainerDeadlines(now);

    const milestones = await this.milestoneRepo.find({ relations: ['shipment'] });
    for (const m of milestones) {
      if (!m.isCompleted && m.plannedDate && new Date(m.plannedDate) < now) {
        await notify({ eventType: 'SHIPMENT_MILESTONE_OVERDUE', recipientRole: 'LOGISTICS_OFFICER', entityType: 'SHIPMENT_MILESTONE', entityId: m.milestoneId, title: `Shipment milestone overdue: ${m.milestoneName}`, message: `${m.shipment?.shipmentNumber || 'Shipment'} milestone was due on ${m.plannedDate}.`, severity: 'CRITICAL', deduplicationKey: `MILESTONE_OVERDUE:${m.milestoneId}:${m.plannedDate}` });
      }
    }

    const tracking = await this.cargoTrackingRepo.find({ relations: ['shipment'] });
    for (const t of tracking) {
      if (t.status !== 'APPROVED' && t.deadlineDate && new Date(t.deadlineDate) <= futureLimit) {
        await notify({ eventType: 'SHIPPING_DOCUMENT_DEADLINE', recipientRole: 'LOGISTICS_OFFICER', entityType: 'CARGO_TRACKING', entityId: t.trackingId, title: `${t.documentName} deadline approaching`, message: `${t.shipment?.shipmentNumber || 'Shipment'} requirement is due on ${t.deadlineDate}.`, deduplicationKey: `TRACKING_DEADLINE:${t.trackingId}:${t.deadlineDate}` });
      }
    }

    const policy = await loadImportPolicy(this.dataSource);
    const today = businessDate(now, policy.timezone);
    const sevenDays = dateAfter(today,7);
    const pos = await this.poRepo.find({ relations: ['paymentSchedules', 'lettersOfCredit'] });
    const notifyDeadline = async (data: Parameters<typeof notify>[0], deadline: string, reminderDate: string) => {
      const recipients = await this.dataSource.query(
        'SELECT u.user_id FROM app_user u JOIN role r ON r.role_id=u.role_id WHERE u.is_active=TRUE AND r.role_name=$1',
        [data.recipientRole],
      );
      for (const recipient of recipients.length ? recipients : [{ user_id: null }]) {
        await notify({ ...data, deadlineDate: deadline, reminderDate,
          recipientUserId: recipient.user_id,
          deliveryStatus: recipient.user_id ? 'DELIVERED' : 'FAILED',
          deliveredAt: recipient.user_id ? now : null,
          message: `${data.message}${recipient.user_id ? '' : ' No active recipient in configured role.'}`,
          deduplicationKey: `${data.deduplicationKey}:${recipient.user_id || 'unassigned'}`,
        });
      }
    };
    const deadlineAlert = async (deadline: string, type: string, role: string, entityType: string, entityId: string, title: string) => {
      if (!deadline || deadline > sevenDays) return;
      const overdue = deadline < today;
      const reminder = new Date(`${deadline}T12:00:00Z`);
      reminder.setUTCDate(reminder.getUTCDate() - 7);
      await notifyDeadline({eventType:`${type}_${overdue?'OVERDUE':'UPCOMING'}`,recipientRole:role,entityType,entityId,title:`${title}: ${overdue?'overdue':'due soon'}`,message:`Deadline: ${deadline} (${policy.timezone}).`,severity:overdue?'CRITICAL':'WARNING',deduplicationKey:`${type}:${entityId}:${deadline}:${overdue}:${role}`}, deadline, overdue ? dateAfter(deadline,1) : reminder.toISOString().slice(0,10));
      if (overdue && dateAfter(deadline,policy.escalationDays)<=today) {
        await notifyDeadline({eventType:`${type}_ESCALATION`,recipientRole:policy.escalationRole,entityType,entityId,title:`Escalation: ${title}`,message:`Deadline ${deadline} has exceeded the configured escalation delay.`,severity:'CRITICAL',escalationLevel:1,deduplicationKey:`${type}:${entityId}:${deadline}:escalation:${policy.escalationRole}`}, deadline, dateAfter(deadline,Math.max(1,policy.escalationDays)));
      }
    };
    for (const po of pos) {
      if (po.status === 'CANCELLED' || po.status === 'DRAFT') continue;
      for (const schedule of po.paymentSchedules || []) {
        if (!['PAID','CANCELLED'].includes(schedule.status) && schedule.dueDate) await deadlineAlert(schedule.dueDate,'TT_PAYMENT',policy.recipients.payment,'PO_PAYMENT_SCHEDULE',schedule.paymentScheduleId,`${po.poNumber}: ${schedule.milestoneName}`);
      }
      for (const lc of po.lettersOfCredit || []) {
        if (!['ISSUED','AMENDED','EXPIRED'].includes(lc.status)) continue;
        await deadlineAlert(lc.expiryDate,'LC_EXPIRY',policy.recipients.lcExpiry,'PO_LETTER_OF_CREDIT',lc.lcId,`${po.poNumber}: L/C expiry`);
        if (lc.latestShipmentDate) await deadlineAlert(lc.latestShipmentDate,'LC_SHIPMENT',policy.recipients.lcShipment,'PO_LETTER_OF_CREDIT',lc.lcId,`${po.poNumber}: L/C shipment`);
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const docs = (await this.shipmentDocRepo.find({ relations: ['shipment'] })) || [];
    for (const doc of docs) {
      const isDateExpired = Boolean(doc.expiryDate && String(doc.expiryDate).slice(0, 10) < todayStr);
      const effectiveStatus = isDateExpired || doc.verificationStatus === 'EXPIRED' ? 'EXPIRED' : doc.verificationStatus;
      if (effectiveStatus !== 'VERIFIED') {
        await notify({
          eventType:
            effectiveStatus === 'EXPIRED'
              ? 'DOCUMENT_EXPIRED'
              : effectiveStatus === 'REJECTED'
                ? 'DOCUMENT_REJECTED'
                : 'MISSING_OR_UNVERIFIED_DOCUMENT',
          recipientRole: 'LOGISTICS_OFFICER',
          entityType: 'SHIPMENT_DOCUMENT',
          entityId: doc.shipmentDocumentId,
          title: `${doc.documentType} ${effectiveStatus.toLowerCase()}`,
          message:
            effectiveStatus === 'EXPIRED'
              ? `${doc.shipment?.shipmentNumber || 'Shipment'} document expired on ${doc.expiryDate || 'N/A'}.`
              : `${doc.shipment?.shipmentNumber || 'Shipment'} requires document action.`,
          severity: effectiveStatus === 'EXPIRED' || effectiveStatus === 'REJECTED' ? 'CRITICAL' : 'WARNING',
          deduplicationKey: `DOCUMENT:${doc.shipmentDocumentId}:${effectiveStatus}:${doc.expiryDate || ''}`,
        });
      }
    }

    try {
      const docsReport = await this.getDocumentCompletenessReport();
      for (const entry of docsReport.documents || []) {
        if (entry.isMissing) {
          await notify({
            eventType: 'REQUIRED_DOCUMENT_MISSING',
            recipientRole: 'LOGISTICS_OFFICER',
            entityType: 'SHIPMENT',
            entityId: String(entry.shipmentId),
            title: `Missing required ${entry.documentType} for ${entry.shipmentNumber}`,
            message: `Shipment ${entry.shipmentNumber} is missing required document ${entry.documentType} (${entry.requiredAtStage || 'IMPORT'}).`,
            severity: 'WARNING',
            deduplicationKey: `DOC_MISSING:${entry.shipmentId}:${entry.documentType}`,
          });
        }
      }
    } catch {
      // Safe fallback if requirement tables are unavailable in isolated unit test mocks
    }

    const delayedShipments = await this.shipmentRepo.find();
    for (const shipment of delayedShipments) {
      if (shipment.currentStage !== ShipmentStage.RECEIVED && shipment.expectedArrivalDate && new Date(shipment.expectedArrivalDate) < now) {
        await notify({ eventType: 'SHIPMENT_DELAYED', recipientRole: 'MANAGEMENT', entityType: 'SHIPMENT', entityId: shipment.shipmentId, title: `Shipment ${shipment.shipmentNumber} delayed`, message: `Expected arrival was ${shipment.expectedArrivalDate}; current stage is ${shipment.currentStage}.`, severity: 'CRITICAL', deduplicationKey: `SHIPMENT_DELAYED:${shipment.shipmentId}:${shipment.expectedArrivalDate}` });
      }
    }

    return createdCount;
  }

  // =========================================================================
  // KMSICAMS-12 Part II: Phase 8 - Reporting & Reconciliation
  // =========================================================================

  // Story IMP-45: Logistics and Shipment Status Report
  async getShipmentLogisticsReport(): Promise<any> {
    const shipments = await this.shipmentRepo.find({
      relations: ['selectedForwarder', 'bookings', 'containers', 'milestones', 'documents', 'insurances'],
      order: { createdAt: 'DESC' },
    });

    return shipments.map((s) => {
      const activeBooking = s.bookings?.find((b) => b.bookingStatus === 'CONFIRMED') || s.bookings?.[0];
      const completedMilestones = s.milestones?.filter((m) => m.isCompleted).length || 0;
      const totalMilestones = s.milestones?.length || 0;
      const verifiedDocs = s.documents?.filter((d) => d.verificationStatus === 'VERIFIED').length || 0;
      const totalDocs = s.documents?.length || 0;
      const primaryInsurance = (s as any).insurances?.[0];
      const overdueMilestones = s.milestones?.filter((m) => !m.isCompleted && m.plannedDate && new Date(m.plannedDate) < new Date()).length || 0;
      const containerDeadlines = s.containers?.filter((c) => c.containerStatus !== 'RETURNED' && c.emptyReturnDueDate).map((c) => ({ containerNumber: c.containerNumber, dueDate: c.emptyReturnDueDate, overdue: new Date(c.emptyReturnDueDate!) < new Date() })) || [];
      const isDelayed = s.currentStage !== ShipmentStage.RECEIVED && Boolean(s.expectedArrivalDate && new Date(s.expectedArrivalDate) < new Date());

      return {
        shipmentId: s.shipmentId,
        shipmentNumber: s.shipmentNumber,
        currentStage: s.currentStage,
        forwarderName: s.selectedForwarder?.name || 'Unassigned',
        selectedForwarderName: s.selectedForwarder?.name || null,
        vesselName: activeBooking?.vesselName || null,
        voyageNumber: activeBooking?.voyageNumber || '—',
        bookingReference: activeBooking?.bookingReference || null,
        originPort: activeBooking?.originPort || '—',
        destinationPort: activeBooking?.destinationPort || '—',
        containersCount: s.containers?.length || 0,
        completedMilestonesCount: completedMilestones,
        totalMilestonesCount: totalMilestones,
        milestonesProgress: `${completedMilestones}/${totalMilestones}`,
        verifiedDocsCount: verifiedDocs,
        totalDocsCount: totalDocs,
        documentsVerified: `${verifiedDocs}/${totalDocs}`,
        hasInsurance: Boolean(primaryInsurance),
        insurancePolicyNumber: primaryInsurance?.policyNumber || null,
        expectedArrivalDate: s.expectedArrivalDate,
        actualArrivalDate: s.actualArrivalDate,
        isDelayed,
        overdueMilestones,
        containerDeadlines,
        outstandingActions: [
          ...(s.selectedForwarder ? [] : ['SELECT_FORWARDER']),
          ...(activeBooking ? [] : ['CONFIRM_BOOKING']),
          ...(overdueMilestones ? ['COMPLETE_OVERDUE_MILESTONES'] : []),
          ...(verifiedDocs < totalDocs ? ['VERIFY_DOCUMENTS'] : []),
        ],
      };
    });
  }

  private static readonly STAGE_ORDER: ShipmentStage[] = [
    ShipmentStage.ORDERED,
    ShipmentStage.SHIPPED,
    ShipmentStage.AT_DJIBOUTI_PORT,
    ShipmentStage.ETHIOPIAN_CUSTOMS_CLEARANCE,
    ShipmentStage.IN_TRANSIT_INLAND,
    ShipmentStage.RECEIVED,
  ];

  private async getActiveCompanyCountry(): Promise<string | null> {
    try {
      const rows = await this.dataSource?.query?.(
        `SELECT country FROM company_profile WHERE is_active = TRUE ORDER BY is_default DESC, profile_id ASC LIMIT 1`,
      );
      const raw = rows?.[0]?.country;
      return raw ? String(raw).trim() : null;
    } catch {
      return null;
    }
  }

  private async resolveShipmentDestinationCountry(
    shipment: Shipment,
    cachedCompanyCountry?: string | null,
  ): Promise<string | null> {
    const firstPo = shipment.lines?.[0]?.poLine?.purchaseOrder;
    const explicit =
      firstPo?.companySnapshot?.country ||
      firstPo?.companyProfile?.country ||
      null;
    if (explicit) return String(explicit).trim();
    if (cachedCompanyCountry !== undefined) return cachedCompanyCountry;
    return this.getActiveCompanyCountry();
  }

  private isRequirementApplicableToShipment(
    req: {
      destination_country?: string | null;
      shipment_type?: string | null;
      process_stage?: string | null;
    },
    ctx: {
      currentStage: ShipmentStage;
      destinationCountry: string | null;
      shipmentType: string | null;
    },
  ): boolean {
    const currentStageIdx = ShipmentsService.STAGE_ORDER.indexOf(ctx.currentStage);
    const reqStageIdx = ShipmentsService.STAGE_ORDER.indexOf(req.process_stage as ShipmentStage);
    if (currentStageIdx === -1 || reqStageIdx === -1 || reqStageIdx > currentStageIdx) {
      return false;
    }
    if (req.destination_country) {
      if (
        !ctx.destinationCountry ||
        String(req.destination_country).trim().toLowerCase() !==
          String(ctx.destinationCountry).trim().toLowerCase()
      ) {
        return false;
      }
    }
    if (req.shipment_type) {
      if (
        !ctx.shipmentType ||
        String(req.shipment_type).trim().toUpperCase() !==
          String(ctx.shipmentType).trim().toUpperCase()
      ) {
        return false;
      }
    }
    return true;
  }

  // Story IMP-46: Document Completeness Report
  async getDocumentCompletenessReport(filters?: {
    shipmentId?: string;
    status?: string;
    documentType?: string;
    search?: string;
  }): Promise<any> {
    const todayStr = new Date().toISOString().slice(0, 10);
    const docs =
      (await this.shipmentDocRepo.find({
        relations: ['shipment', 'purchaseOrder', 'verifier'],
        order: { createdAt: 'DESC' },
      })) || [];

    let shipments: Shipment[] = [];
    try {
      shipments =
        (await this.shipmentRepo.find({
          relations: [
            'lines',
            'lines.poLine',
            'lines.poLine.purchaseOrder',
            'lines.poLine.purchaseOrder.companyProfile',
            'bookings',
          ],
          order: { createdAt: 'DESC' },
        })) || [];
    } catch {
      shipments = [];
    }

    let requirements: any[] = [];
    try {
      requirements =
        (await this.dataSource?.query?.(`
          SELECT requirement_id, destination_country, shipment_type, process_stage, document_type, is_required, requires_verification
          FROM shipment_document_requirement
          WHERE is_required = TRUE AND is_active = TRUE
          ORDER BY process_stage, document_type
        `)) || [];
    } catch {
      requirements = [];
    }

    const needsCompanyCountryLookup = requirements.some((r) => Boolean(r.destination_country));
    const activeCompanyCountry = needsCompanyCountryLookup
      ? await this.getActiveCompanyCountry()
      : null;

    let uploadedAttachments: Attachment[] = [];
    try {
      uploadedAttachments =
        (await this.attachmentRepo?.find?.({
          where: { entityType: 'shipment' },
        })) || [];
    } catch {
      uploadedAttachments = [];
    }

    const applicableReqMapByShipmentId = new Map<string, Map<string, any>>();
    for (const s of shipments) {
      const firstPo = s.lines?.[0]?.poLine?.purchaseOrder;
      const shipmentType = firstPo?.modeOfShipment || null;
      const destinationCountry = needsCompanyCountryLookup
        ? await this.resolveShipmentDestinationCountry(s, activeCompanyCountry)
        : null;

      const dedupByDocType = new Map<string, any>();
      for (const req of requirements) {
        if (
          !this.isRequirementApplicableToShipment(req, {
            currentStage: s.currentStage,
            destinationCountry,
            shipmentType,
          })
        ) {
          continue;
        }
        if (!dedupByDocType.has(req.document_type)) {
          dedupByDocType.set(req.document_type, req);
        }
      }
      applicableReqMapByShipmentId.set(String(s.shipmentId), dedupByDocType);
    }

    const entries: any[] = [];
    const seenDocKeys = new Set<string>();

    for (const d of docs) {
      const key = `${d.shipmentId}:${d.documentType}`;

      const isDateExpired = Boolean(d.expiryDate && String(d.expiryDate).slice(0, 10) < todayStr);
      const isExpired = isDateExpired || d.verificationStatus === 'EXPIRED';
      const hasAttachment = Boolean(
        d.attachmentId ||
          uploadedAttachments.some(
            (a) => String(a.entityId) === String(d.shipmentId) && a.documentType === d.documentType && a.filePath,
          ),
      );
      const hasEvidence = Boolean(
        hasAttachment ||
          (d.documentReference && d.documentReference !== '—') ||
          d.receivedDate ||
          ['VERIFIED', 'REJECTED', 'EXPIRED'].includes(d.verificationStatus),
      );

      const applicableReq = applicableReqMapByShipmentId
        .get(String(d.shipmentId))
        ?.get(d.documentType);

      // Auto-seeded checklist placeholders without uploaded evidence or stage/country applicability
      // should not produce false MISSING counts or alerts ahead of their required stage.
      if (!hasEvidence && !applicableReq) {
        continue;
      }

      seenDocKeys.add(key);

      let effectiveStatus: string = d.verificationStatus || 'PENDING';
      if (!hasEvidence) {
        effectiveStatus = 'MISSING';
      } else if (isExpired) {
        effectiveStatus = 'EXPIRED';
      }

      entries.push({
        shipmentDocumentId: d.shipmentDocumentId,
        shipmentId: d.shipmentId,
        shipmentNumber: d.shipment?.shipmentNumber,
        poNumber: d.purchaseOrder?.poNumber || '—',
        documentType: d.documentType,
        requiredAtStage: applicableReq?.process_stage || null,
        documentReference: d.documentReference || '—',
        verificationStatus: effectiveStatus,
        storedVerificationStatus: d.verificationStatus,
        originalStatus: d.originalDocumentStatus,
        originalDocumentStatus: d.originalDocumentStatus,
        issueDate: d.issueDate,
        expiryDate: d.expiryDate,
        isExpired,
        isMissing: effectiveStatus === 'MISSING',
        verifiedBy: d.verifier?.fullName || '—',
        verifiedByEmail: d.verifier?.email || d.verifier?.fullName || '—',
        verifiedAt: d.verifiedAt,
      });
    }

    for (const s of shipments) {
      const firstPo = s.lines?.[0]?.poLine?.purchaseOrder;
      const dedupByDocType = applicableReqMapByShipmentId.get(String(s.shipmentId)) || new Map<string, any>();

      for (const [docType, req] of dedupByDocType.entries()) {
        const key = `${s.shipmentId}:${docType}`;
        if (seenDocKeys.has(key)) continue;

        const fallbackAttachment = uploadedAttachments.find(
          (a) => String(a.entityId) === String(s.shipmentId) && a.documentType === docType && a.filePath,
        );

        if (fallbackAttachment) {
          entries.push({
            shipmentDocumentId: `ATT-${fallbackAttachment.attachmentId}`,
            shipmentId: s.shipmentId,
            shipmentNumber: s.shipmentNumber,
            poNumber: firstPo?.poNumber || '—',
            documentType: docType,
            requiredAtStage: req.process_stage,
            documentReference: fallbackAttachment.fileName || 'Uploaded Attachment',
            verificationStatus: 'PENDING',
            storedVerificationStatus: 'PENDING',
            originalStatus: 'NOT_RECEIVED',
            originalDocumentStatus: 'NOT_RECEIVED',
            issueDate: null,
            expiryDate: null,
            isExpired: false,
            isMissing: false,
            verifiedBy: '—',
            verifiedByEmail: '—',
            verifiedAt: null,
          });
        } else {
          entries.push({
            shipmentDocumentId: `MISSING-${s.shipmentId}-${docType}`,
            shipmentId: s.shipmentId,
            shipmentNumber: s.shipmentNumber,
            poNumber: firstPo?.poNumber || '—',
            documentType: docType,
            requiredAtStage: req.process_stage,
            documentReference: '—',
            verificationStatus: 'MISSING',
            storedVerificationStatus: 'MISSING',
            originalStatus: 'NOT_RECEIVED',
            originalDocumentStatus: 'NOT_RECEIVED',
            issueDate: null,
            expiryDate: null,
            isExpired: false,
            isMissing: true,
            verifiedBy: '—',
            verifiedByEmail: '—',
            verifiedAt: null,
          });
        }
      }
    }

    const fShipmentId = filters?.shipmentId?.trim();
    const fStatus = filters?.status?.trim().toUpperCase();
    const fDocType = filters?.documentType?.trim().toUpperCase();
    const fSearch = filters?.search?.trim().toLowerCase();

    const filtered = entries.filter((item) => {
      if (fShipmentId && String(item.shipmentId) !== fShipmentId) return false;
      if (fStatus && item.verificationStatus !== fStatus) return false;
      if (fDocType && item.documentType !== fDocType) return false;
      if (fSearch) {
        const hay = `${item.shipmentNumber || ''} ${item.poNumber || ''} ${item.documentType || ''} ${item.documentReference || ''} ${item.verificationStatus || ''}`.toLowerCase();
        if (!hay.includes(fSearch)) return false;
      }
      return true;
    });

    const statusCounts: Record<string, number> = {
      MISSING: 0,
      PENDING: 0,
      VERIFIED: 0,
      REJECTED: 0,
      EXPIRED: 0,
    };

    for (const d of filtered) {
      statusCounts[d.verificationStatus] = (statusCounts[d.verificationStatus] || 0) + 1;
    }

    return {
      totalDocuments: filtered.length,
      uploadedDocumentsCount: filtered.filter((d) => !d.isMissing).length,
      missingCount: statusCounts.MISSING || 0,
      expiredCount: statusCounts.EXPIRED || 0,
      unverifiedCount:
        (statusCounts.MISSING || 0) +
        (statusCounts.PENDING || 0) +
        (statusCounts.REJECTED || 0) +
        (statusCounts.EXPIRED || 0),
      statusCounts,
      documents: filtered,
    };
  }

  async exportDocumentCompletenessCsv(filters?: {
    shipmentId?: string;
    status?: string;
    documentType?: string;
    search?: string;
  }): Promise<{ filename: string; csv: string }> {
    const report = await this.getDocumentCompletenessReport(filters);
    const headers = [
      'Shipment No',
      'PO Number',
      'Document Type',
      'Required Stage',
      'Document Reference',
      'Verification Status',
      'Original Status',
      'Issue Date',
      'Expiry Date',
      'Expired Flag',
      'Missing Flag',
      'Verified By',
      'Verified At',
    ];
    const rows = (report.documents || []).map((d: any) => [
      d.shipmentNumber || '',
      d.poNumber || '',
      d.documentType || '',
      d.requiredAtStage || '',
      d.documentReference || '',
      d.verificationStatus || '',
      d.originalDocumentStatus || '',
      d.issueDate || '',
      d.expiryDate || '',
      d.isExpired ? 'YES' : 'NO',
      d.isMissing ? 'YES' : 'NO',
      d.verifiedBy || '',
      d.verifiedAt || '',
    ]);
    return {
      filename: `document-completeness-report-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: this.buildCsv(headers, rows),
    };
  }

  async exportShipmentLogisticsCsv(): Promise<{ filename: string; csv: string }> {
    const rowsData = await this.getShipmentLogisticsReport();
    const headers = [
      'Shipment No',
      'Current Stage',
      'Forwarder',
      'Booking Ref',
      'Vessel',
      'Voyage',
      'Origin Port',
      'Destination Port',
      'Containers',
      'Milestones Progress',
      'Documents Verified',
      'Insurance Policy',
      'Expected Arrival',
      'Actual Arrival',
      'Delayed',
      'Outstanding Actions',
    ];
    const rows = rowsData.map((r: any) => [
      r.shipmentNumber,
      r.currentStage,
      r.forwarderName || '',
      r.bookingReference || '',
      r.vesselName || '',
      r.voyageNumber || '',
      r.originPort || '',
      r.destinationPort || '',
      r.containersCount ?? 0,
      r.milestonesProgress || '',
      r.documentsVerified || '',
      r.insurancePolicyNumber || '',
      r.expectedArrivalDate || '',
      r.actualArrivalDate || '',
      r.isDelayed ? 'YES' : 'NO',
      (r.outstandingActions || []).join('; '),
    ]);
    return {
      filename: `shipment-logistics-report-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: this.buildCsv(headers, rows),
    };
  }

  async exportImportReconciliationCsv(): Promise<{ filename: string; csv: string }> {
    const rowsData = await this.getImportReconciliationReport();
    const headers = [
      'PO Number',
      'PO Date',
      'Supplier',
      'Item Code',
      'Item Name',
      'Currency',
      'Ordered Qty',
      'Shipped Qty',
      'Received Qty',
      'Outstanding Qty',
      'Payment Commitments',
      'Confirmed Payments',
      'Outstanding Payment',
      'Landed Cost (ETB)',
      'Variance Status',
    ];
    const rows = rowsData.map((r: any) => [
      r.poNumber,
      r.poDate || '',
      r.supplierName || '',
      r.itemCode || '',
      r.itemName || '',
      r.currency || '',
      r.orderedQuantity ?? 0,
      r.shippedQuantity ?? 0,
      r.receivedQuantity ?? 0,
      r.outstandingQuantity ?? 0,
      r.paymentCommitments ?? 0,
      r.confirmedPayments ?? 0,
      r.outstandingPayment ?? 0,
      r.landedCostTotalEtb ?? 0,
      r.varianceStatus || '',
    ]);
    return {
      filename: `import-reconciliation-report-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: this.buildCsv(headers, rows),
    };
  }

  // Story IMP-47: Import Reconciliation Report
  async getImportReconciliationReport(): Promise<any> {
    const pos = await this.poRepo.find({
      relations: ['lines', 'lines.item', 'supplier', 'paymentSchedules', 'paymentSchedules.transactions'],
      order: { createdAt: 'DESC' },
    });

    const shipmentLines = await this.shipmentLineRepo.find({
      relations: ['shipment'],
    });

    const reconciliation = [];

    for (const po of pos) {
      for (const line of po.lines || []) {
        const lineShipments = shipmentLines.filter((sl) => String(sl.poLineId) === String(line.poLineId));
        const shippedQty = lineShipments.reduce((sum, sl) => sum + Number(sl.quantityShipped || 0), 0);
        const receivedQty = lineShipments.reduce((sum, sl) => sum + Number(sl.quantityReceived || 0), 0);
        const orderedQty = Number(line.quantityOrdered || 0);
        const outstandingQty = Math.max(0, orderedQty - receivedQty);
        const commitmentTotal = (po.paymentSchedules || []).reduce((sum, schedule) => sum + Number(schedule.amountDue || 0), 0);
        const confirmedPayments = (po.paymentSchedules || []).reduce(
          (sum, schedule) => sum + (schedule.transactions || []).filter((t: any) => t.status === 'CONFIRMED').reduce((s: number, t: any) => s + Number(t.amountPaid || 0), 0),
          0,
        );
        const landedRows = lineShipments.length
          ? await this.lineCostRepo.find({ where: { shipmentLineId: In(lineShipments.map((sl) => sl.shipmentLineId)), isCurrent: true } })
          : [];
        const landedCostTotalEtb = landedRows.reduce((sum, row) => sum + Number(row.allocatedCostEtb || 0), 0);

        let varianceStatus = 'NOT_SHIPPED';
        if (receivedQty >= orderedQty && orderedQty > 0) {
          varianceStatus = 'MATCHED';
        } else if (receivedQty > 0) {
          varianceStatus = 'UNDER_RECEIVED';
        } else if (shippedQty > 0) {
          varianceStatus = 'IN_TRANSIT';
        }

        reconciliation.push({
          poId: po.poId,
          poNumber: po.poNumber,
          poDate: po.poDate,
          supplierName: po.supplier?.supplierName || '—',
          itemId: line.itemId,
          itemCode: line.item?.itemCode || line.itemId,
          itemName: line.item?.itemName || 'Product Item',
          itemDescription: line.item?.itemName || 'Product Item',
          unitPrice: Number(line.unitPrice || 0),
          currency: po.currency || 'USD',
          orderedQuantity: orderedQty,
          shippedQuantity: shippedQty,
          receivedQuantity: receivedQty,
          outstandingQuantity: outstandingQty,
          paymentCommitments: commitmentTotal,
          confirmedPayments,
          outstandingPayment: Math.max(0, commitmentTotal - confirmedPayments),
          landedCostTotalEtb,
          varianceStatus,
          status: outstandingQty === 0 ? 'FULLY_RECEIVED' : receivedQty > 0 ? 'PARTIALLY_RECEIVED' : 'IN_PIPELINE',
        });
      }
    }

    return reconciliation;
  }

  // Story IMP-48: Import Monitoring Dashboard
  async getImportMonitoringDashboard(): Promise<any> {
    const [pipeline, logistics, docsReport, forwarders, containers] = await Promise.all([
      this.getPipelineReport(),
      this.getShipmentLogisticsReport(),
      this.getDocumentCompletenessReport(),
      this.getFreightForwarders(false),
      this.containerRepo.find(),
    ]);

    const activeContainers = containers.filter((c) => c.containerStatus !== 'RETURNED').length;
    const notifications = await this.getImportNotifications({ unreadOnly: true });
    const upcomingPayments = notifications.filter((n) => n.eventType === 'PAYMENT_DUE_SOON').length;
    const overdueMilestones = notifications.filter((n) => n.eventType === 'SHIPMENT_MILESTONE_OVERDUE').length;
    const delayedShipments = logistics.filter((s: any) => s.isDelayed).length;

    const missingDocumentsCount = docsReport.statusCounts.MISSING || 0;
    const expiredDocumentsCount = docsReport.statusCounts.EXPIRED || 0;
    const rejectedDocumentsCount = docsReport.statusCounts.REJECTED || 0;
    const pendingDocumentsCount = docsReport.statusCounts.PENDING || 0;
    const verifiedDocumentsCount = docsReport.statusCounts.VERIFIED || 0;

    return {
      activeShipmentsCount: pipeline.totalActiveShipments,
      totalShipmentsCount: pipeline.totalShipments,
      inlandTransitCount: pipeline.totalInlandTransit,
      activeContainersCount: activeContainers,
      missingDocumentsCount,
      expiredDocumentsCount,
      rejectedDocumentsCount,
      pendingDocumentsCount,
      verifiedDocumentsCount,
      totalRequiredDocumentsCount: docsReport.totalDocuments || 0,
      unverifiedDocumentsCount:
        missingDocumentsCount + pendingDocumentsCount + rejectedDocumentsCount + expiredDocumentsCount,
      documentStatusCounts: docsReport.statusCounts,
      freightForwardersCount: forwarders.length,
      upcomingPaymentsCount: upcomingPayments,
      overdueMilestonesCount: overdueMilestones,
      delayedShipmentsCount: delayedShipments,
      stageBreakdown: pipeline.stageBreakdown,
      recentShipments: logistics.slice(0, 10),
    };
  }

  // Shipment logistics policy, transactional records, history and deadline processing.
  async getLogisticsPolicy(manager: { query: Function } = this.dataSource) {
    const rows = await manager.query('SELECT settings FROM shipment_logistics_policy WHERE policy_id=1');
    return { ...LOGISTICS_DEFAULTS, ...rows[0]?.settings } as typeof LOGISTICS_DEFAULTS;
  }
  async getLogisticsConfiguration() {
    return { policy: await this.getLogisticsPolicy(), roles: await this.dataSource.query('SELECT role_name FROM role ORDER BY role_name'),
      history: await this.dataSource.query("SELECT h.*,u.full_name AS actor FROM shipment_logistics_history h LEFT JOIN app_user u ON u.user_id=h.changed_by WHERE h.entity_type='shipment_logistics_policy' ORDER BY h.history_id DESC") };
  }
  async saveLogisticsPolicy(input: any, userId: number) {
    if(!input || typeof input!=='object' || Array.isArray(input)) throw new BadRequestException('A logistics policy object is required');
    const policy = Object.fromEntries(Object.keys(LOGISTICS_DEFAULTS).map(k=>[k,input[k] ?? LOGISTICS_DEFAULTS[k]])) as typeof LOGISTICS_DEFAULTS;
    try { businessDate(new Date(),policy.timezone); } catch { throw new BadRequestException('Valid system timezone required'); }
    for (const offsets of [policy.freeTimeOffsets,policy.returnOffsets]) {
      if (!Array.isArray(offsets) || !offsets.length || offsets.length>12 || offsets.some(n=>!Number.isInteger(n)||n<0||n>365) || new Set(offsets).size!==offsets.length)
        throw new BadRequestException('Reminder offsets must be distinct whole calendar days from 0 to 365');
    }
    if (typeof policy.allowSelfApproval!=='boolean' || !['PER_SHIPMENT','GLOBAL','ACTIVE'].includes(policy.containerUniqueness)) throw new BadRequestException('Invalid approval or uniqueness policy');
    const roles=await this.dataSource.query('SELECT role_name FROM role');
    if (!Array.isArray(policy.recipientRoles)||!policy.recipientRoles.length||policy.recipientRoles.some(r=>!roles.some(x=>x.role_name===r))) throw new BadRequestException('Select existing responsible roles');
    for (const rules of [policy.milestoneRules,policy.trackingRules]) {
      if (!Array.isArray(rules)||rules.length>100) throw new BadRequestException('Invalid logistics requirements');
      for(const r of rules) if(typeof r.name!=='string'||!r.name.trim()||r.name.length>100||!STAGES.includes(r.stage)||typeof r.destination!=='string'||!['','SEA','AIR','ROAD','RAIL'].includes(r.mode)) throw new BadRequestException('Each requirement needs a name, destination, mode and valid checkpoint');
    }
    return this.dataSource.transaction(async m=>{
      await m.query('SELECT pg_advisory_xact_lock(734510)');
      const old=await this.getLogisticsPolicy(m);
      await m.query('UPDATE shipment_logistics_policy SET settings=$1 WHERE policy_id=1',[policy]);
      await this.recordLogisticsHistory(m,null,'shipment_logistics_policy','1',userId,'Update logistics policy',old,policy);
      return policy;
    });
  }
  private async recordLogisticsHistory(m: EntityManager, shipmentId: string | null, type: string, id: string, actor: number, reason: string, before: any, after: any) {
    await m.query(`INSERT INTO shipment_logistics_history(shipment_id,entity_type,entity_id,changed_by,reason,old_value,new_value) VALUES($1,$2,$3,$4,$5,$6,$7)`,[shipmentId,type,id,actor,reason,before||null,after]);
  }
  async activeForwarder(id: string, manager: EntityManager = this.dataSource.manager) {
    const f=await manager.findOne(FreightForwarder,{where:{freightForwarderId:id}});
    if(!f || !f.isActive) throw new BadRequestException('Select an active freight forwarder');
    return f;
  }
  async quotationDecision(shipmentId:string, quotationId:string, decision:'SELECTED'|'APPROVED'|'REJECTED', reason:string, actor:number) {
    if(!reason?.trim()||!actor) throw new BadRequestException('Decision reason and authenticated actor required');
    return this.dataSource.transaction(async m=>{
      await m.query('SELECT pg_advisory_xact_lock(734510)');
      const shipment=await m.findOne(Shipment,{where:{shipmentId},lock:{mode:'pessimistic_write'},loadEagerRelations:false});
      if(!shipment) throw new NotFoundException('Shipment not found');
      const repo=m.getRepository(ShipmentFreightQuotation);
      const quote=await repo.findOne({where:{quotationId,shipmentId},lock:{mode:'pessimistic_write'},loadEagerRelations:false});
      if(!quote) throw new NotFoundException('Quotation not found on shipment');
      if(quote.approvalStatus==='APPROVED') throw new BadRequestException('Approved quotations are historical; select a replacement quotation instead');
      const before={...quote},policy=await this.getLogisticsPolicy(m);
      if(decision!=='REJECTED') {
        await this.activeForwarder(quote.freightForwarderId,m);
        if(quote.validUntil&&quote.validUntil<businessDate(new Date(),policy.timezone)) throw new BadRequestException('Quotation has expired');
      }
      if(decision==='APPROVED') {
        if(quote.selectionStatus!=='SELECTED'||quote.approvalStatus!=='PENDING') throw new BadRequestException('Select a pending quotation before approval');
        if(Number(quote.selectedBy)===actor&&!policy.allowSelfApproval) throw new BadRequestException('Separation of duties: a different authorized approver must approve the selected freight quotation');
        const others=await repo.find({where:{shipmentId}});
        for(const other of others) if(other.quotationId!==quotationId&&other.selectionStatus!=='REJECTED') {
          const old={...other};other.selectionStatus='REJECTED';
          if(other.approvalStatus==='PENDING') other.approvalStatus='REJECTED';
          await repo.save(other);
          await m.query(`INSERT INTO freight_quotation_decision_history(quotation_id,shipment_id,decision,reason,decided_by) VALUES($1,$2,'REJECTED',$3,$4)`,[other.quotationId,shipmentId,`Superseded by approved quotation ${quotationId}`,actor]);
          await this.recordLogisticsHistory(m,shipmentId,'shipment_freight_quotation',other.quotationId,actor,'Superseded by approved quotation',old,other);
        }
        quote.approvalStatus='APPROVED';quote.approvedBy=actor;quote.approvedAt=new Date();
        shipment.selectedForwarderId=quote.freightForwarderId;await m.save(shipment);
      } else if(decision==='SELECTED') {
        const previous=await repo.find({where:{shipmentId,selectionStatus:'SELECTED',approvalStatus:'PENDING'}});
        for(const old of previous) if(old.quotationId!==quotationId) {
          const prior={...old};old.selectionStatus='PENDING';await repo.save(old);
          await this.recordLogisticsHistory(m,shipmentId,'shipment_freight_quotation',old.quotationId,actor,'Selection replaced',prior,old);
        }
        quote.selectionStatus='SELECTED';quote.approvalStatus='PENDING';quote.selectionReason=reason;
        quote.selectedBy=actor;quote.selectedAt=new Date();quote.approvedBy=null;quote.approvedAt=null;quote.rejectionReason=null;
      } else {quote.selectionStatus='REJECTED';quote.approvalStatus='REJECTED';quote.rejectionReason=reason;quote.approvedBy=actor;quote.approvedAt=new Date();}
      const saved=await repo.save(quote);
      await m.query(`INSERT INTO freight_quotation_decision_history(quotation_id,shipment_id,decision,reason,decided_by) VALUES($1,$2,$3,$4,$5)`,[quotationId,shipmentId,decision,reason,actor]);
      await this.recordLogisticsHistory(m,shipmentId,'shipment_freight_quotation',quotationId,actor,reason,before,saved);
      return saved;
    });
  }
  private validateDates(data: any) {
    for(const [key,val] of Object.entries(data)) if(/Date$/.test(key) && val && (typeof val!=='string'||!validDate(val))) throw new BadRequestException(`${key} must be a calendar date (YYYY-MM-DD)`);
    for(const [start,end] of [['estimatedDepartureDate','estimatedArrivalDate'],['actualDepartureDate','actualArrivalDate'],['issueDate','validUntil'],['loadingDate','actualEmptyReturnDate']])
      if(data[start]&&data[end]&&data[start]>data[end]) throw new BadRequestException(`${end} cannot be before ${start}`);
  }
  async saveLogisticsRecord(kind: string, shipmentId: string | undefined, id: string | undefined, raw: any, actor: number) {
    const spec=RECORDS[kind];
    if(!spec) throw new BadRequestException('Unknown logistics record');
    if(!raw || typeof raw!=='object' || Array.isArray(raw)) throw new BadRequestException('A logistics record object is required');
    if(!actor) throw new BadRequestException('Authenticated actor required');
    return this.dataSource.transaction(async m=>{
      // All record writes and scans share this lock: revisions/return cannot race alerts.
      await m.query('SELECT pg_advisory_xact_lock(734510)');
      const repo=m.getRepository<any>(spec.entity);
      const before=id?await repo.findOne({where:{[spec.id]:id},lock:{mode:'pessimistic_write'},loadEagerRelations:false}):null;
      if(id&&!before) throw new NotFoundException('Logistics record not found');
      const sid=shipmentId||before?.shipmentId;
      if(before&&shipmentId&&String(before.shipmentId)!==String(shipmentId)) throw new BadRequestException('Record belongs to another shipment');
      const shipment=await m.findOne(Shipment,{where:{shipmentId:sid}});
      if(!shipment) throw new NotFoundException('Shipment not found');
      const reason=String(raw.revisionReason||'').trim();
      if(id&&!reason) throw new BadRequestException('A change reason is required');
      const input=plainToInstance(spec.dto as any,{...(before||{}),...raw});
      const errors=validateSync(input as object,{whitelist:true,forbidUnknownValues:true});
      if(errors.length) throw new BadRequestException(errors.flatMap(e=>Object.values(e.constraints||{})).join('; '));
      const data:any={...input};
      delete data.userId; delete data.revisionReason; delete data.freeTimeEndDate;
      this.validateDates(data);
      for(const key of ['bookingReference','containerNumber','milestoneName','policyNumber','insurerName']) if(key in data && !String(data[key]||'').trim()) throw new BadRequestException(`${key} is required`);
      const policy=await this.getLogisticsPolicy(m), today=businessDate(new Date(),policy.timezone);
      if(kind==='containers') {
        data.containerNumber=data.containerNumber.trim().toUpperCase();
        data.freeTimeDays=data.freeTimeDays??14; data.dayCounting=data.dayCounting||'EXCLUSIVE';
        data.freeTimeStartDate=data.freeTimeStartDate||null;
        data.actualEmptyReturnDate=data.actualEmptyReturnDate||null;
        const scope=policy.containerUniqueness==='GLOBAL'?'':policy.containerUniqueness==='ACTIVE'?" AND container_status<>'RETURNED'":' AND shipment_id=$3';
        const duplicates=await m.query(`SELECT container_id FROM shipment_container WHERE upper(trim(container_number))=$1 AND container_id<>$2${scope}`,
          policy.containerUniqueness==='PER_SHIPMENT'?[data.containerNumber,id||'0',sid]:[data.containerNumber,id||'0']);
        if(duplicates.length && !(policy.containerUniqueness==='ACTIVE'&&data.containerStatus==='RETURNED')) throw new BadRequestException('Container number already exists within the configured uniqueness scope');
        if(data.freeTimeStartDate) data.freeTimeEndDate=expiryDate(data.freeTimeStartDate,data.freeTimeDays,data.dayCounting);
        else if(before?.freeTimeEndDate && !before.freeTimeStartDate && data.freeTimeDays===before.freeTimeDays) data.freeTimeEndDate=before.freeTimeEndDate;
        else data.freeTimeEndDate=null;
        if(before?.freeTimeEndDate&&!data.freeTimeStartDate&&(data.freeTimeDays!==before.freeTimeDays||data.dayCounting!==before.dayCounting)) throw new BadRequestException('Enter the officially agreed start date before revising legacy free time');
        if(data.actualEmptyReturnDate) {
          if(data.actualEmptyReturnDate>today) throw new BadRequestException('Actual return date cannot be in the future');
          if(data.freeTimeStartDate&&data.actualEmptyReturnDate<data.freeTimeStartDate) throw new BadRequestException('Return cannot precede free-time start');
          data.containerStatus='RETURNED';
        }
        if(data.containerStatus==='RETURNED'&&!data.actualEmptyReturnDate) throw new BadRequestException('Actual empty return date required');
        if(before?.containerStatus==='RETURNED'&&data.containerStatus!=='RETURNED') throw new BadRequestException('Returned containers cannot be reopened; record a new shipment allocation');
        const changed=before&&['freeTimeStartDate','freeTimeDays','dayCounting','emptyReturnDueDate'].some(k=>(data[k]??null)!==(before[k]??null));
        data.deadlineRevision=Number(before?.deadlineRevision||1)+(changed?1:0);
      }
      if(kind==='bookings') {
        data.bookingStatus=data.bookingStatus||'REQUESTED';
        data.freightForwarderId=data.freightForwarderId||shipment.selectedForwarderId;
        if(data.freightForwarderId) await this.activeForwarder(data.freightForwarderId,m);
        if(data.bookingStatus==='CONFIRMED' && (!shipment.selectedForwarderId || String(data.freightForwarderId)!==String(shipment.selectedForwarderId))) throw new BadRequestException('Confirm booking using the approved shipment forwarder');
        data.createdBy=before?.createdBy||actor;
      }
      if(kind==='milestones') {
        data.completedAt=data.isCompleted ? (before?.isCompleted?before.completedAt:new Date()) : null;
        data.completedBy=data.isCompleted ? (before?.isCompleted?before.completedBy:actor) : null;
        data.milestoneDate=data.isCompleted?(data.milestoneDate||today):data.milestoneDate||null;
        if(data.milestoneDate&&data.milestoneDate>today) throw new BadRequestException('Actual milestone date cannot be in the future');
      }
      if(kind==='insurance') {
        data.currency=String(data.currency||'USD').toUpperCase();
        if(!/^[A-Z]{3}$/.test(data.currency)) throw new BadRequestException('Three-letter insurance currency required');
      }
      if(kind==='tracking') {
        if(['SUBMITTED','APPROVED'].includes(data.status)&&(!data.submissionDate||!data.referenceNumber?.trim())) throw new BadRequestException('Submission date and reference required for submitted/approved tracking documents');
        data.verifiedAt=data.status==='APPROVED'?(before?.verifiedAt||new Date()):null;
      }
      const saved=await repo.save(repo.create({...before,...data,shipmentId:sid,...(id?{[spec.id]:id}:{})}));
      await this.recordLogisticsHistory(m,sid,spec.table,String(saved[spec.id]),actor,reason||'Created',before,saved);
      return saved;
    });
  }
  async setInsuranceRequirement(shipmentId:string, required:boolean, reason:string, actor:number) {
    if(typeof required!=='boolean'||!reason?.trim()) throw new BadRequestException('Insurance requirement and reason required');
    return this.dataSource.transaction(async m=>{
      const shipment=await m.findOne(Shipment,{where:{shipmentId},lock:{mode:'pessimistic_write'},loadEagerRelations:false});
      if(!shipment) throw new NotFoundException('Shipment not found');
      const before={insuranceRequired:shipment.insuranceRequired};
      shipment.insuranceRequired=required;
      await m.save(shipment);
      await this.recordLogisticsHistory(m,shipmentId,'shipment',shipmentId,actor,reason,before,{insuranceRequired:required});
      return shipment;
    });
  }
  private matchesLogisticsRule(rule:any, shipment:Shipment) {
    const pos=(shipment.lines||[]).map(l=>l.poLine?.purchaseOrder).filter(Boolean);
    return (!rule.destination&&!rule.mode)||pos.some(po=>(!rule.destination||rule.destination.toLowerCase()===(po.destinationCountry||'').toLowerCase())&&(!rule.mode||rule.mode===po.modeOfShipment));
  }
  async getLogisticsActions(shipment:Shipment, policy:typeof LOGISTICS_DEFAULTS, today:string, stage?:string) {
    const actions:string[]=[];
    const milestones=shipment.milestones||[], tracking=shipment.cargoTrackings||[];
    for(const r of policy.milestoneRules.filter(r=>(!stage||r.stage===stage)&&this.matchesLogisticsRule(r,shipment))) if(!milestones.some(m=>m.milestoneName===r.name&&m.isCompleted)) actions.push(`${r.stage}: complete milestone ${r.name}`);
    for(const r of policy.trackingRules.filter(r=>(!stage||r.stage===stage)&&this.matchesLogisticsRule(r,shipment))) if(!tracking.some(t=>t.documentName===r.name&&t.status==='APPROVED')) actions.push(`${r.stage}: approve shipping requirement ${r.name}`);
    if(!stage) {
      for(const t of tracking) if(t.status!=='APPROVED') for(const [name,date] of [['submission',t.deadlineDate],['shipping cut-off',t.shippingCutOffDate]]) if(date) actions.push(`${t.documentName}: ${name} ${date<today?'OVERDUE':'due'} ${date}`);
      for(const m of milestones) if(!m.isCompleted&&m.plannedDate&&m.plannedDate<today) actions.push(`Milestone overdue: ${m.milestoneName}`);
      if(shipment.insuranceRequired && !(shipment.insurances||[]).some(i=>i.isActive&&i.issueDate&&i.issueDate<=today&&i.validUntil&&i.validUntil>=today)) actions.push('Required insurance: record an active policy covering today');
    }
    return actions;
  }
  async assertLogisticsProgress(shipment:Shipment, stage:string) {
    const policy=await this.getLogisticsPolicy();
    const failures=await this.getLogisticsActions(shipment,policy,businessDate(new Date(),policy.timezone),stage);
    if(failures.length) throw new BadRequestException(failures.join('; '));
  }
  async getLogisticsSupplement(shipment:Shipment) {
    const policy=await this.getLogisticsPolicy(), today=businessDate(new Date(),policy.timezone);
    const containers=(shipment.containers||[]).map(c=>({...c,
      freeTime:deadlineState(c.freeTimeEndDate,today,c.containerStatus==='RETURNED',Math.max(...policy.freeTimeOffsets)),
      emptyReturn:deadlineState(c.emptyReturnDueDate,today,c.containerStatus==='RETURNED',Math.max(...policy.returnOffsets))}));
    const actions=await this.getLogisticsActions(shipment,policy,today);
    for(const c of containers) if(c.containerStatus!=='RETURNED') {
      if(!c.freeTimeStartDate) actions.push(`${c.containerNumber}: confirm free-time start date${c.freeTimeEndDate?' (legacy expiry retained)':''}`);
      for(const [label,state] of [['free time',c.freeTime],['empty return',c.emptyReturn]] as const) if(['OVERDUE','DUE_TODAY','APPROACHING'].includes(state.status)) actions.push(`${c.containerNumber}: ${label} ${state.status} (${state.days} days)`);
    }
    const history=await this.dataSource.query(`SELECT h.*,u.full_name AS actor FROM shipment_logistics_history h LEFT JOIN app_user u ON u.user_id=h.changed_by WHERE h.shipment_id=$1 ORDER BY h.history_id DESC`,[shipment.shipmentId]);
    const notifications=await this.dataSource.query(`SELECT n.*,u.full_name AS recipient_name FROM import_notification n LEFT JOIN app_user u ON u.user_id=n.recipient_user_id WHERE n.entity_type='CONTAINER' AND n.entity_id IN (SELECT container_id::text FROM shipment_container WHERE shipment_id=$1) ORDER BY n.created_at DESC`,[shipment.shipmentId]);
    return {containers,logisticsActions:actions,logisticsHistory:history,containerNotifications:notifications,logisticsToday:today,logisticsTimezone:policy.timezone,insuranceRequired:shipment.insuranceRequired};
  }
  async scanContainerDeadlines(now=new Date()) {
    return this.dataSource.transaction(async m=>{
      await m.query('SELECT pg_advisory_xact_lock(734510)');
      const policy=await this.getLogisticsPolicy(m),today=businessDate(now,policy.timezone);
      const containers=await m.getRepository(ShipmentContainer).createQueryBuilder('c').where("c.containerStatus <> 'RETURNED'").getMany();
      let generated=0;
      for(const c of containers) for(const [kind,date,offsets] of [['FREE_TIME',c.freeTimeEndDate,policy.freeTimeOffsets],['EMPTY_RETURN',c.emptyReturnDueDate,policy.returnOffsets]] as const) {
        if(!date) continue;
        for(const event of reminderEvents(date,today,offsets)) for(const role of policy.recipientRoles) {
          const recipients=await m.query(`SELECT u.user_id FROM app_user u JOIN role r ON r.role_id=u.role_id WHERE u.is_active=TRUE AND r.role_name=$1`,[role]);
          for(const recipient of recipients.length?recipients:[{user_id:null}]) {
            const key=`C5:${c.containerId}:${kind}:${date}:${c.deadlineRevision}:${event}:${role}:${recipient.user_id||'unassigned'}`;
            const rows=await m.query(`INSERT INTO import_notification(event_type,recipient_role,recipient_user_id,entity_type,entity_id,title,message,severity,delivery_channel,delivery_status,delivered_at,deduplication_key,deadline_date,reminder_date,deadline_revision)
              VALUES($1,$2,$3,'CONTAINER',$4,$5,$6,$7,'IN_APP',$8,$9,$10,$11::date,$11::date - $12::integer,$13)
              ON CONFLICT(deduplication_key) WHERE deduplication_key IS NOT NULL DO NOTHING RETURNING notification_id`,
              [`CONTAINER_${kind}_${event}`,role,recipient.user_id,c.containerId,`${c.containerNumber}: ${kind.replace('_',' ')} ${event==='OVERDUE'?'overdue':event.replace('BEFORE_','due within ')+' days'}`,
              `Deadline ${date}; timezone ${policy.timezone}; revision ${c.deadlineRevision}.${recipient.user_id?'':' No active recipient in configured role.'}`,event==='OVERDUE'?'CRITICAL':'WARNING',recipient.user_id?'DELIVERED':'FAILED',recipient.user_id?now:null,key,date,event==='OVERDUE'?-1:Number(event.replace('BEFORE_','')),c.deadlineRevision]);
            generated+=rows.length;
          }
        }
      }
      return generated;
    });
  }
}
