import { ref } from 'vue'
import { searchBooks, getBookDetail, getBooksBySubject } from '../api/books'
import type { BookSearchItem, BookDetail } from '../types'

export function useBooks() {
  const books = ref<BookSearchItem[]>([])
  const total = ref(0)
  const page = ref(1)
  const limit = ref(20)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentSubject = ref<string | null>(null)

  async function search(q: string, targetPage = 1): Promise<void> {
    if (!q.trim()) {
      books.value = []
      total.value = 0
      return
    }
    currentSubject.value = null
    loading.value = true
    error.value = null
    try {
      const result = await searchBooks(q.trim(), targetPage, limit.value)
      books.value = result.items
      total.value = result.total
      page.value = result.page
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Lỗi tìm kiếm'
      books.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  async function fetchBySubject(subject: string, targetPage = 1): Promise<void> {
    if (!subject.trim()) return
    currentSubject.value = subject
    loading.value = true
    error.value = null
    try {
      const offset = (targetPage - 1) * limit.value
      const result = await getBooksBySubject(subject.trim(), limit.value, offset, false)
      books.value = result.items
      total.value = result.workCount
      page.value = targetPage
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Lỗi tải sách theo chủ đề'
      books.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  const detail = ref<BookDetail | null>(null)
  const detailLoading = ref(false)
  const detailError = ref<string | null>(null)

  async function loadDetail(openLibraryId: string): Promise<BookDetail | null> {
    detailLoading.value = true
    detailError.value = null
    try {
      detail.value = await getBookDetail(openLibraryId)
      return detail.value
    } catch (e) {
      detailError.value = e instanceof Error ? e.message : 'Lỗi tải chi tiết'
      detail.value = null
      return null
    } finally {
      detailLoading.value = false
    }
  }

  return {
    books,
    total,
    page,
    limit,
    loading,
    error,
    currentSubject,
    search,
    fetchBySubject,
    detail,
    detailLoading,
    detailError,
    loadDetail,
  }
}
