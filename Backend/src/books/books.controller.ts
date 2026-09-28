import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { BooksService } from './books.service';
import { BookDetailDto, BookSearchResultDto } from './dto/book-response.dto';

@ApiTags('books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Tìm kiếm sách',
    description:
      'Proxy tới Open Library search.json. Kết quả được cache Redis 5 phút theo (từ khóa, trang, limit).',
  })
  @ApiQuery({ name: 'q', example: 'harry potter', required: true })
  @ApiQuery({ name: 'page', example: 1, required: false })
  @ApiQuery({ name: 'limit', example: 20, required: false })
  @ApiOkResponse({ type: BookSearchResultDto })
  @ApiBadRequestResponse({
    description: 'Thiếu từ khóa tìm kiếm (q)',
  })
  search(
    @Query('q') q: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Math.max(1, parseInt(page || '1', 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));
    return this.booksService.search(q, p, l);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Xem chi tiết tác phẩm',
    description:
      'Proxy tới Open Library works API (+ tên tác giả, bìa, số trang). Cache Redis 1 giờ theo openLibraryId.',
  })
  @ApiParam({
    name: 'id',
    example: 'OL82563W',
    description: 'Id tác phẩm, chấp nhận "OL82563W" hoặc "/works/OL82563W"',
  })
  @ApiOkResponse({ type: BookDetailDto })
  getDetail(@Param('id') id: string) {
    return this.booksService.getDetail(id);
  }
}
