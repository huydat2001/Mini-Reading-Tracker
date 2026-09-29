import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import { BookDetailDto, BookSearchResultDto } from './dto/book-response.dto';
import { SearchBooksDto } from './dto/search-books.dto';

const OPEN_LIBRARY_BASE = 'https://openlibrary.org';

@Injectable()
export class BooksService {
  private readonly logger = new Logger(BooksService.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) { }

  async search(dto: SearchBooksDto): Promise<BookSearchResultDto> {
    // 1. Build mảng các điều kiện truy vấn
    const queryParts: string[] = [];

    if (dto.q?.trim()) queryParts.push(dto.q.trim());
    if (dto.title?.trim()) queryParts.push(`title:"${dto.title.trim()}"`);
    if (dto.author?.trim()) queryParts.push(`author:"${dto.author.trim()}"`);
    if (dto.subject?.trim()) queryParts.push(`subject:"${dto.subject.trim()}"`);
    if (dto.language?.trim()) queryParts.push(`language:${dto.language.trim()}`);

    // Validate khoảng thời gian năm xuất bản
    if (dto.yearStart || dto.yearEnd) {
      if (dto.yearStart && dto.yearEnd) {
        const startNum = parseInt(dto.yearStart, 10);
        const endNum = parseInt(dto.yearEnd, 10);
        if (endNum < startNum) {
          throw new BadRequestException(
            `yearEnd (${dto.yearEnd}) không được nhỏ hơn yearStart (${dto.yearStart})`,
          );
        }
      }
      const start = dto.yearStart || '*';
      const end = dto.yearEnd || '*';
      queryParts.push(`first_publish_year:[${start} TO ${end}]`);
    }

    // Nối các điều kiện lại (Open Library tự hiểu khoảng trắng là AND/Kết hợp)
    const finalQuery = queryParts.join(' ');

    if (!finalQuery) {
      throw new BadRequestException('Phải cung cấp ít nhất một điều kiện tìm kiếm (q, title, author...)');
    }

    // 2. Chuẩn hóa phân trang và sắp xếp
    const page = Math.max(1, parseInt(dto.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(dto.limit || '20', 10)));
    const sort = dto.sort || 'relevance'; // 'relevance' là mặc định của OL

    // 3. Xử lý Cache
    // Cache key bao gồm toàn bộ query string, sắp xếp và phân trang
    const cacheKey = `books:search:${Buffer.from(finalQuery).toString('base64')}:${sort}:${page}:${limit}`;
    const cached = await this.safeGet<BookSearchResultDto>(cacheKey);
    if (cached) return cached;

    // 4. Gọi API Open Library
    const url = `${OPEN_LIBRARY_BASE}/search.json`;
    const apiParams: Record<string, any> = {
      q: finalQuery,
      page,
      limit,
      fields: 'key,title,author_name,cover_i,first_publish_year',
    };
    if (dto.sort) apiParams.sort = dto.sort; // Chỉ gửi tham số sort nếu có

    const res = await firstValueFrom(
      this.httpService.get(url, {
        params: apiParams,
        timeout: 8000,
      }),
    );

    const data = res.data as any;

    // 5. Format kết quả trả về
    const items = (data.docs || []).map((d: any) => ({
      openLibraryId: d.key,
      title: d.title,
      authorName: d.author_name?.length ? d.author_name.join(', ') : null,
      coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
      publishYear: d.first_publish_year ?? null,
    }));

    const result: BookSearchResultDto = {
      items,
      total: data.numFound ?? items.length,
      page,
      limit,
    };

    await this.safeSet(cacheKey, result, 5 * 60 * 1000);
    return result;
  }

  async getDetail(openLibraryId: string): Promise<BookDetailDto> {
    const normalized = this.normalizeKey(openLibraryId);
    const cacheKey = `books:detail:${normalized}`;

    const cached = await this.safeGet<BookDetailDto>(cacheKey);
    if (cached) return cached;

    const url = `${OPEN_LIBRARY_BASE}${normalized}.json`;
    const res = await firstValueFrom(
      this.httpService.get(url, { timeout: 8000 }),
    );
    const w = res.data as Record<string, unknown>;

    const title = (w.title as string) || 'Unknown';
    const descriptionRaw = w.description as string | { value?: string } | undefined;
    const description =
      typeof descriptionRaw === 'string'
        ? descriptionRaw
        : (descriptionRaw?.value ?? null);

    const subjects = (w.subjects as string[]) ?? [];
    const covers = (w.covers as number[]) ?? [];
    const coverUrl = covers.length
      ? `https://covers.openlibrary.org/b/id/${covers[0]}-L.jpg`
      : null;

    const totalPages = (w.number_of_pages as number) ?? null;
    const publishYear = this.extractYear(w);

    const authorNames = await this.resolveAuthorNames(w);
    const authorName = authorNames?.length ? authorNames.join(', ') : null;

    const detail: BookDetailDto = {
      openLibraryId: normalized,
      title,
      authorNames,
      authorName,
      coverUrl,
      description,
      subjects: subjects.slice(0, 20),
      publishYear,
      totalPages,
    };

    await this.safeSet(cacheKey, detail, 60 * 60 * 1000);
    return detail;
  }

  private normalizeKey(key: string): string {
    let k = key.trim();
    if (!k.startsWith('/works/')) {
      k = `/works/${k.replace(/^\/+/, '')}`;
    }
    return k;
  }

  private extractYear(w: Record<string, unknown>): number | null {
    const v =
      (w.first_publish_date as string) ||
      (w.created as { value?: string })?.value ||
      null;
    if (!v) return null;
    const m = String(v).match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
    return m ? parseInt(m[1], 10) : null;
  }

  private async resolveAuthorNames(
    w: Record<string, unknown>,
  ): Promise<string[] | null> {
    const authors = w.authors as Array<{ author?: { key?: string } }> | undefined;
    if (!authors || !authors.length) return null;
    try {
      const names = await Promise.all(
        authors.map(async (a) => {
          const key = a.author?.key;
          if (!key) return null;
          try {
            const res = await firstValueFrom(
              this.httpService.get(`${OPEN_LIBRARY_BASE}${key}.json`, {
                timeout: 5000,
              }),
            );
            return (res.data as { name?: string })?.name ?? null;
          } catch {
            return null;
          }
        }),
      );
      const filtered = names.filter((n): n is string => Boolean(n));
      return filtered.length > 0 ? filtered : null;
    } catch {
      return null;
    }
  }

  async getBooksBySubject(
    subject: string,
    limit: number,
    offset: number,
    details: boolean,
  ): Promise<any> {
    if (!subject?.trim()) {
      throw new BadRequestException('Tham số subject là bắt buộc');
    }
    // Xử lý subject thành dạng lowercase và thay khoảng trắng bằng gạch dưới (VD: "science fiction" -> "science_fiction")
    const normalized = subject.trim().toLowerCase().replace(/\s+/g, '_');
    const cacheKey = `books:subject:${normalized}:${limit}:${offset}:${details}`;

    const cached = await this.safeGet<any>(cacheKey);
    if (cached) return cached;

    const url = `${OPEN_LIBRARY_BASE}/subjects/${normalized}.json`;

    try {
      const res = await firstValueFrom(
        this.httpService.get(url, {
          params: { limit, offset, details: details ? 'true' : undefined },
          timeout: 8000,
        }),
      );

      const data = res.data as Record<string, any>;

      // Map lại cấu trúc works cho tương đồng với kết quả search
      const items = (data.works || []).map((w: any) => ({
        openLibraryId: w.key,
        title: w.title,
        authorName: w.authors?.length
          ? w.authors.map((a: any) => a.name).filter(Boolean).join(', ')
          : null,
        // Chú ý: Subjects API thường trả về 'cover_id' thay vì 'cover_i'
        coverUrl: w.cover_id
          ? `https://covers.openlibrary.org/b/id/${w.cover_id}-L.jpg`
          : null,
        publishYear: w.first_publish_year ?? null,
      }));

      const result = {
        subjectKey: data.key,
        subjectName: data.name,
        workCount: data.work_count,
        items,
        limit,
        offset,
      };

      // Đính kèm metadata nếu details=true
      if (details) {
        Object.assign(result, {
          authors: data.authors ?? [],
          publishers: data.publishers ?? [],
          places: data.places ?? [],
          times: data.times ?? [],
          relatedSubjects: data.subjects ?? [],
        });
      }

      await this.safeSet(cacheKey, result, 5 * 60 * 1000);
      return result;
    } catch (error) {
      this.logger.error(`Lỗi khi gọi Subjects API cho [${normalized}]:`, error);
      throw new BadRequestException('Không thể lấy dữ liệu chủ đề hoặc chủ đề không tồn tại');
    }
  }

  private async safeGet<T>(key: string): Promise<T | undefined> {
    try {
      return (await this.cacheManager.get<T>(key)) ?? undefined;
    } catch (e) {
      this.logger.warn(`Cache GET failed [${key}]: ${e}`);
      return undefined;
    }
  }

  private async safeSet(key: string, value: unknown, ttlMs: number) {
    try {
      await this.cacheManager.set(key, value, ttlMs);
    } catch (e) {
      this.logger.warn(`Cache SET failed [${key}]: ${e}`);
    }
  }
}
