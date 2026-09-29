import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { LibraryService, LibraryStats } from './library.service';
import { CreateLibraryDto } from './dto/create-library.dto';
import { UpdateLibraryDto } from './dto/update-library.dto';
import { ReadingStatus } from './entities/user-library.entity';

@ApiTags('library')
@Controller('library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Post()
  @ApiOperation({
    summary: 'Thêm sách vào tủ',
    description:
      'Tạo book (nếu chưa có) và mục user_library. Trả 409 nếu sách đã có trong tủ. Hỗ trợ status ban đầu.',
  })
  @ApiCreatedResponse({ description: 'Thêm thành công' })
  @ApiConflictResponse({ description: 'Sách đã có trong tủ (409)' })
  add(@Body() dto: CreateLibraryDto) {
    return this.libraryService.add(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách tủ sách',
    description: 'Lọc theo status nếu truyền query. Sắp xếp mới cập nhật trước.',
  })
  @ApiQuery({
    name: 'status',
    enum: ReadingStatus,
    required: false,
    description: 'Lọc theo trạng thái',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Tìm kiếm theo tên sách (LIKE, không phân biệt hoa/thường)',
    example: 'harry',
  })
  @ApiOkResponse({ description: 'Danh sách mục trong tủ kèm thông tin sách' })
  list(
    @Query('status') status?: ReadingStatus,
    @Query('search') search?: string,
  ) {
    return this.libraryService.list(status, search);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Thống kê tủ sách',
    description:
      'Đếm tổng số sách theo trạng thái. Cache Redis 90 giây, tự xóa sau mỗi thêm/sửa/xóa.',
  })
  @ApiOkResponse({ description: '{ total, wantToRead, reading, read }' })
  stats(): Promise<LibraryStats> {
    return this.libraryService.stats();
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Cập nhật tiến độ đọc',
    description:
      'Đổi status, cập nhật pagesRead, rating 1-5, ghi chú. Tự động: pagesRead == totalPages → status "read" + finishedAt; lần đầu sang "reading" → startedAt.',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy mục (404)' })
  @ApiOkResponse({ description: 'Mục sau cập nhật' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLibraryDto,
  ) {
    return this.libraryService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Xóa sách khỏi tủ',
    description: 'Xóa mục user_library theo id. Trả 204 khi thành công.',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy mục (404)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.libraryService.remove(id);
  }
}
