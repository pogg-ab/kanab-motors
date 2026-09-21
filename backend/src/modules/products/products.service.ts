import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductItem } from './entities/product-item.entity';
import { ProductCategory } from './entities/product-category.entity';
import { Brand } from './entities/brand.entity';
import { UnitOfMeasure } from './entities/unit-of-measure.entity';
import { TaxConfiguration } from './entities/tax-configuration.entity';
import { CreateProductItemDto } from './dto/create-product-item.dto';
import { UpdateProductItemDto } from './dto/update-product-item.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductItem)
    private readonly itemRepo: Repository<ProductItem>,
    @InjectRepository(ProductCategory)
    private readonly categoryRepo: Repository<ProductCategory>,
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
    @InjectRepository(UnitOfMeasure)
    private readonly uomRepo: Repository<UnitOfMeasure>,
    @InjectRepository(TaxConfiguration)
    private readonly taxRepo: Repository<TaxConfiguration>,
    private readonly auditService: AuditService,
  ) {}

  async createItem(dto: CreateProductItemDto, userId: number = 1): Promise<ProductItem> {
    const existing = await this.itemRepo.findOne({
      where: { itemCode: dto.itemCode.trim().toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(
        `Product item with code '${dto.itemCode}' already exists`,
      );
    }

    if (dto.sellingPrice <= 0) {
      throw new BadRequestException('Selling price must be greater than zero');
    }

    const item = this.itemRepo.create({
      ...dto,
      itemCode: dto.itemCode.trim().toUpperCase(),
      createdBy: userId,
    });

    const saved = await this.itemRepo.save(item);

    await this.auditService.log({
      entityType: 'product_item',
      entityId: saved.itemId,
      action: 'INSERT',
      changedBy: userId,
      newValue: {
        itemCode: saved.itemCode,
        itemName: saved.itemName,
        sellingPrice: saved.sellingPrice,
      },
    });

    return this.findOneItem(saved.itemId);
  }

  async findAllItems(query: ProductQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const qb = this.itemRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.category', 'category')
      .leftJoinAndSelect('i.brand', 'brand')
      .leftJoinAndSelect('i.uom', 'uom')
      .leftJoinAndSelect('i.taxConfig', 'taxConfig')
      .loadRelationCountAndMap('i.totalUnits', 'i.vehicleUnits');

    if (query.categoryId) {
      qb.andWhere('i.categoryId = :categoryId', { categoryId: query.categoryId });
    }

    if (query.brandId) {
      qb.andWhere('i.brandId = :brandId', { brandId: query.brandId });
    }

    if (query.search && query.search.trim() !== '') {
      const s = `%${query.search.trim()}%`;
      qb.andWhere('(i.itemCode ILIKE :s OR i.itemName ILIKE :s OR i.model ILIKE :s)', { s });
    }

    qb.orderBy('i.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneItem(id: string): Promise<ProductItem> {
    const item = await this.itemRepo.findOne({
      where: { itemId: id },
      relations: ['category', 'brand', 'uom', 'taxConfig', 'vehicleUnits'],
    });
    if (!item) {
      throw new NotFoundException(`Product item with ID ${id} not found`);
    }
    return item;
  }

  async updateItem(id: string, dto: UpdateProductItemDto, userId: number = 1): Promise<ProductItem> {
    const item = await this.findOneItem(id);
    const oldValue = { ...item };

    if (dto.itemCode && dto.itemCode.trim().toUpperCase() !== item.itemCode) {
      const existing = await this.itemRepo.findOne({
        where: { itemCode: dto.itemCode.trim().toUpperCase() },
      });
      if (existing && existing.itemId !== id) {
        throw new ConflictException(
          `Another product item with code '${dto.itemCode}' already exists`,
        );
      }
    }

    if (dto.sellingPrice !== undefined && dto.sellingPrice <= 0) {
      throw new BadRequestException('Selling price must be greater than zero');
    }

    Object.assign(item, {
      ...dto,
      itemCode: dto.itemCode ? dto.itemCode.trim().toUpperCase() : item.itemCode,
      updatedBy: userId,
    });

    const updated = await this.itemRepo.save(item);

    await this.auditService.log({
      entityType: 'product_item',
      entityId: id,
      action: 'UPDATE',
      changedBy: userId,
      oldValue: {
        itemCode: oldValue.itemCode,
        itemName: oldValue.itemName,
        sellingPrice: oldValue.sellingPrice,
      },
      newValue: {
        itemCode: updated.itemCode,
        itemName: updated.itemName,
        sellingPrice: updated.sellingPrice,
      },
    });

    return this.findOneItem(id);
  }

  // --- Reference Data Management (Categories, Brands, UoM, Tax) ---

  async getCategories(): Promise<ProductCategory[]> {
    return this.categoryRepo.find({ order: { categoryName: 'ASC' } });
  }

  async createCategory(name: string): Promise<ProductCategory> {
    const existing = await this.categoryRepo.findOne({ where: { categoryName: name.trim() } });
    if (existing) throw new ConflictException('Category already exists');
    return this.categoryRepo.save(this.categoryRepo.create({ categoryName: name.trim() }));
  }

  async getBrands(): Promise<Brand[]> {
    return this.brandRepo.find({ order: { brandName: 'ASC' } });
  }

  async createBrand(name: string): Promise<Brand> {
    const existing = await this.brandRepo.findOne({ where: { brandName: name.trim() } });
    if (existing) throw new ConflictException('Brand already exists');
    return this.brandRepo.save(this.brandRepo.create({ brandName: name.trim() }));
  }

  async getUoms(): Promise<UnitOfMeasure[]> {
    return this.uomRepo.find({ order: { uomName: 'ASC' } });
  }

  async getTaxConfigs(): Promise<TaxConfiguration[]> {
    return this.taxRepo.find({ where: { isActive: true }, order: { taxRatePct: 'ASC' } });
  }

  async createTaxConfig(name: string, ratePct: number): Promise<TaxConfiguration> {
    return this.taxRepo.save(
      this.taxRepo.create({
        taxName: name,
        taxRatePct: ratePct,
        isActive: true,
      }),
    );
  }
}
