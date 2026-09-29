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
    max-width="760"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="rounded-lg">
      <v-toolbar color="primary" density="comfortable" class="text-white">
        <v-toolbar-title class="text-subtitle-1 font-weight-bold">
          Chi tiết tác phẩm
        </v-toolbar-title>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" @click="closeDialog" />
      </v-toolbar>

      <v-card-text class="pa-4 pa-md-6" style="max-height: 75vh;">
        <!-- Loading state -->
        <div v-if="loading" class="text-center py-12">
          <v-progress-circular indeterminate size="52" color="primary" />
          <p class="text-body-2 text-grey-darken-1 mt-4">Đang tải thông tin chi tiết từ Open Library...</p>
        </div>

        <!-- Error state -->
        <div v-else-if="error" class="text-center py-8">
          <v-alert type="error" variant="tonal" class="mb-4 text-start">
            {{ error }}
          </v-alert>
          <v-btn color="error" variant="outlined" prepend-icon="mdi-refresh" @click="loadData">
            Thử lại
          </v-btn>
        </div>

        <!-- Empty state -->
        <div v-else-if="!detail" class="text-center py-8 text-grey">
          <v-icon size="64" color="grey-lighten-1">mdi-book-remove-outline</v-icon>
          <p class="mt-2">Không tìm thấy thông tin tác phẩm này</p>
        </div>

        <!-- Content state -->
        <div v-else>
          <v-row>
            <!-- Cover image column -->
            <v-col cols="12" sm="4" class="text-center">
              <v-card elevation="3" class="mx-auto overflow-hidden rounded-lg" max-width="220">
                <v-img
                  :src="detail.coverUrl || 'https://via.placeholder.com/240x360?text=No+Cover'"
                  height="300"
                  cover
                >
                  <template v-slot:placeholder>
                    <div class="d-flex align-center justify-center fill-height">
                      <v-progress-circular indeterminate color="primary" />
                    </div>
                  </template>
                  <template v-slot:error>
                    <v-img src="https://via.placeholder.com/240x360?text=No+Cover" height="300" cover />
                  </template>
                </v-img>
              </v-card>
            </v-col>

            <!-- Book metadata column -->
            <v-col cols="12" sm="8">
              <h2 class="text-h5 font-weight-bold text-grey-darken-4 mb-2">
                {{ detail.title }}
              </h2>

              <div class="text-subtitle-1 text-primary font-weight-medium mb-3">
                <v-icon icon="mdi-account-edit" size="small" class="me-1" />
                {{ detail.authorName || 'Không rõ tác giả' }}
              </div>

              <div class="d-flex flex-wrap gap-2 mb-4">
                <v-chip size="small" variant="outlined" color="grey-darken-2" class="me-2 mb-1" prepend-icon="mdi-calendar-blank">
                  {{ detail.publishYear ? `Xuất bản: ${detail.publishYear}` : 'Năm XB: Chưa rõ' }}
                </v-chip>

                <v-chip size="small" variant="outlined" color="grey-darken-2" class="me-2 mb-1" prepend-icon="mdi-book-open-page-variant">
                  {{ detail.totalPages ? `${detail.totalPages} trang` : 'Số trang: Chưa rõ' }}
                </v-chip>

                <v-chip size="small" variant="outlined" color="primary" class="mb-1" prepend-icon="mdi-identifier">
                  {{ detail.openLibraryId }}
                </v-chip>
              </div>

              <!-- Subjects / Genres -->
              <div v-if="detail.subjects && detail.subjects.length > 0" class="mb-4">
                <div class="text-caption font-weight-bold text-grey-darken-2 mb-1">Chủ đề / Thể loại:</div>
                <div class="d-flex flex-wrap">
                  <v-chip
                    v-for="(sub, idx) in detail.subjects.slice(0, 10)"
                    :key="idx"
                    size="x-small"
                    variant="tonal"
                    color="secondary"
                    class="me-1 mb-1"
                  >
                    {{ sub }}
                  </v-chip>
                </div>
              </div>

              <!-- Description -->
              <div class="mb-4">
                <div class="text-caption font-weight-bold text-grey-darken-2 mb-1">Mô tả tác phẩm:</div>
                <div
                  class="text-body-2 text-grey-darken-3 rounded pa-3 bg-grey-lighten-4"
                  style="max-height: 180px; overflow-y: auto; line-height: 1.6;"
                >
                  {{ detail.description || 'Chưa có tóm tắt mô tả cho tác phẩm này.' }}
                </div>
              </div>
            </v-col>
          </v-row>

          <v-divider class="my-4" />

          <!-- Add to library section -->
          <div class="rounded-lg pa-3 bg-grey-lighten-5 border">
            <div v-if="isInLibrary(detail.openLibraryId)" class="d-flex align-center justify-space-between py-1">
              <div class="d-flex align-center text-success">
                <v-icon icon="mdi-check-circle" color="success" class="me-2" />
                <span class="text-body-1 font-weight-medium">Sách này đã có trong tủ sách của bạn</span>
              </div>
              <v-btn
                to="/library"
                variant="outlined"
                color="success"
                size="small"
                prepend-icon="mdi-bookshelf"
                @click="closeDialog"
              >
                Xem trong tủ
              </v-btn>
            </div>

            <div v-else>
              <div class="text-subtitle-2 font-weight-bold mb-2">
                Thêm sách vào tủ:
              </div>
              <v-row align="center">
                <v-col cols="12" sm="7">
                  <v-select
                    v-model="selectedStatus"
                    :items="statusOptions"
                    item-title="title"
                    item-value="value"
                    label="Trạng thái ban đầu"
                    density="compact"
                    variant="outlined"
                    hide-details
                  >
                    <template v-slot:item="{ props: itemProps, item }">
                      <v-list-item v-bind="itemProps" :prepend-icon="item.raw.icon" />
                    </template>
                  </v-select>
                </v-col>
                <v-col cols="12" sm="5">
                  <v-btn
                    color="primary"
                    block
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
      </v-card-text>

      <v-card-actions class="pa-4 bg-grey-lighten-4">
        <v-spacer />
        <v-btn variant="text" color="grey-darken-1" @click="closeDialog">
          Đóng
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-snackbar
      v-model="feedback.show"
      :color="feedback.color"
      location="top center"
      timeout="3000"
    >
      {{ feedback.text }}
      <template v-slot:actions>
        <v-btn icon="mdi-close" variant="text" @click="feedback.show = false" />
      </template>
    </v-snackbar>
  </v-dialog>
</template>
