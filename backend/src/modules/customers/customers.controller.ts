import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, CreateBankAccountDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

const uploadsDir = path.resolve(process.cwd(), 'uploads/documents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

@ApiTags('Customers & Dealers (Module 1)')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new Customer or Dealer' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List and search customers with pagination & filters' })
  findAll(@Query() query: CustomerQueryDto) {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer detail by ID (includes banking & account summary)' })
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update customer profile (audited)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }

  @Get(':id/account-summary')
  @ApiOperation({ summary: 'Get Customer Account Summary shell (SRS 1.9 & 1.10 zero-state)' })
  getAccountSummary(@Param('id') id: string) {
    return this.customersService.getAccountSummary(id);
  }

  @Post(':id/bank-accounts')
  @ApiOperation({ summary: 'Add bank account for refund/settlement payouts' })
  addBankAccount(@Param('id') id: string, @Body() dto: CreateBankAccountDto) {
    return this.customersService.addBankAccount(id, dto);
  }

  @Delete(':id/bank-accounts/:accountId')
  @ApiOperation({ summary: 'Remove bank account' })
  deleteBankAccount(@Param('id') id: string, @Param('accountId') accountId: string) {
    return this.customersService.deleteBankAccount(id, accountId);
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Upload supporting document (ID, TIN certificate, license)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadsDir,
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = path.extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  uploadDocument(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.customersService.addDocument(id, {
      fileName: file.originalname,
      filePath: `/uploads/documents/${file.filename}`,
      contentType: file.mimetype,
      sizeBytes: file.size,
    });
  }

  @Delete(':id/documents/:docId')
  @ApiOperation({ summary: 'Delete customer supporting document' })
  deleteDocument(@Param('id') id: string, @Param('docId') docId: string) {
    return this.customersService.deleteDocument(id, docId);
  }
}
