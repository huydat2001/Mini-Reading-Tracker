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
    max-width="450"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="rounded-lg pa-2">
      <v-card-item>
        <template v-slot:prepend>
          <v-avatar color="error-lighten-4" size="44">
            <v-icon icon="mdi-alert-outline" color="error" size="26" />
          </v-avatar>
        </template>
        <v-card-title class="text-h6 font-weight-bold">
          {{ title }}
        </v-card-title>
      </v-card-item>

      <v-card-text class="pt-2 text-body-1 text-grey-darken-2">
        Bạn có chắc chắn muốn xóa cuốn sách
        <strong v-if="bookTitle" class="text-grey-darken-4">"{{ bookTitle }}"</strong>
        khỏi tủ sách không? Hành động này không thể hoàn tác.
      </v-card-text>

      <v-card-actions class="px-4 pb-3 pt-2">
        <v-spacer />
        <v-btn
          variant="text"
          color="grey-darken-1"
          :disabled="loading"
          @click="emit('update:modelValue', false)"
        >
          Hủy
        </v-btn>
        <v-btn
          color="error"
          variant="flat"
          prepend-icon="mdi-delete"
          :loading="loading"
          @click="emit('confirm')"
        >
          Xóa khỏi tủ
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
