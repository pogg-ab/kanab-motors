import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

@Catch(QueryFailedError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const error = exception as QueryFailedError & {
      code?: string;
      detail?: string;
      constraint?: string;
      routine?: string;
    };

    console.error('TypeORM QueryFailedError intercepted:', {
      message: exception.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
    });

    const mapped = this.mapError(error);
    const resp = mapped.getResponse();
    const formatted: any = typeof resp === 'string' ? { message: resp } : { ...(resp as object) };
    if (error.detail) {
      formatted.detail = error.detail;
    }
    if ((exception as any)?.message && !formatted.dbError) {
      formatted.dbError = (exception as any).message;
    }
    response.status(mapped.getStatus()).json(formatted);
  }

  private mapError(error: QueryFailedError & { code?: string; detail?: string; message?: string }): HttpException {
    switch (error.code) {
      case '23505':
        return new ConflictException('A record with the same unique value already exists');
      case '23503':
        return new BadRequestException('Referenced record does not exist');
      case '23502':
        return new BadRequestException(error.detail || error.message || 'Required field missing (not-null constraint violation)');
      case '23514':
        return new BadRequestException('One or more values violate database validation rules');
      case '22001':
        return new BadRequestException('One or more text fields exceed the maximum allowed length');
      case '22P02':
      case '22003':
      case '22007':
        return new BadRequestException('One or more values have an invalid format');
      case 'P0001':
        return new BadRequestException(error.message || 'Business rule validation failed');
      case '42703':
      case '42P01':
        return new InternalServerErrorException(error.message || 'Database schema is not aligned with the application');
      default:
        return new InternalServerErrorException(error.detail || error.message || 'Database operation failed');
    }
  }
}
