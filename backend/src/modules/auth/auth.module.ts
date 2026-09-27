import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Role } from './entities/role.entity';
import { AppUser } from './entities/app-user.entity';
import { SystemModule } from './entities/system-module.entity';
import { SystemAction } from './entities/system-action.entity';
import { RolePermission } from './entities/role-permission.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, AppUser, SystemModule, SystemAction, RolePermission]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'kanab_motors_super_secret_jwt_key_2026',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
