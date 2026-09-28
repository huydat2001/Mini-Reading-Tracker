import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const CACHE_TTL = {
  SEARCH_MS: 5 * 60 * 1000,
  DETAIL_MS: 60 * 60 * 1000,
  STATS_MS: 90 * 1000,
};

export const CACHE_KEYS = {
  search: (q: string, page: number, limit: number) =>
    `books:search:${q.trim().toLowerCase()}:${page}:${limit}`,
  detail: (openLibraryId: string) => `books:detail:${openLibraryId}`,
  stats: () => 'library:stats',
};

@Injectable()
export class AppCacheService {
  private readonly logger = new Logger(AppCacheService.name);
  readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.enabled = Boolean(
      config.get('REDIS_URL') || config.get('REDIS_HOST'),
    );
    if (!this.enabled) {
      this.logger.log('Redis chưa cấu hình — dùng memory cache mặc định');
    }
  }

  async invalidateStats(cache: {
    del: (key: string) => Promise<void> | void;
  }) {
    try {
      await cache.del(CACHE_KEYS.stats());
    } catch (e) {
      this.logger.warn(`Xóa cache stats thất bại: ${e}`);
    }
  }
}
