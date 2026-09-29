import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, Matches } from 'class-validator';

export class SearchBooksDto {
  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm chung', example: 'harry potter' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Tìm theo tiêu đề sách', example: 'flammable' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Tìm theo tên tác giả', example: 'solnit' })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({ description: 'Tìm theo chủ đề', example: 'tennis rules' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'Ngôn ngữ (mã 3 chữ cái, VD: eng, vie, spa)', example: 'eng' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Năm xuất bản từ (phải là số nguyên 4 chữ số, VD: 1990)', example: '1990' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, { message: 'yearStart phải là năm 4 chữ số (VD: 1990)' })
  yearStart?: string;

  @ApiPropertyOptional({ description: 'Năm xuất bản đến (phải là số nguyên 4 chữ số, VD: 2020)', example: '2020' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, { message: 'yearEnd phải là năm 4 chữ số (VD: 2020)' })
  yearEnd?: string;

  @ApiPropertyOptional({ description: 'Sắp xếp (new, old, random). Mặc định là relevance', enum: ['new', 'old', 'random'] })
  @IsOptional()
  @IsString()
  @IsIn(['new', 'old', 'random'])
  sort?: string;

  @ApiPropertyOptional({ description: 'Trang hiện tại', example: 1 })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ description: 'Số kết quả mỗi trang (tối đa 100)', example: 20 })
  @IsOptional()
  @IsString()
  limit?: string;
}