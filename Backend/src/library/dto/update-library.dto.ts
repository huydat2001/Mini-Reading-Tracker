import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReadingStatus } from '../entities/user-library.entity';

export class UpdateLibraryDto {
  @ApiPropertyOptional({
    enum: ReadingStatus,
    description: 'Đổi trạng thái đọc của sách',
  })
  @IsOptional()
  @IsEnum(ReadingStatus)
  status?: ReadingStatus;

  @ApiPropertyOptional({
    example: 50,
    description: 'Số trang đã đọc (>= 0 và <= tổng số trang)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  pagesRead?: number;

  @ApiPropertyOptional({
    example: 4,
    description: 'Điểm đánh giá 1-5 (null = chưa chấm)',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number | null;

  @ApiPropertyOptional({ example: 'Đang đọc dở, rất cuốn' })
  @IsOptional()
  @IsString()
  @MinLength(0)
  @MaxLength(2000)
  notes?: string;
}
