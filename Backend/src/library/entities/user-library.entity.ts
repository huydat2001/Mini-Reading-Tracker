import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Book } from '../../books/entities/book.entity';

export enum ReadingStatus {
  WANT_TO_READ = 'want_to_read',
  READING = 'reading',
  READ = 'read',
}

@Entity({ name: 'user_library' })
@Index(['bookId'], { unique: true })
export class UserLibrary {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'book_id', type: 'int' })
  bookId: number;

  @ManyToOne(() => Book, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @Column({
    type: 'enum',
    enum: ReadingStatus,
    default: ReadingStatus.WANT_TO_READ,
  })
  status: ReadingStatus;

  @Column({ name: 'pages_read', type: 'int', default: 0 })
  pagesRead: number;

  @Column({ type: 'int', nullable: true })
  rating: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'finished_at', type: 'timestamp', nullable: true })
  finishedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
