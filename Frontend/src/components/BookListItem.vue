<script setup lang="ts">
import { computed } from 'vue'
import type { BookSearchItem } from '../types'

const props = defineProps<{
  book: BookSearchItem
  inLibrary: boolean
  busy?: boolean
}>()

const emit = defineEmits<{
  (e: 'add', book: BookSearchItem): void
  (e: 'detail', book: BookSearchItem): void
}>()

const cover = computed(
  () =>
    props.book.coverUrl ||
    'https://via.placeholder.com/120x180?text=No+Cover',
)
</script>

<template>
  <div class="search-list-item card-hover-lift rounded-xl bg-white border mb-3 pa-3 overflow-hidden">
    <div class="d-flex flex-column flex-sm-row align-sm-center gap-3">
      <!-- Book Cover -->
      <div class="cover-wrapper cursor-pointer flex-shrink-0" @click="emit('detail', book)">
        <v-img
          :src="cover"
          width="75"
          height="110"
          cover
          class="book-list-cover rounded-lg"
        >
          <template v-slot:placeholder>
            <div class="d-flex align-center justify-center fill-height bg-slate-100">
              <v-progress-circular indeterminate size="18" color="primary" />
            </div>
          </template>
          <template v-slot:error>
            <div class="d-flex align-center justify-center fill-height bg-slate-100">
              <v-icon icon="mdi-book-outline" size="24" color="grey-lighten-1" />
            </div>
          </template>
        </v-img>
      </div>

      <!-- Book Info -->
      <div class="flex-grow-1 min-w-0">
        <h3
          class="book-title text-subtitle-1 font-weight-bold text-truncate cursor-pointer mb-1"
          :title="book.title"
          @click="emit('detail', book)"
        >
          {{ book.title }}
        </h3>

        <div class="d-flex align-center text-caption text-primary font-weight-medium mb-2 text-truncate">
          <v-icon icon="mdi-feather" size="14" class="me-1 flex-shrink-0" />
          <span>{{ book.authorName || 'Không rõ tác giả' }}</span>
        </div>

        <div class="d-flex flex-wrap align-center gap-2">
          <span class="meta-pill">
            <v-icon icon="mdi-calendar-blank-outline" size="13" class="me-1" />
            {{ book.publishYear ? `Năm ${book.publishYear}` : 'Năm XB: Chưa rõ' }}
          </span>

          <span class="meta-pill text-slate-500 font-mono">
            <v-icon icon="mdi-identifier" size="13" class="me-1 text-primary" />
            {{ book.openLibraryId }}
          </span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="d-flex align-center gap-2 flex-shrink-0 mt-3 mt-sm-0">
        <v-btn
          variant="tonal"
          color="grey-darken-2"
          size="small"
          class="btn-rounded text-none px-3"
          prepend-icon="mdi-information-outline"
          @click="emit('detail', book)"
        >
          Chi tiết
        </v-btn>

        <v-btn
          v-if="!inLibrary"
          color="primary"
          size="small"
          class="btn-rounded btn-gradient-primary text-none px-4"
          prepend-icon="mdi-plus"
          :loading="busy"
          @click="emit('add', book)"
        >
          Thêm vào tủ
        </v-btn>

        <div
          v-else
          class="added-chip d-flex align-center text-caption font-weight-semibold px-3 py-1 rounded-lg"
        >
          <v-icon icon="mdi-check-circle" size="16" color="success" class="me-1" />
          Đã thêm
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-list-item {
  border-color: rgba(226, 232, 240, 0.9) !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.cover-wrapper {
  overflow: hidden;
}

.book-list-cover {
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.25s ease;
}

.search-list-item:hover .book-list-cover {
  transform: scale(1.05);
}

.book-title {
  color: #0f172a;
}
.book-title:hover {
  color: #2563eb;
}

.meta-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.73rem;
  padding: 2px 8px;
  border-radius: 6px;
  background-color: #f1f5f9;
  color: #475569;
}

.font-mono {
  font-family: monospace;
}

.added-chip {
  background-color: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
  height: 32px;
}

.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.min-w-0 { min-width: 0; }
</style>
