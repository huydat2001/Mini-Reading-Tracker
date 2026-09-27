import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchBooksDto {
  @IsString()
  @MaxLength(200)
  q: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
