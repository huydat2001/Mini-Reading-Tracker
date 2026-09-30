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
    'https://via.placeholder.com/200x300?text=No+Cover',
)
</script>

<template>
  <div class="search-book-card card-hover-lift rounded-xl d-flex flex-column h-100 bg-white border overflow-hidden">
    <!-- Cover with overlay badge -->
    <div class="cover-wrapper cursor-pointer position-relative" @click="emit('detail', book)">
      <v-img
        :src="cover"
        height="210"
        cover
        class="book-card-cover"
      >
        <template v-slot:placeholder>
          <div class="d-flex align-center justify-center fill-height bg-slate-100">
            <v-progress-circular indeterminate size="24" color="primary" />
          </div>
        </template>
        <template v-slot:error>
          <div class="d-flex align-center justify-center fill-height bg-slate-100">
            <v-icon icon="mdi-book-outline" size="40" color="grey-lighten-1" />
          </div>
        </template>
      </v-img>

      <!-- In-library badge on cover -->
      <div v-if="inLibrary" class="cover-status-badge">
        <v-icon icon="mdi-check-decagram" size="14" class="me-1 text-white" />
        <span>Trong tủ</span>
      </div>
    </div>

    <!-- Content -->
    <div class="pa-3 d-flex flex-column flex-grow-1">
      <h3
        class="book-title text-caption font-weight-bold mb-1 cursor-pointer"
        :title="book.title"
        @click="emit('detail', book)"
      >
        {{ book.title }}
      </h3>

      <div class="text-caption text-primary font-weight-medium text-truncate mb-1">
        {{ book.authorName || 'Không rõ tác giả' }}
      </div>

      <div class="text-caption text-slate-500 mb-2">
        <span v-if="book.publishYear" class="year-pill">
          {{ book.publishYear }}
        </span>
        <span v-else class="text-slate-400">Năm: Chưa rõ</span>
      </div>

      <div class="mt-auto pt-2">
        <v-btn
          v-if="!inLibrary"
          color="primary"
          size="small"
          class="btn-rounded btn-gradient-primary text-none w-100"
          prepend-icon="mdi-plus"
          :loading="busy"
          @click="emit('add', book)"
        >
          Thêm vào tủ
        </v-btn>

        <div
          v-else
          class="added-chip w-100 d-flex align-center justify-center text-caption font-weight-semibold py-1 rounded-lg"
        >
          <v-icon icon="mdi-check-circle" size="15" color="success" class="me-1" />
          Đã trong tủ
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-book-card {
  position: relative;
  border-color: rgba(226, 232, 240, 0.9) !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.cover-wrapper {
  overflow: hidden;
  background-color: #f8fafc;
}

.book-card-cover {
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-book-card:hover .book-card-cover {
  transform: scale(1.04);
}

.cover-status-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(16, 185, 129, 0.9);
  color: #ffffff;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 9999px;
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.book-title {
  color: #0f172a;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.85rem !important;
}

.book-title:hover {
  color: #2563eb;
}

.year-pill {
  font-size: 0.7rem;
  padding: 1px 6px;
  border-radius: 4px;
  background-color: #f1f5f9;
  color: #475569;
}

.added-chip {
  background-color: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.bg-slate-100 {
  background-color: #f1f5f9;
}
</style>
