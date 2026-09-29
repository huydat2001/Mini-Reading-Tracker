<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { LibraryEntry, ReadingStatus } from '../types'

const props = defineProps<{
  entry: LibraryEntry
  busy?: boolean
}>()

const emit = defineEmits<{
  (
    e: 'update',
    id: number,
    payload: Partial<{
      status: ReadingStatus
      pagesRead: number
      rating: number | null
      notes: string | null
    }>,
  ): void
  (e: 'delete', entry: LibraryEntry): void
}>()

const statusOptions: Array<{ title: string; value: ReadingStatus; color: string; icon: string }> = [
  { title: 'Muốn đọc', value: 'want_to_read', color: 'blue-grey', icon: 'mdi-bookmark-outline' },
  { title: 'Đang đọc', value: 'reading', color: 'amber-darken-2', icon: 'mdi-book-open-page-variant' },
  { title: 'Đã đọc', value: 'read', color: 'success', icon: 'mdi-check-circle-outline' },
]

const currentStatus = ref<ReadingStatus>(props.entry.status)
const pagesInput = ref<number>(props.entry.pagesRead)
const currentRating = ref<number | undefined>(props.entry.rating ?? undefined)
const currentNotes = ref<string>(props.entry.notes || '')
const isEditingNotes = ref(false)

watch(
  () => props.entry,
  (newEntry) => {
    currentStatus.value = newEntry.status
    pagesInput.value = newEntry.pagesRead
    currentRating.value = newEntry.rating ?? undefined
    currentNotes.value = newEntry.notes || ''
  },
  { deep: true },
)

const totalPages = computed(() => props.entry.book.totalPages)

const progressPercent = computed(() => {
  if (!totalPages.value || totalPages.value <= 0) return 0
  const pct = Math.round((props.entry.pagesRead / totalPages.value) * 100)
  return Math.min(100, Math.max(0, pct))
})

const cover = computed(
  () =>
    props.entry.book.coverUrl ||
    'https://via.placeholder.com/200x300?text=No+Cover',
)

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function onStatusChange(newStatus: ReadingStatus) {
  emit('update', props.entry.id, { status: newStatus })
}

function onPagesBlurOrEnter() {
  let val = Number(pagesInput.value)
  if (isNaN(val) || val < 0) {
    val = 0
  }
  if (totalPages.value && totalPages.value > 0 && val > totalPages.value) {
    val = totalPages.value
  }
  pagesInput.value = val
  if (val !== props.entry.pagesRead) {
    emit('update', props.entry.id, { pagesRead: val })
  }
}

function onRatingChange(newRating: string | number) {
  const val = Number(newRating)
  emit('update', props.entry.id, { rating: isNaN(val) || val <= 0 ? null : val })
}

function saveNotes() {
  emit('update', props.entry.id, { notes: currentNotes.value.trim() || null })
  isEditingNotes.value = false
}

function cancelNotes() {
  currentNotes.value = props.entry.notes || ''
  isEditingNotes.value = false
}
</script>

<template>
  <v-card elevation="2" class="rounded-lg h-100 d-flex flex-column transition-swing">
    <v-card-text class="pa-4 flex-grow-1">
      <v-row no-gutters>
        <!-- Book Cover -->
        <v-col cols="4" sm="3" class="pe-3">
          <v-card elevation="2" class="rounded overflow-hidden">
            <v-img :src="cover" height="150" cover>
              <template v-slot:error>
                <v-img src="https://via.placeholder.com/200x300?text=No+Cover" height="150" cover />
              </template>
            </v-img>
          </v-card>
        </v-col>

        <!-- Book Main Info -->
        <v-col cols="8" sm="9">
          <div class="d-flex align-start justify-space-between">
            <div class="pe-2">
              <h3 class="text-subtitle-1 font-weight-bold text-truncate-2" :title="entry.book.title">
                {{ entry.book.title }}
              </h3>
              <div class="text-caption text-primary font-weight-medium text-truncate">
                {{ entry.book.authorName || 'Không rõ tác giả' }}
              </div>
              <div class="text-caption text-grey">
                <span v-if="entry.book.publishYear">Năm XB: {{ entry.book.publishYear }}</span>
                <span v-if="entry.book.publishYear && totalPages"> • </span>
                <span v-if="totalPages">{{ totalPages }} trang</span>
              </div>
            </div>

            <!-- Delete action button -->
            <v-btn
              icon="mdi-delete-outline"
              size="small"
              variant="text"
              color="grey"
              title="Xóa khỏi tủ sách"
              :disabled="busy"
              @click="emit('delete', entry)"
            />
          </div>

          <!-- Status Selector -->
          <div class="mt-2">
            <v-select
              v-model="currentStatus"
              :items="statusOptions"
              item-title="title"
              item-value="value"
              density="compact"
              variant="outlined"
              hide-details
              :disabled="busy"
              @update:model-value="onStatusChange"
            >
              <template v-slot:selection="{ item }">
                <div class="d-flex align-center">
                  <v-icon :icon="item.raw.icon" size="small" :color="item.raw.color" class="me-1" />
                  <span class="text-caption font-weight-bold">{{ item.raw.title }}</span>
                </div>
              </template>
            </v-select>
          </div>
        </v-col>
      </v-row>

      <v-divider class="my-3" />

      <!-- Progress Section -->
      <div class="my-2">
        <div class="d-flex align-center justify-space-between text-caption mb-1">
          <span class="font-weight-medium text-grey-darken-2">Tiến độ đọc:</span>
          <span class="font-weight-bold text-primary">
            {{ entry.pagesRead }} / {{ totalPages ? totalPages : '?' }} trang
            <span v-if="totalPages">({{ progressPercent }}%)</span>
          </span>
        </div>

        <v-progress-linear
          :model-value="progressPercent"
          height="8"
          rounded
          :color="entry.status === 'read' ? 'success' : 'primary'"
          class="mb-2"
        />

        <!-- Input Pages Read -->
        <div class="d-flex align-center gap-2 mt-2">
          <v-text-field
            v-model.number="pagesInput"
            type="number"
            density="compact"
            variant="outlined"
            label="Trang đã đọc"
            hide-details
            style="max-width: 140px;"
            :min="0"
            :max="totalPages || undefined"
            :disabled="busy"
            @blur="onPagesBlurOrEnter"
            @keyup.enter="onPagesBlurOrEnter"
          />
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            class="text-none"
            :disabled="busy || pagesInput === entry.pagesRead"
            @click="onPagesBlurOrEnter"
          >
            Lưu
          </v-btn>
          <span v-if="totalPages && pagesInput >= totalPages" class="text-caption text-success d-flex align-center">
            <v-icon icon="mdi-check" size="small" class="me-1" /> Hoàn thành
          </span>
        </div>
      </div>

      <v-divider class="my-3" />

      <!-- Rating Section -->
      <div class="d-flex align-center justify-space-between mb-2">
        <span class="text-caption font-weight-medium text-grey-darken-2">Đánh giá:</span>
        <v-rating
          v-model="currentRating"
          color="amber-darken-2"
          active-color="amber"
          density="compact"
          size="small"
          clearable
          hover
          :disabled="busy"
          @update:model-value="onRatingChange"
        />
      </div>

      <!-- Notes Section -->
      <div class="mt-2">
        <div class="d-flex align-center justify-space-between text-caption mb-1">
          <span class="font-weight-medium text-grey-darken-2">Ghi chú cá nhân:</span>
          <v-btn
            v-if="!isEditingNotes"
            variant="text"
            size="x-small"
            color="primary"
            prepend-icon="mdi-pencil-outline"
            @click="isEditingNotes = true"
          >
            {{ entry.notes ? 'Sửa ghi chú' : 'Thêm ghi chú' }}
          </v-btn>
        </div>

        <div v-if="!isEditingNotes">
          <p
            v-if="entry.notes"
            class="text-caption text-grey-darken-3 bg-grey-lighten-4 rounded pa-2 mb-0"
            style="white-space: pre-wrap;"
          >
            {{ entry.notes }}
          </p>
          <p v-else class="text-caption text-grey-lighten-1 font-italic mb-0">
            Chưa có ghi chú nào.
          </p>
        </div>

        <div v-else class="mt-1">
          <v-textarea
            v-model="currentNotes"
            rows="2"
            auto-grow
            density="compact"
            variant="outlined"
            placeholder="Viết cảm nghĩ, ghi chú của bạn về cuốn sách..."
            hide-details
            class="mb-2"
          />
          <div class="d-flex justify-end gap-2">
            <v-btn size="x-small" variant="text" color="grey" @click="cancelNotes">
              Hủy
            </v-btn>
            <v-btn size="x-small" color="primary" variant="flat" :disabled="busy" @click="saveNotes">
              Lưu ghi chú
            </v-btn>
          </div>
        </div>
      </div>
    </v-card-text>

    <!-- Reading dates footer -->
    <v-card-actions class="px-4 py-2 bg-grey-lighten-5 text-caption text-grey d-flex justify-space-between">
      <span>
        <v-icon icon="mdi-calendar-start-outline" size="x-small" class="me-1" />
        {{ entry.startedAt ? `Bắt đầu: ${formatDate(entry.startedAt)}` : 'Chưa bắt đầu' }}
      </span>
      <span v-if="entry.finishedAt">
        <v-icon icon="mdi-calendar-check-outline" size="x-small" class="me-1 text-success" />
        {{ `Xong: ${formatDate(entry.finishedAt)}` }}
      </span>
    </v-card-actions>
  </v-card>
</template>
