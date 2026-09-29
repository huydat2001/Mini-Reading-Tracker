import api, { unwrap } from './client'
import type { LibraryEntry, LibraryStats, ReadingStatus } from '../types'

export interface AddBookPayload {
  openLibraryId: string
  title: string
  authorName?: string
  coverUrl?: string
  totalPages?: number
  status?: ReadingStatus
}

export async function getLibrary(status?: ReadingStatus, search?: string): Promise<LibraryEntry[]> {
  const params: Record<string, string> = {}
  if (status) params.status = status
  if (search?.trim()) params.search = search.trim()
  const res = await api.get('/library', {
    params: Object.keys(params).length > 0 ? params : undefined,
  })
  return unwrap<LibraryEntry[]>(res)
}

export async function getStats(): Promise<LibraryStats> {
  const res = await api.get('/library/stats')
  return unwrap<LibraryStats>(res)
}

export async function addToLibrary(payload: AddBookPayload): Promise<LibraryEntry> {
  const res = await api.post('/library', payload)
  return unwrap<LibraryEntry>(res)
}

export async function updateLibrary(
  id: number,
  payload: Partial<{
    status: ReadingStatus
    pagesRead: number
    rating: number | null
    notes: string | null
    totalPages: number
  }>,
): Promise<LibraryEntry> {
  const res = await api.patch(`/library/${id}`, payload)
  return unwrap<LibraryEntry>(res)
}

export async function removeFromLibrary(id: number): Promise<void> {
  await api.delete(`/library/${id}`)
}

export async function getExistingIds(): Promise<Set<string>> {
  const entries = await getLibrary()
  return new Set(entries.map((e) => e.book.openLibraryId))
}
