<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useLibrary } from '../composables/useLibrary'
import type { LibraryEntry, ReadingStatus } from '../types'
import LibraryBookCard from '../components/LibraryBookCard.vue'
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog.vue'

type FilterTab = 'all' | ReadingStatus

const router = useRouter()
const activeTab = ref<FilterTab>('all')
const busyId = ref<number | null>(null)
const searchQuery = ref('')
const isRefreshing = ref(false)

const {
  entries,
  stats,
  loading,
  error,
  fetchLibrary,
  fetchStats,
  update,
  remove,
} = useLibrary()

const deleteDialog = ref({
  show: false,
  entry: null as LibraryEntry | null,
  loading: false,
})

const snackbar = ref({
  show: false,
  text: '',
  color: 'success',
})

let searchTimer: ReturnType<typeof setTimeout> | undefined

async function loadData() {
  const statusParam = activeTab.value === 'all' ? undefined : activeTab.value
  const searchParam = searchQuery.value.trim() || undefined
  await Promise.all([fetchLibrary(statusParam, searchParam), fetchStats()])
}

async function handleRefresh() {
  isRefreshing.value = true
  try {
    await loadData()
    snackbar.value = {
      show: true,
      text: 'Đã làm mới danh sách tủ sách',
      color: 'success',
    }
  } finally {
    setTimeout(() => {
      isRefreshing.value = false
    }, 300)
  }
}

watch(activeTab, () => {
  const statusParam = activeTab.value === 'all' ? undefined : activeTab.value
  const searchParam = searchQuery.value.trim() || undefined
  fetchLibrary(statusParam, searchParam)
})

watch(searchQuery, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    const statusParam = activeTab.value === 'all' ? undefined : activeTab.value
    const searchParam = searchQuery.value.trim() || undefined
    fetchLibrary(statusParam, searchParam)
  }, 400)
})

async function handleUpdate(
  id: number,
  payload: Partial<{
    status: ReadingStatus
    pagesRead: number
    rating: number | null
    notes: string | null
    totalPages: number
  }>,
) {
  busyId.value = id
  try {
    const updated = await update(id, payload)
    const idx = entries.value.findIndex((e) => e.id === id)
    if (idx !== -1) {
      if (activeTab.value !== 'all' && updated.status !== activeTab.value) {
        entries.value.splice(idx, 1)
      } else {
        entries.value[idx] = updated
      }
    }
    await fetchStats()
    snackbar.value = {
      show: true,
      text: 'Đã cập nhật tiến độ đọc!',
      color: 'success',
    }
  } catch (e) {
    snackbar.value = {
      show: true,
      text: e instanceof Error ? e.message : 'Cập nhật thất bại',
      color: 'error',
    }
  } finally {
    busyId.value = null
  }
}

function promptDelete(entry: LibraryEntry) {
  deleteDialog.value = {
    show: true,
    entry,
    loading: false,
  }
}

async function confirmDelete() {
  if (!deleteDialog.value.entry) return
  deleteDialog.value.loading = true
  const { id, book } = deleteDialog.value.entry
  try {
    await remove(id, book.openLibraryId)
    entries.value = entries.value.filter((e) => e.id !== id)
    await fetchStats()
    snackbar.value = {
      show: true,
      text: `Đã xóa "${book.title}" khỏi tủ sách`,
      color: 'success',
    }
    deleteDialog.value.show = false
  } catch (e) {
    snackbar.value = {
      show: true,
      text: e instanceof Error ? e.message : 'Xóa thất bại',
      color: 'error',
    }
  } finally {
    deleteDialog.value.loading = false
  }
}

const emptyMessage = computed(() => {
  if (searchQuery.value.trim()) return `Không tìm thấy cuốn sách nào khớp với "${searchQuery.value}"`
  if (activeTab.value === 'want_to_read') return 'Chưa có cuốn sách nào trong danh sách "Muốn đọc"'
  if (activeTab.value === 'reading') return 'Bạn chưa có cuốn sách nào đang trong tiến độ đọc'
  if (activeTab.value === 'read') return 'Bạn chưa hoàn thành cuốn sách nào trong tủ'
  return 'Tủ sách của bạn đang trống'
})

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="library-container">
    <!-- Header Hero Section -->
    <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between gap-3 mb-6">
      <div>
        <div class="d-flex align-center gap-2 mb-1">
          <div class="hero-badge">
            <v-icon icon="mdi-bookshelf" color="primary" size="22" />
          </div>
          <h1 class="text-h5 text-md-h4 font-weight-bold page-title mb-0">
            Tủ Sách Của Tôi
          </h1>
        </div>
        <p class="text-body-2 text-grey-darken-1 mb-0 ps-sm-1">
          Theo dõi hành trình đọc sách, ghi chú cảm nhận và quản lý tiến độ từng trang sách.
        </p>
      </div>

      <div class="d-flex align-center gap-2">
        <v-btn
          variant="outlined"
          color="grey-darken-1"
          class="btn-pill text-none"
          size="small"
          prepend-icon="mdi-refresh"
          :loading="isRefreshing || (loading && !searchQuery)"
          @click="handleRefresh"
        >
          Làm mới
        </v-btn>

        <v-btn
          color="primary"
          class="btn-pill btn-gradient-primary text-none"
          size="small"
          prepend-icon="mdi-plus"
          @click="router.push('/')"
        >
          Thêm sách mới
        </v-btn>
      </div>
    </div>

    <!-- Stats Metric Cards -->
    <v-row class="mb-5" dense>
      <!-- Total -->
      <v-col cols="6" sm="3">
        <div
          class="stat-card stat-card-all cursor-pointer"
          :class="{ 'stat-card-active': activeTab === 'all' }"
          @click="activeTab = 'all'"
        >
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="stat-label">Tổng sách</span>
            <div class="stat-icon-wrapper bg-blue-50 text-blue-600">
              <v-icon icon="mdi-bookshelf" size="18" />
            </div>
          </div>
          <div class="stat-value text-blue-600">{{ stats.total }}</div>
          <div class="stat-subtext">Trong tủ sách</div>
          <div v-if="activeTab === 'all'" class="active-indicator bg-blue-500"></div>
        </div>
      </v-col>

      <!-- Want to Read -->
      <v-col cols="6" sm="3">
        <div
          class="stat-card stat-card-want cursor-pointer"
          :class="{ 'stat-card-active': activeTab === 'want_to_read' }"
          @click="activeTab = 'want_to_read'"
        >
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="stat-label">Muốn đọc</span>
            <div class="stat-icon-wrapper bg-slate-100 text-slate-600">
              <v-icon icon="mdi-bookmark-outline" size="18" />
            </div>
          </div>
          <div class="stat-value text-slate-700">{{ stats.wantToRead }}</div>
          <div class="stat-subtext">Dự định tương lai</div>
          <div v-if="activeTab === 'want_to_read'" class="active-indicator bg-slate-500"></div>
        </div>
      </v-col>

      <!-- Reading -->
      <v-col cols="6" sm="3">
        <div
          class="stat-card stat-card-reading cursor-pointer"
          :class="{ 'stat-card-active': activeTab === 'reading' }"
          @click="activeTab = 'reading'"
        >
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="stat-label">Đang đọc</span>
            <div class="stat-icon-wrapper bg-amber-50 text-amber-600">
              <v-icon icon="mdi-book-open-page-variant" size="18" />
            </div>
          </div>
          <div class="stat-value text-amber-600">{{ stats.reading }}</div>
          <div class="stat-subtext">Đang nghiền ngẫm</div>
          <div v-if="activeTab === 'reading'" class="active-indicator bg-amber-500"></div>
        </div>
      </v-col>

      <!-- Read / Finished -->
      <v-col cols="6" sm="3">
        <div
          class="stat-card stat-card-read cursor-pointer"
          :class="{ 'stat-card-active': activeTab === 'read' }"
          @click="activeTab = 'read'"
        >
          <div class="d-flex align-center justify-space-between mb-2">
            <span class="stat-label">Đã đọc</span>
            <div class="stat-icon-wrapper bg-emerald-50 text-emerald-600">
              <v-icon icon="mdi-check-decagram" size="18" />
            </div>
          </div>
          <div class="stat-value text-emerald-600">{{ stats.read }}</div>
          <div class="stat-subtext">Đã hoàn thành</div>
          <div v-if="activeTab === 'read'" class="active-indicator bg-emerald-500"></div>
        </div>
      </v-col>
    </v-row>

    <!-- Search & Filter Controls -->
    <div class="filter-bar-container p-3 mb-6 bg-white rounded-xl border">
      <div class="d-flex flex-column flex-md-row align-stretch align-md-center justify-space-between gap-3">
        <!-- Filter Tabs / Pills -->
        <div class="d-flex align-center gap-1 overflow-x-auto py-1 filter-pills">
          <button
            type="button"
            class="filter-pill-btn"
            :class="{ active: activeTab === 'all' }"
            @click="activeTab = 'all'"
          >
            <v-icon icon="mdi-view-grid-outline" size="16" class="me-1" />
            <span>Tất cả</span>
            <span class="filter-count-badge">{{ stats.total }}</span>
          </button>

          <button
            type="button"
            class="filter-pill-btn"
            :class="{ active: activeTab === 'want_to_read' }"
            @click="activeTab = 'want_to_read'"
          >
            <v-icon icon="mdi-bookmark-outline" size="16" class="me-1" />
            <span>Muốn đọc</span>
            <span class="filter-count-badge">{{ stats.wantToRead }}</span>
          </button>

          <button
            type="button"
            class="filter-pill-btn"
            :class="{ active: activeTab === 'reading' }"
            @click="activeTab = 'reading'"
          >
            <v-icon icon="mdi-book-open-page-variant" size="16" class="me-1" />
            <span>Đang đọc</span>
            <span class="filter-count-badge">{{ stats.reading }}</span>
          </button>

          <button
            type="button"
            class="filter-pill-btn"
            :class="{ active: activeTab === 'read' }"
            @click="activeTab = 'read'"
          >
            <v-icon icon="mdi-check-circle-outline" size="16" class="me-1" />
            <span>Đã đọc</span>
            <span class="filter-count-badge">{{ stats.read }}</span>
          </button>
        </div>

        <!-- Search Input -->
        <div class="search-input-wrapper">
          <v-text-field
            v-model="searchQuery"
            prepend-inner-icon="mdi-magnify"
            placeholder="Tìm theo tựa sách trong tủ..."
            clearable
            density="compact"
            variant="outlined"
            hide-details
            class="library-search-field"
            :loading="loading && !!searchQuery.trim()"
          />
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && entries.length === 0" class="text-center py-16">
      <v-progress-circular indeterminate size="52" width="4" color="primary" />
      <p class="text-body-2 text-grey-darken-1 font-weight-medium mt-4">
        Đang tải danh sách sách trong tủ của bạn...
      </p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-12 px-4">
      <v-card class="mx-auto rounded-xl pa-6 border" max-width="500">
        <v-avatar color="red-lighten-5" size="56" class="mb-3">
          <v-icon icon="mdi-alert-circle-outline" color="error" size="32" />
        </v-avatar>
        <h3 class="text-h6 font-weight-bold mb-2">Đã xảy ra sự cố</h3>
        <p class="text-body-2 text-grey-darken-1 mb-4">{{ error }}</p>
        <v-btn
          color="primary"
          class="btn-pill btn-gradient-primary px-6"
          prepend-icon="mdi-refresh"
          @click="loadData"
        >
          Thử lại
        </v-btn>
      </v-card>
    </div>

    <!-- Empty State -->
    <div v-else-if="entries.length === 0" class="text-center py-16 px-4">
      <div class="empty-state-card mx-auto pa-8 rounded-xl border bg-white" style="max-width: 520px;">
        <div class="empty-icon-ring mx-auto mb-4">
          <v-icon size="48" color="primary">mdi-bookshelf</v-icon>
        </div>
        <h3 class="text-h6 font-weight-bold text-slate-800 mb-2">
          {{ emptyMessage }}
        </h3>
        <p class="text-body-2 text-grey-darken-1 mb-6">
          <template v-if="searchQuery.trim()">
            Không có kết quả nào phù hợp. Bạn hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.
          </template>
          <template v-else-if="activeTab !== 'all'">
            Hiện không có sách nào thuộc trạng thái này. Bạn có thể chuyển sang mục khác hoặc thêm sách mới.
          </template>
          <template v-else>
            Tủ sách của bạn hiện chưa có sách nào. Hãy khám phá hàng triệu đầu sách và thêm vào bộ sưu tập ngay hôm nay!
          </template>
        </p>

        <div class="d-flex justify-center gap-3">
          <v-btn
            v-if="searchQuery.trim()"
            variant="tonal"
            color="grey-darken-2"
            class="btn-pill text-none px-5"
            prepend-icon="mdi-close"
            @click="searchQuery = ''"
          >
            Xóa tìm kiếm
          </v-btn>
          <v-btn
            v-else-if="activeTab !== 'all'"
            variant="tonal"
            color="primary"
            class="btn-pill text-none px-5"
            prepend-icon="mdi-view-grid-outline"
            @click="activeTab = 'all'"
          >
            Xem tất cả
          </v-btn>
          <v-btn
            color="primary"
            class="btn-pill btn-gradient-primary text-none px-6"
            prepend-icon="mdi-compass-outline"
            @click="router.push('/')"
          >
            Khám phá & Thêm sách
          </v-btn>
        </div>
      </div>
    </div>

    <!-- Books Grid -->
    <v-row v-else class="book-grid">
      <v-col
        v-for="entry in entries"
        :key="entry.id"
        cols="12"
        md="6"
        lg="4"
        class="d-flex"
      >
        <LibraryBookCard
          :entry="entry"
          :busy="busyId === entry.id"
          class="w-100"
          @update="handleUpdate"
          @delete="promptDelete"
        />
      </v-col>
    </v-row>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDeleteDialog
      v-model="deleteDialog.show"
      title="Xóa sách khỏi tủ"
      :book-title="deleteDialog.entry?.book.title"
      :loading="deleteDialog.loading"
      @confirm="confirmDelete"
    />

    <!-- Toast Snackbar -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      location="bottom center"
      timeout="3000"
      class="rounded-lg"
    >
      <div class="d-flex align-center gap-2">
        <v-icon
          :icon="snackbar.color === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle'"
          size="20"
        />
        <span class="font-weight-medium">{{ snackbar.text }}</span>
      </div>
      <template v-slot:actions>
        <v-btn icon="mdi-close" size="small" variant="text" @click="snackbar.show = false" />
      </template>
    </v-snackbar>
  </div>
</template>

<style scoped>
.page-title {
  color: #0f172a;
  letter-spacing: -0.025em;
}

.hero-badge {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(59, 130, 246, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Metric / Stat Cards */
.stat-card {
  position: relative;
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 14px;
  padding: 14px 16px;
  overflow: hidden;
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px -4px rgba(0, 0, 0, 0.08);
}

.stat-card-active {
  border-color: rgba(59, 130, 246, 0.4) !important;
  box-shadow: 0 6px 16px -2px rgba(59, 130, 246, 0.15) !important;
}

.stat-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
}

.stat-value {
  font-size: 1.65rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
}

.stat-subtext {
  font-size: 0.72rem;
  color: #94a3b8;
  margin-top: 2px;
}

.stat-icon-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.active-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
}

/* Filter Bar */
.filter-bar-container {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}

.filter-pills {
  scrollbar-width: none;
}
.filter-pills::-webkit-scrollbar {
  display: none;
}

.filter-pill-btn {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 0.825rem;
  font-weight: 600;
  color: #64748b;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.18s ease;
}

.filter-pill-btn:hover {
  color: #1e293b;
  background-color: #f1f5f9;
}

.filter-pill-btn.active {
  background-color: #3b82f6;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.filter-count-badge {
  margin-left: 6px;
  padding: 1px 7px;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.08);
}

.filter-pill-btn.active .filter-count-badge {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
}

.search-input-wrapper {
  min-width: 260px;
}

.library-search-field :deep(.v-field) {
  border-radius: 9999px !important;
  font-size: 0.875rem;
  background-color: #f8fafc;
}

/* Empty state */
.empty-state-card {
  box-shadow: 0 4px 20px -4px rgba(0, 0, 0, 0.06);
}

.empty-icon-ring {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #eff6ff;
  border: 8px solid #dbeafe;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }

/* Colors helper */
.bg-blue-50 { background-color: #eff6ff; }
.text-blue-600 { color: #2563eb; }
.bg-blue-500 { background-color: #3b82f6; }

.bg-slate-100 { background-color: #f1f5f9; }
.text-slate-600 { color: #475569; }
.text-slate-700 { color: #334155; }
.bg-slate-500 { background-color: #64748b; }

.bg-amber-50 { background-color: #fffbeb; }
.text-amber-600 { color: #d97706; }
.bg-amber-500 { background-color: #f59e0b; }

.bg-emerald-50 { background-color: #ecfdf5; }
.text-emerald-600 { color: #059669; }
.bg-emerald-500 { background-color: #10b981; }
</style>
