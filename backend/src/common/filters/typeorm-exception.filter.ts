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

    const mapped = this.mapError(error);
    response.status(mapped.getStatus()).json(mapped.getResponse());
  }

  private mapError(error: QueryFailedError & { code?: string; detail?: string }): HttpException {
    switch (error.code) {
      case '23505':
        return new ConflictException('A record with the same unique value already exists');
      case '23503':
        return new BadRequestException('Referenced record does not exist');
      case '23514':
        return new BadRequestException('One or more values violate database validation rules');
      case '22P02':
      case '22003':
      case '22007':
        return new BadRequestException('One or more values have an invalid format');
      case 'P0001':
        return new BadRequestException(error.message || 'Business rule validation failed');
      case '42703':
      case '42P01':
        return new InternalServerErrorException('Database schema is not aligned with the application');
      default:
        return new InternalServerErrorException('Database operation failed');
    }
  }
}
