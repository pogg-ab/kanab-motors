import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductItemDto } from './dto/create-product-item.dto';
import { UpdateProductItemDto } from './dto/update-product-item.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { CreateTaxConfigDto } from './dto/create-tax-config.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateBrandDto } from './dto/create-brand.dto';

@ApiTags('Product & Vehicle Master Data (Module 2)')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('items')
  @ApiOperation({ summary: 'Register a new Product Item (Model)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createItem(@Body() dto: CreateProductItemDto) {
    return this.productsService.createItem(dto);
  }

  @Get('items')
  @ApiOperation({ summary: 'List and filter product items with unit counts' })
  findAllItems(@Query() query: ProductQueryDto) {
    return this.productsService.findAllItems(query);
  }

  @Get('items/:id')
  @ApiOperation({ summary: 'Get product item detail' })
  findOneItem(@Param('id') id: string) {
    return this.productsService.findOneItem(id);
  }

  @Put('items/:id')
  @ApiOperation({ summary: 'Update product item' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateItem(@Param('id') id: string, @Body() dto: UpdateProductItemDto) {
    return this.productsService.updateItem(id, dto);
  }

  // Reference lookups
  @Get('categories')
  @ApiOperation({ summary: 'Get product categories' })
  getCategories() {
    return this.productsService.getCategories();
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create product category' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.productsService.createCategory(dto.name);
  }

  @Get('brands')
  @ApiOperation({ summary: 'Get brands' })
  getBrands() {
    return this.productsService.getBrands();
  }

  @Post('brands')
  @ApiOperation({ summary: 'Create brand' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createBrand(@Body() dto: CreateBrandDto) {
    return this.productsService.createBrand(dto.name);
  }

  @Get('uoms')
  @ApiOperation({ summary: 'Get units of measure' })
  getUoms() {
    return this.productsService.getUoms();
  }

  @Get('tax-configs')
  @ApiOperation({ summary: 'Get VAT/Tax configurations' })
  getTaxConfigs() {
    return this.productsService.getTaxConfigs();
  }

  @Post('tax-configs')
  @ApiOperation({ summary: 'Create tax configuration' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createTaxConfig(@Body() dto: CreateTaxConfigDto) {
    return this.productsService.createTaxConfig(dto.name, dto.ratePct);
  }
}

