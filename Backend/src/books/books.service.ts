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

const OPEN_LIBRARY_BASE = 'https://openlibrary.org';

@Injectable()
export class BooksService {
  private readonly logger = new Logger(BooksService.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async search(
    q: string,
    page: number,
    limit: number,
  ): Promise<BookSearchResultDto> {
    if (!q?.trim()) {
      throw new BadRequestException('Tham số q (từ khóa tìm kiếm) là bắt buộc');
    }
    const normalized = q.trim().toLowerCase();
    const cacheKey = `books:search:${normalized}:${page}:${limit}`;

    const cached = await this.safeGet<BookSearchResultDto>(cacheKey);
    if (cached) return cached;

    const url = `${OPEN_LIBRARY_BASE}/search.json`;
    const res = await firstValueFrom(
      this.httpService.get(url, {
        params: { q: normalized, page, limit, fields: 'key,title,author_name,cover_i,first_publish_year' },
        timeout: 8000,
      }),
    );

    const data = res.data as {
      numFound: number;
      docs: Array<{
        key: string;
        title: string;
        author_name?: string[];
        cover_i?: number;
        first_publish_year?: number;
      }>;
    };

    const items = (data.docs || []).map((d) => ({
      openLibraryId: d.key,
      title: d.title,
      authorName: d.author_name?.[0] ?? null,
      coverUrl: d.cover_i
        ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`
        : null,
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

    const detail: BookDetailDto = {
      openLibraryId: normalized,
      title,
      authorName: await this.resolveAuthorName(w),
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

  private async resolveAuthorName(
    w: Record<string, unknown>,
  ): Promise<string | null> {
    const authors = w.authors as Array<{ author?: { key?: string } }> | undefined;
    const firstKey = authors?.[0]?.author?.key;
    if (!firstKey) return null;
    try {
      const res = await firstValueFrom(
        this.httpService.get(`${OPEN_LIBRARY_BASE}${firstKey}.json`, {
          timeout: 5000,
        }),
      );
      return (res.data as { name?: string })?.name ?? null;
    } catch {
      return null;
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
