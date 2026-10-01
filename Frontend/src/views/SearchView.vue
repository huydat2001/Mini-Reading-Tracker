<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useBooks } from '../composables/useBooks'
import { useLibrary } from '../composables/useLibrary'
import { addToLibrary } from '../api/library'
import type { BookSearchItem, SearchParams } from '../types'
import BookCard from '../components/BookCard.vue'
import BookListItem from '../components/BookListItem.vue'
import BookDetailDialog from '../components/BookDetailDialog.vue'
import ErrorDisplay from '../components/ErrorDisplay.vue'
import { parseApiError } from '../utils/errorHandler'

const subjects = [
  { key: 'love', name: 'Tình yêu', icon: 'mdi-heart', color: 'pink' },
  { key: 'romance', name: 'Lãng mạn', icon: 'mdi-heart-multiple', color: 'red' },
  { key: 'fiction', name: 'Tiểu thuyết', icon: 'mdi-book-open-page-variant', color: 'indigo' },
  { key: 'fantasy', name: 'Kỳ ảo', icon: 'mdi-creation', color: 'deep-purple' },
  { key: 'science', name: 'Khoa học', icon: 'mdi-atom', color: 'teal' },
  { key: 'history', name: 'Lịch sử', icon: 'mdi-history', color: 'brown' },
  { key: 'mystery', name: 'Bí ẩn', icon: 'mdi-incognito', color: 'blue-grey' },
  { key: 'philosophy', name: 'Triết học', icon: 'mdi-brain', color: 'amber-darken-3' },
  { key: 'psychology', name: 'Tâm lý', icon: 'mdi-head-heart', color: 'cyan-darken-2' },
  { key: 'biography', name: 'Tiểu sử', icon: 'mdi-account-star', color: 'deep-orange' },
  { key: 'adventure', name: 'Phiêu lưu', icon: 'mdi-compass', color: 'green-darken-2' },
]

const sortOptions = [
  { title: 'Liên quan nhất', value: '' },
  { title: 'Mới nhất trước', value: 'new' },
  { title: 'Cũ nhất trước', value: 'old' },
  { title: 'Ngẫu nhiên', value: 'random' },
]

const languageOptions = [
  { title: 'Tất cả ngôn ngữ', value: '' },
  { title: 'Tiếng Anh', value: 'eng' },
  { title: 'Tiếng Việt', value: 'vie' },
  { title: 'Tiếng Pháp', value: 'fre' },
  { title: 'Tiếng Đức', value: 'ger' },
  { title: 'Tiếng Tây Ban Nha', value: 'spa' },
  { title: 'Tiếng Nhật', value: 'jpn' },
  { title: 'Tiếng Trung', value: 'chi' },
  { title: 'Tiếng Hàn', value: 'kor' },
]

const query = ref('')
const selectedSubject = ref<string>('love')
const viewMode = ref<'grid' | 'list'>('grid')
const addingIds = ref<Set<string>>(new Set())
const snackbar = ref({ show: false, text: '', color: 'success' })
const selectedBookId = ref<string | null>(null)
const isDetailOpen = ref(false)

// Advanced filter fields
const filterAuthor = ref('')
const filterSubject = ref('')
const filterLanguage = ref('')
const filterYearStart = ref('')
const filterYearEnd = ref('')
const filterSort = ref('')
const showFilters = ref(false)

const {
  books,
  total,
  page,
  loading,
  error,
  search,
  fetchBySubject,
} = useBooks()
const { isInLibrary, refreshExistingIds } = useLibrary()

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / 20)))
const hasSearched = computed(() => query.value.trim().length > 0 || hasActiveFilters.value)
const activeSubjectObj = computed(() =>
  subjects.find((s) => s.key === selectedSubject.value) || { name: selectedSubject.value, icon: 'mdi-tag' },
)

const hasActiveFilters = computed(() => {
  return !!(
    filterAuthor.value.trim() ||
    filterSubject.value.trim() ||
    filterLanguage.value ||
    filterYearStart.value ||
    filterYearEnd.value ||
    filterSort.value
  )
})

const activeFilterCount = computed(() => {
  let count = 0
  if (filterAuthor.value.trim()) count++
  if (filterSubject.value.trim()) count++
  if (filterLanguage.value) count++
  if (filterYearStart.value || filterYearEnd.value) count++
  if (filterSort.value) count++
  return count
})

let debounceTimer: ReturnType<typeof setTimeout> | undefined

function buildSearchParams(): SearchParams {
  const params: SearchParams = {}
  if (query.value.trim()) params.q = query.value.trim()
  if (filterAuthor.value.trim()) params.author = filterAuthor.value.trim()
  if (filterSubject.value.trim()) params.subject = filterSubject.value.trim()
  if (filterLanguage.value) params.language = filterLanguage.value
  if (filterYearStart.value) params.yearStart = filterYearStart.value
  if (filterYearEnd.value) params.yearEnd = filterYearEnd.value
  if (filterSort.value) params.sort = filterSort.value
  return params
}

function triggerSearch(newPage = 1) {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    const params = buildSearchParams()
    const hasAnyParam = Object.keys(params).length > 0
    if (hasAnyParam) {
      search(params, newPage)
    } else if (selectedSubject.value) {
      fetchBySubject(selectedSubject.value, newPage)
    }
  }, 400)
}

watch(query, (val) => {
  if (!val || !val.trim()) {
    if (!hasActiveFilters.value && selectedSubject.value) {
      fetchBySubject(selectedSubject.value, 1)
    } else if (hasActiveFilters.value) {
      triggerSearch(1)
    }
    return
  }
  triggerSearch(1)
})

function onSelectSubject(key: string) {
  selectedSubject.value = key
  if (query.value.trim().length > 0) {
    query.value = ''
  }
  clearAllFilters(false)
  fetchBySubject(key, 1)
}

function onPageChange(newPage: number) {
  if (hasSearched.value) {
    const params = buildSearchParams()
    search(params, newPage)
  } else if (selectedSubject.value) {
    fetchBySubject(selectedSubject.value, newPage)
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function retry() {
  if (hasSearched.value) {
    const params = buildSearchParams()
    search(params, page.value)
  } else if (selectedSubject.value) {
    fetchBySubject(selectedSubject.value, page.value)
  }
}

function applyFilters() {
  if (filterYearStart.value && filterYearEnd.value) {
    const startNum = parseInt(filterYearStart.value, 10)
    const endNum = parseInt(filterYearEnd.value, 10)
    if (!isNaN(startNum) && !isNaN(endNum) && endNum < startNum) {
      snackbar.value = {
        show: true,
        text: `"Năm đến" (${filterYearEnd.value}) không được nhỏ hơn "Năm từ" (${filterYearStart.value})`,
        color: 'warning',
      }
      return
    }
  }
  triggerSearch(1)
}

function clearAllFilters(doSearch = true) {
  filterAuthor.value = ''
  filterSubject.value = ''
  filterLanguage.value = ''
  filterYearStart.value = ''
  filterYearEnd.value = ''
  filterSort.value = ''
  if (doSearch) {
    triggerSearch(1)
  }
}

async function handleAdd(book: BookSearchItem) {
  addingIds.value = new Set([...addingIds.value, book.openLibraryId])
  try {
    await addToLibrary({
      openLibraryId: book.openLibraryId,
      title: book.title,
      authorName: book.authorName ?? undefined,
      coverUrl: book.coverUrl ?? undefined,
    })
    await refreshExistingIds()
    snackbar.value = { show: true, text: `Đã thêm "${book.title}" vào tủ`, color: 'success' }
  } catch (e) {
    const errDetails = parseApiError(e)
    const isConflict = errDetails.type === 'conflict' || errDetails.statusCode === 409
    snackbar.value = {
      show: true,
      text: isConflict ? `"${book.title}" đã có trong tủ sách` : errDetails.message,
      color: isConflict ? 'warning' : 'error',
    }
    if (isConflict) await refreshExistingIds()
  } finally {
    const next = new Set(addingIds.value)
    next.delete(book.openLibraryId)
    addingIds.value = next
  }
}

function handleDetail(book: BookSearchItem) {
  selectedBookId.value = book.openLibraryId
  isDetailOpen.value = true
}

function onBookAddedFromDetail() {
  refreshExistingIds()
}

onMounted(() => {
  refreshExistingIds()
  fetchBySubject('love', 1)
})
</script>

<template>
  <div class="search-view-container">
    <!-- Header Hero Section -->
    <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between gap-3 mb-6">
      <div>
        <div class="d-flex align-center gap-2 mb-1">
          <div class="hero-badge">
            <v-icon icon="mdi-compass-outline" color="primary" size="22" />
          </div>
          <h1 class="text-h5 text-md-h4 font-weight-bold page-title mb-0">
            Khám Phá Sách
          </h1>
        </div>
        <p class="text-body-2 text-grey-darken-1 mb-0 ps-sm-1">
          Tìm kiếm hàng triệu đầu sách từ kho tàng Open Library, lọc theo chủ đề và thêm vào tủ cá nhân.
        </p>
      </div>

      <div class="d-flex align-center gap-2">
        <v-btn
          to="/library"
          variant="outlined"
          color="grey-darken-1"
          class="btn-pill text-none"
          size="small"
          prepend-icon="mdi-bookshelf"
        >
          Xem tủ sách
        </v-btn>
      </div>
    </div>

    <!-- Search Bar Card -->
    <div class="search-box-card pa-3 pa-sm-4 bg-white rounded-xl border mb-4">
      <div class="d-flex align-center gap-2">
        <v-text-field
          v-model="query"
          prepend-inner-icon="mdi-magnify"
          placeholder="Nhập tên sách, tác giả... (VD: Harry Potter, Dune, Sapiens)"
          clearable
          density="comfortable"
          variant="outlined"
          hide-details
          class="search-main-field flex-grow-1"
          :loading="loading && !!query.trim()"
          @keyup.enter="triggerSearch(1)"
        />
        <v-btn
          color="primary"
          class="btn-pill btn-gradient-primary text-none px-5 d-none d-sm-flex"
          prepend-icon="mdi-magnify"
          :loading="loading"
          @click="triggerSearch(1)"
        >
          Tìm kiếm
        </v-btn>
      </div>

      <!-- Advanced Filter Accordion Trigger -->
      <div class="mt-3 d-flex align-center justify-space-between">
        <button
          type="button"
          class="btn-toggle-filter d-flex align-center gap-1"
          @click="showFilters = !showFilters"
        >
          <v-icon
            :icon="showFilters ? 'mdi-chevron-up' : 'mdi-filter-variant'"
            size="16"
            color="primary"
          />
          <span>{{ showFilters ? 'Thu gọn bộ lọc nâng cao' : 'Bộ lọc nâng cao' }}</span>
          <span v-if="activeFilterCount > 0" class="filter-count-badge">
            {{ activeFilterCount }}
          </span>
        </button>

        <span v-if="hasActiveFilters" class="text-caption text-primary font-weight-medium cursor-pointer" @click="clearAllFilters(true)">
          Xóa tất cả bộ lọc
        </span>
      </div>

      <!-- Advanced Filters Expanded Content -->
      <v-expand-transition>
        <div v-if="showFilters" class="filter-expand-area mt-3 pt-3 border-t">
          <v-row dense>
            <!-- Author -->
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model="filterAuthor"
                label="Tác giả"
                prepend-inner-icon="mdi-account-edit"
                density="compact"
                variant="outlined"
                clearable
                hide-details
                class="rounded-lg"
              />
            </v-col>

            <!-- Subject -->
            <v-col cols="12" sm="6" md="4">
              <v-text-field
                v-model="filterSubject"
                label="Chủ đề từ khóa"
                prepend-inner-icon="mdi-tag-outline"
                density="compact"
                variant="outlined"
                clearable
                hide-details
                class="rounded-lg"
              />
            </v-col>

            <!-- Language -->
            <v-col cols="12" sm="6" md="4">
              <v-select
                v-model="filterLanguage"
                :items="languageOptions"
                item-title="title"
                item-value="value"
                label="Ngôn ngữ"
                prepend-inner-icon="mdi-translate"
                density="compact"
                variant="outlined"
                clearable
                hide-details
                class="rounded-lg"
              />
            </v-col>

            <!-- Year Range -->
            <v-col cols="6" sm="3" md="2">
              <v-text-field
                v-model="filterYearStart"
                label="Năm từ"
                prepend-inner-icon="mdi-calendar-start"
                density="compact"
                variant="outlined"
                type="number"
                hide-details
                class="rounded-lg"
                placeholder="1990"
              />
            </v-col>
            <v-col cols="6" sm="3" md="2">
              <v-text-field
                v-model="filterYearEnd"
                label="Năm đến"
                prepend-inner-icon="mdi-calendar-end"
                density="compact"
                variant="outlined"
                type="number"
                hide-details
                class="rounded-lg"
                placeholder="2024"
              />
            </v-col>

            <!-- Sort By -->
            <v-col cols="12" sm="6" md="4">
              <v-select
                v-model="filterSort"
                :items="sortOptions"
                item-title="title"
                item-value="value"
                label="Sắp xếp theo"
                prepend-inner-icon="mdi-sort"
                density="compact"
                variant="outlined"
                clearable
                hide-details
                class="rounded-lg"
              />
            </v-col>
          </v-row>

          <!-- Filter Action Buttons -->
          <div class="d-flex align-center justify-end gap-2 mt-3">
            <v-btn
              variant="tonal"
              color="grey-darken-1"
              size="small"
              class="btn-rounded text-none px-4"
              prepend-icon="mdi-close-circle-outline"
              :disabled="!hasActiveFilters"
              @click="clearAllFilters(true)"
            >
              Đặt lại
            </v-btn>
            <v-btn
              color="primary"
              size="small"
              class="btn-rounded btn-gradient-primary text-none px-5"
              prepend-icon="mdi-check"
              @click="applyFilters"
            >
              Áp dụng lọc
            </v-btn>
          </div>
        </div>
      </v-expand-transition>
    </div>

    <!-- Subject Category Pills -->
    <div class="subjects-bar p-2 mb-5 bg-white rounded-xl border">
      <div class="d-flex align-center gap-1 overflow-x-auto py-1 filter-pills">
        <div class="text-caption font-weight-bold text-slate-500 ps-2 pe-1 d-none d-md-flex align-center">
          <v-icon icon="mdi-tag-multiple-outline" size="16" class="me-1 text-primary" />
          Chủ đề:
        </div>

        <button
          v-for="sub in subjects"
          :key="sub.key"
          type="button"
          class="subject-pill-btn"
          :class="{ active: selectedSubject === sub.key && !hasSearched }"
          @click="onSelectSubject(sub.key)"
        >
          <v-icon :icon="sub.icon" size="15" class="me-1" />
          <span>{{ sub.name }}</span>
        </button>
      </div>
    </div>

    <!-- Results Header: Count & Grid/List Switcher -->
    <div class="d-flex flex-wrap align-center justify-space-between gap-2 mb-4 px-1">
      <div class="text-body-2 text-slate-700 d-flex align-center">
        <template v-if="loading">
          <v-progress-circular indeterminate size="18" width="2" color="primary" class="me-2" />
          <span>Đang tìm kiếm sách...</span>
        </template>
        <template v-else-if="error">
          <span class="text-error font-weight-medium">{{ error.message }}</span>
        </template>
        <template v-else-if="hasSearched">
          <span>
            Kết quả tìm kiếm
            <template v-if="query.trim()">cho <strong class="text-slate-900">"{{ query }}"</strong></template>
            <template v-if="hasActiveFilters">
              <span class="text-caption text-primary ms-1">(đã lọc)</span>
            </template>
            :
            <strong class="text-primary">{{ total }}</strong> cuốn (trang {{ page }}/{{ totalPages }})
          </span>
        </template>
        <template v-else>
          <span class="d-flex align-center">
            <v-icon :icon="activeSubjectObj.icon" size="18" color="primary" class="me-1" />
            Chủ đề <strong class="text-primary mx-1">{{ activeSubjectObj.name }}</strong>:
            <span class="ms-1">{{ total }} cuốn (trang {{ page }}/{{ totalPages }})</span>
          </span>
        </template>
      </div>

      <!-- View Switcher -->
      <div class="view-switcher-wrapper d-flex align-center p-1 bg-white border rounded-pill">
        <button
          type="button"
          class="view-pill-btn"
          :class="{ active: viewMode === 'grid' }"
          title="Xem dạng lưới"
          @click="viewMode = 'grid'"
        >
          <v-icon icon="mdi-view-grid-outline" size="16" class="me-1" />
          <span>Lưới</span>
        </button>
        <button
          type="button"
          class="view-pill-btn"
          :class="{ active: viewMode === 'list' }"
          title="Xem dạng danh sách"
          @click="viewMode = 'list'"
        >
          <v-icon icon="mdi-view-list-outline" size="16" class="me-1" />
          <span>Danh sách</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && books.length === 0" class="text-center py-16">
      <v-progress-circular indeterminate size="52" width="4" color="primary" />
      <p class="text-body-2 text-slate-500 font-weight-medium mt-4">
        Đang tải dữ liệu từ Open Library...
      </p>
    </div>

    <!-- Error State -->
    <ErrorDisplay
      v-else-if="error"
      :error="error"
      @retry="retry"
    />

    <!-- Empty State -->
    <div v-else-if="books.length === 0" class="text-center py-16 px-4">
      <div class="empty-state-card mx-auto pa-8 rounded-xl border bg-white" style="max-width: 500px;">
        <div class="empty-icon-ring mx-auto mb-4">
          <v-icon size="44" color="primary">mdi-book-search-outline</v-icon>
        </div>
        <h3 class="text-h6 font-weight-bold text-slate-800 mb-2">
          Không tìm thấy cuốn sách nào
        </h3>
        <p class="text-body-2 text-slate-500 mb-5">
          Hãy thử đổi từ khóa tìm kiếm, kiểm tra lỗi chính tả hoặc chọn một trong các chủ đề đề xuất phía trên.
        </p>
        <v-btn
          v-if="hasSearched"
          variant="tonal"
          color="primary"
          class="btn-pill text-none px-5"
          prepend-icon="mdi-refresh"
          @click="onSelectSubject('love')"
        >
          Quay lại chủ đề gợi ý
        </v-btn>
      </div>
    </div>

    <!-- Content State: Books Grid vs List -->
    <template v-else>
      <!-- Grid View -->
      <v-row v-if="viewMode === 'grid'" dense>
        <v-col
          v-for="book in books"
          :key="book.openLibraryId"
          cols="6"
          sm="4"
          md="3"
          lg="2"
          class="d-flex mb-2"
        >
          <BookCard
            :book="book"
            :in-library="isInLibrary(book.openLibraryId)"
            :busy="addingIds.has(book.openLibraryId)"
            class="w-100"
            @add="handleAdd"
            @detail="handleDetail"
          />
        </v-col>
      </v-row>

      <!-- List View -->
      <div v-else class="list-view-wrapper">
        <BookListItem
          v-for="book in books"
          :key="book.openLibraryId"
          :book="book"
          :in-library="isInLibrary(book.openLibraryId)"
          :busy="addingIds.has(book.openLibraryId)"
          @add="handleAdd"
          @detail="handleDetail"
        />
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="d-flex justify-center mt-6 mb-8">
        <v-pagination
          v-model="page"
          :length="totalPages"
          :total-visible="7"
          rounded="circle"
          color="primary"
          class="custom-pagination"
          @update:model-value="onPageChange"
        />
      </div>
    </template>

    <!-- Feedback Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      location="bottom center"
      timeout="3000"
      class="rounded-lg"
    >
      <div class="d-flex align-center gap-2">
        <v-icon
          :icon="snackbar.color === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle'"
          size="20"
        />
        <span class="font-weight-medium">{{ snackbar.text }}</span>
      </div>
      <template v-slot:actions>
        <v-btn icon="mdi-close" size="small" variant="text" @click="snackbar.show = false" />
      </template>
    </v-snackbar>

    <!-- Book Detail Modal -->
    <BookDetailDialog
      v-model="isDetailOpen"
      :open-library-id="selectedBookId"
      @added="onBookAddedFromDetail"
    />
  </div>
</template>

<style scoped>
.page-title {
  color: #0f172a;
  letter-spacing: -0.025em;
}

.hero-badge {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(59, 130, 246, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-box-card {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.search-main-field :deep(.v-field) {
  border-radius: 9999px !important;
  background-color: #f8fafc;
}

.btn-toggle-filter {
  background: transparent;
  border: none;
  font-size: 0.825rem;
  font-weight: 600;
  color: #3b82f6;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.15s ease;
}
.btn-toggle-filter:hover {
  background-color: #eff6ff;
}

.filter-count-badge {
  padding: 1px 6px;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 700;
  background-color: #3b82f6;
  color: #ffffff;
}

.filter-expand-area {
  border-color: #f1f5f9 !important;
}

/* Subject Pills */
.subjects-bar {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.filter-pills {
  scrollbar-width: none;
}
.filter-pills::-webkit-scrollbar {
  display: none;
}

.subject-pill-btn {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #64748b;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.18s ease;
}

.subject-pill-btn:hover {
  color: #1e293b;
  background-color: #f1f5f9;
}

.subject-pill-btn.active {
  background-color: #3b82f6;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

/* View Switcher */
.view-switcher-wrapper {
  padding: 2px;
  gap: 2px;
}

.view-pill-btn {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #64748b;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.18s ease;
}

.view-pill-btn:hover {
  color: #1e293b;
}

.view-pill-btn.active {
  background-color: #3b82f6;
  color: #ffffff;
}

/* Empty state */
.empty-state-card {
  box-shadow: 0 4px 20px -4px rgba(0, 0, 0, 0.06);
}

.empty-icon-ring {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: #eff6ff;
  border: 7px solid #dbeafe;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
</style>
