import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class PositiveBigIntIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
      throw new BadRequestException('ID must be a positive numeric identifier');
    }
    return value;
  }
}
