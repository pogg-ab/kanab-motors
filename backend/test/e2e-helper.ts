import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { TypeOrmExceptionFilter } from '../src/common/filters/typeorm-exception.filter';
import { DataSource } from 'typeorm';

export interface E2EResponse<T = any> {
  status: number;
  headers: Headers;
  body: T;
  text: string;
}

export class E2EHarness {
  app: INestApplication;
  dataSource: DataSource;
  baseUrl: string;

  async init(): Promise<void> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = moduleFixture.createNestApplication();
    this.app.setGlobalPrefix('api');
    this.app.useGlobalFilters(new TypeOrmExceptionFilter());
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await this.app.listen(0);
    const addr = this.app.getHttpServer().address();
    this.baseUrl = `http://127.0.0.1:${addr.port}/api`;
    this.dataSource = this.app.get(DataSource);
  }

  async close(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
  }

  async request<T = any>(
    endpoint: string,
    options: {
      method?: string;
      token?: string;
      body?: any;
      formData?: FormData;
    } = {},
  ): Promise<E2EResponse<T>> {
    const headers: Record<string, string> = {};
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    let reqBody: any = undefined;
    if (options.formData) {
      reqBody = options.formData;
    } else if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      reqBody = JSON.stringify(options.body);
    }

    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: reqBody,
    });

    const text = await res.text();
    let parsed: any = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }

    return {
      status: res.status,
      headers: res.headers,
      body: parsed as T,
      text,
    };
  }

  async login(usernameOrEmail: string, password: string): Promise<{ accessToken: string; user: any }> {
    const payload = usernameOrEmail.includes('@')
      ? { email: usernameOrEmail, password }
      : { username: usernameOrEmail, password };
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: payload,
    });
    if (res.status !== 200 && res.status !== 201) {
      throw new Error(`Login failed for ${usernameOrEmail}: status=${res.status} body=${res.text}`);
    }
    return {
      accessToken: res.body.access_token || res.body.accessToken,
      user: res.body.user,
    };
  }
}

