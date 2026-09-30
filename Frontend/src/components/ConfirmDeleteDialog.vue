<script setup lang="ts">
defineProps<{
  modelValue: boolean
  title: string
  bookTitle?: string
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
}>()
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="440"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="confirm-dialog-card bg-white rounded-xl pa-5 border shadow-lg">
      <div class="d-flex align-center gap-3 mb-3">
        <div class="danger-icon-wrapper flex-shrink-0">
          <v-icon icon="mdi-trash-can-alert-outline" color="error" size="24" />
        </div>
        <div>
          <h3 class="text-subtitle-1 font-weight-bold text-slate-900 mb-0">
            {{ title }}
          </h3>
          <span class="text-caption text-slate-500">Xác nhận thao tác xóa</span>
        </div>
      </div>

      <div class="dialog-content text-body-2 text-slate-600 mb-5">
        Bạn có chắc chắn muốn xóa cuốn sách
        <strong v-if="bookTitle" class="text-slate-900">"{{ bookTitle }}"</strong>
        khỏi tủ sách cá nhân? Mọi tiến độ đọc và ghi chú liên quan sẽ bị xóa bỏ.
      </div>

      <div class="d-flex align-center justify-end gap-2">
        <v-btn
          variant="tonal"
          color="grey-darken-1"
          class="btn-rounded text-none px-4"
          :disabled="loading"
          @click="emit('update:modelValue', false)"
        >
          Hủy bỏ
        </v-btn>

        <v-btn
          color="error"
          variant="flat"
          class="btn-rounded btn-gradient-danger text-none px-4"
          prepend-icon="mdi-trash-can-outline"
          :loading="loading"
          @click="emit('confirm')"
        >
          Xác nhận xóa
        </v-btn>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
.confirm-dialog-card {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
}

.danger-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background-color: #fef2f2;
  border: 1px solid #fee2e2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
</style>
