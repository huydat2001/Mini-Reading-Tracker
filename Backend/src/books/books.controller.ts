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

  @Get('subject/:subject')
  @ApiOperation({
    summary: 'Lấy danh sách sách theo chủ đề',
    description:
      'Proxy tới Open Library Subjects API. Hỗ trợ phân trang và chi tiết. Cache Redis 5 phút theo (chủ đề, limit, offset, details).',
  })
  @ApiParam({
    name: 'subject',
    example: 'love',
    description: 'Tên chủ đề (ví dụ: love, history, science)',
  })
  @ApiQuery({ name: 'limit', example: 20, required: false, description: 'Số lượng kết quả trả về' })
  @ApiQuery({ name: 'offset', example: 0, required: false, description: 'Vị trí bắt đầu (dùng cho phân trang)' })
  @ApiQuery({ name: 'details', example: false, required: false, type: Boolean, description: 'Lấy thêm thông tin chi tiết (tác giả phổ biến, nhà xuất bản,...)' })
  getBooksBySubject(
    @Param('subject') subject: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('details') details?: string,
  ) {
    const l = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));
    const o = Math.max(0, parseInt(offset || '0', 10) || 0);
    const d = details === 'true';
    return this.booksService.getBooksBySubject(subject, l, o, d);
  }
}
