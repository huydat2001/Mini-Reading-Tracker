<script setup lang="ts">
import { computed, ref } from 'vue'
import { parseApiError, type AppErrorDetails, AppError } from '../utils/errorHandler'

interface Props {
  error: AppErrorDetails | AppError | Error | string | null
  compact?: boolean
  retryText?: string
  showHomeBtn?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  retryText: 'Thử lại',
  showHomeBtn: false,
})

const emit = defineEmits<{
  (e: 'retry'): void
}>()

const showDebug = ref(false)
const copied = ref(false)

const errorDetails = computed<AppErrorDetails>(() => {
  if (!props.error) {
    return parseApiError(null)
  }
  if (typeof props.error === 'object' && 'type' in props.error && 'title' in props.error) {
    return props.error as AppErrorDetails
  }
  return parseApiError(props.error)
})

const avatarBgColor = computed(() => {
  switch (errorDetails.value.color) {
    case 'warning':
      return 'amber-lighten-5'
    case 'info':
      return 'blue-lighten-5'
    case 'primary':
      return 'indigo-lighten-5'
    case 'error':
    default:
      return 'red-lighten-5'
  }
})

const avatarIconColor = computed(() => {
  switch (errorDetails.value.color) {
    case 'warning':
      return 'amber-darken-3'
    case 'info':
      return 'blue-darken-2'
    case 'primary':
      return 'indigo-darken-2'
    case 'error':
    default:
      return 'error'
  }
})

const badgeText = computed(() => {
  if (errorDetails.value.type === 'timeout') return 'Hết thời gian chờ (15s)'
  if (errorDetails.value.statusCode === 500) return 'Lỗi máy chủ (500)'
  if (errorDetails.value.statusCode === 422) return 'Dữ liệu không hợp lệ (422)'
  if (errorDetails.value.statusCode === 400) return 'Yêu cầu không hợp lệ (400)'
  if (errorDetails.value.statusCode === 404) return 'Không tìm thấy (404)'
  if (errorDetails.value.statusCode === 409) return 'Đã tồn tại (409)'
  if (errorDetails.value.statusCode === 429) return 'Giới hạn tần suất (429)'
  if (errorDetails.value.type === 'network') return 'Mất kết nối mạng'
  return errorDetails.value.statusCode ? `Mã lỗi: ${errorDetails.value.statusCode}` : 'Sự cố kết nối'
})

async function copyDebugInfo() {
  const content = [
    `Tiêu đề: ${errorDetails.value.title}`,
    `Mô tả: ${errorDetails.value.message}`,
    errorDetails.value.statusCode ? `Status: ${errorDetails.value.statusCode}` : '',
    errorDetails.value.code ? `Code: ${errorDetails.value.code}` : '',
    errorDetails.value.url ? `URL: ${errorDetails.value.method || 'GET'} ${errorDetails.value.url}` : '',
    errorDetails.value.rawError ? `Raw: ${errorDetails.value.rawError}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    await navigator.clipboard.writeText(content)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // fallback
  }
}
</script>

<template>
  <div class="error-display-wrapper w-100" :class="{ 'error-compact': compact }">
    <div class="error-card mx-auto rounded-2xl bg-white border shadow-sm">
      <!-- Icon & Status Badge -->
      <div class="d-flex flex-column align-center mb-3">
        <div class="avatar-pulse-wrapper mb-2">
          <v-avatar :color="avatarBgColor" :size="compact ? 52 : 64" class="error-avatar">
            <v-icon :icon="errorDetails.icon" :color="avatarIconColor" :size="compact ? 28 : 34" />
          </v-avatar>
        </div>
        <span class="error-type-chip px-3 py-1 rounded-pill text-caption font-weight-medium">
          {{ badgeText }}
        </span>
      </div>

      <!-- Title & Friendly Message -->
      <h3 class="error-title font-weight-bold text-slate-900 mb-2">
        {{ errorDetails.title }}
      </h3>
      <p class="error-message text-slate-600 mb-4">
        {{ errorDetails.message }}
      </p>

      <!-- Suggestion Box -->
      <div v-if="errorDetails.suggestion" class="suggestion-box pa-3 rounded-lg text-start mb-5">
        <div class="d-flex align-start gap-2">
          <v-icon icon="mdi-lightbulb-outline" size="18" class="text-amber-darken-3 mt-0-5 flex-shrink-0" />
          <span class="text-caption text-slate-700 line-height-relaxed">
            <strong class="font-weight-semibold text-slate-800">Gợi ý:</strong> {{ errorDetails.suggestion }}
          </span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="d-flex flex-wrap align-center justify-center gap-2 mb-3">
        <v-btn
          color="primary"
          class="btn-pill btn-gradient-primary px-5 text-none font-weight-semibold"
          prepend-icon="mdi-refresh"
          elevation="1"
          @click="emit('retry')"
        >
          {{ retryText }}
        </v-btn>

        <v-btn
          v-if="showHomeBtn"
          variant="outlined"
          color="slate-600"
          to="/"
          class="btn-pill px-4 text-none font-weight-medium"
          prepend-icon="mdi-home-outline"
        >
          Về trang chủ
        </v-btn>
      </div>

      <!-- Technical Details Toggle -->
      <div v-if="errorDetails.rawError || errorDetails.url" class="technical-details-section pt-2 border-t mt-3">
        <button
          type="button"
          class="btn-toggle-debug text-caption text-slate-500 hover:text-slate-800 d-inline-flex align-center gap-1 py-1 px-2 rounded"
          @click="showDebug = !showDebug"
        >
          <v-icon :icon="showDebug ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="16" />
          <span>{{ showDebug ? 'Ẩn chi tiết kỹ thuật' : 'Xem chi tiết kỹ thuật (dành cho lập trình viên)' }}</span>
        </button>

        <v-expand-transition>
          <div v-if="showDebug" class="debug-panel text-start mt-2 rounded-lg pa-3 text-caption">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="font-weight-bold text-slate-700">Thông tin lỗi kỹ thuật:</span>
              <v-btn
                size="x-small"
                variant="text"
                :color="copied ? 'success' : 'primary'"
                :prepend-icon="copied ? 'mdi-check' : 'mdi-content-copy'"
                class="text-none"
                @click="copyDebugInfo"
              >
                {{ copied ? 'Đã sao chép' : 'Sao chép lỗi' }}
              </v-btn>
            </div>

            <div v-if="errorDetails.url" class="debug-item mb-1">
              <span class="debug-label">Endpoint:</span>
              <code class="debug-value text-primary font-weight-medium">{{ errorDetails.method || 'GET' }} {{ errorDetails.url }}</code>
            </div>

            <div v-if="errorDetails.statusCode" class="debug-item mb-1">
              <span class="debug-label">Status Code:</span>
              <code class="debug-value text-error font-weight-bold">{{ errorDetails.statusCode }}</code>
            </div>

            <div v-if="errorDetails.rawError" class="debug-item">
              <span class="debug-label mb-1 d-block">Log / Raw Error:</span>
              <pre class="debug-pre pa-2 rounded text-slate-800">{{ errorDetails.rawError }}</pre>
            </div>
          </div>
        </v-expand-transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error-display-wrapper {
  text-align: center;
  padding: 1.5rem 1rem;
}

.error-compact {
  padding: 0.5rem;
}

.error-card {
  max-width: 520px;
  padding: 1.75rem 1.5rem;
  transition: all 0.2s ease;
}

.error-compact .error-card {
  max-width: 100%;
  padding: 1rem;
  box-shadow: none !important;
  border: none !important;
}

.avatar-pulse-wrapper {
  position: relative;
  display: inline-flex;
}

.error-avatar {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.error-type-chip {
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
  letter-spacing: 0.02em;
}

.error-title {
  font-size: 1.15rem;
  line-height: 1.4;
}

.error-compact .error-title {
  font-size: 1rem;
}

.error-message {
  font-size: 0.925rem;
  line-height: 1.55;
}

.error-compact .error-message {
  font-size: 0.85rem;
  margin-bottom: 0.75rem !important;
}

.suggestion-box {
  background-color: #fffbeb;
  border: 1px solid #fef3c7;
}

.mt-0-5 {
  margin-top: 2px;
}

.line-height-relaxed {
  line-height: 1.5;
}

.btn-toggle-debug {
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.15s ease;
}

.debug-panel {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
}

.debug-label {
  color: #64748b;
  font-size: 0.75rem;
  margin-right: 0.25rem;
}

.debug-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.775rem;
}

.debug-pre {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.75rem;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 150px;
  overflow-y: auto;
  margin: 0;
}
</style>
