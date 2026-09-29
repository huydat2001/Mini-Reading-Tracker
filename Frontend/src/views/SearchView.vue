<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useBooks } from '../composables/useBooks'
import { useLibrary } from '../composables/useLibrary'
import { addToLibrary } from '../api/library'
import type { BookSearchItem } from '../types'
import BookCard from '../components/BookCard.vue'

const query = ref('')
const addingIds = ref<Set<string>>(new Set())
const snackbar = ref({ show: false, text: '', color: 'success' })

const { books, total, page, loading, error, search } = useBooks()
const { isInLibrary, refreshExistingIds } = useLibrary()

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / 20)))
const hasSearched = computed(() => query.value.trim().length > 0)

let debounceTimer: ReturnType<typeof setTimeout> | undefined

function triggerSearch(newPage = 1) {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    search(query.value, newPage)
  }, 500)
}

watch(query, () => triggerSearch(1))

function onPageChange(newPage: number) {
  search(query.value, newPage)
  window.scrollTo({ top: 0, behavior: 'smooth' })
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

function handleDetail(_book: BookSearchItem) {
  snackbar.value = { show: true, text: 'Chi tiết sách sẽ có ở màn hình 2', color: 'info' }
}

onMounted(() => {
  refreshExistingIds()
})
</script>

<template>
  <div>
    <v-row justify="center">
      <v-col cols="12" md="8">
        <v-text-field
          v-model="query"
          prepend-inner-icon="mdi-magnify"
          label="Tìm kiếm sách (Open Library)..."
          placeholder="VD: Harry Potter, Dune, Sapiens..."
          clearable
          :loading="loading"
        />
      </v-col>
    </v-row>

    <v-row justify="center">
      <v-col cols="12" md="10" class="text-center text-body-2 text-grey-darken-1">
        <span v-if="!hasSearched">Nhập từ khóa để bắt đầu tìm kiếm</span>
        <span v-else-if="loading">Đang tải...</span>
        <span v-else-if="error" class="text-error">{{ error }}</span>
        <span v-else-if="books.length === 0">Không có kết quả</span>
        <span v-else>Tìm thấy {{ total }} kết quả (trang {{ page }}/{{ totalPages }})</span>
      </v-col>
    </v-row>

    <v-row v-if="loading" justify="center" class="mt-4">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate size="48" color="primary" />
      </v-col>
    </v-row>

    <template v-else>
      <v-row v-if="error" justify="center" class="mt-6">
        <v-col cols="12" md="8" class="text-center">
          <v-alert type="error" variant="tonal" class="mb-4">
            {{ error }}
          </v-alert>
          <v-btn color="error" variant="outlined" prepend-icon="mdi-refresh" @click="triggerSearch(page)">
            Thử lại
          </v-btn>
        </v-col>
      </v-row>

      <v-row v-else-if="hasSearched && books.length === 0" justify="center" class="mt-10">
        <v-col cols="12" md="6" class="text-center">
          <v-icon size="80" color="grey-lighten-1">mdi-book-search-outline</v-icon>
          <p class="text-h6 text-grey mt-3">Không tìm thấy cuốn sách nào</p>
          <p class="text-body-2 text-grey-lighten-1">Thử từ khóa khác nhé</p>
        </v-col>
      </v-row>

      <v-row v-else-if="books.length > 0" class="mt-2">
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

      <v-row v-if="!loading && !error && books.length > 0 && totalPages > 1" justify="center" class="mt-6">
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

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" location="bottom center" timeout="3000">
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn icon="mdi-close" variant="text" @click="snackbar.show = false" />
      </template>
    </v-snackbar>
  </div>
</template>
