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

export interface CreateShipmentLineDto {
  poLineId: string;
  quantityShipped: number;
}

export interface CreateShipmentDto {
  expectedArrivalDate?: string;
  billOfLadingNumber?: string;
  allocationMethod?: AllocationMethod;
  notes?: string;
  lines: CreateShipmentLineDto[];
  userId?: number;
}

export interface AddCostComponentDto {
  costComponentTypeId: number;
  amount: number;
  currency: 'ETB' | 'USD' | 'EUR';
  exchangeRateToEtb?: number;
  notes?: string;
  userId?: number;
}

export interface ReceiveShipmentLineDto {
  shipmentLineId: string;
  quantityReceived: number;
  warehouseId?: number;
  notes?: string;
  vehicles?: {
    chassisNumber: string;
    engineNumber: string;
  }[];
  userId?: number;
}

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
      const shipment = queryRunner.manager.create(Shipment, {
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

    return shipment;
  }

  async updateStage(
    id: string,
    targetStage: ShipmentStage,
    notes?: string,
    userId?: number,
  ): Promise<Shipment> {
    const shipment = await this.findOne(id);

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

    // Record in history if trigger didn't catch notes
    if (notes) {
      const history = this.stageHistoryRepo.create({
        shipmentId: id,
        fromStage: shipment.currentStage,
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

    // Determine exchange rate
    let rate = dto.exchangeRateToEtb;
    if (!rate) {
      if (dto.currency === 'ETB') {
        rate = 1.0;
      } else {
        const defaultRate = await this.exchangeRateRepo.findOne({
          where: { currency: dto.currency },
        });
        rate = defaultRate ? Number(defaultRate.rateToEtb) : 125.0;
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
      notes: dto.notes,
      createdBy: dto.userId,
    });

    return this.costRepo.save(cost);
  }

  async removeCostComponent(costComponentId: string): Promise<void> {
    const cost = await this.costRepo.findOne({ where: { costComponentId } });
    if (!cost) {
      throw new NotFoundException(`Cost Component #${costComponentId} not found`);
    }
    await this.costRepo.remove(cost);
  }

  async receiveLine(shipmentId: string, dto: ReceiveShipmentLineDto): Promise<ShipmentReceipt> {
    const shipment = await this.findOne(shipmentId);
    const line = shipment.lines.find((l) => String(l.shipmentLineId) === String(dto.shipmentLineId));
    if (!line) {
      throw new BadRequestException(`Shipment line #${dto.shipmentLineId} not found in this shipment`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Record shipment_receipt (trigger enforces quantityReceived <= quantityShipped under lock)
      const receipt = queryRunner.manager.create(ShipmentReceipt, {
        shipmentLineId: dto.shipmentLineId,
        quantityReceived: dto.quantityReceived,
        warehouseId: dto.warehouseId,
        notes: dto.notes,
        receivedBy: dto.userId,
      });

      const savedReceipt = await queryRunner.manager.save(ShipmentReceipt, receipt);

      // 2. If serialized vehicles are provided (Story R1), create vehicle_unit records
      if (dto.vehicles && dto.vehicles.length > 0) {
        const itemId = line.poLine?.itemId;
        if (!itemId) {
          throw new BadRequestException('Cannot register vehicles: item ID missing on PO line');
        }

        const vehicleUnits: VehicleUnit[] = [];
        for (const v of dto.vehicles) {
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
        await queryRunner.manager.save(VehicleUnit, vehicleUnits);
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
