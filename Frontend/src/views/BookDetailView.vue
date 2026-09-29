<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getBookDetail } from '../api/books'
import { addToLibrary } from '../api/library'
import { useLibrary } from '../composables/useLibrary'
import type { BookDetail, ReadingStatus } from '../types'

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
const error = ref<string | null>(null)

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
    error.value = e instanceof Error ? e.message : 'Không thể tải chi tiết tác phẩm'
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
  <div>
    <!-- Back button -->
    <v-row class="mb-4">
      <v-col cols="12">
        <v-btn
          variant="text"
          prepend-icon="mdi-arrow-left"
          class="text-none"
          @click="router.back()"
        >
          Quay lại
        </v-btn>
      </v-col>
    </v-row>

    <!-- Loading State -->
    <v-row v-if="loading" justify="center" class="py-12">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate size="52" color="primary" />
        <p class="text-body-2 text-grey-darken-1 mt-4">Đang tải thông tin chi tiết tác phẩm...</p>
      </v-col>
    </v-row>

    <!-- Error State -->
    <v-row v-else-if="error" justify="center" class="py-8">
      <v-col cols="12" md="8" class="text-center">
        <v-alert type="error" variant="tonal" class="mb-4">
          {{ error }}
        </v-alert>
        <v-btn color="error" variant="outlined" prepend-icon="mdi-refresh" @click="loadDetail">
          Thử lại
        </v-btn>
      </v-col>
    </v-row>

    <!-- Empty State -->
    <v-row v-else-if="!detail" justify="center" class="py-12">
      <v-col cols="12" class="text-center">
        <v-icon size="72" color="grey-lighten-1">mdi-book-remove-outline</v-icon>
        <p class="text-h6 text-grey mt-3">Không tìm thấy thông tin tác phẩm này</p>
        <v-btn to="/" color="primary" variant="outlined" class="mt-4" prepend-icon="mdi-magnify">
          Tìm kiếm sách khác
        </v-btn>
      </v-col>
    </v-row>

    <!-- Content State -->
    <v-card v-else class="rounded-lg elevation-2 pa-4 pa-md-8">
      <v-row>
        <!-- Cover Column -->
        <v-col cols="12" md="4" class="text-center">
          <v-card elevation="3" class="mx-auto overflow-hidden rounded-lg" max-width="280">
            <v-img
              :src="detail.coverUrl || 'https://via.placeholder.com/260x390?text=No+Cover'"
              height="380"
              cover
            >
              <template v-slot:placeholder>
                <div class="d-flex align-center justify-center fill-height">
                  <v-progress-circular indeterminate color="primary" />
                </div>
              </template>
              <template v-slot:error>
                <v-img src="https://via.placeholder.com/260x390?text=No+Cover" height="380" cover />
              </template>
            </v-img>
          </v-card>
        </v-col>

        <!-- Book Details Column -->
        <v-col cols="12" md="8">
          <h1 class="text-h4 font-weight-bold text-grey-darken-4 mb-2">
            {{ detail.title }}
          </h1>

          <div class="text-h6 text-primary font-weight-medium mb-4">
            <v-icon icon="mdi-account-edit" class="me-1" />
            {{ detail.authorName || 'Không rõ tác giả' }}
          </div>

          <div class="d-flex flex-wrap gap-2 mb-4">
            <v-chip size="small" variant="outlined" color="grey-darken-2" class="me-2 mb-2" prepend-icon="mdi-calendar-blank">
              {{ detail.publishYear ? `Xuất bản: ${detail.publishYear}` : 'Năm XB: Chưa rõ' }}
            </v-chip>

            <v-chip size="small" variant="outlined" color="grey-darken-2" class="me-2 mb-2" prepend-icon="mdi-book-open-page-variant">
              {{ detail.totalPages ? `${detail.totalPages} trang` : 'Số trang: Chưa rõ' }}
            </v-chip>

            <v-chip size="small" variant="outlined" color="primary" class="mb-2" prepend-icon="mdi-identifier">
              {{ detail.openLibraryId }}
            </v-chip>
          </div>

          <!-- Subjects -->
          <div v-if="detail.subjects && detail.subjects.length > 0" class="mb-5">
            <div class="text-subtitle-2 font-weight-bold text-grey-darken-2 mb-2">Chủ đề / Thể loại:</div>
            <div class="d-flex flex-wrap">
              <v-chip
                v-for="(sub, idx) in detail.subjects"
                :key="idx"
                size="small"
                variant="tonal"
                color="secondary"
                class="me-1 mb-2"
              >
                {{ sub }}
              </v-chip>
            </div>
          </div>

          <!-- Description -->
          <div class="mb-6">
            <div class="text-subtitle-2 font-weight-bold text-grey-darken-2 mb-2">Tóm tắt nội dung:</div>
            <div
              class="text-body-1 text-grey-darken-3 rounded pa-4 bg-grey-lighten-4"
              style="line-height: 1.7;"
            >
              {{ detail.description || 'Chưa có tóm tắt mô tả cho tác phẩm này.' }}
            </div>
          </div>

          <v-divider class="my-6" />

          <!-- Add to Library Form / Status -->
          <div class="rounded-lg pa-4 bg-grey-lighten-5 border">
            <div v-if="isInLibrary(detail.openLibraryId)" class="d-flex flex-wrap align-center justify-space-between gap-3 py-1">
              <div class="d-flex align-center text-success">
                <v-icon icon="mdi-check-circle" color="success" size="large" class="me-2" />
                <div>
                  <div class="text-subtitle-1 font-weight-bold">Đã có trong tủ sách của bạn</div>
                  <div class="text-caption text-grey">Bạn có thể theo dõi tiến độ đọc trong tủ sách.</div>
                </div>
              </div>
              <v-btn
                to="/library"
                color="success"
                variant="flat"
                prepend-icon="mdi-bookshelf"
              >
                Đến tủ sách
              </v-btn>
            </div>

            <div v-else>
              <div class="text-subtitle-1 font-weight-bold mb-3">
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
    </v-card>

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
