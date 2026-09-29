<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useLibrary } from '../composables/useLibrary'
import type { LibraryEntry, ReadingStatus } from '../types'
import LibraryBookCard from '../components/LibraryBookCard.vue'
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog.vue'

type FilterTab = 'all' | ReadingStatus

const activeTab = ref<FilterTab>('all')
const busyId = ref<number | null>(null)

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

async function loadData() {
  const statusParam = activeTab.value === 'all' ? undefined : activeTab.value
  await Promise.all([fetchLibrary(statusParam), fetchStats()])
}

watch(activeTab, () => {
  const statusParam = activeTab.value === 'all' ? undefined : activeTab.value
  fetchLibrary(statusParam)
})

async function handleUpdate(
  id: number,
  payload: Partial<{
    status: ReadingStatus
    pagesRead: number
    rating: number | null
    notes: string | null
  }>,
) {
  busyId.value = id
  try {
    const updated = await update(id, payload)
    // Update local list item
    const idx = entries.value.findIndex((e) => e.id === id)
    if (idx !== -1) {
      // If we are filtering by status and the status changed, remove or update
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
  if (activeTab.value === 'want_to_read') return 'Chưa có cuốn sách nào trong danh sách "Muốn đọc"'
  if (activeTab.value === 'reading') return 'Bạn chưa có cuốn sách nào "Đang đọc"'
  if (activeTab.value === 'read') return 'Bạn chưa hoàn thành cuốn sách nào'
  return 'Tủ sách của bạn đang trống'
})

onMounted(() => {
  loadData()
})
</script>

<template>
  <div>
    <!-- Stats Header Cards -->
    <v-row class="mb-4">
      <v-col cols="6" sm="3">
        <v-card
          elevation="2"
          class="rounded-lg cursor-pointer text-center pa-3"
          :class="{ 'border-primary border-md': activeTab === 'all' }"
          @click="activeTab = 'all'"
        >
          <div class="text-caption text-grey-darken-1 font-weight-medium">Tổng số sách</div>
          <div class="text-h4 font-weight-bold text-primary mt-1">{{ stats.total }}</div>
          <v-icon icon="mdi-bookshelf" size="small" color="primary" class="mt-1" />
        </v-card>
      </v-col>

      <v-col cols="6" sm="3">
        <v-card
          elevation="2"
          class="rounded-lg cursor-pointer text-center pa-3"
          :class="{ 'border-blue-grey border-md': activeTab === 'want_to_read' }"
          @click="activeTab = 'want_to_read'"
        >
          <div class="text-caption text-grey-darken-1 font-weight-medium">Muốn đọc</div>
          <div class="text-h4 font-weight-bold text-blue-grey mt-1">{{ stats.wantToRead }}</div>
          <v-icon icon="mdi-bookmark-outline" size="small" color="blue-grey" class="mt-1" />
        </v-card>
      </v-col>

      <v-col cols="6" sm="3">
        <v-card
          elevation="2"
          class="rounded-lg cursor-pointer text-center pa-3"
          :class="{ 'border-amber-darken-2 border-md': activeTab === 'reading' }"
          @click="activeTab = 'reading'"
        >
          <div class="text-caption text-grey-darken-1 font-weight-medium">Đang đọc</div>
          <div class="text-h4 font-weight-bold text-amber-darken-2 mt-1">{{ stats.reading }}</div>
          <v-icon icon="mdi-book-open-page-variant" size="small" color="amber-darken-2" class="mt-1" />
        </v-card>
      </v-col>

      <v-col cols="6" sm="3">
        <v-card
          elevation="2"
          class="rounded-lg cursor-pointer text-center pa-3"
          :class="{ 'border-success border-md': activeTab === 'read' }"
          @click="activeTab = 'read'"
        >
          <div class="text-caption text-grey-darken-1 font-weight-medium">Đã hoàn thành</div>
          <div class="text-h4 font-weight-bold text-success mt-1">{{ stats.read }}</div>
          <v-icon icon="mdi-check-circle-outline" size="small" color="success" class="mt-1" />
        </v-card>
      </v-col>
    </v-row>

    <!-- Filter Tabs -->
    <v-tabs
      v-model="activeTab"
      color="primary"
      align-tabs="center"
      class="mb-6 border-b"
    >
      <v-tab value="all" class="text-none">
        <v-icon icon="mdi-view-grid-outline" class="me-1" />
        Tất cả ({{ stats.total }})
      </v-tab>
      <v-tab value="want_to_read" class="text-none">
        <v-icon icon="mdi-bookmark-outline" class="me-1" />
        Muốn đọc ({{ stats.wantToRead }})
      </v-tab>
      <v-tab value="reading" class="text-none">
        <v-icon icon="mdi-book-open-page-variant" class="me-1" />
        Đang đọc ({{ stats.reading }})
      </v-tab>
      <v-tab value="read" class="text-none">
        <v-icon icon="mdi-check-circle-outline" class="me-1" />
        Đã đọc ({{ stats.read }})
      </v-tab>
    </v-tabs>

    <!-- Loading State -->
    <v-row v-if="loading" justify="center" class="py-12">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate size="48" color="primary" />
        <p class="text-body-2 text-grey-darken-1 mt-4">Đang tải danh sách tủ sách...</p>
      </v-col>
    </v-row>

    <!-- Error State -->
    <v-row v-else-if="error" justify="center" class="py-8">
      <v-col cols="12" md="8" class="text-center">
        <v-alert type="error" variant="tonal" class="mb-4">
          {{ error }}
        </v-alert>
        <v-btn color="error" variant="outlined" prepend-icon="mdi-refresh" @click="loadData">
          Thử lại
        </v-btn>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-row v-else-if="entries.length === 0" justify="center" class="py-12">
      <v-col cols="12" md="6" class="text-center">
        <v-icon size="80" color="grey-lighten-1">mdi-bookshelf</v-icon>
        <p class="text-h6 text-grey mt-3">{{ emptyMessage }}</p>
        <p class="text-body-2 text-grey-lighten-1 mb-4">
          Hãy tìm kiếm và thêm các cuốn sách yêu thích vào tủ sách của bạn.
        </p>
        <v-btn to="/" color="primary" prepend-icon="mdi-magnify" class="text-none">
          Khám phá & Thêm sách
        </v-btn>
      </v-col>
    </v-row>

    <!-- Content State: Book Cards Grid -->
    <v-row v-else>
      <v-col
        v-for="entry in entries"
        :key="entry.id"
        cols="12"
        md="6"
        lg="4"
      >
        <LibraryBookCard
          :entry="entry"
          :busy="busyId === entry.id"
          @update="handleUpdate"
          @delete="promptDelete"
        />
      </v-col>
    </v-row>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDeleteDialog
      v-model="deleteDialog.show"
      title="Xác nhận xóa"
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
    >
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn icon="mdi-close" variant="text" @click="snackbar.show = false" />
      </template>
    </v-snackbar>
  </div>
</template>
