<script setup lang="ts">
</script>

<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-title class="font-weight-bold">
        📚 Mini Reading Tracker
      </v-app-bar-title>
      <v-spacer />
      <v-btn
        to="/"
        prepend-icon="mdi-magnify"
        variant="text"
        class="text-none"
      >
        Tìm kiếm
      </v-btn>
      <v-btn
        to="/library"
        prepend-icon="mdi-bookshelf"
        variant="text"
        class="text-none"
      >
        Tủ sách
      </v-btn>
    </v-app-bar>
    <v-main>
      <v-container fluid class="pa-3 pa-md-6">
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>
