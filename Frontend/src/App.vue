<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const isLibraryActive = computed(() => route.path === '/library')
const isSearchActive = computed(() => route.path === '/' || route.path.startsWith('/book'))
</script>

<template>
  <v-app>
    <v-app-bar
      elevation="0"
      class="app-navbar border-b px-2 px-md-4"
      density="comfortable"
    >
      <div class="d-flex align-center cursor-pointer" @click="$router.push('/')">
        <div class="logo-box d-flex align-center justify-center me-2 me-md-3">
          <v-icon icon="mdi-book-open-page-variant" color="white" size="20" />
        </div>
        <div>
          <div class="text-subtitle-1 font-weight-bold brand-title">Mini Reading Tracker</div>
          <div class="text-caption text-grey text-xs d-none d-sm-block" style="line-height: 1;">Nhật ký & Tủ sách cá nhân</div>
        </div>
      </div>

      <v-spacer />

      <div class="d-flex align-center gap-2">
        <v-btn
          to="/"
          prepend-icon="mdi-magnify"
          :variant="isSearchActive ? 'flat' : 'text'"
          :color="isSearchActive ? 'primary' : undefined"
          class="btn-pill text-none px-3 px-md-4"
          :class="{ 'font-weight-bold shadow-sm': isSearchActive }"
          size="small"
        >
          Tìm kiếm
        </v-btn>

        <v-btn
          to="/library"
          prepend-icon="mdi-bookshelf"
          :variant="isLibraryActive ? 'flat' : 'text'"
          :color="isLibraryActive ? 'primary' : undefined"
          class="btn-pill text-none px-3 px-md-4"
          :class="{ 'font-weight-bold shadow-sm': isLibraryActive }"
          size="small"
        >
          Tủ sách
        </v-btn>
      </div>
    </v-app-bar>

    <v-main class="app-main-bg">
      <v-container class="pa-3 pa-md-6 max-width-container">
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.app-navbar {
  background: rgba(255, 255, 255, 0.92) !important;
  backdrop-filter: blur(12px) !important;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8) !important;
}

.logo-box {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
}

.brand-title {
  color: #0f172a;
  letter-spacing: -0.02em;
}

.text-xs {
  font-size: 0.72rem !important;
}

.max-width-container {
  max-width: 1240px;
}

.gap-2 {
  gap: 8px;
}

.shadow-sm {
  box-shadow: 0 3px 10px rgba(59, 130, 246, 0.25) !important;
}
</style>
