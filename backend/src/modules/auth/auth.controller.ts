import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  CreateUserDto,
  LoginDto,
  UpdateUserDto,
  UpdateRolePermissionsDto,
  CheckPermissionDto,
} from './dto/auth.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@ApiTags('Authentication & RBAC')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login via email / username and password' })
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @RequirePermissions('USERS_VIEW', 'ROLES_MANAGE')
  @Get('roles')
  @ApiOperation({ summary: 'List all system roles with descriptions, display names, and system role flags' })
  getRoles() {
    return this.authService.getRoles();
  }

  @RequirePermissions('ROLES_MANAGE')
  @Delete('roles/:id')
  @ApiOperation({ summary: 'Delete a custom role (blocks built-in system roles and roles in use)' })
  deleteRole(@Param('id', ParseIntPipe) id: number) {
    return this.authService.deleteRole(id);
  }

  @RequirePermissions('USERS_VIEW', 'ROLES_MANAGE')
  @Get('modules')
  @ApiOperation({ summary: 'List all 18 functional system modules' })
  getModules() {
    return this.authService.getSystemModules();
  }

  @RequirePermissions('USERS_VIEW', 'ROLES_MANAGE')
  @Get('actions')
  @ApiOperation({ summary: 'List all 9 functional system actions' })
  getActions() {
    return this.authService.getSystemActions();
  }

  @RequirePermissions('USERS_VIEW', 'ROLES_MANAGE')
  @Get('permissions')
  @ApiOperation({ summary: 'List all available granular system permissions' })
  getPermissions() {
    return this.authService.getPermissions();
  }

  @RequirePermissions('USERS_VIEW', 'ROLES_MANAGE')
  @Get('permissions/matrix')
  @ApiOperation({ summary: 'Get full 18 modules x 9 actions role-permission matrix' })
  getPermissionMatrix() {
    return this.authService.getPermissionMatrix();
  }

  @RequirePermissions('ROLES_MANAGE')
  @Put('permissions/matrix/:roleId')
  @ApiOperation({ summary: 'Update permissions in matrix for a specific role' })
  updateRolePermissions(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.authService.updateRolePermissions(roleId, dto);
  }

  @Post('permissions/check')
  @ApiOperation({ summary: 'Evaluate if a user has permission on a module and action via SQL engine' })
  async checkPermission(@Body() dto: CheckPermissionDto) {
    const granted = await this.authService.checkPermission(dto.userId, dto.moduleCode, dto.actionCode);
    return { userId: dto.userId, moduleCode: dto.moduleCode, actionCode: dto.actionCode, granted };
  }

  @RequirePermissions('USERS_VIEW')
  @Get('users')
  @ApiOperation({ summary: 'List all system users' })
  getUsers() {
    return this.authService.getUsers();
  }

  @RequirePermissions('USERS_VIEW')
  @Get('users/:id')
  @ApiOperation({ summary: 'Get user profile by ID' })
  getUser(@Param('id', ParseIntPipe) id: number) {
    return this.authService.getUser(id);
  }

  @RequirePermissions('USERS_CREATE', 'USERS_EDIT')
  @Post('users')
  @ApiOperation({ summary: 'Create new user with role assignment and password policy enforcement' })
  createUser(@Body() dto: CreateUserDto) {
    return this.authService.createUser(dto);
  }

  @RequirePermissions('USERS_EDIT')
  @Put('users/:id')
  @ApiOperation({ summary: 'Update user profile, role, status, or permissions' })
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.authService.updateUser(id, dto);
  }

  @RequirePermissions('USERS_EDIT')
  @Patch('users/:id/toggle-status')
  @ApiOperation({ summary: 'Toggle active status of a user (audited)' })
  toggleUserStatus(@Param('id', ParseIntPipe) id: number) {
    return this.authService.toggleUserStatus(id);
  }
}

