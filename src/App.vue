<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { NConfigProvider, NMessageProvider, NGlobalStyle } from 'naive-ui'
import { useAuthStore } from './stores/auth'
import { useGameStore } from './stores/game'
import Sidebar from './components/Sidebar.vue'

const route = useRoute()
const authStore = useAuthStore()
const gameStore = useGameStore()

const showSidebar = computed(() => {
  // Only show sidebar if authenticated, not on auth routes, and not actively in a game room
  return !!authStore.token && 
         !['/login', '/register'].includes(route.path) && 
         !gameStore.room
})

const themeOverrides = {
  common: {
    bodyColor: '#070c15',
  }
}
</script>

<template>
  <NConfigProvider :theme-overrides="themeOverrides">
    <NGlobalStyle />
    <NMessageProvider>
      <!-- Auth App Layout with Sidebar -->
      <div v-if="showSidebar" class="flex h-screen bg-background-1 text-white overflow-hidden">
        <Sidebar />
        <main class="flex-1 ml-64 h-full relative overflow-y-auto overflow-x-hidden" id="main-content">
          <router-view class="relative z-10" />
        </main>
      </div>

      <!-- Full-screen/Standard Layout (Login, Register, and active Game) -->
      <div v-else class="min-h-screen bg-background-1 text-white">
        <router-view />
      </div>
    </NMessageProvider>
  </NConfigProvider>
</template>
