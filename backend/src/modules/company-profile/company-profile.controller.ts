import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CompanyProfileService } from './company-profile.service';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';
import { CreateBankAccountDto, UpdateBankAccountDto } from './dto/bank-account.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';

@ApiTags('Company Profile & Importer Settings')
@Controller('company-profile')
export class CompanyProfileController {
  constructor(private readonly companyProfileService: CompanyProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get default / active Company Profile and its Importer Bank Accounts' })
  getProfile() {
    return this.companyProfileService.getProfile();
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @RequirePermissions('USERS_EDIT', 'PURCHASE_ORDERS_CONFIRM')
  @ApiOperation({ summary: 'Update Company Profile general, legal and importer information' })
  updateProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanyProfileDto,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId;
    return this.companyProfileService.updateProfile(id, dto, userId);
  }

  @Get('bank-accounts')
  @ApiOperation({ summary: 'List all Importer Bank Accounts' })
  getBankAccounts() {
    return this.companyProfileService.getBankAccounts();
  }

  @Post('bank-accounts')
  @UseGuards(PermissionGuard)
  @RequirePermissions('USERS_EDIT', 'PURCHASE_ORDERS_CONFIRM')
  @ApiOperation({ summary: 'Register a new Importer Bank Account' })
  createBankAccount(
    @Body() dto: CreateBankAccountDto,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId;
    return this.companyProfileService.createBankAccount(dto, userId);
  }

  @Put('bank-accounts/:id')
  @UseGuards(PermissionGuard)
  @RequirePermissions('USERS_EDIT', 'PURCHASE_ORDERS_CONFIRM')
  @ApiOperation({ summary: 'Update an Importer Bank Account' })
  updateBankAccount(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBankAccountDto,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId;
    return this.companyProfileService.updateBankAccount(id, dto, userId);
  }

  @Put('bank-accounts/:id/deactivate')
  @UseGuards(PermissionGuard)
  @RequirePermissions('USERS_EDIT', 'PURCHASE_ORDERS_CONFIRM')
  @ApiOperation({ summary: 'Deactivate an Importer Bank Account' })
  deactivateBankAccount(
    @Param('id', ParseIntPipe) id: number,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId;
    return this.companyProfileService.deactivateBankAccount(id, userId);
  }

  @Delete('bank-accounts/:id')
  @UseGuards(PermissionGuard)
  @RequirePermissions('USERS_EDIT', 'PURCHASE_ORDERS_CONFIRM')
  @ApiOperation({ summary: 'Delete an Importer Bank Account (with transaction reference check)' })
  deleteBankAccount(@Param('id', ParseIntPipe) id: number) {
    return this.companyProfileService.deleteBankAccount(id);
  }
}

