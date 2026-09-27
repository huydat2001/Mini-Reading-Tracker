export class BookSearchItemDto {
  openLibraryId: string;
  title: string;
  authorName: string | null;
  coverUrl: string | null;
  publishYear: number | null;
}

export class BookSearchResultDto {
  items: BookSearchItemDto[];
  total: number;
  page: number;
  limit: number;
}

export class BookDetailDto {
  openLibraryId: string;
  title: string;
  authorName: string | null;
  coverUrl: string | null;
  description: string | null;
  subjects: string[];
  publishYear: number | null;
  totalPages: number | null;
}
