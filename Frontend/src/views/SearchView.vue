<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useBooks } from '../composables/useBooks'
import { useLibrary } from '../composables/useLibrary'
import { addToLibrary } from '../api/library'
import type { BookSearchItem, SearchParams } from '../types'
import BookCard from '../components/BookCard.vue'
import BookListItem from '../components/BookListItem.vue'
import BookDetailDialog from '../components/BookDetailDialog.vue'

const subjects = [
  { key: 'love', name: 'Love', icon: 'mdi-heart', color: 'pink' },
  { key: 'romance', name: 'Romance', icon: 'mdi-heart-multiple', color: 'red' },
  { key: 'fiction', name: 'Fiction', icon: 'mdi-book-open-page-variant', color: 'indigo' },
  { key: 'fantasy', name: 'Fantasy', icon: 'mdi-creation', color: 'deep-purple' },
  { key: 'science', name: 'Science', icon: 'mdi-atom', color: 'teal' },
  { key: 'history', name: 'History', icon: 'mdi-history', color: 'brown' },
  { key: 'mystery', name: 'Mystery', icon: 'mdi-incognito', color: 'blue-grey' },
  { key: 'philosophy', name: 'Philosophy', icon: 'mdi-brain', color: 'amber-darken-3' },
  { key: 'psychology', name: 'Psychology', icon: 'mdi-head-heart', color: 'cyan-darken-2' },
  { key: 'biography', name: 'Biography', icon: 'mdi-account-star', color: 'deep-orange' },
  { key: 'adventure', name: 'Adventure', icon: 'mdi-compass', color: 'green-darken-2' },
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

// Check if any advanced filter is active
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
  // Validate year range on client side
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
    const msg = e instanceof Error ? e.message : 'Thêm thất bại'
    const isConflict = msg.includes('đã có trong tủ')
    snackbar.value = {
      show: true,
      text: isConflict ? `"${book.title}" đã có trong tủ` : msg,
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
  <div>
    <!-- Search Bar -->
    <v-row justify="center">
      <v-col cols="12" md="9" lg="8">
        <v-text-field
          v-model="query"
          prepend-inner-icon="mdi-magnify"
          label="Tìm kiếm sách (Open Library)..."
          placeholder="VD: Harry Potter, Dune, Sapiens..."
          clearable
          :loading="loading"
          class="elevation-1 rounded-lg"
        />
      </v-col>
    </v-row>

    <!-- Advanced Filters Panel -->
    <v-row justify="center" class="mt-n4 mb-1">
      <v-col cols="12" md="9" lg="8">
        <v-expansion-panels v-model="showFilters" variant="accordion" flat>
          <v-expansion-panel
            value="filters"
            elevation="0"
            rounded="lg"
            class="filter-panel"
          >
            <v-expansion-panel-title class="filter-panel-title py-2">
              <div class="d-flex align-center gap-2">
                <v-icon icon="mdi-filter-variant" size="small" color="primary" />
                <span class="text-body-2 font-weight-medium">Bộ lọc nâng cao</span>
                <v-badge
                  v-if="activeFilterCount > 0"
                  :content="activeFilterCount"
                  color="primary"
                  inline
                />
              </div>
            </v-expansion-panel-title>

            <v-expansion-panel-text>
              <v-row dense class="mt-1">

                <!-- Author filter -->
                <v-col cols="12" sm="6" md="6">
                  <v-text-field
                    v-model="filterAuthor"
                    label="Tác giả"
                    prepend-inner-icon="mdi-account-edit"
                    density="compact"
                    variant="outlined"
                    clearable
                    hide-details
                    class="filter-field"
                  />
                </v-col>

                <!-- Subject filter -->
                <v-col cols="12" sm="6" md="6">
                  <v-text-field
                    v-model="filterSubject"
                    label="Chủ đề"
                    prepend-inner-icon="mdi-tag-outline"
                    density="compact"
                    variant="outlined"
                    clearable
                    hide-details
                    class="filter-field"
                  />
                </v-col>

                <!-- Language select -->
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
                    class="filter-field"
                  />
                </v-col>

                <!-- Year range -->
                <v-col cols="6" sm="3" md="2">
                  <v-text-field
                    v-model="filterYearStart"
                    label="Năm từ"
                    prepend-inner-icon="mdi-calendar-start"
                    density="compact"
                    variant="outlined"
                    type="number"
                    hide-details
                    class="filter-field"
                    placeholder="VD: 1990"
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
                    class="filter-field"
                    placeholder="VD: 2024"
                  />
                </v-col>

                <!-- Sort select -->
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
                    class="filter-field"
                  />
                </v-col>
              </v-row>

              <!-- Filter Actions -->
              <v-row dense class="mt-3 mb-1">
                <v-col cols="12" class="d-flex justify-end gap-2">
                  <v-btn
                    variant="text"
                    size="small"
                    color="grey"
                    prepend-icon="mdi-close-circle-outline"
                    :disabled="!hasActiveFilters"
                    @click="clearAllFilters(true)"
                    class="text-none"
                  >
                    Xóa bộ lọc
                  </v-btn>
                  <v-btn
                    variant="flat"
                    size="small"
                    color="primary"
                    prepend-icon="mdi-magnify"
                    @click="applyFilters"
                    class="text-none"
                  >
                    Áp dụng lọc
                  </v-btn>
                </v-col>
              </v-row>

              <!-- Active Filter Chips -->
              <div v-if="hasActiveFilters" class="d-flex flex-wrap gap-1 mt-1 mb-1">
                <v-chip
                  v-if="filterAuthor"
                  closable
                  size="x-small"
                  color="teal"
                  variant="flat"
                  @click:close="filterAuthor = ''; applyFilters()"
                >
                  Tác giả: {{ filterAuthor }}
                </v-chip>
                <v-chip
                  v-if="filterSubject"
                  closable
                  size="x-small"
                  color="deep-purple"
                  variant="flat"
                  @click:close="filterSubject = ''; applyFilters()"
                >
                  Chủ đề: {{ filterSubject }}
                </v-chip>
                <v-chip
                  v-if="filterLanguage"
                  closable
                  size="x-small"
                  color="blue"
                  variant="flat"
                  @click:close="filterLanguage = ''; applyFilters()"
                >
                  Ngôn ngữ: {{ languageOptions.find(l => l.value === filterLanguage)?.title || filterLanguage }}
                </v-chip>
                <v-chip
                  v-if="filterYearStart || filterYearEnd"
                  closable
                  size="x-small"
                  color="orange"
                  variant="flat"
                  @click:close="filterYearStart = ''; filterYearEnd = ''; applyFilters()"
                >
                  Năm: {{ filterYearStart || '*' }} – {{ filterYearEnd || '*' }}
                </v-chip>
                <v-chip
                  v-if="filterSort"
                  closable
                  size="x-small"
                  color="pink"
                  variant="flat"
                  @click:close="filterSort = ''; applyFilters()"
                >
                  Sắp xếp: {{ sortOptions.find(s => s.value === filterSort)?.title || filterSort }}
                </v-chip>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-col>
    </v-row>

    <!-- Subjects Keywords Section -->
    <v-row justify="center" class="mt-n2 mb-3">
      <v-col cols="12" md="10" lg="9">
        <div class="d-flex align-center flex-wrap gap-2">
          <div class="d-flex align-center text-caption font-weight-bold text-grey-darken-2 me-2 py-1">
            <v-icon icon="mdi-tag-multiple-outline" size="small" class="me-1 text-primary" />
            Chủ đề sách:
          </div>

          <v-chip-group
            v-model="selectedSubject"
            selected-class="text-white"
            mandatory
          >
            <v-chip
              v-for="sub in subjects"
              :key="sub.key"
              :value="sub.key"
              :color="selectedSubject === sub.key ? 'primary' : undefined"
              :variant="selectedSubject === sub.key && !hasSearched ? 'flat' : 'outlined'"
              size="small"
              class="ma-1 font-weight-medium"
              filter
              :prepend-icon="sub.icon"
              @click="onSelectSubject(sub.key)"
            >
              {{ sub.name }}
            </v-chip>
          </v-chip-group>
        </div>
      </v-col>
    </v-row>

    <!-- Results Header: Count & Grid/List Toggle Button -->
    <v-row justify="center" align="center" class="mb-3">
      <v-col cols="12" md="10" lg="10" class="d-flex flex-wrap align-center justify-space-between gap-2">
        <div class="text-body-2 text-grey-darken-2 d-flex align-center">
          <template v-if="loading">
            <v-progress-circular indeterminate size="16" width="2" color="primary" class="me-2" />
            <span>Đang tải danh sách sách...</span>
          </template>
          <template v-else-if="error">
            <span class="text-error font-weight-medium">{{ error }}</span>
          </template>
          <template v-else-if="hasSearched">
            <span>
              Kết quả tìm kiếm
              <template v-if="query.trim()">cho <strong class="text-grey-darken-4">"{{ query }}"</strong></template>
              <template v-if="hasActiveFilters">
                <v-icon icon="mdi-filter" size="x-small" class="mx-1" />
                <span class="text-caption">(có bộ lọc)</span>
              </template>
              :
              <strong class="text-primary">{{ total }}</strong> cuốn (trang {{ page }}/{{ totalPages }})
            </span>
          </template>
          <template v-else>
            <span class="d-flex align-center">
              <v-icon :icon="activeSubjectObj.icon" size="small" color="primary" class="me-1" />
              Sách theo chủ đề <strong class="text-primary mx-1">{{ activeSubjectObj.name }}</strong>:
              <span>{{ total }} cuốn (trang {{ page }}/{{ totalPages }})</span>
            </span>
          </template>
        </div>

        <!-- Grid / List Switcher Button -->
        <div class="d-flex align-center">
          <v-btn-toggle
            v-model="viewMode"
            mandatory
            density="compact"
            variant="outlined"
            divided
            color="primary"
            rounded="lg"
          >
            <v-btn value="grid" size="small" prepend-icon="mdi-view-grid" class="text-none">
              Lưới
            </v-btn>
            <v-btn value="list" size="small" prepend-icon="mdi-view-list" class="text-none">
              Danh sách
            </v-btn>
          </v-btn-toggle>
        </div>
      </v-col>
    </v-row>

    <!-- Loading State -->
    <v-row v-if="loading" justify="center" class="mt-8 mb-12">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate size="52" color="primary" />
        <p class="text-body-2 text-grey-darken-1 mt-3">Đang tải dữ liệu từ Open Library...</p>
      </v-col>
    </v-row>

    <template v-else>
      <!-- Error State -->
      <v-row v-if="error" justify="center" class="mt-6 mb-8">
        <v-col cols="12" md="8" class="text-center">
          <v-alert type="error" variant="tonal" class="mb-4 text-start">
            {{ error }}
          </v-alert>
          <v-btn color="error" variant="outlined" prepend-icon="mdi-refresh" @click="retry">
            Thử lại
          </v-btn>
        </v-col>
      </v-row>

      <!-- Empty State -->
      <v-row v-else-if="books.length === 0" justify="center" class="mt-10 mb-12">
        <v-col cols="12" md="6" class="text-center">
          <v-icon size="80" color="grey-lighten-1">mdi-book-search-outline</v-icon>
          <p class="text-h6 text-grey mt-3">Không tìm thấy cuốn sách nào</p>
          <p class="text-body-2 text-grey-lighten-1">Hãy thử chọn chủ đề khác hoặc thay đổi từ khóa tìm kiếm</p>
        </v-col>
      </v-row>

      <!-- Content State: Grid View vs List View -->
      <template v-else>
        <!-- Dạng Lưới (Grid) -->
        <v-row v-if="viewMode === 'grid'" class="mt-1">
          <v-col
            v-for="book in books"
            :key="book.openLibraryId"
            cols="6"
            sm="4"
            md="3"
            lg="2"
          >
            <BookCard
              :book="book"
              :in-library="isInLibrary(book.openLibraryId)"
              :busy="addingIds.has(book.openLibraryId)"
              @add="handleAdd"
              @detail="handleDetail"
            />
          </v-col>
        </v-row>

        <!-- Dạng Danh sách (List) -->
        <v-row v-else class="mt-1" justify="center">
          <v-col cols="12" md="10" lg="10">
            <BookListItem
              v-for="book in books"
              :key="book.openLibraryId"
              :book="book"
              :in-library="isInLibrary(book.openLibraryId)"
              :busy="addingIds.has(book.openLibraryId)"
              @add="handleAdd"
              @detail="handleDetail"
            />
          </v-col>
        </v-row>
      </template>

      <!-- Pagination -->
      <v-row v-if="!loading && !error && books.length > 0 && totalPages > 1" justify="center" class="mt-6 mb-4">
        <v-col cols="auto">
          <v-pagination
            v-model="page"
            :length="totalPages"
            :total-visible="7"
            @update:model-value="onPageChange"
          />
        </v-col>
      </v-row>
    </template>

    <!-- Feedback Toast -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" location="bottom center" timeout="3000">
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn icon="mdi-close" variant="text" @click="snackbar.show = false" />
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
.filter-panel {
  background: rgba(var(--v-theme-surface), 0.95) !important;
  border: 1px solid rgba(var(--v-theme-primary), 0.12);
}

.filter-panel-title {
  min-height: 40px !important;
}

.filter-field :deep(.v-field) {
  font-size: 0.875rem;
}

.gap-1 {
  gap: 4px;
}

.gap-2 {
  gap: 8px;
}
</style>
