<script setup lang="ts">
import { ref, watch } from 'vue'
import { getBookDetail } from '../api/books'
import { addToLibrary } from '../api/library'
import { useLibrary } from '../composables/useLibrary'
import type { BookDetail, ReadingStatus } from '../types'

const props = defineProps<{
  modelValue: boolean
  openLibraryId: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'added', book: BookDetail): void
}>()

const { isInLibrary, refreshExistingIds } = useLibrary()

const detail = ref<BookDetail | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const selectedStatus = ref<ReadingStatus>('want_to_read')
const submitting = ref(false)
const feedback = ref<{ show: boolean; text: string; color: string }>({
  show: false,
  text: '',
  color: 'success',
})

const statusOptions: Array<{ title: string; value: ReadingStatus; icon: string }> = [
  { title: 'Muốn đọc', value: 'want_to_read', icon: 'mdi-bookmark-outline' },
  { title: 'Đang đọc', value: 'reading', icon: 'mdi-book-open-page-variant' },
  { title: 'Đã đọc', value: 'read', icon: 'mdi-check-circle-outline' },
]

async function loadData() {
  if (!props.openLibraryId) {
    detail.value = null
    return
  }
  loading.value = true
  error.value = null
  try {
    detail.value = await getBookDetail(props.openLibraryId)
    await refreshExistingIds()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Không thể tải thông tin chi tiết'
    detail.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => props.openLibraryId,
  (newId) => {
    if (newId && props.modelValue) {
      loadData()
    }
  },
)

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen && props.openLibraryId) {
      loadData()
    } else if (!isOpen) {
      selectedStatus.value = 'want_to_read'
    }
  },
)

async function handleAdd() {
  if (!detail.value) return
  submitting.value = true
  try {
    await addToLibrary({
      openLibraryId: detail.value.openLibraryId,
      title: detail.value.title,
      authorName: detail.value.authorName ?? undefined,
      coverUrl: detail.value.coverUrl ?? undefined,
      totalPages: detail.value.totalPages ?? undefined,
      status: selectedStatus.value,
    })
    await refreshExistingIds()
    feedback.value = {
      show: true,
      text: `Đã thêm "${detail.value.title}" vào tủ sách!`,
      color: 'success',
    }
    emit('added', detail.value)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Thêm thất bại'
    const isConflict = msg.includes('đã có trong tủ') || msg.toLowerCase().includes('conflict')
    feedback.value = {
      show: true,
      text: isConflict ? `"${detail.value.title}" đã có trong tủ sách` : msg,
      color: isConflict ? 'warning' : 'error',
    }
    if (isConflict) await refreshExistingIds()
  } finally {
    submitting.value = false
  }
}

function closeDialog() {
  emit('update:modelValue', false)
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="780"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="detail-dialog-card bg-white rounded-xl overflow-hidden border">
      <!-- Header -->
      <div class="dialog-header px-4 py-3 border-b d-flex align-center justify-space-between">
        <div class="d-flex align-center gap-2">
          <div class="dialog-header-badge">
            <v-icon icon="mdi-book-open-page-variant" size="18" color="primary" />
          </div>
          <h2 class="text-subtitle-1 font-weight-bold text-slate-900 mb-0">
            Thông tin chi tiết tác phẩm
          </h2>
        </div>
        <button
          type="button"
          class="btn-close-dialog pa-1 d-flex align-center justify-center rounded-circle"
          @click="closeDialog"
        >
          <v-icon icon="mdi-close" size="20" />
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate size="48" color="primary" />
        <div class="text-body-2 text-slate-500 mt-3 font-weight-medium">Đang tải dữ liệu từ Open Library...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-10 px-4">
        <v-avatar color="red-lighten-5" size="52" class="mb-3">
          <v-icon icon="mdi-alert-circle-outline" color="error" size="28" />
        </v-avatar>
        <p class="text-body-1 font-weight-bold mb-1">Không thể tải thông tin</p>
        <p class="text-body-2 text-slate-500 mb-4">{{ error }}</p>
        <v-btn
          color="primary"
          class="btn-rounded btn-gradient-primary text-none"
          prepend-icon="mdi-refresh"
          @click="loadData"
        >
          Thử lại
        </v-btn>
      </div>

      <!-- Detail Content -->
      <div v-else-if="detail" class="dialog-body pa-4 pa-sm-6">
        <v-row>
          <!-- Left Cover Column -->
          <v-col cols="12" sm="4" md="4" class="text-center text-sm-start">
            <div class="cover-wrapper-detail mx-auto mx-sm-0">
              <v-img
                :src="detail.coverUrl || 'https://via.placeholder.com/220x330?text=No+Cover'"
                height="270"
                cover
                class="rounded-xl shadow-md"
              >
                <template v-slot:error>
                  <div class="d-flex align-center justify-center fill-height bg-slate-100 rounded-xl">
                    <v-icon icon="mdi-book-outline" size="54" color="grey-lighten-1" />
                  </div>
                </template>
              </v-img>
            </div>
          </v-col>

          <!-- Right Info Column -->
          <v-col cols="12" sm="8" md="8">
            <h1 class="text-h6 text-md-h5 font-weight-bold text-slate-900 mb-2" style="line-height: 1.3;">
              {{ detail.title }}
            </h1>

            <div class="d-flex align-center text-body-2 text-primary font-weight-semibold mb-3">
              <v-icon icon="mdi-feather" size="16" class="me-1" />
              <span>{{ detail.authorName || 'Không rõ tác giả' }}</span>
            </div>

            <!-- Meta Chips -->
            <div class="d-flex flex-wrap gap-2 mb-4">
              <span class="detail-pill">
                <v-icon icon="mdi-calendar-blank-outline" size="14" class="me-1" />
                {{ detail.publishYear ? `Xuất bản: ${detail.publishYear}` : 'Năm XB: Chưa rõ' }}
              </span>

              <span class="detail-pill">
                <v-icon icon="mdi-book-open-page-variant-outline" size="14" class="me-1" />
                {{ detail.totalPages ? `${detail.totalPages} trang` : 'Số trang: Chưa rõ' }}
              </span>

              <span class="detail-pill text-slate-500 font-mono">
                <v-icon icon="mdi-identifier" size="14" class="me-1 text-primary" />
                {{ detail.openLibraryId }}
              </span>
            </div>

            <!-- Genres / Subjects -->
            <div v-if="detail.subjects && detail.subjects.length > 0" class="mb-4">
              <div class="text-caption font-weight-bold text-slate-700 mb-1">Chủ đề & Thể loại:</div>
              <div class="d-flex flex-wrap gap-1">
                <span
                  v-for="(sub, idx) in detail.subjects.slice(0, 8)"
                  :key="idx"
                  class="genre-chip"
                >
                  {{ sub }}
                </span>
              </div>
            </div>

            <!-- Description -->
            <div class="mb-4">
              <div class="text-caption font-weight-bold text-slate-700 mb-1">Tóm tắt tác phẩm:</div>
              <div class="description-box pa-3 rounded-lg text-body-2 text-slate-700">
                {{ detail.description || 'Chưa có tóm tắt mô tả cho tác phẩm này.' }}
              </div>
            </div>
          </v-col>
        </v-row>

        <div class="divider-line my-4"></div>

        <!-- Add to library section -->
        <div class="add-section-card pa-4 rounded-xl border">
          <!-- In library state -->
          <div v-if="isInLibrary(detail.openLibraryId)" class="d-flex flex-wrap align-center justify-space-between gap-3">
            <div class="d-flex align-center text-emerald-600">
              <v-icon icon="mdi-check-decagram" color="success" size="24" class="me-2" />
              <div>
                <div class="text-subtitle-2 font-weight-bold">Sách này đã có trong tủ sách của bạn</div>
                <div class="text-caption text-slate-500">Bạn có thể theo dõi tiến độ đọc và ghi chú trong tủ sách.</div>
              </div>
            </div>
            <v-btn
              to="/library"
              class="btn-rounded btn-gradient-success text-none px-4"
              size="small"
              prepend-icon="mdi-bookshelf"
              @click="closeDialog"
            >
              Đến tủ sách
            </v-btn>
          </div>

          <!-- Add to library form -->
          <div v-else>
            <div class="text-subtitle-2 font-weight-bold text-slate-800 mb-2 d-flex align-center gap-1">
              <v-icon icon="mdi-plus-box-outline" size="18" color="primary" />
              Thêm sách vào tủ cá nhân:
            </div>
            <v-row align="center" dense>
              <v-col cols="12" sm="7">
                <v-select
                  v-model="selectedStatus"
                  :items="statusOptions"
                  item-title="title"
                  item-value="value"
                  label="Trạng thái đọc ban đầu"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="rounded-lg"
                >
                  <template v-slot:selection="{ item }">
                    <div class="d-flex align-center gap-1">
                      <v-icon :icon="item.raw.icon" size="16" color="primary" />
                      <span class="text-caption font-weight-bold">{{ item.raw.title }}</span>
                    </div>
                  </template>
                </v-select>
              </v-col>
              <v-col cols="12" sm="5">
                <v-btn
                  color="primary"
                  block
                  class="btn-rounded btn-gradient-primary text-none"
                  prepend-icon="mdi-plus"
                  :loading="submitting"
                  @click="handleAdd"
                >
                  Lưu vào tủ sách
                </v-btn>
              </v-col>
            </v-row>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="dialog-footer px-4 py-3 bg-slate-50 border-t d-flex justify-end">
        <v-btn
          variant="tonal"
          color="grey-darken-1"
          class="btn-rounded text-none px-5"
          @click="closeDialog"
        >
          Đóng
        </v-btn>
      </div>
    </div>

    <!-- Toast feedback -->
    <v-snackbar
      v-model="feedback.show"
      :color="feedback.color"
      location="top center"
      timeout="3000"
    >
      <div class="d-flex align-center gap-2">
        <v-icon :icon="feedback.color === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle'" size="18" />
        <span>{{ feedback.text }}</span>
      </div>
      <template v-slot:actions>
        <v-btn icon="mdi-close" size="small" variant="text" @click="feedback.show = false" />
      </template>
    </v-snackbar>
  </v-dialog>
</template>

<style scoped>
.detail-dialog-card {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
}

.dialog-header-badge {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-color: #eff6ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close-dialog {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-close-dialog:hover {
  background-color: #f1f5f9;
  color: #0f172a;
}

.cover-wrapper-detail {
  max-width: 220px;
}

.detail-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 3px 9px;
  border-radius: 6px;
  background-color: #f1f5f9;
  color: #475569;
}

.genre-chip {
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 9999px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #334155;
}

.description-box {
  background-color: #f8fafc;
  border-left: 3px solid #3b82f6;
  max-height: 160px;
  overflow-y: auto;
  line-height: 1.6;
}

.divider-line {
  height: 1px;
  background-color: #f1f5f9;
}

.add-section-card {
  background-color: #fafbfc;
}

.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.bg-slate-50 { background-color: #f8fafc; }
.bg-slate-100 { background-color: #f1f5f9; }
.font-mono { font-family: monospace; }
</style>
