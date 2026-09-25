import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AppUser } from './entities/app-user.entity';
import { Role } from './entities/role.entity';
import { SystemModule } from './entities/system-module.entity';
import { SystemAction } from './entities/system-action.entity';
import { RolePermission } from './entities/role-permission.entity';
import {
  CreateUserDto,
  LoginDto,
  UpdateUserDto,
  UpdateRolePermissionsDto,
  PASSWORD_REGEX,
  PASSWORD_MESSAGE,
} from './dto/auth.dto';

export interface SystemPermission {
  key: string;
  label: string;
  category: string;
  description: string;
}

export const SYSTEM_PERMISSIONS: SystemPermission[] = [
  // System Governance & IAM
  { key: 'ALL_PERMISSIONS', label: 'Super Admin Access', category: 'System Governance', description: 'Full unrestricted master access to all system functions' },
  { key: 'USERS_VIEW', label: 'View Users & Roles', category: 'System Governance', description: 'View user directory, roles, and active sessions' },
  { key: 'USERS_CREATE', label: 'Register Users', category: 'System Governance', description: 'Register new corporate user accounts' },
  { key: 'USERS_EDIT', label: 'Modify User Privileges', category: 'System Governance', description: 'Update user profiles, assigned roles, and permissions' },
  { key: 'USERS_TOGGLE_STATUS', label: 'Toggle User Status', category: 'System Governance', description: 'Activate or suspend corporate user accounts' },
  { key: 'ROLES_MANAGE', label: 'Manage Roles', category: 'System Governance', description: 'Configure role templates and default permission sets' },
  { key: 'AUDIT_VIEW', label: 'View Audit Logs', category: 'System Governance', description: 'Inspect system-wide immutable SHA-256 audit logs' },

  // Customer CRM (KMSICAMS-1)
  { key: 'CUSTOMERS_VIEW', label: 'View Customers & Dealers', category: 'Customer CRM', description: 'Access customer and dealer directory records' },
  { key: 'CUSTOMERS_CREATE', label: 'Register Customers', category: 'Customer CRM', description: 'Register new individual or corporate customer accounts' },
  { key: 'CUSTOMERS_EDIT', label: 'Edit Customer Profiles', category: 'Customer CRM', description: 'Modify customer contact details, addresses, and TIN' },
  { key: 'CUSTOMERS_DELETE', label: 'Archive Customers', category: 'Customer CRM', description: 'Deactivate or archive customer profiles' },
  { key: 'CUSTOMERS_DOCS_UPLOAD', label: 'Upload Customer Documents', category: 'Customer CRM', description: 'Upload TIN certificates, trade licenses, and legal IDs' },
  { key: 'CUSTOMERS_DOCS_DELETE', label: 'Delete Customer Documents', category: 'Customer CRM', description: 'Remove uploaded compliance and identification files' },
  { key: 'CUSTOMERS_BANK_MANAGE', label: 'Manage Bank Accounts', category: 'Customer CRM', description: 'Add and remove verified customer bank accounts' },

  // Products & Master Data
  { key: 'PRODUCTS_VIEW', label: 'View Product Catalog', category: 'Product Master Data', description: 'Browse vehicle models, specifications, and SKU catalog' },
  { key: 'PRODUCTS_CREATE', label: 'Create Product Models', category: 'Product Master Data', description: 'Register new automotive models and parts items' },
  { key: 'PRODUCTS_EDIT', label: 'Edit Product Details', category: 'Product Master Data', description: 'Update pricing, technical specifications, and tax codes' },
  { key: 'PRODUCTS_CATEGORIES_MANAGE', label: 'Manage Categories & Brands', category: 'Product Master Data', description: 'Maintain vehicle categories, brands, and UOMs' },

  // Vehicle Stock & VIN Tracking
  { key: 'VEHICLES_VIEW', label: 'View Vehicle Inventory', category: 'Vehicle Fleet & Inventory', description: 'Inspect physical vehicle units, chassis numbers, and VINs' },
  { key: 'VEHICLES_CREATE', label: 'Register Vehicle Unit', category: 'Vehicle Fleet & Inventory', description: 'Register single vehicle unit with engine and chassis' },
  { key: 'VEHICLES_BULK_IMPORT', label: 'Bulk Import Vehicles', category: 'Vehicle Fleet & Inventory', description: 'Batch import chassis and VIN numbers via CSV/Excel' },
  { key: 'VEHICLES_STATUS_UPDATE', label: 'Update Vehicle Status', category: 'Vehicle Fleet & Inventory', description: 'Transition vehicles between Transit, Yard, and Sold' },
  { key: 'WAREHOUSES_MANAGE', label: 'Manage Yards & Warehouses', category: 'Vehicle Fleet & Inventory', description: 'Configure bonded storage yards and warehouse hubs' },

  // Sales Enquiries & Quotes (KMSICAMS-2)
  { key: 'ENQUIRIES_VIEW', label: 'View Sales Enquiries', category: 'Sales Pipeline', description: 'Access customer price enquiries and vehicle quotations' },
  { key: 'ENQUIRIES_CREATE', label: 'Create Enquiries & Quotes', category: 'Sales Pipeline', description: 'Generate customer vehicle quotations with 15% VAT' },
  { key: 'ENQUIRIES_APPROVE', label: 'Approve Quotations', category: 'Sales Pipeline', description: 'Authorize discounts and confirm vehicle quotations' },
  { key: 'ENQUIRIES_REJECT', label: 'Reject / Cancel Enquiries', category: 'Sales Pipeline', description: 'Reject enquiry submissions with recorded audit reason' },

  // Advance Bookings
  { key: 'BOOKINGS_VIEW', label: 'View Advance Bookings', category: 'Sales Pipeline', description: 'Browse vehicle reservation queue and customer orders' },
  { key: 'BOOKINGS_CREATE', label: 'Create Advance Bookings', category: 'Sales Pipeline', description: 'Convert quotations to firm advance order bookings' },
  { key: 'BOOKINGS_ALLOCATE', label: 'Allocate VINs to Bookings', category: 'Sales Pipeline', description: 'Assign specific physical chassis numbers to orders' },
  { key: 'BOOKINGS_CANCEL', label: 'Cancel Bookings', category: 'Sales Pipeline', description: 'Cancel advance orders and execute forfeiture/refund policies' },
  { key: 'BOOKINGS_TRANSFER_FUNDS', label: 'Transfer Booking Deposits', category: 'Sales Pipeline', description: 'Transfer customer deposits between booking records' },

  // Customer Payments & Deposits (BRV)
  { key: 'PAYMENTS_VIEW', label: 'View Payment Receipts', category: 'Financial Engine', description: 'Inspect Bank Receipt Vouchers (BRV) and deposit slips' },
  { key: 'PAYMENTS_RECORD', label: 'Record Customer Deposits', category: 'Financial Engine', description: 'Record official payments and upload bank deposit slips' },
  { key: 'PAYMENTS_CONFIRM', label: 'Confirm & Clear Payments', category: 'Financial Engine', description: 'Verify bank deposit slips and credit customer account' },
  { key: 'PAYMENTS_REJECT', label: 'Reject Payment Slips', category: 'Financial Engine', description: 'Reject invalid or unverified bank receipts' },

  // Customer Ledger & SOA
  { key: 'LEDGER_VIEW', label: 'View Statement of Account', category: 'Financial Engine', description: 'Inspect running balance, debits, credits, and ledger' },
  { key: 'LEDGER_ADJUST', label: 'Post Ledger Adjustments', category: 'Financial Engine', description: 'Post manual debit/credit adjustments with audit reasons' },
  { key: 'LEDGER_EXPORT', label: 'Export Ledger & Statements', category: 'Financial Engine', description: 'Generate and export official SOA PDF reports' },

  // Excess Routing & Customer Refunds
  { key: 'EXCESS_VIEW', label: 'View Excess Deposits', category: 'Financial Engine', description: 'Monitor unallocated overpayments and credit balances' },
  { key: 'EXCESS_ROUTE', label: 'Route Excess Funds', category: 'Financial Engine', description: 'Reallocate excess funds to other bookings or accounts' },
  { key: 'REFUNDS_VIEW', label: 'View Customer Refunds', category: 'Financial Engine', description: 'Inspect pending, reviewed, and approved refund requests' },
  { key: 'REFUNDS_CREATE', label: 'Initiate Refund Request', category: 'Financial Engine', description: 'Submit customer deposit refund requests' },
  { key: 'REFUNDS_REVIEW', label: 'Review Refund Claims', category: 'Financial Engine', description: 'Perform finance audit review on refund submissions' },
  { key: 'REFUNDS_APPROVE', label: 'Approve Refund Payout', category: 'Financial Engine', description: 'Authorize manager-level approval for cash/bank refund' },
  { key: 'REFUNDS_PROCESS', label: 'Execute Refund Payout', category: 'Financial Engine', description: 'Process bank disbursement and confirm refund payout' },
  { key: 'REFUNDS_REJECT', label: 'Reject Refund Requests', category: 'Financial Engine', description: 'Decline refund claims with formal rejection rationale' },

  // International Logistics (KMSICAMS-3)
  { key: 'SUPPLIERS_VIEW', label: 'View Suppliers Master', category: 'International Logistics', description: 'Access directory of international vehicle manufacturers' },
  { key: 'SUPPLIERS_CREATE', label: 'Register New Suppliers', category: 'International Logistics', description: 'Onboard overseas automotive manufacturers & exporters' },
  { key: 'SUPPLIERS_EDIT', label: 'Edit Supplier Details', category: 'International Logistics', description: 'Update supplier bank details, contacts, and terms' },
  { key: 'SUPPLIERS_DELETE', label: 'Deactivate Suppliers', category: 'International Logistics', description: 'Archive or deactivate international supplier accounts' },
  { key: 'PURCHASE_ORDERS_VIEW', label: 'View Purchase Orders', category: 'International Logistics', description: 'Browse international vehicle purchase orders & lines' },
  { key: 'PURCHASE_ORDERS_CREATE', label: 'Draft Purchase Orders', category: 'International Logistics', description: 'Create purchase orders with international vendors' },
  { key: 'PURCHASE_ORDERS_EDIT', label: 'Edit Purchase Orders', category: 'International Logistics', description: 'Modify PO lines, vehicle quantities, and unit prices' },
  { key: 'PURCHASE_ORDERS_CONFIRM', label: 'Confirm Purchase Orders', category: 'International Logistics', description: 'Confirm and issue formal POs to manufacturers' },
  { key: 'PURCHASE_ORDERS_CANCEL', label: 'Cancel Purchase Orders', category: 'International Logistics', description: 'Cancel pending or unfulfilled international POs' },
  { key: 'SHIPMENTS_VIEW', label: 'View International Shipments', category: 'International Logistics', description: 'Track 6-stage logistics pipeline and bills of lading' },
  { key: 'SHIPMENTS_CREATE', label: 'Create Shipments', category: 'International Logistics', description: 'Create new import consignments against open PO lines' },
  { key: 'SHIPMENTS_UPDATE_STAGE', label: 'Advance Shipment Stages', category: 'International Logistics', description: 'Advance stages: Port Djibouti, Customs, Inland Transit' },
  { key: 'SHIPMENTS_RECEIVE_STOCK', label: 'Receive Vehicles into Yard', category: 'International Logistics', description: 'Perform physical yard intake and stock synchronization' },
  { key: 'SHIPMENTS_DOCS_UPLOAD', label: 'Upload Shipping Documents', category: 'International Logistics', description: 'Upload Bills of Lading, packing lists, and customs decls' },
  { key: 'LANDED_COST_VIEW', label: 'View Landed Cost Reports', category: 'International Logistics', description: 'Inspect final per-unit landed costs in Ethiopian Birr' },
  { key: 'LANDED_COST_ADD_EXPENSE', label: 'Add Cost Components', category: 'International Logistics', description: 'Record sea freight, insurance, port fees, and tariffs' },
  { key: 'LANDED_COST_ALLOCATE', label: 'Execute Landed Cost Engine', category: 'International Logistics', description: 'Run automated cost allocation (by value, qty, weight)' },
  { key: 'EXCHANGE_RATES_MANAGE', label: 'Manage FX Rates', category: 'International Logistics', description: 'Update official NBE foreign exchange rates (USD/EUR)' },

  // Executive Reports & Analytics
  { key: 'REPORTS_VIEW', label: 'View Analytics & Reports', category: 'Analytics & Reports', description: 'View import bottlenecks, landed costs, and order reports' },
  { key: 'REPORTS_EXPORT', label: 'Export Executive Reports', category: 'Analytics & Reports', description: 'Download CSV and PDF executive summary reports' },
];

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AppUser)
    private readonly userRepo: Repository<AppUser>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(SystemModule)
    private readonly moduleRepo: Repository<SystemModule>,
    @InjectRepository(SystemAction)
    private readonly actionRepo: Repository<SystemAction>,
    @InjectRepository(RolePermission)
    private readonly rolePermRepo: Repository<RolePermission>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  async getRoles(): Promise<Role[]> {
    return this.roleRepo.find({ order: { roleId: 'ASC' } });
  }

  async getPermissions(): Promise<SystemPermission[]> {
    return SYSTEM_PERMISSIONS;
  }

  async getSystemModules(): Promise<SystemModule[]> {
    return this.moduleRepo.find({ order: { displayOrder: 'ASC' } });
  }

  async getSystemActions(): Promise<SystemAction[]> {
    return this.actionRepo.find({ order: { displayOrder: 'ASC' } });
  }

  async getPermissionMatrix() {
    const [roles, modules, actions, rolePerms] = await Promise.all([
      this.roleRepo.find({ order: { roleId: 'ASC' } }),
      this.moduleRepo.find({ order: { displayOrder: 'ASC' } }),
      this.actionRepo.find({ order: { displayOrder: 'ASC' } }),
      this.rolePermRepo.find(),
    ]);

    // Construct matrix lookup: matrix[roleId][moduleCode][actionCode] = granted
    const matrix: Record<number, Record<string, Record<string, boolean>>> = {};

    for (const r of roles) {
      matrix[r.roleId] = {};
      for (const m of modules) {
        matrix[r.roleId][m.moduleCode] = {};
        for (const a of actions) {
          matrix[r.roleId][m.moduleCode][a.actionCode] = false;
        }
      }
    }

    for (const rp of rolePerms) {
      if (matrix[rp.roleId] && matrix[rp.roleId][rp.moduleCode]) {
        matrix[rp.roleId][rp.moduleCode][rp.actionCode] = rp.granted;
      }
    }

    return {
      roles,
      modules,
      actions,
      matrix,
    };
  }

  async updateRolePermissions(
    roleId: number,
    dto: UpdateRolePermissionsDto,
    updatedBy?: number,
  ) {
    const role = await this.roleRepo.findOne({ where: { roleId } });
    if (!role) throw new NotFoundException(`Role with ID ${roleId} not found`);

    for (const item of dto.permissions) {
      await this.dataSource.query(
        `
        INSERT INTO role_permission (role_id, module_code, action_code, granted, updated_at, updated_by)
        VALUES ($1, $2, $3, $4, now(), $5)
        ON CONFLICT (role_id, module_code, action_code)
        DO UPDATE SET granted = EXCLUDED.granted, updated_at = now(), updated_by = EXCLUDED.updated_by;
      `,
        [roleId, item.moduleCode.toUpperCase(), item.actionCode.toUpperCase(), item.granted, updatedBy || null],
      );
    }

    return {
      success: true,
      message: `Permissions updated for role ${role.roleName}`,
      roleId,
    };
  }

  async deleteRole(roleId: number): Promise<{ success: boolean; message: string }> {
    const role = await this.roleRepo.findOne({ where: { roleId } });
    if (!role) throw new NotFoundException(`Role with ID ${roleId} not found`);

    if (role.isSystemRole) {
      throw new BadRequestException(
        `Cannot delete built-in system role "${role.roleName}" (Protected System Role)`,
      );
    }

    const userCount = await this.userRepo.count({ where: { roleId } });
    if (userCount > 0) {
      throw new BadRequestException(
        `Cannot delete role "${role.roleName}" because it is currently assigned to ${userCount} user(s).`,
      );
    }

    await this.roleRepo.remove(role);
    return { success: true, message: `Role "${role.roleName}" deleted successfully` };
  }

  async getUsers(): Promise<AppUser[]> {
    return this.userRepo.find({
      relations: ['role'],
      order: { userId: 'ASC' },
    });
  }

  async getUser(id: number): Promise<AppUser> {
    const user = await this.userRepo.findOne({
      where: { userId: id },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async login(credentials: LoginDto) {
    const identifier = (credentials.email || credentials.username || '').trim();
    const password = credentials.password || '';

    if (!identifier) {
      throw new BadRequestException('Email or username is required');
    }

    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .leftJoinAndSelect('u.role', 'role')
      .where('LOWER(u.email) = LOWER(:identifier) OR LOWER(u.username) = LOWER(:identifier)', {
        identifier,
      })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid email/username or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('This account is disabled. Please contact an administrator.');
    }

    // Verify password if hash exists
    if (user.passwordHash) {
      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        throw new UnauthorizedException('Invalid email/username or password');
      }
    }

    // Update last_login_at timestamp
    await this.userRepo.update(user.userId, { lastLoginAt: new Date() });

    // Determine effective permissions: combine role default + user custom overrides
    const effectivePermissions = Array.from(
      new Set([...(user.role?.permissions || []), ...(user.permissions || [])]),
    );

    const payload = {
      sub: user.userId,
      username: user.username,
      email: user.email,
      role: user.role?.roleName || 'USER',
      roleId: user.roleId,
      permissions: effectivePermissions,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        roleName: user.role?.roleName || 'USER',
        roleDisplayName: user.role?.displayName || user.role?.roleName || 'User',
        roleId: user.roleId,
        permissions: effectivePermissions,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        lastLoginAt: new Date(),
      },
    };
  }

  async createUser(dto: CreateUserDto): Promise<AppUser> {
    const username = dto.username.trim();
    const email = dto.email.trim();

    const existing = await this.userRepo.findOne({
      where: [{ username }, { email }],
    });
    if (existing) {
      throw new ConflictException(
        existing.username.toLowerCase() === username.toLowerCase()
          ? `Username "${username}" is already in use`
          : `Email "${email}" is already registered to an account`,
      );
    }

    const role = await this.roleRepo.findOne({ where: { roleId: dto.roleId } });
    if (!role) {
      throw new BadRequestException(`Role with ID ${dto.roleId} not found`);
    }

    const rawPassword = dto.password || 'Kanab@123';
    if (dto.password && !PASSWORD_REGEX.test(dto.password)) {
      throw new BadRequestException(PASSWORD_MESSAGE);
    }

    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const permissions = dto.permissions && dto.permissions.length > 0 ? dto.permissions : (role.permissions || []);

    const user = this.userRepo.create({
      username,
      fullName: dto.fullName.trim(),
      email,
      passwordHash,
      roleId: dto.roleId,
      isActive: true,
      permissions,
      mustChangePassword: dto.mustChangePassword ?? false,
    });

    const saved = await this.userRepo.save(user);
    return this.getUser(saved.userId);
  }

  async updateUser(
    id: number,
    dto: UpdateUserDto,
  ): Promise<AppUser> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .leftJoinAndSelect('u.role', 'role')
      .where('u.userId = :id', { id })
      .getOne();

    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    if (dto.email && dto.email.trim() !== user.email) {
      const existingEmail = await this.userRepo.findOne({
        where: { email: dto.email.trim() },
      });
      if (existingEmail && existingEmail.userId !== id) {
        throw new ConflictException(`Email "${dto.email}" is already in use by another user`);
      }
      user.email = dto.email.trim();
    }

    if (dto.fullName) user.fullName = dto.fullName.trim();
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.mustChangePassword !== undefined) user.mustChangePassword = dto.mustChangePassword;

    if (dto.roleId && dto.roleId !== user.roleId) {
      const role = await this.roleRepo.findOne({ where: { roleId: dto.roleId } });
      if (!role) throw new BadRequestException(`Role with ID ${dto.roleId} not found`);
      user.roleId = dto.roleId;
    }

    if (dto.permissions !== undefined) {
      user.permissions = dto.permissions;
    }

    if (dto.password && dto.password.trim()) {
      if (!PASSWORD_REGEX.test(dto.password.trim())) {
        throw new BadRequestException(PASSWORD_MESSAGE);
      }
      user.passwordHash = await bcrypt.hash(dto.password.trim(), 10);
    }

    await this.userRepo.save(user);
    return this.getUser(id);
  }

  async toggleUserStatus(id: number): Promise<AppUser> {
    const user = await this.getUser(id);
    user.isActive = !user.isActive;
    await this.userRepo.save(user);
    return user;
  }

  async checkPermission(userId: number, moduleCode: string, actionCode: string): Promise<boolean> {
    try {
      const result = await this.dataSource.query(
        'SELECT fn_user_has_permission($1, $2, $3) as has_perm',
        [userId, moduleCode.toUpperCase(), actionCode.toUpperCase()],
      );
      return result[0]?.has_perm === true;
    } catch {
      return false;
    }
  }
}
