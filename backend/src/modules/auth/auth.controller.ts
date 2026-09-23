import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateUserDto, LoginDto, UpdateUserDto } from './dto/auth.dto';

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
  @ApiOperation({ summary: 'List all system roles with descriptions and default permissions' })
  getRoles() {
    return this.authService.getRoles();
  }

  @Get('permissions')
  @ApiOperation({ summary: 'List all available granular system permissions' })
  getPermissions() {
    return this.authService.getPermissions();
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
  @ApiOperation({ summary: 'Create new user with role assignment' })
  createUser(@Body() dto: CreateUserDto) {
    return this.authService.createUser(dto);
  }

  @Put('users/:id')
  @ApiOperation({ summary: 'Update user profile, role, or permissions' })
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.authService.updateUser(id, dto);
  }

  @Patch('users/:id/toggle-status')
  @ApiOperation({ summary: 'Toggle active status of a user' })
  toggleUserStatus(@Param('id', ParseIntPipe) id: number) {
    return this.authService.toggleUserStatus(id);
  }
}

