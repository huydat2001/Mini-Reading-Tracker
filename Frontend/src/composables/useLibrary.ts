import { ref } from 'vue'
import {
  getLibrary,
  getStats,
  addToLibrary,
  updateLibrary,
  removeFromLibrary,
  getExistingIds,
  type AddBookPayload,
} from '../api/library'
import type { LibraryEntry, LibraryStats, ReadingStatus } from '../types'
import { parseApiError, type AppErrorDetails } from '../utils/errorHandler'

export function useLibrary() {
  const entries = ref<LibraryEntry[]>([])
  const stats = ref<LibraryStats>({ total: 0, wantToRead: 0, reading: 0, read: 0 })
  const existingIds = ref<Set<string>>(new Set())
  const loading = ref(false)
  const error = ref<AppErrorDetails | null>(null)
  const adding = ref(false)

  async function refreshExistingIds(): Promise<void> {
    try {
      existingIds.value = await getExistingIds()
    } catch {
      existingIds.value = new Set()
    }
  }

  async function fetchLibrary(status?: ReadingStatus, search?: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      entries.value = await getLibrary(status, search)
    } catch (e) {
      error.value = parseApiError(e)
      entries.value = []
    } finally {
      loading.value = false
    }
  }

  async function fetchStats(): Promise<void> {
    try {
      stats.value = await getStats()
    } catch {
      stats.value = { total: 0, wantToRead: 0, reading: 0, read: 0 }
    }
  }

  async function add(payload: AddBookPayload): Promise<LibraryEntry> {
    adding.value = true
    try {
      const created = await addToLibrary(payload)
      existingIds.value = new Set([...existingIds.value, payload.openLibraryId])
      return created
    } finally {
      adding.value = false
    }
  }

  async function update(
    id: number,
    payload: Partial<{
      status: ReadingStatus
      pagesRead: number
      rating: number | null
      notes: string | null
      totalPages: number
    }>,
  ): Promise<LibraryEntry> {
    return updateLibrary(id, payload)
  }

  async function remove(id: number, openLibraryId?: string): Promise<void> {
    await removeFromLibrary(id)
    if (openLibraryId) {
      const next = new Set(existingIds.value)
      next.delete(openLibraryId)
      existingIds.value = next
    }
  }

  function isInLibrary(openLibraryId: string): boolean {
    return existingIds.value.has(openLibraryId)
  }

  return {
    entries,
    stats,
    existingIds,
    loading,
    error,
    adding,
    refreshExistingIds,
    fetchLibrary,
    fetchStats,
    add,
    update,
    remove,
    isInLibrary,
  }
}
