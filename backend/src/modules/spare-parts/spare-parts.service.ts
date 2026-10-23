import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Like } from 'typeorm';
import { ProductItem } from '../products/entities/product-item.entity';
import { ProductCategory } from '../products/entities/product-category.entity';
import { Brand } from '../products/entities/brand.entity';
import { UnitOfMeasure } from '../products/entities/unit-of-measure.entity';
import { TaxConfiguration } from '../products/entities/tax-configuration.entity';
import { SparePartVehicleCompatibility } from '../products/entities/spare-part-vehicle-compatibility.entity';
import { SparePartsSale, SparePartsSaleStatus } from '../products/entities/spare-parts-sale.entity';
import { SparePartsSaleItem } from '../products/entities/spare-parts-sale-item.entity';
import { StockBalance } from '../inventory/entities/stock-balance.entity';
import { Warehouse } from '../lookups/entities/warehouse.entity';
import { Customer } from '../customers/entities/customer.entity';
import { AuditService } from '../audit/audit.service';
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { UpdateSparePartDto } from './dto/update-spare-part.dto';
import { CreateSparePartsSaleDto } from './dto/create-spare-parts-sale.dto';
import { SparePartsQueryDto } from './dto/spare-parts-query.dto';

@Injectable()
export class SparePartsService {
  constructor(
    @InjectRepository(ProductItem)
    private readonly productRepo: Repository<ProductItem>,
    @InjectRepository(ProductCategory)
    private readonly categoryRepo: Repository<ProductCategory>,
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
    @InjectRepository(UnitOfMeasure)
    private readonly uomRepo: Repository<UnitOfMeasure>,
    @InjectRepository(TaxConfiguration)
    private readonly taxRepo: Repository<TaxConfiguration>,
    @InjectRepository(SparePartVehicleCompatibility)
    private readonly compatRepo: Repository<SparePartVehicleCompatibility>,
    @InjectRepository(SparePartsSale)
    private readonly saleRepo: Repository<SparePartsSale>,
    @InjectRepository(SparePartsSaleItem)
    private readonly saleItemRepo: Repository<SparePartsSaleItem>,
    @InjectRepository(StockBalance)
    private readonly stockBalanceRepo: Repository<StockBalance>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  // =========================================================================
  // 1. SPARE PARTS MASTER DATA (SP-02 & SP-03)
  // =========================================================================

  async createSparePart(dto: CreateSparePartDto, userId = 1): Promise<ProductItem> {
    const existing = await this.productRepo.findOne({
      where: { itemCode: dto.itemCode.trim() },
    });
    if (existing) {
      throw new ConflictException(`Item with code "${dto.itemCode}" already exists.`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const item = this.productRepo.create({
        itemCode: dto.itemCode.trim(),
        itemName: dto.itemName.trim(),
        itemType: 'SPARE_PART',
        categoryId: dto.categoryId,
        brandId: dto.brandId || null,
        partNumber: dto.partNumber ? dto.partNumber.trim() : null,
        barcode: dto.barcode ? dto.barcode.trim() : null,
        description: dto.description ? dto.description.trim() : null,
        compatibleMake: dto.compatibleMake ? dto.compatibleMake.trim() : null,
        compatibleModel: dto.compatibleModel ? dto.compatibleModel.trim() : null,
        uomId: dto.uomId,
        purchasePrice: dto.purchasePrice || 0,
        sellingPrice: dto.sellingPrice,
        taxConfigId: dto.taxConfigId || null,
        reorderLevel: dto.reorderLevel || 0,
        preferredSupplierId: dto.preferredSupplierId || null,
        usageType: dto.usageType || 'BOTH',
        isIndividuallyTracked: false,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        createdBy: userId,
      });

      const saved = await queryRunner.manager.save(item);

      if (dto.compatibilities && dto.compatibilities.length > 0) {
        const compatEntities = dto.compatibilities.map((c) =>
          this.compatRepo.create({
            sparePartId: saved.itemId,
            vehicleModel: c.vehicleModel.trim(),
            vehicleMake: c.vehicleMake ? c.vehicleMake.trim() : null,
            yearFrom: c.yearFrom || null,
            yearTo: c.yearTo || null,
            notes: c.notes || null,
            createdBy: userId,
          }),
        );
        await queryRunner.manager.save(compatEntities);
      }

      await queryRunner.commitTransaction();

      await this.auditService.log({
        entityType: 'SPARE_PARTS',
        entityId: String(saved.itemId),
        action: 'INSERT',
        changedBy: userId,
        newValue: { itemCode: saved.itemCode, itemName: saved.itemName, sellingPrice: saved.sellingPrice },
      });

      return this.getSparePartById(saved.itemId);
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(err.message || 'Failed to create spare part');
    } finally {
      await queryRunner.release();
    }
  }

  async getSpareParts(query: SparePartsQueryDto): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'cat')
      .leftJoinAndSelect('p.brand', 'brand')
      .leftJoinAndSelect('p.uom', 'uom')
      .leftJoinAndSelect('p.taxConfig', 'tax')
      .where("p.itemType = 'SPARE_PART'");

    if (query.search) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(p.itemCode) LIKE :term OR LOWER(p.itemName) LIKE :term OR LOWER(p.partNumber) LIKE :term OR LOWER(p.barcode) LIKE :term OR LOWER(p.compatibleModel) LIKE :term)',
        { term },
      );
    }

    if (query.categoryId) {
      qb.andWhere('p.categoryId = :catId', { catId: query.categoryId });
    }

    if (query.brandId) {
      qb.andWhere('p.brandId = :brandId', { brandId: query.brandId });
    }

    if (query.model) {
      qb.andWhere('(LOWER(p.compatibleModel) LIKE :model OR LOWER(p.model) LIKE :model)', {
        model: `%${query.model.toLowerCase()}%`,
      });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('p.isActive = :isActive', { isActive: query.isActive });
    }

    if (query.usageType) {
      qb.andWhere('p.usageType = :usageType', { usageType: query.usageType });
    }

    qb.orderBy('p.itemId', 'DESC');
    const [rawItems, total] = await qb.skip(offset).take(limit).getManyAndCount();

    // Enrich with total stock across warehouses
    const itemIds = rawItems.map((i) => i.itemId);
    let stockMap: Record<string, { onHand: number; reserved: number; available: number }> = {};

    if (itemIds.length > 0) {
      const balances = await this.dataSource.query(
        `
        SELECT
          item_id,
          COALESCE(SUM(quantity_on_hand), 0) AS on_hand,
          COALESCE(SUM(quantity_reserved), 0) AS reserved,
          COALESCE(SUM(quantity_on_hand - quantity_reserved), 0) AS available
        FROM stock_balance
        WHERE item_id = ANY($1::bigint[])
        GROUP BY item_id
      `,
        [itemIds],
      );

      for (const b of balances) {
        stockMap[String(b.item_id)] = {
          onHand: Number(b.on_hand),
          reserved: Number(b.reserved),
          available: Number(b.available),
        };
      }
    }

    const items = rawItems.map((item) => {
      const stock = stockMap[item.itemId] || { onHand: 0, reserved: 0, available: 0 };
      const isLowStock = stock.available <= (item.reorderLevel || 0);
      return {
        ...item,
        stock,
        isLowStock,
      };
    });

    return { items, total, page, limit };
  }

  async getSparePartById(id: string): Promise<any> {
    const item = await this.productRepo.findOne({
      where: { itemId: id, itemType: 'SPARE_PART' },
      relations: ['category', 'brand', 'uom', 'taxConfig'],
    });

    if (!item) {
      throw new NotFoundException(`Spare part with ID #${id} not found.`);
    }

    const compatibilities = await this.compatRepo.find({
      where: { sparePartId: id },
      order: { vehicleModel: 'ASC' },
    });

    const stockBalances = await this.dataSource.query(
      `
      SELECT
        sb.warehouse_id,
        w.warehouse_name,
        sb.quantity_on_hand,
        sb.quantity_reserved,
        (sb.quantity_on_hand - sb.quantity_reserved) AS quantity_available,
        sb.updated_at
      FROM stock_balance sb
      JOIN warehouse w ON w.warehouse_id = sb.warehouse_id
      WHERE sb.item_id = $1
      ORDER BY w.warehouse_name ASC
    `,
      [id],
    );

    const totalStock = stockBalances.reduce(
      (acc: any, b: any) => ({
        onHand: acc.onHand + Number(b.quantity_on_hand),
        reserved: acc.reserved + Number(b.quantity_reserved),
        available: acc.available + Number(b.quantity_available),
      }),
      { onHand: 0, reserved: 0, available: 0 },
    );

    return {
      ...item,
      compatibilities,
      stockBalances,
      totalStock,
      isLowStock: totalStock.available <= (item.reorderLevel || 0),
    };
  }

  async updateSparePart(id: string, dto: UpdateSparePartDto, userId = 1): Promise<any> {
    const item = await this.productRepo.findOne({
      where: { itemId: id, itemType: 'SPARE_PART' },
    });
    if (!item) {
      throw new NotFoundException(`Spare part with ID #${id} not found.`);
    }

    if (dto.itemCode && dto.itemCode.trim() !== item.itemCode) {
      const conflict = await this.productRepo.findOne({
        where: { itemCode: dto.itemCode.trim() },
      });
      if (conflict && conflict.itemId !== id) {
        throw new ConflictException(`Item with code "${dto.itemCode}" is already taken.`);
      }
    }

    const oldState = { ...item };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (dto.itemCode) item.itemCode = dto.itemCode.trim();
      if (dto.itemName) item.itemName = dto.itemName.trim();
      if (dto.categoryId !== undefined) item.categoryId = dto.categoryId;
      if (dto.brandId !== undefined) item.brandId = dto.brandId;
      if (dto.partNumber !== undefined) item.partNumber = dto.partNumber ? dto.partNumber.trim() : null;
      if (dto.barcode !== undefined) item.barcode = dto.barcode ? dto.barcode.trim() : null;
      if (dto.description !== undefined) item.description = dto.description ? dto.description.trim() : null;
      if (dto.compatibleMake !== undefined) item.compatibleMake = dto.compatibleMake ? dto.compatibleMake.trim() : null;
      if (dto.compatibleModel !== undefined) item.compatibleModel = dto.compatibleModel ? dto.compatibleModel.trim() : null;
      if (dto.uomId !== undefined) item.uomId = dto.uomId;
      if (dto.purchasePrice !== undefined) item.purchasePrice = dto.purchasePrice;
      if (dto.sellingPrice !== undefined) item.sellingPrice = dto.sellingPrice;
      if (dto.taxConfigId !== undefined) item.taxConfigId = dto.taxConfigId;
      if (dto.reorderLevel !== undefined) item.reorderLevel = dto.reorderLevel;
      if (dto.preferredSupplierId !== undefined) item.preferredSupplierId = dto.preferredSupplierId;
      if (dto.usageType !== undefined) item.usageType = dto.usageType;
      if (dto.isActive !== undefined) item.isActive = dto.isActive;
      item.updatedBy = userId;

      await queryRunner.manager.save(item);

      if (dto.compatibilities !== undefined) {
        await queryRunner.manager.delete(SparePartVehicleCompatibility, { sparePartId: id });
        if (dto.compatibilities && dto.compatibilities.length > 0) {
          const compatEntities = dto.compatibilities.map((c) =>
            this.compatRepo.create({
              sparePartId: id,
              vehicleModel: c.vehicleModel.trim(),
              vehicleMake: c.vehicleMake ? c.vehicleMake.trim() : null,
              yearFrom: c.yearFrom || null,
              yearTo: c.yearTo || null,
              notes: c.notes || null,
              createdBy: userId,
            }),
          );
          await queryRunner.manager.save(compatEntities);
        }
      }

      await queryRunner.commitTransaction();

      await this.auditService.log({
        entityType: 'SPARE_PARTS',
        entityId: String(id),
        action: 'UPDATE',
        changedBy: userId,
        oldValue: oldState,
        newValue: item,
      });

      return this.getSparePartById(id);
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(err.message || 'Failed to update spare part');
    } finally {
      await queryRunner.release();
    }
  }

  async toggleStatus(id: string, isActive: boolean, userId = 1): Promise<any> {
    const item = await this.productRepo.findOne({
      where: { itemId: id, itemType: 'SPARE_PART' },
    });
    if (!item) {
      throw new NotFoundException(`Spare part #${id} not found.`);
    }

    const old = item.isActive;
    item.isActive = isActive;
    item.updatedBy = userId;
    await this.productRepo.save(item);

    await this.auditService.log({
      entityType: 'SPARE_PARTS',
      entityId: String(id),
      action: 'UPDATE',
      changedBy: userId,
      oldValue: { isActive: old },
      newValue: { isActive },
    });

    return { itemId: id, isActive };
  }

  async addCompatibility(sparePartId: string, dto: any, userId = 1): Promise<SparePartVehicleCompatibility> {
    const item = await this.productRepo.findOne({
      where: { itemId: sparePartId, itemType: 'SPARE_PART' },
    });
    if (!item) {
      throw new NotFoundException(`Spare part #${sparePartId} not found.`);
    }

    const compat = this.compatRepo.create({
      sparePartId,
      vehicleModel: dto.vehicleModel.trim(),
      vehicleMake: dto.vehicleMake ? dto.vehicleMake.trim() : null,
      yearFrom: dto.yearFrom || null,
      yearTo: dto.yearTo || null,
      notes: dto.notes || null,
      createdBy: userId,
    });

    return this.compatRepo.save(compat);
  }

  async removeCompatibility(compatibilityId: string): Promise<{ success: boolean }> {
    const res = await this.compatRepo.delete(compatibilityId);
    if (!res.affected) {
      throw new NotFoundException(`Compatibility record #${compatibilityId} not found.`);
    }
    return { success: true };
  }

  // =========================================================================
  // 2. INVENTORY QUANTITY MANAGEMENT (SP-04)
  // =========================================================================

  async getSparePartsStock(warehouseId?: number, lowStockOnly = false): Promise<any[]> {
    let sql = `
      SELECT
        pi.item_id,
        pi.item_code,
        pi.item_name,
        pi.part_number,
        pi.usage_type,
        pi.reorder_level,
        pi.selling_price,
        pi.purchase_price,
        uom.uom_name AS uom_code,
        cat.category_name,
        w.warehouse_id,
        w.warehouse_name,
        COALESCE(sb.quantity_on_hand, 0) AS quantity_on_hand,
        COALESCE(sb.quantity_reserved, 0) AS quantity_reserved,
        COALESCE(sb.quantity_on_hand - sb.quantity_reserved, 0) AS quantity_available,
        CASE
          WHEN COALESCE(sb.quantity_on_hand - sb.quantity_reserved, 0) <= pi.reorder_level THEN true
          ELSE false
        END AS is_low_stock
      FROM product_item pi
      CROSS JOIN warehouse w
      LEFT JOIN stock_balance sb ON sb.item_id = pi.item_id AND sb.warehouse_id = w.warehouse_id
      LEFT JOIN unit_of_measure uom ON uom.uom_id = pi.uom_id
      LEFT JOIN product_category cat ON cat.category_id = pi.category_id
      WHERE pi.item_type = 'SPARE_PART' AND pi.is_active = true
    `;

    const params: any[] = [];
    if (warehouseId) {
      params.push(warehouseId);
      sql += ` AND w.warehouse_id = $${params.length}`;
    }

    if (lowStockOnly) {
      sql += ` AND COALESCE(sb.quantity_on_hand - sb.quantity_reserved, 0) <= pi.reorder_level`;
    }

    sql += ` ORDER BY pi.item_code ASC, w.warehouse_name ASC`;

    const rows = await this.dataSource.query(sql, params);
    return rows.map((r: any) => ({
      itemId: r.item_id,
      itemCode: r.item_code,
      itemName: r.item_name,
      partNumber: r.part_number,
      usageType: r.usage_type || 'BOTH',
      reorderLevel: Number(r.reorder_level),
      sellingPrice: Number(r.selling_price),
      purchasePrice: Number(r.purchase_price),
      uomCode: r.uom_code,
      categoryName: r.category_name,
      warehouseId: Number(r.warehouse_id),
      warehouseName: r.warehouse_name,
      quantityOnHand: Number(r.quantity_on_hand),
      quantityReserved: Number(r.quantity_reserved),
      quantityAvailable: Number(r.quantity_available),
      isLowStock: Boolean(r.is_low_stock),
    }));
  }

  async receiveStock(dto: {
    warehouseId: number;
    itemId: string;
    quantity: number;
    sourceType?: string;
    notes?: string;
  }, userId = 1): Promise<any> {
    if (dto.quantity <= 0) {
      throw new BadRequestException('Quantity received must be greater than zero.');
    }

    const item = await this.productRepo.findOne({
      where: { itemId: dto.itemId, itemType: 'SPARE_PART' },
    });
    if (!item) {
      throw new NotFoundException(`Spare part #${dto.itemId} not found.`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const allowedSources = ['OPENING_BALANCE', 'LOCAL_PURCHASE', 'MANUAL_RECEIPT', 'CORRECTION', 'IMPORT_CONTAINER'];
      const targetSource = dto.sourceType && allowedSources.includes(dto.sourceType) ? dto.sourceType : 'OPENING_BALANCE';

      let receiptRows: any;
      try {
        receiptRows = await queryRunner.query(
          `
          INSERT INTO stock_receipt (warehouse_id, item_id, quantity, source_type, notes, received_by)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING stock_receipt_id
        `,
          [
            dto.warehouseId,
            dto.itemId,
            dto.quantity,
            targetSource,
            dto.notes || 'Spare parts stock intake',
            userId,
          ],
        );
      } catch (insertErr: any) {
        // Graceful fallback if enum value hasn't been added to PostgreSQL enum yet
        if (insertErr?.message?.includes('stock_receipt_source_enum')) {
          receiptRows = await queryRunner.query(
            `
            INSERT INTO stock_receipt (warehouse_id, item_id, quantity, source_type, notes, received_by)
            VALUES ($1, $2, $3, 'MANUAL_RECEIPT', $4, $5)
            RETURNING stock_receipt_id
          `,
            [
              dto.warehouseId,
              dto.itemId,
              dto.quantity,
              `[Source: ${targetSource}] ${dto.notes || 'Spare parts stock intake'}`,
              userId,
            ],
          );
        } else {
          throw insertErr;
        }
      }

      await queryRunner.query(
        `
        INSERT INTO stock_balance (warehouse_id, item_id, quantity_on_hand, quantity_reserved)
        VALUES ($1, $2, $3, 0)
        ON CONFLICT (warehouse_id, item_id)
        DO UPDATE SET quantity_on_hand = stock_balance.quantity_on_hand + EXCLUDED.quantity_on_hand,
                      updated_at = now()
      `,
        [dto.warehouseId, dto.itemId, dto.quantity],
      );

      await queryRunner.commitTransaction();

      await this.auditService.log({
        entityType: 'INVENTORY',
        entityId: String(dto.itemId),
        action: 'INSERT',
        changedBy: userId,
        newValue: { warehouseId: dto.warehouseId, quantity: dto.quantity, sourceType: dto.sourceType },
      });

      return {
        receiptId: receiptRows[0].stock_receipt_id,
        itemId: dto.itemId,
        warehouseId: dto.warehouseId,
        quantity: dto.quantity,
      };
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(err.message || 'Failed to receive stock');
    } finally {
      await queryRunner.release();
    }
  }

  async transferStock(dto: {
    fromWarehouseId: number;
    toWarehouseId: number;
    itemId: string;
    quantity: number;
    notes?: string;
  }, userId = 1): Promise<any> {
    if (dto.quantity <= 0) {
      throw new BadRequestException('Transfer quantity must be greater than zero.');
    }
    if (Number(dto.fromWarehouseId) === Number(dto.toWarehouseId)) {
      throw new BadRequestException('Source and destination warehouse cannot be the same facility.');
    }

    const item = await this.productRepo.findOne({
      where: { itemId: dto.itemId, itemType: 'SPARE_PART' },
    });
    if (!item) {
      throw new NotFoundException(`Spare part #${dto.itemId} not found.`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const sourceBalance = await queryRunner.query(
        `
        SELECT quantity_on_hand, quantity_reserved
        FROM stock_balance
        WHERE warehouse_id = $1 AND item_id = $2
        FOR UPDATE
      `,
        [dto.fromWarehouseId, dto.itemId],
      );

      const onHand = sourceBalance.length > 0 ? Number(sourceBalance[0].quantity_on_hand) : 0;
      const reserved = sourceBalance.length > 0 ? Number(sourceBalance[0].quantity_reserved) : 0;
      const available = onHand - reserved;

      if (available < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock at source warehouse #${dto.fromWarehouseId} for ${item.itemCode}. Available: ${available}, Requested: ${dto.quantity}`,
        );
      }

      // Decrement from source warehouse
      await queryRunner.query(
        `
        UPDATE stock_balance
        SET quantity_on_hand = quantity_on_hand - $1,
            updated_at = now()
        WHERE warehouse_id = $2 AND item_id = $3
      `,
        [dto.quantity, dto.fromWarehouseId, dto.itemId],
      );

      // Increment in destination warehouse
      await queryRunner.query(
        `
        INSERT INTO stock_balance (warehouse_id, item_id, quantity_on_hand, quantity_reserved)
        VALUES ($1, $2, $3, 0)
        ON CONFLICT (warehouse_id, item_id)
        DO UPDATE SET quantity_on_hand = stock_balance.quantity_on_hand + EXCLUDED.quantity_on_hand,
                      updated_at = now()
      `,
        [dto.toWarehouseId, dto.itemId, dto.quantity],
      );

      // Record in stock_transfer
      const transferRes = await queryRunner.query(
        `
        INSERT INTO stock_transfer (from_warehouse_id, to_warehouse_id, status, requested_by, approved_by, approved_at, completed_at)
        VALUES ($1, $2, 'COMPLETED', $3, $3, now(), now())
        RETURNING transfer_id
      `,
        [dto.fromWarehouseId, dto.toWarehouseId, userId],
      );
      const transferId = transferRes[0].transfer_id;

      await queryRunner.query(
        `
        INSERT INTO stock_transfer_line (transfer_id, item_id, quantity)
        VALUES ($1, $2, $3)
      `,
        [transferId, dto.itemId, dto.quantity],
      );

      // Record in stock_movement if table exists
      await queryRunner.query(
        `
        INSERT INTO stock_movement (warehouse_id, item_id, movement_type, quantity, reference_type, reference_id, created_by)
        VALUES ($1, $2, 'TRANSFER_OUT', $3, 'stock_transfer', $4, $5),
               ($6, $2, 'TRANSFER_IN', $3, 'stock_transfer', $4, $5)
      `,
        [dto.fromWarehouseId, dto.itemId, -dto.quantity, transferId, userId, dto.toWarehouseId],
      ).catch(() => {});

      await queryRunner.commitTransaction();

      await this.auditService.log({
        entityType: 'INVENTORY',
        entityId: String(dto.itemId),
        action: 'UPDATE',
        changedBy: userId,
        newValue: {
          transferId,
          fromWarehouseId: dto.fromWarehouseId,
          toWarehouseId: dto.toWarehouseId,
          quantity: dto.quantity,
          notes: dto.notes,
        },
      });

      // Fetch fresh balances
      const updatedSource = await this.dataSource.query(
        `SELECT quantity_on_hand FROM stock_balance WHERE warehouse_id = $1 AND item_id = $2`,
        [dto.fromWarehouseId, dto.itemId],
      );
      const updatedDest = await this.dataSource.query(
        `SELECT quantity_on_hand FROM stock_balance WHERE warehouse_id = $1 AND item_id = $2`,
        [dto.toWarehouseId, dto.itemId],
      );

      return {
        success: true,
        transferId,
        fromWarehouseId: dto.fromWarehouseId,
        toWarehouseId: dto.toWarehouseId,
        itemId: dto.itemId,
        quantity: dto.quantity,
        sourceBalanceAfter: updatedSource[0] ? Number(updatedSource[0].quantity_on_hand) : 0,
        destinationBalanceAfter: updatedDest[0] ? Number(updatedDest[0].quantity_on_hand) : 0,
      };
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(err.message || 'Failed to complete stock transfer');
    } finally {
      await queryRunner.release();
    }
  }

  // =========================================================================
  // 3. SPARE PARTS SALES & POS (SP-05 & SP-06)
  // =========================================================================

  async createSparePartsSale(dto: CreateSparePartsSaleDto, userId = 1): Promise<any> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one spare part line item is required.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const warehouse = await this.warehouseRepo.findOne({
        where: { warehouseId: dto.warehouseId },
      });
      if (!warehouse) {
        throw new NotFoundException(`Warehouse #${dto.warehouseId} not found.`);
      }

      // Check stock availability for each item with concurrency protection
      let subtotal = 0;
      let totalDiscount = 0;
      let totalVat = 0;
      const processedLines: any[] = [];

      for (const line of dto.items) {
        const item = await queryRunner.manager.findOne(ProductItem, {
          where: { itemId: line.itemId, itemType: 'SPARE_PART', isActive: true },
        });
        if (!item) {
          throw new BadRequestException(`Active spare part #${line.itemId} not found.`);
        }
        if (item.usageType === 'ASSEMBLY_ONLY') {
          throw new BadRequestException(
            `Spare part "${item.itemCode} - ${item.itemName}" is designated for "Assembly Only" and cannot be sold through POS / Counter Sales.`,
          );
        }

        // Lock stock balance row for update
        const balanceRows = await queryRunner.query(
          `
          SELECT quantity_on_hand, quantity_reserved,
                 (quantity_on_hand - quantity_reserved) AS quantity_available
          FROM stock_balance
          WHERE warehouse_id = $1 AND item_id = $2
          FOR UPDATE
        `,
          [dto.warehouseId, line.itemId],
        );

        const currentAvailable = balanceRows.length > 0 ? Number(balanceRows[0].quantity_available) : 0;
        if (currentAvailable < line.quantity) {
          throw new BadRequestException(
            `Insufficient stock for part "${item.itemCode} - ${item.itemName}" in warehouse "${warehouse.warehouseName}". Available: ${currentAvailable}, Requested: ${line.quantity}.`,
          );
        }

        const unitPrice = line.unitPrice !== undefined ? line.unitPrice : Number(item.sellingPrice);
        const discountPct = line.discountPercent || 0;
        const vatPct = line.vatPercent !== undefined ? line.vatPercent : 15;

        const lineGross = line.quantity * unitPrice;
        const lineDiscount = lineGross * (discountPct / 100);
        const lineTaxable = lineGross - lineDiscount;
        const lineVat = lineTaxable * (vatPct / 100);
        const lineTotal = lineTaxable + lineVat;

        subtotal += lineGross;
        totalDiscount += lineDiscount;
        totalVat += lineVat;

        processedLines.push({
          itemId: line.itemId,
          quantity: line.quantity,
          unitPrice,
          discountPercent: discountPct,
          vatPercent: vatPct,
          lineSubtotal: lineTaxable,
          lineVat,
          lineTotal,
          itemCode: item.itemCode,
          itemName: item.itemName,
        });
      }

      const grandTotal = subtotal - totalDiscount + totalVat;

      // 1. Insert SparePartsSale header
      const saleInsert = await queryRunner.query(
        `
        INSERT INTO spare_parts_sale (
          customer_id, customer_name, customer_phone, customer_type,
          warehouse_id, payment_method, payment_reference,
          subtotal, discount_amount, vat_amount, grand_total,
          status, notes, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'COMPLETED', $12, $13)
        RETURNING sale_id, sale_number, sale_date
      `,
        [
          dto.customerId || null,
          dto.customerName.trim(),
          dto.customerPhone ? dto.customerPhone.trim() : null,
          dto.customerType || 'DIRECT_POS',
          dto.warehouseId,
          dto.paymentMethod || 'CASH',
          dto.paymentReference ? dto.paymentReference.trim() : null,
          subtotal,
          totalDiscount,
          totalVat,
          grandTotal,
          dto.notes || null,
          userId,
        ],
      );

      const saleId = saleInsert[0].sale_id;
      const saleNumber = saleInsert[0].sale_number;
      const saleDate = saleInsert[0].sale_date;

      // 2. Insert items and deduct warehouse stock
      for (const line of processedLines) {
        await queryRunner.query(
          `
          INSERT INTO spare_parts_sale_item (
            sale_id, item_id, quantity, unit_price,
            discount_percent, vat_percent, line_subtotal, line_vat, line_total
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
          [
            saleId,
            line.itemId,
            line.quantity,
            line.unitPrice,
            line.discountPercent,
            line.vatPercent,
            line.lineSubtotal,
            line.lineVat,
            line.lineTotal,
          ],
        );

        // Deduct from stock_balance
        await queryRunner.query(
          `
          UPDATE stock_balance
          SET quantity_on_hand = quantity_on_hand - $1,
              updated_at = now()
          WHERE warehouse_id = $2 AND item_id = $3
        `,
          [line.quantity, dto.warehouseId, line.itemId],
        );
      }

      // 3. Post to customer ledger if customerId is present (Non-destructive integration)
      if (dto.customerId) {
        await queryRunner.query(
          `
          INSERT INTO customer_ledger_transaction (
            customer_id, transaction_type, reference_number, description,
            debit_amount, credit_amount, created_by
          )
          VALUES ($1, 'INVOICE_CHARGE', $2, $3, $4, 0, $5)
        `,
          [
            dto.customerId,
            saleNumber,
            `Spare Parts Purchase Invoice #${saleNumber} (${processedLines.length} item(s))`,
            grandTotal,
            userId,
          ],
        );

        // If paid immediately via CASH / BANK_TRANSFER, also log offset payment credit
        if (dto.paymentMethod === 'CASH' || dto.paymentMethod === 'BANK_TRANSFER') {
          await queryRunner.query(
            `
            INSERT INTO customer_ledger_transaction (
              customer_id, transaction_type, reference_number, description,
              debit_amount, credit_amount, created_by
            )
            VALUES ($1, 'ADDITIONAL_PAYMENT', $2, $3, 0, $4, $5)
          `,
            [
              dto.customerId,
              `PMT-${saleNumber}`,
              `Payment settled for Spare Parts Invoice #${saleNumber} via ${dto.paymentMethod}`,
              grandTotal,
              userId,
            ],
          );
        }
      }

      await queryRunner.commitTransaction();

      await this.auditService.log({
        entityType: 'SPARE_PARTS_SALES',
        entityId: String(saleId),
        action: 'INSERT',
        changedBy: userId,
        newValue: { saleNumber, grandTotal, itemsCount: processedLines.length },
      });

      return {
        saleId,
        saleNumber,
        saleDate,
        customerName: dto.customerName,
        warehouseName: warehouse.warehouseName,
        paymentMethod: dto.paymentMethod || 'CASH',
        subtotal,
        discountAmount: totalDiscount,
        vatAmount: totalVat,
        grandTotal,
        status: 'COMPLETED',
        items: processedLines,
      };
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(err.message || 'Failed to process spare parts sale');
    } finally {
      await queryRunner.release();
    }
  }

  async getSparePartsSales(query: {
    warehouseId?: number;
    customerId?: string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: any[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const qb = this.saleRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.warehouse', 'w')
      .leftJoinAndSelect('s.customer', 'c')
      .leftJoinAndSelect('s.items', 'item')
      .leftJoinAndSelect('item.item', 'product');

    if (query.warehouseId) {
      qb.andWhere('s.warehouseId = :wId', { wId: query.warehouseId });
    }
    if (query.customerId) {
      qb.andWhere('s.customerId = :cId', { cId: query.customerId });
    }
    if (query.status) {
      qb.andWhere('s.status = :status', { status: query.status });
    }
    if (query.search) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(s.saleNumber) LIKE :term OR LOWER(s.customerName) LIKE :term OR LOWER(s.paymentReference) LIKE :term)',
        { term },
      );
    }
    if (query.startDate) {
      qb.andWhere('s.saleDate >= :startDate', { startDate: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('s.saleDate <= :endDate', { endDate: query.endDate });
    }

    qb.orderBy('s.saleId', 'DESC');
    const [items, total] = await qb.skip(offset).take(limit).getManyAndCount();

    return { items, total, page, limit };
  }

  async getSparePartsSaleById(id: string): Promise<any> {
    const sale = await this.saleRepo.findOne({
      where: { saleId: id },
      relations: ['warehouse', 'customer', 'items', 'items.item', 'creator'],
    });

    if (!sale) {
      throw new NotFoundException(`Spare parts sale #${id} not found.`);
    }

    return sale;
  }

  async cancelSparePartsSale(saleId: string, reason: string, userId = 1): Promise<any> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const sale = await queryRunner.manager.findOne(SparePartsSale, {
        where: { saleId },
        relations: ['items'],
      });

      if (!sale) {
        throw new NotFoundException(`Spare parts sale #${saleId} not found.`);
      }

      if (sale.status === SparePartsSaleStatus.CANCELLED) {
        throw new BadRequestException(`Sale #${sale.saleNumber} is already cancelled.`);
      }

      // 1. Mark status as cancelled
      sale.status = SparePartsSaleStatus.CANCELLED;
      sale.notes = sale.notes ? `${sale.notes} | CANCELLED: ${reason}` : `CANCELLED: ${reason}`;
      await queryRunner.manager.save(sale);

      // 2. Reverse stock deduction: restore quantities to stock_balance
      for (const line of sale.items) {
        await queryRunner.query(
          `
          UPDATE stock_balance
          SET quantity_on_hand = quantity_on_hand + $1,
              updated_at = now()
          WHERE warehouse_id = $2 AND item_id = $3
        `,
          [line.quantity, sale.warehouseId, line.itemId],
        );
      }

      // 3. If customer was ledger-tracked, post a credit offset
      if (sale.customerId) {
        await queryRunner.query(
          `
          INSERT INTO customer_ledger_transaction (
            customer_id, transaction_type, reference_number, description,
            debit_amount, credit_amount, created_by
          )
          VALUES ($1, 'ADJUSTMENT', $2, $3, 0, $4, $5)
        `,
          [
            sale.customerId,
            `REV-${sale.saleNumber}`,
            `Reversal of cancelled Spare Parts Sale #${sale.saleNumber}: ${reason}`,
            sale.grandTotal,
            userId,
          ],
        );
      }

      await queryRunner.commitTransaction();

      await this.auditService.log({
        entityType: 'SPARE_PARTS_SALES',
        entityId: String(saleId),
        action: 'UPDATE',
        changedBy: userId,
        oldValue: { status: 'COMPLETED' },
        newValue: { status: 'CANCELLED', reason },
      });

      return {
        saleId,
        saleNumber: sale.saleNumber,
        status: 'CANCELLED',
        restoredItemsCount: sale.items.length,
      };
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException(err.message || 'Failed to cancel spare parts sale');
    } finally {
      await queryRunner.release();
    }
  }

  // =========================================================================
  // 4. REPORTS & DASHBOARD ENHANCEMENTS (SP-07)
  // =========================================================================

  async getReportsSummary(): Promise<any> {
    const totalParts = await this.productRepo.count({
      where: { itemType: 'SPARE_PART', isActive: true },
    });

    const stockAgg = await this.dataSource.query(`
      SELECT
        COALESCE(SUM(sb.quantity_on_hand), 0) AS total_on_hand,
        COALESCE(SUM(sb.quantity_reserved), 0) AS total_reserved,
        COALESCE(SUM(sb.quantity_on_hand - sb.quantity_reserved), 0) AS total_available,
        COALESCE(SUM(sb.quantity_on_hand * COALESCE(pi.purchase_price, 0)), 0) AS inventory_valuation_cost,
        COALESCE(SUM(sb.quantity_on_hand * pi.selling_price), 0) AS inventory_valuation_retail
      FROM stock_balance sb
      JOIN product_item pi ON pi.item_id = sb.item_id
      WHERE pi.item_type = 'SPARE_PART'
    `);

    const salesAgg = await this.dataSource.query(`
      SELECT
        COUNT(*) AS total_sales_count,
        COALESCE(SUM(grand_total), 0) AS total_revenue,
        COALESCE(SUM(subtotal), 0) AS total_subtotal,
        COALESCE(SUM(vat_amount), 0) AS total_vat
      FROM spare_parts_sale
      WHERE status = 'COMPLETED'
    `);

    const lowStockCount = await this.dataSource.query(`
      SELECT COUNT(*) AS count
      FROM (
        SELECT pi.item_id
        FROM product_item pi
        LEFT JOIN stock_balance sb ON sb.item_id = pi.item_id
        WHERE pi.item_type = 'SPARE_PART' AND pi.is_active = true
        GROUP BY pi.item_id, pi.reorder_level
        HAVING COALESCE(SUM(sb.quantity_on_hand - sb.quantity_reserved), 0) <= pi.reorder_level
      ) t
    `);

    const topSelling = await this.dataSource.query(`
      SELECT
        pi.item_id,
        pi.item_code,
        pi.item_name,
        COALESCE(SUM(spsi.quantity), 0) AS units_sold,
        COALESCE(SUM(spsi.line_total), 0) AS revenue
      FROM spare_parts_sale_item spsi
      JOIN spare_parts_sale sps ON sps.sale_id = spsi.sale_id
      JOIN product_item pi ON pi.item_id = spsi.item_id
      WHERE sps.status = 'COMPLETED'
      GROUP BY pi.item_id, pi.item_code, pi.item_name
      ORDER BY units_sold DESC
      LIMIT 5
    `);

    return {
      totalCatalogParts: totalParts,
      stock: {
        onHand: Number(stockAgg[0].total_on_hand),
        reserved: Number(stockAgg[0].total_reserved),
        available: Number(stockAgg[0].total_available),
        valuationAtCost: Number(stockAgg[0].inventory_valuation_cost),
        valuationAtRetail: Number(stockAgg[0].inventory_valuation_retail),
      },
      sales: {
        count: Number(salesAgg[0].total_sales_count),
        totalRevenue: Number(salesAgg[0].total_revenue),
        subtotal: Number(salesAgg[0].total_subtotal),
        vatCollected: Number(salesAgg[0].total_vat),
      },
      lowStockAlertCount: Number(lowStockCount[0].count),
      topSellingParts: topSelling.map((t: any) => ({
        itemId: t.item_id,
        itemCode: t.item_code,
        itemName: t.item_name,
        unitsSold: Number(t.units_sold),
        revenue: Number(t.revenue),
      })),
    };
  }
}
