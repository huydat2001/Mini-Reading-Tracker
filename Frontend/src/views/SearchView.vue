<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useBooks } from '../composables/useBooks'
import { useLibrary } from '../composables/useLibrary'
import { addToLibrary } from '../api/library'
import type { BookSearchItem } from '../types'
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

const query = ref('')
const selectedSubject = ref<string>('love')
const viewMode = ref<'grid' | 'list'>('grid')
const addingIds = ref<Set<string>>(new Set())
const snackbar = ref({ show: false, text: '', color: 'success' })
const selectedBookId = ref<string | null>(null)
const isDetailOpen = ref(false)

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
const hasSearched = computed(() => query.value.trim().length > 0)
const activeSubjectObj = computed(() =>
  subjects.find((s) => s.key === selectedSubject.value) || { name: selectedSubject.value, icon: 'mdi-tag' },
)

let debounceTimer: ReturnType<typeof setTimeout> | undefined

function triggerSearch(newPage = 1) {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    if (query.value.trim().length > 0) {
      search(query.value, newPage)
    } else if (selectedSubject.value) {
      fetchBySubject(selectedSubject.value, newPage)
    }
  }, 400)
}

watch(query, (val) => {
  if (!val || !val.trim()) {
    if (selectedSubject.value) {
      fetchBySubject(selectedSubject.value, 1)
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
  fetchBySubject(key, 1)
}

function onPageChange(newPage: number) {
  if (hasSearched.value) {
    search(query.value, newPage)
  } else if (selectedSubject.value) {
    fetchBySubject(selectedSubject.value, newPage)
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function retry() {
  if (hasSearched.value) {
    search(query.value, page.value)
  } else if (selectedSubject.value) {
    fetchBySubject(selectedSubject.value, page.value)
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
              Kết quả tìm kiếm cho <strong class="text-grey-darken-4">"{{ query }}"</strong>:
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
