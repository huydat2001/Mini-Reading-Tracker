export type ReadingStatus = 'want_to_read' | 'reading' | 'read'

export interface BookSearchItem {
  openLibraryId: string
  title: string
  authorName: string | null
  coverUrl: string | null
  publishYear: number | null
}

export interface BookSearchResult {
  items: BookSearchItem[]
  total: number
  page: number
  limit: number
}

export interface SubjectResult {
  subjectKey: string
  subjectName: string
  workCount: number
  items: BookSearchItem[]
  limit: number
  offset: number
}

export interface SearchParams {
  q?: string
  title?: string
  author?: string
  subject?: string
  language?: string
  yearStart?: string
  yearEnd?: string
  sort?: string
  page?: number
  limit?: number
}

export interface BookDetail {
  openLibraryId: string
  title: string
  authorName: string | null
  authorNames?: string[] | null
  coverUrl: string | null
  description: string | null
  subjects: string[]
  publishYear: number | null
  totalPages: number | null
}

export interface LibraryEntry {
  id: number
  bookId: number
  status: ReadingStatus
  pagesRead: number
  rating: number | null
  notes: string | null
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
  updatedAt: string
  book: {
    id: number
    openLibraryId: string
    title: string
    authorName: string | null
    coverUrl: string | null
    description: string | null
    subjects: string[] | null
    publishYear: number | null
    totalPages: number | null
    createdAt: string
    updatedAt: string
  }
}

export interface LibraryStats {
  total: number
  wantToRead: number
  reading: number
  read: number
}

export const STATUS_LABELS: Record<ReadingStatus, string> = {
  want_to_read: 'Muốn đọc',
  reading: 'Đang đọc',
  read: 'Đã đọc',
}
