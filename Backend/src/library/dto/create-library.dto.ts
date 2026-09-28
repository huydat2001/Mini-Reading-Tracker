import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReadingStatus } from '../entities/user-library.entity';

export class CreateLibraryDto {
  @ApiProperty({
    example: '/works/OL82563W',
    description: 'Mã Open Library của sách',
  })
  @IsString()
  openLibraryId: string;

  @ApiProperty({ example: 'The Great Gatsby' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'F. Scott Fitzgerald' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  authorName?: string;

  @ApiPropertyOptional({
    example: 'https://covers.openlibrary.org/b/id/7222246-L.jpg',
  })
  @IsOptional()
  @IsUrl()
  coverUrl?: string;

  @ApiPropertyOptional({
    example: 180,
    description: 'Tổng số trang (null nếu API nguồn không có)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalPages?: number;

  @ApiPropertyOptional({
    enum: ReadingStatus,
    example: ReadingStatus.WANT_TO_READ,
    description: 'Trạng thái ban đầu khi thêm vào tủ',
  })
  @IsOptional()
  @IsEnum(ReadingStatus)
  status?: ReadingStatus;
}
