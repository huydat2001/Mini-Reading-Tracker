import api, { unwrap } from '../api/client'
import type { BookSearchResult, BookDetail } from '../types'

export async function searchBooks(
  q: string,
  page: number,
  limit: number,
): Promise<BookSearchResult> {
  const res = await api.get('/books/search', {
    params: { q, page, limit },
  })
  return unwrap<BookSearchResult>(res)
}

export async function getBookDetail(openLibraryId: string): Promise<BookDetail> {
  const res = await api.get(`/books/${encodeURIComponent(openLibraryId)}`)
  return unwrap<BookDetail>(res)
}
