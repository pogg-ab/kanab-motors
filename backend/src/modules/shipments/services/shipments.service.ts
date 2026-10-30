import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
  CreateShipmentBookingDto,
  CreateShipmentContainerDto,
  CreateShipmentMilestoneDto,
  CreateShipmentInsuranceDto,
  CreateCargoTrackingDto,
  CreateShipmentDocumentDto,
  VerifyShipmentDocumentDto,
  UpdateOriginalDocumentStatusDto,
} from '../dto/logistics.dto';

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
  ) {}

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

    if (!validTransitions[fromStage]?.includes(targetStage)) {
      throw new BadRequestException(`Invalid shipment stage transition from ${fromStage} to ${targetStage}`);
    }

    // Document Completeness Check (Story D2):
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

      if (!customsAttachment?.filePath && !structuredCustoms) {
        throw new BadRequestException(
          `Document Completeness Check Failed: Mandatory Customs Declaration document ('CUSTOMS_DECLARATION') must be uploaded or marked VERIFIED in Shipping Document Control before advancing to ${targetStage}.`,
        );
      }
    }

    // 2. Advancing to RECEIVED (closure) requires full mandatory import document packet
    if (targetStage === ShipmentStage.RECEIVED) {
      const requiredDocs = ['CUSTOMS_DECLARATION', 'COMMERCIAL_INVOICE', 'BILL_OF_LADING'];
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

  async getPipelineReport(): Promise<any> {
    const shipments = await this.shipmentRepo.find({
      relations: ['stageHistory', 'costComponents', 'lines'],
      order: { createdAt: 'DESC' },
    });

    const stageCounts: Record<string, number> = {};
    for (const stage of Object.values(ShipmentStage)) {
      stageCounts[stage] = 0;
    }

    let totalActiveShipments = 0;
    let totalInlandTransit = 0;

    for (const s of shipments) {
      stageCounts[s.currentStage] = (stageCounts[s.currentStage] || 0) + 1;
      if (s.currentStage !== ShipmentStage.RECEIVED) {
        totalActiveShipments++;
      }
      if (s.currentStage === ShipmentStage.IN_TRANSIT_INLAND) {
        totalInlandTransit++;
      }
    }

    return {
      totalShipments: shipments.length,
      totalActiveShipments,
      totalInlandTransit,
      stageBreakdown: stageCounts,
      recentShipments: shipments.slice(0, 10).map((s) => ({
        shipmentId: s.shipmentId,
        shipmentNumber: s.shipmentNumber,
        currentStage: s.currentStage,
        expectedArrivalDate: s.expectedArrivalDate,
        linesCount: s.lines?.length || 0,
        costsCount: s.costComponents?.length || 0,
      })),
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

  async createFreightForwarder(dto: CreateFreightForwarderDto): Promise<FreightForwarder> {
    const forwarder = this.forwarderRepo.create(dto);
    return this.forwarderRepo.save(forwarder);
  }

  async updateFreightForwarder(id: string, dto: UpdateFreightForwarderDto): Promise<FreightForwarder> {
    const forwarder = await this.forwarderRepo.findOne({ where: { freightForwarderId: id } });
    if (!forwarder) {
      throw new NotFoundException(`Freight Forwarder #${id} not found`);
    }
    Object.assign(forwarder, dto);
    return this.forwarderRepo.save(forwarder);
  }

  async setShipmentSelectedForwarder(shipmentId: string, forwarderId: string): Promise<Shipment> {
    await this.findOne(shipmentId);
    await this.shipmentRepo.update({ shipmentId }, { selectedForwarderId: forwarderId });
    return this.findOne(shipmentId);
  }

  // Story IMP-24 & IMP-25: Freight Quotation Management & Selection
  async getShipmentQuotations(shipmentId: string): Promise<ShipmentFreightQuotation[]> {
    return this.quotationRepo.find({
      where: { shipmentId },
      relations: ['forwarder', 'creator', 'selector'],
      order: { quotationDate: 'DESC' },
    });
  }

  async addShipmentQuotation(shipmentId: string, dto: CreateFreightQuotationDto): Promise<ShipmentFreightQuotation> {
    await this.findOne(shipmentId);
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
      createdBy: dto.userId,
    });
    return this.quotationRepo.save(quotation);
  }

  async selectShipmentQuotation(
    shipmentId: string,
    quotationId: string,
    dto: SelectFreightQuotationDto,
  ): Promise<ShipmentFreightQuotation> {
    await this.findOne(shipmentId);
    const quotation = await this.quotationRepo.findOne({
      where: { quotationId, shipmentId },
    });
    if (!quotation) {
      throw new NotFoundException(`Quotation #${quotationId} not found on shipment #${shipmentId}`);
    }

    // Mark other quotations as REJECTED
    await this.quotationRepo.update(
      { shipmentId },
      { selectionStatus: 'REJECTED' },
    );

    quotation.selectionStatus = 'SELECTED';
    quotation.selectionReason = dto.selectionReason;
    quotation.selectedBy = dto.userId;
    quotation.selectedAt = new Date();

    const saved = await this.quotationRepo.save(quotation);

    // Also update shipment selectedForwarderId
    await this.shipmentRepo.update(
      { shipmentId },
      { selectedForwarderId: quotation.freightForwarderId },
    );

    return saved;
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
    await this.findOne(shipmentId);
    const booking = this.bookingRepo.create({
      shipmentId,
      freightForwarderId: dto.freightForwarderId,
      bookingReference: dto.bookingReference,
      carrierName: dto.carrierName,
      vesselName: dto.vesselName,
      voyageNumber: dto.voyageNumber,
      originPort: dto.originPort,
      destinationPort: dto.destinationPort,
      estimatedDepartureDate: dto.estimatedDepartureDate,
      actualDepartureDate: dto.actualDepartureDate,
      estimatedArrivalDate: dto.estimatedArrivalDate,
      actualArrivalDate: dto.actualArrivalDate,
      bookingStatus: dto.bookingStatus || 'CONFIRMED',
      notes: dto.notes,
      createdBy: dto.userId,
    });
    return this.bookingRepo.save(booking);
  }

  async updateShipmentBooking(bookingId: string, dto: Partial<CreateShipmentBookingDto>): Promise<ShipmentBooking> {
    const booking = await this.bookingRepo.findOne({ where: { bookingId } });
    if (!booking) {
      throw new NotFoundException(`Shipment booking #${bookingId} not found`);
    }
    Object.assign(booking, dto);
    return this.bookingRepo.save(booking);
  }

  // Story IMP-27: Container Management
  async getShipmentContainers(shipmentId: string): Promise<ShipmentContainer[]> {
    return this.containerRepo.find({
      where: { shipmentId },
      order: { createdAt: 'DESC' },
    });
  }

  async addShipmentContainer(shipmentId: string, dto: CreateShipmentContainerDto): Promise<ShipmentContainer> {
    await this.findOne(shipmentId);
    const container = this.containerRepo.create({
      shipmentId,
      ...dto,
    });
    return this.containerRepo.save(container);
  }

  async updateShipmentContainer(containerId: string, dto: Partial<CreateShipmentContainerDto>): Promise<ShipmentContainer> {
    const container = await this.containerRepo.findOne({ where: { containerId } });
    if (!container) {
      throw new NotFoundException(`Container #${containerId} not found`);
    }
    Object.assign(container, dto);
    return this.containerRepo.save(container);
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
    await this.findOne(shipmentId);
    const milestone = this.milestoneRepo.create({
      shipmentId,
      milestoneName: dto.milestoneName,
      plannedDate: dto.plannedDate,
      milestoneDate: dto.milestoneDate,
      isCompleted: dto.isCompleted || false,
      completedAt: dto.isCompleted ? new Date() : undefined,
      completedBy: dto.isCompleted ? dto.userId : undefined,
      notes: dto.notes,
    });
    return this.milestoneRepo.save(milestone);
  }

  async updateShipmentMilestone(
    milestoneId: string,
    isCompleted: boolean,
    notes?: string,
    userId?: number,
  ): Promise<ShipmentMilestone> {
    const milestone = await this.milestoneRepo.findOne({ where: { milestoneId } });
    if (!milestone) {
      throw new NotFoundException(`Milestone #${milestoneId} not found`);
    }
    milestone.isCompleted = isCompleted;
    milestone.completedAt = isCompleted ? new Date() : undefined;
    milestone.completedBy = isCompleted ? userId : undefined;
    if (notes) milestone.notes = notes;
    return this.milestoneRepo.save(milestone);
  }

  // Story IMP-29: Shipment Insurance
  async getShipmentInsurances(shipmentId: string): Promise<ShipmentInsurance[]> {
    return this.insuranceRepo.find({
      where: { shipmentId },
      order: { createdAt: 'DESC' },
    });
  }

  async addShipmentInsurance(shipmentId: string, dto: CreateShipmentInsuranceDto): Promise<ShipmentInsurance> {
    await this.findOne(shipmentId);
    const insurance = this.insuranceRepo.create({
      shipmentId,
      ...dto,
      currency: dto.currency || 'USD',
      coverageType: dto.coverageType || 'All Risks (Institute Cargo Clauses A)',
    });
    return this.insuranceRepo.save(insurance);
  }

  // Story IMP-30: Cargo Tracking & ECTN
  async getShipmentCargoTracking(shipmentId: string): Promise<ShipmentCargoTracking[]> {
    return this.cargoTrackingRepo.find({
      where: { shipmentId },
      order: { createdAt: 'DESC' },
    });
  }

  async addShipmentCargoTracking(shipmentId: string, dto: CreateCargoTrackingDto): Promise<ShipmentCargoTracking> {
    await this.findOne(shipmentId);
    const tracking = this.cargoTrackingRepo.create({
      shipmentId,
      ...dto,
    });
    return this.cargoTrackingRepo.save(tracking);
  }

  async updateShipmentCargoTracking(trackingId: string, dto: Partial<CreateCargoTrackingDto>): Promise<ShipmentCargoTracking> {
    const tracking = await this.cargoTrackingRepo.findOne({ where: { trackingId } });
    if (!tracking) {
      throw new NotFoundException(`Cargo tracking #${trackingId} not found`);
    }
    Object.assign(tracking, dto);
    return this.cargoTrackingRepo.save(tracking);
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
    const doc = this.shipmentDocRepo.create({
      shipmentId,
      ...dto,
      verificationStatus: dto.verificationStatus || 'PENDING',
      originalDocumentStatus: dto.originalDocumentStatus || 'NOT_RECEIVED',
      createdBy: dto.userId,
    });
    return this.shipmentDocRepo.save(doc);
  }

  async verifyShipmentDocument(docId: string, dto: VerifyShipmentDocumentDto): Promise<ShipmentDocument> {
    const doc = await this.shipmentDocRepo.findOne({ where: { shipmentDocumentId: docId } });
    if (!doc) {
      throw new NotFoundException(`Shipment document #${docId} not found`);
    }
    doc.verificationStatus = dto.status;
    doc.verifiedBy = dto.userId;
    doc.verifiedAt = new Date();
    if (dto.documentReference !== undefined) doc.documentReference = dto.documentReference;
    if (dto.issueDate !== undefined) doc.issueDate = dto.issueDate;
    if (dto.originalDocumentStatus !== undefined) doc.originalDocumentStatus = dto.originalDocumentStatus;
    if (dto.notes !== undefined) doc.verificationNotes = dto.notes;
    return this.shipmentDocRepo.save(doc);
  }

  async updateOriginalDocumentStatus(docId: string, dto: UpdateOriginalDocumentStatusDto): Promise<ShipmentDocument> {
    const doc = await this.shipmentDocRepo.findOne({ where: { shipmentDocumentId: docId } });
    if (!doc) {
      throw new NotFoundException(`Shipment document #${docId} not found`);
    }
    doc.originalDocumentStatus = dto.status;
    if (dto.releaseDate) doc.releaseDate = dto.releaseDate;
    return this.shipmentDocRepo.save(doc);
  }

  // Story IMP-31: Shipment Logistics Cockpit Overview
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

    const activeBooking = bookings.find((b) => b.bookingStatus === 'CONFIRMED') || bookings[0] || null;
    const selectedQuotation = quotations.find((q) => q.selectionStatus === 'SELECTED') || null;

    // Calculate action items / alerts
    const alerts: string[] = [];
    if (!selectedQuotation && quotations.length === 0) {
      alerts.push('No freight quotation recorded yet.');
    } else if (!selectedQuotation) {
      alerts.push('Freight quotations recorded but none selected yet.');
    }

    if (!activeBooking) {
      alerts.push('No confirmed ocean/air vessel booking registered.');
    }

    if (containers.length === 0) {
      alerts.push('No container allocations recorded for this shipment.');
    }

    const unverifiedDocs = docs.filter((d) => d.verificationStatus === 'PENDING' || d.verificationStatus === 'REJECTED');
    if (unverifiedDocs.length > 0) {
      alerts.push(`${unverifiedDocs.length} shipping documents awaiting verification or rejected.`);
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
      qb.andWhere('(n.recipientUserId = :userId OR n.recipientUserId IS NULL)', { userId: params.userId });
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

  // Story IMP-40: Automated scan of upcoming deadlines and alerts
  async generateAutomatedImportAlerts(): Promise<number> {
    let createdCount = 0;
    const now = new Date();
    const upcomingDays = 7;
    const futureLimit = new Date(now.getTime() + upcomingDays * 24 * 60 * 60 * 1000);

    // 1. Container Free Time / Demurrage
    const containers = await this.containerRepo.find({
      relations: ['shipment'],
      where: { containerStatus: In(['LOADED', 'IN_TRANSIT', 'DISCHARGED', 'AT_PORT']) },
    });

    for (const c of containers) {
      if (c.emptyReturnDueDate && new Date(c.emptyReturnDueDate) <= futureLimit) {
        const existing = await this.notificationRepo.findOne({
          where: {
            eventType: 'CONTAINER_RETURN_DEADLINE_APPROACHING',
            entityType: 'CONTAINER',
            entityId: c.containerId,
          },
        });
        if (!existing) {
          await this.notificationRepo.save(
            this.notificationRepo.create({
              eventType: 'CONTAINER_RETURN_DEADLINE_APPROACHING',
              recipientRole: 'LOGISTICS_OFFICER',
              entityType: 'CONTAINER',
              entityId: c.containerId,
              title: `Container ${c.containerNumber} Demurrage Deadline Approaching`,
              message: `Container ${c.containerNumber} on Shipment ${c.shipment?.shipmentNumber} is due for empty return on ${c.emptyReturnDueDate}.`,
              severity: 'WARNING',
            }),
          );
          createdCount++;
        }
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
      };
    });
  }

  // Story IMP-46: Document Completeness Report
  async getDocumentCompletenessReport(): Promise<any> {
    const docs = await this.shipmentDocRepo.find({
      relations: ['shipment', 'purchaseOrder', 'verifier'],
      order: { createdAt: 'DESC' },
    });

    const statusCounts: Record<string, number> = {
      PENDING: 0,
      VERIFIED: 0,
      REJECTED: 0,
      EXPIRED: 0,
    };

    for (const d of docs) {
      statusCounts[d.verificationStatus] = (statusCounts[d.verificationStatus] || 0) + 1;
    }

    return {
      totalDocuments: docs.length,
      statusCounts,
      documents: docs.map((d) => ({
        shipmentDocumentId: d.shipmentDocumentId,
        shipmentNumber: d.shipment?.shipmentNumber,
        poNumber: d.purchaseOrder?.poNumber || '—',
        documentType: d.documentType,
        documentReference: d.documentReference || '—',
        verificationStatus: d.verificationStatus,
        originalStatus: d.originalDocumentStatus,
        originalDocumentStatus: d.originalDocumentStatus,
        issueDate: d.issueDate,
        expiryDate: d.expiryDate,
        verifiedBy: d.verifier?.fullName || '—',
        verifiedByEmail: d.verifier?.email || d.verifier?.fullName || '—',
        verifiedAt: d.verifiedAt,
      })),
    };
  }

  // Story IMP-47: Import Reconciliation Report
  async getImportReconciliationReport(): Promise<any> {
    const pos = await this.poRepo.find({
      relations: ['lines', 'lines.item', 'supplier'],
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

    return {
      activeShipmentsCount: pipeline.totalActiveShipments,
      totalShipmentsCount: pipeline.totalShipments,
      inlandTransitCount: pipeline.totalInlandTransit,
      activeContainersCount: activeContainers,
      unverifiedDocumentsCount: (docsReport.statusCounts.PENDING || 0) + (docsReport.statusCounts.REJECTED || 0),
      freightForwardersCount: forwarders.length,
      stageBreakdown: pipeline.stageBreakdown,
      recentShipments: logistics.slice(0, 10),
    };
  }
}
