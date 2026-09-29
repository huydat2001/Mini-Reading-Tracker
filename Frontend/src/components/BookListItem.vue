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
  <v-card elevation="2" class="mb-3 rounded-lg overflow-hidden transition-swing">
    <div class="d-flex flex-column flex-sm-row align-sm-center pa-3 gap-3">
      <!-- Book Cover -->
      <div class="d-flex justify-center justify-sm-start flex-shrink-0">
        <v-card
          elevation="1"
          class="rounded overflow-hidden cursor-pointer"
          width="80"
          height="115"
          @click="emit('detail', book)"
        >
          <v-img :src="cover" height="115" cover>
            <template v-slot:placeholder>
              <div class="d-flex align-center justify-center fill-height">
                <v-progress-circular indeterminate size="20" color="primary" />
              </div>
            </template>
            <template v-slot:error>
              <v-img src="https://via.placeholder.com/120x180?text=No+Cover" height="115" cover />
            </template>
          </v-img>
        </v-card>
      </div>

      <!-- Book Info -->
      <div class="flex-grow-1 min-width-0">
        <h3
          class="text-subtitle-1 font-weight-bold text-truncate cursor-pointer text-grey-darken-4"
          :title="book.title"
          @click="emit('detail', book)"
        >
          {{ book.title }}
        </h3>

        <div class="text-caption text-primary font-weight-medium mb-1 text-truncate">
          <v-icon icon="mdi-account-edit" size="x-small" class="me-1" />
          {{ book.authorName || 'Không rõ tác giả' }}
        </div>

        <div class="d-flex flex-wrap align-center gap-2 mt-1">
          <v-chip size="x-small" variant="outlined" color="grey-darken-2" class="me-2" prepend-icon="mdi-calendar-blank">
            {{ book.publishYear ? `Xuất bản: ${book.publishYear}` : 'Năm XB: Chưa rõ' }}
          </v-chip>

          <v-chip size="x-small" variant="outlined" color="primary" prepend-icon="mdi-identifier">
            {{ book.openLibraryId }}
          </v-chip>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="d-flex align-center gap-2 flex-shrink-0 mt-2 mt-sm-0">
        <v-btn
          variant="outlined"
          color="secondary"
          size="small"
          prepend-icon="mdi-information-outline"
          class="text-none"
          @click="emit('detail', book)"
        >
          Chi tiết
        </v-btn>

        <v-btn
          v-if="!inLibrary"
          color="primary"
          size="small"
          prepend-icon="mdi-plus"
          class="text-none"
          :loading="busy"
          @click="emit('add', book)"
        >
          Thêm vào tủ
        </v-btn>
        <v-chip
          v-else
          color="success"
          size="small"
          prepend-icon="mdi-check-circle"
          label
        >
          Đã thêm
        </v-chip>
      </div>
    </div>
  </v-card>
</template>
