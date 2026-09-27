import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

interface JwtPayload {
  sub?: number | string;
  permissions?: string[];
  role?: string;
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      throw new UnauthorizedException('Authentication token is required');
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(
        token,
        process.env.JWT_SECRET || 'kanab_motors_super_secret_jwt_key_2026',
      ) as JwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }

    const userId = Number(payload.sub);
    if (!userId) {
      throw new UnauthorizedException('Authentication token does not identify a user');
    }

    const rows = await this.dataSource.query(
      `
        SELECT u.is_active, u.permissions AS user_permissions, r.role_name, r.permissions AS role_permissions
        FROM app_user u
        LEFT JOIN role r ON r.role_id = u.role_id
        WHERE u.user_id = $1
      `,
      [userId],
    );
    const user = rows[0];

    if (!user || user.is_active === false) {
      throw new UnauthorizedException('User is inactive or does not exist');
    }

    const permissions = new Set<string>([
      ...(user.role_permissions || []),
      ...(user.user_permissions || []),
      ...(payload.permissions || []),
    ]);

    if (user.role_name === 'ADMIN' || permissions.has('ALL_PERMISSIONS')) {
      request.user = { userId, roleName: user.role_name, permissions: Array.from(permissions) };
      return true;
    }

    const granted = required.some((permission) => permissions.has(permission));
    if (!granted) {
      throw new ForbiddenException(`Missing required permission: ${required.join(' or ')}`);
    }

    request.user = { userId, roleName: user.role_name, permissions: Array.from(permissions) };
    return true;
  }
}
