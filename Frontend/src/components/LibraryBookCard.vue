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
      totalPages: number
    }>,
  ): void
  (e: 'delete', entry: LibraryEntry): void
}>()

const statusOptions: Array<{ title: string; value: ReadingStatus; color: string; icon: string }> = [
  { title: 'Muốn đọc', value: 'want_to_read', color: 'blue-grey', icon: 'mdi-bookmark-outline' },
  { title: 'Đang đọc', value: 'reading', color: 'amber-darken-3', icon: 'mdi-book-open-page-variant' },
  { title: 'Đã đọc', value: 'read', color: 'success', icon: 'mdi-check-decagram' },
]

const ratingLabels: Record<number, string> = {
  1: 'Không thích',
  2: 'Bình thường',
  3: 'Khá hay',
  4: 'Rất hay',
  5: 'Tuyệt phẩm',
}

const currentStatus = ref<ReadingStatus>(props.entry.status)
const pagesInput = ref<number>(props.entry.pagesRead)
const currentRating = ref<number | undefined>(props.entry.rating ?? undefined)
const currentNotes = ref<string>(props.entry.notes || '')
const isEditingNotes = ref(false)

// Total pages editing
const totalPagesInput = ref<number | null>(props.entry.book.totalPages)
const isEditingTotalPages = ref(false)

watch(
  () => props.entry,
  (newEntry) => {
    currentStatus.value = newEntry.status
    pagesInput.value = newEntry.pagesRead
    currentRating.value = newEntry.rating ?? undefined
    currentNotes.value = newEntry.notes || ''
    totalPagesInput.value = newEntry.book.totalPages
    isEditingTotalPages.value = false
  },
  { deep: true },
)

const totalPages = computed(() => props.entry.book.totalPages)
const hasTotalPages = computed(() => totalPages.value !== null && totalPages.value > 0)

const progressPercent = computed(() => {
  if (!hasTotalPages.value || !totalPages.value) return 0
  const pct = Math.round((props.entry.pagesRead / totalPages.value) * 100)
  return Math.min(100, Math.max(0, pct))
})

const isCompleted = computed(() => {
  return props.entry.status === 'read' || (hasTotalPages.value && totalPages.value !== null && props.entry.pagesRead >= totalPages.value)
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
  if (!hasTotalPages.value) return

  let val = Number(pagesInput.value)
  if (isNaN(val) || val < 0) {
    val = 0
  }
  if (totalPages.value && val > totalPages.value) {
    val = totalPages.value
  }
  pagesInput.value = val
  if (val !== props.entry.pagesRead) {
    emit('update', props.entry.id, { pagesRead: val })
  }
}

function addPages(step: number) {
  if (!hasTotalPages.value || !totalPages.value) return
  const current = Number(pagesInput.value) || 0
  const nextVal = Math.min(totalPages.value, current + step)
  pagesInput.value = nextVal
  emit('update', props.entry.id, { pagesRead: nextVal })
}

function markCompleted() {
  if (!hasTotalPages.value || !totalPages.value) return
  pagesInput.value = totalPages.value
  emit('update', props.entry.id, { pagesRead: totalPages.value, status: 'read' })
}

function saveTotalPages() {
  const val = Number(totalPagesInput.value)
  if (isNaN(val) || val <= 0) return
  emit('update', props.entry.id, { totalPages: val })
  isEditingTotalPages.value = false
}

function cancelTotalPagesEdit() {
  totalPagesInput.value = props.entry.book.totalPages
  isEditingTotalPages.value = false
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
  <div class="book-card-wrapper card-hover-lift rounded-xl d-flex flex-column h-100 bg-white">
    <!-- Main Card Body -->
    <div class="pa-4 flex-grow-1">
      <div class="d-flex gap-3">
        <!-- Cover Art with Badge -->
        <div class="cover-column">
          <div class="book-cover-container">
            <v-img
              :src="cover"
              height="160"
              cover
              class="book-cover rounded-lg"
            >
              <template v-slot:error>
                <div class="cover-placeholder d-flex align-center justify-center h-100">
                  <v-icon icon="mdi-book-outline" size="36" color="grey-lighten-1" />
                </div>
              </template>
            </v-img>

            <!-- Progress chip overlay on cover -->
            <div
              v-if="hasTotalPages"
              class="cover-badge"
              :class="isCompleted ? 'badge-success' : 'badge-primary'"
            >
              {{ isCompleted ? '100%' : `${progressPercent}%` }}
            </div>
          </div>
        </div>

        <!-- Book Meta & Status -->
        <div class="flex-grow-1 min-w-0">
          <div class="d-flex align-start justify-space-between gap-1">
            <div class="pe-1 min-w-0">
              <h3
                class="book-title text-subtitle-1 font-weight-bold mb-1"
                :title="entry.book.title"
              >
                {{ entry.book.title }}
              </h3>
              <div class="d-flex align-center text-caption text-primary font-weight-semibold mb-1">
                <v-icon icon="mdi-feather" size="14" class="me-1 flex-shrink-0" />
                <span class="text-truncate">{{ entry.book.authorName || 'Không rõ tác giả' }}</span>
              </div>
              <div class="text-caption text-grey-darken-1 d-flex flex-wrap align-center gap-1">
                <span v-if="entry.book.publishYear" class="info-pill">
                  Năm {{ entry.book.publishYear }}
                </span>
                <span v-if="totalPages" class="info-pill">
                  {{ totalPages }} trang
                </span>
              </div>
            </div>

            <!-- Delete Button -->
            <button
              type="button"
              class="btn-action-delete pa-1 d-flex align-center justify-center flex-shrink-0"
              title="Xóa khỏi tủ sách"
              :disabled="busy"
              @click="emit('delete', entry)"
            >
              <v-icon icon="mdi-trash-can-outline" size="20" />
            </button>
          </div>

          <!-- Status Dropdown -->
          <div class="mt-3">
            <v-select
              v-model="currentStatus"
              :items="statusOptions"
              item-title="title"
              item-value="value"
              density="compact"
              variant="outlined"
              hide-details
              class="status-select rounded-lg"
              :disabled="busy"
              @update:model-value="onStatusChange"
            >
              <template v-slot:selection="{ item }">
                <div class="d-flex align-center gap-1">
                  <v-icon :icon="item.raw.icon" size="16" :color="item.raw.color" />
                  <span class="text-caption font-weight-bold">{{ item.raw.title }}</span>
                </div>
              </template>
            </v-select>
          </div>
        </div>
      </div>

      <div class="divider-line my-3"></div>

      <!-- Reading Progress Section -->
      <div class="progress-section mb-3">
        <template v-if="hasTotalPages">
          <div class="d-flex align-center justify-space-between text-caption mb-1">
            <span class="font-weight-semibold text-slate-700 d-flex align-center gap-1">
              <v-icon icon="mdi-bookmark-check-outline" size="15" color="primary" />
              Tiến độ đọc:
            </span>
            <span class="font-weight-bold" :class="isCompleted ? 'text-success' : 'text-primary'">
              {{ entry.pagesRead }} / {{ totalPages }} trang
              <span class="text-grey-darken-1 font-weight-normal">({{ progressPercent }}%)</span>
            </span>
          </div>

          <v-progress-linear
            :model-value="progressPercent"
            height="7"
            rounded
            :color="isCompleted ? 'success' : 'primary'"
            class="progress-bar mb-2"
          />

          <!-- Quick Increment Buttons & Input -->
          <div class="d-flex flex-wrap align-center gap-1 mt-2">
            <v-text-field
              v-model.number="pagesInput"
              type="number"
              density="compact"
              variant="outlined"
              label="Trang đã đọc"
              hide-details
              class="pages-input-field"
              :min="0"
              :max="totalPages || undefined"
              :disabled="busy"
              @blur="onPagesBlurOrEnter"
              @keyup.enter="onPagesBlurOrEnter"
            />

            <!-- Save button -->
            <v-btn
              size="small"
              :color="pagesInput !== entry.pagesRead ? 'primary' : 'grey-lighten-2'"
              :variant="pagesInput !== entry.pagesRead ? 'flat' : 'tonal'"
              class="btn-rounded text-none px-3"
              :class="{ 'btn-gradient-primary': pagesInput !== entry.pagesRead }"
              :disabled="busy || pagesInput === entry.pagesRead"
              @click="onPagesBlurOrEnter"
            >
              <v-icon icon="mdi-check" size="16" class="me-1" />
              Lưu
            </v-btn>

            <!-- Quick Step Buttons -->
            <button
              type="button"
              class="btn-step"
              title="Đọc thêm 5 trang"
              :disabled="busy || isCompleted"
              @click="addPages(5)"
            >
              +5
            </button>
            <button
              type="button"
              class="btn-step"
              title="Đọc thêm 10 trang"
              :disabled="busy || isCompleted"
              @click="addPages(10)"
            >
              +10
            </button>
            <button
              type="button"
              class="btn-step"
              title="Đọc thêm 25 trang"
              :disabled="busy || isCompleted"
              @click="addPages(25)"
            >
              +25
            </button>

            <!-- Mark Complete Shortcut -->
            <button
              v-if="!isCompleted"
              type="button"
              class="btn-step btn-step-complete"
              title="Đánh dấu đã đọc xong cuốn sách này"
              :disabled="busy"
              @click="markCompleted"
            >
              <v-icon icon="mdi-check-all" size="13" class="me-1" />
              Xong
            </button>
          </div>

          <!-- Edit Total Pages toggle -->
          <div class="mt-2">
            <template v-if="!isEditingTotalPages">
              <button
                type="button"
                class="btn-link-edit"
                @click="isEditingTotalPages = true"
              >
                <v-icon icon="mdi-pencil-ruler" size="13" class="me-1" />
                Đổi tổng số trang ({{ totalPages }})
              </button>
            </template>
            <template v-else>
              <div class="d-flex align-center gap-1 mt-1 p-2 bg-slate-50 rounded-lg">
                <v-text-field
                  v-model.number="totalPagesInput"
                  type="number"
                  density="compact"
                  variant="outlined"
                  label="Tổng số trang"
                  hide-details
                  style="max-width: 130px;"
                  :min="1"
                  @keyup.enter="saveTotalPages"
                />
                <v-btn
                  size="small"
                  variant="flat"
                  color="primary"
                  class="btn-rounded btn-gradient-primary text-none px-3"
                  :disabled="busy || !totalPagesInput || totalPagesInput <= 0"
                  @click="saveTotalPages"
                >
                  Lưu
                </v-btn>
                <v-btn
                  size="small"
                  variant="tonal"
                  color="grey-darken-1"
                  class="btn-rounded text-none px-2"
                  @click="cancelTotalPagesEdit"
                >
                  Hủy
                </v-btn>
              </div>
            </template>
          </div>
        </template>

        <!-- Missing Total Pages Alert -->
        <template v-else>
          <div class="missing-pages-card pa-3 rounded-lg mb-2">
            <div class="d-flex align-center gap-2 mb-2 text-amber-900">
              <v-icon icon="mdi-alert-circle-outline" color="amber-darken-3" size="18" />
              <span class="text-caption font-weight-bold">Chưa có thông tin tổng số trang</span>
            </div>
            <p class="text-caption text-slate-600 mb-2">
              Bổ sung tổng số trang để kích hoạt thanh tiến độ và các nút tăng trang nhanh.
            </p>
            <div class="d-flex align-center gap-2">
              <v-text-field
                v-model.number="totalPagesInput"
                type="number"
                density="compact"
                variant="outlined"
                label="Tổng số trang"
                placeholder="VD: 350"
                hide-details
                style="max-width: 140px;"
                :min="1"
                @keyup.enter="saveTotalPages"
              />
              <v-btn
                size="small"
                color="primary"
                class="btn-rounded btn-gradient-primary text-none px-3"
                prepend-icon="mdi-plus"
                :disabled="busy || !totalPagesInput || totalPagesInput <= 0"
                @click="saveTotalPages"
              >
                Bổ sung
              </v-btn>
            </div>
          </div>
        </template>
      </div>

      <div class="divider-line my-3"></div>

      <!-- Rating Section -->
      <div class="d-flex align-center justify-space-between mb-2">
        <span class="text-caption font-weight-semibold text-slate-700 d-flex align-center gap-1">
          <v-icon icon="mdi-star-outline" size="15" color="amber-darken-2" />
          Đánh giá:
        </span>
        <div class="d-flex align-center gap-2">
          <v-rating
            v-model="currentRating"
            color="amber-darken-1"
            active-color="amber-darken-2"
            density="compact"
            size="small"
            clearable
            hover
            :disabled="busy"
            @update:model-value="onRatingChange"
          />
          <span
            v-if="currentRating"
            class="rating-label text-caption font-weight-bold text-amber-darken-3"
          >
            {{ ratingLabels[currentRating] || `${currentRating} sao` }}
          </span>
        </div>
      </div>

      <!-- Personal Notes Section -->
      <div class="notes-container mt-2">
        <div class="d-flex align-center justify-space-between text-caption mb-1">
          <span class="font-weight-semibold text-slate-700 d-flex align-center gap-1">
            <v-icon icon="mdi-note-text-outline" size="15" color="primary" />
            Ghi chú cá nhân:
          </span>
          <button
            v-if="!isEditingNotes"
            type="button"
            class="btn-link-edit"
            @click="isEditingNotes = true"
          >
            <v-icon
              :icon="entry.notes ? 'mdi-pencil-outline' : 'mdi-plus'"
              size="13"
              class="me-1"
            />
            {{ entry.notes ? 'Sửa' : 'Thêm ghi chú' }}
          </button>
        </div>

        <!-- Note Text View -->
        <div v-if="!isEditingNotes">
          <div
            v-if="entry.notes"
            class="note-box pa-2 rounded-lg text-caption"
          >
            <v-icon icon="mdi-format-quote-open" size="14" color="primary" class="me-1 opacity-70" />
            {{ entry.notes }}
          </div>
          <div v-else class="text-caption text-grey-lighten-1 font-italic">
            Chưa có ghi chú cảm nghĩ nào.
          </div>
        </div>

        <!-- Note Textarea Edit -->
        <div v-else class="mt-2">
          <v-textarea
            v-model="currentNotes"
            rows="2"
            auto-grow
            density="compact"
            variant="outlined"
            placeholder="Viết cảm nghĩ, trích dẫn hay của bạn..."
            hide-details
            class="note-textarea mb-2"
          />
          <div class="d-flex justify-end gap-2">
            <v-btn
              size="small"
              variant="tonal"
              color="grey-darken-1"
              class="btn-rounded text-none px-3"
              @click="cancelNotes"
            >
              Hủy
            </v-btn>
            <v-btn
              size="small"
              color="primary"
              variant="flat"
              class="btn-rounded btn-gradient-primary text-none px-3"
              prepend-icon="mdi-content-save-check-outline"
              :disabled="busy"
              @click="saveNotes"
            >
              Lưu ghi chú
            </v-btn>
          </div>
        </div>
      </div>
    </div>

    <!-- Reading Dates Footer -->
    <div class="card-footer px-4 py-2 border-t d-flex align-center justify-space-between text-caption">
      <span class="d-flex align-center text-slate-500">
        <v-icon icon="mdi-calendar-start" size="14" class="me-1 text-slate-400" />
        {{ entry.startedAt ? formatDate(entry.startedAt) : 'Chưa bắt đầu' }}
      </span>
      <span v-if="entry.finishedAt" class="d-flex align-center text-emerald-600 font-weight-medium">
        <v-icon icon="mdi-flag-checkered" size="14" class="me-1 text-emerald-500" />
        {{ formatDate(entry.finishedAt) }}
      </span>
      <span v-else-if="entry.status === 'reading'" class="reading-badge-live">
        <span class="pulse-dot"></span> Đang đọc
      </span>
    </div>
  </div>
</template>

<style scoped>
.book-card-wrapper {
  position: relative;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}

.cover-column {
  width: 95px;
  flex-shrink: 0;
}

.book-cover-container {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12);
}

.book-cover {
  transition: transform 0.25s ease;
}

.book-card-wrapper:hover .book-cover {
  transform: scale(1.03);
}

.cover-placeholder {
  background: #f1f5f9;
}

.cover-badge {
  position: absolute;
  bottom: 6px;
  left: 6px;
  right: 6px;
  text-align: center;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 4px;
  border-radius: 4px;
  color: #ffffff;
  backdrop-filter: blur(4px);
}

.badge-primary {
  background: rgba(37, 99, 235, 0.85);
}

.badge-success {
  background: rgba(16, 185, 129, 0.9);
}

.book-title {
  color: #0f172a;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.info-pill {
  font-size: 0.72rem;
  padding: 1px 6px;
  border-radius: 4px;
  background-color: #f1f5f9;
  color: #475569;
}

.divider-line {
  height: 1px;
  background-color: #f1f5f9;
}

.pages-input-field {
  max-width: 120px;
}
.pages-input-field :deep(.v-field) {
  border-radius: 8px !important;
  font-size: 0.825rem;
}

.status-select :deep(.v-field) {
  border-radius: 8px !important;
  font-size: 0.825rem;
}

.btn-link-edit {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: #3b82f6;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
  transition: all 0.15s ease;
}
.btn-link-edit:hover {
  background-color: #eff6ff;
  color: #1d4ed8;
}

.btn-step-complete {
  background-color: #ecfdf5 !important;
  color: #059669 !important;
  border-color: rgba(16, 185, 129, 0.3) !important;
}
.btn-step-complete:hover:not(:disabled) {
  background-color: #10b981 !important;
  color: #ffffff !important;
}

.missing-pages-card {
  background-color: #fffbeb;
  border: 1px solid #fde68a;
}

.note-box {
  background-color: #f8fafc;
  border-left: 3px solid #3b82f6;
  color: #334155;
  white-space: pre-wrap;
  line-height: 1.4;
}

.note-textarea :deep(.v-field) {
  border-radius: 8px !important;
  font-size: 0.825rem;
}

.card-footer {
  background-color: #fafbfc;
  border-color: #f1f5f9 !important;
}

.reading-badge-live {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #d97706;
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #f59e0b;
  box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7);
  animation: pulse 1.8s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 6px rgba(245, 158, 11, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0);
  }
}

.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }

.min-w-0 {
  min-width: 0;
}
</style>
