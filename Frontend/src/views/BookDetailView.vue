<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getBookDetail } from '../api/books'
import { addToLibrary } from '../api/library'
import { useLibrary } from '../composables/useLibrary'
import type { BookDetail, ReadingStatus } from '../types'
import ErrorDisplay from '../components/ErrorDisplay.vue'
import { parseApiError, type AppErrorDetails } from '../utils/errorHandler'

const route = useRoute()
const router = useRouter()
const { isInLibrary, refreshExistingIds } = useLibrary()

const bookId = computed(() => {
  const param = route.params.key
  if (Array.isArray(param)) return param.join('/')
  return String(param || '')
})

const detail = ref<BookDetail | null>(null)
const loading = ref(false)
const error = ref<AppErrorDetails | string | null>(null)

const selectedStatus = ref<ReadingStatus>('want_to_read')
const submitting = ref(false)
const snackbar = ref<{ show: boolean; text: string; color: string }>({
  show: false,
  text: '',
  color: 'success',
})

const statusOptions: Array<{ title: string; value: ReadingStatus; icon: string }> = [
  { title: 'Muốn đọc', value: 'want_to_read', icon: 'mdi-bookmark-outline' },
  { title: 'Đang đọc', value: 'reading', icon: 'mdi-book-open-page-variant' },
  { title: 'Đã đọc', value: 'read', icon: 'mdi-check-circle-outline' },
]

async function loadDetail() {
  if (!bookId.value) return
  loading.value = true
  error.value = null
  try {
    detail.value = await getBookDetail(bookId.value)
    await refreshExistingIds()
  } catch (e) {
    error.value = parseApiError(e)
    detail.value = null
  } finally {
    loading.value = false
  }
}

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
    snackbar.value = {
      show: true,
      text: `Đã thêm "${detail.value.title}" vào tủ sách!`,
      color: 'success',
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Thêm thất bại'
    const isConflict = msg.includes('đã có trong tủ') || msg.toLowerCase().includes('conflict')
    snackbar.value = {
      show: true,
      text: isConflict ? `"${detail.value.title}" đã có trong tủ sách` : msg,
      color: isConflict ? 'warning' : 'error',
    }
    if (isConflict) await refreshExistingIds()
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadDetail()
})
</script>

<template>
  <div class="book-detail-page">
    <!-- Back button -->
    <div class="mb-4">
      <v-btn
        variant="tonal"
        color="grey-darken-2"
        size="small"
        prepend-icon="mdi-arrow-left"
        class="btn-pill text-none px-4"
        @click="router.back()"
      >
        Quay lại
      </v-btn>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-16">
      <v-progress-circular indeterminate size="52" width="4" color="primary" />
      <p class="text-body-2 text-slate-500 font-weight-medium mt-4">Đang tải thông tin chi tiết tác phẩm...</p>
    </div>

    <!-- Error State -->
    <ErrorDisplay
      v-else-if="error"
      :error="error"
      :show-home-btn="true"
      @retry="loadDetail"
    />

    <!-- Empty State -->
    <div v-else-if="!detail" class="text-center py-16 px-4">
      <div class="mx-auto rounded-xl pa-8 border bg-white shadow-sm" style="max-width: 500px;">
        <v-icon size="64" color="grey-lighten-1" class="mb-3">mdi-book-remove-outline</v-icon>
        <h3 class="text-h6 font-weight-bold text-slate-800 mb-2">Không tìm thấy thông tin tác phẩm này</h3>
        <p class="text-body-2 text-slate-500 mb-4">Sách có thể đã bị xóa hoặc không tồn tại trên hệ thống.</p>
        <v-btn
          to="/"
          color="primary"
          class="btn-pill btn-gradient-primary text-none px-5"
          prepend-icon="mdi-magnify"
        >
          Tìm kiếm sách khác
        </v-btn>
      </div>
    </div>

    <!-- Content State -->
    <div v-else class="detail-card bg-white rounded-xl border pa-4 pa-md-8 shadow-sm">
      <v-row>
        <!-- Cover Column -->
        <v-col cols="12" md="4" class="text-center">
          <div class="cover-detail-container mx-auto">
            <v-img
              :src="detail.coverUrl || 'https://via.placeholder.com/260x390?text=No+Cover'"
              height="380"
              cover
              class="rounded-xl shadow-md"
            >
              <template v-slot:placeholder>
                <div class="d-flex align-center justify-center fill-height bg-slate-100">
                  <v-progress-circular indeterminate color="primary" />
                </div>
              </template>
              <template v-slot:error>
                <div class="d-flex align-center justify-center fill-height bg-slate-100 rounded-xl">
                  <v-icon icon="mdi-book-outline" size="64" color="grey-lighten-1" />
                </div>
              </template>
            </v-img>
          </div>
        </v-col>

        <!-- Book Details Column -->
        <v-col cols="12" md="8">
          <h1 class="text-h5 text-md-h4 font-weight-bold text-slate-900 mb-2" style="line-height: 1.3;">
            {{ detail.title }}
          </h1>

          <div class="d-flex align-center text-subtitle-1 text-primary font-weight-semibold mb-4">
            <v-icon icon="mdi-feather" size="18" class="me-1" />
            <span>{{ detail.authorName || 'Không rõ tác giả' }}</span>
          </div>

          <!-- Meta badges -->
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

          <!-- Subjects -->
          <div v-if="detail.subjects && detail.subjects.length > 0" class="mb-5">
            <div class="text-caption font-weight-bold text-slate-700 mb-2">Chủ đề & Thể loại:</div>
            <div class="d-flex flex-wrap gap-1">
              <span
                v-for="(sub, idx) in detail.subjects"
                :key="idx"
                class="genre-chip"
              >
                {{ sub }}
              </span>
            </div>
          </div>

          <!-- Description -->
          <div class="mb-6">
            <div class="text-caption font-weight-bold text-slate-700 mb-2">Tóm tắt nội dung:</div>
            <div class="description-box pa-4 rounded-lg text-body-1 text-slate-700">
              {{ detail.description || 'Chưa có tóm tắt mô tả cho tác phẩm này.' }}
            </div>
          </div>

          <div class="divider-line my-6"></div>

          <!-- Add to Library Form / Status -->
          <div class="add-section-card pa-4 rounded-xl border">
            <div v-if="isInLibrary(detail.openLibraryId)" class="d-flex flex-wrap align-center justify-space-between gap-3 py-1">
              <div class="d-flex align-center text-emerald-600">
                <v-icon icon="mdi-check-decagram" color="success" size="26" class="me-2" />
                <div>
                  <div class="text-subtitle-1 font-weight-bold">Đã có trong tủ sách của bạn</div>
                  <div class="text-caption text-slate-500">Bạn có thể theo dõi tiến độ đọc và ghi chú trong tủ sách.</div>
                </div>
              </div>
              <v-btn
                to="/library"
                class="btn-rounded btn-gradient-success text-none px-4"
                prepend-icon="mdi-bookshelf"
              >
                Đến tủ sách
              </v-btn>
            </div>

            <div v-else>
              <div class="text-subtitle-1 font-weight-bold text-slate-800 mb-3 d-flex align-center gap-1">
                <v-icon icon="mdi-plus-box-outline" size="20" color="primary" />
                Thêm sách vào tủ cá nhân:
              </div>
              <v-row align="center">
                <v-col cols="12" sm="7">
                  <v-select
                    v-model="selectedStatus"
                    :items="statusOptions"
                    item-title="title"
                    item-value="value"
                    label="Trạng thái đọc ban đầu"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                    class="rounded-lg"
                  >
                    <template v-slot:selection="{ item }">
                      <div class="d-flex align-center gap-1">
                        <v-icon :icon="item.raw.icon" size="18" color="primary" />
                        <span class="font-weight-bold">{{ item.raw.title }}</span>
                      </div>
                    </template>
                  </v-select>
                </v-col>
                <v-col cols="12" sm="5">
                  <v-btn
                    color="primary"
                    block
                    class="btn-rounded btn-gradient-primary text-none py-3"
                    size="large"
                    prepend-icon="mdi-plus"
                    :loading="submitting"
                    @click="handleAdd"
                  >
                    Thêm vào tủ sách
                  </v-btn>
                </v-col>
              </v-row>
            </div>
          </div>
        </v-col>
      </v-row>
    </div>

    <!-- Toast Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      location="bottom center"
      timeout="3000"
      class="rounded-lg"
    >
      <div class="d-flex align-center gap-2">
        <v-icon :icon="snackbar.color === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle'" size="20" />
        <span class="font-weight-medium">{{ snackbar.text }}</span>
      </div>
      <template v-slot:actions>
        <v-btn icon="mdi-close" size="small" variant="text" @click="snackbar.show = false" />
      </template>
    </v-snackbar>
  </div>
</template>

<style scoped>
.cover-detail-container {
  max-width: 280px;
}

.detail-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.78rem;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 6px;
  background-color: #f1f5f9;
  color: #475569;
}

.genre-chip {
  font-size: 0.75rem;
  padding: 3px 10px;
  border-radius: 9999px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #334155;
}

.description-box {
  background-color: #f8fafc;
  border-left: 3px solid #3b82f6;
  line-height: 1.7;
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
.bg-slate-100 { background-color: #f1f5f9; }
.font-mono { font-family: monospace; }
</style>
