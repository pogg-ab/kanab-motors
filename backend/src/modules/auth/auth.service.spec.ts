import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AppUser } from './entities/app-user.entity';
import { Role } from './entities/role.entity';
import { SystemModule } from './entities/system-module.entity';
import { SystemAction } from './entities/system-action.entity';
import { RolePermission } from './entities/role-permission.entity';
import { BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService (KMSICAMS-9 RBAC & User Management)', () => {
  let service: AuthService;
  let userRepo: any;
  let roleRepo: any;
  let moduleRepo: any;
  let actionRepo: any;
  let rolePermRepo: any;
  let jwtService: any;
  let dataSource: any;

  beforeEach(async () => {
    userRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, userId: 101 })),
      save: jest.fn((entity) => Promise.resolve({ ...entity, userId: entity.userId || 101 })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    roleRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve(entity)),
      remove: jest.fn((entity) => Promise.resolve(entity)),
    };

    moduleRepo = {
      find: jest.fn(),
    };

    actionRepo = {
      find: jest.fn(),
    };

    rolePermRepo = {
      find: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock_jwt_token_2026'),
    };

    dataSource = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(AppUser), useValue: userRepo },
        { provide: getRepositoryToken(Role), useValue: roleRepo },
        { provide: getRepositoryToken(SystemModule), useValue: moduleRepo },
        { provide: getRepositoryToken(SystemAction), useValue: actionRepo },
        { provide: getRepositoryToken(RolePermission), useValue: rolePermRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('U1 & U2: User Entity Expansion & Creation with Password Policy', () => {
    it('should reject password that does not comply with security policy', async () => {
      userRepo.findOne.mockResolvedValue(null);
      roleRepo.findOne.mockResolvedValue({ roleId: 2, roleName: 'SALESPERSON' });

      await expect(
        service.createUser({
          username: 'dawit',
          fullName: 'Dawit Abebe',
          email: 'dawit@kanab.com',
          password: 'weak', // too short, no uppercase or digits
          roleId: 2,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate username or email', async () => {
      userRepo.findOne.mockResolvedValue({ userId: 1, username: 'admin', email: 'admin@kanab.com' });

      await expect(
        service.createUser({
          username: 'admin',
          fullName: 'Admin User',
          email: 'other@kanab.com',
          password: 'StrongPassword@123',
          roleId: 1,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully create user with hashed password and role assignment', async () => {
      userRepo.findOne
        .mockResolvedValueOnce(null) // uniqueness check
        .mockResolvedValueOnce({ // getUser after save
          userId: 101,
          username: 'solomon',
          fullName: 'Solomon Tesfaye',
          email: 'solomon@kanab.com',
          roleId: 2,
          role: { roleId: 2, roleName: 'SALESPERSON', isSystemRole: true },
          isActive: true,
          mustChangePassword: false,
        });

      roleRepo.findOne.mockResolvedValue({ roleId: 2, roleName: 'SALESPERSON', permissions: ['CUSTOMERS_VIEW'] });

      const created = await service.createUser({
        username: 'solomon',
        fullName: 'Solomon Tesfaye',
        email: 'solomon@kanab.com',
        password: 'ValidPassword@2026',
        roleId: 2,
      });

      expect(created.username).toBe('solomon');
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'solomon',
          roleId: 2,
          isActive: true,
        }),
      );
    });
  });

  describe('U3: Protected System Roles', () => {
    it('should block deletion of built-in system roles (isSystemRole = true)', async () => {
      roleRepo.findOne.mockResolvedValue({
        roleId: 1,
        roleName: 'ADMIN',
        isSystemRole: true,
      });

      await expect(service.deleteRole(1)).rejects.toThrow(BadRequestException);
      expect(roleRepo.remove).not.toHaveBeenCalled();
    });

    it('should block deletion of custom role if users are currently assigned', async () => {
      roleRepo.findOne.mockResolvedValue({
        roleId: 15,
        roleName: 'CUSTOM_ROLE',
        isSystemRole: false,
      });
      userRepo.count.mockResolvedValue(3);

      await expect(service.deleteRole(15)).rejects.toThrow(
        'Cannot delete role "CUSTOM_ROLE" because it is currently assigned to 3 user(s).',
      );
      expect(roleRepo.remove).not.toHaveBeenCalled();
    });

    it('should allow deletion of unused non-system custom roles', async () => {
      const customRole = {
        roleId: 16,
        roleName: 'TEMPORARY_TESTER',
        isSystemRole: false,
      };
      roleRepo.findOne.mockResolvedValue(customRole);
      userRepo.count.mockResolvedValue(0);

      const result = await service.deleteRole(16);
      expect(result.success).toBe(true);
      expect(roleRepo.remove).toHaveBeenCalledWith(customRole);
    });
  });

  describe('U5: User Status Toggle (Deactivation/Reactivation)', () => {
    it('should toggle user active status and save to database', async () => {
      const activeUser = {
        userId: 42,
        username: 'sales_rep',
        isActive: true,
      };
      userRepo.findOne.mockResolvedValue(activeUser);

      const result = await service.toggleUserStatus(42);
      expect(result.isActive).toBe(false);
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 42, isActive: false }),
      );
    });
  });

  describe('P1 - P4: Permission Matrix & Generic SQL Check', () => {
    it('should assemble full 18 modules x 9 actions matrix for all roles', async () => {
      roleRepo.find.mockResolvedValue([
        { roleId: 1, roleName: 'ADMIN' },
        { roleId: 2, roleName: 'SALESPERSON' },
      ]);
      moduleRepo.find.mockResolvedValue([
        { moduleCode: 'CUSTOMER', moduleName: 'Customer CRM' },
        { moduleCode: 'INVENTORY', moduleName: 'Inventory' },
      ]);
      actionRepo.find.mockResolvedValue([
        { actionCode: 'VIEW', actionName: 'View' },
        { actionCode: 'CREATE', actionName: 'Create' },
      ]);
      rolePermRepo.find.mockResolvedValue([
        { roleId: 2, moduleCode: 'CUSTOMER', actionCode: 'VIEW', granted: true },
      ]);

      const data = await service.getPermissionMatrix();
      expect(data.roles).toHaveLength(2);
      expect(data.modules).toHaveLength(2);
      expect(data.actions).toHaveLength(2);
      expect(data.matrix[2]['CUSTOMER']['VIEW']).toBe(true);
      expect(data.matrix[2]['CUSTOMER']['CREATE']).toBe(false);
    });

    it('should update role permission matrix records', async () => {
      roleRepo.findOne.mockResolvedValue({ roleId: 2, roleName: 'SALESPERSON' });
      dataSource.query.mockResolvedValue([]);

      const result = await service.updateRolePermissions(
        2,
        {
          permissions: [
            { moduleCode: 'INVOICE', actionCode: 'VIEW', granted: true },
            { moduleCode: 'INVOICE', actionCode: 'CREATE', granted: false },
          ],
        },
        1,
      );

      expect(result.success).toBe(true);
      expect(dataSource.query).toHaveBeenCalledTimes(2);
    });

    it('should call fn_user_has_permission via checkPermission method', async () => {
      dataSource.query.mockResolvedValueOnce([{ has_perm: true }]);

      const hasPerm = await service.checkPermission(1, 'INVOICE', 'CREATE');
      expect(hasPerm).toBe(true);
      expect(dataSource.query).toHaveBeenCalledWith(
        'SELECT fn_user_has_permission($1, $2, $3) as has_perm',
        [1, 'INVOICE', 'CREATE'],
      );
    });
  });

  describe('Authentication & last_login_at', () => {
    it('should update last_login_at upon successful login', async () => {
      const hashedPassword = await bcrypt.hash('Kanab@123', 10);
      const mockQueryBuilder = {
        addSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          userId: 1,
          username: 'admin',
          email: 'admin@kanab.com',
          fullName: 'System Admin',
          passwordHash: hashedPassword,
          isActive: true,
          roleId: 1,
          role: { roleId: 1, roleName: 'ADMIN', permissions: ['ALL_PERMISSIONS'] },
          permissions: [],
        }),
      };
      userRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const loginRes = await service.login({
        username: 'admin',
        password: 'Kanab@123',
      });

      expect(loginRes.access_token).toBe('mock_jwt_token_2026');
      expect(userRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ lastLoginAt: expect.any(Date) }),
      );
    });
  });
});
