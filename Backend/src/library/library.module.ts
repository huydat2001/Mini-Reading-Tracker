import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Book } from '../books/entities/book.entity';
import { UserLibrary } from './entities/user-library.entity';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';
import { AppCacheService } from '../common/cache/app-cache.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Book, UserLibrary]),
    ConfigModule,
  ],
  controllers: [LibraryController],
  providers: [LibraryService, AppCacheService],
})
export class LibraryModule {}
