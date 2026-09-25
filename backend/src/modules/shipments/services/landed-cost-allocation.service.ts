import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Shipment, AllocationMethod } from '../entities/shipment.entity';
import { ShipmentLine } from '../entities/shipment-line.entity';
import { ShipmentCostComponent } from '../entities/shipment-cost-component.entity';
import { ShipmentLineLandedCost } from '../entities/shipment-line-landed-cost.entity';
import { VehicleUnitLandedCost } from '../entities/vehicle-unit-landed-cost.entity';
import { VehicleUnit } from '../../vehicles/entities/vehicle-unit.entity';
import { ExchangeRateDefault } from '../entities/exchange-rate-default.entity';

export interface AllocationResultItem {
  shipmentLineId: string;
  itemId: string;
  itemName: string;
  quantityShipped: number;
  basisValue: number;
  fobValueEtb: number;
  allocatedAdditionalCostEtb: number;
  allocatedCostEtb: number;
  unitCostEtb: number;
}

export interface LandedCostReport {
  shipmentId: string;
  shipmentNumber: string;
  allocationMethod: AllocationMethod;
  totalCostEtb: number;
  costComponents: {
    typeCode: string;
    typeName: string;
    currency: string;
    amount: number;
    exchangeRateToEtb: number;
    amountEtb: number;
  }[];
  lines: AllocationResultItem[];
  vehicleUnits: {
    vehicleUnitId: string;
    chassisNumber: string;
    engineNumber: string;
    shipmentLineId: string;
    landedCostEtb: number;
  }[];
}

@Injectable()
export class LandedCostAllocationService {
  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepo: Repository<Shipment>,
    @InjectRepository(ShipmentLine)
    private readonly shipmentLineRepo: Repository<ShipmentLine>,
    @InjectRepository(ShipmentCostComponent)
    private readonly costRepo: Repository<ShipmentCostComponent>,
    @InjectRepository(ShipmentLineLandedCost)
    private readonly lineCostRepo: Repository<ShipmentLineLandedCost>,
    @InjectRepository(VehicleUnitLandedCost)
    private readonly unitCostRepo: Repository<VehicleUnitLandedCost>,
    @InjectRepository(VehicleUnit)
    private readonly vehicleUnitRepo: Repository<VehicleUnit>,
    @InjectRepository(ExchangeRateDefault)
    private readonly exchangeRateRepo: Repository<ExchangeRateDefault>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Pure mathematical function implementing Largest Remainder Method (Hare-Niemeyer).
   * Guaranteed ZERO rounding drift: sum(allocated) === totalCost.
   */
  distributeAmountZeroDrift(totalCost: number, weights: number[]): number[] {
    if (weights.length === 0) return [];
    if (weights.length === 1) return [Math.round(totalCost * 100) / 100];

    const totalCents = Math.round(totalCost * 100);
    const sumWeights = weights.reduce((acc, w) => acc + (w > 0 ? w : 0), 0);

    // If all weights are 0, distribute evenly
    const effectiveWeights = sumWeights > 0 ? weights : weights.map(() => 1);
    const effectiveSum = effectiveWeights.reduce((acc, w) => acc + w, 0);

    const exactShares = effectiveWeights.map((w) => (w / effectiveSum) * totalCents);
    const baseCents = exactShares.map((s) => Math.floor(s));
    const remainders = exactShares.map((s, idx) => ({ idx, rem: s - baseCents[idx] }));

    const allocatedCents = baseCents.reduce((a, b) => a + b, 0);
    const discrepancy = totalCents - allocatedCents; // Cents to distribute

    // Sort by remainder descending
    remainders.sort((a, b) => b.rem - a.rem);

    // Give 1 cent to the top 'discrepancy' items
    for (let i = 0; i < discrepancy; i++) {
      baseCents[remainders[i].idx] += 1;
    }

    return baseCents.map((cents) => cents / 100);
  }

  async calculateAndPersistAllocation(
    shipmentId: string,
    overrideMethod?: AllocationMethod,
    userId?: number,
  ): Promise<LandedCostReport> {
    const shipment = await this.shipmentRepo.findOne({
      where: { shipmentId },
      relations: [
        'lines',
        'lines.poLine',
        'lines.poLine.item',
        'costComponents',
        'costComponents.costComponentType',
      ],
    });

    if (!shipment) {
      throw new BadRequestException(`Shipment #${shipmentId} not found`);
    }

    if (!shipment.lines || shipment.lines.length === 0) {
      throw new BadRequestException('Shipment has no line items to allocate costs across');
    }

    const method = overrideMethod || shipment.allocationMethod || 'BY_VALUE';
    const exchangeRates = await this.exchangeRateRepo.find();
    const rateByCurrency = new Map(exchangeRates.map((rate) => [rate.currency, Number(rate.rateToEtb)]));
    rateByCurrency.set('ETB', 1);

    // 1. Compute total landed cost in ETB: FOB/CIF PO value plus added landed cost components.
    const totalComponentCostEtb = shipment.costComponents.reduce((sum, c) => {
      const etb = Number(c.amount) * Number(c.exchangeRateToEtb);
      return sum + etb;
    }, 0);
    const totalFobEtb = shipment.lines.reduce((sum, line) => {
      const qty = Number(line.quantityShipped) || 0;
      const unitPrice = Number(line.poLine?.unitPrice) || 0;
      const currency = line.poLine?.currency || 'ETB';
      const rate = rateByCurrency.get(currency);
      if (!rate || rate <= 0) {
        throw new BadRequestException(`No default exchange rate is configured for ${currency}`);
      }
      return sum + qty * unitPrice * rate;
    }, 0);
    const totalCostEtb = totalFobEtb + totalComponentCostEtb;

    if (totalCostEtb <= 0) {
      throw new BadRequestException(
        'Shipment total landed cost is 0. Confirm PO line prices or record at least one cost component before allocation.',
      );
    }

    // 2. Compute basis weight for each line
    const weights: number[] = shipment.lines.map((line) => {
      const qty = Number(line.quantityShipped) || 1;
      if (method === 'BY_QUANTITY') {
        return qty;
      } else if (method === 'BY_WEIGHT') {
        const weightKg = Number(line.poLine?.item?.weightKg);
        if (!weightKg || weightKg <= 0) {
          throw new BadRequestException(
            `Product "${line.poLine?.item?.itemName || line.poLine?.itemId}" needs a positive weight before BY_WEIGHT allocation`,
          );
        }
        return qty * weightKg;
      } else {
        const unitPrice = Number(line.poLine?.unitPrice) || 0;
        const currency = line.poLine?.currency || 'ETB';
        const rate = rateByCurrency.get(currency);
        if (!rate || rate <= 0) {
          throw new BadRequestException(`No default exchange rate is configured for ${currency}`);
        }
        return qty * unitPrice * rate;
      }
    });

    // 3. Apply Zero-Rounding-Drift allocation
    const allocatedAmounts = this.distributeAmountZeroDrift(totalCostEtb, weights);

    // 4. Atomic Transaction: Archive old allocations and insert new ones
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update shipment allocation method if changed
      if (overrideMethod && overrideMethod !== shipment.allocationMethod) {
        shipment.allocationMethod = overrideMethod;
        await queryRunner.manager.save(Shipment, shipment);
      }

      // Archive previous allocations for these lines
      const lineIds = shipment.lines.map((l) => l.shipmentLineId);
      await queryRunner.manager
        .createQueryBuilder()
        .update(ShipmentLineLandedCost)
        .set({ isCurrent: false })
        .where('shipmentLineId IN (:...lineIds) AND isCurrent = true', { lineIds })
        .execute();

      // Insert new line-level landed costs
      const lineCostEntities: ShipmentLineLandedCost[] = [];
      for (let i = 0; i < shipment.lines.length; i++) {
        const line = shipment.lines[i];
        const costEntity = queryRunner.manager.create(ShipmentLineLandedCost, {
          shipmentLineId: line.shipmentLineId,
          allocatedCostEtb: allocatedAmounts[i],
          allocationBasis: method,
          isCurrent: true,
          calculatedBy: userId,
        });
        lineCostEntities.push(costEntity);
      }
      await queryRunner.manager.save(ShipmentLineLandedCost, lineCostEntities);

      // 5. If vehicles are already linked to these shipment lines, distribute line cost to units
      const linkedVehicles = await this.vehicleUnitRepo
        .createQueryBuilder('v')
        .where('v.shipmentLineId IN (:...lineIds)', { lineIds })
        .getMany();

      if (linkedVehicles.length > 0) {
        // Archive previous unit costs
        const vUnitIds = linkedVehicles.map((v) => v.vehicleUnitId);
        await queryRunner.manager
          .createQueryBuilder()
          .update(VehicleUnitLandedCost)
          .set({ isCurrent: false })
          .where('vehicleUnitId IN (:...vUnitIds) AND isCurrent = true', { vUnitIds })
          .execute();

        // For each line, divide line landed cost across its units with zero drift
        const unitCostEntities: VehicleUnitLandedCost[] = [];
        for (let i = 0; i < shipment.lines.length; i++) {
          const line = shipment.lines[i];
          const lineVehicles = linkedVehicles.filter(
            (v) => String(v.shipmentLineId) === String(line.shipmentLineId),
          );

          if (lineVehicles.length > 0) {
            const shippedQty = Number(line.quantityShipped);
            const unitCost = Math.round((allocatedAmounts[i] / shippedQty) * 100) / 100;

            for (let vIdx = 0; vIdx < lineVehicles.length; vIdx++) {
              unitCostEntities.push(
                queryRunner.manager.create(VehicleUnitLandedCost, {
                  vehicleUnitId: lineVehicles[vIdx].vehicleUnitId,
                  shipmentLineId: line.shipmentLineId,
                  landedCostEtb: unitCost,
                  isCurrent: true,
                  calculatedBy: userId,
                }),
              );
            }
          }
        }

        if (unitCostEntities.length > 0) {
          await queryRunner.manager.save(VehicleUnitLandedCost, unitCostEntities);
        }
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    return this.getLandedCostReport(shipmentId);
  }

  async getLandedCostReport(shipmentId: string): Promise<LandedCostReport> {
    const shipment = await this.shipmentRepo.findOne({
      where: { shipmentId },
      relations: [
        'lines',
        'lines.poLine',
        'lines.poLine.item',
        'costComponents',
        'costComponents.costComponentType',
      ],
    });

    if (!shipment) {
      throw new BadRequestException(`Shipment #${shipmentId} not found`);
    }

    const lineIds = shipment.lines.map((l) => l.shipmentLineId);

    const currentLineCosts = lineIds.length > 0
      ? await this.lineCostRepo
          .createQueryBuilder('lc')
          .where('lc.shipmentLineId IN (:...lineIds) AND lc.isCurrent = true', { lineIds })
          .getMany()
      : [];

    const lineCostMap = new Map<string, number>();
    for (const lc of currentLineCosts) {
      lineCostMap.set(String(lc.shipmentLineId), Number(lc.allocatedCostEtb));
    }

    const currentUnitCosts = lineIds.length > 0
      ? await this.unitCostRepo
          .createQueryBuilder('uc')
          .leftJoinAndSelect('uc.vehicleUnit', 'vu')
          .where('uc.shipmentLineId IN (:...lineIds) AND uc.isCurrent = true', { lineIds })
          .getMany()
      : [];

    const exchangeRates = await this.exchangeRateRepo.find();
    const rateByCurrency = new Map(exchangeRates.map((rate) => [rate.currency, Number(rate.rateToEtb)]));
    rateByCurrency.set('ETB', 1);

    const totalComponentCostEtb = shipment.costComponents.reduce((sum, c) => {
      return sum + Number(c.amount) * Number(c.exchangeRateToEtb);
    }, 0);
    const totalFobEtb = shipment.lines.reduce((sum, line) => {
      const qty = Number(line.quantityShipped) || 0;
      const unitPrice = Number(line.poLine?.unitPrice) || 0;
      const currency = line.poLine?.currency || 'ETB';
      const rate = rateByCurrency.get(currency) || 0;
      return sum + qty * unitPrice * rate;
    }, 0);
    const totalCostEtb = totalFobEtb + totalComponentCostEtb;

    const totalAllocated = Array.from(lineCostMap.values()).reduce((sum, value) => sum + value, 0);
    const additionalCostRatio = totalAllocated > 0 ? totalComponentCostEtb / totalAllocated : 0;

    const lines: AllocationResultItem[] = shipment.lines.map((line) => {
      const qty = Number(line.quantityShipped) || 1;
      const allocated = lineCostMap.get(String(line.shipmentLineId)) || 0;
      const currency = line.poLine?.currency || 'ETB';
      const rate = rateByCurrency.get(currency) || 0;
      const fobValueEtb = qty * (Number(line.poLine?.unitPrice) || 0) * rate;
      const allocatedAdditionalCostEtb = Math.round(allocated * additionalCostRatio * 100) / 100;
      return {
        shipmentLineId: line.shipmentLineId,
        itemId: line.poLine?.itemId || '',
        itemName: line.poLine?.item?.itemName || 'Product Item',
        quantityShipped: qty,
        basisValue: Number(line.poLine?.unitPrice) || 0,
        fobValueEtb: Math.round(fobValueEtb * 100) / 100,
        allocatedAdditionalCostEtb,
        allocatedCostEtb: allocated,
        unitCostEtb: qty > 0 ? Math.round((allocated / qty) * 100) / 100 : 0,
      };
    });

    return {
      shipmentId: shipment.shipmentId,
      shipmentNumber: shipment.shipmentNumber,
      allocationMethod: shipment.allocationMethod,
      totalCostEtb: Math.round(totalCostEtb * 100) / 100,
      costComponents: shipment.costComponents.map((c) => ({
        typeCode: c.costComponentType?.typeCode || '',
        typeName: c.costComponentType?.typeName || 'Cost Component',
        currency: c.currency,
        amount: Number(c.amount),
        exchangeRateToEtb: Number(c.exchangeRateToEtb),
        amountEtb: Math.round(Number(c.amount) * Number(c.exchangeRateToEtb) * 100) / 100,
      })),
      lines,
      vehicleUnits: currentUnitCosts.map((u) => ({
        vehicleUnitId: u.vehicleUnitId,
        chassisNumber: u.vehicleUnit?.chassisNumber || '',
        engineNumber: u.vehicleUnit?.engineNumber || '',
        shipmentLineId: u.shipmentLineId,
        landedCostEtb: Number(u.landedCostEtb),
      })),
    };
  }
}
