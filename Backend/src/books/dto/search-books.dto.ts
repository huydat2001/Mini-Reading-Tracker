import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SearchBooksDto {
  @ApiProperty({
    description: 'Từ khóa tìm kiếm sách',
    example: 'harry potter',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  q: string;

  @ApiPropertyOptional({ description: 'Trang hiện tại', example: 1 })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({
    description: 'Số kết quả mỗi trang (tối đa 100)',
    example: 20,
  })
  @IsOptional()
  @IsString()
  limit?: string;
}
