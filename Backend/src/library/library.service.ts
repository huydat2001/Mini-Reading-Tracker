import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Book } from '../books/entities/book.entity';
import {
  ReadingStatus,
  UserLibrary,
} from './entities/user-library.entity';
import { CreateLibraryDto } from './dto/create-library.dto';
import { UpdateLibraryDto } from './dto/update-library.dto';
import { CACHE_KEYS, CACHE_TTL } from '../common/cache/app-cache.service';

export interface LibraryStats {
  total: number;
  wantToRead: number;
  reading: number;
  read: number;
}

@Injectable()
export class LibraryService {
  private readonly logger = new Logger(LibraryService.name);

  constructor(
    @InjectRepository(Book) private readonly bookRepo: Repository<Book>,
    @InjectRepository(UserLibrary)
    private readonly libRepo: Repository<UserLibrary>,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async add(dto: CreateLibraryDto): Promise<UserLibrary> {
    const existingBook = await this.bookRepo.findOne({
      where: { openLibraryId: dto.openLibraryId },
    });

    let book: Book;
    if (existingBook) {
      const inLibrary = await this.libRepo.findOne({
        where: { bookId: existingBook.id },
      });
      if (inLibrary) {
        throw new ConflictException('Sách đã có trong tủ');
      }
      book = existingBook;
    } else {
      book = this.bookRepo.create({
        openLibraryId: dto.openLibraryId,
        title: dto.title,
        authorName: dto.authorName ?? null,
        coverUrl: dto.coverUrl ?? null,
        totalPages: dto.totalPages ?? null,
      });
      book = await this.bookRepo.save(book);
    }

    const entry = this.libRepo.create({
      bookId: book.id,
      status: dto.status ?? ReadingStatus.WANT_TO_READ,
      pagesRead: 0,
      rating: null,
      notes: null,
      startedAt: dto.status === ReadingStatus.READING ? new Date() : null,
      finishedAt: dto.status === ReadingStatus.READ ? new Date() : null,
    });

    if (
      dto.status === ReadingStatus.READING &&
      entry.startedAt === null
    ) {
      entry.startedAt = new Date();
    }

    const saved = await this.libRepo.save(entry);
    await this.invalidateStats();
    return this.findById(saved.id);
  }

  async list(status?: ReadingStatus, search?: string): Promise<UserLibrary[]> {
    const qb = this.libRepo
      .createQueryBuilder('lib')
      .leftJoinAndSelect('lib.book', 'book')
      .orderBy('lib.updatedAt', 'DESC');

    if (status) {
      qb.andWhere('lib.status = :status', { status });
    }

    if (search?.trim()) {
      qb.andWhere('LOWER(book.title) LIKE LOWER(:search)', {
        search: `%${search.trim()}%`,
      });
    }

    return qb.getMany();
  }

  async stats(): Promise<LibraryStats> {
    const key = CACHE_KEYS.stats();
    try {
      const cached = await this.cache.get<LibraryStats>(key);
      if (cached) return cached;
    } catch (e) {
      this.logger.warn(`Cache GET stats thất bại: ${e}`);
    }

    const rows = await this.libRepo
      .createQueryBuilder('lib')
      .select('lib.status', 'status')
      .addSelect('COUNT(*)', 'cnt')
      .groupBy('lib.status')
      .getRawMany<{ status: ReadingStatus; cnt: string }>();

    const map = Object.fromEntries(
      rows.map((r) => [r.status, parseInt(r.cnt, 10)]),
    ) as Record<ReadingStatus, number>;

    const result: LibraryStats = {
      total: Object.values(map).reduce((a, b) => a + b, 0),
      wantToRead: map[ReadingStatus.WANT_TO_READ] ?? 0,
      reading: map[ReadingStatus.READING] ?? 0,
      read: map[ReadingStatus.READ] ?? 0,
    };

    try {
      await this.cache.set(key, result, CACHE_TTL.STATS_MS);
    } catch (e) {
      this.logger.warn(`Cache SET stats thất bại: ${e}`);
    }
    return result;
  }

  async update(id: number, dto: UpdateLibraryDto): Promise<UserLibrary> {
    const entry = await this.findById(id);
    const book = entry.book;

    if (dto.pagesRead !== undefined) {
      if (dto.pagesRead < 0) {
        throw new BadRequestException('pagesRead không được âm');
      }
      if (book.totalPages !== null && book.totalPages > 0) {
        if (dto.pagesRead > book.totalPages) {
          throw new BadRequestException(
            `pagesRead (${dto.pagesRead}) vượt quá tổng số trang (${book.totalPages})`,
          );
        }
      } else if (dto.pagesRead > 0 && (book.totalPages === null || book.totalPages === 0)) {
        // Cho phép nếu chưa biết tổng trang, chỉ chặn giá trị âm
      }
      entry.pagesRead = dto.pagesRead;

      if (
        book.totalPages !== null &&
        dto.pagesRead === book.totalPages &&
        book.totalPages > 0
      ) {
        entry.status = ReadingStatus.READ;
        entry.finishedAt = entry.finishedAt ?? new Date();
      }
    }

    if (dto.status !== undefined) {
      if (
        dto.status === ReadingStatus.READING &&
        entry.startedAt === null
      ) {
        entry.startedAt = new Date();
      }
      if (dto.status === ReadingStatus.READ) {
        entry.finishedAt = entry.finishedAt ?? new Date();
      }
      entry.status = dto.status;
    }

    if (dto.rating !== undefined) {
      entry.rating = dto.rating;
    }
    if (dto.notes !== undefined) {
      entry.notes = dto.notes;
    }

    const saved = await this.libRepo.save(entry);
    await this.invalidateStats();
    return this.findById(saved.id);
  }

  async remove(id: number): Promise<void> {
    const entry = await this.findById(id);
    await this.libRepo.remove(entry);
    await this.invalidateStats();
  }

  private async findById(id: number): Promise<UserLibrary> {
    const entry = await this.libRepo.findOne({
      where: { id },
      relations: { book: true },
    });
    if (!entry) throw new NotFoundException('Không tìm thấy mục trong tủ');
    return entry;
  }

  private async invalidateStats() {
    try {
      await this.cache.del(CACHE_KEYS.stats());
    } catch (e) {
      this.logger.warn(`Xóa cache stats thất bại: ${e}`);
    }
  }
}
