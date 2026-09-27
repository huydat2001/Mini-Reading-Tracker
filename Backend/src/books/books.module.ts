import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

@Module({
  imports: [HttpModule.register({ timeout: 8000, maxRedirects: 5 })],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}
