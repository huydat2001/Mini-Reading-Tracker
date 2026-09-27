import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { BooksModule } from './books/books.module';
import { LibraryModule } from './library/library.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const redisHost = configService.get<string>('REDIS_HOST');
        if (redisUrl || redisHost) {
          try {
            const store = await redisStore({
              url:
                redisUrl ||
                `redis://${redisHost}:${configService.get('REDIS_PORT') || 6379}`,
              ttl: 60 * 1000,
            });
            return { store } as any;
          } catch (e) {
            console.warn('[Cache] Redis connection failed, fallback to memory:', e);
          }
        }
        return { ttl: 60 * 1000, max: 500 } as any;
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('DATABASE_URL');
        if (url) {
          return {
            type: 'mysql' as const,
            url,
            autoLoadEntities: true,
            synchronize: false,
            logging: false,
          };
        }
        return {
          type: 'mysql' as const,
          host: configService.get('DATABASE_HOST') || 'localhost',
          port: parseInt(configService.get('DATABASE_PORT') || '3306', 10),
          username: configService.get('DB_USER') || configService.get('DATABASE_USER'),
          password: configService.get('DB_PASS') || configService.get('DATABASE_PASSWORD'),
          database: configService.get('DB_NAME') || configService.get('DATABASE_NAME') || 'reading_tracker',
          autoLoadEntities: true,
          synchronize: false,
          logging: false,
        };
      },
    }),
    BooksModule,
    LibraryModule,
  ],
})
export class AppModule {}
