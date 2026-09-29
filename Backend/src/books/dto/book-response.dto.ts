import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BookSearchItemDto {
  @ApiProperty({ example: '/works/OL82563W' })
  openLibraryId: string;

  @ApiProperty({ example: 'The Great Gatsby' })
  title: string;

  @ApiPropertyOptional({ example: 'F. Scott Fitzgerald', nullable: true })
  authorName: string | null;

  @ApiPropertyOptional({
    example: 'https://covers.openlibrary.org/b/id/7222246-L.jpg',
    nullable: true,
  })
  coverUrl: string | null;

  @ApiPropertyOptional({ example: 1925, nullable: true })
  publishYear: number | null;
}

export class BookSearchResultDto {
  @ApiProperty({ type: [BookSearchItemDto] })
  items: BookSearchItemDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;
}

export class BookDetailDto {
  @ApiProperty({ example: '/works/OL82563W' })
  openLibraryId: string;

  @ApiProperty({ example: 'The Great Gatsby' })
  title: string;

  @ApiPropertyOptional({ example: ['F. Scott Fitzgerald'], type: [String], nullable: true })
  authorNames: string[] | null;

  @ApiPropertyOptional({ example: 'F. Scott Fitzgerald', nullable: true })
  authorName: string | null;

  @ApiPropertyOptional({
    example: 'https://covers.openlibrary.org/b/id/7222246-L.jpg',
    nullable: true,
  })
  coverUrl: string | null;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @ApiProperty({ type: [String], example: ['Fiction', 'Classic'] })
  subjects: string[];

  @ApiPropertyOptional({ example: 1925, nullable: true })
  publishYear: number | null;

  @ApiPropertyOptional({ example: 180, nullable: true })
  totalPages: number | null;
}
