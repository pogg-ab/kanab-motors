import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductItemDto } from './dto/create-product-item.dto';
import { UpdateProductItemDto } from './dto/update-product-item.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { CreateTaxConfigDto } from './dto/create-tax-config.dto';
import { UpdateTaxConfigDto } from './dto/update-tax-config.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { PositiveBigIntIdPipe } from '../../common/pipes/positive-bigint-id.pipe';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Product & Vehicle Master Data (Module 2)')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @RequirePermissions('PRODUCTS_CREATE')
  @Post('items')
  @ApiOperation({ summary: 'Register a new Product Item (Model)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createItem(@Body() dto: CreateProductItemDto) {
    return this.productsService.createItem(dto);
  }

  @RequirePermissions('PRODUCTS_VIEW')
  @Get('items')
  @ApiOperation({ summary: 'List and filter product items with unit counts' })
  findAllItems(@Query() query: ProductQueryDto) {
    return this.productsService.findAllItems(query);
  }

  @RequirePermissions('PRODUCTS_VIEW')
  @Get('items/:id')
  @ApiOperation({ summary: 'Get product item detail' })
  findOneItem(@Param('id', PositiveBigIntIdPipe) id: string) {
    return this.productsService.findOneItem(id);
  }

  @RequirePermissions('PRODUCTS_EDIT')
  @Put('items/:id')
  @ApiOperation({ summary: 'Update product item' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateItem(@Param('id', PositiveBigIntIdPipe) id: string, @Body() dto: UpdateProductItemDto) {
    return this.productsService.updateItem(id, dto);
  }

  // Reference lookups
  @RequirePermissions('PRODUCTS_VIEW')
  @Get('categories')
  @ApiOperation({ summary: 'Get product categories' })
  getCategories() {
    return this.productsService.getCategories();
  }

  @RequirePermissions('PRODUCTS_CATEGORIES_MANAGE')
  @Post('categories')
  @ApiOperation({ summary: 'Create product category' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.productsService.createCategory(dto.name);
  }

  @RequirePermissions('PRODUCTS_CATEGORIES_MANAGE')
  @Put('categories/:id')
  @ApiOperation({ summary: 'Update product category' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.productsService.updateCategory(id, dto.name);
  }

  @RequirePermissions('PRODUCTS_CATEGORIES_MANAGE')
  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete product category' })
  deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.deleteCategory(id);
  }

  @RequirePermissions('PRODUCTS_VIEW')
  @Get('brands')
  @ApiOperation({ summary: 'Get brands' })
  getBrands() {
    return this.productsService.getBrands();
  }

  @RequirePermissions('PRODUCTS_CATEGORIES_MANAGE')
  @Post('brands')
  @ApiOperation({ summary: 'Create brand' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createBrand(@Body() dto: CreateBrandDto) {
    return this.productsService.createBrand(dto.name);
  }

  @RequirePermissions('PRODUCTS_CATEGORIES_MANAGE')
  @Put('brands/:id')
  @ApiOperation({ summary: 'Update brand' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateBrand(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBrandDto,
  ) {
    return this.productsService.updateBrand(id, dto.name);
  }

  @RequirePermissions('PRODUCTS_CATEGORIES_MANAGE')
  @Delete('brands/:id')
  @ApiOperation({ summary: 'Delete brand' })
  deleteBrand(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.deleteBrand(id);
  }

  @RequirePermissions('PRODUCTS_VIEW')
  @Get('uoms')
  @ApiOperation({ summary: 'Get units of measure' })
  getUoms() {
    return this.productsService.getUoms();
  }

  @RequirePermissions('PRODUCTS_VIEW')
  @Get('tax-configs')
  @ApiOperation({ summary: 'Get VAT/Tax configurations' })
  getTaxConfigs() {
    return this.productsService.getTaxConfigs();
  }

  @RequirePermissions('PRODUCTS_CATEGORIES_MANAGE')
  @Post('tax-configs')
  @ApiOperation({ summary: 'Create tax configuration' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createTaxConfig(@Body() dto: CreateTaxConfigDto) {
    return this.productsService.createTaxConfig(dto.name, dto.ratePct);
  }

  @RequirePermissions('PRODUCTS_CATEGORIES_MANAGE')
  @Put('tax-configs/:id')
  @ApiOperation({ summary: 'Update tax configuration' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateTaxConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaxConfigDto,
  ) {
    return this.productsService.updateTaxConfig(id, dto);
  }

  @RequirePermissions('PRODUCTS_CATEGORIES_MANAGE')
  @Delete('tax-configs/:id')
  @ApiOperation({ summary: 'Delete tax configuration' })
  deleteTaxConfig(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.deleteTaxConfig(id);
  }
}

