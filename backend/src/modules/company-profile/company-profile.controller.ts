import {
  BadRequestException,
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Req,
  Res,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ApiConsumes, ApiTags, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { CompanyProfileService } from './company-profile.service';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';
import { CreateBankAccountDto, UpdateBankAccountDto } from './dto/bank-account.dto';
import { CreateCompanyImporterDto, UpdateCompanyImporterDto } from './dto/importer.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';

const companyUploadsDir = path.resolve(process.cwd(), 'uploads/company');
if (!fs.existsSync(companyUploadsDir)) {
  fs.mkdirSync(companyUploadsDir, { recursive: true });
}

const ALLOWED_LOGO_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico']);

@ApiTags('Company Profile & Importer Settings')
@Controller('company-profile')
export class CompanyProfileController {
  constructor(private readonly companyProfileService: CompanyProfileService) {}

  @Get('branding')
  @ApiOperation({ summary: 'Get public non-sensitive Company Branding (name and logo) for Login, Sidebar, and browser tab' })
  getPublicBranding() {
    return this.companyProfileService.getPublicBranding();
  }

  @Get('logo')
  @ApiOperation({ summary: 'Get current company logo image binary directly' })
  async getLogoImage(@Res() res: any) {
    const profile = await this.companyProfileService.getProfile();
    const logoPath = profile?.logo;
    const cleanFilename = logoPath ? path.basename(logoPath.split('?')[0]) : null;

    const currentCwd = process.cwd();
    const projectRoot = currentCwd.endsWith('backend') ? path.resolve(currentCwd, '..') : currentCwd;
    const searchDirs = [
      path.resolve(projectRoot, 'uploads', 'company'),
      path.resolve(projectRoot, 'backend', 'uploads', 'company'),
      path.resolve(projectRoot, 'uploads'),
      path.resolve(projectRoot, 'backend', 'uploads'),
    ];

    if (cleanFilename) {
      for (const dir of searchDirs) {
        const candidate = path.resolve(dir, cleanFilename);
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return res.sendFile(candidate);
        }
      }
    }

    // Fallback: check if ANY company logo exists
    for (const dir of searchDirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).filter((f) => /\.(png|jpe?g|webp|svg|ico)$/i.test(f));
        if (files.length > 0) {
          return res.sendFile(path.resolve(dir, files[0]));
        }
      }
    }

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).send(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><rect width="120" height="120" rx="20" fill="#0284c7"/><text x="60" y="70" font-family="system-ui, -apple-system, sans-serif" font-size="38" font-weight="900" fill="#ffffff" text-anchor="middle" dominant-baseline="central">KM</text></svg>`,
    );
  }

  @Get()
  @UseGuards(PermissionGuard)
  @RequirePermissions(
    'COMPANY_PROFILE_VIEW',
    'COMPANY_PROFILE_EDIT',
    'USERS_VIEW',
    'USERS_EDIT',
    'PURCHASE_ORDERS_VIEW',
    'PURCHASE_ORDERS_CREATE',
    'PURCHASE_ORDERS_EDIT',
    'PURCHASE_ORDERS_CONFIRM',
  )
  @ApiOperation({ summary: 'Get default / active Company Profile and its Importer Bank Accounts' })
  getProfile() {
    return this.companyProfileService.getProfile();
  }

  @Put(':id')
  @UseGuards(PermissionGuard)
  @RequirePermissions('COMPANY_PROFILE_EDIT', 'USERS_EDIT')
  @ApiOperation({ summary: 'Update Company Profile general, legal and importer information' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanyProfileDto,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId;
    return this.companyProfileService.updateProfile(id, dto, userId);
  }

  @Post(':id/logo')
  @UseGuards(PermissionGuard)
  @RequirePermissions('COMPANY_PROFILE_EDIT', 'USERS_EDIT')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload Company Logo image and attach to Company Profile' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: companyUploadsDir,
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
          cb(null, `company-logo-${req.params.id}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        if (!ALLOWED_LOGO_EXTENSIONS.has(ext) && !file.mimetype?.startsWith('image/')) {
          return cb(
            new BadRequestException('Only image files (PNG, JPG, WEBP, GIF, SVG, ICO) are allowed for company logo.'),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadLogo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Req() req?: any,
  ) {
    if (!file) {
      throw new BadRequestException('A logo image file is required');
    }
    const logoUrl = `/api/uploads/company/${file.filename}`;
    try {
      const currentCwd = process.cwd();
      const projectRoot = currentCwd.endsWith('backend') ? path.resolve(currentCwd, '..') : currentCwd;
      const targetDirs = [
        path.resolve(projectRoot, 'uploads', 'company'),
        path.resolve(projectRoot, 'backend', 'uploads', 'company'),
        path.resolve(projectRoot, 'frontend', 'public', 'uploads', 'company'),
      ];
      for (const tDir of targetDirs) {
        if (!fs.existsSync(tDir)) fs.mkdirSync(tDir, { recursive: true });
        const targetPath = path.resolve(tDir, file.filename);
        if (file.path && targetPath !== file.path && fs.existsSync(file.path)) {
          fs.copyFileSync(file.path, targetPath);
        }
      }
    } catch {
      // Best-effort mirror
    }
    const userId = req?.user?.userId;
    const profile = await this.companyProfileService.updateLogo(id, logoUrl, userId);
    return { logoUrl, profile };
  }

  @Get('bank-accounts')
  @UseGuards(PermissionGuard)
  @RequirePermissions(
    'COMPANY_PROFILE_VIEW',
    'COMPANY_PROFILE_EDIT',
    'USERS_VIEW',
    'USERS_EDIT',
    'PURCHASE_ORDERS_VIEW',
    'PURCHASE_ORDERS_CREATE',
    'PURCHASE_ORDERS_EDIT',
    'PURCHASE_ORDERS_CONFIRM',
  )
  @ApiOperation({ summary: 'List all Importer Bank Accounts' })
  getBankAccounts() {
    return this.companyProfileService.getBankAccounts();
  }

  @Post('bank-accounts')
  @UseGuards(PermissionGuard)
  @RequirePermissions('COMPANY_PROFILE_EDIT', 'USERS_EDIT')
  @ApiOperation({ summary: 'Register a new Importer Bank Account' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createBankAccount(
    @Body() dto: CreateBankAccountDto,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId;
    return this.companyProfileService.createBankAccount(dto, userId);
  }

  @Put('bank-accounts/:id')
  @UseGuards(PermissionGuard)
  @RequirePermissions('COMPANY_PROFILE_EDIT', 'USERS_EDIT')
  @ApiOperation({ summary: 'Update an Importer Bank Account' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
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
  @RequirePermissions('COMPANY_PROFILE_EDIT', 'USERS_EDIT')
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
  @RequirePermissions('COMPANY_PROFILE_EDIT', 'USERS_EDIT')
  @ApiOperation({ summary: 'Delete an Importer Bank Account (with transaction reference check)' })
  deleteBankAccount(@Param('id', ParseIntPipe) id: number, @Req() req?: any) {
    return this.companyProfileService.deleteBankAccount(id, req?.user?.userId);
  }

  // =========================================================================
  // Multiple Importers Endpoints
  // =========================================================================

  @Get('importers')
  @UseGuards(PermissionGuard)
  @RequirePermissions(
    'COMPANY_PROFILE_VIEW',
    'COMPANY_PROFILE_EDIT',
    'USERS_VIEW',
    'USERS_EDIT',
    'PURCHASE_ORDERS_VIEW',
    'PURCHASE_ORDERS_CREATE',
    'PURCHASE_ORDERS_EDIT',
    'PURCHASE_ORDERS_CONFIRM',
  )
  @ApiOperation({ summary: 'List all Importers registered under KANAB Motors' })
  getImporters() {
    return this.companyProfileService.getImporters();
  }

  @Post('importers')
  @UseGuards(PermissionGuard)
  @RequirePermissions('COMPANY_PROFILE_EDIT', 'USERS_EDIT')
  @ApiOperation({ summary: 'Register a new Importer under KANAB Motors' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  createImporter(
    @Body() dto: CreateCompanyImporterDto,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId;
    return this.companyProfileService.createImporter(dto, userId);
  }

  @Put('importers/:id')
  @UseGuards(PermissionGuard)
  @RequirePermissions('COMPANY_PROFILE_EDIT', 'USERS_EDIT')
  @ApiOperation({ summary: 'Update an Importer details' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateImporter(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanyImporterDto,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId;
    return this.companyProfileService.updateImporter(id, dto, userId);
  }

  @Put('importers/:id/default')
  @UseGuards(PermissionGuard)
  @RequirePermissions('COMPANY_PROFILE_EDIT', 'USERS_EDIT')
  @ApiOperation({ summary: 'Designate an Importer as the primary corporate default' })
  setDefaultImporter(
    @Param('id', ParseIntPipe) id: number,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId;
    return this.companyProfileService.setDefaultImporter(id, userId);
  }

  @Put('importers/:id/toggle-active')
  @UseGuards(PermissionGuard)
  @RequirePermissions('COMPANY_PROFILE_EDIT', 'USERS_EDIT')
  @ApiOperation({ summary: 'Toggle an Importer active/inactive status' })
  toggleActiveImporter(
    @Param('id', ParseIntPipe) id: number,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId;
    return this.companyProfileService.toggleActiveImporter(id, userId);
  }

  @Delete('importers/:id')
  @UseGuards(PermissionGuard)
  @RequirePermissions('COMPANY_PROFILE_EDIT', 'USERS_EDIT')
  @ApiOperation({ summary: 'Delete an Importer (with PO reference check)' })
  deleteImporter(
    @Param('id', ParseIntPipe) id: number,
    @Req() req?: any,
  ) {
    const userId = req?.user?.userId;
    return this.companyProfileService.deleteImporter(id, userId);
  }
}

