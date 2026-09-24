import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
    private readonly dataSource: DataSource,
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
    // If advancing to ETHIOPIAN_CUSTOMS_CLEARANCE or RECEIVED, check if customs declaration document exists
    if (
      targetStage === ShipmentStage.ETHIOPIAN_CUSTOMS_CLEARANCE ||
      targetStage === ShipmentStage.RECEIVED
    ) {
      const customsDoc = await this.attachmentRepo.findOne({
        where: {
          entityType: 'shipment',
          entityId: String(id),
          documentType: 'CUSTOMS_DECLARATION',
        },
      });

      if (!customsDoc) {
        throw new BadRequestException(
          `Document Completeness Check Failed (Story D2): Cannot advance to ${targetStage} without attaching a verified 'CUSTOMS_DECLARATION' document in the Document Centre.`,
        );
      }
    }

    shipment.currentStage = targetStage;
    shipment.updatedBy = userId;
    if (targetStage === ShipmentStage.RECEIVED && !shipment.actualArrivalDate) {
      shipment.actualArrivalDate = new Date().toISOString().split('T')[0];
    }

    const saved = await this.shipmentRepo.save(shipment);

    if (notes) {
      const history = this.stageHistoryRepo.create({
        shipmentId: id,
        fromStage,
        toStage: targetStage,
        changedBy: userId,
        notes,
      });
      await this.stageHistoryRepo.save(history);
    }

    return this.findOne(id);
  }

  async addCostComponent(shipmentId: string, dto: AddCostComponentDto): Promise<ShipmentCostComponent> {
    const shipment = await this.findOne(shipmentId);
    if (shipment.currentStage === ShipmentStage.RECEIVED) {
      throw new BadRequestException('Cannot add cost components after a shipment is received');
    }

    const componentType = await this.costTypeRepo.findOne({
      where: { costComponentTypeId: dto.costComponentTypeId },
    });
    if (!componentType) {
      throw new BadRequestException(`Cost component type #${dto.costComponentTypeId} does not exist`);
    }

    let rate = dto.exchangeRateToEtb;
    if (!rate) {
      if (dto.currency === 'ETB') {
        rate = 1.0;
      } else {
        const defaultRate = await this.exchangeRateRepo.findOne({
          where: { currency: dto.currency },
        });
        if (!defaultRate) {
          throw new BadRequestException(`No default exchange rate is configured for ${dto.currency}`);
        }
        rate = Number(defaultRate.rateToEtb);
      }
    }

    if (dto.currency === 'ETB' && rate !== 1.0) {
      throw new BadRequestException('Exchange rate for ETB must always be 1.0');
    }

    const cost = this.costRepo.create({
      shipmentId,
      costComponentTypeId: dto.costComponentTypeId,
      amount: dto.amount,
      currency: dto.currency,
      exchangeRateToEtb: rate,
      amountEtb: Math.round(Number(dto.amount) * Number(rate) * 100) / 100,
      notes: dto.notes,
      createdBy: dto.userId,
    });

    const savedCost = await this.costRepo.save(cost);
    await this.invalidateCurrentAllocation(shipmentId);
    return savedCost;
  }

  async removeCostComponent(shipmentId: string, costComponentId: string): Promise<void> {
    const shipment = await this.findOne(shipmentId);
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

    const currentLineCost = await this.lineCostRepo.findOne({
      where: { shipmentLineId: dto.shipmentLineId, isCurrent: true },
    });
    if (!currentLineCost) {
      throw new BadRequestException('Allocate landed cost before receiving this shipment line');
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

      // 1. Record shipment_receipt (trigger enforces quantityReceived <= quantityShipped under lock)
      const receipt = queryRunner.manager.create(ShipmentReceipt, {
        shipmentLineId: dto.shipmentLineId,
        quantityReceived: dto.quantityReceived,
        warehouseId: dto.warehouseId,
        notes: dto.notes,
        receivedBy: dto.userId,
      });

      const savedReceipt = await queryRunner.manager.save(ShipmentReceipt, receipt);

      await queryRunner.manager.update(ShipmentLine, dto.shipmentLineId, {
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
            chassisNumber: v.chassisNumber,
            engineNumber: v.engineNumber,
            currentWarehouseId: dto.warehouseId || 1,
            currentStatus: VehicleStatus.RECEIVED,
            shipmentLineId: dto.shipmentLineId,
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
          .where('vu.shipmentLineId = :shipmentLineId', { shipmentLineId: dto.shipmentLineId })
          .getCount();

        const unitCost = Math.round((Number(currentLineCost.allocatedCostEtb) / Number(line.quantityShipped)) * 100) / 100;
        const unitCostRows = savedUnits.map((unit) =>
          queryRunner.manager.create(VehicleUnitLandedCost, {
            vehicleUnitId: unit.vehicleUnitId,
            shipmentLineId: dto.shipmentLineId,
            landedCostEtb: unitCost,
            isCurrent: true,
            calculatedBy: dto.userId,
          }),
        );

        if (receivedUnitCount <= Number(line.quantityShipped) && unitCostRows.length > 0) {
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
        shipment.currentStage = allReceived ? ShipmentStage.RECEIVED : shipment.currentStage;
        if (allReceived && !shipment.actualArrivalDate) {
          shipment.actualArrivalDate = new Date().toISOString().split('T')[0];
        }
        shipment.updatedBy = dto.userId;
        await queryRunner.manager.save(Shipment, shipment);
      }

      const poId = line.poLine?.poId;
      if (poId) {
        const poLines = await queryRunner.manager.find(PurchaseOrderLine, {
          where: { poId },
        });
        const poLineIds = poLines.map((poLine) => poLine.poLineId);
        const receivedRows = await queryRunner.manager
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
          await queryRunner.manager.update(PurchaseOrder, poId, {
            status: poAllReceived ? POStatus.RECEIVED : POStatus.PARTIALLY_RECEIVED,
            updatedBy: dto.userId,
          });
        }
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

  // Reference lookups
  async getCostComponentTypes(): Promise<CostComponentType[]> {
    return this.costTypeRepo.find({ order: { costComponentTypeId: 'ASC' } });
  }

  async getExchangeRates(): Promise<ExchangeRateDefault[]> {
    return this.exchangeRateRepo.find();
  }

  async updateExchangeRate(currency: 'ETB' | 'USD' | 'EUR', rateToEtb: number): Promise<ExchangeRateDefault> {
    let rec = await this.exchangeRateRepo.findOne({ where: { currency } });
    if (!rec) {
      rec = this.exchangeRateRepo.create({ currency, rateToEtb });
    } else {
      rec.rateToEtb = rateToEtb;
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
}
