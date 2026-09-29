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
  <v-card height="100%" class="d-flex flex-column">
    <v-img
      :src="cover"
      height="220"
      cover
      class="cursor-pointer"
      @click="emit('detail', book)"
    >
      <template v-slot:placeholder>
        <div class="d-flex align-center justify-center fill-height">
          <v-progress-circular indeterminate color="primary" />
        </div>
      </template>
      <template v-slot:error>
        <v-img src="https://via.placeholder.com/200x300?text=No+Cover" height="220" cover />
      </template>
    </v-img>

    <v-card-title
      class="text-subtitle-1 font-weight-bold text-truncate px-3 pt-3"
      :title="book.title"
      @click="emit('detail', book)"
      style="cursor: pointer"
    >
      {{ book.title }}
    </v-card-title>

    <v-card-subtitle class="px-3 pb-1 text-truncate">
      {{ book.authorName || 'Không rõ tác giả' }}
    </v-card-subtitle>

    <v-card-text class="px-3 pt-0 text-caption text-grey">
      <span v-if="book.publishYear">Năm XB: {{ book.publishYear }}</span>
      <span v-else>Năm XB: Không rõ</span>
    </v-card-text>

    <v-spacer />

    <v-card-actions class="px-3 pb-3">
      <v-btn
        v-if="!inLibrary"
        color="primary"
        size="small"
        block
        prepend-icon="mdi-plus"
        :loading="busy"
        @click="emit('add', book)"
      >
        Thêm vào tủ
      </v-btn>
      <v-chip
        v-else
        color="success"
        size="small"
        block
        prepend-icon="mdi-check-circle"
        label
        class="w-100"
      >
        Đã thêm
      </v-chip>
    </v-card-actions>
  </v-card>
</template>
