import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PurchaseOrder, POStatus } from './entities/purchase-order.entity';
import { PurchaseOrderLine } from './entities/purchase-order-line.entity';
import { CreatePODto, UpdatePODto } from './dto/purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderLine)
    private readonly poLineRepo: Repository<PurchaseOrderLine>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreatePODto): Promise<PurchaseOrder> {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException('Purchase Order must have at least one line item');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const po = queryRunner.manager.create(PurchaseOrder, {
        supplierId: dto.supplierId,
        poDate: dto.poDate || new Date().toISOString().split('T')[0],
        currency: dto.currency,
        status: POStatus.DRAFT,
        notes: dto.notes,
        createdBy: dto.userId,
        updatedBy: dto.userId,
      });

      const savedPo = await queryRunner.manager.save(PurchaseOrder, po);

      const lines = dto.lines.map((l) =>
        queryRunner.manager.create(PurchaseOrderLine, {
          poId: savedPo.poId,
          itemId: l.itemId,
          quantityOrdered: l.quantityOrdered,
          unitPrice: l.unitPrice,
          currency: dto.currency,
        }),
      );

      await queryRunner.manager.save(PurchaseOrderLine, lines);
      await queryRunner.commitTransaction();

      return this.findOne(savedPo.poId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(params?: {
    search?: string;
    status?: POStatus;
    supplierId?: number;
    page?: number;
    limit?: number;
  }): Promise<{ items: PurchaseOrder[]; total: number; page: number; limit: number }> {
    const page = Number(params?.page) || 1;
    const limit = Number(params?.limit) || 20;
    const skip = (page - 1) * limit;

    const query = this.poRepo
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .leftJoinAndSelect('po.lines', 'lines')
      .leftJoinAndSelect('lines.item', 'item');

    if (params?.search) {
      query.andWhere(
        '(po.poNumber ILIKE :search OR supplier.supplierName ILIKE :search OR po.notes ILIKE :search)',
        { search: `%${params.search}%` },
      );
    }

    if (params?.status) {
      query.andWhere('po.status = :status', { status: params.status });
    }

    if (params?.supplierId) {
      query.andWhere('po.supplierId = :supplierId', { supplierId: params.supplierId });
    }

    query.orderBy('po.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await query.getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<PurchaseOrder> {
    const po = await this.poRepo.findOne({
      where: { poId: id },
      relations: ['supplier', 'lines', 'lines.item', 'creator', 'updater'],
    });
    if (!po) {
      throw new NotFoundException(`Purchase Order #${id} not found`);
    }
    return po;
  }

  async update(id: string, dto: UpdatePODto): Promise<PurchaseOrder> {
    const po = await this.findOne(id);
    if (po.status !== POStatus.DRAFT) {
      throw new BadRequestException(`Cannot edit PO in ${po.status} status`);
    }

    Object.assign(po, {
      supplierId: dto.supplierId ?? po.supplierId,
      poDate: dto.poDate ?? po.poDate,
      currency: dto.currency ?? po.currency,
      notes: dto.notes ?? po.notes,
      updatedBy: dto.userId,
    });

    return this.poRepo.save(po);
  }

  async updateStatus(id: string, status: POStatus, userId?: number): Promise<PurchaseOrder> {
    const po = await this.findOne(id);

    // Validate valid state transitions
    const validTransitions: Record<POStatus, POStatus[]> = {
      [POStatus.DRAFT]: [POStatus.SUBMITTED, POStatus.CANCELLED],
      [POStatus.SUBMITTED]: [POStatus.CONFIRMED, POStatus.DRAFT, POStatus.CANCELLED],
      [POStatus.CONFIRMED]: [POStatus.PARTIALLY_RECEIVED, POStatus.RECEIVED, POStatus.CANCELLED],
      [POStatus.PARTIALLY_RECEIVED]: [POStatus.RECEIVED],
      [POStatus.RECEIVED]: [],
      [POStatus.CANCELLED]: [],
    };

    if (!validTransitions[po.status].includes(status)) {
      throw new BadRequestException(
        `Invalid status transition from ${po.status} to ${status}`,
      );
    }

    po.status = status;
    po.updatedBy = userId;
    return this.poRepo.save(po);
  }

  async getOpenPOLines(supplierId?: number): Promise<PurchaseOrderLine[]> {
    const query = this.poLineRepo
      .createQueryBuilder('pol')
      .leftJoinAndSelect('pol.purchaseOrder', 'po')
      .leftJoinAndSelect('pol.item', 'item')
      .where('po.status IN (:...statuses)', {
        statuses: [POStatus.CONFIRMED, POStatus.PARTIALLY_RECEIVED],
      });

    if (supplierId) {
      query.andWhere('po.supplierId = :supplierId', { supplierId });
    }

    const lines = await query.getMany();
    if (lines.length === 0) {
      return lines;
    }

    const shippedRows = await this.dataSource
      .createQueryBuilder()
      .select('sl.po_line_id', 'poLineId')
      .addSelect('COALESCE(SUM(sl.quantity_shipped), 0)', 'quantityShipped')
      .from('shipment_line', 'sl')
      .where('sl.po_line_id IN (:...poLineIds)', { poLineIds: lines.map((line) => line.poLineId) })
      .groupBy('sl.po_line_id')
      .getRawMany<{ poLineId: string; quantityShipped: string }>();

    const shippedByLine = new Map(shippedRows.map((row) => [String(row.poLineId), Number(row.quantityShipped)]));

    return lines
      .map((line) => {
        const remainingQuantity = Number(line.quantityOrdered) - (shippedByLine.get(String(line.poLineId)) || 0);
        return Object.assign(line, { remainingQuantity });
      })
      .filter((line: PurchaseOrderLine & { remainingQuantity: number }) => line.remainingQuantity > 0);
  }

  async getPOStatusReport(): Promise<any> {
    const pos = await this.poRepo.find({
      relations: ['supplier', 'lines', 'lines.item'],
      order: { poDate: 'DESC' },
    });

    const statusCounts: Record<string, number> = {
      [POStatus.DRAFT]: 0,
      [POStatus.SUBMITTED]: 0,
      [POStatus.CONFIRMED]: 0,
      [POStatus.PARTIALLY_RECEIVED]: 0,
      [POStatus.RECEIVED]: 0,
      [POStatus.CANCELLED]: 0,
    };

    const currencyTotals: Record<string, number> = {};
    let totalOrderedUnits = 0;

    for (const po of pos) {
      statusCounts[po.status] = (statusCounts[po.status] || 0) + 1;
      const curr = po.currency || 'USD';
      let poTotal = 0;

      if (po.lines) {
        for (const line of po.lines) {
          const qty = Number(line.quantityOrdered || 0);
          const price = Number(line.unitPrice || 0);
          poTotal += qty * price;
          totalOrderedUnits += qty;
        }
      }
      currencyTotals[curr] = (currencyTotals[curr] || 0) + poTotal;
    }

    return {
      totalPOs: pos.length,
      statusCounts,
      currencyTotals,
      totalOrderedUnits,
      recentPOs: pos.slice(0, 10).map((p) => {
        let total = 0;
        if (p.lines) {
          for (const l of p.lines) {
            total += Number(l.quantityOrdered || 0) * Number(l.unitPrice || 0);
          }
        }
        return {
          poId: p.poId,
          poNumber: p.poNumber,
          supplierName: p.supplier?.supplierName || 'Unknown',
          currency: p.currency,
          totalAmount: total,
          status: p.status,
          poDate: p.poDate,
          linesCount: p.lines?.length || 0,
        };
      }),
    };
  }
}

