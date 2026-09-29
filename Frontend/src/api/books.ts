import api, { unwrap } from '../api/client'
import type { BookSearchResult, BookDetail, SubjectResult } from '../types'

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
  const cleanId = openLibraryId.replace(/^\/?works\//, '')
  const res = await api.get(`/books/${encodeURIComponent(cleanId)}`)
  return unwrap<BookDetail>(res)
}

export async function getBooksBySubject(
  subject: string,
  limit = 20,
  offset = 0,
  details = false,
): Promise<SubjectResult> {
  const res = await api.get(`/books/subject/${encodeURIComponent(subject)}`, {
    params: { limit, offset, details: details ? 'true' : 'false' },
  })
  return unwrap<SubjectResult>(res)
}
