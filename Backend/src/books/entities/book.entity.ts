import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'books' })
export class Book {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ name: 'open_library_id', type: 'varchar', length: 100 })
  openLibraryId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'author_name', type: 'varchar', length: 255, nullable: true })
  authorName: string | null;

  @Column({ name: 'cover_url', type: 'varchar', length: 500, nullable: true })
  coverUrl: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'json', nullable: true })
  subjects: string[] | null;

  @Column({ name: 'publish_year', type: 'int', nullable: true })
  publishYear: number | null;

  @Column({ name: 'total_pages', type: 'int', nullable: true })
  totalPages: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
