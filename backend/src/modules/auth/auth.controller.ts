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

@ApiTags('Authentication & RBAC')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login via email / username and password' })
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Get('roles')
  @ApiOperation({ summary: 'List all system roles with descriptions, display names, and system role flags' })
  getRoles() {
    return this.authService.getRoles();
  }

  @Delete('roles/:id')
  @ApiOperation({ summary: 'Delete a custom role (blocks built-in system roles and roles in use)' })
  deleteRole(@Param('id', ParseIntPipe) id: number) {
    return this.authService.deleteRole(id);
  }

  @Get('modules')
  @ApiOperation({ summary: 'List all 18 functional system modules' })
  getModules() {
    return this.authService.getSystemModules();
  }

  @Get('actions')
  @ApiOperation({ summary: 'List all 9 functional system actions' })
  getActions() {
    return this.authService.getSystemActions();
  }

  @Get('permissions')
  @ApiOperation({ summary: 'List all available granular system permissions' })
  getPermissions() {
    return this.authService.getPermissions();
  }

  @Get('permissions/matrix')
  @ApiOperation({ summary: 'Get full 18 modules x 9 actions role-permission matrix' })
  getPermissionMatrix() {
    return this.authService.getPermissionMatrix();
  }

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

  @Get('users')
  @ApiOperation({ summary: 'List all system users' })
  getUsers() {
    return this.authService.getUsers();
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user profile by ID' })
  getUser(@Param('id', ParseIntPipe) id: number) {
    return this.authService.getUser(id);
  }

  @Post('users')
  @ApiOperation({ summary: 'Create new user with role assignment and password policy enforcement' })
  createUser(@Body() dto: CreateUserDto) {
    return this.authService.createUser(dto);
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update user profile, role, status, or permissions' })
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.authService.updateUser(id, dto);
  }

  @Patch('users/:id/toggle-status')
  @ApiOperation({ summary: 'Toggle active status of a user (audited)' })
  toggleUserStatus(@Param('id', ParseIntPipe) id: number) {
    return this.authService.toggleUserStatus(id);
  }
}
