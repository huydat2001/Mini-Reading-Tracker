import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { AppController } from './app.controller';
import { BooksModule } from './books/books.module';
import { LibraryModule } from './library/library.module';
import { HttpLoggerMiddleware } from './common/middleware/http-logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST') || '127.0.0.1';
        const redisPort = configService.get<string>('REDIS_PORT') || '6379';
        const redisUrl = configService.get<string>('REDIS_URL') || `redis://${redisHost}:${redisPort}`;

        console.log('🔄 Đang kết nối Redis (Chuẩn v5) tới:', redisUrl);

        // Chuẩn v5 yêu cầu dùng await redisStore
        const store = await redisStore({
          url: redisUrl,
          ttl: 5 * 60 * 1000,
        });

        return { store };
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const url = configService.get<string>('DATABASE_URL');
        if (url) {
          return {
            type: 'mysql',
            url,
            autoLoadEntities: true,
            synchronize: false,
            logging: false,
            ssl: {
              rejectUnauthorized: true,
            },
          } as TypeOrmModuleOptions;
        }
        return {
          type: 'mysql',
          host: configService.get<string>('DB_HOST') || 'localhost',
          port: parseInt(configService.get<string>('DB_PORT') || '3306', 10),
          username:
            configService.get<string>('DB_USER') ||
            configService.get<string>('DATABASE_USER') ||
            'root',
          password:
            configService.get<string>('DB_PASS') ||
            configService.get<string>('DATABASE_PASSWORD') ||
            '',
          database:
            configService.get<string>('DB_NAME') ||
            configService.get<string>('DATABASE_NAME') ||
            'reading_tracker',
          autoLoadEntities: true,
          synchronize: false,
          logging: false,
          ssl: {
            rejectUnauthorized: true,
          },
        } as TypeOrmModuleOptions;
      },
    }),
    BooksModule,
    LibraryModule,
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('*');
  }
}
